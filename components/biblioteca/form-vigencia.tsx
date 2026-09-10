'use client'

import { addDays, isAfter, parseISO, subDays } from 'date-fns'
import { ArrowRight, CalendarClock, TriangleAlert } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { crearVigencia } from '@/app/actions/catalogo'
import {
  Banner,
  Button,
  Field,
  Input,
  InputMonto,
  Monto,
  ResponsiveModal,
  Segmented,
} from '@/components/ui'
import { calcularItem, montoConAumento } from '@/lib/calculo'
import { fechaCorta, fechaLarga, isoDate, money, numero } from '@/lib/formato'
import type { CoberturaTipo } from '@/lib/types'

import { ETIQUETA_TIPO_COBERTURA, type Celda } from './tipos'

/** Los tres aumentos que el consultorio aplica de verdad. */
const ATAJOS = [10, 15, 20] as const

const OPCIONES_TIPO: { value: CoberturaTipo; label: string }[] = [
  { value: 'porcentaje', label: ETIQUETA_TIPO_COBERTURA.porcentaje },
  { value: 'monto', label: ETIQUETA_TIPO_COBERTURA.monto },
  { value: 'ninguna', label: ETIQUETA_TIPO_COBERTURA.ninguna },
]

/**
 * Form de vigencia nueva.
 *
 * El bloque «Qué va a pasar» es el corazón de la pantalla: enumera las
 * tres consecuencias antes de guardar. Eso es lo que hace que «no se
 * puede editar» se lea como coherencia y no como limitación — el
 * usuario ve que el presupuesto viejo queda intacto a propósito.
 *
 * Todo lo que se cierra, se valida y se ofrece como atajo sale de la
 * vigencia **abierta**, que no siempre es la que se cotiza hoy: si hay
 * un aumento programado, la de hoy ya quedó cerrada y la abierta es la
 * futura. `nueva_vigencia()` compara contra ésa, así que mirando la de
 * hoy el form dejaba elegir una fecha que la base después rechazaba con
 * un error crudo.
 */
