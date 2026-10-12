'use client'

import { parseISO, subDays, addDays } from 'date-fns'
import { ArrowRight, TrendingUp, TriangleAlert } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { corregirArancel } from '@/app/actions/catalogo'
import {
  Banner,
  Button,
  Field,
  Input,
  InputMonto,
  Monto,
  ResponsiveModal,
  Segmented,
  Textarea,
} from '@/components/ui'
import { calcularItem } from '@/lib/calculo'
import { fechaCorta, fechaLarga, isoDate, money, numero } from '@/lib/formato'
import type { CoberturaTipo } from '@/lib/types'

import {
  ETIQUETA_TIPO_COBERTURA,
  etiquetaCobertura,
  vigenciaAnterior,
  type VigenciaCelda,
} from './tipos'

const OPCIONES_TIPO: { value: CoberturaTipo; label: string }[] = [
  { value: 'porcentaje', label: ETIQUETA_TIPO_COBERTURA.porcentaje },
  { value: 'monto', label: ETIQUETA_TIPO_COBERTURA.monto },
  { value: 'ninguna', label: ETIQUETA_TIPO_COBERTURA.ninguna },
]

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Corregir un arancel mal cargado.
 *
 * No es un aumento: un aumento es una vigencia nueva, que deja el precio
 * de antes en el historial. Esto reescribe la vigencia en el lugar —con
 * el antes y el después en el registro de cambios— y por eso arranca
 * ofreciendo el otro camino cuando la vigencia es la abierta.
 *
 * Los presupuestos emitidos no cambian: cada uno tiene su copia. El
 * motivo es obligatorio cuando el arancel ya se usó, que es cuando
 * alguien va a tener que explicar por qué el documento dice otro número.
 */
