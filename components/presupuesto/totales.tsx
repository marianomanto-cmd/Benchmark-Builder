import { Monto } from '@/components/ui'
import { estaCerrado } from '@/lib/estados'
import { porcentaje } from '@/lib/formato'
import type { EstadoPresupuesto, PresupuestoCuota } from '@/lib/types'

/**
 * Totales congelados + condiciones de pago.
 *
 * En `perdido` e `iniciado` el monto va apagado: ya no está en juego —
 * en uno porque se cerró la conversación, en el otro porque el
 * tratamiento arrancó y lo que importa pasó a ser el cobro.
 */
export function Totales({
  subtotal,
  cobertura,
  aCargo,
  estado,
  cuotas,
  observaciones,
}: {
  subtotal: number
  cobertura: number
  aCargo: number
  estado: EstadoPresupuesto
  cuotas: PresupuestoCuota[]
  observaciones: string | null
}) {
  const cerrado = estaCerrado(estado)

  return (
    <section className="flex flex-col gap-4 rounded-card bg-tint p-5 animate-enter">
      <dl className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="t-helper">Subtotal de las prestaciones</dt>
          <dd>
            <Monto valor={subtotal} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="t-helper">Cubre la obra social</dt>
          <dd className="text-muted tabular-nums whitespace-nowrap">
            {cobertura > 0 ? '− ' : ''}
            <Monto valor={cobertura} />
          </dd>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-primary/20 pt-3">
          <dt className="font-sans text-[14px] font-semibold text-ink">A cargo del paciente</dt>
          <dd>
            <Monto
              valor={aCargo}
              jerarquia={cerrado ? 'apagado' : 'hero'}
              className="text-[26px] md:text-[34px]"
            />
          </dd>
        </div>
      </dl>

      {cuotas.length > 0 && (
        <div className="rounded-input border border-primary/15 bg-card p-4">
          <h3 className="t-label">Condiciones de pago</h3>
          <ol className="mt-2 flex flex-col divide-y divide-hairline">
            {cuotas.map((cuota) => (
              <li
                key={cuota.id}
                className="flex flex-wrap items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 text-[14px] text-body">
                  {cuota.etiqueta}
                  {cuota.porcentaje != null && (
                    <span className="t-helper ml-1.5">({porcentaje(cuota.porcentaje)})</span>
                  )}
                </span>
                <Monto valor={cuota.monto} jerarquia="fuerte" />
              </li>
            ))}
          </ol>
        </div>
      )}

      {observaciones && (
        <div className="rounded-input border border-primary/15 bg-card p-4">
          <h3 className="t-label">Observaciones</h3>
          {/* Lo escribió el profesional con sus saltos de línea: se respetan. */}
          <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-body">
            {observaciones}
          </p>
        </div>
      )}
    </section>
  )
}
