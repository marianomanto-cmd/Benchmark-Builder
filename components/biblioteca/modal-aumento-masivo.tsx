'use client'

import { parseISO, subDays } from 'date-fns'
import { ArrowRight, TriangleAlert } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { aplicarAumentoMasivo } from '@/app/actions/catalogo'
import {
  Banner,
  Button,
  Field,
  Input,
  Monto,
  ResponsiveModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabla,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/components/ui'
import { fechaLarga, isoDate, money, numero, porcentaje } from '@/lib/formato'

import type { CeldaVigente, ColumnaObraSocial, PrestacionGrilla } from './tipos'

type Alcance = 'todos' | 'rubro' | 'obra_social' | 'particular'

const ATAJOS = [10, 15, 20] as const

/** Filas del preview que se dibujan antes de colapsar el resto en un conteo. */
const PREVIEW_MAX = 40

interface FilaPreview {
  clave: string
  prestacion: string
  obra_social: string
  actual: number
  nuevo: number
}

/**
 * Aumento masivo.
 *
 * Nunca se confirma a ciegas: primero se listan las filas afectadas con
 * su monto actual y el que va a quedar. La RPC abre una vigencia nueva
 * por fila dentro de una transacción, así que lo que se ve en el
 * preview es exactamente lo que va a pasar.
 */
export function ModalAumentoMasivo({
  vigentes,
  prestaciones,
  columnas,
  rubros,
  onCerrar,
  onAplicado,
}: {
  vigentes: CeldaVigente[]
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

  const porPrestacion = React.useMemo(
    () => new Map(prestaciones.map((p) => [p.id, p] as const)),
    [prestaciones],
  )
  const nombrePorColumna = React.useMemo(
    () => new Map(columnas.map((c) => [c.id ?? '', c.nombre] as const)),
    [columnas],
  )

  /**
   * Mismos criterios que el `for` de `aumento_masivo()`: sólo vigencias
   * abiertas que además hayan arrancado antes de la fecha nueva. Una
   * que arranca hoy no se puede cerrar ayer.
   */
  const afectadas = React.useMemo<FilaPreview[]>(() => {
    const filas: FilaPreview[] = []

    for (const v of vigentes) {
      if (!(v.vigente_desde < desde)) continue

      if (alcance === 'particular' && v.obra_social_id !== null) continue
      if (alcance === 'obra_social' && v.obra_social_id !== obraSocialId) continue

      const prestacion = porPrestacion.get(v.prestacion_id)
      if (alcance === 'rubro' && (prestacion?.rubro ?? null) !== rubro) continue

      const actual = Math.round(Number(v.monto))
      filas.push({
        clave: v.id,
        prestacion: prestacion?.nombre ?? 'Prestación',
        obra_social: nombrePorColumna.get(v.obra_social_id ?? '') ?? 'Particular',
        actual,
        nuevo: Math.round(actual * (1 + pct / 100)),
      })
    }

    return filas.sort(
      (a, b) =>
        a.prestacion.localeCompare(b.prestacion, 'es') ||
        a.obra_social.localeCompare(b.obra_social, 'es'),
    )
  }, [vigentes, desde, alcance, obraSocialId, rubro, pct, porPrestacion, nombrePorColumna])

  const fueraDeAlcance = React.useMemo(
    () => vigentes.filter((v) => !(v.vigente_desde < desde)).length,
    [vigentes, desde],
  )

  const cierre = React.useMemo(() => {
    try {
      return fechaLarga(subDays(parseISO(desde), 1))
    } catch {
      return 'el día anterior'
    }
  }, [desde])

  // El input date puede quedar vacío si se borra a mano: sin fecha no hay
  // dónde empezar la vigencia nueva.
  const fechaInvalida = !/^\d{4}-\d{2}-\d{2}$/.test(desde)

  function aplicar() {
    setError(null)

    if (pct === 0) {
      setError('Un aumento de 0 % no cambia nada.')
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

  const visibles = afectadas.slice(0, PREVIEW_MAX)
  const resto = afectadas.length - visibles.length

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
            disabled={afectadas.length === 0 || pct === 0 || fechaInvalida}
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
            <SelectTrigger id="aumento-alcance">
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
              <SelectTrigger id="aumento-rubro">
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
              <SelectTrigger id="aumento-os">
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
          <Field label="Aumento" htmlFor="aumento-pct" requerido>
            <div className="flex items-center gap-2">
              <div className="relative w-[110px]">
                <Input
                  id="aumento-pct"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={String(pct)}
                  onChange={(e) => setPct(Number(e.target.value) || 0)}
                  className="pr-8 text-right tabular-nums"
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
            helper={`Las vigencias actuales se cierran el ${cierre}.`}
          >
            <Input
              id="aumento-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="max-w-[200px] tabular-nums"
            />
          </Field>
        </div>

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
              {/* Desktop: tabla con el antes y el después. */}
              <div className="mt-3 hidden overflow-hidden rounded-card border border-hairline md:block">
                <Tabla>
                  <Thead>
                    <tr>
                      <Th className="pl-4">Prestación</Th>
                      <Th>Obra social</Th>
                      <Th numerico>Hoy</Th>
                      <Th numerico className="pr-4">
                        Queda en
                      </Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {visibles.map((f) => (
                      <Tr key={f.clave}>
                        <Td className="pl-4 font-medium text-ink">{f.prestacion}</Td>
                        <Td>{f.obra_social}</Td>
                        <Td numerico>
                          <Monto valor={f.actual} jerarquia="apagado" />
                        </Td>
                        <Td numerico className="pr-4">
                          <Monto valor={f.nuevo} jerarquia="fuerte" />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Tabla>
              </div>

              {/* Mobile: lista, nunca tabla. */}
              <ul className="mt-3 divide-y divide-hairline rounded-card border border-hairline md:hidden">
                {visibles.map((f) => (
                  <li key={f.clave} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block font-sans text-[14px] text-ink">{f.prestacion}</span>
                      <span className="block t-helper">{f.obra_social}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                      <span className="text-[13px] text-faint">{money(f.actual)}</span>
                      <ArrowRight aria-hidden className="size-3 text-faint" />
                      <span className="text-[14px] font-semibold text-ink">{money(f.nuevo)}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {resto > 0 && (
                <p className="mt-2 t-helper">
                  y {numero(resto)} {resto === 1 ? 'arancel más' : 'aranceles más'} con el mismo{' '}
                  {porcentaje(pct)} de aumento.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </ResponsiveModal>
  )
}
