'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { RANGOS, type ClaveRango } from '@/lib/estadisticas'
import { cn } from '@/lib/utils'

/**
 * La ventana que mira la pantalla, en la URL.
 *
 * En la URL y no en estado: así el rango se comparte con un link, el
 * back del navegador vuelve al anterior y la página se sigue
 * renderizando en el servidor, que es donde están las cuentas.
 *
 * `useTransition` mantiene los botones vivos mientras el servidor
 * contesta: deshabilitarlos hace parecer que se rompió, y volver a
 * tocar el mismo rango tiene que poder cancelarse.
 */
export function SelectorRango({ actual }: { actual: ClaveRango }) {
  const router = useRouter()
  const params = useSearchParams()
  const [pendiente, arrancar] = React.useTransition()

  function elegir(clave: ClaveRango) {
    if (clave === actual) return
    const siguiente = new URLSearchParams(params)
    siguiente.set('rango', clave)
    arrancar(() => router.replace(`/estadisticas?${siguiente}`, { scroll: false }))
  }

  return (
    <div
      role="group"
      aria-label="Ventana de tiempo"
      aria-busy={pendiente || undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border border-hairline bg-card p-1',
        pendiente && 'opacity-70',
      )}
    >
      {RANGOS.map((r) => {
        const activo = r.clave === actual
        return (
          <button
            key={r.clave}
            type="button"
            aria-current={activo ? 'true' : undefined}
            onClick={() => elegir(r.clave)}
            className={cn(
              // 44px en mobile: es la regla del producto y estos
              // cuatro botones son lo único que se toca en la pantalla.
              'press inline-flex h-11 items-center rounded-pill px-3.5 font-sans text-[13px] font-medium transition-colors md:h-8',
              activo
                ? 'bg-primary text-white'
                : 'text-muted hover:bg-tint hover:text-ink',
            )}
          >
            {r.etiqueta}
          </button>
        )
      })}
    </div>
  )
}
