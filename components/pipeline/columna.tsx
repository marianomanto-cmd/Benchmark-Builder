'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, type SortingStrategy } from '@dnd-kit/sortable'
import * as React from 'react'

import { Monto } from '@/components/ui'
import { ETIQUETA_COLUMNA } from '@/lib/estados'
import { cn } from '@/lib/utils'

import { Tarjeta } from './tarjeta'
import { idColumna, plural, resumir, type ClaveColumna, type FilaPipeline } from './tipos'

/**
 * El orden dentro de la columna es por fecha de emisión y no se
 * persiste a mano: la estrategia devuelve `null` para que las tarjetas
 * no se corran mientras se arrastra. Igual usamos `SortableContext`
 * porque es lo que le da al `KeyboardSensor` un mapa de destinos para
 * moverse con las flechas.
 */
const SIN_REORDEN: SortingStrategy = () => null

export function Columna({
  clave,
  filas,
  enVuelo,
  arrastrando,
}: {
  clave: ClaveColumna
  filas: FilaPipeline[]
  /** ids con una acción en vuelo contra el servidor. */
  enVuelo: Record<string, boolean>
  arrastrando: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: idColumna(clave),
    data: { tipo: 'columna', columna: clave },
  })

  const { cantidad, monto } = resumir(filas)
  const ids = React.useMemo(() => filas.map((f) => f.id), [filas])
  const etiqueta = ETIQUETA_COLUMNA[clave]

  return (
    <section
      aria-label={`${etiqueta}: ${cantidad} ${plural(cantidad, 'presupuesto', 'presupuestos')}`}
      className="flex min-w-0 flex-col rounded-card border border-hairline bg-[#F8FBFC]"
    >
      <header className="shrink-0 px-3 pb-2 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="truncate font-display text-[14px] font-semibold leading-tight text-ink">
            {etiqueta}
          </h2>
          <span className="shrink-0 rounded-pill bg-card px-2 py-0.5 font-sans text-[11.5px] font-semibold tabular-nums text-muted ring-1 ring-hairline">
            {cantidad}
          </span>
        </div>
        <Monto valor={monto} jerarquia="normal" className="text-[12.5px]" />
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[140px] flex-1 flex-col gap-2 overflow-y-auto rounded-b-card px-2 pb-2.5 pt-0.5',
          'max-h-[calc(100dvh-330px)] transition-colors duration-150',
          isOver && 'bg-tint ring-2 ring-inset ring-primary/40',
        )}
      >
        <SortableContext items={ids} strategy={SIN_REORDEN}>
          {filas.map((fila) => (
            <Tarjeta
              key={fila.id}
              fila={fila}
              columna={clave}
              enVuelo={Boolean(enVuelo[fila.id])}
            />
          ))}
        </SortableContext>

        {filas.length === 0 && (
          <p
            className={cn(
              'flex flex-1 items-center justify-center rounded-input border border-dashed border-hairline px-2 py-6 text-center font-sans text-[12px] text-faint',
              arrastrando && 'border-primary/40 text-primary-hover',
            )}
          >
            {arrastrando ? 'Soltá acá' : 'Nada en esta etapa'}
          </p>
        )}
      </div>
    </section>
  )
}
