import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const pillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-pill whitespace-nowrap font-sans transition-colors',
  {
    variants: {
      tono: {
        neutro: 'bg-[#F1F5F7] text-muted border border-hairline',
        primary: 'bg-tint text-primary-hover border border-primary/20',
        solido: 'bg-primary text-white',
        warm: 'bg-warm-soft text-warm-ink border border-warm-line/25',
        contorno: 'bg-transparent text-muted border border-hairline',
      },
      size: {
        sm: 'h-6 px-2 text-[10.5px] font-semibold uppercase tracking-[0.06em]',
        md: 'h-7 px-2.5 text-[12px] font-medium',
      },
    },
    defaultVariants: { tono: 'neutro', size: 'md' },
  },
)

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {}

export function Pill({ className, tono, size, ...props }: PillProps) {
  return <span className={cn(pillVariants({ tono, size }), className)} {...props} />
}

/**
 * Micro-badge de 24px para metadatos dentro de filas:
 * `editado`, `particular`, `vigencia cerrada`, `incompleto`.
 */
export function MicroBadge({
  children,
  tono = 'neutro',
  className,
}: {
  children: React.ReactNode
  tono?: 'neutro' | 'warm' | 'primary'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-pill px-2 t-micro',
        tono === 'warm' && 'bg-warm-soft text-warm-ink border border-warm-line/25',
        tono === 'primary' && 'bg-tint text-primary-hover border border-primary/20',
        tono === 'neutro' && 'bg-[#F1F5F7] text-muted border border-hairline',
        className,
      )}
    >
      {children}
    </span>
  )
}
