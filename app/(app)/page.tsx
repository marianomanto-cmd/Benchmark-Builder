import { startOfMonth, subDays } from 'date-fns'
import { TriangleAlert } from 'lucide-react'

import { AtajosHome } from '@/components/home/atajos-home'
import { BannerBorrador } from '@/components/home/banner-borrador'
import { BannerConexion } from '@/components/home/banner-conexion'
import { BarraFiltros } from '@/components/home/barra-filtros'
import { HomeVacia, SinResultados } from '@/components/home/estado-vacio'
import { parseFiltros, parsePagina } from '@/components/home/filtros-url'
import { Kpis } from '@/components/home/kpis'
import { Listado } from '@/components/home/listado'
import {
  COLUMNAS_LISTADO,
  KPIS_VACIOS,
  OBRA_SOCIAL_PARTICULAR,
  type EstadoDatos,
  type FilaPresupuesto,
  type FiltrosHome,
  type KpisHome,
  type OpcionFiltro,
  type Pagina,
} from '@/components/home/tipos'
import { Banner } from '@/components/ui'
import { ESTADOS_PIPELINE, esperaRespuesta, estaFrio } from '@/lib/estados'
import { isoDate } from '@/lib/formato'
import { createClient } from '@/lib/supabase/server'
import type { EstadoPresupuesto } from '@/lib/types'
import { palabrasBusqueda, patronDeDigitos } from '@/lib/busqueda'

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

/**
 * Filas por página.
 *
 * Antes se traían 200 de una y, pasadas esas, la única salida que se
 * ofrecía era "achicá el rango de fechas": a los presupuestos viejos no
 * se llegaba. Con paginado por URL se llega a todos, el back del
 * navegador vuelve a la página anterior y el link se puede compartir.
 */
const POR_PAGINA = 50

interface DatosHome {
  kpis: KpisHome
  filas: FilaPresupuesto[]
  pagina: Pagina
  hayPresupuestos: boolean
  profesionales: OpcionFiltro[]
  obrasSociales: OpcionFiltro[]
  falla: boolean
}

function paginaVacia(actual = 1): Pagina {
  return { actual, porPagina: POR_PAGINA, total: 0, paginas: 1 }
}

