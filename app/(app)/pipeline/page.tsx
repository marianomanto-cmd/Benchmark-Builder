import { subDays } from 'date-fns'
import { TriangleAlert } from 'lucide-react'

import { parseFiltros, terminoSeguro } from '@/components/home/filtros-url'
import { OBRA_SOCIAL_PARTICULAR, type FiltrosHome } from '@/components/home/tipos'
import { TableroPipeline } from '@/components/pipeline/tablero'
import {
  COLUMNAS_PIPELINE,
  ESTADOS_TABLERO,
  urlPipeline,
  type FilaPipeline,
  type OpcionFiltro,
} from '@/components/pipeline/tipos'
import { Banner, Button } from '@/components/ui'
import { fechaCorta } from '@/lib/formato'
import { createClient } from '@/lib/supabase/server'
import type { EstadoPresupuesto, MotivoPerdida } from '@/lib/types'

/**
 * Pantalla 12 · Pipeline.
 *
 * Kanban de las cinco etapas activas, con la franja de perdidos al pie.
 * Los filtros llegan por `searchParams` con las mismas claves que la
 * home (`prof`, `os`, `desde`, `hasta`, `q`): el toggle Lista ⇄ Kanban
 * conserva el contexto porque los dos leen y escriben la misma URL.
 *
 * La consulta se resuelve en el servidor y el tablero sólo recibe filas
 * ya masticadas; lo único que hace el cliente es mover tarjetas.
 */

/** Tope de tarjetas por consulta. El pipeline sano nunca se acerca. */
const LIMITE_ACTIVOS = 500
const LIMITE_PERDIDOS = 500

/**
 * Ventana por defecto de la franja de perdidos. Sin ella el resumen
 * sería histórico y dejaría de decir algo del mes que corre; con un
 * rango de fechas puesto a mano, manda ese rango.
 */
const DIAS_PERDIDOS = 90

interface DatosPipeline {
  filas: FilaPipeline[]
  profesionales: OpcionFiltro[]
  obrasSociales: OpcionFiltro[]
  periodoPerdidos: string
  falla: boolean
}

type FilaCruda = Record<string, unknown>

function texto(valor: unknown): string {
  return valor == null ? '' : String(valor)
}

function textoOpcional(valor: unknown): string | null {
  return valor == null || valor === '' ? null : String(valor)
}

function monto(valor: unknown): number {
  const n = Number(valor ?? 0)
  return Number.isFinite(n) ? n : 0
}

function aFila(fila: FilaCruda): FilaPipeline {
  return {
    id: texto(fila.id),
    numero: texto(fila.numero),
    paciente_nombre: texto(fila.paciente_nombre),
    prestacion_principal: textoOpcional(fila.prestacion_principal),
    obra_social_nombre: textoOpcional(fila.obra_social_nombre),
    profesional_nombre: texto(fila.profesional_nombre),
    fecha_emision: texto(fila.fecha_emision),
    total_a_cargo: monto(fila.total_a_cargo),
    estado: fila.estado as EstadoPresupuesto,
    dias_en_estado: monto(fila.dias_en_estado),
    motivo_perdida: (textoOpcional(fila.motivo_perdida) as MotivoPerdida | null) ?? null,
  }
}

/** Texto de la franja: qué recorte de perdidos se está mirando. */
function periodoDePerdidos(filtros: FiltrosHome): string {
  if (filtros.desde && filtros.hasta) {
    return `Emitidos entre el ${fechaCorta(filtros.desde)} y el ${fechaCorta(filtros.hasta)}`
  }
  if (filtros.desde) return `Emitidos desde el ${fechaCorta(filtros.desde)}`
  if (filtros.hasta) return `Emitidos hasta el ${fechaCorta(filtros.hasta)}`
  return `Últimos ${DIAS_PERDIDOS} días`
}

