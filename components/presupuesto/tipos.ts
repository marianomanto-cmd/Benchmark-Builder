/**
 * Formas de datos de la pantalla 11 y normalización de lo que devuelve
 * PostgREST.
 *
 * Los `numeric(12,2)` vuelven como número en la mayoría de los casos,
 * pero no siempre: si el driver los entrega como string, un `+` de más
 * arriba concatena en vez de sumar y el total del documento sale mal.
 * Por eso todo pasa por `monto()` antes de entrar a la UI.
 */

import type { ComparacionPrecio } from '@/lib/calculo'
import type {
  CoberturaTipo,
  EstadoPresupuesto,
  MotivoPerdida,
  PresupuestoCuota,
  PresupuestoEvento,
  PresupuestoItem,
  TipoEvento,
} from '@/lib/types'

export type FilaCruda = Record<string, unknown>

export function texto(valor: unknown): string {
  return valor == null ? '' : String(valor)
}

export function textoOpcional(valor: unknown): string | null {
  return valor == null || valor === '' ? null : String(valor)
}

export function monto(valor: unknown): number {
  const n = Number(valor ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Cabecera del documento, ya normalizada. */
export interface CabeceraPresupuesto {
  id: string
  numero: string
  estado: EstadoPresupuesto
  estado_desde: string
  paciente_id: string
  paciente_nombre: string
  paciente_dni: string | null
  paciente_telefono: string | null
  paciente_afiliado: string | null
  obra_social_id: string | null
  obra_social_nombre: string | null
  profesional_nombre: string
  profesional_matricula: string | null
  fecha_emision: string
  valido_hasta: string
  subtotal: number
  total_cobertura: number
  total_a_cargo: number
  observaciones: string | null
  nota_interna: string | null
  motivo_perdida: MotivoPerdida | null
  motivo_perdida_nota: string | null
  duplicado_de: string | null
  created_at: string
}

/** Columnas que el detalle necesita de `presupuestos`. */
export const COLUMNAS_CABECERA = [
  'id',
  'numero',
  'estado',
  'estado_desde',
  'paciente_id',
  'paciente_nombre',
  'paciente_dni',
  'paciente_telefono',
  'paciente_afiliado',
  'obra_social_id',
  'obra_social_nombre',
  'profesional_nombre',
  'profesional_matricula',
  'fecha_emision',
  'valido_hasta',
  'subtotal',
  'total_cobertura',
  'total_a_cargo',
  'observaciones',
  'nota_interna',
  'motivo_perdida',
  'motivo_perdida_nota',
  'duplicado_de',
  'created_at',
].join(', ')

export function aCabecera(fila: FilaCruda): CabeceraPresupuesto {
  return {
    id: texto(fila.id),
    numero: texto(fila.numero),
    estado: fila.estado as EstadoPresupuesto,
    estado_desde: texto(fila.estado_desde),
    paciente_id: texto(fila.paciente_id),
    paciente_nombre: texto(fila.paciente_nombre),
    paciente_dni: textoOpcional(fila.paciente_dni),
    paciente_telefono: textoOpcional(fila.paciente_telefono),
    paciente_afiliado: textoOpcional(fila.paciente_afiliado),
    obra_social_id: textoOpcional(fila.obra_social_id),
    obra_social_nombre: textoOpcional(fila.obra_social_nombre),
    profesional_nombre: texto(fila.profesional_nombre),
    profesional_matricula: textoOpcional(fila.profesional_matricula),
    fecha_emision: texto(fila.fecha_emision),
    valido_hasta: texto(fila.valido_hasta),
    subtotal: monto(fila.subtotal),
    total_cobertura: monto(fila.total_cobertura),
    total_a_cargo: monto(fila.total_a_cargo),
    observaciones: textoOpcional(fila.observaciones),
    nota_interna: textoOpcional(fila.nota_interna),
    motivo_perdida: (fila.motivo_perdida ?? null) as MotivoPerdida | null,
    motivo_perdida_nota: textoOpcional(fila.motivo_perdida_nota),
    duplicado_de: textoOpcional(fila.duplicado_de),
    created_at: texto(fila.created_at),
  }
}

export function aItem(fila: FilaCruda): PresupuestoItem {
  return {
    id: texto(fila.id),
    presupuesto_id: texto(fila.presupuesto_id),
    orden: monto(fila.orden),
    prestacion_id: textoOpcional(fila.prestacion_id),
    arancel_id: textoOpcional(fila.arancel_id),
    nombre: texto(fila.nombre),
    codigo: textoOpcional(fila.codigo),
    descripcion: textoOpcional(fila.descripcion),
    detalle: textoOpcional(fila.detalle),
    monto: monto(fila.monto),
    cobertura_tipo: fila.cobertura_tipo as CoberturaTipo,
    cobertura_valor: monto(fila.cobertura_valor),
    cobertura_monto: monto(fila.cobertura_monto),
    a_cargo: monto(fila.a_cargo),
    editado: Boolean(fila.editado),
    cobertura_original_tipo: (fila.cobertura_original_tipo ?? null) as CoberturaTipo | null,
    cobertura_original_valor:
      fila.cobertura_original_valor == null ? null : monto(fila.cobertura_original_valor),
    motivo_override: textoOpcional(fila.motivo_override),
  }
}

export function aCuota(fila: FilaCruda): PresupuestoCuota {
  return {
    id: texto(fila.id),
    presupuesto_id: texto(fila.presupuesto_id),
    orden: monto(fila.orden),
    etiqueta: texto(fila.etiqueta),
    porcentaje: fila.porcentaje == null ? null : monto(fila.porcentaje),
    monto: monto(fila.monto),
  }
}

export function aEvento(fila: FilaCruda): PresupuestoEvento {
  return {
    id: texto(fila.id),
    presupuesto_id: texto(fila.presupuesto_id),
    tipo: texto(fila.tipo) as TipoEvento,
    descripcion: texto(fila.descripcion),
    estado_anterior: (fila.estado_anterior ?? null) as EstadoPresupuesto | null,
    estado_nuevo: (fila.estado_nuevo ?? null) as EstadoPresupuesto | null,
    autor_id: textoOpcional(fila.autor_id),
    autor_nombre: texto(fila.autor_nombre) || 'Sistema',
    created_at: texto(fila.created_at),
  }
}

/** Título legible de cada tipo de evento del timeline. */
export const TITULO_EVENTO: Record<TipoEvento, string> = {
  creado: 'Presupuesto creado',
  item_editado: 'Cobertura editada a mano',
  pdf_generado: 'PDF generado',
  enviado_whatsapp: 'Enviado por WhatsApp',
  estado_cambiado: 'Cambio de estado',
  nota: 'Nota interna',
  duplicado: 'Duplicado',
}

/**
 * Lo mínimo que los diálogos y sheets necesitan saber del presupuesto.
 * Viaja del Server Component al proveedor de cliente.
 */
export interface DatosSeguimiento {
  id: string
  numero: string
  estado: EstadoPresupuesto
  eventos: PresupuestoEvento[]
}

export type { ComparacionPrecio }
