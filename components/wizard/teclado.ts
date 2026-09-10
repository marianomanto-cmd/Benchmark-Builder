'use client'

/**
 * El teclado virtual y el sheet del wizard.
 *
 * En mobile el wizard es un sheet full-screen (`h-[96dvh]`, anclado a
 * `bottom: 0`) y el `Sheet` de `components/ui` monta Vaul con
 * `repositionInputs={false}`. Con esa combinación, cuando aparece el
 * teclado virtual:
 *
 *   · `dvh` no achica nada —el viewport de layout sigue igual—, así que
 *     el sheet conserva su altura y el teclado le tapa el tercio de
 *     abajo;
 *   · ahí abajo están el pie sticky del wizard ("Siguiente", "Guardar")
 *     y, en el paso 2, la franja de totales;
 *   · y el campo que se acaba de tocar puede quedar justo debajo del
 *     borde del teclado, escribiendo a ciegas.
 *
 * `visualViewport` es lo único que reporta el alto real disponible. Con
 * eso se sube el sheet por encima del teclado y se le achica el alto,
 * que es lo que haría `repositionInputs`; el pie queda pegado al borde
 * del teclado y el campo activo se centra en lo que queda visible.
 *
 * Todo se revierte al bajar el teclado y al cerrar el wizard: si el
 * navegador no expone `visualViewport` (o estamos en el dialog de
 * desktop, donde no hay sheet), el hook no toca nada.
 */

import * as React from 'react'

/** Menos que esto es la barra del navegador, no un teclado. */
const MINIMO_TAPADO = 120

export function useTecladoVirtual(activo: boolean): React.RefObject<HTMLDivElement | null> {
  const ancla = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!activo) return
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return

    const sheet = ancla.current?.closest<HTMLElement>('[data-vaul-drawer]')
    // Desktop: el wizard es un dialog centrado, el teclado no lo tapa.
    if (!sheet) return

    const altoOriginal = sheet.style.height
    const bottomOriginal = sheet.style.bottom
    let cuadro = 0

    function centrarFoco() {
      const enfocado = document.activeElement
      if (!(enfocado instanceof HTMLElement) || !sheet?.contains(enfocado)) return
      // Sin `smooth`: el teclado ya está animando y las dos animaciones
      // encimadas hacen saltar la pantalla.
      enfocado.scrollIntoView({ block: 'center' })
    }

    function ajustar() {
      if (!vv || !sheet) return
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(() => {
        const tapado = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        if (tapado > MINIMO_TAPADO) {
          sheet.style.bottom = `${tapado}px`
          sheet.style.height = `${vv.height}px`
          centrarFoco()
        } else {
          sheet.style.bottom = bottomOriginal
          sheet.style.height = altoOriginal
        }
      })
    }

    vv.addEventListener('resize', ajustar)
    vv.addEventListener('scroll', ajustar)
    // Moverse de un campo al siguiente con el teclado ya abierto no
    // dispara `resize`: hay que volver a centrar igual.
    sheet.addEventListener('focusin', ajustar)

    return () => {
      cancelAnimationFrame(cuadro)
      vv.removeEventListener('resize', ajustar)
      vv.removeEventListener('scroll', ajustar)
      sheet.removeEventListener('focusin', ajustar)
      sheet.style.bottom = bottomOriginal
      sheet.style.height = altoOriginal
    }
  }, [activo])

  return ancla
}
