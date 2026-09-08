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

/** searchParams de Next: un valor repetido llega como array. */
type Entrada = Record<string, string | string[] | undefined>

function texto(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return (valor[0] ?? '').trim()
  return (valor ?? '').trim()
}

/** Sólo aceptamos fechas `YYYY-MM-DD`: cualquier otra cosa se descarta. */
function fecha(valor: string | string[] | undefined): string {
  const t = texto(valor)
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : ''
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
    desde: fecha(searchParams.desde),
    hasta: fecha(searchParams.hasta),
  }
}

/** `/` cuando no hay nada aplicado, para no ensuciar la URL. */
export function construirUrl(filtros: FiltrosHome): string {
  const p = new URLSearchParams()
  if (filtros.q) p.set('q', filtros.q)
  if (filtros.estados.length) p.set('estado', filtros.estados.join(','))
  if (filtros.profesional) p.set('prof', filtros.profesional)
  if (filtros.obraSocial) p.set('os', filtros.obraSocial)
  if (filtros.desde) p.set('desde', filtros.desde)
  if (filtros.hasta) p.set('hasta', filtros.hasta)
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
 * PostgREST arma el `or=` con comas y paréntesis: si el término tipeado
 * los trae, rompe el parseo del filtro. Se limpian antes de consultar.
 */
export function terminoSeguro(q: string): string {
  return q.replace(/[,()"\\%*]/g, ' ').replace(/\s+/g, ' ').trim()
}
