import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Tabla de desktop. En mobile no se usa tabla nunca: card por fila.
 * Fila de 15px de padding vertical, hover `--tint`.
 *
 * **Sin scroll horizontal.** Antes esto envolvía la tabla en un
 * `overflow-x-auto` con sombras y barra visible, para que una tabla más
 * ancha que su caja no se cortara sin avisar. Avisaba, sí — pero la
 * solución a una tabla que no entra no es una barra: es una tabla que
 * entra. Arrastrar de costado para leer una fila es incómodo con mouse
 * y directamente hostil con el dedo, y encima esconde columnas enteras
 * detrás de un gesto que mucha gente no descubre.
 *
 * Que no scrollee obliga a que el contenido quepa, que es la regla que
 * queremos: si una tabla nueva no entra, hay que sacarle una columna o
 * repensarla como lista, y ahora eso se nota en seguida en vez de
 * quedar escondido detrás de un scroll.
 *
 * Para que quepa, las celdas parten el texto largo (`break-words` en
 * `Td`/`Th`) en vez de empujar el ancho.
 */
export function Tabla({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-left', className)} {...props} />
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
        't-label px-3 py-2.5 align-middle break-words',
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
        'px-3 py-[15px] align-middle text-[14px] text-body break-words',
        numerico && 'text-right tabular-nums',
        className,
      )}
      {...props}
    />
  )
}
