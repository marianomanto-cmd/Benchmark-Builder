'use client'

import { useQuery } from '@tanstack/react-query'
import { Pencil, Trash2, TriangleAlert } from 'lucide-react'
import * as React from 'react'

import { Banner, Button, Drawer, Monto, Skeleton } from '@/components/ui'
import {
  describirCambio,
  normalizarFoto,
  type AccionCambio,
  type CambioArancel,
} from '@/lib/cambios-aranceles'
import { calcularItem } from '@/lib/calculo'
import { fechaCorta, fechaHora, fechaLarga, isoDate, numero } from '@/lib/formato'
import { createClient } from '@/lib/supabase/client'

import { etiquetaCoberturaLarga, soloFecha, type Celda, type VigenciaCelda } from './tipos'

type Vigencia = VigenciaCelda

/** Cambios que se muestran antes de «Ver todos». */
const CAMBIOS_A_LA_VISTA = 5
/** Tope del registro que se trae: más que esto no se lee en un panel. */
const CAMBIOS_MAX = 60

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
  onCorregir,
  onBorrar,
}: {
  celda: Celda
  onCerrar: () => void
  onNuevaVigencia: () => void
  /** Corregir un error de carga en esta vigencia. */
  onCorregir: (vigencia: Vigencia, vigencias: Vigencia[]) => void
  /** Borrar esta vigencia. */
  onBorrar: (vigencia: Vigencia, vigencias: Vigencia[]) => void
}) {
  const consulta = useQuery({
    queryKey: ['vigencias', celda.prestacion_id, celda.obra_social_id],
    queryFn: () => traerVigencias(celda.prestacion_id, celda.obra_social_id),
  })

  const cambios = useQuery({
    queryKey: ['cambios-arancel', celda.prestacion_id, celda.obra_social_id],
    queryFn: () => traerCambios(celda.prestacion_id, celda.obra_social_id),
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

  const acciones = (v: Vigencia) => (
    <AccionesVigencia
      onCorregir={() => onCorregir(v, vigencias)}
      onBorrar={() => onBorrar(v, vigencias)}
    />
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
          {actual ? (
            <VigenciaActual vigencia={actual} acciones={acciones(actual)} />
          ) : (
            <SinArancel />
          )}

          {programadas.length > 0 && (
            <section>
              <h3 className="t-label">Ya cargadas, todavía no arrancaron</h3>
              <ul className="mt-3 space-y-2">
                {programadas.map((v) => (
                  <li
                    key={v.id}
                    className="rounded-input border border-warm-line/25 bg-warm-soft px-3 py-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="t-helper text-warm-ink">
                        Rige desde el {fechaCorta(v.vigente_desde)}
                      </span>
                      <Monto valor={v.monto} jerarquia="fuerte" />
                    </div>
                    <div className="mt-1.5">{acciones(v)}</div>
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
                      <div className="mt-1">{acciones(v)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <RegistroCambios consulta={cambios} />

          <section className="rounded-card border border-hairline bg-tint/60 p-4">
            <h3 className="t-label">Vigencia nueva o corrección</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              Si el precio cambió —un aumento, la lista del mes—, cargá una vigencia nueva: la
              actual se cierra y el precio de antes queda en el historial.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              Si se cargó mal, corregilo o borralo. Los presupuestos ya emitidos no cambian:
              cada uno guarda su propia copia del precio, que es lo que se le mostró al paciente.
              La corrección queda en el registro, con quién, cuándo y por qué.
            </p>
          </section>
        </div>
      )}
    </Drawer>
  )
}

/**
 * Corregir y borrar, con texto: una acción destructiva nunca va con el
 * ícono solo.
 */
function AccionesVigencia({
  onCorregir,
  onBorrar,
}: {
  onCorregir: () => void
  onBorrar: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onCorregir}>
        <Pencil aria-hidden />
        Corregir
      </Button>
      <Button type="button" variant="danger" size="sm" onClick={onBorrar}>
        <Trash2 aria-hidden />
        Borrar
      </Button>
    </div>
  )
}

/** La vigencia abierta, destacada: es la que cotiza hoy el wizard. */
function VigenciaActual({
  vigencia,
  acciones,
}: {
  vigencia: Vigencia
  acciones: React.ReactNode
}) {
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
          Ya hay presupuestos con este arancel. Si lo corregís o lo borrás, esos no cambian:
          guardan su copia del precio.
        </p>
      )}

      <div className="mt-3 border-t border-hairline pt-3">{acciones}</div>
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

/**
 * Quién cambió qué y cuándo. Es lo que permite defender un presupuesto
 * aunque el arancel que citó se haya corregido o borrado después.
 */
function RegistroCambios({
  consulta,
}: {
  consulta: { isPending: boolean; isError: boolean; data?: CambioArancel[] }
}) {
  const [todos, setTodos] = React.useState(false)

  if (consulta.isPending) return <Skeleton className="h-20 w-full rounded-card" />

  if (consulta.isError) {
    return (
      <section>
        <h3 className="t-label">Registro de cambios</h3>
        <p className="mt-2 t-helper">No se pudo leer el registro. Cerrá el panel y volvé a abrirlo.</p>
      </section>
    )
  }

  const lista = consulta.data ?? []
  const visibles = todos ? lista : lista.slice(0, CAMBIOS_A_LA_VISTA)

  return (
    <section>
      <h3 className="t-label">Registro de cambios</h3>
      {lista.length === 0 ? (
        <p className="mt-2 t-helper">
          Todavía no hay cambios registrados para esta combinación.
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {visibles.map((c) => (
              <li key={c.id} className="text-[13px] leading-relaxed">
                <p className="text-ink">{describirCambio(c)}</p>
                {c.motivo && <p className="text-body">«{c.motivo}»</p>}
                <p className="t-helper">
                  {c.autor_nombre} · {fechaHora(c.created_at)}
                </p>
              </li>
            ))}
          </ul>
          {lista.length > CAMBIOS_A_LA_VISTA && (
            <Button
              type="button"
              variant="link"
              className="mt-3"
              onClick={() => setTodos((v) => !v)}
            >
              {todos ? 'Ver menos' : `Ver los ${numero(lista.length)} cambios`}
            </Button>
          )}
        </>
      )}
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
 * de los reales o con cero, y de ese número depende que corregir o
 * borrar una vigencia usada pida el motivo.
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

/**
 * El registro de cambios de la combinación, del más nuevo al más viejo.
 * Incluye los de aranceles ya borrados: es justamente lo que tiene que
 * sobrevivir al borrado.
 */
async function traerCambios(
  prestacionId: string,
  obraSocialId: string | null,
): Promise<CambioArancel[]> {
  const supabase = createClient()

  const base = supabase
    .from('aranceles_cambios')
    .select('id, arancel_id, accion, origen, motivo, antes, despues, autor_nombre, created_at')
    .eq('prestacion_id', prestacionId)

  const { data, error } = await (obraSocialId
    ? base.eq('obra_social_id', obraSocialId)
    : base.is('obra_social_id', null)
  )
    .order('created_at', { ascending: false })
    .limit(CAMBIOS_MAX)

  if (error) throw new Error(error.message)

  return ((data ?? []) as Record<string, unknown>[]).map((c) => ({
    id: String(c.id),
    arancel_id: String(c.arancel_id),
    accion: c.accion as AccionCambio,
    origen: String(c.origen),
    motivo: typeof c.motivo === 'string' && c.motivo !== '' ? c.motivo : null,
    antes: normalizarFoto(c.antes),
    despues: normalizarFoto(c.despues),
    autor_nombre: String(c.autor_nombre ?? ''),
    created_at: String(c.created_at),
  }))
}
