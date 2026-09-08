'use client'

import { Plus, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  Button,
  Card,
  EmptyState,
  MicroBadge,
  Tabla,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/components/ui'
import { numero } from '@/lib/formato'
import { cn } from '@/lib/utils'

import { DrawerProfesional } from './drawer-profesional'
import type { FilaProfesional } from './tipos'

/**
 * Tab de profesionales.
 *
 * El badge «con usuario» distingue al que entra a la app del que sólo
 * figura como firmante: los dos son válidos, pero sólo el primero puede
 * emitir presupuestos por su cuenta.
 */
export function PanelProfesionales({ filas }: { filas: FilaProfesional[] }) {
  const router = useRouter()
  const [editando, setEditando] = React.useState<{ fila: FilaProfesional | null } | null>(null)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="t-label">
          {numero(filas.length)} {filas.length === 1 ? 'profesional' : 'profesionales'}
        </p>
        <Button
          variant="primary"
          size="touch"
          className="sm:h-[34px]"
          onClick={() => setEditando({ fila: null })}
        >
          <Plus aria-hidden />
          Nuevo profesional
        </Button>
      </div>

      {filas.length === 0 ? (
        <EmptyState
          icono={<UserRound className="size-7" aria-hidden />}
          titulo="Todavía no hay profesionales"
          descripcion="Sin al menos uno, un presupuesto no puede salir a nombre de nadie."
          acciones={
            <Button variant="primary" size="touch" onClick={() => setEditando({ fila: null })}>
              <Plus aria-hidden />
              Crear el primero
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest md:block">
            <Tabla>
              <Thead>
                <tr>
                  <Th className="pl-5">Profesional</Th>
                  <Th>Matrícula</Th>
                  <Th>Especialidad</Th>
                  <Th>Acceso</Th>
                  <Th className="pr-5 text-right">
                    <span className="sr-only">Acciones</span>
                  </Th>
                </tr>
              </Thead>

              <Tbody>
                {filas.map((fila) => (
                  <Tr key={fila.id} className={cn(!fila.activo && 'opacity-60')}>
                    <Td className="pl-5">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-ink">{fila.nombre}</span>
                        {!fila.activo && <MicroBadge>Inactivo</MicroBadge>}
                      </span>
                    </Td>
                    <Td className="tabular-nums">{fila.matricula ?? '—'}</Td>
                    <Td>{fila.especialidad ?? '—'}</Td>
                    <Td>
                      {fila.con_usuario ? (
                        <MicroBadge tono="primary">Con usuario</MicroBadge>
                      ) : (
                        <span className="t-helper">Sólo firmante</span>
                      )}
                    </Td>
                    <Td className="pr-5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditando({ fila })}>
                        Editar
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Tabla>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {filas.map((fila) => (
              <li key={fila.id}>
                <Card className={cn('p-4', !fila.activo && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-[15px] font-medium text-ink">{fila.nombre}</p>
                      <p className="t-helper">
                        {fila.matricula ?? 'Sin matrícula'}
                        {fila.especialidad ? ` · ${fila.especialidad}` : ''}
                      </p>
                    </div>
                    {fila.con_usuario ? (
                      <MicroBadge tono="primary">Con usuario</MicroBadge>
                    ) : !fila.activo ? (
                      <MicroBadge>Inactivo</MicroBadge>
                    ) : null}
                  </div>

                  <Button
                    variant="secondary"
                    size="touch"
                    full
                    className="mt-4"
                    onClick={() => setEditando({ fila })}
                  >
                    Editar
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {editando && (
        <DrawerProfesional
          key={editando.fila?.id ?? 'nuevo'}
          profesional={editando.fila}
          onCerrar={() => setEditando(null)}
          onGuardado={() => router.refresh()}
        />
      )}
    </section>
  )
}
