/**
 * Dónde puede caer una tarjeta, medido en el momento.
 *
 * POR QUÉ NO ALCANZAN LOS RECTS DE DND-KIT. dnd-kit mide las zonas al
 * levantar la tarjeta y después las corre con el scroll de la página.
 * Eso deja de ser verdad en este tablero por dos lados:
 *
 * - La franja de perdidos es `sticky` al pie: no se mueve cuando la
 *   página scrollea, pero dnd-kit la correría igual, y después de
 *   scrollear soltar sobre la franja dejaría de encontrarla.
 * - El hueco punteado que marca dónde va a caer la tarjeta agranda la
 *   columna destino mientras se arrastra: el rect medido al levantar
 *   ya no llega hasta el pie.
 *
 * Son seis zonas —cinco columnas y la franja—, así que leerlas del DOM
 * en cada movimiento no cuesta nada y siempre dice lo que se ve.
 *
 * Y lo que se ve es lo que cuenta: una columna es destino sólo en la
 * parte que está a la vista. Por arriba la corta su encabezado, que se
 * queda pegado debajo de la topbar —soltar sobre la topbar no es soltar
 * en la columna que pasa por debajo—, y por abajo la corta la franja.
 */

import type {
  ClientRect,
  CollisionDetection,
  DroppableContainer,
  UniqueIdentifier,
} from '@dnd-kit/core'

import { ID_FRANJA_PERDIDO } from './tipos'

export interface Punto {
  x: number
  y: number
}

/** Rectángulo en coordenadas del viewport. */
export interface Caja {
  top: number
  bottom: number
  left: number
  right: number
}

export interface Zonas {
  /** La franja entera, esté habilitada o no: siempre tapa lo que tiene atrás. */
  franja: Caja | null
  /** La parte visible de cada columna, por id de zona. */
  columnas: Map<UniqueIdentifier, Caja>
}

/** Atributo que marca una zona en el DOM. Su valor es el id de la zona. */
export const ATRIBUTO_ZONA = 'data-zona'

/** Atributo del encabezado de cada columna: es el borde de arriba de la zona. */
export const ATRIBUTO_CABECERA = 'data-cabecera'

function caja(r: DOMRect | ClientRect): Caja {
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
}

export function contiene(c: Caja, p: Punto): boolean {
  return p.x >= c.left && p.x <= c.right && p.y >= c.top && p.y <= c.bottom
}

export function leerZonas(): Zonas {
  const nodoFranja = document.querySelector<HTMLElement>(
    `[${ATRIBUTO_ZONA}="${ID_FRANJA_PERDIDO}"]`,
  )
  const franja = nodoFranja ? caja(nodoFranja.getBoundingClientRect()) : null

  const columnas = new Map<UniqueIdentifier, Caja>()
  for (const nodo of document.querySelectorAll<HTMLElement>(`[${ATRIBUTO_ZONA}]`)) {
    const id = nodo.getAttribute(ATRIBUTO_ZONA)
    if (!id || id === ID_FRANJA_PERDIDO) continue

    const r = nodo.getBoundingClientRect()
    const cabecera = nodo.querySelector<HTMLElement>(`[${ATRIBUTO_CABECERA}]`)
    const top = cabecera ? Math.max(r.top, cabecera.getBoundingClientRect().top) : r.top
    // Con la franja pegada al pie, la columna sigue por debajo de ella.
    const bottom = franja && franja.top < r.bottom ? Math.max(top, franja.top) : r.bottom

    columnas.set(id, { top, bottom, left: r.left, right: r.right })
  }

  return { franja, columnas }
}

/**
 * La zona que hay en un punto, o `null`. La franja va primero: cuando
 * está pegada al pie, está ENCIMA de las columnas.
 */
export function zonaEn(p: Punto, zonas: Zonas): UniqueIdentifier | null {
  if (zonas.franja && contiene(zonas.franja, p)) return ID_FRANJA_PERDIDO
  for (const [id, c] of zonas.columnas) {
    if (contiene(c, p)) return id
  }
  return null
}

export function centro(r: ClientRect): Punto {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/**
 * Detección de colisiones del tablero.
 *
 * Con mouse o con el dedo manda el puntero, y nada más: soltar donde no
 * hay zona es cancelar —sobre la topbar, entre dos columnas, sobre los
 * filtros—, que es lo que cualquiera espera de un arrastre. Con teclado
 * no hay puntero: manda el centro de la tarjeta, que `SensorTeclado`
 * ubica siempre adentro de una zona.
 */
export const deteccionTablero: CollisionDetection = ({
  collisionRect,
  droppableContainers,
  pointerCoordinates,
}) => {
  const id = zonaEn(pointerCoordinates ?? centro(collisionRect), leerZonas())
  if (id === null) return []

  // Sólo las habilitadas llegan acá: una franja apagada tapa, pero no recibe.
  const contenedor: DroppableContainer | undefined = droppableContainers.find((c) => c.id === id)
  return contenedor ? [{ id, data: { droppableContainer: contenedor, value: 0 } }] : []
}

/** Aire entre lo que se destapa y la barra pegada que lo tapaba. */
const AIRE = 8

/**
 * Corre la página lo justo para que `el` no quede debajo del encabezado
 * pegado de su columna ni de la franja pegada al pie.
 *
 * El navegador scrollea hasta lo que recibe el foco sólo si está FUERA
 * de la pantalla: no sabe que el pie lo tapa la franja y el borde de
 * arriba, el encabezado de la columna. Con Tab, la tarjeta siguiente
 * podía quedar entera debajo de la franja, con el foco encendido y sin
 * verse.
 */
export function destapar(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  const cabecera = el
    .closest(`[${ATRIBUTO_ZONA}]`)
    ?.querySelector<HTMLElement>(`[${ATRIBUTO_CABECERA}]`)
  const franja = document.querySelector<HTMLElement>(`[${ATRIBUTO_ZONA}="${ID_FRANJA_PERDIDO}"]`)

  const cab = cabecera?.getBoundingClientRect()
  // El borde de abajo del encabezado: donde está ahora, y donde va a
  // quedar cuando se pegue debajo de la topbar si la página baja.
  const bordeAhora = cab?.bottom ?? 0
  const bordePegado = cabecera && cab ? parseFloat(getComputedStyle(cabecera).top) + cab.height : 0
  const abajo = (franja?.getBoundingClientRect().top ?? window.innerHeight) - AIRE

  if (r.top < bordeAhora) {
    window.scrollBy({ top: r.top - bordeAhora - AIRE })
  } else if (r.bottom > abajo) {
    // Bajar lo que falta, sin que el principio quede debajo del
    // encabezado: si no entra entera, que se vea el principio.
    window.scrollBy({ top: Math.max(0, Math.min(r.bottom - abajo, r.top - bordePegado - AIRE)) })
  }
}
