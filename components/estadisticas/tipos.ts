import type { EstadoPresupuesto, MotivoPerdida } from '@/lib/types'

/**
 * Lo que devuelven las funciones `stats_*` de la base.
 *
 * Los `numeric` de Postgres llegan como string por el driver: se
 * normalizan a number en la página, en un solo lugar, y de acá para
 * abajo todo es número.
 */

export interface Resumen {
  emitidos: number
  montoEmitido: number
  ganados: number
  montoGanado: number
  perdidos: number
  enJuego: number
  montoEnJuego: number
  ticket: number
  diasACierre: number | null
}

export interface EtapaEmbudo {
  estado: EstadoPresupuesto
  alcanzaron: number
  monto: number
}

export interface TiempoEtapa {
  estado: EstadoPresupuesto
  medianaDias: number
  p90Dias: number
  casos: number
}

export interface Mes {
  mes: string
  emitidos: number
  ganados: number
  perdidos: number
  montoEmitido: number
  montoGanado: number
  ticket: number
}

export interface Motivo {
  motivo: MotivoPerdida
  casos: number
  monto: number
}

export interface ObraSocialStats {
  obraSocialId: string | null
  nombre: string
  presupuestos: number
  montoACargo: number
  coberturaPct: number | null
  ganados: number
  tasa: number | null
  ticket: number
}

export interface PrestacionStats {
  clave: string
  nombre: string
  codigo: string | null
  veces: number
  presupuestos: number
  montoProm: number
  totalACargo: number
  ganados: number
  tasa: number | null
}

export interface ProfesionalStats {
  profesionalId: string
  nombre: string
  emitidos: number
  ganados: number
  tasa: number | null
  montoGanado: number
  ticket: number
}

export interface Recurrencia {
  pacientes: number
  conUno: number
  recurrentes: number
  tasaRecurrencia: number | null
  promPorPaciente: number
  diasEntre: number | null
  montoPorPaciente: number
}

export interface TramoAging {
  tramo: string
  orden: number
  casos: number
  monto: number
}

export interface Estadisticas {
  resumen: Resumen
  embudo: EtapaEmbudo[]
  tiempos: TiempoEtapa[]
  meses: Mes[]
  motivos: Motivo[]
  obrasSociales: ObraSocialStats[]
  prestaciones: PrestacionStats[]
  profesionales: ProfesionalStats[]
  recurrencia: Recurrencia
  aging: TramoAging[]
}

export type {
  ClaveRango,
  OpcionRango,
} from '@/lib/estadisticas'
export { RANGOS, RANGO_POR_DEFECTO, esRango } from '@/lib/estadisticas'
