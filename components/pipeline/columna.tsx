'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, type SortingStrategy } from '@dnd-kit/sortable'
import * as React from 'react'

import { Monto } from '@/components/ui'
import { ETIQUETA_COLUMNA } from '@/lib/estados'
import { cn } from '@/lib/utils'

import { Tarjeta } from './tarjeta'
import {
  diasTrasMover,
  estadoDeColumna,
  idColumna,
  indiceDeInsercion,
  plural,
  resumir,
  type ClaveColumna,
  type FilaPipeline,
} from './tipos'

/**
 * El orden dentro de la columna es por días en el estado y no se
 * persiste a mano: la estrategia devuelve `null` para que las tarjetas
 * no se corran mientras se arrastra. Igual usamos `SortableContext`
 * porque es lo que le da al `KeyboardSensor` un mapa de destinos para
 * moverse con las flechas.
 */
const SIN_REORDEN: SortingStrategy = () => null

/**
 * Sombras de scroll vertical, sin JavaScript: los dos degradados van
 * `local` —viajan con el contenido y tapan la sombra cuando se llegó al
 * extremo— y los dos radiales van `scroll`, clavados al borde de la
 * caja. Resultado: la sombra aparece sólo del lado donde todavía hay
 * tarjetas.
 *
 * (La hoja global tenía la versión horizontal de este mismo truco para
 * las tablas que scrolleaban de costado. Ya no hay ninguna.)
 *
 * Va inline y no en `globals.css` porque el color tiene que ser el del
 * fondo de la columna, que es propio de esta pantalla.
 */
const FONDO = '#F8FBFC'
const SOMBRAS_VERTICALES: React.CSSProperties = {
  backgroundImage: [
    `linear-gradient(to bottom, ${FONDO} 30%, rgba(248, 251, 252, 0))`,
    `linear-gradient(to top, ${FONDO} 30%, rgba(248, 251, 252, 0))`,
    'radial-gradient(farthest-side at 50% 0, rgba(21, 58, 68, 0.13), rgba(21, 58, 68, 0))',
    'radial-gradient(farthest-side at 50% 100%, rgba(21, 58, 68, 0.13), rgba(21, 58, 68, 0))',
  ].join(', '),
  backgroundPosition: 'top center, bottom center, top center, bottom center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '100% 28px, 100% 28px, 100% 11px, 100% 11px',
  backgroundAttachment: 'local, local, scroll, scroll',
}

export function Columna({
  clave,
  filas,
  enVuelo,
  activa,
}: {
  clave: ClaveColumna
  filas: FilaPipeline[]
  /** ids con una acción en vuelo contra el servidor. */
  enVuelo: Record<string, boolean>
  /** Tarjeta que se está arrastrando ahora mismo, o `null`. */
  activa: FilaPipeline | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: idColumna(clave),
    data: { tipo: 'columna', columna: clave },
  })

  const { cantidad, monto } = resumir(filas)
  const ids = React.useMemo(() => filas.map((f) => f.id), [filas])
  const etiqueta = ETIQUETA_COLUMNA[clave]

  /**
   * Dónde va a caer la tarjeta. No alcanza con prender la columna: el
   * orden es por días de espera, así que una tarjeta recién movida cae
   * casi siempre al pie de la columna y no donde está el puntero. El
   * hueco punteado se dibuja en el índice exacto que va a ocupar, con
   * la misma cuenta que hace el servidor.
   */
  const destino = React.useMemo(() => {
    if (!isOver || !activa) return null
    // Soltar en la columna de la que salió no cambia nada.
    if (filas.some((f) => f.id === activa.id)) return null

    const estado = estadoDeColumna(clave)
    return indiceDeInsercion(filas, {
      ...activa,
      estado,
      dias_en_estado: diasTrasMover(activa.estado, estado, activa.dias_en_estado),
    })
  }, [isOver, activa, filas, clave])

  // Alto parecido al de una tarjeta, para que la columna no pegue un
  // salto cuando la de verdad ocupe el lugar.
  const hueco = (
    <li
      aria-hidden
      className="flex h-[84px] shrink-0 items-center justify-center rounded-input border-2 border-dashed border-primary/45 bg-primary/8 px-3"
    >
      <span className="truncate font-sans text-[12px] font-semibold text-primary-hover">
        {activa?.paciente_nombre ?? 'Acá'}
      </span>
    </li>
  )

  return (
    <section
      ref={setNodeRef}
      aria-label={`${etiqueta}: ${cantidad} ${plural(cantidad, 'presupuesto', 'presupuestos')}`}
      className={cn(
        'relative flex h-full min-w-0 flex-col rounded-card border transition-colors duration-150',
        destino !== null
          ? 'border-primary/45 ring-2 ring-primary/25'
          : 'border-hairline',
      )}
      style={{ backgroundColor: FONDO }}
    >
      {/* El tinte va en una capa aparte y no en el fondo de la columna:
          las sombras de scroll se dibujan con el color de abajo y con la
          columna teñida quedarían de otro color que el contenido. */}
      {destino !== null && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-card bg-primary/6"
        />
      )}

      <header
        className={cn(
          'relative shrink-0 rounded-t-card px-3 pb-2 pt-3 transition-colors duration-150',
          destino !== null && 'bg-primary/8',
        )}
      >
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

      <ul
        style={SOMBRAS_VERTICALES}
        className="relative flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto rounded-b-card px-2 pb-2.5 pt-0.5"
      >
        <SortableContext items={ids} strategy={SIN_REORDEN}>
          {filas.map((fila, i) => (
            <React.Fragment key={fila.id}>
              {destino === i && hueco}
              <li className="shrink-0">
                <Tarjeta
                  fila={fila}
                  columna={clave}
                  enVuelo={Boolean(enVuelo[fila.id])}
                />
              </li>
            </React.Fragment>
          ))}
        </SortableContext>

        {destino !== null && destino >= filas.length && hueco}

        {filas.length === 0 && destino === null && (
          <li className="flex flex-1 items-center justify-center rounded-input border border-dashed border-hairline px-2 py-6 text-center font-sans text-[12px] text-faint">
            {activa ? 'Soltá acá' : 'Nada en esta etapa'}
          </li>
        )}
      </ul>
    </section>
  )
}