const SIN_DATOS: DatosHome = {
  kpis: KPIS_VACIOS,
  filas: [],
  pagina: paginaVacia(),
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

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * Una página del listado. Se arma como función y no como constante
 * porque hay que poder repetirla: un `?p=` más allá del final vuelve
 * vacío y hay que reintentar en la última que sí existe.
 */
function consultarPagina(supabase: Supabase, filtros: FiltrosHome, pagina: number) {
  let listado = supabase
    .from('presupuestos_listado')
    // El total exacto es lo que permite decir "51–100 de 632" en vez de
    // "los primeros 200": sin él no se sabe si hay una página más.
    .select(COLUMNAS_LISTADO, { count: 'exact' })

  /*
   * Cada palabra por separado contra `busqueda`, que la vista trae ya
   * normalizada: número, paciente, DNI, afiliado, obra social,
   * profesional y prestación principal, sin acentos y en minúsculas.
   *
   * Antes eran cuatro `ilike` con el término entero, y `ilike` en
   * Postgres distingue acentos: «Gomez» no encontraba ninguno de los 31
   * presupuestos de «Gómez, Renata», y copiar el nombre del propio
   * listado y pegarlo tampoco, porque la coma se reemplaza por un
   * espacio y lo guardado la tiene.
   */
  for (const palabra of palabrasBusqueda(filtros.q)) {
    const digitos = patronDeDigitos(palabra)
    listado = digitos
      ? listado.or(`busqueda.like.%${palabra}%,busqueda.like.${digitos}`)
      : listado.like('busqueda', `%${palabra}%`)
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

  const inicio = (pagina - 1) * POR_PAGINA

  return listado
    .order('fecha_emision', { ascending: false })
    .order('created_at', { ascending: false })
    .range(inicio, inicio + POR_PAGINA - 1)
}

async function consultarHome(filtros: FiltrosHome, pagina: number): Promise<DatosHome> {
  const supabase = await createClient()

  const hoy = new Date()
  const inicioMes = isoDate(startOfMonth(hoy))
  const hace30 = isoDate(subDays(hoy, 30))
  const hace90 = isoDate(subDays(hoy, 90))

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

  const [paginaPedida, resVentana, resActivos, resTotal, resProf, resOs] = await Promise.all([
    consultarPagina(supabase, filtros, pagina),
    ventana,
    activos,
    totalGeneral,
    profesionales,
    obrasSociales,
  ])

  // Una página que ya no existe (link viejo, `?p=` a mano, un filtro
  // que achicó el resultado) no es una falla ni "no hay presupuestos":
  // `.range()` viaja como `offset`/`limit`, así que Postgres devuelve
  // 200 con cero filas y el conteo real. Con ese conteo se cae a la
  // última página que sí existe.
  let resListado = paginaPedida
  let actual = pagina
  if (!resListado.error) {
    const cuenta = resListado.count ?? 0
    const ultima = Math.max(1, Math.ceil(cuenta / POR_PAGINA))
    if (cuenta > 0 && actual > ultima) {
      actual = ultima
      resListado = await consultarPagina(supabase, filtros, actual)
    }
  }

  const error =
    resListado.error ?? resVentana.error ?? resActivos.error ?? resTotal.error ?? resProf.error ?? resOs.error
  if (error) {
    console.error('[home] no se pudo leer el listado', error)
    return { ...SIN_DATOS, pagina: paginaVacia(actual) }
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
  const total = resListado.count ?? filas.length

  return {
    kpis,
    filas,
    pagina: {
      actual,
      porPagina: POR_PAGINA,
      total,
      paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    },
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
async function cargarHome(filtros: FiltrosHome, pagina: number): Promise<DatosHome> {
  try {
    return await consultarHome(filtros, pagina)
  } catch (e) {
    console.error('[home] falló la carga', e)
    return SIN_DATOS
  }
}

export default async function HomePage(props: PageProps<'/'>) {
  const searchParams = await props.searchParams
  const filtros = parseFiltros(searchParams)
  const datos = await cargarHome(filtros, parsePagina(searchParams))
  const vacia = !datos.hayPresupuestos

  /* Vacío y caído se ven parecido y no son lo mismo: uno promete que se
     va a llenar, el otro avisa que no se pudo leer. */
  const estado: EstadoDatos = datos.falla ? 'falla' : vacia ? 'vacio' : 'ok'

  return (
    /* El ancho y el padding los pone el `<main>` del layout: acá sólo el ritmo vertical. */
    <div className="flex flex-col gap-5">
      <BannerConexion />

      {/* `n` abre el wizard, `/` enfoca la búsqueda. Se cargan siempre,
          también en la pantalla vacía: ahí `n` es justo lo que se quiere. */}
      <AtajosHome />

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

      <Kpis kpis={datos.kpis} estado={estado} />

      {/* Con la lectura caída no se dibuja el empty state: diría "todavía no
          hay presupuestos" cuando en realidad no se pudieron leer. */}
      {datos.falla ? null : vacia ? (
        <HomeVacia />
      ) : (
        /* El listado va adentro de la barra: mientras la navegación por
           un filtro está en vuelo, lo que se está mirando es viejo y
           tiene que verse viejo. */
        <BarraFiltros
          filtros={filtros}
          profesionales={datos.profesionales}
          obrasSociales={datos.obrasSociales}
        >
          {datos.filas.length > 0 ? (
            <Listado filas={datos.filas} filtros={filtros} pagina={datos.pagina} />
          ) : (
            <SinResultados filtros={filtros} />
          )}
        </BarraFiltros>
      )}
    </div>
  )
}
