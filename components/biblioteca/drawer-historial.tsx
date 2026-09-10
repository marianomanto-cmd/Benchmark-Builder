'use client'

import { useQuery } from '@tanstack/react-query'
import { Lock, TriangleAlert } from 'lucide-react'

import { Banner, Button, Drawer, MicroBadge, Monto, Skeleton } from '@/components/ui'
import { calcularItem } from '@/lib/calculo'
import { fechaCorta, fechaLarga, isoDate, numero } from '@/lib/formato'
import { createClient } from '@/lib/supabase/client'
import type { CoberturaTipo } from '@/lib/types'

import { etiquetaCoberturaLarga, soloFecha, type Celda } from './tipos'

interface Vigencia {
  id: string
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
  vigente_desde: string
  vigente_hasta: string | null
  usos: number
}

/**
 * Historial de vigencias de una celda de la grilla.
 *
 * Se lee del cliente y no del servidor porque es una consulta puntual
 * que se dispara al abrir el drawer: traer el historial completo de
 * todas las celdas al cargar la pantalla sería tirar la base al piso
 * para mostrar algo que casi nunca se abre.
 */
export function DrawerHistorial({
  celda,
  onCerrar,
  onNuevaVigencia,
}: {
  celda: Celda
  onCerrar: () => void
  onNuevaVigencia: () => void
}) {
  const consulta = useQuery({
    queryKey: ['vigencias', celda.prestacion_id, celda.obra_social_id],
    queryFn: () => traerVigencias(celda.prestacion_id, celda.obra_social_id),
  })

  const vigencias = consulta.data ?? []
  const hoy = isoDate()

  // «Actual» es la que rige HOY, no la que tiene `vigente_hasta` en
  // null: un aumento programado hacia adelante también lo tiene, y
  // mostrarlo como actual haría creer que ya se está cotizando.
  const actual =
    vigencias.find((v) => v.vigente_desde <= hoy && (v.vigente_hasta === null || v.vigente_hasta >= hoy)) ??
    null
  const programadas = vigencias.filter((v) => v.vigente_desde > hoy)
  const cerradas = vigencias.filter(
    (v) => v.vigente_hasta !== null && v.vigente_hasta < hoy,
  )

  return (
    <Drawer
      open
      onOpenChange={(v) => {
        if (!v) onCerrar()
      }}
      titulo={celda.prestacion}
      descripcion={celda.obra_social}
      ancho="md"
      footer={
        <Button variant="primary" size="touch" full className="sm:h-[34px]" onClick={onNuevaVigencia}>
          Cargar vigencia nueva
        </Button>
      }
    >
      {consulta.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-card" />
          <Skeleton className="h-16 w-full rounded-card" />
          <Skeleton className="h-16 w-full rounded-card" />
        </div>
      ) : consulta.isError ? (
        <Banner
          tono="warm"
          icono={<TriangleAlert className="size-4" />}
          titulo="No se pudo leer el historial"
        >
          Puede ser un problema de conexión. Cerrá el panel y volvé a abrirlo.
        </Banner>
      ) : (
        <div className="space-y-6">
          {actual ? <VigenciaActual vigencia={actual} /> : <SinArancel />}

          {programadas.length > 0 && (
            <section>
              <h3 className="t-label">Ya cargadas, todavía no arrancaron</h3>
              <ul className="mt-3 space-y-2">
                {programadas.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-baseline justify-between gap-3 rounded-input border border-warm-line/25 bg-warm-soft px-3 py-2.5"
                  >
                    <span className="t-helper text-warm-ink">
                      Rige desde el {fechaCorta(v.vigente_desde)}
                    </span>
                    <Monto valor={v.monto} jerarquia="fuerte" />
                  </li>
                ))}
              </ul>
              <p className="mt-2 t-helper">
                Hasta esa fecha se sigue cotizando la vigencia de arriba.
              </p>
            </section>
          )}

          <section>
            <h3 className="t-label">Vigencias cerradas</h3>
            {cerradas.length === 0 ? (
              <p className="mt-2 t-helper">
                Todavía no hubo cambios de precio: ésta es la primera vigencia.
              </p>
            ) : (
              <ol className="mt-3 space-y-0">
                {cerradas.map((v, i) => (
                  <li
                    key={v.id}
                    className="relative flex gap-3 pb-4 pl-1 last:pb-0"
                  >
                    {/* Riel del timeline: no se dibuja debajo del último. */}
                    {i < cerradas.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-[7px] top-4 h-full w-px bg-hairline"
                      />
                    )}
                    <span
                      aria-hidden
                      className="relative z-10 mt-1.5 size-[7px] shrink-0 rounded-full bg-faint"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <Monto valor={v.monto} jerarquia="apagado" className="font-medium" />
                        <span className="t-helper tabular-nums">
                          {fechaCorta(v.vigente_desde)} → {fechaCorta(v.vigente_hasta!)}
                        </span>
                      </div>
                      <p className="t-helper">
                        {etiquetaCoberturaLarga(v.cobertura_tipo, Number(v.cobertura_valor))} ·{' '}
                        {textoUsos(v.usos)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-card border border-hairline bg-tint/60 p-4">
            <h3 className="t-label">Por qué no se edita</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              Un presupuesto emitido guarda su propia copia del precio: es el documento que se le
              mostró al paciente. Si el arancel se pudiera editar, ese documento cambiaría solo y
              el consultorio no podría sostener lo que prometió.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              Por eso un cambio de precio abre una vigencia nueva y cierra la anterior. El
              historial queda entero y cada presupuesto sigue mostrando el número con el que se
              emitió.
            </p>
          </section>
        </div>
      )}
    </Drawer>
  )
}

/** La vigencia abierta, destacada: es la que cotiza hoy el wizard. */
function VigenciaActual({ vigencia }: { vigencia: Vigencia }) {
  const { cobertura, aCargo } = calcularItem(
    Math.round(vigencia.monto),
    vigencia.cobertura_tipo,
    Number(vigencia.cobertura_valor),
  )

  return (
    <section className="rounded-card border border-primary/25 bg-card p-4 shadow-rest">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="t-label">Vigencia actual</p>
          <p className="mt-1 t-helper tabular-nums">
            Desde el {fechaLarga(vigencia.vigente_desde)}
          </p>
        </div>
        {vigencia.usos > 0 && (
          <MicroBadge tono="warm" className="gap-1">
            <Lock aria-hidden className="size-3" />
            No editable
          </MicroBadge>
        )}
      </div>

      <p className="mt-3">
        <Monto valor={vigencia.monto} jerarquia="hero" />
      </p>

      <dl className="mt-3 space-y-1.5 text-[13px] text-body">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">Cobertura</dt>
          <dd className="text-right">
            {etiquetaCoberturaLarga(vigencia.cobertura_tipo, Number(vigencia.cobertura_valor))}
            {cobertura > 0 && (
              <>
                {' · '}
                <Monto valor={cobertura} jerarquia="normal" className="text-[13px]" />
              </>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">A cargo del paciente</dt>
          <dd>
            <Monto valor={aCargo} jerarquia="fuerte" />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">Presupuestos que la usan</dt>
          <dd className="tabular-nums text-ink">{numero(vigencia.usos)}</dd>
        </div>
      </dl>

      {vigencia.usos > 0 && (
        <p className="mt-3 t-helper">
          Ya se emitieron presupuestos con este arancel, así que no se toca: el cambio de precio va
          en una vigencia nueva.
        </p>
      )}
    </section>
  )
}

function SinArancel() {
  return (
    <section className="rounded-card border border-dashed border-hairline p-4">
      <p className="t-label">Sin arancel cargado</p>
      <p className="mt-2 text-[13px] leading-relaxed text-body">
        Esta combinación todavía no tiene precio. Hasta que lo tenga, el wizard no la puede
        cotizar sola: hay que escribir el monto a mano en cada presupuesto.
      </p>
    </section>
  )
}

function textoUsos(usos: number): string {
  if (usos === 0) return 'no se usó en ningún presupuesto'
  if (usos === 1) return 'usada en 1 presupuesto'
  return `usada en ${numero(usos)} presupuestos`
}

/**
 * Trae todas las vigencias de la combinación con su conteo de usos.
 *
 * El conteo sale de `aranceles_usos`, que devuelve **una fila por
 * arancel**. Contarlo trayendo `presupuesto_items` y agrupando acá se
 * cortaba en el `max_rows` de PostgREST (1000 filas por defecto): con
 * el consultorio andando, las últimas vigencias volvían con menos usos
 * de los reales o con cero, y de ese número depende el sello «no
 * editable». Mentir hacia abajo dejaba editable una vigencia ya usada.
 *
 * Si el conteo falla, falla el drawer entero: mostrar «0 presupuestos»
 * cuando no se pudo contar es peor que decir que no se pudo leer.
 */
async function traerVigencias(
  prestacionId: string,
  obraSocialId: string | null,
): Promise<Vigencia[]> {
  const supabase = createClient()

  const base = supabase
    .from('aranceles')
    .select('id, monto, cobertura_tipo, cobertura_valor, vigente_desde, vigente_hasta')
    .eq('prestacion_id', prestacionId)

  const { data, error } = await (obraSocialId
    ? base.eq('obra_social_id', obraSocialId)
    : base.is('obra_social_id', null)
  ).order('vigente_desde', { ascending: false })

  if (error) throw new Error(error.message)

  const filas = (data ?? []) as Omit<Vigencia, 'usos'>[]
  if (filas.length === 0) return []

  const { data: conteos, error: errorUsos } = await supabase
    .from('aranceles_usos')
    .select('arancel_id, usos')
    .in(
      'arancel_id',
      filas.map((f) => f.id),
    )

  if (errorUsos) throw new Error(errorUsos.message)

  const usos = new Map<string, number>()
  for (const fila of ((conteos ?? []) as { arancel_id: string; usos: number | string }[])) {
    usos.set(fila.arancel_id, Number(fila.usos ?? 0))
  }

  return filas.map((f) => ({
    ...f,
    // Días, no instantes: ver `soloFecha`.
    vigente_desde: soloFecha(f.vigente_desde),
    vigente_hasta: f.vigente_hasta === null ? null : soloFecha(f.vigente_hasta),
    usos: usos.get(f.id) ?? 0,
  }))
}
