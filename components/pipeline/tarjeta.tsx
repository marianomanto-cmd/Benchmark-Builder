'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { EstadoBadge, MicroBadge, Monto, TransicionPresupuesto } from '@/components/ui'
import { estaFrio } from '@/lib/estados'
import { fechaCorta } from '@/lib/formato'
import { cn } from '@/lib/utils'

import { textoDias, type ClaveColumna, type FilaPipeline } from './tipos'

/**
 * Tarjeta del kanban.
 *
 * Muestra lo que se necesita para decidir a quién llamar hoy: paciente,
 * prestación principal, obra social, lo que queda a cargo y hace cuánto
 * que la tarjeta no se mueve. El documento completo está a un clic.
 */

interface TarjetaProps {
  fila: FilaPipeline
  columna: ClaveColumna
  /** Hay una acción en vuelo contra el servidor: no se puede volver a mover. */
  enVuelo?: boolean
}

/**
 * Un tratamiento que ya arrancó no se mueve de un arrastre: el gesto es
 * demasiado barato para deshacer algo que ya pasó en el sillón, y
 * corregirlo se hace desde el detalle, donde el cambio es explícito.
 *
 * Antes la tarjeta se arrastraba igual y el «no» llegaba recién al
 * soltar, con un toast: todo el tablero se ofrecía como destino válido
 * para un gesto que nunca podía terminar bien. Ahora no levanta, y la
 * tarjeta dice por qué.
 */
function bloqueada(fila: FilaPipeline): boolean {
  return fila.estado === 'iniciado'
}

/**
 * Con qué agarrar la tarjeta después de que cambió de columna.
 *
 * Mover una tarjeta la saca de una lista y la mete en otra: React
 * desmonta el nodo y monta uno nuevo, así que el foco del teclado se
 * cae al `body` y quien venía navegando sin mouse volvía al principio
 * de la página después de cada movimiento. El tablero lo devuelve al
 * lugar por id. Ver `devolverFoco` en `tablero.tsx`.
 */
export function idTarjeta(id: string): string {
  return `tarjeta-pipeline-${id}`
}

export function Tarjeta({ fila, columna, enVuelo = false }: TarjetaProps) {
  const fija = bloqueada(fila)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: fila.id,
    data: { tipo: 'tarjeta', columna },
    disabled: enVuelo || fija,
    attributes: {
      roleDescription: 'tarjeta de presupuesto',
    },
  })

  return (
    <TransicionPresupuesto id={fila.id} variante="listado-desktop">
      <TarjetaBase
        ref={setNodeRef}
        id={idTarjeta(fila.id)}
        fila={fila}
        enVuelo={enVuelo}
        fija={fija}
        /* El original se atenúa y el que sigue al mouse es el `DragOverlay`. */
        atenuada={isDragging}
        interactiva={!fija}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        {...attributes}
        {...listeners}
      />
    </TransicionPresupuesto>
  )
}

/**
 * La misma tarjeta sin drag & drop: la usa el `DragOverlay` mientras se
 * arrastra, levantada con sombra y una pizca de rotación.
 */
export function TarjetaFantasma({ fila }: { fila: FilaPipeline }) {
  return <TarjetaBase fila={fila} levantada />
}

/* ═══════════════════════════════════════════════════════════
   Base compartida
   ═══════════════════════════════════════════════════════════ */

interface TarjetaBaseProps extends React.HTMLAttributes<HTMLElement> {
  fila: FilaPipeline
  enVuelo?: boolean
  atenuada?: boolean
  levantada?: boolean
  interactiva?: boolean
  /** El estado no se cambia arrastrando. */
  fija?: boolean
}

const TarjetaBase = React.forwardRef<HTMLElement, TarjetaBaseProps>(function TarjetaBase(
  { fila, enVuelo, atenuada, levantada, interactiva, fija, className, style, ...props },
  ref,
) {
  // El umbral de 7 días sólo aplica a lo que espera respuesta: una
  // tarjeta vieja en «Aceptado» no es un problema, es un tratamiento
  // esperando turno.
  const fria = estaFrio(fila.estado, fila.dias_en_estado)

  return (
    <article
      ref={ref}
      style={style}
      className={cn(
        'group relative flex flex-col gap-2 rounded-input border bg-card p-3 shadow-rest',
        'transition-shadow duration-150',
        fria ? 'border-warm-line/25 bg-warm-faint' : 'border-hairline',
        interactiva && 'cursor-grab touch-none select-none hover:shadow-lift active:cursor-grabbing',
        fija && 'cursor-default select-none',
        atenuada && 'opacity-35',
        levantada && 'rotate-[1.5deg] cursor-grabbing shadow-lift',
        enVuelo && 'pointer-events-none opacity-60',
        className,
      )}
      aria-label={`${fila.paciente_nombre}, ${fila.numero}, ${fila.profesional_nombre}`}
      title={fija ? 'Ya iniciado: el estado se cambia desde el detalle' : undefined}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* El link no arranca un arrastre: el sensor escucha en la tarjeta. */}
          <Link
            href={`/presupuestos/${fila.id}`}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="block truncate font-sans text-[14px] font-semibold text-ink hover:text-primary-hover hover:underline"
          >
            {fila.paciente_nombre}
          </Link>
          <p className="t-helper truncate">
            {fila.prestacion_principal ?? 'Sin prestaciones cargadas'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <span className="t-label block text-[9.5px] tracking-[0.12em] text-muted">A cargo</span>
          <Monto valor={fila.total_a_cargo} jerarquia="fuerte" className="text-[14px]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <MicroBadge tono={fila.obra_social_nombre ? 'neutro' : 'primary'}>
          {fila.obra_social_nombre ?? 'Particular'}
        </MicroBadge>

        {/* Aceptado e iniciado comparten columna: sin este badge, un
            tratamiento que ya arrancó no se distingue de uno que
            todavía no. */}
        {fila.estado === 'iniciado' && <EstadoBadge estado="iniciado" size="sm" />}

        {/* Por qué esta tarjeta no se agarra. Va acá y no en una línea
            propia porque una línea que aparece al pasar por encima
            cambia el alto de la tarjeta y empuja a las de abajo. */}
        {fija && (
          <Lock
            aria-hidden
            className="size-3.5 shrink-0 text-muted"
            /* El texto completo está en el `sr-only` del pie. */
          />
        )}

        <span
          title={`En este estado desde hace ${textoDias(fila.dias_en_estado)}`}
          className={cn(
            'ml-auto inline-flex items-center gap-1 font-sans text-[11.5px] tabular-nums',
            fria ? 'font-semibold text-warm-ink' : 'text-muted',
          )}
        >
          {fria && (
            <span aria-hidden className="size-1.5 rounded-full bg-warm-line" />
          )}
          {textoDias(fila.dias_en_estado)}
        </span>
      </div>

      <span className="sr-only">
        Emitido el {fechaCorta(fila.fecha_emision)}. {fila.numero}.
        {fija && ' Ya iniciado: no se mueve arrastrando, se cambia desde el detalle.'}
      </span>
    </article>
  )
})
