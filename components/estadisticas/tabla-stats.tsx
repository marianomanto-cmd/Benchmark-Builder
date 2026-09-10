import { Card, Tabla, Tbody, Td, Th, Thead, Tr } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * La misma tabla en las dos formas: tabla en desktop, una tarjeta por
 * fila en mobile. La regla del producto es que en el teléfono no hay
 * tablas, y una tabla de seis columnas en 390px es scroll horizontal
 * dentro de scroll vertical.
 *
 * La elección es por CSS y no por `useEsDesktop()`: así el HTML del
 * servidor ya viene con la forma correcta y no parpadea al hidratar.
 */

export interface ColumnaStats<T> {
  clave: string
  encabezado: string
  numerico?: boolean
  /** Se muestra como título de la tarjeta en mobile en vez de par clave/valor. */
  principal?: boolean
  celda: (fila: T) => React.ReactNode
}

export function TablaStats<T>({
  datos,
  columnas,
  claveFila,
  vacio,
}: {
  datos: T[]
  columnas: ColumnaStats<T>[]
  claveFila: (fila: T) => string
  vacio: string
}) {
  if (datos.length === 0) {
    return (
      <p className="rounded-input border border-dashed border-hairline px-4 py-6 text-center t-helper">
        {vacio}
      </p>
    )
  }

  const principal = columnas.find((c) => c.principal) ?? columnas[0]
  const resto = columnas.filter((c) => c !== principal)

  return (
    <>
      <div className="hidden md:block">
        <Card className="overflow-hidden">
          <Tabla>
            <Thead>
              <tr>
                {columnas.map((c) => (
                  <Th key={c.clave} numerico={c.numerico} className={cn(c === columnas[0] && 'pl-5')}>
                    {c.encabezado}
                  </Th>
                ))}
              </tr>
            </Thead>
            <Tbody>
              {datos.map((fila) => (
                <Tr key={claveFila(fila)}>
                  {columnas.map((c) => (
                    <Td
                      key={c.clave}
                      className={cn(
                        c === columnas[0] && 'pl-5',
                        c.numerico && 'text-right tabular-nums',
                      )}
                    >
                      {c.celda(fila)}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Tabla>
        </Card>
      </div>

      <ul className="flex flex-col gap-2.5 md:hidden">
        {datos.map((fila) => (
          <li key={claveFila(fila)} className="rounded-card border border-hairline bg-card p-4">
            <p className="font-sans text-[14.5px] font-semibold text-ink">
              {principal.celda(fila)}
            </p>
            <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
              {resto.map((c) => (
                <div key={c.clave} className="min-w-0">
                  <dt className="t-label">{c.encabezado}</dt>
                  <dd className="mt-0.5 font-sans text-[14px] text-ink tabular-nums">
                    {c.celda(fila)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
