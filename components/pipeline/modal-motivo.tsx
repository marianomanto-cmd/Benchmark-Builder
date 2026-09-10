'use client'

import * as React from 'react'

import {
  Button,
  Field,
  RadioGroup,
  RadioItem,
  ResponsiveModal,
  Textarea,
} from '@/components/ui'
import { ETIQUETA_MOTIVO, MOTIVOS } from '@/lib/estados'
import { money } from '@/lib/formato'
import type { MotivoPerdida } from '@/lib/types'
import { cn } from '@/lib/utils'

import type { FilaPipeline } from './tipos'

const MAXIMO_NOTA = 500

const ID_AVISO = 'motivos-perdida-aviso'

/**
 * Selector de motivo de pérdida.
 *
 * Se abre al soltar una tarjeta en la franja. La tarjeta ya se movió
 * (optimista), pero el cambio recién se manda al servidor cuando se
 * confirma acá: si se cancela, vuelve a su columna.
 *
 * El motivo es obligatorio a propósito: es el único dato que hace útil
 * a la franja del pie, y «Otro» está siempre disponible para cuando no
 * encaja en ninguno.
 */
export function ModalMotivo({
  fila,
  guardando,
  onConfirmar,
  onCancelar,
}: {
  /** `null` = cerrado. */
  fila: FilaPipeline | null
  guardando: boolean
  onConfirmar: (motivo: MotivoPerdida, nota: string) => void
  onCancelar: () => void
}) {
  // Sin efecto de reseteo: el tablero monta este componente con
  // `key={fila?.id}`, así cada apertura trae un formulario nuevo. El
  // motivo del presupuesto anterior no queda preseleccionado.
  const [motivo, setMotivo] = React.useState<MotivoPerdida | ''>('')
  const [nota, setNota] = React.useState('')
  /**
   * El botón no se deshabilita: un botón apagado no dice qué falta, y
   * acá falta una sola cosa. Se intenta, y el aviso aparece donde está
   * la decisión.
   */
  const [falta, setFalta] = React.useState(false)

  const abierto = fila !== null

  return (
    <ResponsiveModal
      open={abierto}
      onOpenChange={(v) => {
        if (!v && !guardando) onCancelar()
      }}
      ancho="sm"
      titulo="¿Por qué se perdió?"
      descripcion={
        fila
          ? `${fila.paciente_nombre} · ${money(fila.total_a_cargo)} a cargo`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            variant="warm"
            loading={guardando}
            onClick={() => {
              if (motivo === '') {
                setFalta(true)
                // El foco va a donde está lo que falta, no se queda en
                // el botón que no hizo nada.
                document.getElementById(`motivo-${MOTIVOS[0]}`)?.focus()
                return
              }
              onConfirmar(motivo, nota.trim())
            }}
          >
            Marcar como perdido
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <RadioGroup
            value={motivo}
            onValueChange={(v) => {
              setMotivo(v as MotivoPerdida)
              setFalta(false)
            }}
            aria-label="Motivo de la pérdida"
            aria-invalid={falta || undefined}
            aria-describedby={falta ? ID_AVISO : undefined}
            className={cn(
              'flex flex-col gap-0.5 rounded-input',
              falta && 'ring-2 ring-warm-line/50',
            )}
          >
            {MOTIVOS.map((m) => (
              // `label` de verdad: el texto es parte del control, así
              // que se puede tocar en toda la fila y los lectores de
              // pantalla lo leen junto con la opción.
              <label
                key={m}
                htmlFor={`motivo-${m}`}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-input px-2.5 py-2.5 transition-colors',
                  motivo === m ? 'bg-tint' : 'hover:bg-tint/60',
                )}
              >
                <RadioItem id={`motivo-${m}`} value={m} />
                <span className="font-sans text-[14px] text-ink">{ETIQUETA_MOTIVO[m]}</span>
              </label>
            ))}
          </RadioGroup>

          {falta && (
            <p id={ID_AVISO} role="alert" className="mt-2 font-sans text-[12.5px] text-warm-ink">
              Elegí un motivo. Es lo único que hace útil el resumen de perdidos; si no encaja
              en ninguno, está «Otro».
            </p>
          )}
        </div>

        <Field
          label="Nota (opcional)"
          htmlFor="nota-perdida"
          helper={`Queda en el historial del presupuesto. Máximo ${MAXIMO_NOTA} caracteres.`}
        >
          <Textarea
            id="nota-perdida"
            value={nota}
            maxLength={MAXIMO_NOTA}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Por ejemplo: pidió esperar hasta el mes que viene."
            className="min-h-[72px]"
          />
        </Field>
      </div>
    </ResponsiveModal>
  )
}
