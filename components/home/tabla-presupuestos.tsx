'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { EstadoBadge, MicroBadge, Monto, Tabla, Tbody, Td, Th, Thead, Tr } from '@/components/ui'
import { estaCerrado, estaFrio } from '@/lib/estados'
import { fechaCorta } from '@/lib/formato'
import { cn } from '@/lib/utils'

import { AccionesFila } from './acciones-fila'
import type { FilaPresupuesto } from './tipos'

/**
 * Tabla de desktop. En mobile no se usa nunca: ahí va `ListaMobile`.
 *
 * Jerarquía de los dos montos: `A cargo` en peso 600 y `Total` en gris.
 * El primero es el número que se conversa con el paciente; el segundo
 * es contexto. En un presupuesto cerrado (perdido o iniciado) los dos
 * se apagan: ya no está en juego.
 */
export function TablaPresupuestos({ filas }: { filas: FilaPresupuesto[] }) {
  const router = useRouter()

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-card shadow-rest">
      <Tabla>
        <Thead>
          <tr>
            <Th className="pl-5">Número</Th>
            <Th>Paciente</Th>
            <Th>Prestación principal</Th>
            <Th>Obra social</Th>
            <Th>Profesional</Th>
            <Th>Fecha</Th>
            <Th numerico>Total</Th>
            <Th numerico>A cargo</Th>
            <Th>Estado</Th>
            <Th className="pr-5 text-right">
              <span className="sr-only">Acciones</span>
            </Th>
          </tr>
        </Thead>

        <Tbody>
          {filas.map((fila) => {
            const cerrado = estaCerrado(fila.estado)
            const frio = estaFrio(fila.estado, fila.dias_en_estado)

            return (
              <Tr
                key={fila.id}
                className="cursor-pointer"
                onClick={() => router.push(`/presupuestos/${fila.id}`)}
              >
                <Td className="pl-5">
                  {/* El número es el ancla real: con el link la fila se
                      alcanza con teclado y se puede abrir en otra pestaña. */}
                  <Link
                    href={`/presupuestos/${fila.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'font-medium tabular-nums',
                      cerrado ? 'text-muted' : 'text-ink',
                      'hover:text-primary-hover hover:underline underline-offset-4',
                    )}
                  >
                    {fila.numero}
                  </Link>
                </Td>

                <Td>
                  <span className="block max-w-[190px] truncate font-medium text-ink">
                    {fila.paciente_nombre}
                  </span>
                  {fila.paciente_dni && (
                    <span className="block t-helper tabular-nums">DNI {fila.paciente_dni}</span>
                  )}
                </Td>

                <Td>
                  <span className="flex items-center gap-2">
                    <span className="block max-w-[220px] truncate">
                      {fila.prestacion_principal ?? 'Sin prestaciones'}
                    </span>
                    {fila.items_count > 1 && (
                      <MicroBadge>+{fila.items_count - 1}</MicroBadge>
                    )}
                  </span>
                </Td>

                <Td>
                  <span className="block max-w-[150px] truncate">
                    {fila.obra_social_nombre ?? 'Particular'}
                  </span>
                </Td>

                <Td>
                  <span className="block max-w-[150px] truncate">{fila.profesional_nombre}</span>
                </Td>

                <Td className="whitespace-nowrap tabular-nums">
                  {fechaCorta(fila.fecha_emision)}
                </Td>

                <Td numerico>
                  <Monto valor={fila.subtotal} jerarquia={cerrado ? 'apagado' : 'normal'} />
                </Td>

                <Td numerico>
                  <Monto valor={fila.total_a_cargo} jerarquia={cerrado ? 'apagado' : 'fuerte'} />
                </Td>

                <Td>
                  <span className="flex flex-col items-start gap-1">
                    <EstadoBadge estado={fila.estado} size="sm" />
                    {frio && (
                      <MicroBadge tono="warm">{fila.dias_en_estado} días</MicroBadge>
                    )}
                  </span>
                </Td>

                <Td className="pr-5">
                  <AccionesFila
                    presupuestoId={fila.id}
                    numero={fila.numero}
                    telefono={fila.paciente_telefono}
                    variante="tabla"
                  />
                </Td>
              </Tr>
            )
          })}
        </Tbody>
      </Tabla>
    </div>
  )
}
