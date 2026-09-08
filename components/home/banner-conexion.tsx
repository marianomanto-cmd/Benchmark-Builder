'use client'

import { WifiOff } from 'lucide-react'
import * as React from 'react'

/**
 * Aviso discreto de que se cayó la conexión.
 *
 * El consultorio carga presupuestos con el celular en la sala: la red
 * se corta seguido. No es un error ni bloquea nada, así que va como una
 * tira fina y no como banner de página.
 */

function suscribir(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

export function BannerConexion() {
  const enLinea = React.useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    // En el servidor se asume con conexión: así el primer render no
    // muestra un aviso que se apaga solo un instante después.
    () => true,
  )

  if (enLinea) return null

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-pill border border-warm-line/25 bg-warm-soft px-3.5 py-2 text-warm-ink"
    >
      <WifiOff aria-hidden className="size-4 shrink-0 text-warm-line" />
      <p className="text-[12.5px] leading-snug">
        <span className="font-semibold">Sin conexión.</span> Se sigue cargando; sincroniza al
        volver.
      </p>
    </div>
  )
}
