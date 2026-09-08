'use client'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Una sola acción `primary` por pantalla. El resto es `secondary` o
 * `ghost`. Nunca un ícono solo en una acción destructiva: `danger` y
 * `warm` siempre llevan texto.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-pill font-sans font-medium text-[13px] leading-none',
    'transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)]',
    'disabled:pointer-events-none disabled:opacity-45',
    'active:scale-[.97]',
    '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white shadow-cta hover:bg-primary-hover active:bg-primary-press',
        secondary:
          'bg-card text-ink border border-hairline hover:bg-tint hover:border-primary/35',
        ghost: 'bg-transparent text-muted hover:bg-tint hover:text-ink',
        warm: 'bg-warm text-warm-ink border border-warm-line/25 hover:bg-warm/70',
        danger:
          'bg-card text-warm-line border border-warm-line/40 hover:bg-warm-soft',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto rounded-none',
      },
      /*
       * Área táctil mínima 44px en mobile (handoff §4), densidad
       * Linear-balanced en desktop (28/34/40).
       *
       * Los dos requisitos se resuelven acá y no en cada botón: la
       * altura arranca en 44px y recién a partir de `md:` baja a la
       * nominal. Si dependiera de que cada llamada recuerde agregar
       * `size="touch" className="md:h-[34px]"`, se cumpliría a veces —
       * que es exactamente lo que pasaba.
       */
      size: {
        sm: 'h-11 px-3 text-[12px] md:h-7',
        md: 'h-11 px-4 md:h-[34px]',
        lg: 'h-11 px-5 md:h-10',
        /** 44px en todos lados: acciones principales de una pantalla. */
        touch: 'h-11 px-5',
        icon: 'size-11 p-0 md:size-[34px]',
        'icon-touch': 'size-11 p-0',
      },
      full: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'secondary', size: 'md', full: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, full, asChild = false, loading, children, disabled, ...props },
    ref,
  ) {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, full }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)

export { buttonVariants }
