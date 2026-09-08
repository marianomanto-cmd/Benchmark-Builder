'use client'

/**
 * Forma y transformaciones del borrador del wizard.
 *
 * El borrador es lo único que existe mientras el presupuesto se carga;
 * recién al guardar se convierte en el payload que congela la RPC.
 */

import { addDays, parseISO } from 'date-fns'

import type { PayloadPresupuesto } from '@/app/actions/presupuestos'
import { isoDate } from '@/lib/formato'
import type {
  Arancel,
  BorradorPresupuesto,
  CoberturaTipo,
  CuotaBorrador,
  ItemBorrador,
  Prestacion,
} from '@/lib/types'
import { nuevaKey } from '@/lib/utils'

/** Las dos vigencias que el consultorio usa el 95 % de las veces. */
export const VIGENCIAS_RAPIDAS = [30, 60] as const

export const VIGENCIA_POR_DEFECTO = 30

/** Etiqueta por defecto cuando la prestación no trae plantilla de cuotas. */
export const CUOTA_UNICA = 'Pago único'

export function calcularValidoHasta(fechaEmision: string, dias: number): string {
  try {
    return isoDate(addDays(parseISO(fechaEmision), Math.max(0, Math.round(dias))))
  } catch {
    // Fecha tipeada a medias en el input date: no rompemos el paso.
    return fechaEmision
  }
}

export function borradorInicial(): BorradorPresupuesto {
  const hoy = isoDate()
  return {
    paso: 1,
    paciente_id: null,
    paciente_nombre: null,
    obra_social_id: null,
    obra_social_nombre: null,
    profesional_id: null,
    profesional_nombre: null,
    fecha_emision: hoy,
    vigencia_dias: VIGENCIA_POR_DEFECTO,
    valido_hasta: calcularValidoHasta(hoy, VIGENCIA_POR_DEFECTO),
    items: [],
    cuotas: [],
    observaciones: '',
    nota_interna: '',
    estado_inicial: 'realizado',
    guardado_en: new Date().toISOString(),
  }
}

/** Ítem armado con el arancel vigente: es el camino feliz del paso 2. */
export function itemDesdeArancel(prestacion: Prestacion, arancel: Arancel): ItemBorrador {
  return {
    key: nuevaKey('item'),
    prestacion_id: prestacion.id,
    arancel_id: arancel.id,
    nombre: prestacion.nombre,
    codigo: prestacion.codigo,
    descripcion: prestacion.descripcion,
    detalle: null,
    monto: Math.round(Number(arancel.monto)),
    cobertura_tipo: arancel.cobertura_tipo,
    cobertura_valor: Number(arancel.cobertura_valor),
    editado: false,
    cobertura_original_tipo: null,
    cobertura_original_valor: null,
    motivo_override: null,
    monto_original: Math.round(Number(arancel.monto)),
  }
}

/**
 * Ítem cargado con el valor particular cuando la obra social no tiene
 * arancel: el monto es el del arancel particular y la cobertura es
 * `ninguna`, porque justamente no hay convenio que la defina.
 */
export function itemComoParticular(prestacion: Prestacion, particular: Arancel): ItemBorrador {
  return {
    ...itemDesdeArancel(prestacion, particular),
    cobertura_tipo: 'ninguna',
    cobertura_valor: 0,
  }
}

export function cuotaNueva(etiqueta: string, porcentaje: number): CuotaBorrador {
  return { key: nuevaKey('cuota'), etiqueta, porcentaje }
}

/** La prestación de mayor monto manda: de ella salen las condiciones de pago. */
export function itemPrincipal(items: ItemBorrador[]): ItemBorrador | null {
  if (items.length === 0) return null
  return items.reduce((mayor, actual) => (actual.monto > mayor.monto ? actual : mayor))
}

/**
 * Aplica un override de cobertura guardando el valor del arancel la
 * primera vez. Sin ese guardado no se puede ni auditar ("el arancel
 * dice 60 %") ni restaurar a un tap.
 */
export function conCoberturaEditada(
  item: ItemBorrador,
  tipo: CoberturaTipo,
  valor: number,
): ItemBorrador {
  const yaTeniaOriginal = item.cobertura_original_tipo !== null
  const original = yaTeniaOriginal
    ? { tipo: item.cobertura_original_tipo, valor: item.cobertura_original_valor }
    : { tipo: item.cobertura_tipo, valor: item.cobertura_valor }

  const igualAlArancel = tipo === original.tipo && valor === original.valor

  return {
    ...item,
    cobertura_tipo: tipo,
    cobertura_valor: valor,
    // Volver al valor del arancel a mano equivale a restaurar: la fila
    // deja de estar teñida y el chip "editado" desaparece.
    editado: !igualAlArancel || item.monto !== item.monto_original,
    cobertura_original_tipo: igualAlArancel ? null : original.tipo,
    cobertura_original_valor: igualAlArancel ? null : original.valor,
    motivo_override: igualAlArancel ? null : item.motivo_override,
  }
}

