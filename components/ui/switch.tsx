'use client'

import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as RadioPrimitive from '@radix-ui/react-radio-group'
import { Check } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill border border-transparent',
        'transition-colors duration-200',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-[#DCE7EA]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-[cubic-bezier(.16,1,.3,1)]',
          'data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer size-[18px] shrink-0 rounded-[5px] border border-hairline bg-card',
        'transition-colors hover:border-primary/50',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="size-3 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export const RadioGroup = RadioPrimitive.Root

export function RadioItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        'size-[18px] shrink-0 rounded-full border border-hairline bg-card',
        'transition-colors hover:border-primary/50',
        'data-[state=checked]:border-primary data-[state=checked]:border-[5px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Grupo de opciones tipo segmented control. Se usa para la vigencia
 * (30/60/otra) y para el estado inicial (Realizado / Enviado).
 */
export function Segmented<T extends string>({
  value,
  onChange,
  opciones,
  className,
}: {
  value: T
  onChange: (v: T) => void
  opciones: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border border-hairline bg-card p-1',
        className,
      )}
    >
      {opciones.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-pill px-3.5 font-sans text-[13px] font-medium transition-colors',
            value === o.value
              ? 'bg-primary text-white'
              : 'text-muted hover:bg-tint hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
