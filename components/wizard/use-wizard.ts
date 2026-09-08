'use client'

/**
 * El wizard es un modal sobre la ruta actual, no una ruta propia.
 *
 * Vive en el query param `?nuevo=1`: así el listado de atrás no se
 * desmonta ni se recarga al cerrar (se conservan filtros y scroll), el
 * botón "atrás" del navegador cierra el modal, y cualquier pantalla lo
 * puede abrir sin conocer al wizard.
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

export const PARAM_WIZARD = 'nuevo'

export interface ControlWizard {
  abrir: () => void
  cerrar: () => void
  abierto: boolean
}

export function useWizard(): ControlWizard {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const abierto = searchParams.get(PARAM_WIZARD) === '1'

  const navegar = React.useCallback(
    (mutar: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutar(params)
      const qs = params.toString()
      // `scroll: false` para que el listado de atrás no salte al tope
      // cuando el modal se abre o se cierra.
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const abrir = React.useCallback(() => {
    navegar((p) => p.set(PARAM_WIZARD, '1'))
  }, [navegar])

  const cerrar = React.useCallback(() => {
    navegar((p) => p.delete(PARAM_WIZARD))
  }, [navegar])

  return { abrir, cerrar, abierto }
}
