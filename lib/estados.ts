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

/** Los cinco estados activos que son columna del pipeline. */
export const ESTADOS_PIPELINE: EstadoPresupuesto[] = [
  'realizado',
  'enviado',
  'pendiente',
  'interesado',
  'aceptado',
]

/** Aceptado e iniciado comparten columna en el kanban. */
export const ESTADOS_COLUMNA: Record<string, EstadoPresupuesto[]> = {
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

export const ETIQUETA_COLUMNA: Record<string, string> = {
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

/** Umbral de "hace mucho que no contesta": 7 días. */
export const DIAS_SIN_RESPUESTA = 7

export function estaFrio(estado: EstadoPresupuesto, diasEnEstado: number): boolean {
  return esperaRespuesta(estado) && diasEnEstado > DIAS_SIN_RESPUESTA
}
