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
  fallos = {},
}: {
  datos: Estadisticas
  rango: ClaveRango
  desde: string
  hasta: string
  fallo: boolean
  /** Qué lectura no volvió, por nombre. Ver `cargar()` en la página. */
  fallos?: Record<string, boolean>
}) {
  const { resumen, embudo, tiempos, meses, motivos, obrasSociales, prestaciones, profesionales, recurrencia, aging } = datos

  /**
   * «Hay algo que mostrar» se decide sobre TODAS las lecturas, no sobre
   * `resumen`.
   *
   * Antes todo el cuerpo estaba detrás de `resumen.emitidos > 0`: si esa
   * única lectura fallaba, la página la reemplazaba por ceros y las
   * nueve secciones que sí habían llegado no se dibujaban, con el
   * banner de arriba diciendo «lo que se ve es lo que sí llegó» sobre
   * una pantalla vacía.
   */
  const hayDatos =
    resumen.emitidos > 0 ||
    embudo.some((e) => e.alcanzaron > 0) ||
    meses.some((m) => m.emitidos > 0) ||
    obrasSociales.length > 0 ||
    prestaciones.length > 0 ||
    profesionales.length > 0

  /** Lo abierto no depende de la ventana: es la foto de hoy. */
  const hayAbiertos = aging.some((t) => t.casos > 0)

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

      {/* Fuera del portón: no depende de la ventana elegida, y es el
          único bloque de la pantalla accionable hoy a la mañana. */}
      {!hayDatos && hayAbiertos && <BloqueAging aging={aging} fallo={fallos.aging} />}

      {!hayDatos ? (
        <SinDatos>
          {fallo
            ? 'No se pudieron leer los números. Recargá para reintentar.'
            : 'No hay presupuestos emitidos en esta ventana. Probá con un rango más largo.'}
        </SinDatos>
      ) : (
        <>
          <Resumen datos={datos} />

          <Bloque
            titulo="Dónde se cae la venta"
            pregunta="De todos los que se emitieron, cuántos llegaron a cada etapa. No es la foto de hoy: es por dónde pasó cada uno."
          >
            <Embudo etapas={embudo} emitidos={resumen.emitidos} />
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
                <SinDatos>
                  {fallos.tiempos
                    ? 'No se pudo leer este bloque. Recargá para reintentar.'
                    : 'Todavía no hay ningún paso completo para medir.'}
                </SinDatos>
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
                  {fallos.motivos
                    ? 'No se pudo leer este bloque. Recargá para reintentar.'
                    : 'Todavía no se perdió ninguno con motivo cargado. Buena noticia.'}
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

          <BloqueAging aging={aging} fallo={fallos.aging} />

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
                  // `numero()` redondea, y 1,33 se mostraba como «1»
                  // —justo el valor que significa «nadie volvió»—
                  // al lado de «Volvieron 33 %». Es el único dato de la
                  // pantalla donde los decimales dicen algo.
                  valor={recurrencia.promPorPaciente.toLocaleString('es-AR', {
                    maximumFractionDigits: 2,
                  })}
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
    <section
      aria-label="Resumen"
      /* Una sola columna abajo de 360px. En dos, la tarjeta mide 138 y
         le quedan 106 para el número: «$ 12.345.678» necesita 139 y se
         salía por la derecha, arrastrando a la página entera. Achicar
         más la tipografía no alcanzaba —a 16px un monto de ocho cifras
         sigue sin entrar— y un monto ilegible tampoco sirve. Apilado
         hay 288px de ancho y entra cualquier cifra que el consultorio
         pueda facturar. */
      className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 lg:grid-cols-4"
    >
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
      {/*
        «Esperando respuesta» y no «En juego»: acá se cuenta lo que
        todavía no se decidió —ni ganado ni perdido—, que es MENOS que
        lo que el tablero llama «en juego», donde un tratamiento
        aceptado o iniciado sigue contando. Dos números distintos con la
        misma etiqueta se leen como una contradicción; con la etiqueta
        que le corresponde a cada uno, son dos preguntas distintas.
      */}
      <Tarjeta
        etiqueta="Esperando respuesta"
        valor={money(resumen.montoEnJuego)}
        ayuda={`${numero(resumen.enJuego)} sin decisión del paciente`}
      />
    </section>
  )
}

function Tarjeta({ etiqueta, valor, ayuda }: { etiqueta: string; valor: string; ayuda: string }) {
  return (
    <article className="flex flex-col gap-1 rounded-card border border-hairline bg-card p-4 shadow-rest sm:p-5">
      <p className="t-label">{etiqueta}</p>
      {/* Esta escala vivía acá suelta porque `t-hero-num` era 34px
          fijos y «$ 4.528.600» medía ~180 en una tarjeta de 170. Ahora
          el token escala solo —y arranca más chico todavía—, así que el
          número héroe de Estadísticas y el de la Home vuelven a ser el
          mismo y se define en un solo lugar. */}
      <p className="t-hero-num">{valor}</p>
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

/* ── A quién llamar hoy ────────────────────────────────────── */

function BloqueAging({
  aging,
  fallo,
}: {
  aging: Estadisticas['aging']
  fallo?: boolean
}) {
  return (
    <Bloque
      titulo="A quién llamar hoy"
      pregunta="Hace cuánto que no se mueve cada presupuesto que sigue en juego. No depende del rango: es la foto de hoy."
    >
      {aging.every((t) => t.casos === 0) ? (
        <SinDatos>
          {fallo
            ? 'No se pudo leer este bloque. Recargá para reintentar.'
            : 'No hay ningún presupuesto esperando respuesta.'}
        </SinDatos>
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
  )
}

/* ── Embudo ────────────────────────────────────────────────── */

function Embudo({
  etapas,
  emitidos,
}: {
  etapas: Estadisticas['embudo']
  /** El universo: TODO lo emitido en la ventana. Ver `caidaEmbudo`. */
  emitidos: number
}) {
  if (etapas.every((e) => e.alcanzaron === 0)) {
    return <SinDatos>Todavía no hay recorrido para dibujar.</SinDatos>
  }

  const filas = caidaEmbudo(etapas, emitidos)
  // El techo del eje es el mayor de lo que hay que dibujar, no la
  // primera etapa: si una etapa supera a la primera —pasa cuando el
  // presupuesto nace en «enviado»— la barra se recortaba al 100 % y dos
  // valores distintos se veían iguales.
  const techo = Math.max(emitidos, ...etapas.map((e) => e.alcanzaron), 1)

  return (
    <>
      <Barras
        tono="rampa"
        maximo={techo}
        datos={filas.map(({ etapa, pctDelTotal, pctDeLaAnterior }) => ({
          clave: etapa.estado,
          etiqueta: ETIQUETA_ESTADO[etapa.estado],
          valor: etapa.alcanzaron,
          texto:
            pctDelTotal === null
              ? numero(etapa.alcanzaron)
              : `${numero(etapa.alcanzaron)} · ${pctDelTotal} %`,
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
        El porcentaje grande es sobre los {numero(emitidos)} presupuestos emitidos en esta
        ventana.
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
