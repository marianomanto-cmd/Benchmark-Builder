'use client'

import { Trash2, TriangleAlert } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { borrarArancel } from '@/app/actions/catalogo'
import { Banner, Button, Field, ResponsiveModal, Textarea } from '@/components/ui'
import { fechaLarga, isoDate, money, numero } from '@/lib/formato'

import { etiquetaCoberturaLarga, vigenciaAnterior, type VigenciaCelda } from './tipos'

/**
 * Borrar un arancel.
 *
 * Antes de confirmar se dice qué pasa con la celda, que es lo que no se
 * ve: si la vigencia anterior terminaba justo antes, vuelve a regir en
 * su lugar; si no, la combinación queda sin precio esos días y el wizard
 * no la puede cotizar sola.
 */
export function DialogoBorrarArancel({
  prestacion,
  obraSocial,
  vigencia,
  vigencias,
  onCerrar,
  onBorrado,
}: {
  prestacion: string
  obraSocial: string
  vigencia: VigenciaCelda
  vigencias: VigenciaCelda[]
  onCerrar: () => void
  onBorrado: () => void
}) {
  const [motivo, setMotivo] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [borrando, iniciar] = React.useTransition()

  const anterior = vigenciaAnterior(vigencias, vigencia)
  const usada = vigencia.usos > 0
  const hoy = isoDate()
  const rigeHoyOEnAdelante = vigencia.vigente_hasta === null || vigencia.vigente_hasta >= hoy

  function borrar() {
    setError(null)
    if (usada && motivo.trim() === '') {
      setError('Este arancel ya se usó en presupuestos: contá en una línea por qué lo borrás.')
      return
    }

    iniciar(async () => {
      const resultado = await borrarArancel({ id: vigencia.id, motivo: motivo.trim() || null })
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }
      toast.success(
        resultado.data
          ? 'Arancel borrado. Vuelve a regir el precio anterior.'
          : 'Arancel borrado.',
      )
      onBorrado()
    })
  }

  return (
    <ResponsiveModal
      open
      onOpenChange={(v) => {
        if (!v && !borrando) onCerrar()
      }}
      titulo="Borrar arancel"
      descripcion={`${prestacion} · ${obraSocial}`}
      ancho="sm"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            size="touch"
            className="sm:h-[34px]"
            disabled={borrando}
            onClick={onCerrar}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            size="touch"
            className="sm:h-[34px]"
            loading={borrando}
            onClick={borrar}
          >
            <Trash2 aria-hidden />
            Borrar arancel
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <Banner tono="warm" icono={<TriangleAlert className="size-4" />} titulo="No se borró">
            {error}
          </Banner>
        )}

        <p className="text-[14px] leading-relaxed text-body">
          Se borra el arancel de <strong className="tabular-nums text-ink">{money(vigencia.monto)}</strong>{' '}
          que rige desde el {fechaLarga(vigencia.vigente_desde)}
          {vigencia.vigente_hasta ? ` hasta el ${fechaLarga(vigencia.vigente_hasta)}` : ''}.{' '}
          {etiquetaCoberturaLarga(vigencia.cobertura_tipo, Number(vigencia.cobertura_valor))}.
        </p>

        <ul className="space-y-2 rounded-card border border-primary/20 bg-tint p-4 text-[13px] leading-relaxed text-body">
          {anterior ? (
            <li>
              Vuelve a regir el precio anterior, {money(anterior.monto)},{' '}
              {vigencia.vigente_hasta
                ? `hasta el ${fechaLarga(vigencia.vigente_hasta)}`
                : 'sin fecha de fin'}
              .
            </li>
          ) : rigeHoyOEnAdelante ? (
            <li>
              La combinación queda sin precio
              {vigencia.vigente_desde > hoy ? ` desde el ${fechaLarga(vigencia.vigente_desde)}` : ''}:
              el wizard no la va a poder cotizar sola hasta que cargues otro.
            </li>
          ) : (
            <li>Esos días quedan sin precio en el historial.</li>
          )}
          <li>
            {usada
              ? `Se usó en ${numero(vigencia.usos)} ${vigencia.usos === 1 ? 'presupuesto' : 'presupuestos'}: no cambian, guardan su copia del precio.`
              : 'No se usó en ningún presupuesto.'}
          </li>
          <li>Queda en el registro de cambios: qué se borró, quién y cuándo.</li>
        </ul>

        <Field
          label="Motivo"
          requerido={usada}
          htmlFor="baja-motivo"
          helper={usada ? undefined : 'Opcional. Queda en el registro de cambios.'}
        >
          <Textarea
            id="baja-motivo"
            value={motivo}
            maxLength={300}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por ejemplo: se cargó en la obra social equivocada"
            className="min-h-[64px]"
          />
        </Field>
      </div>
    </ResponsiveModal>
  )
}
