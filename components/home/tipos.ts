/**
 * Tipos compartidos entre la página de home (Server Component) y sus
 * piezas de cliente. Viven acá para que el servidor pueda armar los
 * datos una sola vez y pasarlos ya masticados.
 */

import type { EstadoPresupuesto } from '@/lib/types'

/** Estado de los filtros, tal como se leen y se escriben en la URL. */
export interface FiltrosHome {
  /** Texto libre: paciente, prestación o DNI. */
  q: string
  /** Vacío = todos los estados. */
  estados: EstadoPresupuesto[]
  /** id del profesional; vacío = todos. */
  profesional: string
  /** id de la obra social, o `particular`; vacío = todas. */
  obraSocial: string
  /** `YYYY-MM-DD`; vacío = sin límite. */
  desde: string
  hasta: string
}

/** Valor sentinela de obra social para "sin obra social". */
export const OBRA_SOCIAL_PARTICULAR = 'particular'

/** Opción de un desplegable de filtro. */
export interface OpcionFiltro {
  value: string
  label: string
}

/**
 * Fila del listado. Es un subconjunto de la vista `presupuestos_listado`:
 * sólo las columnas que la tabla y las cards muestran.
 */
export interface FilaPresupuesto {
  id: string
  numero: string
  paciente_nombre: string
  paciente_dni: string | null
  paciente_telefono: string | null
  prestacion_principal: string | null
  items_count: number
  obra_social_nombre: string | null
  profesional_nombre: string
  fecha_emision: string
  subtotal: number
  total_a_cargo: number
  estado: EstadoPresupuesto
  dias_en_estado: number
}

/**
 * Columnas que se le piden a `presupuestos_listado`. Se traen sólo las
 * que la tabla y las cards muestran: el listado puede tener cientos de
 * filas y el resto del documento no se usa hasta el detalle.
 */
export const COLUMNAS_LISTADO =
  'id, numero, paciente_nombre, paciente_dni, paciente_telefono, ' +
  'prestacion_principal, items_count, obra_social_nombre, profesional_nombre, ' +
  'fecha_emision, subtotal, total_a_cargo, estado, dias_en_estado'

/**
 * Los cuatro KPIs de la home. `null` en un porcentaje significa "todavía
 * no hay base para calcularlo" y se dibuja como raya, no como 0 %.
 */
export interface KpisHome {
  emitidosMes: { cantidad: number; aCargo: number }
  pendientes: { cantidad: number; frios: number }
  aceptacion: {
    pct30: number | null
    base30: number
    pct90: number | null
    base90: number
  }
  pipeline: { monto: number; cantidad: number }
}

export const KPIS_VACIOS: KpisHome = {
  emitidosMes: { cantidad: 0, aCargo: 0 },
  pendientes: { cantidad: 0, frios: 0 },
  aceptacion: { pct30: null, base30: 0, pct90: null, base90: 0 },
  pipeline: { monto: 0, cantidad: 0 },
}
