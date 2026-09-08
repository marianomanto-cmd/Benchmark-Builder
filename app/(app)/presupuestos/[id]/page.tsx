import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BannerPrecio } from '@/components/presupuesto/banner-precio'
import { BarraMobile } from '@/components/presupuesto/barra-mobile'
import { BloquePerdido } from '@/components/presupuesto/bloque-perdido'
import { Cabecera } from '@/components/presupuesto/cabecera'
import { ProveedorDetalle } from '@/components/presupuesto/contexto'
import { HistorialMobile } from '@/components/presupuesto/historial-mobile'
import { NotaInterna } from '@/components/presupuesto/nota-interna'
import { PanelSeguimiento } from '@/components/presupuesto/panel-seguimiento'
import { Prestaciones } from '@/components/presupuesto/prestaciones'
import { Timeline } from '@/components/presupuesto/timeline'
import { Totales } from '@/components/presupuesto/totales'
import {
  aCabecera,
  aCuota,
  aEvento,
  aItem,
  COLUMNAS_CABECERA,
  monto,
  texto,
  type CabeceraPresupuesto,
  type FilaCruda,
} from '@/components/presupuesto/tipos'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui'
import { compararConHoy, type TotalesLinea } from '@/lib/calculo'
import { diasDesde } from '@/lib/formato'
import { createClient } from '@/lib/supabase/server'
import type {
  CoberturaTipo,
  PresupuestoCuota,
  PresupuestoEvento,
  PresupuestoItem,
} from '@/lib/types'

/**
 * Pantalla 11 · Detalle del presupuesto.
 *
 * Es la pantalla donde LA REGLA se hace visible: todo lo que se muestra
 * del documento sale del snapshot de `presupuesto_items`. La única
 * consulta a `aranceles` que hay acá es para **comparar** —para poder
 * avisar que los precios se movieron— y su resultado nunca reemplaza lo
 * que dice el documento.
 */

/** Un id que no es uuid ni siquiera llega a la base: 404 y listo. */
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface DetalleCompleto {
  cabecera: CabeceraPresupuesto
  items: PresupuestoItem[]
  cuotas: PresupuestoCuota[]
  eventos: PresupuestoEvento[]
}

