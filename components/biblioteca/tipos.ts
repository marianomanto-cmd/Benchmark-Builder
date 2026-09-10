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

/**
 * En qué momento de su vida está una vigencia, mirada desde hoy.
 *
 * `vigente_hasta === null` NO significa «rige hoy». Desde que existen
 * los aumentos programados (migración 0600), `nueva_vigencia()` cierra
 * la vigencia actual con una fecha futura y deja abierta la que va a
 * empezar: la que tiene el `hasta` en null es la del año que viene.
 * Decidir por ese null pone el badge «Vigente» sobre un precio que
 * todavía no cotiza nadie y apaga el que el wizard está usando ahora
 * mismo — que es exactamente el número que el consultorio vino a mirar.
 *
 * La definición tiene que ser la misma que la de `arancel_vigente()` en
 * SQL y la de la vista `aranceles_vigentes`: rige hoy la que ya empezó
 * y todavía no terminó.
 */
export type EstadoVigencia = 'rige' | 'programada' | 'cerrada'

export function estadoVigencia(
  vigencia: { vigente_desde: string; vigente_hasta: string | null },
  hoy: string,
): EstadoVigencia {
  if (vigencia.vigente_desde > hoy) return 'programada'
  if (vigencia.vigente_hasta !== null && vigencia.vigente_hasta < hoy) return 'cerrada'
  return 'rige'
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

/**
 * Fecha de vigencia normalizada a `YYYY-MM-DD`.
 *
 * Las columnas son `date`, pero la API devuelve
 * `2026-06-11T00:00:00.000Z`. Con eso pasan dos cosas, las dos malas:
 *
 * - `parseISO` lo lee como un instante UTC y, en Argentina (UTC-3), se
 *   formatea como el día anterior: la pantalla que existe para sostener
 *   lo que se le prometió al paciente mostraba «desde el 10 de junio»
 *   una vigencia que arranca el 11.
 * - Las comparaciones contra `hoy` (`YYYY-MM-DD`) son de texto: el
 *   sufijo horario hace que una vigencia que arranca HOY dé
 *   `vigente_desde > hoy` y se muestre como «todavía no arrancó».
 *
 * Se recorta al entrar y todo lo demás compara y formatea días.
 */
export function soloFecha(valor: string): string {
  return valor.slice(0, 10)
}

/**
 * Una vigencia de `aranceles`, con lo que la pantalla necesita de ella.
 *
 * `vigente_hasta === null` marca **la vigencia abierta** de la celda, que
 * no siempre es la que se cotiza hoy: si hay un aumento programado, la de
 * hoy ya quedó cerrada con fecha futura y la abierta es la programada. Es
 * la abierta la que `nueva_vigencia()` y `aumento_masivo()` tocan, así que
 * cualquier preview que prometa un número tiene que mirar ésta.
 */
export interface Arancel {
  id: string
  prestacion_id: string
  obra_social_id: string | null
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
  vigente_desde: string
  vigente_hasta: string | null
}

/** La vigencia que rige HOY, tal como la trae `aranceles_vigentes`. */
export interface CeldaVigente extends Arancel {
  /** Presupuestos emitidos que la usan. Arriba de 0 ya no se edita. */
  usos: number
}

/** Una vigencia ya cargada que todavía no arrancó (`aranceles_programados`). */
export type ArancelProgramado = Arancel

/** ¿Es la vigencia abierta de su celda? Es la que se cierra al cargar otra. */
export function esAbierta(a: Arancel): boolean {
  return a.vigente_hasta === null
}

/** Una vigencia cualquiera (abierta o cerrada) para el histórico. */
export interface FilaHistorico {
  id: string
  prestacion_id: string
  prestacion: string
  /** Se busca por código igual que en la grilla: la búsqueda cruza de vista. */
  codigo: string | null
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
  /** Lo que se cotiza hoy. `null` = todavía no hay precio para hoy. */
  vigente: CeldaVigente | null
  /**
   * La próxima vigencia ya cargada, la más cercana en el tiempo. La
   * celda sigue mostrando lo de hoy; esto avisa que hay una esperando,
   * para que nadie la cargue dos veces creyendo que se perdió.
   */
  programada: ArancelProgramado | null
  /**
   * La vigencia abierta: la que se cierra al cargar la siguiente y
   * contra la que valida `nueva_vigencia()`. No siempre es la de hoy ni
   * la primera programada — con dos aumentos encadenados, la abierta es
   * la última.
   */
  abierta: Arancel | null
}

export type VistaAranceles = 'vigentes' | 'historico'

export function parseVista(valor: string | string[] | undefined): VistaAranceles {
  const v = Array.isArray(valor) ? valor[0] : valor
  return v === 'historico' ? 'historico' : 'vigentes'
}

/** Etiqueta de la columna Particular, que no es una obra social. */
export const PARTICULAR = 'Particular'
