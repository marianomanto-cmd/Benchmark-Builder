'use client'

/**
 * Maqueta del documento, al lado del formulario.
 *
 * Es HTML fiel, no el PDF real: embeber el PDF acá obligaría a
 * generarlo en cada tecla. Lo que importa es que quien carga vea, antes
 * de guardar, exactamente qué va a leer el paciente.
 *
 * Los overrides son internos: acá no se muestran ni el chip «editado»
 * ni el motivo. El paciente ve un precio, no una discusión interna.
 */

import * as React from 'react'

import { calcularItem, calcularTotales, repartirCuotas } from '@/lib/calculo'
import { fechaCorta, fechaLarga, money, porcentaje as fmtPorcentaje } from '@/lib/formato'
import type { BorradorPresupuesto, Paciente } from '@/lib/types'
import { cn } from '@/lib/utils'

const CONSULTORIO = {
  nombre: process.env.NEXT_PUBLIC_CONSULTORIO_NOMBRE || 'Smile Lab',
  direccion: process.env.NEXT_PUBLIC_CONSULTORIO_DIRECCION || '',
  telefono: process.env.NEXT_PUBLIC_CONSULTORIO_TELEFONO || '',
  email: process.env.NEXT_PUBLIC_CONSULTORIO_EMAIL || '',
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">{etiqueta}</p>
      <p className="truncate text-[10.5px] text-ink">{valor || '—'}</p>
    </div>
  )
}

export function PreviewPdf({
  borrador,
  paciente,
  className,
}: {
  borrador: BorradorPresupuesto
  paciente: Paciente | null
  className?: string
}) {
  const totales = calcularTotales(borrador.items)
  const montosCuotas = repartirCuotas(
    totales.aCargo,
    borrador.cuotas.map((c) => c.porcentaje),
  )

  return (
    <div className={cn('rounded-card border border-hairline bg-[#F1F5F7] p-3', className)}>
      <p className="t-label mb-2 px-1">Así lo va a ver el paciente</p>

      {/* Proporción A4; el contenido scrollea adentro. */}
      <div className="aspect-[1/1.414] w-full overflow-y-auto rounded-[12px] bg-white shadow-rest">
        <div className="flex min-h-full flex-col gap-4 p-5">
          {/* Encabezado */}
          <header className="flex items-start justify-between gap-4 border-b border-hairline pb-3">
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold leading-tight text-ink">
                {CONSULTORIO.nombre}
              </p>
              <p className="text-[9px] leading-snug text-muted">
                {[CONSULTORIO.direccion, CONSULTORIO.telefono, CONSULTORIO.email]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                Presupuesto
              </p>
              <p className="text-[10.5px] tabular-nums text-ink">
                {fechaCorta(borrador.fecha_emision)}
              </p>
            </div>
          </header>

          {/* Contexto */}
          <section className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <Dato etiqueta="Paciente" valor={borrador.paciente_nombre} />
            <Dato etiqueta="DNI" valor={paciente?.dni} />
            <Dato etiqueta="Obra social" valor={borrador.obra_social_nombre ?? 'Particular'} />
            <Dato etiqueta="Nro de afiliado" valor={paciente?.nro_afiliado} />
            <Dato etiqueta="Profesional" valor={borrador.profesional_nombre} />
            <Dato etiqueta="Válido hasta" valor={fechaLarga(borrador.valido_hasta)} />
          </section>

          {/* Detalle */}
          <section>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="pb-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Prestación
                  </th>
                  <th className="pb-1.5 text-right text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Monto
                  </th>
                  <th className="pb-1.5 text-right text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Cubre
                  </th>
                  <th className="pb-1.5 text-right text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                    A cargo
                  </th>
                </tr>
              </thead>
              <tbody>
                {borrador.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[10px] text-faint">
                      Sin prestaciones cargadas
                    </td>
                  </tr>
                )}
                {borrador.items.map((item) => {
                  const { cobertura, aCargo } = calcularItem(
                    item.monto,
                    item.cobertura_tipo,
                    item.cobertura_valor,
                  )
                  return (
                    <tr key={item.key} className="border-b border-hairline/70 align-top">
                      <td className="py-2 pr-2">
                        <p className="text-[10.5px] font-medium text-ink">{item.nombre}</p>
                        {item.detalle && (
                          <p className="text-[9px] leading-snug text-muted">{item.detalle}</p>
                        )}
                        {item.descripcion && (
                          <p className="text-[9px] leading-snug text-muted">{item.descripcion}</p>
                        )}
                      </td>
                      <td className="py-2 text-right text-[10.5px] tabular-nums text-body">
                        {money(item.monto)}
                      </td>
                      <td className="py-2 text-right text-[10.5px] tabular-nums text-body">
                        {money(cobertura)}
                      </td>
                      <td className="py-2 text-right text-[10.5px] font-semibold tabular-nums text-ink">
                        {money(aCargo)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          {/* Totales */}
          <section className="ml-auto w-[62%] space-y-1">
            <div className="flex justify-between text-[10px] text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(totales.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted">
              <span>Cubre {borrador.obra_social_nombre ?? 'la obra social'}</span>
              <span className="tabular-nums">− {money(totales.cobertura)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-hairline pt-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink">
                A cargo del paciente
              </span>
              <span className="font-display text-[16px] font-semibold tabular-nums text-ink">
                {money(totales.aCargo)}
              </span>
            </div>
          </section>

          {/* Condiciones de pago */}
          {borrador.cuotas.length > 0 && (
            <section>
              <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                Condiciones de pago
              </p>
              <ul className="space-y-1">
                {borrador.cuotas.map((cuota, i) => (
                  <li key={cuota.key} className="flex justify-between gap-3 text-[10px]">
                    <span className="min-w-0 truncate text-body">
                      {cuota.etiqueta || 'Sin detallar'}{' '}
                      <span className="text-muted">({fmtPorcentaje(cuota.porcentaje)})</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-ink">
                      {money(montosCuotas[i] ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Observaciones */}
          {borrador.observaciones.trim() && (
            <section>
              <p className="mb-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                Observaciones
              </p>
              <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-body">
                {borrador.observaciones.trim()}
              </p>
            </section>
          )}

          <footer className="mt-auto border-t border-hairline pt-2 text-[8.5px] leading-snug text-faint">
            Presupuesto sujeto a los valores vigentes al {fechaCorta(borrador.fecha_emision)}.
            Válido hasta el {fechaLarga(borrador.valido_hasta)}.
          </footer>
        </div>
      </div>
    </div>
  )
}

/** En mobile el preview va abajo y arranca cerrado: primero se carga, después se mira. */
export function PreviewPdfColapsable({
  borrador,
  paciente,
}: {
  borrador: BorradorPresupuesto
  paciente: Paciente | null
}) {
  return (
    <details className="rounded-card border border-hairline bg-card">
      <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 px-4 py-3 font-sans text-[14px] font-medium text-ink">
        Ver cómo queda el documento
        <span className="t-helper">{borrador.items.length} prestación(es)</span>
      </summary>
      <div className="px-3 pb-3">
        <PreviewPdf borrador={borrador} paciente={paciente} className="border-0 bg-transparent p-0" />
      </div>
    </details>
  )
}