export function FormCorreccion({
  prestacion,
  obraSocial,
  vigencia,
  vigencias,
  onCerrar,
  onGuardado,
  onVigenciaNueva,
}: {
  prestacion: string
  obraSocial: string
  vigencia: VigenciaCelda
  /** Todas las vigencias de la celda: para saber quién es la vecina. */
  vigencias: VigenciaCelda[]
  onCerrar: () => void
  onGuardado: () => void
  /** Cambiar de idea: no es un error, es un aumento. */
  onVigenciaNueva: () => void
}) {
  const [monto, setMonto] = React.useState<number>(Math.round(vigencia.monto))
  const [tipo, setTipo] = React.useState<CoberturaTipo>(vigencia.cobertura_tipo)
  const [valor, setValor] = React.useState<number>(Number(vigencia.cobertura_valor))
  const [desde, setDesde] = React.useState<string>(vigencia.vigente_desde)
  const [motivo, setMotivo] = React.useState('')

  const [error, setError] = React.useState<string | null>(null)
  const [guardando, iniciar] = React.useTransition()

  const anterior = vigenciaAnterior(vigencias, vigencia)
  const usada = vigencia.usos > 0
  const esAbierta = vigencia.vigente_hasta === null

  // Los límites del «desde»: no antes de que arranque la anterior (se
  // quedaría sin días) y no después de que termine ésta.
  const minimo = anterior ? isoDate(addDays(parseISO(anterior.vigente_desde), 1)) : undefined
  const maximo = vigencia.vigente_hasta ?? undefined

  const fechaVacia = !ES_FECHA.test(desde)
  const fechaFuera =
    !fechaVacia &&
    ((minimo !== undefined && desde < minimo) || (maximo !== undefined && desde > maximo))

  const valorEfectivo = tipo === 'ninguna' ? 0 : valor
  const cambiaMonto = monto !== Math.round(vigencia.monto)
  const cambiaCobertura =
    tipo !== vigencia.cobertura_tipo ||
    valorEfectivo !== (vigencia.cobertura_tipo === 'ninguna' ? 0 : Number(vigencia.cobertura_valor))
  const cambiaDesde = desde !== vigencia.vigente_desde
  const hayCambios = cambiaMonto || cambiaCobertura || cambiaDesde

  const { cobertura, aCargo } = calcularItem(monto, tipo, valorEfectivo)

  function guardar() {
    setError(null)

    if (!hayCambios) {
      setError('No cambiaste nada todavía.')
      return
    }
    if (monto <= 0) {
      setError('Cargá el monto del arancel: sin monto no hay nada que cotizar.')
      return
    }
    if (tipo === 'porcentaje' && valor > 100) {
      setError('Una cobertura por porcentaje no puede pasar de 100 %.')
      return
    }
    if (fechaVacia) {
      setError('Elegí desde cuándo rige.')
      return
    }
    if (fechaFuera) {
      setError(
        minimo !== undefined && desde < minimo && anterior
          ? `No puede arrancar antes del ${fechaLarga(minimo)}: la vigencia anterior arranca el ${fechaLarga(anterior.vigente_desde)}. Si la querés reemplazar, borrala primero.`
          : `No puede arrancar después del ${fechaLarga(maximo!)}, que es cuando termina.`,
      )
      return
    }
    if (usada && motivo.trim() === '') {
      setError('Este arancel ya se usó en presupuestos: contá en una línea por qué lo corregís.')
      return
    }

    iniciar(async () => {
      const resultado = await corregirArancel({
        id: vigencia.id,
        monto,
        cobertura_tipo: tipo,
        cobertura_valor: valorEfectivo,
        desde,
        motivo: motivo.trim() || null,
      })

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      toast.success('Arancel corregido. El cambio quedó en el registro.')
      onGuardado()
    })
  }

  return (
    <ResponsiveModal
      open
      onOpenChange={(v) => {
        if (!v && !guardando) onCerrar()
      }}
      titulo="Corregir arancel"
      descripcion={`${prestacion} · ${obraSocial}`}
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
            form="form-correccion"
            variant="primary"
            size="touch"
            className="sm:h-[34px]"
            loading={guardando}
            disabled={!hayCambios}
          >
            Guardar corrección
          </Button>
        </>
      }
    >
      <form
        id="form-correccion"
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

        {esAbierta && (
          <Banner
            tono="info"
            icono={<TrendingUp className="size-4" />}
            titulo="¿Subió el precio?"
            acciones={
              <Button type="button" variant="secondary" size="sm" onClick={onVigenciaNueva}>
                Cargar vigencia nueva
              </Button>
            }
          >
            Eso es una vigencia nueva, no una corrección: así el precio de antes queda en el
            historial. Corregí sólo lo que se cargó mal.
          </Banner>
        )}

        <Field
          label="Monto del arancel"
          requerido
          htmlFor="correccion-monto"
          helper={`Estaba cargado en ${money(vigencia.monto)}.`}
        >
          <InputMonto id="correccion-monto" value={monto} onChange={setMonto} autoFocus />
        </Field>

        <Field label="Cobertura" htmlFor="correccion-tipo">
          <Segmented
            value={tipo}
            onChange={(v) => setTipo(v)}
            opciones={OPCIONES_TIPO}
            className="w-full justify-between sm:w-auto sm:justify-start"
          />
        </Field>

        {tipo === 'porcentaje' && (
          <Field label="Porcentaje que cubre" htmlFor="correccion-valor-pct" helper="Entre 0 y 100.">
            <div className="relative max-w-[160px]">
              <Input
                id="correccion-valor-pct"
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
            htmlFor="correccion-valor-monto"
            helper="Si supera al arancel, el paciente no paga nada: nunca queda en negativo."
          >
            <div className="max-w-[200px]">
              <InputMonto id="correccion-valor-monto" value={valor} onChange={setValor} />
            </div>
          </Field>
        )}

        <Field
          label="Rige desde"
          requerido
          htmlFor="correccion-desde"
          error={fechaVacia ? 'Elegí una fecha.' : fechaFuera ? 'Esa fecha queda fuera de lo posible.' : null}
          helper={
            vigencia.vigente_hasta
              ? `Termina el ${fechaLarga(vigencia.vigente_hasta)}, cuando arranca la siguiente.`
              : 'Sin fecha de fin: rige hasta que se cargue otra vigencia.'
          }
        >
          <Input
            id="correccion-desde"
            type="date"
            min={minimo}
            max={maximo}
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            invalido={fechaVacia || fechaFuera}
            className="max-w-[200px] tabular-nums"
          />
        </Field>

        <Field
          label="Motivo"
          requerido={usada}
          htmlFor="correccion-motivo"
          helper={
            usada
              ? 'Queda en el registro: es lo que explica por qué un presupuesto viejo dice otro número.'
              : 'Opcional. Queda en el registro de cambios.'
          }
        >
          <Textarea
            id="correccion-motivo"
            value={motivo}
            maxLength={300}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por ejemplo: se cargó sin los ceros"
            className="min-h-[64px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                guardar()
              }
            }}
          />
        </Field>

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

        <div className="rounded-card border border-primary/20 bg-tint p-4">
          <p className="t-label">Qué va a pasar</p>
          <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-body">
            {cambiaMonto && (
              <li className="flex flex-wrap items-center gap-1">
                El precio pasa de
                <span className="inline-flex items-center gap-1 tabular-nums">
                  {money(vigencia.monto)} <ArrowRight aria-hidden className="size-3" />{' '}
                  {money(monto)}
                </span>
                desde el {fechaCorta(ES_FECHA.test(desde) ? desde : vigencia.vigente_desde)}.
              </li>
            )}
            {cambiaCobertura && (
              <li>
                La cobertura pasa de{' '}
                {etiquetaCobertura(vigencia.cobertura_tipo, Number(vigencia.cobertura_valor))} a{' '}
                {etiquetaCobertura(tipo, valorEfectivo)}.
              </li>
            )}
            {cambiaDesde && !fechaVacia && (
              <li>
                Arranca el {fechaLarga(desde)} en vez del {fechaLarga(vigencia.vigente_desde)}.
                {anterior &&
                  ` La vigencia anterior (${money(anterior.monto)}) pasa a terminar el ${fechaLarga(
                    subDays(parseISO(desde), 1),
                  )}.`}
                {!anterior &&
                  desde > vigencia.vigente_desde &&
                  ' Entre esas dos fechas la combinación queda sin precio.'}
              </li>
            )}
            <li>
              {usada
                ? `Los ${numero(vigencia.usos)} presupuestos que lo usan no cambian: guardan su copia del precio. Si alguno ya se emitió, su detalle va a avisar que el arancel cambió y ofrecer duplicarlo.`
                : 'Todavía no se usó en ningún presupuesto.'}
            </li>
            <li>Queda en el registro de cambios: quién, cuándo{usada ? ' y por qué' : ''}.</li>
          </ul>
        </div>
      </form>
    </ResponsiveModal>
  )
}
