import * as React from 'react'

import { ESTILO_ESTADO, ETIQUETA_ESTADO } from '@/lib/estados'
import type { EstadoPresupuesto } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Badge de estado: punto de 6px **y** texto. El color nunca es el único
 * portador de significado.
 */
export function EstadoBadge({
  estado,
  size = 'md',
  className,
}: {
  estado: EstadoPresupuesto
  size?: 'sm' | 'md'
  className?: string
}) {
  const e = ESTILO_ESTADO[estado]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill font-sans font-medium whitespace-nowrap',
        size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-[12px]',
        className,
      )}
      style={{
        backgroundColor: e.fondo,
        color: e.texto,
        border: e.borde ? `1px solid ${e.borde}` : '1px solid transparent',
      }}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: e.punto }}
      />
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}
