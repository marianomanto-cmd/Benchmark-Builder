'use client'

import * as LabelPrimitive from '@radix-ui/react-label'
import * as React from 'react'

import { cn } from '@/lib/utils'

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('t-label block', className)} {...props} />
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalido?: boolean }
>(function Input({ className, invalido, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalido || undefined}
      className={cn(
        'h-9 w-full rounded-input border border-hairline bg-card px-3',
        'font-sans text-[14px] text-ink',
        'transition-colors duration-150',
        'hover:border-primary/30',
        'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
        'disabled:bg-[#F8FAFB] disabled:text-faint disabled:cursor-not-allowed',
        invalido && 'border-warm-line focus:border-warm-line focus:ring-warm-line/25',
        className,
      )}
      {...props}
    />
  )
})

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalido?: boolean }
>(function Textarea({ className, invalido, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalido || undefined}
      className={cn(
        'w-full rounded-input border border-hairline bg-card px-3 py-2.5',
        'font-sans text-[14px] leading-relaxed text-ink resize-y min-h-[84px]',
        'transition-colors duration-150',
        'hover:border-primary/30',
        'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
        invalido && 'border-warm-line focus:border-warm-line focus:ring-warm-line/25',
        className,
      )}
      {...props}
    />
  )
})

/** Input de monto: alineado a la derecha, tabular, con `$` fijo. */
export const InputMonto = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
    value: number | ''
    onChange: (valor: number) => void
    invalido?: boolean
  }
>(function InputMonto({ className, value, onChange, invalido, ...props }, ref) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-faint"
      >
        $
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        aria-invalid={invalido || undefined}
        className={cn(
          'h-9 w-full rounded-input border border-hairline bg-card pl-7 pr-3',
          'text-right font-sans text-[14px] text-ink tabular-nums',
          'transition-colors duration-150 hover:border-primary/30',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
          invalido && 'border-warm-line focus:border-warm-line focus:ring-warm-line/25',
          className,
        )}
        value={value === '' ? '' : new Intl.NumberFormat('es-AR').format(value)}
        onChange={(e) => {
          const limpio = e.target.value.replace(/\D/g, '')
          onChange(limpio === '' ? 0 : Number(limpio))
        }}
        {...props}
      />
    </div>
  )
})

/**
 * Campo completo: label + control + helper/error.
 * El helper es donde vive el contexto auditable (por ejemplo, el valor
 * del arancel detrás de un override).
 */
export function Field({
  label,
  helper,
  error,
  requerido,
  htmlFor,
  children,
  className,
}: {
  label?: string
  helper?: React.ReactNode
  error?: string | null
  requerido?: boolean
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {requerido && <span className="ml-1 text-warm-line">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="t-helper text-warm-ink" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="t-helper">{helper}</p>
      ) : null}
    </div>
  )
}
