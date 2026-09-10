'use client'

import { CalendarClock, ChevronDown, Lock, Plus } from 'lucide-react'
import * as React from 'react'

import { Card, MicroBadge, Monto } from '@/components/ui'
import { calcularItem } from '@/lib/calculo'
import { fechaCorta, money, numero } from '@/lib/formato'
import { cn } from '@/lib/utils'

import {
  etiquetaCobertura,
  type ArancelProgramado,
  type Celda,
  type CeldaVigente,
  type ColumnaObraSocial,
  type PrestacionGrilla,
} from './tipos'

interface PropsComunes {
  prestaciones: PrestacionGrilla[]
  columnas: ColumnaObraSocial[]
  /** Arma la celda de un cruce: lo de hoy y lo programado. */
  celdaDe: (prestacion: PrestacionGrilla, columna: ColumnaObraSocial) => Celda
  /** Celda con arancel: abre el historial. */
  onAbrir: (celda: Celda) => void
  /** Celda vacía: abre el form de carga. */
  onCargar: (celda: Celda) => void
}

/* ═══════════════════════════════════════════════════════════
   Desktop — grilla prestación × obra social
   ═══════════════════════════════════════════════════════════ */

/**
 * La grilla sólo existe en desktop: cruzar cuarenta prestaciones con
 * diez obras sociales son cuatrocientas celdas que no entran en un
 * teléfono.
 *
 * Scrollea dentro de su propia caja, no con la página: es la única
 * forma de que la fila de obras sociales quede fija arriba y la
 * columna de prestación fija a la izquierda **al mismo tiempo**. Con el
 * scroll de la página, la fila de encabezado se pierde a la tercera
 * prestación y deja de saberse qué columna se está leyendo.
 *
 * Por eso la tabla se escribe acá y no con `<Tabla>`: hace falta
 * `border-separate` para que los bordes no desaparezcan debajo de las
 * celdas fijas, y una caja con alto máximo propio.
 */
