/**
 * Las cuentas de la pantalla de estadísticas que NO son agregación.
 *
 * La agregación vive en SQL (`stats_*`): sumar en el cliente empieza a
 * mentir en cuanto PostgREST corta la lectura. Lo que queda acá es lo
 * que se deriva de esos totales ya calculados —caída del embudo, la
 * ventana de fechas, la escala de un eje— y es todo función pura, para
 * poder probarlo sin base ni navegador.
 */

// La extensión `.ts` es explícita: el runner nativo de Node no resuelve
// relativos sin extensión, y esto tiene que poder probarse sin bundler.
import { isoDate } from './formato.ts'

/** Las ventanas que ofrece la pantalla. `todo` no filtra por fecha. */
export type ClaveRango = '3m' | '6m' | '12m' | 'todo'

export interface OpcionRango {
  clave: ClaveRango
  etiqueta: string
  /** Meses hacia atrás, o `null` para toda la historia. */
  meses: number | null
}

export const RANGOS: OpcionRango[] = [
  { clave: '3m', etiqueta: '3 meses', meses: 3 },
  { clave: '6m', etiqueta: '6 meses', meses: 6 },
  { clave: '12m', etiqueta: '12 meses', meses: 12 },
  { clave: 'todo', etiqueta: 'Todo', meses: null },
]

export const RANGO_POR_DEFECTO: ClaveRango = '12m'

export function esRango(v: unknown): v is ClaveRango {
  return typeof v === 'string' && RANGOS.some((r) => r.clave === v)
}

/** Lo mínimo del embudo que necesita `caidaEmbudo`. */
export interface EtapaContada {
  alcanzaron: number
}

/**
 * La ventana que mira la pantalla.
 *
 * `hasta` es hoy y `desde` es el primer día del mes que arranca la
 * ventana: si fuera «hoy menos 12 meses» a secas, el primer mes del
 * gráfico saldría cortado a la mitad y se leería como una caída.
 *
 * `todo` arranca en 2000: más viejo que cualquier consultorio, y
 * evita tener que preguntarle a la base cuál es el primer presupuesto
 * sólo para armar el rango.
 */
export function ventanaRango(clave: ClaveRango, hoyIso: string = isoDate()): {
  desde: string
  hasta: string
} {
  const meses = RANGOS.find((r) => r.clave === clave)?.meses ?? null
  if (meses === null) return { desde: '2000-01-01', hasta: hoyIso }

  // Se trabaja sobre el `YYYY-MM-DD` y no sobre un `Date`: el día del
  // consultorio ya viene resuelto en horario argentino, y meterlo en un
  // `Date` para leerle el mes lo devuelve a la zona del servidor —que
  // en Vercel es UTC—. Entre las 21:00 y la medianoche eso corría la
  // ventana un mes entero.
  const [anio, mes] = hoyIso.split('-').map(Number)
  const total = (anio ?? 1970) * 12 + ((mes ?? 1) - 1) - (meses - 1)
  const anioDesde = Math.floor(total / 12)
  const mesDesde = (total % 12) + 1

  return {
    desde: `${String(anioDesde).padStart(4, '0')}-${String(mesDesde).padStart(2, '0')}-01`,
    hasta: hoyIso,
  }
}

/**
 * Qué porcentaje sobrevivió de una etapa a la siguiente.
 *
 * Se mide contra la etapa anterior QUE TUVO GENTE, no contra la
 * inmediata. En el circuito real hay saltos —«pendiente» es automático
 * y se puede pasar de «enviado» derecho a «aceptado»—, así que una
 * etapa vacía en el medio hacía aparecer una caída del 100 % seguida de
 * un crecimiento imposible.
 */
export function caidaEmbudo<T extends EtapaContada>(etapas: T[]): {
  etapa: T
  /** Porcentaje sobre el arranque del embudo. */
  pctDelTotal: number
  /** Porcentaje sobre la etapa poblada anterior, o `null` en la primera. */
  pctDeLaAnterior: number | null
}[] {
  const arranque = etapas[0]?.alcanzaron ?? 0
  let anterior: number | null = null

  return etapas.map((etapa) => {
    const pctDelTotal = arranque === 0 ? 0 : Math.round((etapa.alcanzaron / arranque) * 100)
    const pctDeLaAnterior =
      anterior === null || anterior === 0 ? null : Math.round((etapa.alcanzaron / anterior) * 100)

    if (etapa.alcanzaron > 0) anterior = etapa.alcanzaron
    return { etapa, pctDelTotal, pctDeLaAnterior }
  })
}

/**
 * El techo del eje, redondeado a un número que se pueda leer.
 *
 * Un eje que termina en 37 obliga a hacer la cuenta para saber cuánto
 * mide una barra. Se sube al 1, 2, 2,5 o 5 × 10ⁿ más cercano por
 * arriba, que es la escala que usa cualquier papel milimetrado.
 */
export function techoEje(maximo: number): number {
  if (!Number.isFinite(maximo) || maximo <= 0) return 1

  const magnitud = 10 ** Math.floor(Math.log10(maximo))
  const normalizado = maximo / magnitud

  const paso = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 2.5 ? 2.5 : normalizado <= 5 ? 5 : 10
  return paso * magnitud
}

/**
 * Variación entre dos períodos, en porcentaje.
 *
 * `null` cuando no hay base: pasar de 0 a 5 no es «+500 %», es «antes
 * no había nada», y dibujar una flecha verde gigante ahí miente.
 */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return Math.round(((actual - anterior) / anterior) * 100)
}

/** El nombre del mes como se lee en un eje: «sep», «oct». */
export function mesCorto(iso: string): string {
  const [anio, mes] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, (mes ?? 1) - 1, 1))
  return new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' })
    .format(fecha)
    .replace('.', '')
}

/** «sep 2026», para el tooltip, donde sí hace falta el año. */
export function mesLargo(iso: string): string {
  const [anio, mes] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, (mes ?? 1) - 1, 1))
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(fecha)
    .replace('.', '')
}

/**
 * Días en un texto que se lee de un vistazo: «5 días», «1,5 días».
 * Sin decimales cuando no hacen falta.
 */
export function dias(valor: number | null): string {
  if (valor === null) return '—'
  const redondo = Math.round(valor * 10) / 10
  const texto = Number.isInteger(redondo)
    ? String(redondo)
    : redondo.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${texto} ${redondo === 1 ? 'día' : 'días'}`
}
