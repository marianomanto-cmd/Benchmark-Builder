'use client'

import { useDroppable } from '@dnd-kit/core'
import * as React from 'react'

import { ALTO_TOPBAR } from '@/components/shell/topbar'
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
import { ATRIBUTO_CABECERA, ATRIBUTO_ZONA } from './zonas'

/**
 * Fondo de la columna. Va inline y no en `globals.css` porque es propio
 * de esta pantalla. Lo usa también el encabezado pegado, que tiene que
 * ser opaco: las tarjetas pasan por debajo.
 */
const FONDO_COLUMNA = '#F8FBFC'

/**
 * El tinte de «va a caer acá», como capa sobre el fondo y no en lugar de
 * él: el encabezado pegado tiene que seguir siendo opaco. Un poco más
 * fuerte en el encabezado, que es lo que se ve cuando la columna sigue
 * de largo por arriba o por abajo de la pantalla.
 */
function tinte(opacidad: number): string {
  const color = `rgba(47, 166, 180, ${opacidad})`
  return `linear-gradient(${color}, ${color})`
}

export function Columna({
  clave,
  filas,
  enVuelo,
  activa,
  altoActiva,
}: {
  clave: ClaveColumna
  filas: FilaPipeline[]
  /** ids con una acción en vuelo contra el servidor. */
  enVuelo: Record<string, boolean>
  /** Tarjeta que se está arrastrando ahora mismo, o `null`. */
  activa: FilaPipeline | null
  /** Alto de esa tarjeta, para que el hueco ocupe lo mismo que ella. */
  altoActiva: number | null
}) {
  const id = idColumna(clave)
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { tipo: 'columna', columna: clave },
  })

  const { cantidad, monto } = resumir(filas)
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

  // El alto de la tarjeta que viaja, para que la columna no pegue un
  // salto cuando la de verdad ocupe el lugar.
  const hueco = (
    <li
      aria-hidden
      style={{ height: altoActiva ?? 96 }}
      className="flex shrink-0 items-center justify-center rounded-input border-2 border-dashed border-primary/45 bg-primary/8 px-2"
    >
      <span className="truncate font-sans text-[12px] font-semibold text-primary-hover">
        {activa?.paciente_nombre ?? 'Acá'}
      </span>
    </li>
  )

  return (
    <section
      ref={setNodeRef}
      {...{ [ATRIBUTO_ZONA]: id }}
      aria-label={`${etiqueta}: ${cantidad} ${plural(cantidad, 'presupuesto', 'presupuestos')}`}
      className={cn(
        /*
          `@container`: la columna mide de 135 a 215px según el ancho de
          la pantalla, y lo que se acomoda —el encabezado, la tarjeta—
          se acomoda a la columna y no al viewport.

          `overflow-clip` y no `overflow-hidden`: las dos redondean el
          contenido contra el borde, pero `hidden` convierte a la
          columna en un contenedor de scroll y el encabezado dejaría de
          pegarse debajo de la topbar.
        */
        '@container flex min-w-0 flex-col overflow-clip rounded-card border transition-colors duration-150',
        destino !== null ? 'border-primary/45 ring-2 ring-primary/25' : 'border-hairline',
      )}
      style={{
        backgroundColor: FONDO_COLUMNA,
        backgroundImage: destino !== null ? tinte(0.06) : undefined,
      }}
    >
      {/*
        Pegado debajo de la topbar mientras la columna esté a la vista:
        es lo que dice qué etapa es, cuántos hay y cuánto suman cuando
        se scrollea por la mitad del tablero. Opaco, porque las tarjetas
        pasan por debajo, y con un desvanecido al pie —el mismo fondo,
        tinte incluido, que se apaga— para que no se corten de golpe.
      */}
      <header
        {...{ [ATRIBUTO_CABECERA]: '' }}
        className="sticky z-10 shrink-0 px-2.5 pb-2 pt-2.5 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-2 after:[background:inherit] after:[mask-image:linear-gradient(black,transparent)] @min-[11rem]:px-3 @min-[11rem]:pt-3"
        style={{
          top: ALTO_TOPBAR,
          backgroundColor: FONDO_COLUMNA,
          backgroundImage: destino !== null ? tinte(0.08) : undefined,
        }}
      >
        {/*
          La etiqueta puede partirse en dos líneas: «Aceptado / Iniciado»
          no entra en una columna de tablet, y cortarla en «Aceptado /
          Ini…» escondía justo la mitad que explica por qué hay
          tratamientos iniciados ahí. Para que las cinco columnas
          empiecen a la misma altura, cuando la columna es angosta TODAS
          reservan las dos líneas.

          El conteo va al lado de la etiqueta en una columna angosta y al
          lado del monto en una ancha: así el monto siempre tiene la fila
          entera cuando la necesita. Al lado del conteo, un total de
          nueve cifras («$ 135.802.458») no entra en 120px, bajaba de
          línea y ese encabezado quedaba más alto que los otros cuatro.
        */}
        <div className="flex items-start justify-between gap-1.5">
          <h2 className="min-w-0 font-display text-[14px] font-semibold leading-tight text-ink [overflow-wrap:anywhere] @max-[11rem]:min-h-[2lh]">
            {etiqueta}
          </h2>
          <Conteo cantidad={cantidad} className="@min-[11rem]:hidden" />
        </div>
        <div className="mt-1 flex items-center justify-between gap-1.5">
          <Monto valor={monto} jerarquia="normal" className="text-[12.5px]" />
          <Conteo cantidad={cantidad} className="hidden @min-[11rem]:inline-block" />
        </div>
      </header>

      <ul className="flex flex-1 list-none flex-col gap-2 px-1.5 pb-2 pt-1 @min-[11rem]:px-2 @min-[11rem]:pb-2.5">
        {filas.map((fila, i) => (
          <React.Fragment key={fila.id}>
            {destino === i && hueco}
            <li className="@container shrink-0">
              <Tarjeta
                fila={fila}
                columna={clave}
                enVuelo={Boolean(enVuelo[fila.id])}
              />
            </li>
          </React.Fragment>
        ))}

        {destino !== null && destino >= filas.length && hueco}

        {filas.length === 0 && destino === null && (
          <li className="flex items-center justify-center rounded-input border border-dashed border-hairline px-2 py-6 text-center font-sans text-[12px] text-faint">
            {activa ? 'Soltá acá' : 'Nada en esta etapa'}
          </li>
        )}
      </ul>
    </section>
  )
}

/** El conteo de la columna, en su pastilla. */
function Conteo({ cantidad, className }: { cantidad: number; className?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-pill bg-card px-2 py-0.5 font-sans text-[11.5px] font-semibold leading-none tabular-nums text-muted ring-1 ring-hairline',
        className,
      )}
    >
      {cantidad}
    </span>
  )
}
