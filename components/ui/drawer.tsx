'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Drawer lateral de desktop. Lo usa el historial de vigencias
 * (pantalla 10). En mobile cae a full-screen desde abajo por CSS.
 */
export function Drawer({
  open,
  onOpenChange,
  titulo,
  descripcion,
  children,
  footer,
  ancho = 'md',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  titulo: string
  descripcion?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  ancho?: 'md' | 'lg'
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary-press/25 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col bg-card focus:outline-none',
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-hero border-t border-hairline',
            'md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:h-full',
            'md:rounded-none md:rounded-l-hero md:border-l md:border-t-0',
            ancho === 'md' ? 'md:w-[480px]' : 'md:w-[620px]',
            'shadow-lift animate-enter',
          )}
        >
          <div className="shrink-0 border-b border-hairline px-6 pb-4 pt-6 pr-14">
            <DialogPrimitive.Title className="t-h3">{titulo}</DialogPrimitive.Title>
            {descripcion && (
              <DialogPrimitive.Description className="t-helper mt-1">
                {descripcion}
              </DialogPrimitive.Description>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer && (
            <div className="shrink-0 border-t border-hairline bg-card px-6 py-4">{footer}</div>
          )}

          <DialogPrimitive.Close
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-pill text-muted transition-colors hover:bg-tint hover:text-ink"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
