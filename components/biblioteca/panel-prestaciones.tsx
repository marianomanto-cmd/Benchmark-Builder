'use client'

import { Plus, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { toggleActivaPrestacion } from '@/app/actions/catalogo'
import {
  Button,
  Card,
  EmptyState,
  MicroBadge,
  Monto,
  Pill,
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
import { DrawerPrestacion } from './drawer-prestacion'
import { etiquetaCobertura, type FilaPrestacion } from './tipos'

/** Cuántas coberturas se muestran antes de colapsar en `+N`. */
const PILLS_VISIBLES = 2

const ID_BUSQUEDA = 'busqueda-prestaciones'

/**
 * Tab de prestaciones.
 *
 * Tres decisiones que se leen en la pantalla:
 *
 * - Las inactivas no desaparecen: se atenúan y muestran su conteo
 *   histórico. Viven dentro de presupuestos emitidos, así que borrarlas
 *   dejaría documentos sin respaldo. Por eso la acción es desactivar.
 * - Cuando faltan aranceles se dice cuántos faltan, en warm, y el pill
 *   lleva a la grilla ya filtrada por esa prestación: la pregunta que
 *   sigue siempre es «¿cuáles?».
 * - Activar y desactivar se ve al instante y vuelve atrás solo si el
 *   servidor rechaza: es un interruptor, no un trámite.
 */
export function PanelPrestaciones({
  filas,
  rubros,
  obrasSocialesActivas,
}: {
  filas: FilaPrestacion[]
  rubros: string[]
  obrasSocialesActivas: number
}) {
  const router = useRouter()
  const [busqueda, setBusqueda] = React.useState('')
  const [editando, setEditando] = React.useState<{ fila: FilaPrestacion | null } | null>(null)
  const [tocando, setTocando] = React.useState<string | null>(null)
  const [recien, setRecien] = React.useState<string | null>(null)
  // Lo que ya se ve como activo/inactivo antes de que conteste la base.
  const [optimista, setOptimista] = React.useState<Record<string, boolean>>({})
  const [, iniciar] = React.useTransition()

  useAtajos({
    '/': () => {
      const campo = document.getElementById(ID_BUSQUEDA)
      if (campo instanceof HTMLInputElement) {
        campo.focus()
        campo.select()
      }
    },
  })

  const conEstado = React.useMemo(
    () =>
      filas.map((f) =>
        optimista[f.id] === undefined ? f : { ...f, activa: optimista[f.id] },
      ),
    [filas, optimista],
  )

  const visibles = React.useMemo(() => {
    const q = normalizar(busqueda)
    if (!q) return conEstado
    return conEstado.filter((f) =>
      normalizar(`${f.nombre} ${f.codigo ?? ''} ${f.rubro ?? ''}`).includes(q),
    )
  }, [conEstado, busqueda])

  function alternar(fila: FilaPrestacion) {
    const objetivo = !fila.activa

    // Optimismo: el interruptor cambia ya. Si el servidor dice que no,
    // vuelve solo y el toast explica por qué.
    setOptimista((previos) => ({ ...previos, [fila.id]: objetivo }))
    setTocando(fila.id)

    iniciar(async () => {
      const resultado = await toggleActivaPrestacion(fila.id, objetivo)
      setTocando(null)

      if (!resultado.ok) {
        setOptimista((previos) => {
          const copia = { ...previos }
          delete copia[fila.id]
          return copia
        })
        toast.error(resultado.error)
        return
      }

      toast.success(
        objetivo
          ? `«${fila.nombre}» vuelve a ofrecerse al armar un presupuesto.`
          : `«${fila.nombre}» quedó inactiva. Sigue en los presupuestos ya emitidos.`,
      )
      router.refresh()
    })
  }

  /** Guardó: se marca la fila donde está en vez de saltar al principio. */
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
        <CampoBusqueda
          id={ID_BUSQUEDA}
          valor={busqueda}
          onCambiar={setBusqueda}
          placeholder="Buscar por nombre, código o rubro"
          etiqueta="Buscar prestaciones"
          className="sm:max-w-[340px] sm:flex-1"
        />

        <Button
          variant="primary"
          size="touch"
          className="sm:h-[34px]"
          onClick={() => setEditando({ fila: null })}
        >
          <Plus aria-hidden />
          Nueva prestación
        </Button>
      </div>

      {filas.length === 0 ? (
        <EmptyState
          icono={<Stethoscope className="size-7" aria-hidden />}
          titulo="Todavía no hay prestaciones"
          descripcion="Cargá las que hacés en el consultorio. Después les ponés precio particular y coberturas en Aranceles."
          acciones={
            <Button variant="primary" size="touch" onClick={() => setEditando({ fila: null })}>
              <Plus aria-hidden />
              Crear la primera
            </Button>
          }
        />
      ) : visibles.length === 0 ? (
        <div className="py-8 text-center">
          <p className="t-helper">Ninguna prestación coincide con «{busqueda}».</p>
          <Button
            variant="secondary"
            size="touch"
            className="mt-3"
            onClick={() => setEditando({ fila: null })}
          >
            <Plus aria-hidden />
            Crear «{busqueda.trim()}»
          </Button>
        </div>
      ) : (
        <>
          <p className="t-label" aria-live="polite">
            {numero(visibles.length)}{' '}
            {visibles.length === 1 ? 'prestación' : 'prestaciones'}
            {visibles.length !== filas.length && ` de ${numero(filas.length)}`}
            {obrasSocialesActivas > 0 &&
              ` · ${numero(obrasSocialesActivas)} ${
                obrasSocialesActivas === 1 ? 'obra social activa' : 'obras sociales activas'
              }`}
          </p>

          {/* Desktop: tabla. */}
          {/*
            La tabla aparece en `lg`, no en `md`: su ancho mínimo es de
            843px y mostrarla desde 768 hacía que la página entera
            scrolleara de costado. Debajo de eso mandan las cards, que
            no son «la versión de mobile» sino la que funciona cuando no
            hay ancho para todas las columnas.
          */}
          <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest lg:block">
            <Tabla>
              <Thead>
                <tr>
                  <Th className="pl-5">Prestación</Th>
                  <Th>Rubro</Th>
                  <Th numerico>Particular</Th>
                  <Th>Coberturas</Th>
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
                        <span className="font-medium text-ink">{fila.nombre}</span>
                        {!fila.activa && <MicroBadge>Inactiva</MicroBadge>}
                        {recien === fila.id && <MicroBadge tono="primary">Guardado</MicroBadge>}
                      </span>
                      <span className="block t-helper">
                        {fila.codigo ? `Código ${fila.codigo} · ` : ''}
                        Vale {fila.vigencia_dias} días
                        {!fila.activa && ` · ${textoUsos(fila.usos)}`}
                      </span>
                    </Td>

                    <Td>{fila.rubro ?? <span className="text-faint">Sin rubro</span>}</Td>

                    <Td numerico>
                      {fila.particular === null ? (
                        <span className="t-helper">Sin cargar</span>
                      ) : (
                        <Monto valor={fila.particular} jerarquia="fuerte" />
                      )}
                    </Td>

                    <Td>
                      <ResumenCoberturas fila={fila} />
                    </Td>

                    <Td className="pr-5 text-right">
                      <span className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditando({ fila })}>
                          Editar
                        </Button>
                        <Button
                          variant={fila.activa ? 'ghost' : 'secondary'}
                          size="sm"
                          disabled={tocando === fila.id}
                          onClick={() => alternar(fila)}
                        >
                          {fila.activa ? 'Desactivar' : 'Activar'}
                        </Button>
                      </span>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Tabla>
          </div>

          {/* Mobile: card por prestación, nunca tabla. */}
          <ul className="flex flex-col gap-3 lg:hidden">
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
                      <p className="font-sans text-[15px] font-medium text-ink">{fila.nombre}</p>
                      <p className="t-helper">
                        {fila.rubro ?? 'Sin rubro'}
                        {fila.codigo ? ` · ${fila.codigo}` : ''}
                      </p>
                    </div>
                    {fila.particular === null ? (
                      <span className="t-helper shrink-0">Sin cargar</span>
                    ) : (
                      <Monto valor={fila.particular} jerarquia="fuerte" className="shrink-0" />
                    )}
                  </div>

                  <div className="mt-3">
                    <ResumenCoberturas fila={fila} />
                  </div>

                  {!fila.activa && <p className="mt-3 t-helper">Inactiva · {textoUsos(fila.usos)}</p>}

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="touch"
                      full
                      onClick={() => setEditando({ fila })}
                    >
                      Editar
                    </Button>
                    <Button
                      variant={fila.activa ? 'ghost' : 'secondary'}
                      size="touch"
                      full
                      disabled={tocando === fila.id}
                      onClick={() => alternar(fila)}
                    >
                      {fila.activa ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <p className="t-helper">
            Las prestaciones no se borran: viven dentro de presupuestos ya emitidos. Desactivarlas
            alcanza para que dejen de ofrecerse al armar uno nuevo.
          </p>
        </>
      )}

      {editando && (
        <DrawerPrestacion
          key={editando.fila?.id ?? 'nueva'}
          prestacion={editando.fila}
          rubros={rubros}
          nombreSugerido={editando.fila ? undefined : busqueda.trim()}
          onCerrar={() => setEditando(null)}
          onGuardado={alGuardar}
        />
      )}
    </section>
  )
}

/** `Se usó en 12 presupuestos` — el conteo histórico de una inactiva. */
function textoUsos(usos: number): string {
  if (usos === 0) return 'Nunca se usó en un presupuesto'
  if (usos === 1) return 'Se usó en 1 presupuesto'
  return `Se usó en ${numero(usos)} presupuestos`
}

/**
 * Pills de cobertura por obra social. Cuando falta cargar aranceles se
 * dice cuántos faltan en warm: es más honesto que una fila que parece
 * completa porque tiene dos pills. El pill lleva a la grilla filtrada
 * por esta prestación, que es donde se ve cuáles faltan.
 */
function ResumenCoberturas({ fila }: { fila: FilaPrestacion }) {
  const visibles = fila.coberturas.slice(0, PILLS_VISIBLES)
  const resto = fila.coberturas.length - visibles.length

  if (fila.coberturas.length === 0 && fila.faltan === 0) {
    return <span className="t-helper">Sólo particular</span>
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {visibles.map((c) => (
        <Pill key={c.obra_social_id} tono="neutro" size="md">
          {c.obra_social} {etiquetaCobertura(c.tipo, c.valor)}
        </Pill>
      ))}

      {resto > 0 && (
        <Pill tono="contorno" size="md">
          +{resto}
        </Pill>
      )}

      {fila.faltan > 0 && (
        <Link
          href={`/biblioteca/aranceles?q=${encodeURIComponent(fila.nombre)}`}
          className="rounded-pill"
          aria-label={`Ver en la grilla las ${fila.faltan} obras sociales sin arancel para ${fila.nombre}`}
        >
          <Pill tono="warm" size="md" className="cursor-pointer hover:bg-warm">
            Faltan {fila.faltan} OS
          </Pill>
        </Link>
      )}
    </span>
  )
}
