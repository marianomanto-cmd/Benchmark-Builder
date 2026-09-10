'use client'

import * as React from 'react'

/**
 * Alto disponible para el tablero, medido de verdad.
 *
 * POR QUÉ. Las columnas scrollean por adentro para que los encabezados
 * («Enviado», el conteo y el monto) queden siempre a la vista y la
 * página no crezca con la columna más larga. Eso necesita un alto, y
 * antes era `calc(100dvh - 330px)`: un número inventado que sólo
 * acertaba con el tablero sin banner de error, con los filtros en una
 * sola línea y en una ventana alta. Con los filtros envueltos en dos
 * líneas —o con el aviso de «no se pudo traer el pipeline» arriba— las
 * columnas se pasaban del viewport, la página volvía a scrollear y los
 * encabezados se iban para arriba: exactamente lo que el scroll por
 * columna venía a evitar.
 *
 * Se mide una vez, y de nuevo en cada resize del viewport o del propio
 * documento (los filtros que envuelven, un banner que aparece).
 */

/** Por debajo de esto la columna no muestra ni una tarjeta entera. */
const MINIMO = 320

/** Aire al pie, para que la franja no quede pegada al borde. */
const MARGEN = 20

export function useAltoTablero(): [
  React.RefObject<HTMLDivElement | null>,
  number | undefined,
] {
  const ref = React.useRef<HTMLDivElement>(null)
  const [alto, setAlto] = React.useState<number | undefined>(undefined)

  React.useEffect(() => {
    const nodo = ref.current
    if (!nodo) return

    let pedido = 0

    const medir = () => {
      // `rect.top + scrollY` es la distancia al principio del documento,
      // no al borde de la ventana: así la medida no depende de cuánto
      // esté scrolleada la página en el momento de medir.
      const desdeArriba = nodo.getBoundingClientRect().top + window.scrollY
      const disponible = window.innerHeight - desdeArriba - MARGEN
      setAlto(Math.max(MINIMO, Math.round(disponible)))
    }

    // Medir dentro de un frame: el observer se dispara por el mismo
    // cambio de alto que provoca, y sin esto el navegador avisa que el
    // `ResizeObserver` no terminó de entregar sus notificaciones.
    const programar = () => {
      cancelAnimationFrame(pedido)
      pedido = requestAnimationFrame(medir)
    }

    medir()
    window.addEventListener('resize', programar)
    const observador = new ResizeObserver(programar)
    observador.observe(document.body)

    return () => {
      cancelAnimationFrame(pedido)
      window.removeEventListener('resize', programar)
      observador.disconnect()
    }
  }, [])

  return [ref, alto]
}
