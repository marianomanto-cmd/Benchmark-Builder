'use client'

import { Search, X } from 'lucide-react'
import * as React from 'react'

import { Input, Kbd } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Buscador de las listas de la biblioteca.
 *
 * Todas las pantallas de esta sección buscan igual, así que el campo es
 * uno solo: lupa a la izquierda, pista de tecla a la derecha y una `X`
 * para vaciarlo sin tener que seleccionar y borrar. `Esc` también lo
 * vacía, que es lo que la mano espera después de tipear mal un apellido.
 *
 * El atajo `/` lo enfoca; quien lo monta es el dueño de la pantalla,
 * porque `useAtajos` es global y dos campos compitiendo por la misma
 * tecla sería peor que no tenerla.
 */
export function CampoBusqueda({
  id,
  valor,
  onCambiar,
  placeholder,
  etiqueta,
  className,
  estado,
}: {
  id: string
  valor: string
  onCambiar: (valor: string) => void
  placeholder: string
  /** Lo que lee un lector de pantalla: el campo no tiene label visible. */
  etiqueta: string
  className?: string
  /** Texto corto al costado: «buscando…», «12 resultados». */
  estado?: React.ReactNode
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
      />

      <Input
        id={id}
        type="search"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && valor) {
            e.preventDefault()
            e.stopPropagation()
            onCambiar('')
          }
        }}
        placeholder={placeholder}
        aria-label={etiqueta}
        // 44px en mobile: se busca con el pulgar entre paciente y paciente.
        // El padding derecho se reserva según lo que haya del otro lado:
        // fijo en 80px dejaba un hueco muerto en el celular.
        className={cn(
          'h-11 pl-9 [&::-webkit-search-cancel-button]:hidden sm:h-9',
          estado ? 'pr-28' : 'pr-11',
        )}
      />

      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {estado && <span className="t-helper whitespace-nowrap">{estado}</span>}

        {valor ? (
          <button
            type="button"
            onClick={() => onCambiar('')}
            aria-label="Limpiar la búsqueda"
            className="flex size-7 items-center justify-center rounded-pill text-faint transition-colors hover:bg-tint hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary/25"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        ) : (
          <Kbd>/</Kbd>
        )}
      </span>
    </div>
  )
}
