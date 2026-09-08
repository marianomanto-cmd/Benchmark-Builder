'use client'

import * as React from 'react'

import {
  Button,
  EstadoBadge,
  Field,
  RadioGroup,
  RadioItem,
  ResponsiveModal,
  Textarea,
} from '@/components/ui'
import { ESTADOS, ETIQUETA_MOTIVO, MOTIVOS } from '@/lib/estados'
import type { EstadoPresupuesto, MotivoPerdida } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Cambio de estado a mano.
 *
 * Dos modos:
 *  - `libre`: elegís el estado destino de la lista. Es la acción
 *    "Cambiar estado" de la cabecera y de la barra de mobile.
 *  - `perdido`: va derecho al selector de motivo. Es "Marcar como
 *    perdido" del panel de seguimiento.
 *
 * `borrador` no se ofrece nunca: un presupuesto emitido no vuelve atrás
 * (lo bloquea `cambiar_estado()` en la base). Si hay que cambiar las
 * prestaciones, se duplica.
 */

const ESTADOS_ELEGIBLES = ESTADOS.filter((e) => e !== 'borrador')

export function DialogoEstado({
  open,
  onOpenChange,
  estadoActual,
  modo,
  guardando,
  onConfirmar,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  estadoActual: EstadoPresupuesto
  modo: 'libre' | 'perdido'
  guardando: boolean
  onConfirmar: (
    estado: EstadoPresupuesto,
    motivo: MotivoPerdida | null,
    nota: string | null,
  ) => Promise<boolean>
}) {
  const [destino, setDestino] = React.useState<EstadoPresupuesto>(
    modo === 'perdido' ? 'perdido' : estadoActual,
  )
  const [motivo, setMotivo] = React.useState<MotivoPerdida>('sin_respuesta')
  const [nota, setNota] = React.useState('')

  // Cada apertura arranca limpia. No hay efecto de reseteo: el contexto
  // monta este diálogo con una `key` que cambia en cada apertura, que
  // es la forma idiomática de resetear estado en React y no dispara el
  // render en cascada que provoca setear estado dentro de un efecto.

  const esPerdido = destino === 'perdido'
  const sinCambio = destino === estadoActual

  async function confirmar() {
    const ok = await onConfirmar(
      destino,
      esPerdido ? motivo : null,
      esPerdido ? nota.trim() || null : null,
    )
    if (ok) onOpenChange(false)
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      ancho="sm"
      titulo={modo === 'perdido' ? 'Marcar como perdido' : 'Cambiar estado'}
      descripcion={
        modo === 'perdido'
          ? 'Queda registrado con tu nombre y la fecha. Después se puede duplicar si el paciente vuelve.'
          : 'El movimiento queda en el historial con tu nombre y la fecha.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            variant={esPerdido ? 'warm' : 'primary'}
            onClick={confirmar}
            loading={guardando}
            disabled={sinCambio}
          >
            {esPerdido ? 'Marcar como perdido' : 'Guardar el cambio'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {modo === 'libre' && (
          <Field label="Nuevo estado">
            <RadioGroup
              value={destino}
              onValueChange={(v) => setDestino(v as EstadoPresupuesto)}
              className="flex flex-col gap-1"
            >
              {ESTADOS_ELEGIBLES.map((estado) => {
                const actual = estado === estadoActual
                return (
                  /* El `onClick` de la fila no es redundante: `RadioItem`
                     de Radix es un `<button>`, y un `<label>` no activa
                     botones. Sin esto, sólo el circulito sería clickeable
                     y el área táctil quedaría muy por debajo de 44px. */
                  <div
                    key={estado}
                    onClick={() => setDestino(estado)}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-input px-2.5 py-2 transition-colors',
                      'hover:bg-tint',
                      destino === estado && 'bg-tint',
                    )}
                  >
                    <RadioItem value={estado} aria-label={estado} />
                    <EstadoBadge estado={estado} size="sm" />
                    {actual && <span className="t-helper">estado actual</span>}
                  </div>
                )
              })}
            </RadioGroup>
          </Field>
        )}

        {esPerdido && (
          <>
            <Field
              label="Motivo"
              helper="Sirve para saber por qué se pierden los tratamientos, no para justificarse."
            >
              <RadioGroup
                value={motivo}
                onValueChange={(v) => setMotivo(v as MotivoPerdida)}
                className="flex flex-col gap-1"
              >
                {MOTIVOS.map((m) => (
                  <div
                    key={m}
                    onClick={() => setMotivo(m)}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-input px-2.5 py-2 transition-colors',
                      'hover:bg-warm-soft',
                      motivo === m && 'bg-warm-soft',
                    )}
                  >
                    <RadioItem value={m} aria-label={ETIQUETA_MOTIVO[m]} />
                    <span className="text-[14px] text-ink">{ETIQUETA_MOTIVO[m]}</span>
                  </div>
                ))}
              </RadioGroup>
            </Field>

            <Field
              label="Nota (opcional)"
              helper="Lo que te dijo el paciente, con sus palabras si se puede."
              htmlFor="nota-perdida"
            >
              <Textarea
                id="nota-perdida"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                maxLength={500}
                placeholder="Dijo que lo iba a consultar con la familia y no volvió a escribir."
              />
            </Field>
          </>
        )}
      </div>
    </ResponsiveModal>
  )
}
