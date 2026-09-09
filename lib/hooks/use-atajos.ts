'use client'

import * as React from 'react'

/** ¿El foco está en algo donde se escribe? Ahí los atajos no aplican. */
function escribiendo(destino: EventTarget | null): boolean {
  if (!(destino instanceof HTMLElement)) return false
  if (destino.isContentEditable) return true
  const tag = destino.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Atajos de teclado globales.
 *
 * En el mostrador se carga un presupuesto atrás de otro: llegar a
 * «Nuevo» con una tecla ahorra un viaje al mouse cada vez. Se ignoran
 * mientras se está escribiendo, y también cuando hay un modal abierto
 * (Radix marca el body con `data-scroll-locked`), para no disparar algo
 * por atrás de lo que la persona está mirando.
 */
export function useAtajos(mapa: Record<string, () => void>) {
  const ref = React.useRef(mapa)
  React.useEffect(() => {
    ref.current = mapa
  })

  React.useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return
      if (escribiendo(evento.target)) return
      if (document.body.hasAttribute('data-scroll-locked')) return

      const accion = ref.current[evento.key.toLowerCase()]
      if (!accion) return

      evento.preventDefault()
      accion()
    }

    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])
}
