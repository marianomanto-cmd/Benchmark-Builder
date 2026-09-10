'use client'

import { MessageCircle, Plus, TriangleAlert, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { buscarPacientes } from '@/app/actions/catalogo'
import {
  Banner,
  Button,
  Card,
  EmptyState,
  MicroBadge,
  Skeleton,
  Tabla,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/components/ui'
import { normalizar, numero } from '@/lib/formato'
import { useAtajos } from '@/lib/hooks/use-atajos'
import type { Paciente } from '@/lib/types'
import { cn } from '@/lib/utils'

import { CampoBusqueda } from './campo-busqueda'
import { DrawerPaciente } from './drawer-paciente'
import type { FilaPaciente, OpcionObraSocial } from './tipos'

const ID_BUSQUEDA = 'busqueda-pacientes'

/** Desde cuántos caracteres tiene sentido preguntarle a la base. */
const MINIMO_REMOTO = 2

/** Cuánto se espera a que la mano frene antes de consultar. */
const ESPERA_MS = 250

/**
 * Tab de pacientes.
 *
 * El filtrado es en el cliente sobre las fichas que ya vinieron: es
 * instantáneo mientras se tipea. Pero la lista llega recortada, y ese
 * filtro sólo mira lo que llegó — el paciente 900 no aparecía nunca
 * aunque la pantalla invitara a escribir su apellido. Cuando la lista
 * está recortada, la búsqueda además le pregunta a la base y las dos
 * respuestas se unen: lo local aparece al toque, lo remoto completa.
 *
 * Editar no recarga la lista de golpe: la fila se parchea en el lugar y
 * el refresh del servidor llega después. Así no se pierde el scroll ni
 * la búsqueda, que es lo que pasaba cargando cuarenta teléfonos
 * seguidos.
 */
export function PanelPacientes({
  filas,
  obrasSociales,
  truncado,
  limite,
  total,
}: {
  filas: FilaPaciente[]
  obrasSociales: OpcionObraSocial[]
  truncado: boolean
  limite: number
  /** Cuántas fichas hay en la base, no cuántas llegaron. */
  total: number
}) {
  const router = useRouter()
  const [busqueda, setBusqueda] = React.useState('')
  const [editando, setEditando] = React.useState<{ fila: FilaPaciente | null } | null>(null)

  // Lo que se guardó en esta sesión, para no esperar al refresh.
  const [parches, setParches] = React.useState<Record<string, FilaPaciente>>({})
  const [recien, setRecien] = React.useState<string | null>(null)

  // El resultado remoto guarda con qué texto se pidió: así «está
  // vigente» se deriva en el render y no hace falta limpiarlo desde un
  // efecto, que es lo que dispara renders en cascada.
  const [remoto, setRemoto] = React.useState<{ q: string; filas: FilaPaciente[] } | null>(null)
  const [errorRemoto, setErrorRemoto] = React.useState<{ q: string; mensaje: string } | null>(
    null,
  )

  useAtajos({
    '/': () => {
      const campo = document.getElementById(ID_BUSQUEDA)
      if (campo instanceof HTMLInputElement) {
        campo.focus()
        campo.select()
      }
    },
  })

  const nombrePorOs = React.useMemo(
    () => new Map(obrasSociales.map((o) => [o.id, o.nombre] as const)),
    [obrasSociales],
  )

  const aFila = React.useCallback(
    (p: Paciente): FilaPaciente => ({
      id: p.id,
      nombre: p.nombre,
      dni: p.dni,
      telefono: p.telefono,
      tiene_whatsapp: p.tiene_whatsapp,
      email: p.email,
      obra_social_id: p.obra_social_id,
      obra_social: p.obra_social_id ? (nombrePorOs.get(p.obra_social_id) ?? null) : null,
      nro_afiliado: p.nro_afiliado,
      notas_internas: p.notas_internas,
    }),
    [nombrePorOs],
  )

  const consulta = busqueda.trim()

  /** Con la lista recortada, lo que llegó no alcanza: hay que preguntar. */
  const requiereRemoto = truncado && consulta.length >= MINIMO_REMOTO

  const filasRemotas = remoto && remoto.q === consulta ? remoto.filas : null
  const mensajeRemoto = errorRemoto && errorRemoto.q === consulta ? errorRemoto.mensaje : null
  const buscandoRemoto = requiereRemoto && filasRemotas === null && mensajeRemoto === null

  /* ── Búsqueda contra la base, sólo si la lista vino recortada ── */
  React.useEffect(() => {
    if (!requiereRemoto) return

    let vigente = true
    const temporizador = setTimeout(() => {
      buscarPacientes(consulta)
        .then((resultado) => {
          if (!vigente) return
          if (resultado.ok) setRemoto({ q: consulta, filas: resultado.data.map(aFila) })
          else setErrorRemoto({ q: consulta, mensaje: resultado.error })
        })
        .catch(() => {
          if (!vigente) return
          setErrorRemoto({ q: consulta, mensaje: 'No se pudo buscar en la base.' })
        })
    }, ESPERA_MS)

    return () => {
      vigente = false
      clearTimeout(temporizador)
    }
  }, [consulta, requiereRemoto, aFila])

  /* ── Lo que se ve ── */

  const conParches = React.useCallback(
    (lista: FilaPaciente[]) => lista.map((f) => parches[f.id] ?? f),
    [parches],
  )

  const visibles = React.useMemo(() => {
    const q = normalizar(consulta)

    function coincide(f: FilaPaciente): boolean {
      if (!q) return true
      if (normalizar(f.nombre).includes(q)) return true
      if (!f.dni) return false
      // El DNI se busca también sin puntos: se carga de las dos maneras.
      const soloDigitos = q.replace(/\D/g, '')
      return soloDigitos.length > 0 && f.dni.replace(/\D/g, '').includes(soloDigitos)
    }

    const locales = conParches(filas).filter(coincide)

    // Las altas de esta sesión pueden no estar todavía en `filas`.
    const nuevas = Object.values(parches).filter(
      (f) => !filas.some((original) => original.id === f.id) && coincide(f),
    )

    const unidas = new Map<string, FilaPaciente>()
    for (const f of [...nuevas, ...locales]) unidas.set(f.id, f)

    if (filasRemotas) {
      for (const f of conParches(filasRemotas)) {
        if (!unidas.has(f.id)) unidas.set(f.id, f)
      }
    }

    return Array.from(unidas.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [filas, consulta, filasRemotas, parches, conParches])

  /** Cerró el drawer con éxito: la fila se actualiza donde está. */
  function alGuardar(paciente: Paciente) {
    const fila = aFila(paciente)
    setParches((previos) => ({ ...previos, [fila.id]: fila }))
    setRecien(fila.id)
    // El servidor sigue siendo la verdad: el parche sólo evita el salto.
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
        <CampoBusqueda
          id={ID_BUSQUEDA}
          valor={busqueda}
          onCambiar={setBusqueda}
          placeholder="Buscar por nombre o DNI"
          etiqueta="Buscar pacientes"
          className="sm:max-w-[340px] sm:flex-1"
          estado={buscandoRemoto ? 'buscando…' : undefined}
        />

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

      {mensajeRemoto && (
        <Banner
          tono="warm"
          icono={<TriangleAlert className="size-4" />}
          titulo="No se pudo buscar en la base"
        >
          {mensajeRemoto} Mientras tanto se muestran los pacientes que ya estaban cargados en la
          pantalla.
        </Banner>
      )}

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
        buscandoRemoto ? (
          <ListaEsqueleto />
        ) : (
          <div className="py-8 text-center">
            <p className="t-helper">Ningún paciente coincide con «{busqueda}».</p>
            <Button
              variant="secondary"
              size="touch"
              className="mt-3"
              onClick={() => setEditando({ fila: null })}
            >
              <Plus aria-hidden />
              Crear a «{busqueda.trim()}»
            </Button>
          </div>
        )
      ) : (
        <>
          <p className="t-label" aria-live="polite">
            {numero(visibles.length)} {visibles.length === 1 ? 'paciente' : 'pacientes'}
            {!consulta && truncado && ` de ${numero(total)}`}
            {consulta && buscandoRemoto && ' · buscando en la base…'}
          </p>

          {truncado && !consulta && (
            <p className="t-helper">
              La lista muestra los primeros {numero(limite)} de {numero(total)} por orden
              alfabético. Escribí el apellido o el DNI y se busca en toda la base.
            </p>
          )}

          {/*
            La tabla aparece en `lg`, no en `md`: su ancho mínimo es de
            1003px y mostrarla desde 768 hacía que la página entera
            scrolleara de costado. Debajo de eso mandan las cards, que
            no son «la versión de mobile» sino la que funciona cuando no
            hay ancho para todas las columnas.
          */}
          <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest lg:block">
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
                  <Tr key={fila.id} className={cn(recien === fila.id && 'bg-tint')}>
                    <Td className="pl-5">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-ink">{fila.nombre}</span>
                        {recien === fila.id && <MicroBadge tono="primary">Guardado</MicroBadge>}
                      </span>
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
                    <Td>{fila.obra_social ?? <MicroBadge>Particular</MicroBadge>}</Td>
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

          <ul className="flex flex-col gap-3 lg:hidden">
            {visibles.map((fila) => (
              <li key={fila.id}>
                <Card className={cn('p-4', recien === fila.id && 'bg-tint')}>
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

          {buscandoRemoto && <p className="t-helper">Buscando en el resto de la base…</p>}
        </>
      )}

      {editando && (
        <DrawerPaciente
          key={editando.fila?.id ?? 'nuevo'}
          paciente={editando.fila}
          obrasSociales={obrasSociales}
          nombreSugerido={editando.fila ? undefined : busqueda.trim()}
          onCerrar={() => setEditando(null)}
          onGuardado={alGuardar}
        />
      )}
    </section>
  )
}

/** Esqueleto con la forma de la lista: no salta nada cuando llega. */
function ListaEsqueleto() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-card shimmer" />
      ))}
    </div>
  )
}
