'use client'

/**
 * Los atajos que valen en toda la app.
 *
 * Viven acá y no en cada pantalla porque son del marco: navegar entre
 * los tres destinos y pedir la ayuda. Cada pantalla suma los suyos
 * (`n` en la home, `w`/`e`/`p` en el detalle, `/` en cualquier
 * buscador) y `useAtajos` ya ignora lo que se tipea en un campo y lo
 * que pasa con un modal abierto.
 *
 * Se eligieron dígitos a propósito: no chocan con ninguna tecla de
 * pantalla y son la convención que ya existe en el navegador para
 * saltar de pestaña.
 */

export interface Atajo {
  tecla: string
  que: string
  donde?: string
}

/**
 * Cada tecla lleva su destino: el handler que las registra y la topbar
 * que las dibuja leen de acá, así que no puede haber una tecla en
 * pantalla que navegue a otro lado —ni al revés— por reordenar una
 * lista.
 */
export interface AtajoNavegacion extends Atajo {
  href: string
}

export const ATAJOS_NAVEGACION: AtajoNavegacion[] = [
  { tecla: '1', que: 'Home', href: '/' },
  { tecla: '2', que: 'Pipeline', href: '/pipeline' },
  { tecla: '3', que: 'Biblioteca', href: '/biblioteca' },
]

export const ATAJOS_PANTALLA: Atajo[] = [
  { tecla: 'N', que: 'Nuevo presupuesto', donde: 'en la home' },
  { tecla: '/', que: 'Ir al buscador', donde: 'en la home y en la biblioteca' },
  { tecla: 'A', que: 'Cargar un arancel', donde: 'en la grilla de aranceles' },
  { tecla: 'W', que: 'Enviar por WhatsApp', donde: 'en un presupuesto' },
  { tecla: 'E', que: 'Cambiar el estado', donde: 'en un presupuesto' },
  { tecla: 'P', que: 'Abrir el PDF', donde: 'en un presupuesto' },
]

/** La tecla que abre la ayuda. Se muestra en el menú de usuario. */
export const TECLA_AYUDA = '?'
