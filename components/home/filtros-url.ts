/**
 * Los filtros de la home viven en la URL, no en estado de React.
 *
 * Así el botón "atrás" del navegador deshace un filtro, el link se
 * puede pegar en un chat del consultorio y el Server Component puede
 * resolver la consulta sin un ida y vuelta extra al cliente.
 *
 * Sin `'use client'`: lo usan tanto la página del servidor como la
 * barra de filtros del navegador.
 */

import { ESTADOS } from '@/lib/estados'
import type { EstadoPresupuesto } from '@/lib/types'

import { OBRA_SOCIAL_PARTICULAR, type FiltrosHome } from './tipos'

export const FILTROS_VACIOS: FiltrosHome = {
  q: '',
  estados: [],
  profesional: '',
  obraSocial: '',
  desde: '',
  hasta: '',
}

/** Filas por página. Ver `POR_PAGINA` en la home para el porqué. */
export const PARAM_PAGINA = 'p'

/** searchParams de Next: un valor repetido llega como array. */
type Entrada = Record<string, string | string[] | undefined>

function texto(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return (valor[0] ?? '').trim()
  return (valor ?? '').trim()
}

/**
 * Sólo aceptamos fechas `YYYY-MM-DD` **que existan**.
 *
 * La forma sola no alcanza: `2026-13-45`, `2026-02-30` y `0000-00-00`
 * la cumplen y viajaban tal cual al `.gte('fecha_emision', …)`. Postgres
 * las rechaza («date/time field value out of range»), la consulta
 * devolvía error y la home entera se caía al estado de falla: los
 * cuatro KPIs en «—», el listado vacío y el banner «La base no
 * respondió» culpando a la base de un parámetro de la URL.
 *
 * Es el mismo agujero que este archivo ya tapaba para `?prof=`, que
 * también iría a un `.eq()` contra una columna tipada.
 */
function fecha(valor: string | string[] | undefined): string {
  const t = texto(valor)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return ''
  // El round-trip descarta lo imposible: `Date.UTC` normaliza el 30 de
  // febrero a marzo, así que si vuelve distinto es que no existía.
  const [a, m, d] = t.split('-').map(Number)
  if (a < 1000 || m < 1 || m > 12 || d < 1 || d > 31) return ''
  const fechaReal = new Date(Date.UTC(a, m - 1, d))
  const vuelve =
    fechaReal.getUTCFullYear() === a &&
    fechaReal.getUTCMonth() === m - 1 &&
    fechaReal.getUTCDate() === d
  return vuelve ? t : ''
}

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function uuid(valor: string | string[] | undefined): string {
  const v = texto(valor)
  return ES_UUID.test(v) ? v : ''
}

/** La obra social admite además el sentinela de «Particular». */
function obraSocialFiltro(valor: string | string[] | undefined): string {
  const v = texto(valor)
  if (v === OBRA_SOCIAL_PARTICULAR) return v
  return ES_UUID.test(v) ? v : ''
}

export function parseFiltros(searchParams: Entrada): FiltrosHome {
  const crudos = texto(searchParams.estado)
  const estados = crudos
    .split(',')
    .map((e) => e.trim())
    .filter((e): e is EstadoPresupuesto => (ESTADOS as string[]).includes(e))

  const desde = fecha(searchParams.desde)
  const hasta = fecha(searchParams.hasta)

  return {
    q: texto(searchParams.q),
    // Sin duplicados y en el orden canónico de la máquina de estados.
    estados: ESTADOS.filter((e) => estados.includes(e)),
    // Un `?prof=cualquier-cosa` iría directo a un `.eq()` contra una
    // columna uuid: Postgres rechaza el cast y la pantalla se queda
    // trabada en el estado de falla. Lo que no es un uuid se descarta,
    // que es lo mismo que no filtrar.
    profesional: uuid(searchParams.prof),
    obraSocial: obraSocialFiltro(searchParams.os),
    // Un rango dado vuelta (`desde` posterior a `hasta`) no devuelve
    // nada y se lee como "no hay presupuestos", que es mentira. Se
    // endereza acá, que es donde se decide qué significa la URL.
    desde: hasta && desde > hasta ? hasta : desde,
    hasta: hasta && desde > hasta ? desde : hasta,
  }
}

/**
 * Página del listado, 1-based. Lo que no sea un entero positivo vuelve
 * a la primera: un `?p=0` o un `?p=abc` no puede trabar la pantalla.
 *
 * `isSafeInteger` no es paranoia: un `?p=1e21` tipeado a mano sale de
 * `parseInt` como `1e+21`, viaja así en el `offset` de PostgREST,
 * Postgres lo rechaza y la home termina diciendo «no se pudieron traer
 * los presupuestos» —o sea, culpando a la base de un número inventado
 * en la URL—. Un `?p=` grande pero sano ya cae solo en la última
 * página, que es el camino que corresponde.
 */
export function parsePagina(searchParams: Entrada): number {
  const n = Number.parseInt(texto(searchParams[PARAM_PAGINA]), 10)
  return Number.isSafeInteger(n) && n >= 1 ? n : 1
}

/**
 * `/` cuando no hay nada aplicado, para no ensuciar la URL.
 *
 * La página se pasa aparte y por default vuelve a la primera: cambiar
 * un filtro estando en la página 4 dejaba una lista vacía que parecía
 * "no hay resultados".
 */
export function construirUrl(filtros: FiltrosHome, pagina = 1): string {
  const p = new URLSearchParams()
  if (filtros.q) p.set('q', filtros.q)
  if (filtros.estados.length) p.set('estado', filtros.estados.join(','))
  if (filtros.profesional) p.set('prof', filtros.profesional)
  if (filtros.obraSocial) p.set('os', filtros.obraSocial)
  if (filtros.desde) p.set('desde', filtros.desde)
  if (filtros.hasta) p.set('hasta', filtros.hasta)
  if (pagina > 1) p.set(PARAM_PAGINA, String(pagina))
  const qs = p.toString()
  return qs ? `/?${qs}` : '/'
}

export function hayFiltrosActivos(filtros: FiltrosHome): boolean {
  return (
    filtros.q !== '' ||
    filtros.estados.length > 0 ||
    filtros.profesional !== '' ||
    filtros.obraSocial !== '' ||
    filtros.desde !== '' ||
    filtros.hasta !== ''
  )
}

/** Cuántos filtros hay puestos, para el contador del botón "Limpiar". */
export function contarFiltros(filtros: FiltrosHome): number {
  let n = 0
  if (filtros.q) n += 1
  if (filtros.estados.length) n += 1
  if (filtros.profesional) n += 1
  if (filtros.obraSocial) n += 1
  if (filtros.desde || filtros.hasta) n += 1
  return n
}

/**
 * Los filtros que NO son la búsqueda de texto. En mobile viven en un
 * sheet aparte, y el botón que lo abre necesita saber si trae algo.
 */
export function contarFiltrosAvanzados(filtros: FiltrosHome): number {
  let n = 0
  if (filtros.estados.length) n += 1
  if (filtros.profesional) n += 1
  if (filtros.obraSocial) n += 1
  if (filtros.desde || filtros.hasta) n += 1
  return n
}
