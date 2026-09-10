'use client'

import { parseISO, subDays } from 'date-fns'
import { ArrowRight, CalendarClock, TriangleAlert } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { aplicarAumentoMasivo } from '@/app/actions/catalogo'
import {
  Banner,
  Button,
  Field,
  Input,
  MicroBadge,
  Monto,
  ResponsiveModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { montoConAumento } from '@/lib/calculo'
import { fechaCorta, fechaLarga, isoDate, money, numero, porcentaje } from '@/lib/formato'

import type {
  Arancel,
  ArancelProgramado,
  CeldaVigente,
  ColumnaObraSocial,
  PrestacionGrilla,
} from './tipos'

type Alcance = 'todos' | 'rubro' | 'obra_social' | 'particular'

const ATAJOS = [10, 15, 20] as const

/** Mismos topes que el schema de la server action: se avisa antes de ir. */
const PCT_MIN = -90
const PCT_MAX = 300

interface FilaPreview {
  clave: string
  prestacion: string
  obra_social: string
  actual: number
  nuevo: number
  /**
   * La vigencia abierta arranca más adelante: no es el precio que se
   * cotiza hoy, y el aumento se calcula sobre ella igual que en la RPC.
   */
  desdeFuturo: string | null
}

/**
 * Aumento masivo.
 *
 * Nunca se confirma a ciegas: primero se listan las filas afectadas con
 * su monto actual y el que va a quedar, y se muestra cuánto suman antes
 * y después. La RPC abre una vigencia nueva por fila dentro de una
 * transacción, así que lo que se ve en el preview es exactamente lo que
 * va a pasar.
 *
 * La lista se arma sobre las vigencias **abiertas** (`vigente_hasta is
 * null`), que es el `where` del `for` de `aumento_masivo()`. No sobre
 * las que rigen hoy: cuando hay un aumento programado, la de hoy ya
 * quedó cerrada y la abierta es la futura. Armarlo con las de hoy
 * prometía un monto y la RPC escribía otro.
 */
export function ModalAumentoMasivo({
  vigentes,
  programadas,
  prestaciones,
  columnas,
  rubros,
  onCerrar,
  onAplicado,
}: {
  vigentes: CeldaVigente[]
  programadas: ArancelProgramado[]
  prestaciones: PrestacionGrilla[]
  columnas: ColumnaObraSocial[]
  rubros: string[]
  onCerrar: () => void
  onAplicado: () => void
}) {
  const [alcance, setAlcance] = React.useState<Alcance>('todos')
  const [rubro, setRubro] = React.useState<string>(rubros[0] ?? '')
  const [obraSocialId, setObraSocialId] = React.useState<string>(
    columnas.find((c) => c.id)?.id ?? '',
  )
  const [pct, setPct] = React.useState<number>(10)
  const [desde, setDesde] = React.useState<string>(() => isoDate(new Date()))

  const [error, setError] = React.useState<string | null>(null)
  const [aplicando, iniciar] = React.useTransition()

  const hoy = isoDate()

  const porPrestacion = React.useMemo(
    () => new Map(prestaciones.map((p) => [p.id, p] as const)),
    [prestaciones],
  )
  const nombrePorColumna = React.useMemo(
    () => new Map(columnas.map((c) => [c.id ?? '', c.nombre] as const)),
    [columnas],
  )

  /** Las vigencias abiertas: exactamente las filas que recorre la RPC. */
  const abiertas = React.useMemo<Arancel[]>(
    () => [...vigentes, ...programadas].filter((a) => a.vigente_hasta === null),
    [vigentes, programadas],
  )

  /** ¿Entra en el alcance elegido? Mismo criterio que el `case` de la RPC. */
  const enAlcance = React.useCallback(
    (a: Arancel) => {
      if (alcance === 'particular') return a.obra_social_id === null
      if (alcance === 'obra_social') return a.obra_social_id === obraSocialId
      if (alcance === 'rubro') return (porPrestacion.get(a.prestacion_id)?.rubro ?? null) === rubro
      return true
    },
    [alcance, obraSocialId, rubro, porPrestacion],
  )

  /**
   * Mismos criterios que el `for` de `aumento_masivo()`: sólo vigencias
   * abiertas que además hayan arrancado antes de la fecha nueva. Una
   * que arranca ese día o después no se puede cerrar el día anterior.
   */
  const afectadas = React.useMemo<FilaPreview[]>(() => {
    const filas: FilaPreview[] = []

    for (const a of abiertas) {
      if (!(a.vigente_desde < desde)) continue
      if (!enAlcance(a)) continue

      const prestacion = porPrestacion.get(a.prestacion_id)
      const actual = Number(a.monto)

      filas.push({
        clave: a.id,
        prestacion: prestacion?.nombre ?? 'Prestación',
        obra_social: nombrePorColumna.get(a.obra_social_id ?? '') ?? 'Particular',
        actual: Math.round(actual),
        // Misma cuenta que `aumento_masivo()` en la base: el preview no
        // puede prometer un número y la RPC escribir otro.
        nuevo: montoConAumento(actual, pct),
        desdeFuturo: a.vigente_desde > hoy ? a.vigente_desde : null,
      })
    }

    return filas.sort(
      (a, b) =>
        a.prestacion.localeCompare(b.prestacion, 'es') ||
        a.obra_social.localeCompare(b.obra_social, 'es'),
    )
  }, [abiertas, desde, enAlcance, pct, porPrestacion, nombrePorColumna, hoy])

  /** Total de los aranceles tocados, antes y después. */
  const impacto = React.useMemo(() => {
    let antes = 0
    let despues = 0
    for (const f of afectadas) {
      antes += f.actual
      despues += f.nuevo
    }
    return { antes, despues, delta: despues - antes }
  }, [afectadas])

  /** Cuántas quedan afuera por la fecha, dentro del alcance elegido. */
  const fueraDeAlcance = React.useMemo(
    () => abiertas.filter((a) => enAlcance(a) && !(a.vigente_desde < desde)).length,
    [abiertas, enAlcance, desde],
  )

  const programadasAfectadas = afectadas.filter((f) => f.desdeFuturo !== null).length

  // El input date puede quedar vacío si se borra a mano: sin fecha no hay
  // dónde empezar la vigencia nueva.
  const fechaInvalida = !/^\d{4}-\d{2}-\d{2}$/.test(desde)
  /** Comparación de strings `YYYY-MM-DD`: ordenan igual que las fechas. */
  const esPasada = !fechaInvalida && desde < hoy

  const cierre = fechaInvalida ? 'el día anterior' : fechaLarga(subDays(parseISO(desde), 1))

  const pctFueraDeRango = pct < PCT_MIN || pct > PCT_MAX

  function aplicar() {
    setError(null)

    if (fechaInvalida) {
      setError('Elegí desde cuándo rigen las vigencias nuevas.')
      return
    }
    if (pct === 0) {
      setError('Un aumento de 0 % no cambia nada.')
      return
    }
    if (pctFueraDeRango) {
      setError(`El ajuste tiene que estar entre ${PCT_MIN} % y ${PCT_MAX} %.`)
      return
    }
    if (afectadas.length === 0) {
      setError('Con este alcance no hay ningún arancel para actualizar.')
      return
    }

    iniciar(async () => {
      const resultado = await aplicarAumentoMasivo({
        rubro: alcance === 'rubro' ? rubro : null,
        obra_social_id: alcance === 'obra_social' ? obraSocialId : null,
        solo_particular: alcance === 'particular',
        pct,
        desde,
      })

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      toast.success(
        resultado.data === 1
          ? 'Se abrió 1 vigencia nueva.'
          : `Se abrieron ${numero(resultado.data)} vigencias nuevas.`,
      )
      onAplicado()
      onCerrar()
    })
  }

  return (
    <ResponsiveModal
      open
      onOpenChange={(v) => {
        if (!v && !aplicando) onCerrar()
      }}
      titulo="Aumento masivo"
      descripcion="Abre una vigencia nueva por arancel, todas en la misma transacción."
      ancho="lg"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            size="touch"
            className="sm:h-[34px]"
            disabled={aplicando}
            onClick={onCerrar}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="touch"
            className="sm:h-[34px]"
            loading={aplicando}
            disabled={afectadas.length === 0 || pct === 0 || pctFueraDeRango || fechaInvalida}
            onClick={aplicar}
          >
            Aplicar a {numero(afectadas.length)}{' '}
            {afectadas.length === 1 ? 'arancel' : 'aranceles'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <Banner tono="warm" icono={<TriangleAlert className="size-4" />} titulo="No se aplicó">
            {error}
          </Banner>
        )}

        <Field label="Alcance" htmlFor="aumento-alcance">
          <Select value={alcance} onValueChange={(v) => setAlcance(v as Alcance)}>
            <SelectTrigger id="aumento-alcance" className="h-11 sm:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los aranceles vigentes</SelectItem>
              <SelectItem value="rubro" disabled={rubros.length === 0}>
                Por rubro
              </SelectItem>
              <SelectItem value="obra_social" disabled={!columnas.some((c) => c.id)}>
                Por obra social
              </SelectItem>
              <SelectItem value="particular">Sólo el valor particular</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {alcance === 'rubro' && (
          <Field label="Rubro" htmlFor="aumento-rubro">
            <Select value={rubro} onValueChange={setRubro}>
              <SelectTrigger id="aumento-rubro" className="h-11 sm:h-9">
                <SelectValue placeholder="Elegí un rubro" />
              </SelectTrigger>
              <SelectContent>
                {rubros.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {alcance === 'obra_social' && (
          <Field label="Obra social" htmlFor="aumento-os">
            <Select value={obraSocialId} onValueChange={setObraSocialId}>
              <SelectTrigger id="aumento-os" className="h-11 sm:h-9">
                <SelectValue placeholder="Elegí una obra social" />
              </SelectTrigger>
              <SelectContent>
                {columnas
                  .filter((c) => c.id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id as string}>
                      {c.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Aumento"
            htmlFor="aumento-pct"
            requerido
            error={pctFueraDeRango ? `Tiene que estar entre ${PCT_MIN} % y ${PCT_MAX} %.` : null}
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-[110px]">
                <Input
                  id="aumento-pct"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={PCT_MIN}
                  max={PCT_MAX}
                  value={String(pct)}
                  /*
                    Dos decimales, que es la precisión con la que el
                    resumen lo muestra («12,35 %») y con la que la base
                    lo aplica. Sin este corte se podía tipear 12,345:
                    la pantalla decía 12,35 %, el preview calculaba con
                    12,345 y la base escribía otro número — un peso de
                    diferencia por arancel, en una operación que toca
                    veinte de una.
                  */
                  onChange={(e) => setPct(Math.round((Number(e.target.value) || 0) * 100) / 100)}
                  invalido={pctFueraDeRango}
                  className="h-11 pr-8 text-right tabular-nums sm:h-9"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-faint"
                >
                  %
                </span>
              </div>
              {ATAJOS.map((a) => (
                <Button
                  key={a}
                  type="button"
                  variant={pct === a ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPct(a)}
                >
                  +{a} %
                </Button>
              ))}
            </div>
          </Field>

          <Field
            label="Rige desde"
            htmlFor="aumento-desde"
            requerido
            error={fechaInvalida ? 'Elegí una fecha.' : null}
            helper={`Las vigencias actuales se cierran el ${cierre}.`}
          >
            <Input
              id="aumento-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              invalido={fechaInvalida}
              className="h-11 max-w-[200px] tabular-nums sm:h-9"
            />
          </Field>
        </div>

        {/*
          Una fecha pasada reescribe el historial de precios hacia atrás:
          cierra vigencias que SÍ estuvieron rigiendo. Puede ser
          legítimo —el aumento se decidió el 1° y se carga el 10— así que
          no se prohíbe, pero tampoco se hace en silencio: es la única
          operación de la biblioteca que toca lo ya ocurrido. La base
          además rechaza el caso que rompe un documento (cerrar antes de
          un presupuesto emitido que cita ese arancel).
        */}
        {esPasada && !fechaInvalida && (
          <Banner
            tono="warm"
            icono={<CalendarClock className="size-5" aria-hidden />}
            titulo="Esa fecha ya pasó"
          >
            Las vigencias actuales van a quedar cerradas el {cierre}, o sea hacia atrás. Los
            presupuestos ya emitidos no cambian —llevan el precio copiado—, pero el historial
            va a decir que el precio viejo dejó de regir antes de hoy. Si alguno de estos
            aranceles se citó en un presupuesto emitido después de esa fecha, el aumento se
            rechaza entero.
          </Banner>
        )}

        {fueraDeAlcance > 0 && (
          <p className="t-helper">
            {fueraDeAlcance === 1
              ? 'Hay 1 arancel que empieza a regir ese día o después: no entra en el aumento, porque su vigencia no se puede cerrar antes de haber empezado.'
              : `Hay ${numero(fueraDeAlcance)} aranceles que empiezan a regir ese día o después: no entran en el aumento, porque su vigencia no se puede cerrar antes de haber empezado.`}
          </p>
        )}

        <section>
          <h3 className="t-label">
            Qué se va a actualizar · {numero(afectadas.length)}{' '}
            {afectadas.length === 1 ? 'arancel' : 'aranceles'}
          </h3>

          {afectadas.length === 0 ? (
            <p className="mt-2 t-helper">
              Con este alcance y esta fecha no queda ningún arancel para actualizar.
            </p>
          ) : (
            <>
              {/* El total del impacto, arriba de la lista: es la pregunta
                  que se hace antes de mirar fila por fila. */}
              <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-card border border-hairline bg-tint/60 p-4">
                <span className="t-helper">
                  Hoy suman <Monto valor={impacto.antes} jerarquia="normal" className="text-[13px]" />
                </span>
                <span className="font-sans text-[14px] text-body">
                  Van a sumar <Monto valor={impacto.despues} jerarquia="fuerte" />
                </span>
                <span
                  className={
                    impacto.delta >= 0
                      ? 'font-sans text-[13px] tabular-nums text-primary'
                      : 'font-sans text-[13px] tabular-nums text-warm-ink'
                  }
                >
                  {impacto.delta >= 0 ? '+' : '−'}
                  {money(Math.abs(impacto.delta))} ({porcentaje(Math.abs(pct))})
                </span>
              </div>

              {programadasAfectadas > 0 && (
                <p className="mt-2 flex items-start gap-1.5 t-helper text-warm-ink">
                  <CalendarClock aria-hidden className="mt-[2px] size-3.5 shrink-0" />
                  {programadasAfectadas === 1
                    ? 'En 1 de estas celdas el aumento se aplica sobre una vigencia que todavía no arrancó: es la que está abierta, así que es la que se cierra.'
                    : `En ${numero(programadasAfectadas)} de estas celdas el aumento se aplica sobre una vigencia que todavía no arrancó: es la que está abierta, así que es la que se cierra.`}
                </p>
              )}

              {/* Desktop: tabla con el antes y el después. Entran todas:
                  «aplicar a 187 aranceles» sin poder mirar los 187 es
                  pedir una firma en blanco. */}
              <div className="mt-3 hidden max-h-[320px] overflow-y-auto overscroll-contain rounded-card border border-hairline md:block">
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="sticky top-0 z-10 border-b border-hairline bg-card px-4 py-2.5 t-label"
                      >
                        Prestación
                      </th>
                      <th
                        scope="col"
                        className="sticky top-0 z-10 border-b border-hairline bg-card px-3 py-2.5 t-label"
                      >
                        Obra social
                      </th>
                      <th
                        scope="col"
                        className="sticky top-0 z-10 border-b border-hairline bg-card px-3 py-2.5 text-right t-label"
                      >
                        Hoy
                      </th>
                      <th
                        scope="col"
                        className="sticky top-0 z-10 border-b border-hairline bg-card px-4 py-2.5 text-right t-label"
                      >
                        Queda en
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {afectadas.map((f) => (
                      <tr key={f.clave} className="row-hover">
                        <td className="border-b border-hairline px-4 py-2.5 font-sans text-[14px] font-medium text-ink">
                          {f.prestacion}
                        </td>
                        <td className="border-b border-hairline px-3 py-2.5 text-[14px] text-body">
                          <span className="flex items-center gap-2">
                            {f.obra_social}
                            {f.desdeFuturo && (
                              <MicroBadge tono="warm">
                                desde {fechaCorta(f.desdeFuturo)}
                              </MicroBadge>
                            )}
                          </span>
                        </td>
                        <td className="border-b border-hairline px-3 py-2.5 text-right">
                          <Monto valor={f.actual} jerarquia="apagado" />
                        </td>
                        <td className="border-b border-hairline px-4 py-2.5 text-right">
                          <Monto valor={f.nuevo} jerarquia="fuerte" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: lista, nunca tabla. */}
              <ul className="mt-3 max-h-[280px] divide-y divide-hairline overflow-y-auto overscroll-contain rounded-card border border-hairline md:hidden">
                {afectadas.map((f) => (
                  <li key={f.clave} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block font-sans text-[14px] text-ink">{f.prestacion}</span>
                      <span className="block t-helper">
                        {f.obra_social}
                        {f.desdeFuturo && ` · desde ${fechaCorta(f.desdeFuturo)}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                      <span className="text-[13px] text-faint">{money(f.actual)}</span>
                      <ArrowRight aria-hidden className="size-3 text-faint" />
                      <span className="text-[14px] font-semibold text-ink">{money(f.nuevo)}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-2 t-helper">
                Cada fila abre una vigencia nueva y cierra la que estaba. Los presupuestos ya
                emitidos con estos aranceles no cambian.
              </p>
            </>
          )}
        </section>
      </div>
    </ResponsiveModal>
  )
}
