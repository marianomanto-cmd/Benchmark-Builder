'use client'

/**
 * Atajos de teclado **dentro** del wizard.
 *
 * `useAtajos` de `@/lib/hooks/use-atajos` no sirve acá a propósito: se
 * apaga cuando hay un modal abierto (`data-scroll-locked` en el body), y
 * el wizard es exactamente eso. Pero el wizard es también donde el
 * consultorio pasa el día, así que necesita los suyos.
 *
 * Dos, y con criterio distinto:
 *
 *   · **⌘/Ctrl + ⏎** dispara la acción principal del paso. Lleva
 *     modificador justamente para que funcione sin soltar el campo de
 *     texto: se termina de escribir la observación y se guarda.
 *   · **`/`** salta al buscador de prestaciones. Es de una sola tecla,
 *     así que se ignora mientras se escribe.
 *
 * Se apagan solos cuando hay un mini-form abierto encima del paso: ahí
 * la acción principal es la del mini-form, no la del wizard.
 */

import * as React from 'react'

/** ¿El foco está en algo donde se escribe? Ahí los atajos de una tecla no aplican. */
function escribiendo(destino: EventTarget | null): boolean {
  if (!(destino instanceof HTMLElement)) return false
  if (destino.isContentEditable) return true
  const tag = destino.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export interface AtajosWizard {
  /** ⌘/Ctrl + ⏎ — "Siguiente" en los pasos 1 y 2, "Guardar" en el 3. */
  principal?: () => void
  /** `/` — foco en el buscador de prestaciones del paso 2. */
  buscar?: () => void
}

export function useAtajosWizard(activo: boolean, atajos: AtajosWizard): void {
  // Los handlers cambian en cada render (dependen del borrador); el
  // listener no tiene por qué re-suscribirse por eso.
  const ref = React.useRef(atajos)
  React.useEffect(() => {
    ref.current = atajos
  })

  React.useEffect(() => {
    if (!activo) return

    function alTeclear(evento: KeyboardEvent) {
      const { principal, buscar } = ref.current

      if (evento.key === 'Enter' && (evento.metaKey || evento.ctrlKey)) {
        if (!principal) return
        evento.preventDefault()
        principal()
        return
      }

      if (evento.key === '/' && !evento.metaKey && !evento.ctrlKey && !evento.altKey) {
        if (!buscar || escribiendo(evento.target)) return
        evento.preventDefault()
        buscar()
      }
    }

    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [activo])
}

/**
 * Deja el buscador listo para tipear: foco **y** desplegado.
 *
 * El combobox es un botón que abre un popover con el input adentro, así
 * que enfocarlo solo deja al usuario a una tecla más de poder escribir.
 * Cargar un plan de tratamiento son cinco o seis prestaciones seguidas:
 * esa tecla, seis veces, es la diferencia entre cargar con el teclado y
 * volver al mouse en cada vuelta.
 */
export function abrirBuscador(id: string): void {
  if (typeof window === 'undefined') return
  window.requestAnimationFrame(() => {
    const el = document.getElementById(id)
    if (!(el instanceof HTMLElement) || el.getAttribute('aria-expanded') === 'true') return
    el.focus()
    el.click()
  })
}
