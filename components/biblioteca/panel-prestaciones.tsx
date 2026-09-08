'use client'

import { Plus, Search, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { toggleActivaPrestacion } from '@/app/actions/catalogo'
import {
  Button,
  Card,
  EmptyState,
  Input,
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
import { cn } from '@/lib/utils'

import { DrawerPrestacion } from './drawer-prestacion'
import { etiquetaCobertura, type FilaPrestacion } from './tipos'

/** Cuántas coberturas se muestran antes de colapsar en `+N`. */
const PILLS_VISIBLES = 2

/**
 * Tab de prestaciones.
 *
 * Dos decisiones que se leen en la pantalla:
 *
 * - Las inactivas no desaparecen: se atenúan y muestran su conteo
 *   histórico. Viven dentro de presupuestos emitidos, así que borrarlas
 *   dejaría documentos sin respaldo. Por eso la acción es desactivar.
 * - Cuando faltan aranceles se dice cuántos faltan, en warm, en vez de
 *   mostrar la fila como si estuviera completa.
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
  const [, iniciar] = React.useTransition()

  const visibles = React.useMemo(() => {
    const q = normalizar(busqueda)
    if (!q) return filas
    return filas.filter((f) =>
      normalizar(`${f.nombre} ${f.codigo ?? ''} ${f.rubro ?? ''}`).includes(q),
    )
  }, [filas, busqueda])

  function alternar(fila: FilaPrestacion) {
    setTocando(fila.id)
    iniciar(async () => {
      const resultado = await toggleActivaPrestacion(fila.id, !fila.activa)
      setTocando(null)

      if (!resultado.ok) {
        toast.error(resultado.error)
        return
      }

      toast.success(
        fila.activa
          ? `«${fila.nombre}» quedó inactiva. Sigue en los presupuestos ya emitidos.`
          : `«${fila.nombre}» vuelve a ofrecerse al armar un presupuesto.`,
      )
      router.refresh()
    })
  }

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
            placeholder="Buscar por nombre, código o rubro"
            aria-label="Buscar prestaciones"
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
        <p className="t-helper py-8 text-center">
          Ninguna prestación coincide con «{busqueda}».
        </p>
      ) : (
        <>
          <p className="t-label">
            {numero(visibles.length)}{' '}
            {visibles.length === 1 ? 'prestación' : 'prestaciones'}
            {obrasSocialesActivas > 0 &&
              ` · ${numero(obrasSocialesActivas)} ${
                obrasSocialesActivas === 1 ? 'obra social activa' : 'obras sociales activas'
              }`}
          </p>

          {/* Desktop: tabla. */}
          <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest md:block">
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
                  <Tr key={fila.id} className={cn(!fila.activa && 'opacity-60')}>
                    <Td className="pl-5">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-ink">{fila.nombre}</span>
                        {!fila.activa && <MicroBadge>Inactiva</MicroBadge>}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditando({ fila })}
                        >
                          Editar
                        </Button>
                        <Button
                          variant={fila.activa ? 'ghost' : 'secondary'}
                          size="sm"
                          loading={tocando === fila.id}
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
          <ul className="flex flex-col gap-3 md:hidden">
            {visibles.map((fila) => (
              <li key={fila.id}>
                <Card className={cn('p-4', !fila.activa && 'opacity-60')}>
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

                  {!fila.activa && (
                    <p className="mt-3 t-helper">
                      Inactiva · {textoUsos(fila.usos)}
                    </p>
                  )}

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
                      loading={tocando === fila.id}
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
          onCerrar={() => setEditando(null)}
          onGuardado={() => router.refresh()}
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
 * completa porque tiene dos pills.
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
        <Link href="/biblioteca/aranceles" className="rounded-pill">
          <Pill tono="warm" size="md" className="cursor-pointer hover:bg-warm">
            Faltan {fila.faltan} OS
          </Pill>
        </Link>
      )}
    </span>
  )
}
