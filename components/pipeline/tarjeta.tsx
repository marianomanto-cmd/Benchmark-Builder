'use client'

import { useDraggable } from '@dnd-kit/core'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { EstadoBadge, MicroBadge, Monto, TransicionPresupuesto } from '@/components/ui'
import { estaFrio } from '@/lib/estados'
import { fechaCorta } from '@/lib/formato'
import { cn } from '@/lib/utils'

import { textoDias, type ClaveColumna, type DatosTarjeta, type FilaPipeline } from './tipos'

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

/**
 * `useDraggable` y no `useSortable`: el orden dentro de la columna no se
 * elige arrastrando —lo decide la espera—, y el `SortableContext` sólo
 * estaba para darle al sensor de teclado de dnd-kit un mapa de
 * tarjetas por donde moverse. `SensorTeclado` se mueve de zona en zona.
 */
export function Tarjeta({ fila, columna, enVuelo = false }: TarjetaProps) {
  const fija = bloqueada(fila)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: fila.id,
    data: { tipo: 'tarjeta', columna } satisfies DatosTarjeta,
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
        /* El original se atenúa y el que sigue al puntero es el `DragOverlay`. */
        atenuada={isDragging}
        interactiva={!fija}
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
        /* Más aire cuando la tarjeta pasa los 160px. Consulta a su
           contenedor —el `li`, o el `DragOverlay` mientras viaja—, no
           al viewport: el fantasma tiene que verse igual que ella. */
        'group relative flex flex-col gap-1.5 rounded-input border bg-card p-2.5 shadow-rest @min-[10rem]:gap-2 @min-[10rem]:p-3',
        'transition-shadow duration-150',
        fria ? 'border-warm-line/25 bg-warm-faint' : 'border-hairline',
        /*
          `touch-manipulation` y no `touch-none`: con `none` el navegador
          no se enteraba de ningún gesto que empezara sobre una tarjeta,
          así que en una tablet no se podía scrollear el tablero
          apoyando el dedo en casi ningún lado. Ahora deslizar scrollea y
          para mover se mantiene apretado (`ESPERA_TACTIL`). Sin el
          callout, mantener apretado en iOS no abre el menú del sistema.
        */
        interactiva &&
          'cursor-grab touch-manipulation select-none [-webkit-touch-callout:none] hover:shadow-lift active:cursor-grabbing',
        fija && 'cursor-default select-none',
        /* Mientras el dedo espera (`data-apretada`, lo pone el tablero):
           el anillo aparece justo cuando la tarjeta está por levantar.
           El retardo sólo vale al entrar; al soltarse se va enseguida. */
        'data-apretada:shadow-lift data-apretada:ring-2 data-apretada:ring-primary/35 data-apretada:delay-100',
        atenuada && 'opacity-35',
        levantada && 'rotate-[1.5deg] cursor-grabbing shadow-lift',
        enVuelo && 'pointer-events-none opacity-60',
        className,
      )}
      aria-label={`${fila.paciente_nombre}, ${fila.numero}, ${fila.profesional_nombre}`}
      title={fija ? 'Ya iniciado: el estado se cambia desde el detalle' : undefined}
      {...props}
    >
      {/*
        El nombre tiene el ancho entero de la tarjeta y puede ocupar dos
        líneas.

        Con el monto al lado, en una columna de 182 al nombre le
        quedaban 60px y el tablero mostraba «Abril, Ro…», «Meghrun…»,
        «Gómez,…». En una tablet vertical la columna mide 135: aun con
        el ancho entero, cortar en una línea dejaba «Fernández, Ma…». Un
        tablero donde no se sabe de quién es la tarjeta no sirve para lo
        único que hace, que es mirar de quién hay que acordarse hoy.
      */}
      <div className="min-w-0">
        {/* El link no arranca un arrastre, ni con mouse ni con el dedo:
            los sensores escuchan en la tarjeta. El nombre abre el
            presupuesto; para moverlo, el resto de la tarjeta. */}
        <Link
          href={`/presupuestos/${fila.id}`}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="line-clamp-2 font-sans text-[14px] font-semibold leading-snug text-ink [overflow-wrap:anywhere] hover:text-primary-hover hover:underline"
        >
          {fila.paciente_nombre}
        </Link>
        <p className="t-helper truncate">
          {fila.prestacion_principal ?? 'Sin prestaciones cargadas'}
        </p>
      </div>

      {/* Cuánto y desde cuándo: siempre en el mismo lugar, que es lo
          que se barre con la vista para decidir a quién llamar. Si en
          la columna no entran juntos, los días bajan y quedan a la
          derecha. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        {/* Sin etiqueta a la vista: en el tablero todo monto es el que
            queda a cargo del paciente. Para un lector de pantalla la
            etiqueta sí está. */}
        <span className="shrink-0">
          <span className="sr-only">A cargo del paciente: </span>
          <Monto valor={fila.total_a_cargo} jerarquia="fuerte" className="text-[14px]" />
        </span>

        <span
          title={`En este estado desde hace ${textoDias(fila.dias_en_estado)}`}
          className={cn(
            'ml-auto inline-flex items-center gap-1 whitespace-nowrap font-sans text-[11.5px] tabular-nums',
            fria ? 'font-semibold text-warm-ink' : 'text-muted',
          )}
        >
          {fria && <span aria-hidden className="size-1.5 rounded-full bg-warm-line" />}
          {textoDias(fila.dias_en_estado)}
        </span>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {/* Un nombre de obra social largo se corta adentro de su
            pastilla. Antes se partía en varias líneas dentro de una
            pastilla de 24px de alto, y el texto se desbordaba por
            arriba, encima del nombre del paciente. */}
        <MicroBadge
          tono={fila.obra_social_nombre ? 'neutro' : 'primary'}
          className="min-w-0 max-w-full"
        >
          <span className="truncate">{fila.obra_social_nombre ?? 'Particular'}</span>
        </MicroBadge>

        {/* Aceptado e iniciado comparten columna: sin este badge, un
            tratamiento que ya arrancó no se distingue de uno que
            todavía no. El candado dice por qué esta tarjeta no se
            agarra, y va pegado al badge: si la fila no alcanza, bajan
            juntos en vez de dejar el candado solo en una línea. */}
        {(fila.estado === 'iniciado' || fija) && (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            {fila.estado === 'iniciado' && <EstadoBadge estado="iniciado" size="sm" />}
            {fija && (
              <Lock
                aria-hidden
                className="size-3.5 shrink-0 text-muted"
                /* El texto completo está en el `sr-only` del pie. */
              />
            )}
          </span>
        )}
      </div>

      <span className="sr-only">
        Emitido el {fechaCorta(fila.fecha_emision)}. {fila.numero}.
        {fija && ' Ya iniciado: no se mueve arrastrando, se cambia desde el detalle.'}
      </span>
    </article>
  )
})
