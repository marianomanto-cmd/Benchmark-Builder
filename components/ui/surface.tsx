import * as React from 'react'

import { cn } from '@/lib/utils'

export function Card({
  className,
  hover,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-card border border-hairline bg-card shadow-rest',
        hover &&
          'transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 px-5 pt-5 pb-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('t-h3', className)} {...props} />
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />
}

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" className={cn('h-px w-full bg-hairline', className)} {...props} />
}

/** Banner de aviso. `warm` para la rama negativa, `info` para la neutra. */
export function Banner({
  tono = 'warm',
  icono,
  titulo,
  children,
  acciones,
  className,
}: {
  tono?: 'warm' | 'info'
  icono?: React.ReactNode
  titulo?: React.ReactNode
  children?: React.ReactNode
  acciones?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-start sm:gap-4',
        tono === 'warm'
          ? 'border-warm-line/25 bg-warm-soft text-warm-ink'
          : 'border-primary/20 bg-tint text-ink',
        className,
      )}
      role="status"
    >
      {icono && (
        <span
          aria-hidden
          className={cn(
            'mt-0.5 shrink-0',
            tono === 'warm' ? 'text-warm-line' : 'text-primary',
          )}
        >
          {icono}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        {titulo && (
          <p
            className={cn(
              'font-sans text-[13.5px] font-semibold',
              tono === 'warm' ? 'text-warm-ink' : 'text-ink',
            )}
          >
            {titulo}
          </p>
        )}
        {children && (
          <div
            className={cn(
              'text-[13px] leading-relaxed',
              tono === 'warm' ? 'text-warm-ink/85' : 'text-body',
            )}
          >
            {children}
          </div>
        )}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}

export function EmptyState({
  icono,
  titulo,
  descripcion,
  acciones,
  className,
}: {
  icono?: React.ReactNode
  titulo: string
  descripcion?: React.ReactNode
  acciones?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-hairline bg-card/60 px-6 py-14 text-center',
        className,
      )}
    >
      {icono && <div className="text-primary/60">{icono}</div>}
      <h3 className="t-h3">{titulo}</h3>
      {descripcion && (
        <p className="max-w-md text-[14px] leading-relaxed text-muted">{descripcion}</p>
      )}
      {acciones && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{acciones}</div>}
    </div>
  )
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-input bg-[#EDF4F6]', className)}
      aria-hidden
      {...props}
    />
  )
}
