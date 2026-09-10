'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Lock, SearchX, Stethoscope, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  Banner,
  Button,
  EmptyState,
  Kbd,
  Segmented,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { normalizar, numero } from '@/lib/formato'
import { useAtajos } from '@/lib/hooks/use-atajos'

import { CampoBusqueda } from './campo-busqueda'
import { DrawerHistorial } from './drawer-historial'
import { FormVigencia } from './form-vigencia'
import { GrillaAranceles, ListaArancelesMobile } from './grilla-aranceles'
import { HistoricoAranceles } from './historico-aranceles'
import { ModalAumentoMasivo } from './modal-aumento-masivo'
import {
  esAbierta,
  type Arancel,
  type ArancelProgramado,
  type Celda,
  type CeldaVigente,
  type ColumnaObraSocial,
  type FilaHistorico,
  type PrestacionGrilla,
  type VistaAranceles,
} from './tipos'

const OPCIONES_VISTA: { value: VistaAranceles; label: string }[] = [
  { value: 'vigentes', label: 'Vigentes hoy' },
  { value: 'historico', label: 'Histórico completo' },
]

const TODOS = '__todos__'
const SIN_RUBRO = '__sin_rubro__'

/** Id del buscador de la grilla: lo enfoca el atajo `/`. */
const ID_BUSQUEDA = 'busqueda-aranceles'

/**
 * Pantalla 10 — Aranceles.
 *
 * Orquesta las cuatro piezas que hacen legible el modelo append-only:
 * los filtros que hacen navegable una grilla de cientos de celdas, la
 * grilla de lo que rige hoy, el drawer con el historial de una
 * combinación, y el form de vigencia nueva que enumera las
 * consecuencias antes de guardar.
 *
 * El índice de celdas guarda dos cosas por combinación: lo que se
 * cotiza hoy y la vigencia programada, si la hay. Las dos hacen falta:
 * la de hoy es la que se muestra, la programada es la que se va a
 * cerrar cuando se cargue la siguiente.
 */
