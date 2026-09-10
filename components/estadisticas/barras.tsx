import { cn } from '@/lib/utils'
import { techoEje } from '@/lib/estadisticas'

/**
 * Barras horizontales con la etiqueta y el valor SIEMPRE escritos.
 *
 * Horizontales y no verticales porque las etiquetas son texto en
 * castellano —«Más de 30 días», «El paciente eligió otro lugar»— y en
 * vertical hay que inclinarlas o cortarlas.
 *
 * Sin tooltip a propósito: el número ya está impreso al lado de cada
 * barra. Un tooltip que repite lo que se ve esconde el dato detrás de
 * un gesto que en una tablet ni existe.
 *
 * El color: la longitud ya codifica la magnitud, así que el tono no
 * agrega información y va uno solo. La excepción es `rampa`, para
 * series que son una escala propia —las etapas del circuito—, donde el
 * tono acompaña la profundidad y no el ranking. Pintar por ranking
 * estaría mal: al reordenarse los datos se repintarían las barras y el
 * color dejaría de significar nada.
 */

export interface Barra {
  clave: string
  etiqueta: React.ReactNode
  valor: number
  /** Lo que se escribe al final de la barra. Por defecto, el valor. */
  texto?: string
  /** Segunda línea, para el contexto (monto, porcentaje, casos). */
  detalle?: React.ReactNode
}

const RAMPA = [
  'bg-rampa-1',
  'bg-rampa-2',
  'bg-rampa-3',
  'bg-rampa-4',
  'bg-rampa-5',
  'bg-rampa-6',
] as const

export function Barras({
  datos,
  tono = 'serie',
  maximo,
  anchoEtiqueta = 'sm:w-[124px] md:w-[150px]',
}: {
  datos: Barra[]
  tono?: 'serie' | 'perdido' | 'rampa'
  /** Techo del eje. Por defecto, el mayor de los datos redondeado. */
  maximo?: number
  anchoEtiqueta?: string
}) {
  const techo = maximo ?? techoEje(Math.max(0, ...datos.map((d) => d.valor)))

  return (
    <ul className="flex flex-col gap-2.5">
      {datos.map((d, i) => {
        const pct = techo === 0 ? 0 : Math.min(100, (d.valor / techo) * 100)

        return (
          // En mobile la fila se apila: etiqueta y valor arriba, barra
          // abajo a lo ancho. En una sola línea la barra se quedaba con
          // 100px de los 342 disponibles —el resto se lo comían la
          // etiqueta y el monto— y dejaba de poder compararse, que es
          // lo único que una barra tiene que dejar hacer.
          <li key={d.clave} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span
              className={cn(
                'flex shrink-0 items-baseline justify-between gap-3 text-[13px] leading-tight text-body sm:block',
                anchoEtiqueta,
              )}
            >
              <span>{d.etiqueta}</span>
              {/* El valor viaja con la etiqueta en mobile y a la
                  derecha de la barra en escritorio. */}
              <span className="font-sans text-[13.5px] font-semibold text-ink tabular-nums sm:hidden">
                {d.texto ?? d.valor}
              </span>
            </span>

            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              {/* El riel dice cuánto es el total: sin él una barra al
                  60 % y otra al 60 % de otro techo se ven iguales. */}
              <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-tint">
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-pill transition-[width] duration-500 ease-out-soft',
                    tono === 'rampa'
                      ? RAMPA[Math.min(i, RAMPA.length - 1)]
                      : tono === 'perdido'
                        ? 'bg-serie-perdido'
                        : 'bg-serie',
                  )}
                  // El ancho es dato, no diseño: va inline porque es un
                  // valor calculado y no una clase de utilidad.
                  style={{ width: `${pct}%` }}
                />
              </span>

              {/* Ancho FIJO, no `shrink-0` con ancho automático.
                  Como el detalle de cada fila mide distinto, el riel
                  —que es el que queda con el resto del espacio— salía
                  con un ancho distinto por fila: dos barras del mismo
                  largo representaban valores distintos y la comparación,
                  que es lo único que una barra sirve para hacer, dejaba
                  de ser válida. */}
              <span className="w-[128px] shrink-0 text-right md:w-[150px]">
                <span className="hidden font-sans text-[13.5px] font-semibold text-ink tabular-nums sm:block">
                  {d.texto ?? d.valor}
                </span>
                {d.detalle && <span className="block t-helper leading-tight">{d.detalle}</span>}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