export function FormVigencia({
  celda,
  onCerrar,
  onGuardado,
}: {
  celda: Celda
  onCerrar: () => void
  onGuardado: () => void
}) {
  // La que se va a cerrar. Puede ser una programada que todavía no rige.
  const actual = celda.abierta
  // La que se cotiza hoy: sólo se usa para explicar el contexto.
  const hoyRige = celda.vigente
  const abiertaEsFutura = actual !== null && actual.id !== hoyRige?.id

  const [monto, setMonto] = React.useState<number>(actual ? Math.round(actual.monto) : 0)
  const [tipo, setTipo] = React.useState<CoberturaTipo>(
    actual ? actual.cobertura_tipo : celda.obra_social_id ? 'porcentaje' : 'ninguna',
  )
  const [valor, setValor] = React.useState<number>(actual ? Number(actual.cobertura_valor) : 0)
  const [desde, setDesde] = React.useState<string>(() => primeraFechaValida(actual?.vigente_desde))

  const [error, setError] = React.useState<string | null>(null)
  const [guardando, iniciar] = React.useTransition()

  const { cobertura, aCargo } = calcularItem(monto, tipo, valor)

  // Una vigencia nueva no puede arrancar el mismo día que la abierta:
  // el cierre de la anterior quedaría un día antes de su propio inicio.
  const minimo = actual ? isoDate(addDays(parseISO(actual.vigente_desde), 1)) : undefined
  const fechaVacia = !ES_FECHA.test(desde)
  const fechaTemprana = !fechaVacia && minimo !== undefined && desde < minimo
  const fechaInvalida = fechaVacia || fechaTemprana

  function guardar() {
    setError(null)

    if (monto <= 0) {
      setError('Cargá el monto del arancel: sin monto no hay nada que cotizar.')
      return
    }
    if (tipo === 'porcentaje' && valor > 100) {
      setError('Una cobertura por porcentaje no puede pasar de 100 %.')
      return
    }
    if (fechaVacia) {
      setError('Elegí desde cuándo rige la vigencia nueva.')
      return
    }
    if (fechaTemprana && actual) {
      setError(
        abiertaEsFutura
          ? `La vigencia nueva tiene que arrancar después del ${fechaLarga(
              actual.vigente_desde,
            )}: es la fecha desde la que ya hay una vigencia cargada.`
          : `La vigencia nueva tiene que arrancar después del ${fechaLarga(
              actual.vigente_desde,
            )}, que es cuando empezó la actual.`,
      )
      return
    }

    iniciar(async () => {
      const resultado = await crearVigencia({
        prestacion_id: celda.prestacion_id,
        obra_social_id: celda.obra_social_id,
        monto,
        cobertura_tipo: tipo,
        cobertura_valor: tipo === 'ninguna' ? 0 : valor,
        desde,
      })

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      toast.success(
        actual
          ? `Vigencia nueva desde el ${fechaLarga(desde)}. La anterior quedó cerrada.`
          : `Arancel cargado, vigente desde el ${fechaLarga(desde)}.`,
      )
      onGuardado()
      onCerrar()
    })
  }

  return (
    <ResponsiveModal
      open
      onOpenChange={(v) => {
        if (!v && !guardando) onCerrar()
      }}
      titulo={actual ? 'Nueva vigencia' : 'Cargar arancel'}
      descripcion={`${celda.prestacion} · ${celda.obra_social}`}
      ancho="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            size="touch"
            className="sm:h-[34px]"
            disabled={guardando}
            onClick={onCerrar}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-vigencia"
            variant="primary"
            size="touch"
            className="sm:h-[34px]"
            loading={guardando}
          >
            {actual ? 'Abrir vigencia nueva' : 'Cargar arancel'}
          </Button>
        </>
      }
    >
      <form
        id="form-vigencia"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          guardar()
        }}
        className="space-y-5"
      >
        {error && (
          <Banner tono="warm" icono={<TriangleAlert className="size-4" />} titulo="No se guardó">
            {error}
          </Banner>
        )}

        <Field
          label="Monto del arancel"
          requerido
          htmlFor="vigencia-monto"
          helper={
            abiertaEsFutura && actual
              ? hoyRige
                ? `Hoy se cotiza ${money(hoyRige.monto)} y desde el ${fechaCorta(
                    actual.vigente_desde,
                  )} pasa a ${money(actual.monto)}.`
                : `Todavía no se cotiza: el arancel cargado arranca el ${fechaCorta(
                    actual.vigente_desde,
                  )} en ${money(actual.monto)}.`
              : actual
                ? `Hoy está en ${money(actual.monto)}.`
                : 'Es el valor de lista de la prestación, antes de la cobertura.'
          }
        >
          <InputMonto id="vigencia-monto" value={monto} onChange={setMonto} autoFocus />
        </Field>

        {actual && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-label">Aumentar</span>
            {ATAJOS.map((pct) => {
              // Misma cuenta que el aumento masivo y que la RPC.
              const nuevo = montoConAumento(actual.monto, pct)
              return (
                <Button
                  key={pct}
                  type="button"
                  variant={monto === nuevo ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setMonto(nuevo)}
                >
                  +{pct} % · {money(nuevo)}
                </Button>
              )
            })}
          </div>
        )}

        <Field label="Cobertura" htmlFor="vigencia-tipo">
          <Segmented
            value={tipo}
            onChange={(v) => setTipo(v)}
            opciones={OPCIONES_TIPO}
            className="w-full justify-between sm:w-auto sm:justify-start"
          />
        </Field>

        {tipo === 'porcentaje' && (
          <Field
            label="Porcentaje que cubre"
            htmlFor="vigencia-valor-pct"
            helper="Entre 0 y 100."
          >
            <div className="relative max-w-[160px]">
              <Input
                id="vigencia-valor-pct"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={String(valor)}
                onChange={(e) => setValor(Number(e.target.value) || 0)}
                className="pr-8 text-right tabular-nums"
                invalido={valor > 100}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-faint"
              >
                %
              </span>
            </div>
          </Field>
        )}

        {tipo === 'monto' && (
          <Field
            label="Monto fijo que cubre"
            htmlFor="vigencia-valor-monto"
            helper="Si supera al arancel, el paciente no paga nada: nunca queda en negativo."
          >
            <div className="max-w-[200px]">
              <InputMonto id="vigencia-valor-monto" value={valor} onChange={setValor} />
            </div>
          </Field>
        )}

        <Field
          label="Rige desde"
          requerido
          htmlFor="vigencia-desde"
          error={
            fechaVacia
              ? 'Elegí una fecha.'
              : fechaTemprana && actual
                ? `Tiene que ser posterior al ${fechaLarga(actual.vigente_desde)}.`
                : null
          }
          helper={
            !actual
              ? 'Desde cuándo se puede cotizar con este arancel.'
              : abiertaEsFutura
                ? `La vigencia cargada para el ${fechaCorta(
                    actual.vigente_desde,
                  )} se cierra el día anterior a esta fecha.`
                : 'La vigencia actual se cierra el día anterior a esta fecha.'
          }
        >
          <Input
            id="vigencia-desde"
            type="date"
            min={minimo}
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            invalido={fechaInvalida}
            className="max-w-[200px] tabular-nums"
          />
        </Field>

        {/* Resultado del cálculo, con la misma función que usa el wizard. */}
        <div className="rounded-card border border-hairline bg-tint/60 p-4">
          <p className="t-label">Con este arancel</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="t-helper">
              Cubre <Monto valor={cobertura} jerarquia="normal" className="text-[13px]" />
            </span>
            <span className="font-sans text-[14px] text-body">
              Queda a cargo <Monto valor={aCargo} jerarquia="fuerte" />
            </span>
          </div>
        </div>

        <QueVaAPasar
          desde={desde}
          desdeActual={actual?.vigente_desde ?? null}
          esFutura={abiertaEsFutura}
          usos={hoyRige?.usos ?? 0}
          montoActual={actual?.monto ?? null}
          montoNuevo={monto}
        />
      </form>
    </ResponsiveModal>
  )
}

