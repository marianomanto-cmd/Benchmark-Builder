'use client'

import { MessageCircle, Plus, Search, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  Button,
  Card,
  EmptyState,
  Input,
  MicroBadge,
  Tabla,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/components/ui'
import { normalizar, numero } from '@/lib/formato'

import { DrawerPaciente } from './drawer-paciente'
import type { FilaPaciente, OpcionObraSocial } from './tipos'

/**
 * Tab de pacientes, con búsqueda por nombre y DNI.
 *
 * El filtrado es en el cliente sobre las filas que ya vinieron: el
 * consultorio tiene cientos de pacientes, no millones, y así buscar es
 * instantáneo mientras se tipea. Si la lista llegó recortada, se avisa.
 */
export function PanelPacientes({
  filas,
  obrasSociales,
  truncado,
  limite,
}: {
  filas: FilaPaciente[]
  obrasSociales: OpcionObraSocial[]
  truncado: boolean
  limite: number
}) {
  const router = useRouter()
  const [busqueda, setBusqueda] = React.useState('')
  const [editando, setEditando] = React.useState<{ fila: FilaPaciente | null } | null>(null)

  const visibles = React.useMemo(() => {
    const q = normalizar(busqueda)
    if (!q) return filas
    // El DNI se busca también sin puntos: se carga de las dos maneras.
    const soloDigitos = q.replace(/\D/g, '')
    return filas.filter((f) => {
      if (normalizar(f.nombre).includes(q)) return true
      if (!f.dni) return false
      const dni = f.dni.replace(/\D/g, '')
      return soloDigitos.length > 0 && dni.includes(soloDigitos)
    })
  }, [filas, busqueda])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-[320px] sm:flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
          />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o DNI"
            aria-label="Buscar pacientes"
            className="h-11 pl-9 sm:h-9"
          />
        </div>

        <Button
          variant="primary"
          size="touch"
          className="sm:h-[34px]"
          onClick={() => setEditando({ fila: null })}
        >
          <Plus aria-hidden />
          Nuevo paciente
        </Button>
      </div>

      {filas.length === 0 ? (
        <EmptyState
          icono={<Users className="size-7" aria-hidden />}
          titulo="Todavía no hay pacientes"
          descripcion="También se crean sobre la marcha desde el wizard, sin salir del presupuesto."
          acciones={
            <Button variant="primary" size="touch" onClick={() => setEditando({ fila: null })}>
              <Plus aria-hidden />
              Crear el primero
            </Button>
          }
        />
      ) : visibles.length === 0 ? (
        <p className="t-helper py-8 text-center">Ningún paciente coincide con «{busqueda}».</p>
      ) : (
        <>
          <p className="t-label">
            {numero(visibles.length)} {visibles.length === 1 ? 'paciente' : 'pacientes'}
            {truncado && ` de los primeros ${numero(limite)}`}
          </p>

          {truncado && (
            <p className="t-helper">
              La lista muestra los primeros {numero(limite)} por orden alfabético. Si el paciente
              que buscás no aparece, escribí su apellido o su DNI completo.
            </p>
          )}

          <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest md:block">
            <Tabla>
              <Thead>
                <tr>
                  <Th className="pl-5">Paciente</Th>
                  <Th>DNI</Th>
                  <Th>Teléfono</Th>
                  <Th>Obra social</Th>
                  <Th>Afiliado</Th>
                  <Th className="pr-5 text-right">
                    <span className="sr-only">Acciones</span>
                  </Th>
                </tr>
              </Thead>

              <Tbody>
                {visibles.map((fila) => (
                  <Tr key={fila.id}>
                    <Td className="pl-5">
                      <span className="font-medium text-ink">{fila.nombre}</span>
                      {fila.email && <span className="block t-helper">{fila.email}</span>}
                    </Td>
                    <Td className="tabular-nums">{fila.dni ?? '—'}</Td>
                    <Td>
                      {fila.telefono ? (
                        <span className="flex items-center gap-1.5 tabular-nums">
                          {fila.telefono}
                          {fila.tiene_whatsapp && (
                            <MessageCircle
                              aria-label="Tiene WhatsApp"
                              className="size-3.5 shrink-0 text-primary"
                            />
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>
                      {fila.obra_social ?? <MicroBadge>Particular</MicroBadge>}
                    </Td>
                    <Td className="tabular-nums">{fila.nro_afiliado ?? '—'}</Td>
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
            {visibles.map((fila) => (
              <li key={fila.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-[15px] font-medium text-ink">{fila.nombre}</p>
                      <p className="t-helper tabular-nums">
                        {fila.dni ? `DNI ${fila.dni}` : 'Sin DNI'}
                        {fila.telefono ? ` · ${fila.telefono}` : ''}
                      </p>
                    </div>
                    {fila.obra_social ? (
                      <MicroBadge tono="primary">{fila.obra_social}</MicroBadge>
                    ) : (
                      <MicroBadge>Particular</MicroBadge>
                    )}
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
        <DrawerPaciente
          key={editando.fila?.id ?? 'nuevo'}
          paciente={editando.fila}
          obrasSociales={obrasSociales}
          onCerrar={() => setEditando(null)}
          onGuardado={() => router.refresh()}
        />
      )}
    </section>
  )
}
