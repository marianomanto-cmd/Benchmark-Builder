'use client'

/**
 * Maqueta del documento, al lado del formulario.
 *
 * Es HTML fiel, no el PDF real: embeber el PDF acá obligaría a
 * generarlo en cada tecla. Lo que importa es que quien carga vea, antes
 * de guardar, exactamente qué va a leer el paciente.
 *
 * "Fiel" es un compromiso concreto con `lib/pdf/documento.tsx`, y la
 * versión anterior se le había ido despegando en cinco puntos que
 * cambiaban lo que el paciente lee:
 *
 *   · las condiciones de pago desaparecían del preview cuando no había
 *     ninguna cargada, pero el PDF **siempre** imprime la sección, con
 *     un párrafo diciendo que se acuerdan al iniciar;
 *   · una prestación sin cobertura salía "$ 0" acá y "—" impreso, y el
 *     PDF además aclara debajo el porcentaje o "Monto fijo";
 *   · el código de la prestación se imprime y acá no se mostraba;
 *   · la línea de cobertura decía "Cubre la obra social" incluso en un
 *     presupuesto particular, donde no hay ninguna;
 *   · faltaban las dos cláusulas del cierre —la de vigencia y la de
 *     autorización de la obra social— y la firma, que son justo lo que
 *     el paciente pregunta.
 *
 * Los overrides son internos: acá no se muestran ni el chip «editado»
 * ni el motivo. El paciente ve un precio, no una discusión interna.
 */

import * as React from 'react'

import { calcularItem, calcularTotales, repartirCuotas } from '@/lib/calculo'
import { fechaCorta, fechaLarga, money, porcentaje as fmtPorcentaje } from '@/lib/formato'
import type { BorradorPresupuesto, CoberturaTipo, ItemBorrador, Paciente } from '@/lib/types'
import { datosConsultorio } from '@/lib/pdf/consultorio'
import { cn } from '@/lib/utils'

// La misma constante que imprime el PDF: el preview del paso 3 tiene que
// mostrar exactamente lo que va a salir en el documento.
const CONSULTORIO = datosConsultorio()

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">{etiqueta}</p>
      <p className="truncate text-[10.5px] text-ink">{valor || '—'}</p>
    </div>
  )
}

/** Misma regla que `coberturaDeItem` del PDF. */
function coberturaDeItem(
  tipo: CoberturaTipo,
  valor: number,
  monto: number,
): { texto: string; nota: string | null } {
  if (tipo === 'ninguna' || monto <= 0) return { texto: '—', nota: null }
  return {
    texto: money(monto),
    nota: tipo === 'porcentaje' ? fmtPorcentaje(valor) : 'Monto fijo',
  }
}

/** Misma regla que `detalleDeItem` del PDF: el detalle y el código. */
function detalleDeItem(item: ItemBorrador): string | null {
  const partes = [item.detalle, item.codigo ? `Cód. ${item.codigo}` : null].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : null
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
  const obraSocial = borrador.obra_social_nombre

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
              {/* El número lo pone un trigger al emitir: acá todavía no
                  existe, y decirlo es más honesto que dejar el hueco. */}
              <p className="text-[10px] text-faint">N.º al emitir</p>
              <p className="text-[10.5px] tabular-nums text-ink">
                {fechaCorta(borrador.fecha_emision)}
              </p>
            </div>
          </header>

          {/* Contexto */}
          <section className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <Dato etiqueta="Paciente" valor={borrador.paciente_nombre} />
            <Dato etiqueta="DNI" valor={paciente?.dni} />
            <Dato etiqueta="Obra social" valor={obraSocial ?? 'Particular'} />
            {/* Sin obra social no hay afiliado que mostrar: el PDF tampoco
                imprime ese campo. */}
            <Dato etiqueta="Nro de afiliado" valor={obraSocial ? paciente?.nro_afiliado : null} />
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
                    Cobertura
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
                  const cob = coberturaDeItem(item.cobertura_tipo, item.cobertura_valor, cobertura)
                  const detalle = detalleDeItem(item)

                  return (
                    <tr key={item.key} className="border-b border-hairline/70 align-top">
                      <td className="py-2 pr-2">
                        <p className="text-[10.5px] font-medium text-ink">{item.nombre}</p>
                        {/* Mismo orden que el PDF: primero la descripción
                            del catálogo, después detalle y código. */}
                        {item.descripcion && (
                          <p className="text-[9px] leading-snug text-muted">{item.descripcion}</p>
                        )}
                        {detalle && (
                          <p className="text-[9px] leading-snug text-muted">{detalle}</p>
                        )}
                      </td>
                      <td className="py-2 text-right text-[10.5px] tabular-nums text-body">
                        {money(item.monto)}
                      </td>
                      <td className="py-2 text-right text-[10.5px] tabular-nums text-body">
                        {cob.texto}
                        {cob.nota && (
                          <span className="block text-[9px] text-faint">{cob.nota}</span>
                        )}
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
              <span>Subtotal de prestaciones</span>
              <span className="tabular-nums">{money(totales.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-2 text-[10px] text-muted">
              <span className="min-w-0 truncate">
                {obraSocial ? `Cobertura ${obraSocial}` : 'Cobertura'}
              </span>
              <span className="shrink-0 tabular-nums">
                {totales.cobertura > 0 ? `− ${money(totales.cobertura)}` : money(0)}
              </span>
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

          {/* Condiciones de pago — el PDF imprime la sección siempre. */}
          <section>
            <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
              Condiciones de pago
            </p>
            {borrador.cuotas.length === 0 ? (
              <p className="text-[10px] leading-relaxed text-body">
                Se acuerdan al momento de iniciar el tratamiento. Consultanos por las formas de
                pago disponibles.
              </p>
            ) : (
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
            )}
          </section>

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

          {/* Cierre: las mismas dos cláusulas y la misma firma del PDF. */}
          <footer className="mt-auto flex flex-col gap-2 border-t border-hairline pt-2">
            <p className="text-[8.5px] leading-snug text-faint">
              Los valores son los vigentes al {fechaLarga(borrador.fecha_emision)} y se mantienen
              hasta el {fechaLarga(borrador.valido_hasta)}. Pasada esa fecha, pedinos uno
              actualizado. Incluye únicamente las prestaciones detalladas: todo tratamiento que
              surja durante la atención se presupuesta aparte.
            </p>
            <p className="text-[8.5px] leading-snug text-faint">
              {obraSocial
                ? `La cobertura de ${obraSocial} es la vigente al emitirse este presupuesto y queda sujeta a la autorización de la obra social: si autoriza menos, la diferencia queda a cargo del paciente.`
                : 'Presupuesto calculado como particular: no se aplicó cobertura de ninguna obra social.'}
            </p>
            <div className="mt-2 self-end text-center">
              <span className="block w-[130px] border-t border-hairline pt-1 text-[9px] text-ink">
                {borrador.profesional_nombre || '—'}
              </span>
            </div>
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
        <span className="t-helper">
          {borrador.items.length === 1
            ? '1 prestación'
            : `${borrador.items.length} prestaciones`}
        </span>
      </summary>
      <div className="px-3 pb-3">
        <PreviewPdf borrador={borrador} paciente={paciente} className="border-0 bg-transparent p-0" />
      </div>
    </details>
  )
}
