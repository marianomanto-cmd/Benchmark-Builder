import { LayoutGrid, List } from 'lucide-react'
import Link from 'next/link'

import type { FiltrosHome } from '@/components/home/tipos'
import { Monto } from '@/components/ui'

import { plural, urlLista } from './tipos'

/**
 * Encabezado del tablero: qué hay en juego y cómo volver a la lista.
 *
 * El total lo calcula el tablero a partir de las mismas filas que
 * dibuja, no una consulta aparte: si una tarjeta se mueve de forma
 * optimista, el número de arriba acompaña en el mismo render.
 */
export function Encabezado({
  filtros,
  cantidad,
  monto,
}: {
  filtros: FiltrosHome
  cantidad: number
  monto: number
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="t-h2">Pipeline</h1>
        <p className="t-helper">
          {cantidad === 0
            ? 'No hay presupuestos esperando respuesta.'
            : `${cantidad} ${plural(cantidad, 'presupuesto', 'presupuestos')} en juego, del primer envío al tratamiento iniciado.`}
        </p>
      </div>

      <div className="flex items-end gap-5">
        <div className="text-right">
          <span className="t-label block text-[9.5px] tracking-[0.12em] text-muted">
            Total a cargo
          </span>
          <Monto valor={monto} jerarquia="hero" />
        </div>

        {/* Mismo par que la barra de Home, con el estado invertido. */}
        <div
          role="group"
          aria-label="Vista del listado"
          className="hidden items-center gap-1 rounded-pill border border-hairline bg-card p-1 md:inline-flex"
        >
          <Link
            href={urlLista(filtros)}
            className="inline-flex h-8 items-center gap-1.5 rounded-pill px-3.5 font-sans text-[13px] font-medium text-muted transition-colors hover:bg-tint hover:text-ink"
          >
            <List aria-hidden className="size-4" />
            Lista
          </Link>
          <span
            aria-current="page"
            className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-primary px-3.5 font-sans text-[13px] font-medium text-white"
          >
            <LayoutGrid aria-hidden className="size-4" />
            Kanban
          </span>
        </div>
      </div>
    </header>
  )
}
