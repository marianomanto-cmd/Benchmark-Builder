import 'server-only'

import { after } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import { cargarCabeceraPdf, cargarDocumentoPdf, type CabeceraPdf } from './datos'
import { renderizarPresupuesto } from './render'

/**
 * Caché del PDF en Storage.
 *
 * **El documento del paciente y el del consultorio son el mismo byte.**
 * El archivo que se adjunta al WhatsApp, el que abre "Ver PDF" y el que
 * queda guardado en el bucket son el mismo objeto: si se regeneraran
 * por separado, el paciente podría estar mirando una versión y el
 * consultorio otra, y toda la regla del snapshot se cae.
 *
 * El bucket `presupuestos` es privado; se accede por URL firmada de 7
 * días, la misma vigencia que documenta la migración de Storage.
 *
 * ── CUÁNDO VALE EL CACHÉ ──────────────────────────────────────────
 *
 * Antes se comparaba la fecha del objeto contra `presupuestos.updated_at`.
 * Esa cuenta invalidaba el PDF por cosas que **no salen en el documento**:
 * cada cambio de estado, cada nota interna y cada teléfono cargado
 * mueven `updated_at`. Resultado: un presupuesto que iba de Enviado a
 * Interesado a Aceptado re-renderizaba el mismo documento tres veces
 * —tres segundos de espera cada una— y dejaba tres líneas «Se generó el
 * PDF» en un historial que es append-only y no se puede limpiar.
 *
 * La regla real es más simple y es la del producto: **un presupuesto
 * emitido no cambia de contenido** (lo garantizan `guard_presupuesto_emitido`
 * y `guard_item_emitido`). Entonces, si está emitido y hay un objeto en
 * el bucket, ese objeto ES el documento. Sólo se regenera cuando todavía
 * es borrador —ahí sí los ítems están abiertos— o cuando el archivo no
 * está: firmar una ruta inexistente falla, y esa falla es la señal.
 */

/** Bucket privado creado en `20260101000400_storage.sql`. */
export const BUCKET_PDF = 'presupuestos'

/** Una semana, igual que la política del bucket. */
export const VIGENCIA_LINK_SEGUNDOS = 60 * 60 * 24 * 7

/**
 * Clave del objeto dentro del bucket. Es exactamente lo que se guarda
 * en `presupuestos.pdf_path` (el esquema lo documenta así:
 * `presupuestos/2026-0341.pdf`), para que cualquiera pueda firmar el
 * link con `storage.from(BUCKET_PDF).createSignedUrl(pdf_path)` sin
 * tener que reconstruir la ruta.
 *
 * El `id` es el respaldo: sin número, todos los presupuestos caían en
 * el mismo objeto y el PDF de uno se servía como el de otro.
 */
export function rutaPdf(numero: string, id?: string): string {
  const limpio = numero.trim().replace(/[^\w.-]+/g, '-')
  return `presupuestos/${limpio || id || 'presupuesto'}.pdf`
}

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>

export interface PdfResuelto {
  numero: string
  /** Clave del objeto en el bucket = `presupuestos.pdf_path`. */
  ruta: string
  /**
   * URL firmada por 7 días **cuando sirvió el caché**, que es el único
   * caso en que hace falta (la respuesta es un redirect al objeto). En
   * una generación nueva viaja el buffer, así que firmar sería un viaje
   * a Storage que nadie mira, justo en la petición que ya pagó el
   * render. Ver `urlFirmadaPdf`, que firma si de verdad la necesita.
   */
  url: string | null
  /** Bytes recién renderizados. `null` cuando se reusó el caché. */
  buffer: Buffer | null
  /** `true` si el archivo ya estaba en Storage y sigue vigente. */
  desdeCache: boolean
  /** Un emitido está congelado: el navegador puede quedárselo un rato. */
  congelado: boolean
}

/**
 * Firma el objeto. Devuelve `null` si no existe o Storage no contesta:
 * el endpoint de firma valida que el archivo esté, así que una firma
 * exitosa es a la vez la prueba de que el caché sigue en pie.
 */