/**
 * Cambia el monto guardando el del arancel para poder restaurar. Un
 * monto distinto del arancel también tiñe la fila: es una decisión
 * comercial que alguien tomó y tiene que quedar a la vista.
 */
export function conMontoEditado(item: ItemBorrador, monto: number): ItemBorrador {
  const montoDistinto = item.monto_original !== null && monto !== item.monto_original
  const coberturaDistinta = item.cobertura_original_tipo !== null
  return {
    ...item,
    monto,
    editado: montoDistinto || coberturaDistinta,
    motivo_override: montoDistinto || coberturaDistinta ? item.motivo_override : null,
  }
}

/** Deshace el override y vuelve exactamente a lo que dice el arancel. */
export function restaurarArancel(item: ItemBorrador): ItemBorrador {
  return {
    ...item,
    monto: item.monto_original ?? item.monto,
    cobertura_tipo: item.cobertura_original_tipo ?? item.cobertura_tipo,
    cobertura_valor: item.cobertura_original_valor ?? item.cobertura_valor,
    editado: false,
    cobertura_original_tipo: null,
    cobertura_original_valor: null,
    motivo_override: null,
  }
}

/** ¿El ítem se puede restaurar? Sólo si guardamos de dónde venía. */
export function tieneArancelDeReferencia(item: ItemBorrador): boolean {
  return item.cobertura_original_tipo !== null || item.monto_original !== null
}

/** Borrador → payload de `crearPresupuesto`. */
export function aPayload(borrador: BorradorPresupuesto): PayloadPresupuesto {
  return {
    paciente_id: borrador.paciente_id ?? '',
    profesional_id: borrador.profesional_id ?? '',
    obra_social_id: borrador.obra_social_id,
    fecha_emision: borrador.fecha_emision,
    valido_hasta: borrador.valido_hasta,
    observaciones: borrador.observaciones.trim() || null,
    nota_interna: borrador.nota_interna.trim() || null,
    estado: borrador.estado_inicial,
    items: borrador.items.map((i) => ({
      prestacion_id: i.prestacion_id,
      arancel_id: i.arancel_id,
      nombre: i.nombre,
      codigo: i.codigo,
      descripcion: i.descripcion,
      detalle: i.detalle,
      monto: Math.round(i.monto),
      cobertura_tipo: i.cobertura_tipo,
      cobertura_valor: i.cobertura_valor,
      editado: i.editado,
      cobertura_original_tipo: i.cobertura_original_tipo,
      cobertura_original_valor: i.cobertura_original_valor,
      motivo_override: i.motivo_override,
    })),
    cuotas: borrador.cuotas.map((c) => ({
      etiqueta: c.etiqueta.trim(),
      porcentaje: c.porcentaje,
    })),
  }
}

/**
 * Vuelve a cotizar un ítem contra el arancel de otra obra social.
 *
 * Se usa cuando en el paso 1 se cambia la obra social (o el paciente)
 * con ítems ya cargados en el paso 2. Sin esto, el presupuesto sale
 * diciendo «OSDE 210» en la cabecera mientras los ítems conservan la
 * cobertura y el `arancel_id` de la obra social anterior: el documento
 * mentiría sobre su propia cobertura.
 *
 * Los overrides no se heredan, por la misma razón que no los hereda un
 * duplicado: un «40 % en vez de 50 %» decidido para otra obra social no
 * significa nada acá. Quien llama avisa cuántos se perdieron.
 */
export function recotizarItem(
  item: ItemBorrador,
  arancel: Arancel | null,
  particular: Arancel | null,
): { item: ItemBorrador; recotizado: boolean } {
  const elegido = arancel ?? particular
  if (!elegido) {
    // Ninguna de las dos tiene vigencia hoy: se conserva el ítem tal
    // como está y el paso 2 lo va a marcar como sin arancel.
    return { item, recotizado: false }
  }

  const esParticular = arancel === null
  const monto = Math.round(Number(elegido.monto))

  return {
    recotizado: true,
    item: {
      ...item,
      arancel_id: elegido.id,
      monto,
      monto_original: monto,
      cobertura_tipo: esParticular ? 'ninguna' : elegido.cobertura_tipo,
      cobertura_valor: esParticular ? 0 : Number(elegido.cobertura_valor),
      editado: false,
      cobertura_original_tipo: null,
      cobertura_original_valor: null,
      motivo_override: null,
    },
  }
}
