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
 * Qué saldrían hoy las mismas prestaciones.
 *
 * Se resuelve igual que `duplicar_presupuesto()`: se busca el arancel
 * vigente de cada prestación para la obra social del presupuesto y, si
 * no hay ninguno abierto, se conserva el snapshot. Así el número del
 * banner es exactamente el que va a salir si el usuario duplica —y no
 * una promesa distinta.
 *
 * Los overrides de cobertura tampoco se heredan al duplicar, así que
 * acá se comparan contra el arancel puro, no contra el valor editado.
 */
async function calcularHoy(
  cabecera: CabeceraPresupuesto,
  items: PresupuestoItem[],
): Promise<TotalesLinea[]> {
  const prestacionIds = Array.from(
    new Set(items.map((i) => i.prestacion_id).filter((x): x is string => Boolean(x))),
  )

  const snapshot = (item: PresupuestoItem): TotalesLinea => ({
    monto: item.monto,
    cobertura_tipo: item.cobertura_tipo,
    cobertura_valor: item.cobertura_valor,
  })

  // Ítems cargados a mano (sin prestación del catálogo) no tienen contra
  // qué compararse: el documento es su única fuente.
  if (prestacionIds.length === 0) return items.map(snapshot)

  const supabase = await createClient()
  let consulta = supabase
    .from('aranceles')
    .select('prestacion_id, monto, cobertura_tipo, cobertura_valor')
    .in('prestacion_id', prestacionIds)
    .is('vigente_hasta', null)

  consulta = cabecera.obra_social_id
    ? consulta.eq('obra_social_id', cabecera.obra_social_id)
    : consulta.is('obra_social_id', null)

  const { data, error } = await consulta

  if (error) {
    console.error('[detalle] no se pudieron leer los aranceles vigentes', error)
    return items.map(snapshot)
  }

  const vigentes = new Map<string, TotalesLinea>()
  for (const fila of (data ?? []) as FilaCruda[]) {
    vigentes.set(texto(fila.prestacion_id), {
      monto: monto(fila.monto),
      cobertura_tipo: fila.cobertura_tipo as CoberturaTipo,
      cobertura_valor: monto(fila.cobertura_valor),
    })
  }

  return items.map((item) => {
    const vigente = item.prestacion_id ? vigentes.get(item.prestacion_id) : undefined
    return vigente ?? snapshot(item)
  })
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
    hoy,
  )

  /**
   * El banner no se muestra con el tratamiento ya iniciado: a esa
   * altura el precio dejó de estar en discusión y lo único que haría
   * es sugerir una acción que nadie va a tomar.
   */
  const mostrarBanner = comparacion.desactualizado && cabecera.estado !== 'iniciado'

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
