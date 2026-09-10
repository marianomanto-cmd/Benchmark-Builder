'use client'

/**
 * Alta de arancel desde el wizard.
 *
 * Aparece en dos momentos: cuando la obra social del presupuesto no
 * tiene arancel para la prestación elegida ("Cargar arancel ahora"), y
 * como segundo paso obligatorio al crear una prestación nueva.
 *
 * `aranceles` es append-only: esto no edita nada, inserta una vigencia
 * nueva por RPC.
 */

import * as React from 'react'
import { toast } from 'sonner'

import { Field, InputMonto, Monto, Segmented } from '@/components/ui'
import { calcularItem, type CoberturaTipo } from '@/lib/calculo'
import { money, porcentaje as fmtPorcentaje } from '@/lib/formato'
import type { Arancel, Prestacion } from '@/lib/types'
import { cn } from '@/lib/utils'

import { CabeceraCapa, MarcoCapa, PieCapa } from './capa'
import { useCrearArancel } from './consultas'

export interface ValoresArancel {
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
}

export const ARANCEL_VACIO: ValoresArancel = {
  monto: 0,
  cobertura_tipo: 'ninguna',
  cobertura_valor: 0,
}

const OPCIONES_COBERTURA: { value: CoberturaTipo; label: string }[] = [
  { value: 'porcentaje', label: '% que cubre' },
  { value: 'monto', label: 'Monto fijo' },
  { value: 'ninguna', label: 'No cubre' },
]

