import { BookMarked, ChartNoAxesColumn, House, Kanban, type LucideIcon } from 'lucide-react'

/**
 * Destinos del shell. Desktop y mobile NO comparten la lista a propósito:
 *
 * - En desktop el Pipeline es una pantalla propia (kanban de columnas).
 * - En mobile no hay kanban usable, así que Pipeline **no es destino**:
 *   es el filtro de estado que vive arriba de Home.
 *
 * - Equipo NO es pestaña: vive en la hoja de cuenta, junto con «Mi
 *   contraseña» y «Cerrar sesión», que es donde uno busca las cosas de
 *   su acceso. Tenerlo además en la tabbar duplicaba la puerta y hacía
 *   que la barra cambiara de forma según el rol de quien mira: cuatro
 *   pestañas para el admin, tres para el resto, y el pulgar aprendiendo
 *   dos mapas distintos. Ese lugar lo ocupa Estadísticas, que es
 *   contenido y no configuración.
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
  { href: '/estadisticas', etiqueta: 'Estadísticas', icono: ChartNoAxesColumn },
]

export const DESTINOS_MOBILE: Destino[] = [
  { href: '/', etiqueta: 'Home', icono: House },
  { href: '/biblioteca', etiqueta: 'Biblioteca', icono: BookMarked },
  { href: '/estadisticas', etiqueta: 'Estadísticas', icono: ChartNoAxesColumn },
]

/**
 * Home sólo se marca activa en la raíz exacta; el resto también en sus
 * subrutas (`/biblioteca/aranceles` deja iluminada Biblioteca).
 */
export function esRutaActiva(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Los destinos de mobile. Los mismos para todo el mundo: la tabbar no
 * cambia de forma según el rol. Lo de administrar está en la hoja de
 * cuenta, que sí sabe quién mira.
 */
export function destinosMobile(): Destino[] {
  return DESTINOS_MOBILE
}