async function consultarPipeline(filtros: FiltrosHome): Promise<DatosPipeline> {
  const supabase = await createClient()
  const q = terminoSeguro(filtros.q)
  const busqueda = [
    `paciente_nombre.ilike.%${q}%`,
    `paciente_dni.ilike.%${q}%`,
    `prestacion_principal.ilike.%${q}%`,
    `numero.ilike.%${q}%`,
  ].join(',')

  // ── Las cinco columnas ──────────────────────────────────────
  // Orden por días en el estado: arriba de cada columna queda lo que
  // hace más tiempo que no se mueve, que es a quién hay que llamar.
  let activos = supabase
    .from('presupuestos_listado')
    .select(COLUMNAS_PIPELINE)
    .in('estado', ESTADOS_TABLERO)

  if (q) activos = activos.or(busqueda)
  if (filtros.profesional) activos = activos.eq('profesional_id', filtros.profesional)
  if (filtros.obraSocial === OBRA_SOCIAL_PARTICULAR) {
    activos = activos.is('obra_social_id', null)
  } else if (filtros.obraSocial) {
    activos = activos.eq('obra_social_id', filtros.obraSocial)
  }
  if (filtros.desde) activos = activos.gte('fecha_emision', filtros.desde)
  if (filtros.hasta) activos = activos.lte('fecha_emision', filtros.hasta)

  activos = activos
    .order('dias_en_estado', { ascending: false })
    .order('fecha_emision', { ascending: false })
    .limit(LIMITE_ACTIVOS)

  // ── La franja del pie ───────────────────────────────────────
  let perdidos = supabase
    .from('presupuestos_listado')
    .select(COLUMNAS_PIPELINE)
    .eq('estado', 'perdido')

  if (q) perdidos = perdidos.or(busqueda)
  if (filtros.profesional) perdidos = perdidos.eq('profesional_id', filtros.profesional)
  if (filtros.obraSocial === OBRA_SOCIAL_PARTICULAR) {
    perdidos = perdidos.is('obra_social_id', null)
  } else if (filtros.obraSocial) {
    perdidos = perdidos.eq('obra_social_id', filtros.obraSocial)
  }
  if (filtros.desde || filtros.hasta) {
    if (filtros.desde) perdidos = perdidos.gte('fecha_emision', filtros.desde)
    if (filtros.hasta) perdidos = perdidos.lte('fecha_emision', filtros.hasta)
  } else {
    // Sin rango a mano, la ventana corre sobre *cuándo se perdieron*
    // (`estado_desde`), no sobre cuándo se emitieron: la franja habla
    // de decisiones recientes.
    perdidos = perdidos.gte(
      'estado_desde',
      subDays(new Date(), DIAS_PERDIDOS).toISOString(),
    )
  }

  perdidos = perdidos.order('estado_desde', { ascending: false }).limit(LIMITE_PERDIDOS)

  const profesionales = supabase
    .from('profesionales')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')

  const obrasSociales = supabase
    .from('obras_sociales')
    .select('id, nombre, plan')
    .eq('activa', true)
    .order('nombre')

  const [resActivos, resPerdidos, resProf, resOs] = await Promise.all([
    activos,
    perdidos,
    profesionales,
    obrasSociales,
  ])

  const error = resActivos.error ?? resPerdidos.error ?? resProf.error ?? resOs.error
  if (error) {
    console.error('[pipeline] no se pudo leer el tablero', error)
    return {
      filas: [],
      profesionales: [],
      obrasSociales: [],
      periodoPerdidos: periodoDePerdidos(filtros),
      falla: true,
    }
  }

  // `select()` con una lista de columnas armada en runtime no le deja
  // inferir la forma a supabase-js: se normaliza a mano en `aFila`.
  const crudas = [
    ...((resActivos.data ?? []) as unknown as FilaCruda[]),
    ...((resPerdidos.data ?? []) as unknown as FilaCruda[]),
  ]

  return {
    filas: crudas.map(aFila),
    profesionales: ((resProf.data ?? []) as FilaCruda[]).map((p) => ({
      value: texto(p.id),
      label: texto(p.nombre),
    })),
    obrasSociales: ((resOs.data ?? []) as FilaCruda[]).map((o) => ({
      value: texto(o.id),
      label: `${texto(o.nombre)}${o.plan ? ` ${texto(o.plan)}` : ''}`,
    })),
    periodoPerdidos: periodoDePerdidos(filtros),
    falla: false,
  }
}

/**
 * Igual que la home: si la base no contesta, el tablero se dibuja vacío
 * con un aviso arriba en vez de tirar una pantalla de error.
 */
async function cargarPipeline(filtros: FiltrosHome): Promise<DatosPipeline> {
  try {
    return await consultarPipeline(filtros)
  } catch (e) {
    console.error('[pipeline] falló la carga', e)
    return {
      filas: [],
      profesionales: [],
      obrasSociales: [],
      periodoPerdidos: periodoDePerdidos(filtros),
      falla: true,
    }
  }
}

export default async function PipelinePage(props: PageProps<'/pipeline'>) {
  const filtros = parseFiltros(await props.searchParams)
  const datos = await cargarPipeline(filtros)

  return (
    <div className="flex flex-col gap-5">
      {datos.falla && (
        <Banner
          tono="warm"
          icono={<TriangleAlert className="size-5" />}
          titulo="No se pudo traer el pipeline"
          acciones={
            // Un `<a>` y no un `<Link>`: lo que hace falta es volver a
            // pedirle la pantalla al servidor, no una navegación de
            // cliente contra el mismo RSC que acaba de fallar.
            <Button asChild variant="secondary" size="touch">
              <a href={urlPipeline(filtros)}>Reintentar</a>
            </Button>
          }
        >
          La base no respondió. Ningún presupuesto se movió: lo que ves abajo está vacío
          porque no se pudo leer, no porque no haya trabajo.
        </Banner>
      )}

      <TableroPipeline
        filas={datos.filas}
        filtros={filtros}
        profesionales={datos.profesionales}
        obrasSociales={datos.obrasSociales}
        periodoPerdidos={datos.periodoPerdidos}
      />
    </div>
  )
}
