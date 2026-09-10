/**
 * Máquina de estados y paleta de badges.
 *
 *   borrador → realizado → enviado → pendiente → interesado → aceptado → iniciado
 *                   ↓          ↓         ↓            ↓           ↓
 *                 perdido ←────┴─────────┴────────────┴───────────┘
 *
 * Un único hue en escala de intensidad, no ocho colores. Cada badge
 * lleva punto de 6px Y texto: el color nunca es el único portador de
 * significado.
 */

import type { EstadoPresupuesto, MotivoPerdida } from './types'

export const ESTADOS: EstadoPresupuesto[] = [
  'borrador',
  'realizado',
  'enviado',
  'pendiente',
  'interesado',
  'aceptado',
  'iniciado',
  'perdido',
]

/**
 * Los estados que están EN JUEGO: los que el tablero muestra.
 *
 * Son seis en cinco columnas, porque `aceptado` e `iniciado` comparten
 * la última. Faltaba `iniciado`, y como el KPI «Monto en pipeline» de
 * la home se arma con esta lista mientras el tablero se arma con
 * `ESTADOS_TABLERO`, la tarjeta decía $ 8.894.100, el usuario la
 * clickeaba —es un `<Link href="/pipeline">`— y la pantalla siguiente
 * decía $ 9.618.700, sin nada que explicara el salto.
 *
 * El pipeline va «del primer envío al tratamiento iniciado», así que un
 * tratamiento ya iniciado sigue estando en juego: la plata todavía no
 * entró del todo.
 */
export const ESTADOS_PIPELINE: EstadoPresupuesto[] = [
  'realizado',
  'enviado',
  'pendiente',
  'interesado',
  'aceptado',
  'iniciado',
]

/**
 * Las cinco columnas del kanban. Tiparlo como unión y no como `string`
 * es lo que hace que `ESTADOS_COLUMNA[clave]` no pueda devolver
 * `undefined`: con `Record<string, …>` un typo compilaba y reventaba
 * recién en el navegador, con un `.includes` sobre nada.
 */
export type ClaveColumna = 'realizado' | 'enviado' | 'pendiente' | 'interesado' | 'aceptado'

/** Aceptado e iniciado comparten columna en el kanban. */
export const ESTADOS_COLUMNA: Record<ClaveColumna, EstadoPresupuesto[]> = {
  realizado: ['realizado'],
  enviado: ['enviado'],
  pendiente: ['pendiente'],
  interesado: ['interesado'],
  aceptado: ['aceptado', 'iniciado'],
}

export const ETIQUETA_ESTADO: Record<EstadoPresupuesto, string> = {
  borrador: 'Borrador',
  realizado: 'Realizado',
  enviado: 'Enviado',
  pendiente: 'Pendiente',
  interesado: 'Interesado',
  aceptado: 'Aceptado',
  iniciado: 'Iniciado',
  perdido: 'Perdido',
}

export const ETIQUETA_COLUMNA: Record<ClaveColumna, string> = {
  realizado: 'Realizado',
  enviado: 'Enviado',
  pendiente: 'Pendiente',
  interesado: 'Interesado',
  aceptado: 'Aceptado / Iniciado',
}

export const ETIQUETA_MOTIVO: Record<MotivoPerdida, string> = {
  precio: 'Precio',
  sin_respuesta: 'Sin respuesta',
  cobertura: 'Cobertura',
  otro_lugar: 'Se atendió en otro lugar',
  otro: 'Otro',
}

export const MOTIVOS: MotivoPerdida[] = [
  'precio',
  'sin_respuesta',
  'cobertura',
  'otro_lugar',
  'otro',
]

/**
 * Estilos del badge. Valores literales de la tabla del handoff §4.
 * Texto a opacidad completa: nunca color-mix sobre texto.
 */
export interface EstiloEstado {
  fondo: string
  borde: string | null
  texto: string
  punto: string
}

export const ESTILO_ESTADO: Record<EstadoPresupuesto, EstiloEstado> = {
  borrador:   { fondo: '#F1F5F7',   borde: '#E5EEF0',   texto: '#64748B', punto: '#94A3B8' },
  realizado:  { fondo: '#EAF8FA',   borde: '#E5EEF0',   texto: '#1F8D9B', punto: '#7FCBD5' },
  enviado:    { fondo: '#2FA6B414', borde: '#2FA6B438', texto: '#1F8D9B', punto: '#2FA6B4' },
  pendiente:  { fondo: '#FFF6EF',   borde: '#153A4415', texto: '#8A4326', punto: '#E08B5C' },
  interesado: { fondo: '#2FA6B41F', borde: '#2FA6B44D', texto: '#166B76', punto: '#1F8D9B' },
  aceptado:   { fondo: '#2FA6B4',   borde: null,        texto: '#FFFFFF', punto: '#FFFFFF' },
  iniciado:   { fondo: '#0D2730',   borde: null,        texto: '#FFFFFF', punto: '#7FCBD5' },
  perdido:    { fondo: '#FFE7DA',   borde: '#153A4415', texto: '#8A4326', punto: '#C4603A' },
}

/**
 * Transiciones sugeridas que el detalle ofrece a un clic.
 * Cualquier estado activo puede derivar a `perdido`; eso se agrega
 * aparte porque abre el selector de motivo.
 */
const AVANCE: Record<EstadoPresupuesto, EstadoPresupuesto[]> = {
  borrador: ['realizado'],
  realizado: ['enviado'],
  enviado: ['pendiente', 'interesado', 'aceptado'],
  pendiente: ['interesado', 'aceptado'],
  interesado: ['aceptado'],
  aceptado: ['iniciado'],
  iniciado: [],
  // `perdido` no se reabre como flujo principal: se ofrece duplicar.
  // La transición inversa existe, pero es secundaria en la UI.
  perdido: ['interesado'],
}

export function transicionesSugeridas(estado: EstadoPresupuesto): EstadoPresupuesto[] {
  return AVANCE[estado] ?? []
}

/** Un presupuesto activo puede darse por perdido en cualquier momento. */
export function puedeMarcarsePerdido(estado: EstadoPresupuesto): boolean {
  return estado !== 'perdido' && estado !== 'borrador' && estado !== 'iniciado'
}

/** Ya no está en juego: el monto se muestra en gris. */
export function estaCerrado(estado: EstadoPresupuesto): boolean {
  return estado === 'perdido' || estado === 'iniciado'
}

/** Está esperando respuesta del paciente. */
export function esperaRespuesta(estado: EstadoPresupuesto): boolean {
  return estado === 'enviado' || estado === 'pendiente'
}

/** Cuenta para el monto en pipeline. */
export function enPipeline(estado: EstadoPresupuesto): boolean {
  return (ESTADOS_PIPELINE as string[]).includes(estado)
}

/** Los ítems sólo se editan mientras es borrador. */
export function esEditable(estado: EstadoPresupuesto): boolean {
  return estado === 'borrador'
}

/**
 * Umbral de "hace mucho que no contesta": 7 días.
 *
 * El mismo número está en `marcar_pendientes()` (`interval '7 days'`),
 * que es quien mueve `enviado → pendiente`. Si cambia uno, cambia el
 * otro: si no, el tinte warm del kanban aparece antes o después del
 * pase automático y el consultorio ve dos verdades.
 */
export const DIAS_SIN_RESPUESTA = 7

export function estaFrio(estado: EstadoPresupuesto, diasEnEstado: number): boolean {
  return esperaRespuesta(estado) && diasEnEstado > DIAS_SIN_RESPUESTA
}
