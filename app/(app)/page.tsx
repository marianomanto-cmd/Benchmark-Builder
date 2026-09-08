import { startOfMonth, subDays } from 'date-fns'
import { TriangleAlert } from 'lucide-react'

import { BannerBorrador } from '@/components/home/banner-borrador'
import { BannerConexion } from '@/components/home/banner-conexion'
import { BarraFiltros } from '@/components/home/barra-filtros'
import { HomeVacia, SinResultados } from '@/components/home/estado-vacio'
import { parseFiltros, terminoSeguro } from '@/components/home/filtros-url'
import { Kpis } from '@/components/home/kpis'
import { Listado } from '@/components/home/listado'
import {
  COLUMNAS_LISTADO,
  KPIS_VACIOS,
  OBRA_SOCIAL_PARTICULAR,
  type FilaPresupuesto,
  type FiltrosHome,
  type KpisHome,
  type OpcionFiltro,
} from '@/components/home/tipos'
import { Banner } from '@/components/ui'
import { ESTADOS_PIPELINE, esperaRespuesta, estaFrio } from '@/lib/estados'
import { isoDate } from '@/lib/formato'
import { createClient } from '@/lib/supabase/server'
import type { EstadoPresupuesto } from '@/lib/types'

/**
 * Pantallas 02 y 03 — la home.
 *
 * Es la misma pantalla: si el consultorio todavía no cargó nada se
 * dibuja la versión vacía (KPIs en raya, con borde punteado, para que
 * enseñen qué va a aparecer ahí). En cuanto hay un presupuesto, la
 * pantalla se llena sola.
 *
 * Los filtros llegan por `searchParams` y la consulta se resuelve en el
 * servidor: la URL es el estado, no un `useState`.
 */

/** Tope de filas por consulta. Arriba de esto se pide afinar los filtros. */
const LIMITE_FILAS = 200

interface DatosHome {
  kpis: KpisHome
  filas: FilaPresupuesto[]
  truncado: boolean
  hayPresupuestos: boolean
  profesionales: OpcionFiltro[]
  obrasSociales: OpcionFiltro[]
  falla: boolean
}

const SIN_DATOS: DatosHome = {
  kpis: KPIS_VACIOS,
  filas: [],
  truncado: false,
  hayPresupuestos: false,
  profesionales: [],
  obrasSociales: [],
  falla: true,
}

type FilaCruda = Record<string, unknown>

function texto(valor: unknown): string {
  return valor == null ? '' : String(valor)
}

function textoOpcional(valor: unknown): string | null {
  return valor == null || valor === '' ? null : String(valor)
}

/** PostgREST devuelve `numeric` como número, pero nunca está de más. */
function monto(valor: unknown): number {
  const n = Number(valor ?? 0)
  return Number.isFinite(n) ? n : 0
}

function aFila(fila: FilaCruda): FilaPresupuesto {
  return {
    id: texto(fila.id),
    numero: texto(fila.numero),
    paciente_nombre: texto(fila.paciente_nombre),
    paciente_dni: textoOpcional(fila.paciente_dni),
    paciente_telefono: textoOpcional(fila.paciente_telefono),
    prestacion_principal: textoOpcional(fila.prestacion_principal),
    items_count: monto(fila.items_count),
    obra_social_nombre: textoOpcional(fila.obra_social_nombre),
    profesional_nombre: texto(fila.profesional_nombre),
    fecha_emision: texto(fila.fecha_emision),
    subtotal: monto(fila.subtotal),
    total_a_cargo: monto(fila.total_a_cargo),
    estado: fila.estado as EstadoPresupuesto,
    dias_en_estado: monto(fila.dias_en_estado),
  }
}