/**
 * Las tres consecuencias, enumeradas antes de guardar. No es un aviso
 * de error: es la explicación de por qué el modelo append-only es lo
 * que protege al presupuesto que ya se le mostró al paciente.
 */
function QueVaAPasar({
  desde,
  desdeActual,
  esFutura,
  usos,
  montoActual,
  montoNuevo,
}: {
  desde: string
  /** Desde cuándo rige la vigencia abierta, la que se va a cerrar. */
  desdeActual: string | null
  /** La abierta todavía no arrancó: es un aumento programado. */
  esFutura: boolean
  usos: number
  montoActual: number | null
  montoNuevo: number
}) {
  const cierre = ES_FECHA.test(desde)
    ? fechaLarga(subDays(parseISO(desde), 1))
    : 'el día anterior a la fecha que elijas'

  return (
    <div className="rounded-card border border-primary/20 bg-tint p-4">
      <p className="t-label">Qué va a pasar</p>
      <ol className="mt-2 space-y-2 text-[13px] leading-relaxed text-body">
        {desdeActual ? (
          <li className="flex gap-2">
            <span aria-hidden className="text-primary">
              1.
            </span>
            <span>
              Se cierra la vigencia actual el {cierre}.
              {esFutura && (
                <span className="mt-1 flex items-start gap-1.5 text-warm-ink">
                  <CalendarClock aria-hidden className="mt-[2px] size-3.5 shrink-0" />
                  <span>
                    Ojo: la que se cierra es la que cargaste para el{' '}
                    {fechaCorta(desdeActual)} y todavía no arrancó. Va a regir sólo hasta el{' '}
                    {cierre}.
                  </span>
                </span>
              )}
            </span>
          </li>
        ) : (
          <li className="flex gap-2">
            <span aria-hidden className="text-primary">
              1.
            </span>
            <span>
              No había arancel cargado para esta combinación: esta es la primera vigencia.
            </span>
          </li>
        )}

        <li className="flex gap-2">
          <span aria-hidden className="text-primary">
            2.
          </span>
          <span>
            La nueva rige desde el {fechaSegura(desde, 'día que elijas arriba')}
            {montoActual !== null && montoNuevo > 0 && (
              <>
                {' '}
                <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums text-muted">
                  ({money(montoActual)} <ArrowRight aria-hidden className="size-3" />{' '}
                  {money(montoNuevo)})
                </span>
              </>
            )}
            .
            {/* Lo que más se malinterpreta de un aumento cargado con
                fecha: hasta que llega, el wizard sigue cotizando lo
                viejo. Decirlo evita cargarlo dos veces. */}
            {ES_FECHA.test(desde) && montoActual !== null && (
              <span className="block t-helper">
                {desde > isoDate()
                  ? `Hasta esa fecha el wizard sigue cotizando ${money(montoActual)}.`
                  : 'Desde el próximo presupuesto se cotiza con este arancel.'}
              </span>
            )}
          </span>
        </li>

        <li className="flex gap-2">
          <span aria-hidden className="text-primary">
            3.
          </span>
          <span>
            {usos > 0
              ? `Los ${numero(usos)} presupuestos ya emitidos con este arancel no cambian.`
              : 'Todavía no hay presupuestos emitidos con este arancel, pero el historial de precios queda entero igual.'}
          </span>
        </li>
      </ol>
    </div>
  )
}

/**
 * Valor inicial del campo: hoy, salvo que la vigencia abierta haya
 * arrancado hoy o en el futuro — en ese caso, el día siguiente al suyo.
 */
function primeraFechaValida(vigenteDesde: string | undefined): string {
  const hoy = new Date()
  if (!vigenteDesde) return isoDate(hoy)
  const siguiente = addDays(parseISO(vigenteDesde), 1)
  return isAfter(siguiente, hoy) ? isoDate(siguiente) : isoDate(hoy)
}

/** El input date siempre entrega `YYYY-MM-DD`, o vacío si se borra. */
const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Formatea sin romper cuando el campo quedó vacío a mitad de tipeo. */
function fechaSegura(iso: string, alternativa: string): string {
  return ES_FECHA.test(iso) ? fechaLarga(iso) : alternativa
}
