import {
  Copy,
  FilePlus2,
  FileText,
  MessageCircle,
  MoveRight,
  PencilLine,
  StickyNote,
} from 'lucide-react'
import * as React from 'react'

import { EstadoBadge } from '@/components/ui'
import { fechaHora, haceCuanto } from '@/lib/formato'
import type { PresupuestoEvento, TipoEvento } from '@/lib/types'
import { cn } from '@/lib/utils'

import { TITULO_EVENTO } from './tipos'

/**
 * Historial del presupuesto. Es **append-only**: no se edita ni se
 * borra, ni acá ni en la base (`trg_evento_inmutable`). Por eso no hay
 * ninguna acción sobre las entradas — sólo se leen.
 *
 * No lleva `'use client'`: se renderiza en el servidor dentro del panel
 * derecho y también viaja al cliente dentro del sheet de mobile.
 */

const ICONO: Record<TipoEvento, React.ElementType> = {
  creado: FilePlus2,
  item_editado: PencilLine,
  pdf_generado: FileText,
  enviado_whatsapp: MessageCircle,
  estado_cambiado: MoveRight,
  nota: StickyNote,
  duplicado: Copy,
}

export function Timeline({
  eventos,
  className,
}: {
  eventos: PresupuestoEvento[]
  className?: string
}) {
  if (eventos.length === 0) {
    return (
      <p className={cn('t-helper', className)}>
        Todavía no hay movimientos registrados.
      </p>
    )
  }

  return (
    <ol className={cn('relative flex flex-col', className)}>
      {eventos.map((evento, i) => {
        const Icono = ICONO[evento.tipo] ?? StickyNote
        const ultimo = i === eventos.length - 1

        return (
          <li key={evento.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Hilo vertical: no llega al último punto para que la
                columna no quede colgando. */}
            {!ultimo && (
              <span
                aria-hidden
                className="absolute left-[13px] top-7 bottom-0 w-px bg-hairline"
              />
            )}

            <span
              aria-hidden
              className="relative z-10 mt-0.5 grid size-[27px] shrink-0 place-items-center rounded-full border border-hairline bg-card text-primary"
            >
              <Icono className="size-[13px] stroke-[1.75]" />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="font-sans text-[13px] font-semibold text-ink">
                {TITULO_EVENTO[evento.tipo] ?? 'Movimiento'}
              </p>

              {evento.tipo === 'estado_cambiado' && evento.estado_nuevo ? (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {evento.estado_anterior && (
                    <>
                      <EstadoBadge estado={evento.estado_anterior} size="sm" />
                      <MoveRight aria-hidden className="size-3.5 text-faint" />
                    </>
                  )}
                  <EstadoBadge estado={evento.estado_nuevo} size="sm" />
                </div>
              ) : (
                <p className="mt-0.5 text-[13px] leading-relaxed text-body break-words">
                  {evento.descripcion}
                </p>
              )}

              <p className="t-helper mt-1">
                {evento.autor_nombre} ·{' '}
                <time dateTime={evento.created_at} title={haceCuanto(evento.created_at)}>
                  {fechaHora(evento.created_at)}
                </time>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Una sola línea: el último movimiento. Es lo que ve mobile. */
export function UltimoEvento({ evento }: { evento: PresupuestoEvento | null }) {
  if (!evento) {
    return <p className="t-helper">Todavía no hay movimientos registrados.</p>
  }

  const Icono = ICONO[evento.tipo] ?? StickyNote

  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span
        aria-hidden
        className="mt-0.5 grid size-[27px] shrink-0 place-items-center rounded-full border border-hairline bg-card text-primary"
      >
        <Icono className="size-[13px] stroke-[1.75]" />
      </span>
      <div className="min-w-0">
        <p className="font-sans text-[13px] font-semibold text-ink">
          {TITULO_EVENTO[evento.tipo] ?? 'Movimiento'}
        </p>
        <p className="t-helper truncate">
          {evento.autor_nombre} · {haceCuanto(evento.created_at)}
        </p>
      </div>
    </div>
  )
}
