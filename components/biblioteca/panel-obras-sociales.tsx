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
import { normalizar, numero } from '@/lib/formato'
import { useAtajos } from '@/lib/hooks/use-atajos'
import { cn } from '@/lib/utils'

import { CampoBusqueda } from './campo-busqueda'
import { DrawerObraSocial } from './drawer-obra-social'
import { nombreObraSocial, type FilaObraSocial } from './tipos'

const ID_BUSQUEDA = 'busqueda-obras-sociales'

/** Debajo de esto la lista entra de un vistazo y el buscador estorba. */
const MINIMO_PARA_BUSCAR = 8

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
  const [busqueda, setBusqueda] = React.useState('')
  const [recien, setRecien] = React.useState<string | null>(null)

  const conBuscador = filas.length >= MINIMO_PARA_BUSCAR

  useAtajos({
    '/': () => {
      const campo = document.getElementById(ID_BUSQUEDA)
      if (campo instanceof HTMLInputElement) {
        campo.focus()
        campo.select()
      }
    },
  })

  const visibles = React.useMemo(() => {
    const q = normalizar(busqueda)
    if (!q) return filas
    return filas.filter((f) =>
      normalizar(`${nombreObraSocial(f.nombre, f.plan)} ${f.notas ?? ''}`).includes(q),
    )
  }, [filas, busqueda])

  /** Guardó: se marca la fila donde está en vez de recargar y perder el lugar. */
  function alGuardar() {
    setRecien(editando?.fila?.id ?? null)
    router.refresh()
  }

  React.useEffect(() => {
    if (!recien) return
    const id = setTimeout(() => setRecien(null), 4000)
    return () => clearTimeout(id)
  }, [recien])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {conBuscador ? (
          <CampoBusqueda
            id={ID_BUSQUEDA}
            valor={busqueda}
            onCambiar={setBusqueda}
            placeholder="Buscar por nombre, plan o nota"
            etiqueta="Buscar obras sociales"
            className="sm:max-w-[340px] sm:flex-1"
          />
        ) : (
          <p className="t-label">
            {numero(filas.length)} {filas.length === 1 ? 'obra social' : 'obras sociales'}
          </p>
        )}
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
      ) : visibles.length === 0 ? (
        <p className="t-helper py-8 text-center">
          Ninguna obra social coincide con «{busqueda}».
        </p>
      ) : (
        <>
          {conBuscador && (
            <p className="t-label" aria-live="polite">
              {numero(visibles.length)}{' '}
              {visibles.length === 1 ? 'obra social' : 'obras sociales'}
              {visibles.length !== filas.length && ` de ${numero(filas.length)}`}
            </p>
          )}

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
                {visibles.map((fila) => (
                  <Tr
                    key={fila.id}
                    className={cn(!fila.activa && 'opacity-60', recien === fila.id && 'bg-tint')}
                  >
                    <Td className="pl-5">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-ink">
                          {nombreObraSocial(fila.nombre, fila.plan)}
                        </span>
                        {!fila.activa && <MicroBadge>Inactiva</MicroBadge>}
                        {recien === fila.id && <MicroBadge tono="primary">Guardado</MicroBadge>}
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
                      <span className="line-clamp-2 max-w-[280px] t-helper [overflow-wrap:anywhere]">
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
            {visibles.map((fila) => (
              <li key={fila.id}>
                <Card
                  className={cn(
                    'p-4',
                    !fila.activa && 'opacity-60',
                    recien === fila.id && 'bg-tint',
                  )}
                >
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
          onGuardado={alGuardar}
        />
      )}
    </section>
  )
}
