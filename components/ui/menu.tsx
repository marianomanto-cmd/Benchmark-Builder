'use client'

import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as React from 'react'

import { cn } from '@/lib/utils'

export const Menu = DropdownPrimitive.Root
export const MenuTrigger = DropdownPrimitive.Trigger

export function MenuContent({
  className,
  align = 'end',
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-[190px] overflow-hidden rounded-card border border-hairline bg-card p-1.5',
          'shadow-lift animate-enter',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  )
}

export function MenuItem({
  className,
  destructiva,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Item> & { destructiva?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-input px-2.5 py-2',
        'font-sans text-[13px] text-body outline-none transition-colors',
        'data-[highlighted]:bg-tint data-[highlighted]:text-ink',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75] [&_svg]:text-muted',
        destructiva &&
          'text-warm-ink data-[highlighted]:bg-warm-soft data-[highlighted]:text-warm-ink [&_svg]:text-warm-line',
        className,
      )}
      {...props}
    />
  )
}

export function MenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Separator>) {
  return (
    <DropdownPrimitive.Separator
      className={cn('my-1 h-px bg-hairline', className)}
      {...props}
    />
  )
}

export function MenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Label>) {
  return <DropdownPrimitive.Label className={cn('t-label px-2.5 py-1.5', className)} {...props} />
}

/* ── Tooltip ─────────────────────────────────────────────── */

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  contenido,
  children,
  side = 'top',
}: {
  contenido: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              'z-50 max-w-[260px] rounded-input bg-primary-press px-2.5 py-1.5',
              'font-sans text-[12px] leading-snug text-white shadow-lift',
              'animate-enter',
            )}
          >
            {contenido}
            <TooltipPrimitive.Arrow className="fill-[#0D2730]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