export function PantallaAranceles({
  vista,
  busquedaInicial,
  prestaciones,
  columnas,
  vigentes,
  programadas,
  rubros,
  historico,
  historicoTruncado,
  limiteHistorico,
}: {
  vista: VistaAranceles
  /** Filtro que llega por `?q=`, para entrar directo a una prestación. */
  busquedaInicial?: string
  prestaciones: PrestacionGrilla[]
  columnas: ColumnaObraSocial[]
  vigentes: CeldaVigente[]
  programadas: ArancelProgramado[]
  rubros: string[]
  historico: FilaHistorico[] | null
  historicoTruncado: boolean
  limiteHistorico: number
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [detalle, setDetalle] = React.useState<Celda | null>(null)
  const [formulario, setFormulario] = React.useState<Celda | null>(null)
  const [aumento, setAumento] = React.useState(false)

  const [busqueda, setBusqueda] = React.useState(busquedaInicial ?? '')
  const [rubro, setRubro] = React.useState<string>(TODOS)
  const [soloIncompletas, setSoloIncompletas] = React.useState(false)

  // Índice por (prestación, obra social). La clave usa '' para la
  // columna Particular, que en la base es `obra_social_id is null`.
  const indice = React.useMemo(() => {
    interface Entrada {
      vigente: CeldaVigente | null
      programada: ArancelProgramado | null
      abierta: Arancel | null
    }
    const mapa = new Map<string, Entrada>()

    const clave = (a: { prestacion_id: string; obra_social_id: string | null }) =>
      `${a.prestacion_id}|${a.obra_social_id ?? ''}`

    for (const v of vigentes) {
      mapa.set(clave(v), { vigente: v, programada: null, abierta: esAbierta(v) ? v : null })
    }

    // Vienen ordenadas por fecha: la primera de cada celda es la que va
    // a arrancar, así que las siguientes no pisan `programada`. La
    // abierta, en cambio, es la única con `vigente_hasta` en null —
    // encadenando dos aumentos, es la última, no la primera.
    for (const p of programadas) {
      const previo = mapa.get(clave(p))
      if (!previo) {
        mapa.set(clave(p), {
          vigente: null,
          programada: p,
          abierta: esAbierta(p) ? p : null,
        })
        continue
      }
      if (!previo.programada) previo.programada = p
      if (esAbierta(p)) previo.abierta = p
    }

    return mapa
  }, [vigentes, programadas])

  const celdaDe = React.useCallback(
    (prestacion: PrestacionGrilla, columna: ColumnaObraSocial): Celda => {
      const dato = indice.get(`${prestacion.id}|${columna.id ?? ''}`)
      return {
        prestacion_id: prestacion.id,
        prestacion: prestacion.nombre,
        obra_social_id: columna.id,
        obra_social: columna.nombre,
        vigente: dato?.vigente ?? null,
        programada: dato?.programada ?? null,
        abierta: dato?.abierta ?? null,
      }
    },
    [indice],
  )

  /** Celdas de una prestación que todavía no tienen ningún arancel. */
  const faltantesDe = React.useCallback(
    (prestacionId: string) =>
      columnas.reduce(
        (n, c) => (indice.has(`${prestacionId}|${c.id ?? ''}`) ? n : n + 1),
        0,
      ),
    [columnas, indice],
  )

  const visibles = React.useMemo(() => {
    const q = normalizar(busqueda)

    function coincideRubro(propio: string | null): boolean {
      if (rubro === TODOS) return true
      if (rubro === SIN_RUBRO) return propio === null
      return propio === rubro
    }

    return prestaciones.filter((p) => {
      if (!coincideRubro(p.rubro)) return false
      if (soloIncompletas && faltantesDe(p.id) === 0) return false
      if (!q) return true
      return normalizar(`${p.nombre} ${p.codigo ?? ''} ${p.rubro ?? ''}`).includes(q)
    })
  }, [prestaciones, busqueda, rubro, soloIncompletas, faltantesDe])

  const conteo = React.useMemo(() => {
    let cargadas = 0
    for (const p of visibles) cargadas += columnas.length - faltantesDe(p.id)
    return { cargadas, total: visibles.length * columnas.length }
  }, [visibles, columnas.length, faltantesDe])

  const filtrando = busqueda.trim() !== '' || rubro !== TODOS || soloIncompletas

  /** Después de tocar una vigencia hay que refrescar grilla e historial. */
  const refrescar = React.useCallback(
    (celda: Celda) => {
      queryClient.invalidateQueries({
        queryKey: ['vigencias', celda.prestacion_id, celda.obra_social_id],
      })
      router.refresh()
    },
    [queryClient, router],
  )

  function cambiarVista(nueva: VistaAranceles) {
    // La vista vive en la URL: se puede compartir el histórico y el
    // botón atrás vuelve a la grilla. La búsqueda viaja con ella para no
    // tener que volver a tipear el nombre al cruzar de vista.
    const parametros = new URLSearchParams({ vista: nueva })
    if (busqueda.trim()) parametros.set('q', busqueda.trim())
    router.push(`/biblioteca/aranceles?${parametros}`, { scroll: false })
  }

  const hayAranceles = vigentes.length > 0 || programadas.length > 0

  useAtajos({
    '/': () => {
      const campo = document.getElementById(ID_BUSQUEDA)
      if (campo instanceof HTMLInputElement) {
        campo.focus()
        campo.select()
      }
    },
    a: () => {
      if (hayAranceles) setAumento(true)
    },
  })

  const props = { prestaciones: visibles, columnas, celdaDe, onAbrir: setDetalle, onCargar: setFormulario }

  return (
    <div className="animate-enter flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="t-h2">Aranceles</h1>
          <p className="mt-1 t-helper">
            Precios y coberturas vigentes.{' '}
            <Link
              href="/biblioteca?tab=prestaciones"
              className="text-primary underline-offset-4 hover:underline"
            >
              Volver a la biblioteca
            </Link>
          </p>
        </div>

        <Button
          variant="primary"
          size="touch"
          className="sm:h-[34px]"
          onClick={() => setAumento(true)}
          disabled={!hayAranceles}
        >
          <TrendingUp aria-hidden />
          Aumento masivo
          <Kbd className="ml-1">A</Kbd>
        </Button>
      </header>

      {/* Banner permanente: es la explicación del modelo, no un aviso
          puntual, así que no se puede cerrar. */}
      <Banner tono="info" icono={<Lock className="size-4" />} titulo="Los aranceles no se editan">
        Cada cambio de precio abre una vigencia nueva y cierra la anterior. Así un presupuesto
        viejo sigue mostrando lo que se le prometió al paciente.
      </Banner>

      <Segmented
        value={vista}
        onChange={cambiarVista}
        opciones={OPCIONES_VISTA}
        className="self-start"
      />

      {prestaciones.length === 0 ? (
        <EmptyState
          icono={<Stethoscope className="size-7" aria-hidden />}
          titulo="Todavía no hay prestaciones"
          descripcion="La grilla cruza prestaciones con obras sociales: primero cargá al menos una prestación."
          acciones={
            <Button variant="primary" size="touch" asChild>
              <Link href="/biblioteca?tab=prestaciones">Ir a Prestaciones</Link>
            </Button>
          }
        />
      ) : vista === 'historico' ? (
        <HistoricoAranceles
          filas={historico ?? []}
          truncado={historicoTruncado}
          limite={limiteHistorico}
          busquedaInicial={busqueda}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <CampoBusqueda
              id={ID_BUSQUEDA}
              valor={busqueda}
              onCambiar={setBusqueda}
              etiqueta="Buscar prestaciones en la grilla"
              placeholder="Buscar prestación, código o rubro"
              className="sm:max-w-[320px] sm:flex-1"
            />

            <div className="flex flex-wrap items-center gap-2">
              {rubros.length > 0 && (
                <Select value={rubro} onValueChange={setRubro}>
                  <SelectTrigger
                    id="filtro-rubro"
                    aria-label="Filtrar por rubro"
                    className="h-11 w-auto min-w-[180px] sm:h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos los rubros</SelectItem>
                    {rubros.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                    <SelectItem value={SIN_RUBRO}>Sin rubro</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button
                type="button"
                variant={soloIncompletas ? 'secondary' : 'ghost'}
                size="touch"
                className="sm:h-9"
                aria-pressed={soloIncompletas}
                onClick={() => setSoloIncompletas((v) => !v)}
              >
                Sólo incompletas
              </Button>
            </div>
          </div>

          {visibles.length === 0 ? (
            <EmptyState
              icono={<SearchX className="size-7" aria-hidden />}
              titulo="Ninguna prestación coincide"
              descripcion={
                soloIncompletas
                  ? 'Con este filtro no queda ninguna: todas las prestaciones que coinciden ya tienen sus aranceles cargados.'
                  : 'Probá con otro nombre, código o rubro.'
              }
              acciones={
                <Button
                  variant="secondary"
                  size="touch"
                  onClick={() => {
                    setBusqueda('')
                    setRubro(TODOS)
                    setSoloIncompletas(false)
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              <p className="t-label" aria-live="polite">
                {numero(visibles.length)}{' '}
                {visibles.length === 1 ? 'prestación' : 'prestaciones'}
                {filtrando && ` de ${numero(prestaciones.length)}`} ·{' '}
                {numero(conteo.cargadas)} de {numero(conteo.total)} celdas con precio
              </p>

              <GrillaAranceles {...props} />
              <ListaArancelesMobile {...props} />
              <p className="t-helper">
                Tocá una celda para ver su historial de vigencias. Las que tienen candado ya se
                usaron en presupuestos emitidos: se les carga una vigencia nueva, no se editan.
              </p>
            </>
          )}
        </>
      )}

      {detalle && (
        <DrawerHistorial
          key={`${detalle.prestacion_id}|${detalle.obra_social_id ?? ''}`}
          celda={detalle}
          onCerrar={() => setDetalle(null)}
          onNuevaVigencia={() => {
            // El form reemplaza al drawer: los dos abiertos a la vez
            // taparían justamente el historial que se está mirando.
            setFormulario(detalle)
            setDetalle(null)
          }}
        />
      )}

      {formulario && (
        <FormVigencia
          key={`${formulario.prestacion_id}|${formulario.obra_social_id ?? ''}`}
          celda={formulario}
          onCerrar={() => setFormulario(null)}
          onGuardado={() => refrescar(formulario)}
        />
      )}

      {aumento && (
        <ModalAumentoMasivo
          vigentes={vigentes}
          programadas={programadas}
          prestaciones={prestaciones}
          columnas={columnas}
          rubros={rubros}
          onCerrar={() => setAumento(false)}
          onAplicado={() => {
            queryClient.invalidateQueries({ queryKey: ['vigencias'] })
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
