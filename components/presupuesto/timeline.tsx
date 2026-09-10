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
import { diasDesde, fechaBreve, fechaHora, haceCuanto, hora } from '@/lib/formato'
import type { PresupuestoEvento, TipoEvento } from '@/lib/types'
import { cn } from '@/lib/utils'

import { TITULO_EVENTO } from './tipos'

/**
 * Historial del presupuesto. Es **append-only**: no se edita ni se
 * borra, ni acá ni en la base (`trg_evento_inmutable`). Por eso no hay
 * ninguna acción sobre las entradas — sólo se leen.
 *
 * Se lee por día. Antes cada línea repetía la fecha completa («8 sep,
 * 14:32») y para saber si algo pasó hoy había que compararlas de a
 * pares. Ahora el día es un encabezado —«Hoy», «Ayer», «3 sep»—, cada
 * movimiento muestra sólo la hora, y el autor va destacado: quién hizo
 * qué y cuándo se contesta de un vistazo.
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

/** «Hoy» · «Ayer» · «3 sep» · «3 sep 2025» */
function etiquetaDia(iso: string): string {
  const dias = diasDesde(iso)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  const fecha = new Date(iso)
  const anoActual = new Date().getFullYear()
  return fecha.getFullYear() === anoActual
    ? fechaBreve(iso)
    : `${fechaBreve(iso)} ${fecha.getFullYear()}`
}

/**
 * Lo que la descripción de un cambio de estado agrega por encima de los
 * dos badges: hoy, el motivo de la pérdida. Antes se perdía —la fila
 * mostraba las chapitas y tiraba la descripción entera—, y el motivo
 * por el que se cayó un tratamiento es justo lo que se busca al abrir
 * el historial.
 */
function extraDelCambio(descripcion: string): string | null {
  const corte = descripcion.indexOf(' · ')
  if (corte === -1) return null
  return descripcion.slice(corte + 3).trim() || null
}

interface Grupo {
  clave: string
  etiqueta: string
  eventos: PresupuestoEvento[]
}

/** Agrupa por día de calendario, respetando el orden que ya traen. */
function agruparPorDia(eventos: PresupuestoEvento[]): Grupo[] {
  const grupos: Grupo[] = []
  for (const evento of eventos) {
    const fecha = new Date(evento.created_at)
    const clave = Number.isNaN(fecha.getTime())
      ? evento.created_at
      : `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.clave === clave) {
      ultimo.eventos.push(evento)
    } else {
      grupos.push({ clave, etiqueta: etiquetaDia(evento.created_at), eventos: [evento] })
    }
  }
  return grupos
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
        Todavía no hay movimientos. Cada envío, cambio de estado y nota queda registrado acá,
        con su autor y su fecha.
      </p>
    )
  }

  const grupos = agruparPorDia(eventos)

  return (
    <ol className={cn('flex flex-col gap-4', className)}>
      {grupos.map((grupo) => (
        <li key={grupo.clave}>
          <p className="t-label sticky top-0 z-20 bg-card/95 pb-1.5 backdrop-blur-sm">
            {grupo.etiqueta}
          </p>

          <ol className="relative flex flex-col">
            {grupo.eventos.map((evento, i) => {
              const Icono = ICONO[evento.tipo] ?? StickyNote
              const ultimo = i === grupo.eventos.length - 1
              const extra =
                evento.tipo === 'estado_cambiado' ? extraDelCambio(evento.descripcion) : null

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
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 font-sans text-[13px] font-semibold text-ink">
                        {TITULO_EVENTO[evento.tipo] ?? 'Movimiento'}
                      </p>
                      {/* La hora sola: el día ya lo dice el encabezado.
                          La fecha completa y el "hace tanto" quedan en el
                          title, para el que necesita el dato exacto. */}
                      <time
                        dateTime={evento.created_at}
                        title={`${fechaHora(evento.created_at)} · ${haceCuanto(evento.created_at)}`}
                        className="t-helper shrink-0 tabular-nums"
                      >
                        {hora(evento.created_at)}
                      </time>
                    </div>

                    {evento.tipo === 'estado_cambiado' && evento.estado_nuevo ? (
                      <>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {evento.estado_anterior && (
                            <>
                              <EstadoBadge estado={evento.estado_anterior} size="sm" />
                              <MoveRight aria-hidden className="size-3.5 text-faint" />
                            </>
                          )}
                          <EstadoBadge estado={evento.estado_nuevo} size="sm" />
                        </div>
                        {extra && <p className="t-helper mt-1 break-words">{extra}</p>}
                      </>
                    ) : (
                      <p className="mt-0.5 text-[13px] leading-relaxed text-body break-words">
                        {evento.descripcion}
                      </p>
                    )}

                    <p className="t-helper mt-1">
                      <span className="font-medium text-muted">{evento.autor_nombre}</span>
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </li>
      ))}
    </ol>
  )
}

/** Una sola línea: el último movimiento. Es lo que ve mobile. */
export function UltimoEvento({ evento }: { evento: PresupuestoEvento | null }) {
  if (!evento) {
    return (
      <p className="t-helper">
        Todavía no hay movimientos. Cada envío y cada cambio de estado queda registrado acá.
      </p>
    )
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
          <span className="font-medium text-muted">{evento.autor_nombre}</span> ·{' '}
          <time
            dateTime={evento.created_at}
            title={fechaHora(evento.created_at)}
          >
            {haceCuanto(evento.created_at)}
          </time>
        </p>
      </div>
    </div>
  )
}
