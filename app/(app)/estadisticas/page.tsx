import type { Metadata } from 'next'

import { PantallaEstadisticas } from '@/components/estadisticas/pantalla'
import type {
  EtapaEmbudo, Estadisticas, Mes, Motivo, ObraSocialStats, PrestacionStats,
  ProfesionalStats, TiempoEtapa, TramoAging,
} from '@/components/estadisticas/tipos'
import { RANGO_POR_DEFECTO, esRango, ventanaRango } from '@/lib/estadisticas'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Estadísticas' }

/** Depende de la sesión y del rango: nunca se prerenderiza. */
export const dynamic = 'force-dynamic'

/**
 * Los `numeric` de Postgres llegan como string por el driver de
 * PostgREST —para no perder precisión— y `null` es un valor legítimo
 * (una tasa sin base no es 0 %, es «no se puede calcular»). Se
 * normaliza acá, en un solo lugar.
 */
const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0
  return Number.isFinite(n) ? n : 0
}
const numOnulo = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = typeof v === 'string' ? Number(v) : Number(v)
  return Number.isFinite(n) ? n : null
}

const VACIO: Estadisticas = {
  resumen: {
    emitidos: 0, montoEmitido: 0, ganados: 0, montoGanado: 0, perdidos: 0,
    enJuego: 0, montoEnJuego: 0, ticket: 0, diasACierre: null,
  },
  embudo: [], tiempos: [], meses: [], motivos: [], obrasSociales: [],
  prestaciones: [], profesionales: [],
  recurrencia: {
    pacientes: 0, conUno: 0, recurrentes: 0, tasaRecurrencia: null,
    promPorPaciente: 0, diasEntre: null, montoPorPaciente: 0,
  },
  aging: [],
}

type Fila = Record<string, unknown>

/**
 * Las filas de una lectura, o ninguna.
 *
 * La pantalla junta diez lecturas independientes: si una vuelve con una
 * forma que no esperábamos, tiene que faltar ESE bloque, no la pantalla
 * entera. Sin esto, un `.map` sobre algo que no es array tiraba todo al
 * error boundary y el consultorio veía «se rompió algo» en vez de las
 * nueve secciones que sí habían llegado.
 */
function filas(data: unknown): Fila[] {
  return Array.isArray(data) ? (data as Fila[]) : []
}

