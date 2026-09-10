'use client'

import * as React from 'react'

import { money, numero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { techoEje } from '@/lib/estadisticas'

/**
 * Serie temporal de dos líneas.
 *
 * **Por qué el SVG sólo dibuja las líneas.** Todo lo que es texto
 * —ejes, valores, tooltip— vive en HTML posicionado por porcentaje, y
 * el SVG se estira con `preserveAspectRatio="none"`. Así el gráfico es
 * responsive sin medir el contenedor con JavaScript, y la tipografía
 * mide lo que tiene que medir en vez de escalarse con el viewBox: con
 * un viewBox fijo, un texto de 11px terminaba dibujado a 6px en un
 * teléfono. El truco para que la línea no se deforme al estirarse es
 * `vector-effect="non-scaling-stroke"`.
 *
 * **Un solo eje.** Las dos series se cuentan en la misma unidad
 * (presupuestos). El monto va en su propio gráfico: dos escalas en el
 * mismo dibujo dejan que cualquiera «demuestre» la correlación que
 * quiera moviendo una de las dos.
 *
 * **La identidad nunca es sólo el color.** Hay leyenda con su marca, y
 * el tooltip nombra cada serie con todas las letras.
 */

export interface SerieLinea {
  clave: string
  etiqueta: string
  color: 'serie' | 'perdido'
  valores: number[]
}

const TRAZO = {
  serie: 'var(--color-serie)',
  perdido: 'var(--color-serie-perdido)',
} as const

const PUNTO = {
  serie: 'bg-serie',
  perdido: 'bg-serie-perdido',
} as const

/**
 * El formato viaja como nombre y no como función: este componente es de
 * cliente y una función no cruza la frontera de un Server Component
 * —React tira «Functions cannot be passed directly to Client
 * Components»—. La página dice QUÉ es el número; cómo se escribe lo
 * decide acá, con las mismas funciones de `lib/formato` que usa el
 * resto de la app.
 */
export type FormatoSerie = 'cantidad' | 'dinero'

const FORMATO: Record<FormatoSerie, (v: number) => string> = {
  cantidad: (v) => numero(v),
  dinero: (v) => money(v),
}

export function Lineas({
  etiquetas,
  series,
  formato: claveFormato = 'cantidad',
  titulos,
}: {
  /** Una por punto del eje x. */
  etiquetas: string[]
  series: SerieLinea[]
  formato?: FormatoSerie
  /** Texto largo del eje x para el tooltip («sep 2026»). */
  titulos?: string[]
}) {
  const formato = FORMATO[claveFormato]
  const [activo, setActivo] = React.useState<number | null>(null)

  const n = etiquetas.length
  const techo = techoEje(Math.max(0, ...series.flatMap((s) => s.valores)))

  /** x en porcentaje. Con un solo punto va al medio, no al borde. */
  const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100)
  const y = (v: number) => 100 - (techo === 0 ? 0 : (v / techo) * 100)

  const linea = (valores: number[]) =>
    valores.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ')

  return (
    <figure className="m-0">
      {/* Leyenda desde dos series. Con una sola sobra: el título del
          bloque ya dice qué se está mirando, y una leyenda de un ítem
          es una etiqueta puesta dos veces. */}
      {series.length > 1 && (
        <figcaption className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map((s) => (
            <span key={s.clave} className="flex items-center gap-1.5 t-helper">
              <span className={cn('size-2.5 shrink-0 rounded-pill', PUNTO[s.color])} aria-hidden />
              {s.etiqueta}
            </span>
          ))}
        </figcaption>
      )}

      <div className="relative">
        {/* Grilla y eje: recesivos, detrás de todo. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="border-t border-hairline" />
          ))}
        </div>

        <div className="relative h-[168px] md:h-[208px]">
          <svg
            className="absolute inset-0 size-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {series.map((s) => (
              <path
                key={s.clave}
                d={linea(s.valores)}
                fill="none"
                stroke={TRAZO[s.color]}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Los puntos, en HTML: miden lo mismo en cualquier ancho. */}
          {series.map((s) =>
            s.valores.map((v, i) => (
              <span
                key={`${s.clave}-${i}`}
                aria-hidden
                className={cn(
                  'absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-pill ring-2 ring-card transition-transform',
                  PUNTO[s.color],
                  activo === i && 'scale-150',
                )}
                style={{ left: `${x(i)}%`, top: `${y(v)}%` }}
              />
            )),
          )}

          {/* Cruz del punto mirado. */}
          {activo !== null && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-px bg-primary/30"
              style={{ left: `${x(activo)}%` }}
            />
          )}

          {/* Zona sensible: una columna por mes, mucho más ancha que el
              punto. Apuntarle a un círculo de 8px con el dedo no es
              una interacción, es una prueba de puntería. */}
          <div className="absolute inset-0 flex" onMouseLeave={() => setActivo(null)}>
            {etiquetas.map((e, i) => (
              <button
                key={e}
                type="button"
                className="min-w-0 flex-1 cursor-default focus:outline-none focus-visible:bg-tint/60"
                onMouseEnter={() => setActivo(i)}
                onFocus={() => setActivo(i)}
                onBlur={() => setActivo(null)}
                aria-label={`${titulos?.[i] ?? e}: ${series
                  .map((s) => `${s.etiqueta} ${formato(s.valores[i] ?? 0)}`)
                  .join(', ')}`}
              />
            ))}
          </div>

          {activo !== null && (
            <div
              className={cn(
                'pointer-events-none absolute top-1 z-10 min-w-[132px] rounded-input border border-hairline bg-card p-2.5 shadow-lift',
                // Cerca del borde derecho el globo se ancla del otro
                // lado, si no se sale de la tarjeta.
                activo > n / 2 ? '-translate-x-full' : '',
              )}
              style={{ left: `${x(activo)}%`, marginLeft: activo > n / 2 ? -8 : 8 }}
            >
              <p className="t-label mb-1">{titulos?.[activo] ?? etiquetas[activo]}</p>
              {series.map((s) => (
                <p key={s.clave} className="flex items-center gap-1.5 text-[13px] text-body">
                  <span className={cn('size-2 shrink-0 rounded-pill', PUNTO[s.color])} aria-hidden />
                  <span className="min-w-0 flex-1">{s.etiqueta}</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formato(s.valores[activo] ?? 0)}
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Eje x. En pantallas chicas se saltean etiquetas en vez de
            encimarlas. */}
        <div className="mt-2 flex">
          {etiquetas.map((e, i) => (
            <span
              key={e}
              className={cn(
                'min-w-0 flex-1 text-center text-[10.5px] text-faint tabular-nums',
                n > 6 && i % 2 === 1 && 'hidden md:block',
              )}
            >
              {e}
            </span>
          ))}
        </div>
      </div>

      {/* El techo del eje, escrito: sin esto una barra al 60 % no dice
          60 % de cuánto. */}
      <p className="mt-1 t-helper">Máximo del eje: {formato(techo)}</p>
    </figure>
  )
}
