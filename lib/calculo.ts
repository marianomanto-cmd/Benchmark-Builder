/**
 * Única fuente de verdad del cálculo de un ítem de presupuesto.
 *
 * El espejo en SQL es `calcular_cobertura()` (migración 03). Si cambia
 * una, tiene que cambiar la otra: el servidor recalcula al guardar y
 * los dos números tienen que coincidir, o el preview del wizard miente.
 *
 * Redondeo al peso, sin decimales.
 */

export type CoberturaTipo = 'porcentaje' | 'monto' | 'ninguna'

export interface ItemCalculado {
  /** Lo que cubre la obra social, resuelto en pesos. */
  cobertura: number
  /** Lo que queda a cargo del paciente. Es el número que se conversa. */
  aCargo: number
}

export function calcularItem(
  monto: number,
  tipo: CoberturaTipo,
  valor: number,
): ItemCalculado {
  const bruta =
    tipo === 'porcentaje'
      ? Math.round(monto * (valor / 100))
      : tipo === 'monto'
        ? valor
        : 0

  // La cobertura se acota a [0, monto]. Un override a mano puede tipear
  // 150 % o un monto fijo mayor al arancel; sin este tope el a-cargo
  // saldría negativo y el paciente vería que el consultorio le debe plata.
  const cobertura = Math.min(Math.max(bruta, 0), monto)

  return { cobertura, aCargo: monto - cobertura }
}

export interface TotalesLinea {
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
}

export interface Totales {
  subtotal: number
  cobertura: number
  aCargo: number
}

export function calcularTotales(items: TotalesLinea[]): Totales {
  return items.reduce<Totales>(
    (acc, item) => {
      const { cobertura, aCargo } = calcularItem(
        item.monto,
        item.cobertura_tipo,
        item.cobertura_valor,
      )
      return {
        subtotal: acc.subtotal + item.monto,
        cobertura: acc.cobertura + cobertura,
        aCargo: acc.aCargo + aCargo,
      }
    },
    { subtotal: 0, cobertura: 0, aCargo: 0 },
  )
}

/**
 * Reparte un total entre cuotas por porcentaje. La última absorbe el
 * resto para que la suma cierre exacta contra el total a cargo — igual
 * que `crear_presupuesto()` en la base.
 */
export function repartirCuotas(
  total: number,
  porcentajes: number[],
): number[] {
  if (porcentajes.length === 0) return []
  let acumulado = 0
  return porcentajes.map((pct, i) => {
    if (i === porcentajes.length - 1) return total - acumulado
    const monto = Math.round(total * (pct / 100))
    acumulado += monto
    return monto
  })
}

/** Las condiciones de pago tienen que sumar 100 %. */
export function cuotasSuman100(porcentajes: number[]): boolean {
  if (porcentajes.length === 0) return true
  const suma = porcentajes.reduce((a, b) => a + b, 0)
  return Math.abs(suma - 100) < 0.01
}

/**
 * Compara el snapshot de un ítem contra el arancel vigente hoy.
 * Alimenta el banner de precio desactualizado del detalle (pantalla 11).
 */
export interface ComparacionPrecio {
  desactualizado: boolean
  aCargoHoy: number
  aCargoSnapshot: number
  diferencia: number
}

export function compararConHoy(
  snapshot: TotalesLinea[],
  hoy: TotalesLinea[],
): ComparacionPrecio {
  const s = calcularTotales(snapshot)
  const h = calcularTotales(hoy)
  return {
    desactualizado: h.aCargo !== s.aCargo,
    aCargoHoy: h.aCargo,
    aCargoSnapshot: s.aCargo,
    diferencia: h.aCargo - s.aCargo,
  }
}
