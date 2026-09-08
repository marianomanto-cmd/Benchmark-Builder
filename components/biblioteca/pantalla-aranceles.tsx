'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Lock, Stethoscope, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { Banner, Button, EmptyState, Segmented } from '@/components/ui'

import { DrawerHistorial } from './drawer-historial'
import { FormVigencia } from './form-vigencia'
import { GrillaAranceles, ListaArancelesMobile } from './grilla-aranceles'
import { HistoricoAranceles } from './historico-aranceles'
import { ModalAumentoMasivo } from './modal-aumento-masivo'
import type {
  Celda,
  CeldaVigente,
  ColumnaObraSocial,
  FilaHistorico,
  PrestacionGrilla,
  VistaAranceles,
} from './tipos'

const OPCIONES_VISTA: { value: VistaAranceles; label: string }[] = [
  { value: 'vigentes', label: 'Vigentes hoy' },
  { value: 'historico', label: 'Histórico completo' },
]

/**
 * Pantalla 10 — Aranceles.
 *
 * Orquesta las tres piezas que hacen legible el modelo append-only:
 * la grilla de lo que rige hoy, el drawer con el historial de una
 * combinación, y el form de vigencia nueva que enumera las
 * consecuencias antes de guardar.
 */
export function PantallaAranceles({
  vista,
  prestaciones,
  columnas,
  vigentes,
  rubros,
  historico,
  historicoTruncado,
  limiteHistorico,
}: {
  vista: VistaAranceles
  prestaciones: PrestacionGrilla[]
  columnas: ColumnaObraSocial[]
  vigentes: CeldaVigente[]
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

  // Índice por (prestación, obra social). La clave usa '' para la
  // columna Particular, que en la base es `obra_social_id is null`.
  const indice = React.useMemo(() => {
    const mapa = new Map<string, CeldaVigente>()
    for (const v of vigentes) {
      mapa.set(`${v.prestacion_id}|${v.obra_social_id ?? ''}`, v)
    }
    return mapa
  }, [vigentes])

  const buscar = React.useCallback(
    (prestacionId: string, obraSocialId: string | null) =>
      indice.get(`${prestacionId}|${obraSocialId ?? ''}`) ?? null,
    [indice],
  )

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
    // botón atrás vuelve a la grilla.
    router.push(`/biblioteca/aranceles?vista=${nueva}`, { scroll: false })
  }

  const props = { prestaciones, columnas, buscar, onAbrir: setDetalle, onCargar: setFormulario }

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
          disabled={vigentes.length === 0}
        >
          <TrendingUp aria-hidden />
          Aumento masivo
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
        />
      ) : (
        <>
          <GrillaAranceles {...props} />
          <ListaArancelesMobile {...props} />
          <p className="t-helper">
            Tocá una celda para ver su historial de vigencias. Las que tienen candado ya se usaron
            en presupuestos emitidos: se les carga una vigencia nueva, no se editan.
          </p>
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
