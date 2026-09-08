'use client'

import { History } from 'lucide-react'

import {
  Card,
  EmptyState,
  MicroBadge,
  Monto,
  Tabla,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/components/ui'
import { fechaCorta, numero } from '@/lib/formato'

import { etiquetaCobertura, type FilaHistorico } from './tipos'

/**
 * Vista «Histórico completo»: todas las vigencias, abiertas y cerradas,
 * de la más nueva a la más vieja.
 *
 * Es la prueba de que nada se pisó. Una grilla no puede mostrar esto
 * —cada celda tendría varios valores—, así que el histórico es una
 * lista cronológica y no una segunda grilla.
 */
export function HistoricoAranceles({
  filas,
  truncado,
  limite,
}: {
  filas: FilaHistorico[]
  truncado: boolean
  limite: number
}) {
  if (filas.length === 0) {
    return (
      <EmptyState
        icono={<History className="size-7" aria-hidden />}
        titulo="Todavía no hay vigencias cargadas"
        descripcion="En cuanto cargues el primer arancel, acá va a quedar registrado cada cambio de precio con su rango de fechas."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="t-label">
        {numero(filas.length)} {filas.length === 1 ? 'vigencia' : 'vigencias'}
        {truncado && ` de las últimas ${numero(limite)}`}
      </p>

      {truncado && (
        <p className="t-helper">
          Se muestran las {numero(limite)} más recientes. Para ver el historial completo de una
          combinación, abrila desde la grilla de vigentes.
        </p>
      )}

      <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest md:block">
        <Tabla>
          <Thead>
            <tr>
              <Th className="pl-5">Prestación</Th>
              <Th>Obra social</Th>
              <Th numerico>Monto</Th>
              <Th>Cobertura</Th>
              <Th>Vigencia</Th>
              <Th numerico className="pr-5">
                Usos
              </Th>
            </tr>
          </Thead>

          <Tbody>
            {filas.map((f) => (
              <Tr key={f.id}>
                <Td className="pl-5">
                  <span className="font-medium text-ink">{f.prestacion}</span>
                  {f.rubro && <span className="block t-helper">{f.rubro}</span>}
                </Td>
                <Td>{f.obra_social}</Td>
                <Td numerico>
                  <Monto
                    valor={f.monto}
                    jerarquia={f.vigente_hasta === null ? 'fuerte' : 'apagado'}
                  />
                </Td>
                <Td>{etiquetaCobertura(f.cobertura_tipo, Number(f.cobertura_valor))}</Td>
                <Td>
                  {f.vigente_hasta === null ? (
                    <span className="flex items-center gap-2">
                      <MicroBadge tono="primary">Vigente</MicroBadge>
                      <span className="t-helper tabular-nums">
                        desde {fechaCorta(f.vigente_desde)}
                      </span>
                    </span>
                  ) : (
                    <span className="t-helper tabular-nums">
                      {fechaCorta(f.vigente_desde)} → {fechaCorta(f.vigente_hasta)}
                    </span>
                  )}
                </Td>
                <Td numerico className="pr-5">
                  {numero(f.usos)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {filas.map((f) => (
          <li key={f.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-[15px] font-medium text-ink">{f.prestacion}</p>
                  <p className="t-helper">{f.obra_social}</p>
                </div>
                <Monto
                  valor={f.monto}
                  jerarquia={f.vigente_hasta === null ? 'fuerte' : 'apagado'}
                  className="shrink-0"
                />
              </div>

              <p className="mt-2 t-helper">
                {etiquetaCobertura(f.cobertura_tipo, Number(f.cobertura_valor))} ·{' '}
                {numero(f.usos)} {f.usos === 1 ? 'uso' : 'usos'}
              </p>

              <p className="mt-2 flex items-center gap-2">
                {f.vigente_hasta === null ? (
                  <>
                    <MicroBadge tono="primary">Vigente</MicroBadge>
                    <span className="t-helper tabular-nums">
                      desde {fechaCorta(f.vigente_desde)}
                    </span>
                  </>
                ) : (
                  <span className="t-helper tabular-nums">
                    {fechaCorta(f.vigente_desde)} → {fechaCorta(f.vigente_hasta)}
                  </span>
                )}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
