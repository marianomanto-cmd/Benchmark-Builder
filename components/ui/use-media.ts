'use client'

import * as React from 'react'

/**
 * Breakpoint único del producto. Debajo de 768px es mobile: sheets
 * full-screen, cards en vez de tabla, tabbar + FAB.
 */
export const BREAKPOINT_DESKTOP = 768

export function useMediaQuery(query: string): boolean {
  const suscribir = React.useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    [query],
  )

  return React.useSyncExternalStore(
    suscribir,
    () => window.matchMedia(query).matches,
    // En el servidor asumimos desktop; el primer render del cliente
    // corrige sin flash porque el layout ya es responsive por CSS.
    () => false,
  )
}

export function useEsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINT_DESKTOP}px)`)
}
