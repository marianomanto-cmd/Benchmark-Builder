/**
 * Tipos y reglas del tablero (pantalla 12).
 *
 * Vive fuera de los componentes porque lo comparten el Server Component
 * que consulta la vista y las piezas de cliente que dibujan y arrastran.
 *
 * Los filtros son **los mismos de la home**: se leen y se escriben con
 * `parseFiltros`/`construirUrl` de `components/home/filtros-url`, así el
 * toggle Lista ⇄ Kanban conserva el contexto sin traducir nada.
 */

import { construirUrl } from '@/components/home/filtros-url'
import type { FiltrosHome, OpcionFiltro } from '@/components/home/tipos'
import { ESTADOS_COLUMNA } from '@/lib/estados'
import type { EstadoPresupuesto, MotivoPerdida } from '@/lib/types'

export type { OpcionFiltro }

/* ═══════════════════════════════════════════════════════════
   Columnas
   ═══════════════════════════════════════════════════════════ */

export type ClaveColumna = 'realizado' | 'enviado' | 'pendiente' | 'interesado' | 'aceptado'

/** Orden de izquierda a derecha: es el avance de la máquina de estados. */
export const CLAVES_COLUMNA: ClaveColumna[] = [
  'realizado',
  'enviado',
  'pendiente',
  'interesado',
  'aceptado',
]

/**
 * Estados que el tablero trae. Son seis y no cinco: `aceptado` e
 * `iniciado` comparten columna (`ESTADOS_COLUMNA.aceptado`).
 */
export const ESTADOS_TABLERO: EstadoPresupuesto[] = CLAVES_COLUMNA.flatMap(
  (clave) => ESTADOS_COLUMNA[clave],
)

export function columnaDeEstado(estado: EstadoPresupuesto): ClaveColumna | null {
  for (const clave of CLAVES_COLUMNA) {
    if (ESTADOS_COLUMNA[clave].includes(estado)) return clave
  }
  return null
}

/**
 * Estado que se aplica al soltar en una columna: el primero de la lista.
 * En «Aceptado / Iniciado» eso es `aceptado`, nunca `iniciado`: iniciar
 * un tratamiento es una decisión clínica, no un arrastre.
 */
export function estadoDeColumna(clave: ClaveColumna): EstadoPresupuesto {
  return ESTADOS_COLUMNA[clave][0]
}

/* ═══════════════════════════════════════════════════════════
   Identificadores de las zonas de drop
   ═══════════════════════════════════════════════════════════ */

export function idColumna(clave: ClaveColumna): string {
  return `columna:${clave}`
}

/** La franja de perdidos del pie es una zona de drop más. */
export const ID_FRANJA_PERDIDO = 'franja:perdido'

/** Lo que cada droppable cuelga en `data` para resolver el destino. */
export type DatosDrop =
  | { tipo: 'columna'; columna: ClaveColumna }
  | { tipo: 'tarjeta'; columna: ClaveColumna }
  | { tipo: 'perdido' }

/* ═══════════════════════════════════════════════════════════
   Fila del tablero
   ═══════════════════════════════════════════════════════════ */

/**
 * Subconjunto de `presupuestos_listado` que la tarjeta muestra. No se
 * traen los ítems: el kanban es una vista de seguimiento, no el
 * documento.
 */
export interface FilaPipeline {
  id: string
  numero: string
  paciente_nombre: string
  prestacion_principal: string | null
  obra_social_nombre: string | null
  profesional_nombre: string
  fecha_emision: string
  total_a_cargo: number
  estado: EstadoPresupuesto
  dias_en_estado: number
  motivo_perdida: MotivoPerdida | null
}

export const COLUMNAS_PIPELINE =
  'id, numero, paciente_nombre, prestacion_principal, obra_social_nombre, ' +
  'profesional_nombre, fecha_emision, total_a_cargo, estado, dias_en_estado, motivo_perdida'

/* ═══════════════════════════════════════════════════════════
   Agregados
   ═══════════════════════════════════════════════════════════ */

