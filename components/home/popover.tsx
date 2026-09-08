'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Popover mínimo para los filtros de la home.
 *
 * No va en `components/ui` a propósito: el contrato pide que los
 * primitivos que le faltan a una pantalla vivan en su propia carpeta.
 * Se usa en lugar del `Menu` porque adentro hay checkboxes e inputs de
 * fecha, y el menú de Radix se queda con el teclado (typeahead).
 */

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverClose = PopoverPrimitive.Close

export function PopoverContent({
  className,
  align = 'start',
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-[240px] rounded-card border border-hairline bg-card p-2',
          'shadow-lift animate-enter',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
