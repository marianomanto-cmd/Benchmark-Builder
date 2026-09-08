import type { CoberturaTipo } from '@/lib/types'
import { money, porcentaje } from '@/lib/formato'

/* ═══════════════════════════════════════════════════════════
   Tabs de la biblioteca (pantalla 09)

   Las tabs son links y no estado de React: la pestaña vive en la URL
   (`/biblioteca?tab=pacientes`) para que se pueda compartir, volver
   con el botón atrás y renderizar del lado del servidor sin parpadeo.
   Aranceles es la excepción: no es una pestaña, es otra pantalla.
   ═══════════════════════════════════════════════════════════ */

export const TABS = ['prestaciones', 'obras-sociales', 'pacientes', 'profesionales'] as const

export type Tab = (typeof TABS)[number]

export const TAB_POR_DEFECTO: Tab = 'prestaciones'

export function parseTab(valor: string | string[] | undefined): Tab {
  const v = Array.isArray(valor) ? valor[0] : valor
  return (TABS as readonly string[]).includes(v ?? '') ? (v as Tab) : TAB_POR_DEFECTO
}

/* ═══════════════════════════════════════════════════════════
   Etiquetas de cobertura
   ═══════════════════════════════════════════════════════════ */

/** Nombre visible de una obra social, con su plan: `OSDE 210`. */
export function nombreObraSocial(nombre: string, plan: string | null | undefined): string {
  return plan ? `${nombre} ${plan}` : nombre
}

/** `50 %` · `$ 8.000` · `sin cobertura` — lo que entra en un pill. */
export function etiquetaCobertura(tipo: CoberturaTipo, valor: number): string {
  if (tipo === 'porcentaje') return porcentaje(valor)
  if (tipo === 'monto') return money(valor)
  return 'sin cobertura'
}

/** Versión larga, para el drawer y el form. */
export function etiquetaCoberturaLarga(tipo: CoberturaTipo, valor: number): string {
  if (tipo === 'porcentaje') return `Cubre el ${porcentaje(valor)}`
  if (tipo === 'monto') return `Cubre ${money(valor)} fijos`
  return 'Sin cobertura: queda todo a cargo del paciente'
}

export const ETIQUETA_TIPO_COBERTURA: Record<CoberturaTipo, string> = {
  porcentaje: 'Porcentaje',
  monto: 'Monto fijo',
  ninguna: 'Ninguna',
}

/* ═══════════════════════════════════════════════════════════
   Pantalla 09 — filas
   ═══════════════════════════════════════════════════════════ */

export interface CoberturaResumen {
  obra_social_id: string
  obra_social: string
  tipo: CoberturaTipo
  valor: number
  monto: number
}

export interface FilaPrestacion {
  id: string
  nombre: string
  codigo: string | null
  rubro: string | null
  descripcion: string | null
  vigencia_dias: number
  activa: boolean
  /** Valor particular vigente hoy. `null` = todavía no se cargó. */
  particular: number | null
  /** Coberturas vigentes, sólo de obras sociales activas. */
  coberturas: CoberturaResumen[]
  /** Obras sociales activas sin arancel vigente para esta prestación. */
  faltan: number
  /**
   * Ítems de presupuestos emitidos que la usan. Es el conteo histórico
   * que se muestra en las inactivas: la razón por la que no se borran.
   */
  usos: number
}

export interface FilaObraSocial {
  id: string
  nombre: string
  plan: string | null
  activa: boolean
  notas: string | null
  /** Pacientes que la tienen cargada. */
  pacientes: number
  /** Prestaciones con arancel vigente para esta obra social. */
  aranceles: number
}

export interface FilaPaciente {
  id: string
  nombre: string
  dni: string | null
  telefono: string | null
  tiene_whatsapp: boolean
  email: string | null
  obra_social_id: string | null
  obra_social: string | null
  nro_afiliado: string | null
  notas_internas: string | null
}

export interface FilaProfesional {
  id: string
  nombre: string
  matricula: string | null
  especialidad: string | null
  activo: boolean
  /** Tiene login propio en la app. */
  con_usuario: boolean
}

/** Opción mínima de obra social para los selects de los drawers. */
export interface OpcionObraSocial {
  id: string
  nombre: string
  activa: boolean
}

/* ═══════════════════════════════════════════════════════════
   Pantalla 10 — grilla de aranceles
   ═══════════════════════════════════════════════════════════ */

export interface PrestacionGrilla {
  id: string
  nombre: string
  codigo: string | null
  rubro: string | null
  activa: boolean
}

export interface ColumnaObraSocial {
  /** `null` = la columna Particular. */
  id: string | null
  nombre: string
  activa: boolean
}

/** Una vigencia abierta, tal como la trae `aranceles_vigentes`. */
export interface CeldaVigente {
  id: string
  prestacion_id: string
  obra_social_id: string | null
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
  vigente_desde: string
  /** Presupuestos emitidos que la usan. Arriba de 0 ya no se edita. */
  usos: number
  /**
   * Aumento ya cargado que todavía no arrancó. La celda sigue mostrando
   * lo que se cotiza hoy; esto avisa que hay uno esperando, para que
   * nadie lo cargue dos veces creyendo que se perdió.
   */
  programado?: { monto: number; vigente_desde: string } | null
}

/** Una vigencia cualquiera (abierta o cerrada) para el histórico. */
export interface FilaHistorico {
  id: string
  prestacion_id: string
  prestacion: string
  rubro: string | null
  obra_social_id: string | null
  obra_social: string
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
  vigente_desde: string
  vigente_hasta: string | null
  usos: number
}

/** Coordenada de una celda de la grilla: es lo que abre el drawer. */
export interface Celda {
  prestacion_id: string
  prestacion: string
  obra_social_id: string | null
  obra_social: string
  vigente: CeldaVigente | null
}

export type VistaAranceles = 'vigentes' | 'historico'

export function parseVista(valor: string | string[] | undefined): VistaAranceles {
  const v = Array.isArray(valor) ? valor[0] : valor
  return v === 'historico' ? 'historico' : 'vigentes'
}

/** Etiqueta de la columna Particular, que no es una obra social. */
export const PARTICULAR = 'Particular'