export interface ResumenColumna {
  cantidad: number
  monto: number
}

export function agruparPorColumna(
  filas: FilaPipeline[],
): Record<ClaveColumna, FilaPipeline[]> {
  const grupos = {
    realizado: [],
    enviado: [],
    pendiente: [],
    interesado: [],
    aceptado: [],
  } as Record<ClaveColumna, FilaPipeline[]>

  for (const fila of filas) {
    const clave = columnaDeEstado(fila.estado)
    if (clave) grupos[clave].push(fila)
  }
  return grupos
}

export function resumir(filas: FilaPipeline[]): ResumenColumna {
  return {
    cantidad: filas.length,
    monto: filas.reduce((total, f) => total + f.total_a_cargo, 0),
  }
}

export interface ResumenPerdidos extends ResumenColumna {
  /** Motivo que más se repite, o `null` si no hay ninguno cargado. */
  motivo: MotivoPerdida | null
  /** Cuántos perdidos comparten ese motivo, para poder decir «7 de 12». */
  cantidadMotivo: number
}

/**
 * Motivo dominante de la franja. Ante un empate gana el primero en el
 * orden de `MOTIVOS`, que es estable: el número no baila entre recargas.
 */
export function resumirPerdidos(filas: FilaPipeline[]): ResumenPerdidos {
  const conteo = new Map<MotivoPerdida, number>()
  for (const fila of filas) {
    if (!fila.motivo_perdida) continue
    conteo.set(fila.motivo_perdida, (conteo.get(fila.motivo_perdida) ?? 0) + 1)
  }

  let motivo: MotivoPerdida | null = null
  let cantidadMotivo = 0
  for (const [clave, cantidad] of conteo) {
    if (cantidad > cantidadMotivo) {
      motivo = clave
      cantidadMotivo = cantidad
    }
  }

  return { ...resumir(filas), motivo, cantidadMotivo }
}

/* ═══════════════════════════════════════════════════════════
   URLs
   ═══════════════════════════════════════════════════════════ */

function parametros(filtros: FiltrosHome): URLSearchParams {
  const p = new URLSearchParams()
  if (filtros.q) p.set('q', filtros.q)
  if (filtros.profesional) p.set('prof', filtros.profesional)
  if (filtros.obraSocial) p.set('os', filtros.obraSocial)
  if (filtros.desde) p.set('desde', filtros.desde)
  if (filtros.hasta) p.set('hasta', filtros.hasta)
  return p
}

/**
 * URL del propio tablero. `estado` no viaja: las columnas ya son el
 * filtro de estado, y arrastrarlas cambiaría el filtro bajo los pies.
 */
export function urlPipeline(filtros: FiltrosHome): string {
  const qs = parametros(filtros).toString()
  return qs ? `/pipeline?${qs}` : '/pipeline'
}

/** Vuelta a la lista con el mismo contexto y sin filtro de estado. */
export function urlLista(filtros: FiltrosHome): string {
  return construirUrl({ ...filtros, estados: [] })
}

/**
 * Home filtrada por los estados del tablero: es el pipeline en mobile,
 * donde el kanban no existe como experiencia.
 */
export function urlHomePipeline(filtros: FiltrosHome): string {
  return construirUrl({ ...filtros, estados: ESTADOS_TABLERO })
}

export function hayFiltros(filtros: FiltrosHome): boolean {
  return Boolean(
    filtros.q || filtros.profesional || filtros.obraSocial || filtros.desde || filtros.hasta,
  )
}

/* ═══════════════════════════════════════════════════════════
   Textos
   ═══════════════════════════════════════════════════════════ */

/** `hoy` · `1 día` · `12 días` — lo que la tarjeta pone bajo el paciente. */
export function textoDias(dias: number): string {
  if (dias <= 0) return 'hoy'
  return dias === 1 ? '1 día' : `${dias} días`
}

export function plural(cantidad: number, singular: string, plural_: string): string {
  return cantidad === 1 ? singular : plural_
}
