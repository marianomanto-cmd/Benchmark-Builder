'use client'

import { BadgeCheck, Plus } from 'lucide-react'
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

import { DrawerObraSocial } from './drawer-obra-social'
import { nombreObraSocial, type FilaObraSocial } from './tipos'

/**
 * Tab de obras sociales.
 *
 * Las dos columnas de contexto —pacientes y aranceles vigentes— están
 * para responder de un vistazo la pregunta que aparece cuando una
 * prestación dice «faltan 6 OS»: cuál de todas está sin cargar.
 */
export function PanelObrasSociales({ filas }: { filas: FilaObraSocial[] }) {
  const router = useRouter()
  const [editando, setEditando] = React.useState<{ fila: FilaObraSocial | null } | null>(null)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="t-label">
          {numero(filas.length)} {filas.length === 1 ? 'obra social' : 'obras sociales'}
        </p>
        <Button
          variant="primary"
          size="touch"
          className="sm:h-[34px]"
          onClick={() => setEditando({ fila: null })}
        >
          <Plus aria-hidden />
          Nueva obra social
        </Button>
      </div>

      {filas.length === 0 ? (
        <EmptyState
          icono={<BadgeCheck className="size-7" aria-hidden />}
          titulo="Todavía no hay obras sociales"
          descripcion="Cargá las que atendés, con su plan. Cada plan va aparte porque cubre distinto."
          acciones={
            <Button variant="primary" size="touch" onClick={() => setEditando({ fila: null })}>
              <Plus aria-hidden />
              Crear la primera
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest md:block">
            <Tabla>
              <Thead>
                <tr>
                  <Th className="pl-5">Obra social</Th>
                  <Th numerico>Pacientes</Th>
                  <Th numerico>Aranceles vigentes</Th>
                  <Th>Notas</Th>
                  <Th className="pr-5 text-right">
                    <span className="sr-only">Acciones</span>
                  </Th>
                </tr>
              </Thead>

              <Tbody>
                {filas.map((fila) => (
                  <Tr key={fila.id} className={cn(!fila.activa && 'opacity-60')}>
                    <Td className="pl-5">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-ink">
                          {nombreObraSocial(fila.nombre, fila.plan)}
                        </span>
                        {!fila.activa && <MicroBadge>Inactiva</MicroBadge>}
                      </span>
                    </Td>
                    <Td numerico>{numero(fila.pacientes)}</Td>
                    <Td numerico>
                      {fila.aranceles === 0 ? (
                        <span className="t-helper">Sin cargar</span>
                      ) : (
                        numero(fila.aranceles)
                      )}
                    </Td>
                    <Td>
                      <span className="block max-w-[280px] truncate t-helper">
                        {fila.notas ?? '—'}
                      </span>
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
                <Card className={cn('p-4', !fila.activa && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-[15px] font-medium text-ink">
                        {nombreObraSocial(fila.nombre, fila.plan)}
                      </p>
                      <p className="t-helper">
                        {numero(fila.pacientes)}{' '}
                        {fila.pacientes === 1 ? 'paciente' : 'pacientes'} ·{' '}
                        {fila.aranceles === 0
                          ? 'sin aranceles'
                          : `${numero(fila.aranceles)} aranceles vigentes`}
                      </p>
                    </div>
                    {!fila.activa && <MicroBadge>Inactiva</MicroBadge>}
                  </div>

                  {fila.notas && <p className="mt-2 t-helper">{fila.notas}</p>}

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
        <DrawerObraSocial
          key={editando.fila?.id ?? 'nueva'}
          obraSocial={editando.fila}
          onCerrar={() => setEditando(null)}
          onGuardado={() => router.refresh()}
        />
      )}
    </section>
  )
}
