'use client'

import { CircleSlash, Copy } from 'lucide-react'

import { Button } from '@/components/ui'
import { ETIQUETA_MOTIVO } from '@/lib/estados'
import { fechaHora } from '@/lib/formato'
import type { MotivoPerdida } from '@/lib/types'

import { useDetalle } from './contexto'

/**
 * Bloque de presupuesto perdido.
 *
 * La recomendación es duplicar, no reabrir: si el paciente vuelve, los
 * aranceles seguramente se movieron y reabrir este documento haría que
 * el consultorio sostenga un precio viejo sin querer. La transición
 * inversa existe en la máquina de estados, pero acá no se ofrece.
 */
export function BloquePerdido({
  motivo,
  nota,
  autor,
  fecha,
}: {
  motivo: MotivoPerdida | null
  nota: string | null
  /** Quién lo marcó, según el historial. */
  autor: string | null
  fecha: string | null
}) {
  const { duplicar, duplicando } = useDetalle()

  return (
    <section className="animate-enter rounded-card border border-warm-line/25 bg-warm-soft p-5">
      <div className="flex items-start gap-3">
        <CircleSlash aria-hidden className="mt-0.5 size-5 shrink-0 text-warm-line" />
        <div className="min-w-0 flex-1">
          <h2 className="font-sans text-[14px] font-semibold text-warm-ink">
            Este presupuesto se dio por perdido
            {motivo ? `: ${ETIQUETA_MOTIVO[motivo].toLowerCase()}` : ''}
          </h2>

          {nota && (
            <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-warm-ink/85">
              «{nota}»
            </p>
          )}

          {(autor || fecha) && (
            <p className="t-helper mt-1.5 text-warm-ink/75">
              {autor ?? 'Sin autor registrado'}
              {fecha ? ` · ${fechaHora(fecha)}` : ''}
            </p>
          )}

          <p className="mt-3 text-[13px] leading-relaxed text-warm-ink/85">
            Si el paciente vuelve, <strong>duplicá el presupuesto</strong> en lugar de reabrir este:
            los aranceles cambian y el documento nuevo sale con los valores de hoy. Éste queda como
            está, con su historial completo.
          </p>

          <div className="mt-3">
            <Button variant="warm" onClick={duplicar} loading={duplicando}>
              <Copy aria-hidden />
              Duplicar con valores de hoy
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