async function consultarHome(filtros: FiltrosHome): Promise<DatosHome> {
  const supabase = await createClient()

  const hoy = new Date()
  const inicioMes = isoDate(startOfMonth(hoy))
  const hace30 = isoDate(subDays(hoy, 30))
  const hace90 = isoDate(subDays(hoy, 90))

  // ── Listado filtrado ────────────────────────────────────────
  let listado = supabase.from('presupuestos_listado').select(COLUMNAS_LISTADO)

  const q = terminoSeguro(filtros.q)
  if (q) {
    // La prestación principal la resuelve la vista, así que se puede
    // buscar por ella sin traerse todos los ítems.
    listado = listado.or(
      [
        `paciente_nombre.ilike.%${q}%`,
        `paciente_dni.ilike.%${q}%`,
        `prestacion_principal.ilike.%${q}%`,
        `numero.ilike.%${q}%`,
      ].join(','),
    )
  }
  if (filtros.estados.length > 0) listado = listado.in('estado', filtros.estados)
  if (filtros.profesional) listado = listado.eq('profesional_id', filtros.profesional)
  if (filtros.obraSocial === OBRA_SOCIAL_PARTICULAR) {
    listado = listado.is('obra_social_id', null)
  } else if (filtros.obraSocial) {
    listado = listado.eq('obra_social_id', filtros.obraSocial)
  }
  if (filtros.desde) listado = listado.gte('fecha_emision', filtros.desde)
  if (filtros.hasta) listado = listado.lte('fecha_emision', filtros.hasta)

  listado = listado
    .order('fecha_emision', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(LIMITE_FILAS)

  // ── KPIs ────────────────────────────────────────────────────
  // Dos ventanas alcanzan para los cuatro números: los emitidos de los
  // últimos 90 días (mes y tasa de aceptación) y todo lo que hoy está
  // activo (pendientes y pipeline). Los KPIs no siguen a los filtros a
  // propósito: son el pulso del consultorio, no del listado.
  const ventana = supabase
    .from('presupuestos')
    .select('estado, fecha_emision, total_a_cargo')
    .neq('estado', 'borrador')
    .gte('fecha_emision', hace90)
    .limit(5000)

  const activos = supabase
    .from('presupuestos_listado')
    .select('estado, total_a_cargo, dias_en_estado')
    .in('estado', ESTADOS_PIPELINE)
    .limit(5000)

  const totalGeneral = supabase
    .from('presupuestos')
    .select('id', { count: 'exact', head: true })

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

  const [resListado, resVentana, resActivos, resTotal, resProf, resOs] = await Promise.all([
    listado,
    ventana,
    activos,
    totalGeneral,
    profesionales,
    obrasSociales,
  ])

  const error =
    resListado.error ?? resVentana.error ?? resActivos.error ?? resTotal.error ?? resProf.error ?? resOs.error
  if (error) {
    console.error('[home] no se pudo leer el listado', error)
    return SIN_DATOS
  }

  const filasVentana = ((resVentana.data ?? []) as FilaCruda[]).map((f) => ({
    estado: f.estado as EstadoPresupuesto,
    fecha_emision: texto(f.fecha_emision),
    total_a_cargo: monto(f.total_a_cargo),
  }))

  const filasActivas = ((resActivos.data ?? []) as FilaCruda[]).map((f) => ({
    estado: f.estado as EstadoPresupuesto,
    total_a_cargo: monto(f.total_a_cargo),
    dias_en_estado: monto(f.dias_en_estado),
  }))

  const delMes = filasVentana.filter((f) => f.fecha_emision >= inicioMes)
  const esperando = filasActivas.filter((f) => esperaRespuesta(f.estado))
  const base30 = filasVentana.filter((f) => f.fecha_emision >= hace30)
  const aceptados = (fs: typeof filasVentana) =>
    fs.filter((f) => f.estado === 'aceptado' || f.estado === 'iniciado').length
  const tasa = (aceptados_: number, base: number) =>
    base === 0 ? null : Math.round((aceptados_ / base) * 100)

  const kpis: KpisHome = {
    emitidosMes: {
      cantidad: delMes.length,
      aCargo: delMes.reduce((t, f) => t + f.total_a_cargo, 0),
    },
    pendientes: {
      cantidad: esperando.length,
      frios: esperando.filter((f) => estaFrio(f.estado, f.dias_en_estado)).length,
    },
    aceptacion: {
      pct30: tasa(aceptados(base30), base30.length),
      base30: base30.length,
      pct90: tasa(aceptados(filasVentana), filasVentana.length),
      base90: filasVentana.length,
    },
    pipeline: {
      monto: filasActivas.reduce((t, f) => t + f.total_a_cargo, 0),
      cantidad: filasActivas.length,
    },
  }

  // `select()` con una lista de columnas armada en runtime no le deja
  // inferir la forma a supabase-js: se normaliza a mano en `aFila`.
  const filas = ((resListado.data ?? []) as unknown as FilaCruda[]).map(aFila)

  return {
    kpis,
    filas,
    truncado: filas.length >= LIMITE_FILAS,
    hayPresupuestos: (resTotal.count ?? 0) > 0,
    profesionales: ((resProf.data ?? []) as FilaCruda[]).map((p) => ({
      value: texto(p.id),
      label: texto(p.nombre),
    })),
    obrasSociales: ((resOs.data ?? []) as FilaCruda[]).map((o) => ({
      value: texto(o.id),
      label: `${texto(o.nombre)}${o.plan ? ` ${texto(o.plan)}` : ''}`,
    })),
    falla: false,
  }
}

/**
 * La home nunca tira una pantalla de error: si la base no contesta se
 * dibuja igual, en su versión vacía y con un aviso arriba. El
 * consultorio tiene que poder seguir trabajando (y abrir el wizard)
 * aunque la lectura falle.
 */
async function cargarHome(filtros: FiltrosHome): Promise<DatosHome> {
  try {
    return await consultarHome(filtros)
  } catch (e) {
    console.error('[home] falló la carga', e)
    return SIN_DATOS
  }
}

export default async function HomePage(props: PageProps<'/'>) {
  const filtros = parseFiltros(await props.searchParams)
  const datos = await cargarHome(filtros)
  const vacia = !datos.hayPresupuestos

  return (
    /* El ancho y el padding los pone el `<main>` del layout: acá sólo el ritmo vertical. */
    <div className="flex flex-col gap-5">
      <BannerConexion />

      <header className="min-w-0">
        <h1 className="t-h2">Presupuestos</h1>
        <p className="t-helper">
          Lo que se emitió, lo que espera respuesta y lo que queda a cargo del paciente.
        </p>
      </header>

      {datos.falla && (
        <Banner
          tono="warm"
          icono={<TriangleAlert className="size-5" />}
          titulo="No se pudieron traer los presupuestos"
        >
          La base no respondió. Recargá la página en un rato; lo que ya está cargado no se pierde.
        </Banner>
      )}

      <BannerBorrador />

      <Kpis kpis={datos.kpis} vacio={vacia} />

      {/* Con la lectura caída no se dibuja el empty state: diría "todavía no
          hay presupuestos" cuando en realidad no se pudieron leer. */}
      {datos.falla ? null : vacia ? (
        <HomeVacia />
      ) : (
        <>
          <BarraFiltros
            filtros={filtros}
            profesionales={datos.profesionales}
            obrasSociales={datos.obrasSociales}
          />

          {datos.filas.length > 0 ? (
            <Listado filas={datos.filas} truncado={datos.truncado} limite={LIMITE_FILAS} />
          ) : (
            <SinResultados termino={filtros.q} />
          )}
        </>
      )}
    </div>
  )
}
