'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'
import { Drawer as Vaul } from 'vaul'

import { cn } from '@/lib/utils'
import { useEsDesktop } from './use-media'

/* ═══════════════════════════════════════════════════════════
   Dialog — modal de desktop
   ═══════════════════════════════════════════════════════════ */

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  ancho = 'md',
  cerrable = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  ancho?: 'sm' | 'md' | 'lg' | 'xl'
  cerrable?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary-press/25 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
          'rounded-hero border border-hairline bg-card shadow-lift',
          'focus:outline-none animate-enter',
          ancho === 'sm' && 'max-w-[440px]',
          ancho === 'md' && 'max-w-[600px]',
          // Wizard pasos 1-2
          ancho === 'lg' && 'max-w-[760px]',
          // Wizard paso 3, con preview del PDF a la derecha
          ancho === 'xl' && 'max-w-[1040px]',
          className,
        )}
        {...props}
      >
        {children}
        {cerrable && (
          <DialogPrimitive.Close
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-pill text-muted transition-colors hover:bg-tint hover:text-ink"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('shrink-0 border-b border-hairline px-6 pb-4 pt-6 pr-14', className)}
      {...props}
    />
  )
}

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn('t-h3', className)} {...props} />
})

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('t-helper mt-1', className)}
      {...props}
    />
  )
})

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-5', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'shrink-0 border-t border-hairline bg-card px-6 py-4',
        'flex flex-wrap items-center justify-end gap-2 rounded-b-hero',
        className,
      )}
      {...props}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   Sheet — full-screen en mobile (Vaul)
   ═══════════════════════════════════════════════════════════ */

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      {children}
    </Vaul.Root>
  )
}

export function SheetContent({
  className,
  children,
  alto = 'auto',
}: {
  className?: string
  children: React.ReactNode
  alto?: 'auto' | 'full'
}) {
  return (
    <Vaul.Portal>
      <Vaul.Overlay className="fixed inset-0 z-50 bg-primary-press/25" />
      <Vaul.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-hero border-t border-hairline bg-card',
          'focus:outline-none',
          alto === 'full' ? 'h-[96dvh]' : 'max-h-[92dvh]',
          className,
        )}
      >
        <div
          aria-hidden
          className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-[#DCE7EA]"
        />
        {children}
      </Vaul.Content>
    </Vaul.Portal>
  )
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shrink-0 px-5 pb-3 pt-4', className)} {...props} />
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof Vaul.Title>) {
  return <Vaul.Title className={cn('t-h3', className)} {...props} />
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof Vaul.Description>) {
  return <Vaul.Description className={cn('t-helper mt-1', className)} {...props} />
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', className)} {...props} />
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'shrink-0 border-t border-hairline px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3',
        'flex flex-col gap-2',
        className,
      )}
      {...props}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   ResponsiveModal — sheet en mobile, dialog en desktop.
   El wizard vive acá: es un modal sobre la ruta actual, no una
   ruta propia, así el listado de atrás no se recarga al cerrar.
   ═══════════════════════════════════════════════════════════ */

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  titulo: string
  descripcion?: string
  /** Ancho del dialog en desktop. */
  ancho?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  footer?: React.ReactNode
  /** Oculta el header visible pero lo deja para lectores de pantalla. */
  headerOculto?: boolean
  className?: string
}

export function ResponsiveModal({
  open,
  onOpenChange,
  titulo,
  descripcion,
  ancho = 'md',
  children,
  footer,
  headerOculto,
  className,
}: ResponsiveModalProps) {
  const esDesktop = useEsDesktop()

  if (esDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent ancho={ancho} className={className}>
          <DialogHeader className={headerOculto ? 'sr-only' : undefined}>
            <DialogTitle>{titulo}</DialogTitle>
            {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
          </DialogHeader>
          <DialogBody>{children}</DialogBody>
          {footer && <DialogFooter>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent alto={ancho === 'xl' || ancho === 'lg' ? 'full' : 'auto'}>
        <SheetHeader className={headerOculto ? 'sr-only' : undefined}>
          <SheetTitle>{titulo}</SheetTitle>
          {descripcion && <SheetDescription>{descripcion}</SheetDescription>}
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  )
}
