'use client'

import { useDroppable } from '@dnd-kit/core'
import { CircleSlash, MoveDown } from 'lucide-react'

import { Monto } from '@/components/ui'
import { ETIQUETA_MOTIVO } from '@/lib/estados'
import { cn } from '@/lib/utils'

import { ID_FRANJA_PERDIDO, plural, type ResumenPerdidos } from './tipos'

/**
 * Perdido NO es una columna, es esta franja al pie.
 *
 * POR QUÉ: como sexta columna competiría visualmente con las cinco que
 * sí están en juego — mismo ancho, mismo peso, misma altura — y encima
 * se iría cargando de presupuestos viejos mes a mes, hasta ser la
 * columna más alta del tablero. Lo perdido no se trabaja, se mide: por
 * eso acá abajo hay un resumen (conteo, monto y motivo dominante) y no
 * una pila de tarjetas.
 *
 * Sigue siendo zona de drop: arrastrar una tarjeta hasta acá abre el
 * selector de motivo.
 */
export function FranjaPerdido({
  resumen,
  periodo,
  arrastrando,
  habilitada,
}: {
  resumen: ResumenPerdidos
  /** Ventana que se está mirando, para no mentir el conteo. */
  periodo: string
  arrastrando: boolean
  /** `false` mientras se arrastra algo que no puede darse por perdido. */
  habilitada: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: ID_FRANJA_PERDIDO,
    data: { tipo: 'perdido' },
    disabled: !habilitada,
  })

  const activa = isOver && habilitada

  return (
    <section
      ref={setNodeRef}
      aria-label="Perdidos"
      className={cn(
        'flex shrink-0 flex-col gap-2 rounded-card border px-4 py-3 transition-colors duration-150',
        'sm:flex-row sm:items-center sm:gap-5',
        activa
          ? 'border-warm-line border-dashed bg-warm ring-2 ring-warm-line/40'
          : arrastrando && habilitada
            ? 'border-dashed border-warm-line/50 bg-warm-soft'
            : // En reposo la franja es sobre todo un resumen, pero el
              // borde punteado del lado del texto la delata como zona de
              // soltar antes de que alguien tenga que descubrirlo
              // arrastrando.
              'border-dashed border-hairline bg-card',
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-pill',
            activa ? 'bg-warm-line/20 text-warm-line' : 'bg-warm-soft text-warm-line',
          )}
        >
          <CircleSlash className="size-4" />
        </span>
        <div>
          <p className="font-sans text-[13.5px] font-semibold text-warm-ink">
            {resumen.cantidad} {plural(resumen.cantidad, 'perdido', 'perdidos')}
          </p>
          <p className="t-helper">{periodo}</p>
        </div>
      </div>

      <div className="sm:border-l sm:border-hairline sm:pl-5">
        <span className="t-label block text-[9.5px] tracking-[0.12em] text-muted">
          No se concretó
        </span>
        <Monto valor={resumen.monto} jerarquia="normal" className="text-[14px]" />
      </div>

      <div className="min-w-0 sm:border-l sm:border-hairline sm:pl-5">
        <span className="t-label block text-[9.5px] tracking-[0.12em] text-muted">
          Motivo dominante
        </span>
        <p className="truncate font-sans text-[13.5px] text-ink">
          {resumen.motivo ? (
            <>
              {ETIQUETA_MOTIVO[resumen.motivo]}{' '}
              <span className="text-muted tabular-nums">
                ({resumen.cantidadMotivo} de {resumen.cantidad})
              </span>
            </>
          ) : resumen.cantidad > 0 ? (
            <span className="text-faint">Sin motivo cargado</span>
          ) : (
            <span className="text-faint">—</span>
          )}
        </p>
      </div>

      <p
        className={cn(
          'flex items-center gap-1.5 font-sans text-[12px] leading-snug sm:ml-auto sm:max-w-[230px] sm:justify-end sm:text-right',
          activa
            ? 'font-semibold text-warm-ink'
            : arrastrando && !habilitada
              ? 'font-medium text-warm-ink'
              : 'text-muted',
        )}
      >
        <MoveDown
          aria-hidden
          className={cn('size-3.5 shrink-0', arrastrando && !habilitada && 'hidden')}
        />
        {activa
          ? 'Soltá para elegir el motivo'
          : arrastrando && !habilitada
            ? 'Un tratamiento ya iniciado no se marca como perdido'
            : 'Arrastrá una tarjeta acá para darla por perdida'}
      </p>
    </section>
  )
}
