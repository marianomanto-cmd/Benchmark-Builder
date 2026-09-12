'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({
  className,
  children,
  invalido,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & { invalido?: boolean }) {
  return (
    <SelectPrimitive.Trigger
      aria-invalid={invalido || undefined}
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-input border border-hairline bg-card px-3',
        // El alto es fijo: si la etiqueta no entra, se corta con puntos
        // suspensivos y no parte el control en dos líneas.
        'whitespace-nowrap',
        'font-sans text-[14px] text-ink transition-colors',
        'hover:border-primary/30',
        'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
        'disabled:cursor-not-allowed disabled:bg-[#F8FAFB] disabled:text-faint',
        'data-[placeholder]:text-faint',
        invalido && 'border-warm-line focus:border-warm-line focus:ring-warm-line/25',
        className,
      )}
      {...props}
    >
      {/*
        El valor va envuelto y ENCOGIBLE, y la flecha después.

        Antes eran hermanos directos con `justify-between`, y el `span`
        que pinta Radix para el valor es `inline`: no le entra un
        `overflow`, así que no se recortaba nunca y su ancho completo
        empujaba a la flecha. Con «Todos los profesionales» —152px de
        texto en un control de 180 que deja 132— la flecha terminaba 9px
        FUERA del borde del control, y la de al lado 2px: dos flechas a
        distinta distancia del borde, que es exactamente lo que se ve
        como desalineado.

        `flex-1 min-w-0` hace que el texto ceda lugar, `truncate` lo
        corta con puntos suspensivos —lo que el comentario de arriba ya
        prometía— y la flecha queda clavada a `px-3` del borde en TODOS
        los selects de la app, entre en el texto o no.
      */}
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-faint" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className={cn(
          'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
          'rounded-card border border-hairline bg-card p-1.5 shadow-lift animate-enter',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="max-h-[280px]">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-input px-2.5 py-2',
        'font-sans text-[14px] text-ink outline-none',
        'data-[highlighted]:bg-tint',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator asChild>
        <Check className="size-4 shrink-0 text-primary" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label className={cn('t-label px-2.5 py-1.5', className)} {...props} />
}
