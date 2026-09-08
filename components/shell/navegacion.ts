import { BookMarked, House, Kanban, UserRound, type LucideIcon } from 'lucide-react'

/**
 * Destinos del shell. Desktop y mobile NO comparten la lista a propósito:
 *
 * - En desktop el Pipeline es una pantalla propia (kanban de columnas).
 * - En mobile no hay kanban usable, así que Pipeline **no es destino**:
 *   es el filtro de estado que vive arriba de Home. En su lugar la tabbar
 *   ofrece Cuenta, que en desktop está dentro del menú de usuario.
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
  { href: '/cuenta', etiqueta: 'Cuenta', icono: UserRound },
]

/**
 * Home sólo se marca activa en la raíz exacta; el resto también en sus
 * subrutas (`/biblioteca/aranceles` deja iluminada Biblioteca).
 */
export function esRutaActiva(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Iniciales para el avatar del menú de usuario: máximo dos letras. */
export function iniciales(nombre: string): string {
  const partes = nombre
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
}
