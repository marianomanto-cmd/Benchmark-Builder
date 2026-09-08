/**
 * Tipos del dominio, alineados a las migraciones de `supabase/migrations`.
 * Se escriben a mano en lugar de generarlos con `supabase gen types` para
 * que el repo compile sin conexión al proyecto.
 */

import type { CoberturaTipo } from './calculo'

export type { CoberturaTipo }

export type EstadoPresupuesto =
  | 'borrador'
  | 'realizado'
  | 'enviado'
  | 'pendiente'
  | 'interesado'
  | 'aceptado'
  | 'iniciado'
  | 'perdido'

export type MotivoPerdida =
  | 'precio'
  | 'sin_respuesta'
  | 'cobertura'
  | 'otro_lugar'
  | 'otro'

export type TipoEvento =
  | 'creado'
  | 'item_editado'
  | 'pdf_generado'
  | 'enviado_whatsapp'
  | 'estado_cambiado'
  | 'nota'
  | 'duplicado'

export interface Profesional {
  id: string
  user_id: string | null
  nombre: string
  matricula: string | null
  especialidad: string | null
  activo: boolean
  created_at: string
}

export interface ObraSocial {
  id: string
  nombre: string
  plan: string | null
  activa: boolean
  notas: string | null
  created_at: string
}

export interface Paciente {
  id: string
  nombre: string
  dni: string | null
  telefono: string | null
  tiene_whatsapp: boolean
  email: string | null
  obra_social_id: string | null
  nro_afiliado: string | null
  notas_internas: string | null
  created_at: string
  updated_at: string
}

export interface Prestacion {
  id: string
  nombre: string
  codigo: string | null
  rubro: string | null
  descripcion: string | null
  vigencia_dias: number
  activa: boolean
  created_at: string
}

export interface PrestacionCuota {
  id: string
  prestacion_id: string
  orden: number
  porcentaje: number
  etiqueta: string
}

export interface Arancel {
  id: string
  prestacion_id: string
  obra_social_id: string | null
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
  vigente_desde: string
  vigente_hasta: string | null
  created_at: string
  created_by: string | null
}

/** Vista `aranceles_vigentes`. */
export interface ArancelVigente extends Arancel {
  prestacion: string
  codigo: string | null
  rubro: string | null
  obra_social: string
  usos: number
}

export interface Presupuesto {
  id: string
  numero: string
  paciente_id: string
  profesional_id: string
  obra_social_id: string | null
  obra_social_nombre: string | null
  paciente_nombre: string
  paciente_dni: string | null
  paciente_telefono: string | null
  paciente_afiliado: string | null
  profesional_nombre: string
  profesional_matricula: string | null
  fecha_emision: string
  valido_hasta: string
  subtotal: number
  total_cobertura: number
  total_a_cargo: number
  observaciones: string | null
  estado: EstadoPresupuesto
  estado_desde: string
  motivo_perdida: MotivoPerdida | null
  motivo_perdida_nota: string | null
  nota_interna: string | null
  pdf_path: string | null
  duplicado_de: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

/** Vista `presupuestos_listado`. */
export interface PresupuestoListado extends Presupuesto {
  prestacion_principal: string | null
  items_count: number
  dias_en_estado: number
}

export interface PresupuestoItem {
  id: string
  presupuesto_id: string
  orden: number
  prestacion_id: string | null
  arancel_id: string | null
  nombre: string
  codigo: string | null
  descripcion: string | null
  detalle: string | null
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
  cobertura_monto: number
  a_cargo: number
  editado: boolean
  cobertura_original_tipo: CoberturaTipo | null
  cobertura_original_valor: number | null
  motivo_override: string | null
}

export interface PresupuestoCuota {
  id: string
  presupuesto_id: string
  orden: number
  etiqueta: string
  porcentaje: number | null
  monto: number
}

export interface PresupuestoEvento {
  id: string
  presupuesto_id: string
  tipo: TipoEvento
  descripcion: string
  estado_anterior: EstadoPresupuesto | null
  estado_nuevo: EstadoPresupuesto | null
  autor_id: string | null
  autor_nombre: string
  created_at: string
}

/** Presupuesto con todo lo que necesita el detalle y el PDF. */
export interface PresupuestoCompleto extends Presupuesto {
  items: PresupuestoItem[]
  cuotas: PresupuestoCuota[]
  eventos: PresupuestoEvento[]
}

// ── Payload del wizard ────────────────────────────────────────

export interface ItemBorrador {
  /** clave local, para React; no viaja a la base */
  key: string
  prestacion_id: string | null
  arancel_id: string | null
  nombre: string
  codigo: string | null
  descripcion: string | null
  detalle: string | null
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
  editado: boolean
  cobertura_original_tipo: CoberturaTipo | null
  cobertura_original_valor: number | null
  motivo_override: string | null
  /** monto del arancel, para poder restaurar y para el helper auditable */
  monto_original: number | null
}

export interface CuotaBorrador {
  key: string
  etiqueta: string
  porcentaje: number
}

export interface BorradorPresupuesto {
  paso: 1 | 2 | 3
  paciente_id: string | null
  paciente_nombre: string | null
  obra_social_id: string | null
  obra_social_nombre: string | null
  profesional_id: string | null
  profesional_nombre: string | null
  fecha_emision: string
  vigencia_dias: number
  valido_hasta: string
  items: ItemBorrador[]
  cuotas: CuotaBorrador[]
  observaciones: string
  nota_interna: string
  estado_inicial: Extract<EstadoPresupuesto, 'realizado' | 'enviado'>
  guardado_en: string
}
