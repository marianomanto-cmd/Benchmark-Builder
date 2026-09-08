import { Lock } from 'lucide-react'

import { MicroBadge, Monto, Tabla, Tbody, Td, Th, Thead, Tr } from '@/components/ui'
import { fechaLarga, money, porcentaje } from '@/lib/formato'
import type { CoberturaTipo, PresupuestoItem } from '@/lib/types'

/**
 * Las prestaciones del documento.
 *
 * Todo lo que se ve acá sale del snapshot de `presupuesto_items`: nunca
 * de un join contra `aranceles`. Aunque el arancel de hoy sea otro,
 * estas filas muestran lo que se le prometió al paciente el día que se
 * emitió.
 *
 * Desktop: tabla. Mobile: una card por ítem, nunca una tabla apretada.
 */

function textoCobertura(tipo: CoberturaTipo, valor: number): string {
  if (tipo === 'porcentaje') return `${porcentaje(valor)} de cobertura`
  if (tipo === 'monto') return `monto fijo de ${money(valor)}`
  return 'sin cobertura'
}

/** Qué decía el arancel antes de que alguien lo editara a mano. */
function textoOriginal(item: PresupuestoItem): string | null {
  if (!item.editado || item.cobertura_original_tipo == null) return null
  return `El arancel cubría ${textoCobertura(
    item.cobertura_original_tipo,
    item.cobertura_original_valor ?? 0,
  ).replace(' de cobertura', '')}`
}

export function Prestaciones({
  items,
  fechaEmision,
}: {
  items: PresupuestoItem[]
  fechaEmision: string
}) {
  return (
    <section className="surface animate-enter overflow-hidden" aria-labelledby="titulo-prestaciones">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 pt-5">
        <h2 id="titulo-prestaciones" className="t-h3">
          Prestaciones
        </h2>
        <p className="t-helper flex items-center gap-1.5">
          <Lock aria-hidden className="size-3.5 text-faint" />
          Valores congelados al {fechaLarga(fechaEmision)}
        </p>
      </div>

      {/* ── Desktop ─────────────────────────────────────── */}
      <div className="hidden border-t border-hairline md:block">
        <Tabla>
          <Thead>
            <tr>
              <Th className="pl-5">Prestación</Th>
              <Th numerico>Arancel</Th>
              <Th numerico>Cobertura</Th>
              <Th numerico className="pr-5">
                A cargo
              </Th>
            </tr>
          </Thead>
          <Tbody>
            {items.map((item) => {
              const original = textoOriginal(item)
              return (
                <Tr key={item.id} destacada={item.editado}>
                  <Td className="pl-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{item.nombre}</span>
                      {item.codigo && <MicroBadge>{item.codigo}</MicroBadge>}
                      {item.editado && <MicroBadge tono="warm">editado</MicroBadge>}
                    </div>
                    {item.detalle && <p className="t-helper mt-0.5">{item.detalle}</p>}
                    {item.descripcion && (
                      <p className="t-helper mt-0.5 max-w-[46ch]">{item.descripcion}</p>
                    )}
                  </Td>

                  <Td numerico>
                    <Monto valor={item.monto} />
                  </Td>

                  <Td numerico>
                    <Monto valor={item.cobertura_monto} />
                    <p className="t-helper mt-0.5">
                      {textoCobertura(item.cobertura_tipo, item.cobertura_valor)}
                    </p>
                    {original && <p className="t-helper text-warm-ink">{original}</p>}
                    {item.motivo_override && (
                      <p className="t-helper text-warm-ink">{item.motivo_override}</p>
                    )}
                  </Td>

                  <Td numerico className="pr-5">
                    <Monto valor={item.a_cargo} jerarquia="fuerte" />
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Tabla>
      </div>

      {/* ── Mobile: card por ítem ───────────────────────── */}
      <ul className="divide-y divide-hairline border-t border-hairline md:hidden">
        {items.map((item) => {
          const original = textoOriginal(item)
          return (
            <li
              key={item.id}
              className={item.editado ? 'bg-warm-faint px-5 py-4' : 'px-5 py-4'}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans text-[14px] font-medium text-ink">{item.nombre}</span>
                {item.codigo && <MicroBadge>{item.codigo}</MicroBadge>}
                {item.editado && <MicroBadge tono="warm">editado</MicroBadge>}
              </div>
              {item.detalle && <p className="t-helper mt-0.5">{item.detalle}</p>}

              <dl className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="t-helper">Arancel</dt>
                  <dd>
                    <Monto valor={item.monto} />
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="t-helper">
                    Cobertura
                    <span className="block">
                      {textoCobertura(item.cobertura_tipo, item.cobertura_valor)}
                    </span>
                  </dt>
                  <dd>
                    <Monto valor={item.cobertura_monto} />
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-hairline pt-1.5">
                  <dt className="font-sans text-[13px] font-semibold text-ink">A cargo</dt>
                  <dd>
                    <Monto valor={item.a_cargo} jerarquia="fuerte" />
                  </dd>
                </div>
              </dl>

              {(original || item.motivo_override) && (
                <p className="t-helper mt-2 text-warm-ink">
                  {[original, item.motivo_override].filter(Boolean).join(' · ')}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
