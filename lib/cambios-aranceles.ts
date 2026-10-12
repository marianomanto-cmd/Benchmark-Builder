/**
 * El registro de cambios de un arancel, contado en castellano.
 *
 * `aranceles_cambios` guarda cada alta, corrección y baja con la fila
 * entera antes y después. Eso es lo que permite defender un presupuesto
 * aunque el arancel que citó se haya corregido o borrado: queda escrito
 * qué decía, quién lo cambió, cuándo y por qué. Este módulo convierte
 * ese par de fotos en una línea que se entiende de un vistazo.
 */

import { fechaCorta, money, porcentaje } from './formato.ts'

export type AccionCambio = 'alta' | 'edicion' | 'baja'

/** Lo que se guarda de un arancel en cada foto del registro. */
export interface FotoArancel {
  monto: number
  cobertura_tipo: 'porcentaje' | 'monto' | 'ninguna'
  cobertura_valor: number
  vigente_desde: string
  vigente_hasta: string | null
}

export interface CambioArancel {
  id: string
  arancel_id: string
  accion: AccionCambio
  /** vigencia | aumento | excel | correccion | baja | directo */
  origen: string
  motivo: string | null
  antes: FotoArancel | null
  despues: FotoArancel | null
  autor_nombre: string
  created_at: string
}

/** El jsonb del registro trae numeric como texto y fechas con hora. */
export function normalizarFoto(crudo: unknown): FotoArancel | null {
  if (!crudo || typeof crudo !== 'object') return null
  const f = crudo as Record<string, unknown>
  const tipo = f.cobertura_tipo
  return {
    monto: Number(f.monto ?? 0),
    cobertura_tipo: tipo === 'porcentaje' || tipo === 'monto' ? tipo : 'ninguna',
    cobertura_valor: Number(f.cobertura_valor ?? 0),
    vigente_desde: String(f.vigente_desde ?? '').slice(0, 10),
    vigente_hasta:
      f.vigente_hasta === null || f.vigente_hasta === undefined
        ? null
        : String(f.vigente_hasta).slice(0, 10),
  }
}

function cobertura(foto: FotoArancel): string {
  if (foto.cobertura_tipo === 'porcentaje') return porcentaje(foto.cobertura_valor)
  if (foto.cobertura_tipo === 'monto') return `${money(foto.cobertura_valor)} fijos`
  return 'sin cobertura'
}

const PREFIJO: Record<string, string> = {
  correccion: 'Corrección',
  excel: 'Excel',
  aumento: 'Aumento masivo',
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Una línea por cambio:
 *
 *   «Se cargó $ 750.000 desde el 01/09/2026»
 *   «Corrección: $ 800 → $ 800.000»
 *   «Se cerró el 30/09/2026»
 *   «Se borró $ 800 (desde el 01/10/2026)»
 */
export function describirCambio(cambio: CambioArancel): string {
  const prefijo = PREFIJO[cambio.origen]
  const { antes, despues } = cambio

  if (cambio.accion === 'alta' && despues) {
    const cuerpo = `${money(despues.monto)} desde el ${fechaCorta(despues.vigente_desde)}`
    return prefijo ? `${prefijo}: ${cuerpo}` : `Se cargó ${cuerpo}`
  }

  if (cambio.accion === 'baja' && antes) {
    const hasta = antes.vigente_hasta ? ` hasta el ${fechaCorta(antes.vigente_hasta)}` : ''
    return `Se borró ${money(antes.monto)} (desde el ${fechaCorta(antes.vigente_desde)}${hasta})`
  }

  if (cambio.accion === 'edicion' && antes && despues) {
    const partes: string[] = []

    if (antes.monto !== despues.monto) {
      partes.push(`${money(antes.monto)} → ${money(despues.monto)}`)
    }
    if (
      antes.cobertura_tipo !== despues.cobertura_tipo ||
      antes.cobertura_valor !== despues.cobertura_valor
    ) {
      partes.push(`cobertura ${cobertura(antes)} → ${cobertura(despues)}`)
    }
    if (antes.vigente_desde !== despues.vigente_desde) {
      partes.push(
        `arranca el ${fechaCorta(despues.vigente_desde)} (antes el ${fechaCorta(antes.vigente_desde)})`,
      )
    }
    if (antes.vigente_hasta !== despues.vigente_hasta) {
      if (despues.vigente_hasta === null) {
        partes.push('vuelve a regir sin fecha de fin')
      } else if (antes.vigente_hasta === null) {
        partes.push(`se cerró el ${fechaCorta(despues.vigente_hasta)}`)
      } else {
        partes.push(
          `termina el ${fechaCorta(despues.vigente_hasta)} (antes el ${fechaCorta(antes.vigente_hasta)})`,
        )
      }
    }

    // Si el precio no cambió, se nombra igual: «se cerró el 30/09» no
    // dice de cuál de las vigencias de la celda se está hablando.
    if (antes.monto === despues.monto) partes.unshift(money(despues.monto))

    const cuerpo = partes.join(' · ')
    return prefijo ? `${prefijo}: ${cuerpo}` : conMayuscula(cuerpo)
  }

  return 'Cambio sin detalle'
}
