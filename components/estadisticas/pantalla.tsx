import { Banner, Monto } from '@/components/ui'
import { ETIQUETA_ESTADO, ETIQUETA_MOTIVO } from '@/lib/estados'
import { caidaEmbudo, dias, mesCorto, mesLargo, type ClaveRango } from '@/lib/estadisticas'
import { fechaLarga, money, numero } from '@/lib/formato'
import { cn } from '@/lib/utils'

import { Barras } from './barras'
import { Bloque, SinDatos } from './bloque'
import { Lineas } from './lineas'
import { SelectorRango } from './rango'
import { TablaStats, type ColumnaStats } from './tabla-stats'
import type {
  Estadisticas, ObraSocialStats, PrestacionStats, ProfesionalStats,
} from './tipos'

/**
 * Estadísticas del consultorio.
 *
 * Cada bloque contesta una pregunta que alguien se hace de verdad, en
 * el orden en que se la hace: primero cómo viene el mes, después dónde
 * se cae la venta, después por qué, y recién al final el detalle por
 * obra social, tratamiento y profesional.
 *
 * Todos los números vienen agregados de la base. Acá no se suma nada:
 * lo único que se calcula en el render son porcentajes derivados de
 * totales que ya vinieron listos.
 */

const pct = (v: number | null) => (v === null ? '—' : `${numero(v)} %`)

