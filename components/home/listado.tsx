import { Monto } from '@/components/ui'
import { numero } from '@/lib/formato'

import { ListaMobile } from './lista-mobile'
import { TablaPresupuestos } from './tabla-presupuestos'
import type { FilaPresupuesto } from './tipos'

/**
 * El listado en sí. La elección tabla/cards es por CSS y no por
 * `useEsDesktop()`: así el HTML del servidor ya viene con la forma
 * correcta y no hay parpadeo de tabla a card al hidratar.
 */
export function Listado({
  filas,
  truncado,
  limite,
}: {
  filas: FilaPresupuesto[]
  truncado: boolean
  limite: number
}) {
  const aCargo = filas.reduce((total, f) => total + f.total_a_cargo, 0)

  return (
    <section aria-label="Presupuestos" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="t-label">
          {numero(filas.length)} {filas.length === 1 ? 'presupuesto' : 'presupuestos'}
          {truncado && ` de los primeros ${numero(limite)}`}
        </h2>
        <p className="t-helper">
          Suman <Monto valor={aCargo} jerarquia="fuerte" className="text-[12.5px]" /> a cargo
        </p>
      </div>

      {truncado && (
        <p className="t-helper">
          Hay más de {numero(limite)} presupuestos que coinciden. Achicá el rango de fechas o
          filtrá por estado para verlos todos.
        </p>
      )}

      <div className="hidden md:block">
        <TablaPresupuestos filas={filas} />
      </div>

      <div className="md:hidden">
        <ListaMobile filas={filas} />
      </div>
    </section>
  )
}