async function firmar(supabase: ClienteSupabase, ruta: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_PDF)
    .createSignedUrl(ruta, VIGENCIA_LINK_SEGUNDOS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/** Mientras es borrador, los ítems siguen abiertos: el PDF no se cachea. */
function estaCongelado(cabecera: CabeceraPdf): boolean {
  return cabecera.estado !== 'borrador'
}

/**
 * Devuelve el PDF del presupuesto, generándolo si hace falta.
 *
 * Con el caché caliente son dos viajes (una consulta y una firma) y
 * cero renders. Sin caché, se renderiza y se guarda; el evento del
 * historial se manda con `after()`, después de contestar, porque el
 * consultorio no tiene que esperar a que se escriba una línea de log
 * para abrir el documento.
 *
 * Devuelve `null` cuando el presupuesto no existe o la RLS no deja
 * verlo: quien llama decide qué contestar.
 */
export async function asegurarPdf(id: string): Promise<PdfResuelto | null> {
  const supabase = await createClient()

  const encabezado = await cargarCabeceraPdf(supabase, id)
  if (!encabezado) return null

  const { cabecera, fila } = encabezado
  const congelado = estaCongelado(cabecera)
  const ruta = rutaPdf(cabecera.numero, cabecera.id)

  // ── ¿Sirve lo que ya está en el bucket? ──────────────────────────
  if (congelado && cabecera.pdfPath) {
    const url = await firmar(supabase, cabecera.pdfPath)
    if (url) {
      return {
        numero: cabecera.numero,
        ruta: cabecera.pdfPath,
        url,
        buffer: null,
        desdeCache: true,
        congelado,
      }
    }
    // No se pudo firmar (el objeto no está, o Storage no contestó): se
    // regenera. Mejor gastar un render que devolverle un error al
    // consultorio con el paciente enfrente.
  }

  const datos = await cargarDocumentoPdf(supabase, fila)
  const buffer = await renderizarPresupuesto(datos)

  /*
   * La ruta y el archivo son independientes entre sí, así que van
   * juntos: `pdf_path` tiene que quedar escrito antes de contestar
   * —el sheet de WhatsApp lo lee para armar el link firmado— pero no
   * tiene por qué esperar a la subida.
   *
   * Sólo se escribe si la ruta cambió: en las regeneraciones el valor
   * es el mismo y no hace falta tocar la fila (ni disparar
   * `touch_updated_at`).
   */
  const [, subida] = await Promise.all([
    cabecera.pdfPath === ruta
      ? Promise.resolve(null)
      : supabase.from('presupuestos').update({ pdf_path: ruta }).eq('id', cabecera.id),
    supabase.storage.from(BUCKET_PDF).upload(ruta, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    }),
  ])

  if (subida.error) {
    // El archivo no quedó cacheado, pero el documento existe: se
    // devuelve igual para que el consultorio pueda mandarlo.
    console.error('[pdf] no se pudo guardar en Storage', subida.error)
    return {
      numero: cabecera.numero,
      ruta,
      url: null,
      buffer,
      desdeCache: false,
      congelado,
    }
  }

  // El historial no bloquea la respuesta. Un borrador no deja línea:
  // el documento que cuenta es el emitido.
  if (congelado) {
    const anotar = async () => {
      const { error } = await supabase.rpc('registrar_evento', {
        p_id: cabecera.id,
        p_tipo: 'pdf_generado',
        p_desc: `Se generó el PDF del presupuesto N.º ${cabecera.numero}`,
      })
      if (error) console.error('[pdf] no se pudo anotar el evento', error)
    }
    try {
      after(anotar)
    } catch {
      // `after` sólo existe dentro de una request. Fuera de ahí (un
      // script, un test) se escribe en línea antes de devolver.
      await anotar()
    }
  }

  return {
    numero: cabecera.numero,
    ruta,
    url: null,
    buffer,
    desdeCache: false,
    congelado,
  }
}

/**
 * Link firmado al PDF, listo para pegar en el mensaje de WhatsApp.
 *
 * Genera el documento si todavía no existe: el sheet lo pide para
 * mandarlo ahora, y devolverle `null` porque nadie apretó antes "Ver
 * PDF" sería un no por un detalle de implementación. Devuelve `null`
 * sólo cuando el presupuesto no existe, no se puede ver, o Storage no
 * quiso firmar.
 */
export async function urlFirmadaPdf(id: string): Promise<string | null> {
  const resultado = await asegurarPdf(id)
  if (!resultado) return null
  if (resultado.url) return resultado.url

  // Recién generado: el objeto está en el bucket pero sin firmar.
  const supabase = await createClient()
  return firmar(supabase, resultado.ruta)
}