/** Input de porcentaje con el signo pegado al borde derecho. */
export function InputPorcentaje({
  id,
  value,
  onChange,
  invalido,
}: {
  id?: string
  value: number
  onChange: (v: number) => void
  invalido?: boolean
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        aria-invalid={invalido || undefined}
        value={value === 0 ? '' : String(value)}
        placeholder="0"
        onChange={(e) => {
          const limpio = e.target.value.replace(/[^\d]/g, '')
          onChange(limpio === '' ? 0 : Math.min(100, Number(limpio)))
        }}
        className={cn(
          'h-9 w-full rounded-input border border-hairline bg-card pl-3 pr-8',
          'text-right font-sans text-[14px] text-ink tabular-nums',
          'transition-colors duration-150 hover:border-primary/30',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
          invalido && 'border-warm-line focus:border-warm-line focus:ring-warm-line/25',
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-faint"
      >
        %
      </span>
    </div>
  )
}

/**
 * Monto + cobertura, con el a-cargo resuelto en vivo debajo. Es el
 * mismo bloque que usan el mini-form de arancel y el paso 2 del alta de
 * prestación, así el número que se ve antes de guardar es el mismo.
 */
export function CamposArancel({
  valores,
  onChange,
  idMonto,
  etiquetaMonto = 'Monto de la prestación',
  autoFoco,
}: {
  valores: ValoresArancel
  onChange: (v: ValoresArancel) => void
  idMonto: string
  etiquetaMonto?: string
  autoFoco?: boolean
}) {
  const { cobertura, aCargo } = calcularItem(
    valores.monto,
    valores.cobertura_tipo,
    valores.cobertura_valor,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={etiquetaMonto} requerido htmlFor={idMonto}>
          <InputMonto
            id={idMonto}
            autoFocus={autoFoco}
            value={valores.monto === 0 ? '' : valores.monto}
            onChange={(monto) => onChange({ ...valores, monto })}
          />
        </Field>

        <Field label="Cómo cubre la obra social">
          <Segmented
            className="w-full justify-between"
            value={valores.cobertura_tipo}
            opciones={OPCIONES_COBERTURA}
            onChange={(cobertura_tipo) =>
              onChange({
                ...valores,
                cobertura_tipo,
                // El valor se limpia al cambiar de tipo: arrastrar el
                // número viejo daría un sinsentido ($ 60 donde decía 60 %).
                cobertura_valor: 0,
              })
            }
          />
        </Field>
      </div>

      {valores.cobertura_tipo !== 'ninguna' && (
        <Field
          label={valores.cobertura_tipo === 'porcentaje' ? 'Porcentaje que cubre' : 'Monto que cubre'}
          requerido
          htmlFor={`${idMonto}-cob`}
        >
          {valores.cobertura_tipo === 'porcentaje' ? (
            <InputPorcentaje
              id={`${idMonto}-cob`}
              value={valores.cobertura_valor}
              onChange={(cobertura_valor) => onChange({ ...valores, cobertura_valor })}
            />
          ) : (
            <InputMonto
              id={`${idMonto}-cob`}
              value={valores.cobertura_valor === 0 ? '' : valores.cobertura_valor}
              onChange={(cobertura_valor) => onChange({ ...valores, cobertura_valor })}
            />
          )}
        </Field>
      )}

      <div className="flex items-baseline justify-between gap-3 rounded-input bg-tint px-4 py-3">
        <div className="min-w-0">
          <p className="t-label">Queda a cargo del paciente</p>
          <p className="t-helper mt-0.5">
            Cubre {money(cobertura)}
            {valores.cobertura_tipo === 'porcentaje' && valores.cobertura_valor > 0
              ? ` (${fmtPorcentaje(valores.cobertura_valor)})`
              : ''}
          </p>
        </div>
        <Monto valor={aCargo} jerarquia="fuerte" className="text-[20px]" />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Mini-form completo
   ═══════════════════════════════════════════════════════════ */

export function FormArancel({
  prestacion,
  obraSocialId,
  obraSocialNombre,
  inicial,
  onListo,
  onCancelar,
}: {
  prestacion: Prestacion
  /** `null` = valor particular. */
  obraSocialId: string | null
  obraSocialNombre: string
  /** Valores de arranque, normalmente el arancel particular como referencia. */
  inicial?: ValoresArancel
  onListo: (arancel: Arancel) => void
  onCancelar: () => void
}) {
  const [valores, setValores] = React.useState<ValoresArancel>(inicial ?? ARANCEL_VACIO)
  const [error, setError] = React.useState<string | null>(null)

  const crear = useCrearArancel()

  async function guardar() {
    if (valores.monto <= 0) {
      setError('Cargá el monto de la prestación: sin monto no hay presupuesto.')
      return
    }
    if (valores.cobertura_tipo !== 'ninguna' && valores.cobertura_valor <= 0) {
      setError('Cargá cuánto cubre la obra social, o elegí “No cubre”.')
      return
    }
    try {
      const arancel = await crear.mutateAsync({
        prestacion_id: prestacion.id,
        obra_social_id: obraSocialId,
        monto: valores.monto,
        cobertura_tipo: valores.cobertura_tipo,
        cobertura_valor: valores.cobertura_valor,
      })
      toast.success(`Arancel de ${prestacion.nombre} para ${obraSocialNombre} cargado`)
      onListo(arancel)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el arancel.')
    }
  }

  return (
    <MarcoCapa onEnviar={() => void guardar()}>
      <CabeceraCapa
        titulo={`Arancel de ${prestacion.nombre}`}
        ayuda={
          <>
            Para <strong className="font-semibold text-ink">{obraSocialNombre}</strong>. Queda
            vigente desde hoy y se usa en todos los presupuestos, no sólo en éste.
          </>
        }
        onVolver={onCancelar}
      />

      <CamposArancel
        autoFoco
        idMonto="ar-monto"
        valores={valores}
        onChange={(v) => {
          setValores(v)
          setError(null)
        }}
      />

      {error && (
        <p className="t-helper mt-3 text-warm-ink" role="alert">
          {error}
        </p>
      )}

      <PieCapa
        etiqueta="Cargar arancel y seguir"
        onCancelar={onCancelar}
        onGuardar={() => void guardar()}
        guardando={crear.isPending}
        deshabilitado={valores.monto <= 0}
      />
    </MarcoCapa>
  )
}