export function GrillaAranceles({
  prestaciones,
  columnas,
  celdaDe,
  onAbrir,
  onCargar,
}: PropsComunes) {
  // Las prestaciones vienen ordenadas por rubro: el encabezado de grupo
  // se marca comparando cada fila con la anterior. Se calcula antes de
  // renderizar y no con una variable mutada dentro del map: mutar
  // durante el render rompe con StrictMode y con re-renders parciales.
  const filas = prestaciones.map((p, i) => ({
    prestacion: p,
    abreRubro: i === 0 || p.rubro !== prestaciones[i - 1].rubro,
  }))

  return (
    <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest md:block">
      <div className="max-h-[68dvh] overflow-auto overscroll-contain scroll-sombras scroll-visible">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 top-0 z-30 min-w-[240px] border-b border-r border-hairline bg-card px-5 py-2.5 t-label"
              >
                Prestación
              </th>
              {columnas.map((c) => (
                <th
                  key={c.id ?? 'particular'}
                  scope="col"
                  className="sticky top-0 z-20 min-w-[168px] border-b border-hairline bg-card px-3 py-2.5 align-bottom t-label"
                >
                  <span className="flex items-center gap-1.5">
                    {c.nombre}
                    {!c.activa && <MicroBadge>Inactiva</MicroBadge>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filas.map(({ prestacion: p, abreRubro }) => (
              <React.Fragment key={p.id}>
                {abreRubro && (
                  <tr>
                    {/* La celda ocupa todo el ancho y NO es sticky: lo
                        sticky es el texto de adentro. Con `sticky` en la
                        celda, lo que se pega es una caja tan ancha como
                        la tabla y `left: 0` no la mueve, así que al
                        scrollear a la derecha el rubro se iba de
                        pantalla y quedaba una banda vacía: se perdía
                        justo la referencia de qué grupo se está
                        mirando, que es para lo que está la banda. */}
                    <td
                      colSpan={columnas.length + 1}
                      className="border-b border-hairline bg-page p-0"
                    >
                      <div className="sticky left-0 w-fit px-5 py-1.5 t-label">
                        {p.rubro ?? 'Sin rubro'}
                      </div>
                    </td>
                  </tr>
                )}

                <tr className={cn('group row-hover', !p.activa && 'opacity-60')}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-r border-hairline bg-card px-5 py-[13px] text-left align-top font-normal transition-colors group-hover:bg-tint"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-sans text-[14px] font-medium text-ink">
                        {p.nombre}
                      </span>
                      {!p.activa && <MicroBadge>Inactiva</MicroBadge>}
                    </span>
                    {p.codigo && <span className="block t-helper">Código {p.codigo}</span>}
                  </th>

                  {columnas.map((c) => {
                    const celda = celdaDe(p, c)

                    return (
                      <td
                        key={c.id ?? 'particular'}
                        className="border-b border-hairline px-3 py-[13px] align-top text-[14px] text-body"
                      >
                        {celda.vigente ? (
                          <button
                            type="button"
                            onClick={() => onAbrir(celda)}
                            className="w-full rounded-input px-2 py-1 text-left transition-colors hover:bg-tint focus:outline-none focus:ring-2 focus:ring-primary/25"
                            aria-label={`Ver historial de ${p.nombre} en ${c.nombre}`}
                          >
                            <ContenidoCelda vigente={celda.vigente} programada={celda.programada} />
                          </button>
                        ) : celda.programada ? (
                          <button
                            type="button"
                            onClick={() => onAbrir(celda)}
                            className="w-full rounded-input px-2 py-1 text-left transition-colors hover:bg-tint focus:outline-none focus:ring-2 focus:ring-primary/25"
                            aria-label={`Ver la vigencia programada de ${p.nombre} en ${c.nombre}`}
                          >
                            <SoloProgramada programada={celda.programada} />
                          </button>
                        ) : (
                          <span className="flex flex-col items-start gap-0.5 px-2 py-1">
                            <span className="t-helper">Sin cargar</span>
                            <button
                              type="button"
                              onClick={() => onCargar(celda)}
                              aria-label={`Cargar el arancel de ${p.nombre} en ${c.nombre}`}
                              className="inline-flex items-center gap-1 rounded-pill font-sans text-[12px] font-medium text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus:outline-none focus:ring-2 focus:ring-primary/25"
                            >
                              <Plus aria-hidden className="size-3" />
                              Cargar
                            </button>
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Monto, cobertura y a-cargo de una celda con arancel vigente. */
function ContenidoCelda({
  vigente,
  programada,
}: {
  vigente: CeldaVigente
  programada: ArancelProgramado | null
}) {
  const { aCargo } = calcularItem(
    Math.round(vigente.monto),
    vigente.cobertura_tipo,
    Number(vigente.cobertura_valor),
  )

  return (
    <>
      <span className="flex items-center gap-1.5">
        <Monto valor={vigente.monto} jerarquia="fuerte" />
        {vigente.usos > 0 && (
          <Lock
            aria-label={`Usado en ${numero(vigente.usos)} presupuestos: no editable`}
            className="size-3 shrink-0 text-warm-line"
          />
        )}
      </span>
      <span className="block t-helper">
        {etiquetaCobertura(vigente.cobertura_tipo, Number(vigente.cobertura_valor))} · a cargo{' '}
        {money(aCargo)}
      </span>
      {programada && (
        <span className="mt-1 flex items-center gap-1 t-helper text-warm-ink">
          <CalendarClock aria-hidden className="size-3 shrink-0" />
          {money(programada.monto)} desde el {fechaCorta(programada.vigente_desde)}
        </span>
      )}
    </>
  )
}

/**
 * Celda cuyo único arancel arranca más adelante. Hoy no se cotiza, pero
 * mostrarla como «sin cargar» hacía que alguien la cargara de nuevo y
 * chocara contra la vigencia abierta que ya existía.
 */
function SoloProgramada({ programada }: { programada: ArancelProgramado }) {
  return (
    <>
      <span className="flex items-center gap-1.5">
        <Monto valor={programada.monto} jerarquia="apagado" />
      </span>
      <span className="mt-1 flex items-center gap-1 t-helper text-warm-ink">
        <CalendarClock aria-hidden className="size-3 shrink-0" />
        Recién desde el {fechaCorta(programada.vigente_desde)}
      </span>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   Mobile — una card por prestación
   ═══════════════════════════════════════════════════════════ */

/**
 * En mobile la grilla no entra, así que se invierte: una card por
 * prestación con sus coberturas cargadas, y las que faltan escondidas
 * atrás de un desplegable para que la card no mida media pantalla.
 */
export function ListaArancelesMobile({
  prestaciones,
  columnas,
  celdaDe,
  onAbrir,
  onCargar,
}: PropsComunes) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {prestaciones.map((p) => (
        <li key={p.id}>
          <CardPrestacion
            prestacion={p}
            columnas={columnas}
            celdaDe={celdaDe}
            onAbrir={onAbrir}
            onCargar={onCargar}
          />
        </li>
      ))}
    </ul>
  )
}

function CardPrestacion({
  prestacion,
  columnas,
  celdaDe,
  onAbrir,
  onCargar,
}: Omit<PropsComunes, 'prestaciones'> & { prestacion: PrestacionGrilla }) {
  const [mostrarFaltantes, setMostrarFaltantes] = React.useState(false)

  const celdas = columnas.map((c) => celdaDe(prestacion, c))
  const cargadas = celdas.filter((c) => c.vigente || c.programada)
  const faltantes = celdas.filter((c) => !c.vigente && !c.programada)

  return (
    <Card className={cn('p-4', !prestacion.activa && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[15px] font-medium text-ink">{prestacion.nombre}</p>
          <p className="t-helper">
            {prestacion.rubro ?? 'Sin rubro'}
            {prestacion.codigo ? ` · ${prestacion.codigo}` : ''}
          </p>
        </div>
        {!prestacion.activa && <MicroBadge>Inactiva</MicroBadge>}
      </div>

      <ul className="mt-3 divide-y divide-hairline">
        {cargadas.map((celda) => (
          <li key={celda.obra_social_id ?? 'particular'}>
            <button
              type="button"
              onClick={() => onAbrir(celda)}
              className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
            >
              <span className="min-w-0">
                <span className="block font-sans text-[14px] text-ink">{celda.obra_social}</span>
                <span className="block t-helper">
                  {celda.vigente ? (
                    <>
                      {etiquetaCobertura(
                        celda.vigente.cobertura_tipo,
                        Number(celda.vigente.cobertura_valor),
                      )}
                      {celda.vigente.usos > 0 && ' · no editable'}
                    </>
                  ) : (
                    `Recién desde el ${fechaCorta(celda.programada!.vigente_desde)}`
                  )}
                </span>
                {celda.vigente && celda.programada && (
                  <span className="block t-helper text-warm-ink">
                    {money(celda.programada.monto)} desde el{' '}
                    {fechaCorta(celda.programada.vigente_desde)}
                  </span>
                )}
              </span>
              {celda.vigente ? (
                <Monto valor={celda.vigente.monto} jerarquia="fuerte" />
              ) : (
                <Monto valor={celda.programada!.monto} jerarquia="apagado" />
              )}
            </button>
          </li>
        ))}

        {cargadas.length === 0 && (
          <li className="py-2 t-helper">Todavía no tiene ningún arancel cargado.</li>
        )}
      </ul>

      {faltantes.length > 0 && (
        <div className="mt-3 border-t border-hairline pt-3">
          <button
            type="button"
            onClick={() => setMostrarFaltantes((v) => !v)}
            aria-expanded={mostrarFaltantes}
            className="flex min-h-11 w-full items-center justify-between gap-2 text-left font-sans text-[13px] font-medium text-warm-ink"
          >
            Faltan {faltantes.length}{' '}
            {faltantes.length === 1 ? 'obra social' : 'obras sociales'}
            <ChevronDown
              aria-hidden
              className={cn(
                'size-4 shrink-0 transition-transform',
                mostrarFaltantes && 'rotate-180',
              )}
            />
          </button>

          {mostrarFaltantes && (
            <ul className="divide-y divide-hairline">
              {faltantes.map((celda) => (
                <li key={celda.obra_social_id ?? 'particular'}>
                  <button
                    type="button"
                    onClick={() => onCargar(celda)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
                  >
                    <span className="font-sans text-[14px] text-body">{celda.obra_social}</span>
                    <span className="inline-flex items-center gap-1 font-sans text-[13px] font-medium text-primary">
                      <Plus aria-hidden className="size-3.5" />
                      Cargar
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
