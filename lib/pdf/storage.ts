import 'server-only'

import { createClient } from '@/lib/supabase/server'

import { cargarDatosPdf } from './datos'
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
 */
export function rutaPdf(numero: string): string {
  const limpio = numero.trim().replace(/[^\w.-]+/g, '-')
  return `presupuestos/${limpio || 'presupuesto'}.pdf`
}

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>

export interface PdfResuelto {
  numero: string
  /** Clave del objeto en el bucket = `presupuestos.pdf_path`. */
  ruta: string
  /** URL firmada por 7 días, o null si no se pudo firmar. */
  url: string | null
  /** Bytes recién renderizados. `null` cuando se reusó el caché. */
  buffer: Buffer | null
  /** `true` si el archivo ya estaba en Storage y sigue vigente. */
  desdeCache: boolean
}

/** Cuándo se subió por última vez el objeto, según Storage. */
async function generadoEn(
  supabase: ClienteSupabase,
  ruta: string,
): Promise<Date | null> {
  const corte = ruta.lastIndexOf('/')
  const carpeta = corte >= 0 ? ruta.slice(0, corte) : ''
  const nombre = corte >= 0 ? ruta.slice(corte + 1) : ruta

  const { data, error } = await supabase.storage
    .from(BUCKET_PDF)
    .list(carpeta, { limit: 100, search: nombre })

  if (error || !data) return null

  // `search` es una coincidencia parcial: hay que quedarse con el
  // objeto cuyo nombre es exactamente el buscado.
  const archivo = data.find((item) => item.name === nombre)
  const marca = archivo?.updated_at ?? archivo?.created_at
  if (!marca) return null

  const fecha = new Date(marca)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

async function firmar(supabase: ClienteSupabase, ruta: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_PDF)
    .createSignedUrl(ruta, VIGENCIA_LINK_SEGUNDOS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/**
 * Devuelve el PDF del presupuesto, generándolo si hace falta.
 *
 * Reusa el archivo cacheado cuando existe y el presupuesto no cambió
 * desde que se generó. Si no, renderiza, sube con `upsert`, deja
 * `pdf_path` apuntando al objeto y registra el evento `pdf_generado`.
 *
 * Devuelve `null` cuando el presupuesto no existe o la RLS no deja
 * verlo: quien llama decide qué contestar.
 */
export async function asegurarPdf(id: string): Promise<PdfResuelto | null> {
  const supabase = await createClient()

  const presupuesto = await cargarDatosPdf(supabase, id)
  if (!presupuesto) return null

  const ruta = rutaPdf(presupuesto.numero)
  const actualizado = new Date(presupuesto.actualizadoEn)

  // ── ¿Sirve lo que ya está en el bucket? ──────────────────────────
  if (presupuesto.pdfPath) {
    const generado = await generadoEn(supabase, presupuesto.pdfPath)
    const vigente =
      generado !== null &&
      (Number.isNaN(actualizado.getTime()) || generado.getTime() >= actualizado.getTime())

    if (vigente) {
      const url = await firmar(supabase, presupuesto.pdfPath)
      if (url) {
        return {
          numero: presupuesto.numero,
          ruta: presupuesto.pdfPath,
          url,
          buffer: null,
          desdeCache: true,
        }
      }
      // Si no se pudo firmar, se sigue de largo y se regenera: mejor
      // gastar un render que devolverle un error al consultorio.
    }
  }

  const buffer = await renderizarPresupuesto(presupuesto.datos)

  /*
   * El orden importa. `presupuestos` tiene el trigger
   * `touch_updated_at`, así que escribir `pdf_path` mueve `updated_at`.
   * Si se escribiera después de subir el archivo, el presupuesto
   * quedaría más nuevo que su propio PDF y el caché nunca daría en el
   * blanco: se regeneraría en cada visita. Por eso primero se guarda la
   * ruta y recién después se sube el objeto, que queda con marca
   * posterior.
   *
   * Y sólo se escribe si la ruta cambió: en las regeneraciones el valor
   * es el mismo y no hace falta tocar la fila.
   */
  if (presupuesto.pdfPath !== ruta) {
    await supabase.from('presupuestos').update({ pdf_path: ruta }).eq('id', presupuesto.id)
  }

  const { error: errorSubida } = await supabase.storage
    .from(BUCKET_PDF)
    .upload(ruta, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (errorSubida) {
    // El archivo no quedó cacheado, pero el documento existe: se
    // devuelve igual para que el consultorio pueda mandarlo.
    return {
      numero: presupuesto.numero,
      ruta,
      url: null,
      buffer,
      desdeCache: false,
    }
  }

  await supabase.rpc('registrar_evento', {
    p_id: presupuesto.id,
    p_tipo: 'pdf_generado',
    p_desc: `Se generó el PDF del presupuesto N.º ${presupuesto.numero}`,
  })

  return {
    numero: presupuesto.numero,
    ruta,
    url: await firmar(supabase, ruta),
    buffer,
    desdeCache: false,
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
  return resultado?.url ?? null
}