async function cargar(
  desde: string,
  hasta: string,
): Promise<{ datos: Estadisticas; fallo: boolean; fallos: Record<string, boolean> }> {
  const supabase = await createClient()
  const args = { p_desde: desde, p_hasta: hasta }

  // En paralelo: son nueve lecturas independientes y encadenarlas
  // multiplicaba por nueve el tiempo hasta el primer número.
  const [
    resumen, embudo, tiempos, meses, motivos,
    obrasSociales, prestaciones, profesionales, recurrencia, aging,
  ] = await Promise.all([
    supabase.rpc('stats_resumen', args),
    supabase.rpc('stats_embudo', args),
    supabase.rpc('stats_tiempos', args),
    supabase.rpc('stats_mensual', args),
    supabase.rpc('stats_motivos', args),
    supabase.rpc('stats_obras_sociales', args),
    supabase.rpc('stats_prestaciones', args),
    supabase.rpc('stats_profesionales', args),
    supabase.rpc('stats_pacientes', args),
    supabase.rpc('stats_aging'),
  ])

  /**
   * Qué lectura falló, no sólo que alguna falló.
   *
   * Antes esto era un `some(r => r.error)` y aguas abajo un bloque sin
   * datos no se distinguía de un bloque que no volvió: «A quién llamar
   * hoy» decía «No hay ningún presupuesto esperando respuesta» y «Por
   * qué se pierden» decía «Todavía no se perdió ninguno. Buena
   * noticia» cuando la verdad era que la lectura se había caído. Una
   * pantalla de números que afirma lo contrario de lo que pasa es peor
   * que una pantalla vacía.
   */
  const respuestas = {
    resumen, embudo, tiempos, meses, motivos,
    obrasSociales, prestaciones, profesionales, recurrencia, aging,
  }
  const fallos: Record<string, boolean> = {}
  for (const [nombre, r] of Object.entries(respuestas)) {
    if (r.error) {
      fallos[nombre] = true
      console.error(`[estadisticas] no se pudo leer ${nombre}`, r.error.message)
    }
  }
  const fallo = Object.keys(fallos).length > 0

  const filaResumen = filas(resumen.data)[0]
  const filaRecurrencia = filas(recurrencia.data)[0]

  return {
    fallo,
    fallos,
    datos: {
      resumen: filaResumen
        ? {
            emitidos: num(filaResumen.emitidos),
            montoEmitido: num(filaResumen.monto_emitido),
            ganados: num(filaResumen.ganados),
            montoGanado: num(filaResumen.monto_ganado),
            perdidos: num(filaResumen.perdidos),
            enJuego: num(filaResumen.en_juego),
            montoEnJuego: num(filaResumen.monto_en_juego),
            ticket: num(filaResumen.ticket),
            diasACierre: numOnulo(filaResumen.dias_a_cierre),
          }
        : VACIO.resumen,

      embudo: filas(embudo.data).map((f): EtapaEmbudo => ({
        estado: f.estado as EtapaEmbudo['estado'],
        alcanzaron: num(f.alcanzaron),
        monto: num(f.monto),
      })),

      tiempos: filas(tiempos.data).map((f): TiempoEtapa => ({
        estado: f.estado as TiempoEtapa['estado'],
        medianaDias: num(f.mediana_dias),
        p90Dias: num(f.p90_dias),
        casos: num(f.casos),
      })),

      meses: filas(meses.data).map((f): Mes => ({
        mes: String(f.mes),
        emitidos: num(f.emitidos),
        ganados: num(f.ganados),
        perdidos: num(f.perdidos),
        montoEmitido: num(f.monto_emitido),
        montoGanado: num(f.monto_ganado),
        ticket: numOnulo(f.ticket),
      })),

      motivos: filas(motivos.data).map((f): Motivo => ({
        motivo: f.motivo as Motivo['motivo'],
        casos: num(f.casos),
        monto: num(f.monto),
      })),

      obrasSociales: filas(obrasSociales.data).map((f): ObraSocialStats => ({
        obraSocialId: (f.obra_social_id as string | null) ?? null,
        nombre: String(f.nombre ?? 'Particular'),
        presupuestos: num(f.presupuestos),
        montoACargo: num(f.monto_a_cargo),
        coberturaPct: numOnulo(f.cobertura_pct),
        ganados: num(f.ganados),
        tasa: numOnulo(f.tasa),
        ticket: num(f.ticket),
      })),

      prestaciones: filas(prestaciones.data).map((f): PrestacionStats => ({
        clave: String(f.clave),
        nombre: String(f.nombre ?? ''),
        codigo: (f.codigo as string | null) ?? null,
        veces: num(f.veces),
        presupuestos: num(f.presupuestos),
        montoProm: num(f.monto_prom),
        totalACargo: num(f.total_a_cargo),
        ganados: num(f.ganados),
        tasa: numOnulo(f.tasa),
      })),

      profesionales: filas(profesionales.data).map((f): ProfesionalStats => ({
        profesionalId: String(f.profesional_id),
        nombre: String(f.nombre ?? ''),
        emitidos: num(f.emitidos),
        ganados: num(f.ganados),
        tasa: numOnulo(f.tasa),
        montoGanado: num(f.monto_ganado),
        ticket: num(f.ticket),
      })),

      recurrencia: filaRecurrencia
        ? {
            pacientes: num(filaRecurrencia.pacientes),
            conUno: num(filaRecurrencia.con_uno),
            recurrentes: num(filaRecurrencia.recurrentes),
            tasaRecurrencia: numOnulo(filaRecurrencia.tasa_recurrencia),
            promPorPaciente: num(filaRecurrencia.prom_por_paciente),
            diasEntre: numOnulo(filaRecurrencia.dias_entre),
            montoPorPaciente: num(filaRecurrencia.monto_por_paciente),
          }
        : VACIO.recurrencia,

      aging: filas(aging.data).map((f): TramoAging => ({
        tramo: String(f.tramo),
        orden: num(f.orden),
        casos: num(f.casos),
        monto: num(f.monto),
      })),
    },
  }
}

export default async function EstadisticasPage(props: PageProps<'/estadisticas'>) {
  const searchParams = await props.searchParams
  const rango = esRango(searchParams.rango) ? searchParams.rango : RANGO_POR_DEFECTO
  const { desde, hasta } = ventanaRango(rango)

  const { datos, fallo, fallos } = await cargar(desde, hasta)

  return <PantallaEstadisticas
      datos={datos}
      rango={rango}
      desde={desde}
      hasta={hasta}
      fallo={fallo}
      fallos={fallos}
    />
}