async function cargarDetalle(id: string): Promise<DetalleCompleto | null> {
  const supabase = await createClient()

  const [resCabecera, resItems, resCuotas, resEventos] = await Promise.all([
    supabase.from('presupuestos').select(COLUMNAS_CABECERA).eq('id', id).maybeSingle(),
    supabase.from('presupuesto_items').select('*').eq('presupuesto_id', id).order('orden'),
    supabase.from('presupuesto_cuotas').select('*').eq('presupuesto_id', id).order('orden'),
    supabase
      .from('presupuesto_eventos')
      .select('*')
      .eq('presupuesto_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (resCabecera.error) {
    console.error('[detalle] no se pudo leer el presupuesto', resCabecera.error)
    return null
  }
  if (!resCabecera.data) return null

  return {
    cabecera: aCabecera(resCabecera.data as unknown as FilaCruda),
    items: ((resItems.data ?? []) as FilaCruda[]).map(aItem),
    cuotas: ((resCuotas.data ?? []) as FilaCruda[]).map(aCuota),
    eventos: ((resEventos.data ?? []) as FilaCruda[]).map(aEvento),
  }
}

/**
 * Lo que este mismo presupuesto costaría hoy, y si los aranceles que
 * citó realmente cambiaron.
 *
 * Dos cosas que parecen detalles y no lo son:
 *
 * 1. «Desactualizado» se decide comparando la IDENTIDAD del arancel
 *    (el `arancel_id` que citó el ítem contra el que rige hoy), no los
 *    totales. Si se comparan totales, un presupuesto con la cobertura
 *    editada a mano dispara el banner para siempre —el snapshot difiere
 *    del arancel por el override, no porque haya cambiado un precio— y
 *    el banner le miente al consultorio.
 *
 * 2. Cada ítem se re-cotiza contra la obra social de SU arancel, no
 *    contra la del presupuesto: el paso 2 permite cargar un ítem «con
 *    valor particular» dentro de un presupuesto con obra social. Es la
 *    misma regla que aplica `duplicar_presupuesto`, y tiene que serlo:
 *    la única acción que ofrece el banner es duplicar, así que el
 *    número que promete y el que produce el duplicado deben coincidir.
 */
async function calcularHoy(
  cabecera: CabeceraPresupuesto,
  items: PresupuestoItem[],
): Promise<{ lineas: TotalesLinea[]; cambiaron: boolean }> {
  const snapshot = (item: PresupuestoItem): TotalesLinea => ({
    monto: item.monto,
    cobertura_tipo: item.cobertura_tipo,
    cobertura_valor: item.cobertura_valor,
  })

  const prestacionIds = Array.from(
    new Set(items.map((i) => i.prestacion_id).filter((x): x is string => Boolean(x))),
  )

  // Ítems cargados a mano (sin prestación del catálogo) no tienen contra
  // qué compararse: el documento es su única fuente.
  if (prestacionIds.length === 0) {
    return { lineas: items.map(snapshot), cambiaron: false }
  }

  const supabase = await createClient()
  const arancelIds = Array.from(
    new Set(items.map((i) => i.arancel_id).filter((x): x is string => Boolean(x))),
  )

  const [vigentesRes, citadosRes] = await Promise.all([
    // La vista filtra por fecha en la base: un aumento programado para
    // más adelante no se cotiza todavía.
    supabase
      .from('aranceles_vigentes')
      .select('id, prestacion_id, obra_social_id, monto, cobertura_tipo, cobertura_valor')
      .in('prestacion_id', prestacionIds),
    arancelIds.length > 0
      ? supabase.from('aranceles').select('id, obra_social_id').in('id', arancelIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (vigentesRes.error || citadosRes.error) {
    console.error(
      '[detalle] no se pudieron leer los aranceles vigentes',
      vigentesRes.error ?? citadosRes.error,
    )
    return { lineas: items.map(snapshot), cambiaron: false }
  }

  /** Con qué obra social se cotizó cada ítem en su momento. */
  const osDelArancel = new Map<string, string | null>()
  for (const fila of (citadosRes.data ?? []) as { id: string; obra_social_id: string | null }[]) {
    osDelArancel.set(fila.id, fila.obra_social_id)
  }

  const clave = (prestacionId: string, obraSocialId: string | null) =>
    `${prestacionId}:${obraSocialId ?? ''}`

  const vigentes = new Map<string, { id: string } & TotalesLinea>()
  for (const fila of (vigentesRes.data ?? []) as FilaCruda[]) {
    // `FilaCruda` es Record<string, unknown>: la obra social se
    // normaliza a string | null antes de usarla como parte de la clave.
    const obraSocialId = fila.obra_social_id == null ? null : String(fila.obra_social_id)
    vigentes.set(clave(texto(fila.prestacion_id), obraSocialId), {
      id: texto(fila.id),
      monto: monto(fila.monto),
      cobertura_tipo: fila.cobertura_tipo as CoberturaTipo,
      cobertura_valor: monto(fila.cobertura_valor),
    })
  }

  let cambiaron = false

  const lineas = items.map((item) => {
    if (!item.prestacion_id) return snapshot(item)

    const os = item.arancel_id
      ? (osDelArancel.get(item.arancel_id) ?? cabecera.obra_social_id)
      : cabecera.obra_social_id

    const vigente = vigentes.get(clave(item.prestacion_id, os))
    if (!vigente) {
      // Ya no hay arancel vigente para esta prestación: el documento
      // sigue siendo su propia fuente y no hay nada que comparar.
      return snapshot(item)
    }

    // El arancel citado dejó de ser el vigente: eso, y sólo eso, es que
    // el precio quedó desactualizado.
    if (item.arancel_id && item.arancel_id !== vigente.id) cambiaron = true

    return {
      monto: vigente.monto,
      cobertura_tipo: vigente.cobertura_tipo,
      cobertura_valor: vigente.cobertura_valor,
    }
  })

  return { lineas, cambiaron }
}

export async function generateMetadata(
  props: PageProps<'/presupuestos/[id]'>,
): Promise<Metadata> {
  const { id } = await props.params
  if (!ES_UUID.test(id)) return { title: 'Presupuesto' }

  const supabase = await createClient()
  const { data } = await supabase
    .from('presupuestos')
    .select('numero, paciente_nombre')
    .eq('id', id)
    .maybeSingle()

  if (!data) return { title: 'Presupuesto' }
  return { title: `Presupuesto ${data.numero} · ${data.paciente_nombre}` }
}

export default async function DetallePresupuestoPage(
  props: PageProps<'/presupuestos/[id]'>,
) {
  const { id } = await props.params
  if (!ES_UUID.test(id)) notFound()

  const searchParams = await props.searchParams
  // El wizard redirige con `?whatsapp=1` después de guardar como
  // "Enviado": el sheet de envío se abre solo.
  const whatsappInicial = searchParams.whatsapp === '1'

  const detalle = await cargarDetalle(id)
  if (!detalle) notFound()

  const { cabecera, items, cuotas, eventos } = detalle

  const hoy = await calcularHoy(cabecera, items)
  const comparacion = compararConHoy(
    items.map((i) => ({
      monto: i.monto,
      cobertura_tipo: i.cobertura_tipo,
      cobertura_valor: i.cobertura_valor,
    })),
    hoy.lineas,
  )

  /**
   * El banner no se muestra con el tratamiento ya iniciado: a esa
   * altura el precio dejó de estar en discusión y lo único que haría
   * es sugerir una acción que nadie va a tomar.
   */
  // `hoy.cambiaron` mira si el arancel citado dejó de ser el vigente;
  // `comparacion.diferencia` evita el banner cuando el cambio no mueve
  // el número que le importa al paciente (por ejemplo, un ajuste de
  // monto y cobertura que deja el a-cargo igual).
  const mostrarBanner =
    hoy.cambiaron && comparacion.diferencia !== 0 && cabecera.estado !== 'iniciado'

  // Quién y cuándo lo dio por perdido, según el historial append-only.
  const eventoPerdida =
    cabecera.estado === 'perdido'
      ? (eventos.find((e) => e.tipo === 'estado_cambiado' && e.estado_nuevo === 'perdido') ?? null)
      : null

  // Se calcula en el servidor: si lo hiciera el componente de cliente,
  // el número podría no coincidir al hidratar.
  const diasEnEstado = cabecera.estado_desde ? diasDesde(cabecera.estado_desde) : 0

  return (
    <ProveedorDetalle
      datos={{
        id: cabecera.id,
        numero: cabecera.numero,
        estado: cabecera.estado,
        eventos,
      }}
      whatsappInicial={whatsappInicial}
    >
      <div className="flex flex-col gap-5">
        <Cabecera cabecera={cabecera} />

        {mostrarBanner && (
          <BannerPrecio
            comparacion={comparacion}
            validoHasta={cabecera.valido_hasta}
            fechaEmision={cabecera.fecha_emision}
          />
        )}

        {cabecera.estado === 'perdido' && (
          <BloquePerdido
            motivo={cabecera.motivo_perdida}
            nota={cabecera.motivo_perdida_nota}
            autor={eventoPerdida?.autor_nombre ?? null}
            fecha={eventoPerdida?.created_at ?? null}
          />
        )}

        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_330px]">
          <div className="flex min-w-0 flex-col gap-5">
            <Prestaciones items={items} fechaEmision={cabecera.fecha_emision} />

            <Totales
              subtotal={cabecera.subtotal}
              cobertura={cabecera.total_cobertura}
              aCargo={cabecera.total_a_cargo}
              estado={cabecera.estado}
              cuotas={cuotas}
              observaciones={cabecera.observaciones}
            />
          </div>

          {/* En desktop es la columna derecha; en mobile se apila abajo,
              con el historial resumido en vez del timeline completo. */}
          <aside className="flex min-w-0 flex-col gap-5">
            <PanelSeguimiento estado={cabecera.estado} diasEnEstado={diasEnEstado} />

            <HistorialMobile eventos={eventos} className="md:hidden" />

            <Card className="hidden animate-enter md:block">
              <CardHeader>
                <CardTitle>Historial</CardTitle>
                <p className="t-helper">No se edita ni se borra.</p>
              </CardHeader>
              <CardBody>
                <Timeline eventos={eventos} />
              </CardBody>
            </Card>

            <NotaInterna presupuestoId={cabecera.id} nota={cabecera.nota_interna} />
          </aside>
        </div>

        {/* Aire para que la barra flotante no tape el final del contenido.
            El colchón de la tabbar ya lo pone el layout. */}
        <div aria-hidden className="h-16 md:hidden" />
      </div>

      <BarraMobile />
    </ProveedorDetalle>
  )
}