export function PantallaEstadisticas({
  datos,
  rango,
  desde,
  hasta,
  fallo,
}: {
  datos: Estadisticas
  rango: ClaveRango
  desde: string
  hasta: string
  fallo: boolean
}) {
  const { resumen, embudo, tiempos, meses, motivos, obrasSociales, prestaciones, profesionales, recurrencia, aging } = datos
  const hayDatos = resumen.emitidos > 0

  return (
    <div className="flex flex-col gap-5 animate-enter">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="t-h2">Estadísticas</h1>
          <p className="t-helper mt-0.5">
            {rango === 'todo'
              ? 'Toda la historia del consultorio.'
              : `Presupuestos emitidos entre el ${fechaLarga(desde)} y el ${fechaLarga(hasta)}.`}
          </p>
        </div>
        <SelectorRango actual={rango} />
      </header>

      {fallo && (
        <Banner tono="warm" titulo="Faltan números">
          Alguna de las lecturas no volvió. Lo que se ve es lo que sí llegó; recargá para
          reintentar.
        </Banner>
      )}

      {!hayDatos ? (
        <SinDatos>
          No hay presupuestos emitidos en esta ventana. Probá con un rango más largo.
        </SinDatos>
      ) : (
        <>
          <Resumen datos={datos} />

          <Bloque
            titulo="Dónde se cae la venta"
            pregunta="De todos los que se emitieron, cuántos llegaron a cada etapa. No es la foto de hoy: es por dónde pasó cada uno."
          >
            <Embudo etapas={embudo} />
          </Bloque>

          <div className="grid gap-5 lg:grid-cols-2">
            <Bloque
              titulo="Mes a mes"
              pregunta="Cuántos salieron y cuántos se aceptaron, por mes de emisión."
            >
              {meses.length === 0 ? (
                <SinDatos>Todavía no hay meses para comparar.</SinDatos>
              ) : (
                <Lineas
                  etiquetas={meses.map((m) => mesCorto(m.mes))}
                  titulos={meses.map((m) => mesLargo(m.mes))}
                  series={[
                    { clave: 'emitidos', etiqueta: 'Emitidos', color: 'serie', valores: meses.map((m) => m.emitidos) },
                    { clave: 'ganados', etiqueta: 'Aceptados', color: 'perdido', valores: meses.map((m) => m.ganados) },
                  ]}
                  formato="cantidad"
                />
              )}
            </Bloque>

            <Bloque
              titulo="Cuánto sale un presupuesto"
              pregunta="Promedio a cargo del paciente, por mes. Va en su propio gráfico: mezclar pesos y cantidades en un solo eje deja «demostrar» cualquier cosa."
            >
              {meses.length === 0 ? (
                <SinDatos>Todavía no hay meses para comparar.</SinDatos>
              ) : (
                <Lineas
                  etiquetas={meses.map((m) => mesCorto(m.mes))}
                  titulos={meses.map((m) => mesLargo(m.mes))}
                  series={[
                    { clave: 'ticket', etiqueta: 'Promedio a cargo', color: 'serie', valores: meses.map((m) => m.ticket) },
                  ]}
                  formato="dinero"
                />
              )}
            </Bloque>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Bloque
              titulo="Cuánto tarda cada paso"
              pregunta="Mediana de días que un presupuesto pasa en cada etapa antes de moverse. Mediana y no promedio: uno olvidado tres meses corre el promedio."
            >
              {tiempos.length === 0 ? (
                <SinDatos>Todavía no hay ningún paso completo para medir.</SinDatos>
              ) : (
                <Barras
                  tono="rampa"
                  datos={tiempos.map((t) => ({
                    clave: t.estado,
                    etiqueta: ETIQUETA_ESTADO[t.estado],
                    valor: t.medianaDias,
                    texto: dias(t.medianaDias),
                    detalle: `9 de 10, hasta ${dias(t.p90Dias)}`,
                  }))}
                />
              )}
            </Bloque>

            <Bloque
              titulo="Por qué se pierden"
              pregunta="El motivo que se cargó al darlos por perdidos. Es lo único de esta pantalla que se puede accionar mañana."
            >
              {motivos.length === 0 ? (
                <SinDatos>
                  Todavía no se perdió ninguno con motivo cargado. Buena noticia.
                </SinDatos>
              ) : (
                <Barras
                  tono="perdido"
                  datos={motivos.map((m) => ({
                    clave: m.motivo,
                    etiqueta: ETIQUETA_MOTIVO[m.motivo],
                    valor: m.casos,
                    texto: `${numero(m.casos)}`,
                    detalle: money(m.monto),
                  }))}
                />
              )}
            </Bloque>
          </div>

          <Bloque
            titulo="A quién llamar hoy"
            pregunta="Hace cuánto que no se mueve cada presupuesto que sigue en juego. No depende del rango: es la foto de hoy."
          >
            {aging.every((t) => t.casos === 0) ? (
              <SinDatos>No hay ningún presupuesto esperando respuesta.</SinDatos>
            ) : (
              <Barras
                tono="rampa"
                anchoEtiqueta="sm:w-[110px] md:w-[130px]"
                datos={aging.map((t) => ({
                  clave: t.tramo,
                  etiqueta: t.tramo,
                  valor: t.casos,
                  texto: numero(t.casos),
                  detalle: money(t.monto),
                }))}
              />
            )}
          </Bloque>

          <Bloque
            titulo="Obras sociales"
            pregunta="Cuánto se presupuesta con cada una, qué porción cubre de verdad y cuántos terminan aceptándose."
          >
            <TablaStats
              datos={obrasSociales}
              claveFila={(o) => o.obraSocialId ?? 'particular'}
              vacio="Todavía no hay presupuestos en esta ventana."
              columnas={COLUMNAS_OS}
            />
          </Bloque>

          <Bloque
            titulo="Tratamientos"
            pregunta="Qué se presupuesta más, a qué precio y con qué suerte. La tasa es por presupuesto: uno con dos coronas se ganó una vez, no dos."
          >
            <TablaStats
              datos={prestaciones.slice(0, 20)}
              claveFila={(p) => p.clave}
              vacio="Todavía no hay prestaciones presupuestadas."
              columnas={COLUMNAS_PRESTACION}
            />
            {prestaciones.length > 20 && (
              <p className="mt-3 t-helper">
                Se muestran las 20 más presupuestadas de {numero(prestaciones.length)}.
              </p>
            )}
          </Bloque>

          <div className="grid gap-5 lg:grid-cols-2">
            <Bloque titulo="Por profesional" pregunta="Cuántos emitió cada uno y cuántos cerró.">
              <TablaStats
                datos={profesionales}
                claveFila={(p) => p.profesionalId}
                vacio="Todavía no hay presupuestos en esta ventana."
                columnas={COLUMNAS_PROFESIONAL}
              />
            </Bloque>

            <Bloque
              titulo="Vuelven los pacientes"
              pregunta="De los que pasaron por el consultorio en esta ventana, cuántos tienen más de un presupuesto en toda su historia."
            >
              <div className="grid grid-cols-2 gap-3">
                <Dato etiqueta="Pacientes" valor={numero(recurrencia.pacientes)} />
                <Dato
                  etiqueta="Volvieron"
                  valor={pct(recurrencia.tasaRecurrencia)}
                  ayuda={`${numero(recurrencia.recurrentes)} de ${numero(recurrencia.pacientes)}`}
                />
                <Dato
                  etiqueta="Presupuestos por paciente"
                  valor={numero(recurrencia.promPorPaciente)}
                />
                <Dato
                  etiqueta="Entre uno y el siguiente"
                  valor={dias(recurrencia.diasEntre)}
                  ayuda="mediana"
                />
              </div>
              <p className="mt-3 t-helper">
                Cada paciente suma{' '}
                <Monto valor={recurrencia.montoPorPaciente} jerarquia="fuerte" /> a cargo en
                promedio, sumando toda su historia.
              </p>
            </Bloque>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Los números de arriba ─────────────────────────────────── */

function Resumen({ datos }: { datos: Estadisticas }) {
  const { resumen } = datos
  // Misma definición que la Home: aceptados sobre TODO lo emitido en la
  // ventana. Que dos pantallas de la misma app muestren dos tasas
  // distintas con el mismo nombre es peor que no mostrar ninguna.
  const tasa = resumen.emitidos === 0 ? null : Math.round((resumen.ganados / resumen.emitidos) * 100)

  return (
    <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tarjeta
        etiqueta="Emitidos"
        valor={numero(resumen.emitidos)}
        ayuda={`${money(resumen.montoEmitido)} presupuestados`}
      />
      <Tarjeta
        etiqueta="Tasa de aceptación"
        valor={pct(tasa)}
        ayuda={`${numero(resumen.ganados)} aceptados · ${numero(resumen.perdidos)} perdidos`}
      />
      <Tarjeta
        etiqueta="Aceptado"
        valor={money(resumen.montoGanado)}
        ayuda={
          resumen.diasACierre === null
            ? 'Todavía sin cierres para medir'
            : `Tardan ${dias(resumen.diasACierre)} en cerrarse`
        }
      />
      <Tarjeta
        etiqueta="En juego"
        valor={money(resumen.montoEnJuego)}
        ayuda={`${numero(resumen.enJuego)} esperando respuesta`}
      />
    </section>
  )
}

function Tarjeta({ etiqueta, valor, ayuda }: { etiqueta: string; valor: string; ayuda: string }) {
  return (
    <article className="flex flex-col gap-1 rounded-card border border-hairline bg-card p-4 shadow-rest sm:p-5">
      <p className="t-label">{etiqueta}</p>
      {/* No usa `t-hero-num` en mobile a propósito: 34px son ~180px de
          «$ 4.528.600», y la tarjeta mide 170. El número se partía
          después del signo y se salía de la tarjeta. Acá el dato es
          plata, no una cantidad de dos dígitos como en la Home. */}
      <p className="font-display text-[23px] font-semibold leading-tight tracking-[-0.02em] text-ink tabular-nums sm:text-[28px] lg:text-[34px]">
        {valor}
      </p>
      <p className="t-helper">{ayuda}</p>
    </article>
  )
}

function Dato({ etiqueta, valor, ayuda }: { etiqueta: string; valor: string; ayuda?: string }) {
  return (
    <div className="rounded-input border border-hairline px-3.5 py-3">
      <p className="t-label">{etiqueta}</p>
      <p className="mt-0.5 font-display text-[22px] font-semibold leading-tight text-ink tabular-nums">
        {valor}
      </p>
      {ayuda && <p className="t-helper">{ayuda}</p>}
    </div>
  )
}

/* ── Embudo ────────────────────────────────────────────────── */

function Embudo({ etapas }: { etapas: Estadisticas['embudo'] }) {
  if (etapas.every((e) => e.alcanzaron === 0)) {
    return <SinDatos>Todavía no hay recorrido para dibujar.</SinDatos>
  }

  const filas = caidaEmbudo(etapas)
  const arranque = etapas[0]?.alcanzaron ?? 0

  return (
    <>
      <Barras
        tono="rampa"
        maximo={arranque}
        datos={filas.map(({ etapa, pctDelTotal, pctDeLaAnterior }) => ({
          clave: etapa.estado,
          etiqueta: ETIQUETA_ESTADO[etapa.estado],
          valor: etapa.alcanzaron,
          texto: `${numero(etapa.alcanzaron)} · ${pctDelTotal} %`,
          detalle:
            pctDeLaAnterior === null ? (
              money(etapa.monto)
            ) : (
              <span className={cn(pctDeLaAnterior < 60 && 'text-warm-ink')}>
                {pctDeLaAnterior} % de la anterior
              </span>
            ),
        }))}
      />
      <p className="mt-3 t-helper">
        El porcentaje grande es sobre los {numero(arranque)} que arrancaron el circuito.
      </p>
    </>
  )
}

/* ── Columnas de las tablas ────────────────────────────────── */

const COLUMNAS_OS: ColumnaStats<ObraSocialStats>[] = [
  { clave: 'nombre', encabezado: 'Obra social', principal: true, celda: (o) => o.nombre },
  { clave: 'presupuestos', encabezado: 'Presupuestos', numerico: true, celda: (o) => numero(o.presupuestos) },
  {
    clave: 'cobertura',
    encabezado: 'Cubre',
    numerico: true,
    celda: (o) => (o.coberturaPct === null ? '—' : `${numero(o.coberturaPct)} %`),
  },
  { clave: 'ticket', encabezado: 'A cargo promedio', numerico: true, celda: (o) => money(o.ticket) },
  {
    clave: 'tasa',
    encabezado: 'Aceptación',
    numerico: true,
    celda: (o) => (o.tasa === null ? '—' : `${numero(o.tasa)} %`),
  },
  { clave: 'monto', encabezado: 'Total a cargo', numerico: true, celda: (o) => money(o.montoACargo) },
]

const COLUMNAS_PRESTACION: ColumnaStats<PrestacionStats>[] = [
  {
    clave: 'nombre',
    encabezado: 'Prestación',
    principal: true,
    celda: (p) => (
      <>
        {p.nombre}
        {p.codigo && <span className="ml-2 t-helper">{p.codigo}</span>}
      </>
    ),
  },
  { clave: 'veces', encabezado: 'Veces', numerico: true, celda: (p) => numero(p.veces) },
  { clave: 'monto', encabezado: 'Precio promedio', numerico: true, celda: (p) => money(p.montoProm) },
  { clave: 'aCargo', encabezado: 'Total a cargo', numerico: true, celda: (p) => money(p.totalACargo) },
  {
    clave: 'tasa',
    encabezado: 'Aceptación',
    numerico: true,
    celda: (p) => (p.tasa === null ? '—' : `${numero(p.tasa)} %`),
  },
]

const COLUMNAS_PROFESIONAL: ColumnaStats<ProfesionalStats>[] = [
  { clave: 'nombre', encabezado: 'Profesional', principal: true, celda: (p) => p.nombre },
  { clave: 'emitidos', encabezado: 'Emitidos', numerico: true, celda: (p) => numero(p.emitidos) },
  {
    clave: 'tasa',
    encabezado: 'Aceptación',
    numerico: true,
    celda: (p) => (p.tasa === null ? '—' : `${numero(p.tasa)} %`),
  },
  { clave: 'ganado', encabezado: 'Aceptado', numerico: true, celda: (p) => money(p.montoGanado) },
]
