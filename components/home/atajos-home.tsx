'use client'

import { useWizard } from '@/components/wizard/use-wizard'
import { useAtajos } from '@/lib/hooks/use-atajos'

/**
 * Atajos de la home.
 *
 * En el mostrador se carga un presupuesto atrás de otro y se busca un
 * paciente cada dos minutos: son las dos cosas que se repiten todo el
 * día, así que son las dos que tienen tecla.
 *
 *   n  → abrir el wizard de alta
 *   /  → enfocar la búsqueda
 *
 * `useAtajos` ya ignora lo que se teclea dentro de un campo y lo que
 * pasa con un modal abierto, así que escribir "n" en la búsqueda no
 * abre nada y `/` se puede tipear como carácter.
 */

/** El campo de búsqueda. Compartido con la barra de filtros. */
export const ID_BUSQUEDA = 'busqueda-presupuestos'

export function AtajosHome() {
  const { abrir } = useWizard()

  useAtajos({
    n: abrir,
    '/': () => {
      const campo = document.getElementById(ID_BUSQUEDA)
      // En la pantalla vacía no hay barra de filtros: mejor no hacer
      // nada que mover el foco a cualquier lado.
      if (!(campo instanceof HTMLInputElement)) return
      campo.focus()
      campo.select()
    },
  })

  return null
}
