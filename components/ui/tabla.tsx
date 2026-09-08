import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Tabla de desktop. En mobile no se usa tabla nunca: card por fila.
 * Fila de 15px de padding vertical, hover `--tint`.
 */
export function Tabla({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-left', className)} {...props} />
    </div>
  )
}

export function Thead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-hairline', className)} {...props} />
}

export function Th({
  className,
  numerico,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numerico?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        't-label px-3 py-2.5 align-middle',
        numerico && 'text-right',
        className,
      )}
      {...props}
    />
  )
}

export function Tbody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-hairline', className)} {...props} />
}

export function Tr({
  className,
  destacada,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { destacada?: boolean }) {
  return (
    <tr
      className={cn(
        'row-hover',
        // Fila con override: teñida warm-faint.
        destacada && 'bg-warm-faint hover:bg-warm-soft',
        className,
      )}
      {...props}
    />
  )
}

export function Td({
  className,
  numerico,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numerico?: boolean }) {
  return (
    <td
      className={cn(
        'px-3 py-[15px] align-middle text-[14px] text-body',
        numerico && 'text-right tabular-nums',
        className,
      )}
      {...props}
    />
  )
}
