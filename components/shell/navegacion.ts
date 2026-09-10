import { BookMarked, House, Kanban, ShieldCheck, type LucideIcon } from 'lucide-react'

/**
 * Destinos del shell. Desktop y mobile NO comparten la lista a propósito:
 *
 * - En desktop el Pipeline es una pantalla propia (kanban de columnas).
 * - En mobile no hay kanban usable, así que Pipeline **no es destino**:
 *   es el filtro de estado que vive arriba de Home.
 *
 * - Equipo sigue siendo pestaña para quien administra, pero ya no es
 *   la única puerta: la hoja de cuenta —que abre la última pestaña,
 *   para todos— tiene «Mi contraseña» y «Cerrar sesión». Antes esas dos
 *   vivían sólo en el menú de la topbar, que en mobile no existe: nadie
 *   podía cerrar sesión desde el celular.
 */

export interface Destino {
  href: string
  etiqueta: string
  icono: LucideIcon
}

export const DESTINOS_DESKTOP: Destino[] = [
  { href: '/', etiqueta: 'Home', icono: House },
  { href: '/pipeline', etiqueta: 'Pipeline', icono: Kanban },
  { href: '/biblioteca', etiqueta: 'Biblioteca', icono: BookMarked },
]

export const DESTINOS_MOBILE: Destino[] = [
  { href: '/', etiqueta: 'Home', icono: House },
  { href: '/biblioteca', etiqueta: 'Biblioteca', icono: BookMarked },
]

/**
 * Home sólo se marca activa en la raíz exacta; el resto también en sus
 * subrutas (`/biblioteca/aranceles` deja iluminada Biblioteca).
 */
export function esRutaActiva(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Los destinos de mobile, con Equipo si quien mira lo administra. */
export function destinosMobile(esAdmin: boolean): Destino[] {
  if (!esAdmin) return DESTINOS_MOBILE
  return [...DESTINOS_MOBILE, { href: '/equipo', etiqueta: 'Equipo', icono: ShieldCheck }]
}
