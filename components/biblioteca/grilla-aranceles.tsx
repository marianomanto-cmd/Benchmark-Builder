'use client'

import { ChevronDown, Lock, Plus } from 'lucide-react'
import * as React from 'react'

import { Card, MicroBadge, Monto, Tabla, Tbody, Td, Th, Thead, Tr } from '@/components/ui'
import { calcularItem } from '@/lib/calculo'
import { fechaCorta, money, numero } from '@/lib/formato'
import { cn } from '@/lib/utils'

import {
  etiquetaCobertura,
  type Celda,
  type CeldaVigente,
  type ColumnaObraSocial,
  type PrestacionGrilla,
} from './tipos'

interface PropsComunes {
  prestaciones: PrestacionGrilla[]
  columnas: ColumnaObraSocial[]
  /** Devuelve la vigencia abierta de una celda, o null si no hay. */
  buscar: (prestacionId: string, obraSocialId: string | null) => CeldaVigente | null
  /** Celda con arancel: abre el historial. */
  onAbrir: (celda: Celda) => void
  /** Celda vacía: abre el form de carga. */
  onCargar: (celda: Celda) => void
}

function armarCelda(
  prestacion: PrestacionGrilla,
  columna: ColumnaObraSocial,
  vigente: CeldaVigente | null,
): Celda {
  return {
    prestacion_id: prestacion.id,
    prestacion: prestacion.nombre,
    obra_social_id: columna.id,
    obra_social: columna.nombre,
    vigente,
  }
}

/* ═══════════════════════════════════════════════════════════
   Desktop — grilla prestación × obra social
   ═══════════════════════════════════════════════════════════ */

/**
 * La grilla sólo existe en desktop: cruzar veinte prestaciones con ocho
 * obras sociales no entra en un teléfono. Scrollea horizontal con la
 * columna de prestación fija, que es la única forma de no perderse de
 * qué fila se está leyendo.
 */
export function GrillaAranceles({
  prestaciones,
  columnas,
  buscar,
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
      <Tabla>
        <Thead>
          <tr>
            <Th className="sticky left-0 z-20 min-w-[240px] bg-card pl-5">Prestación</Th>
            {columnas.map((c) => (
              <Th key={c.id ?? 'particular'} className="min-w-[168px]">
                <span className="flex items-center gap-1.5">
                  {c.nombre}
                  {!c.activa && <MicroBadge>Inactiva</MicroBadge>}
                </span>
              </Th>
            ))}
          </tr>
        </Thead>

        <Tbody>
          {filas.map(({ prestacion: p, abreRubro }) => {
            return (
              <React.Fragment key={p.id}>
                {abreRubro && (
                  <tr className="bg-page/70">
                    <td
                      colSpan={columnas.length + 1}
                      className="sticky left-0 px-5 py-1.5 t-label"
                    >
                      {p.rubro ?? 'Sin rubro'}
                    </td>
                  </tr>
                )}

                <Tr className={cn('group', !p.activa && 'opacity-60')}>
                  <Td className="sticky left-0 z-10 bg-card pl-5 group-hover:bg-tint">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-ink">{p.nombre}</span>
                      {!p.activa && <MicroBadge>Inactiva</MicroBadge>}
                    </span>
                    {p.codigo && <span className="block t-helper">Código {p.codigo}</span>}
                  </Td>

                  {columnas.map((c) => {
                    const vigente = buscar(p.id, c.id)
                    const celda = armarCelda(p, c, vigente)

                    return (
                      <Td key={c.id ?? 'particular'} className="align-top">
                        {vigente ? (
                          <button
                            type="button"
                            onClick={() => onAbrir(celda)}
                            className="w-full rounded-input px-2 py-1 text-left transition-colors hover:bg-tint"
                            aria-label={`Ver historial de ${p.nombre} en ${c.nombre}`}
                          >
                            <ContenidoCelda vigente={vigente} />
                          </button>
                        ) : (
                          <span className="flex flex-col items-start gap-0.5 px-2 py-1">
                            <span className="t-helper">Sin cargar</span>
                            <button
                              type="button"
                              onClick={() => onCargar(celda)}
                              className="inline-flex items-center gap-1 rounded-pill font-sans text-[12px] font-medium text-primary transition-colors hover:text-primary-hover hover:underline underline-offset-4"
                            >
                              <Plus aria-hidden className="size-3" />
                              Cargar
                            </button>
                          </span>
                        )}
                      </Td>
                    )
                  })}
                </Tr>
              </React.Fragment>
            )
          })}
        </Tbody>
      </Tabla>
    </div>
  )
}

/** Monto, cobertura y a-cargo de una celda con arancel vigente. */
function ContenidoCelda({ vigente }: { vigente: CeldaVigente }) {
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
      {vigente.programado && (
        <span className="mt-1 block t-helper text-warm-ink">
          {money(vigente.programado.monto)} desde el{' '}
          {fechaCorta(vigente.programado.vigente_desde)}
        </span>
      )}
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
  buscar,
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
            buscar={buscar}
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
  buscar,
  onAbrir,
  onCargar,
}: Omit<PropsComunes, 'prestaciones'> & { prestacion: PrestacionGrilla }) {
  const [mostrarFaltantes, setMostrarFaltantes] = React.useState(false)

  const cargadas = columnas.filter((c) => buscar(prestacion.id, c.id))
  const faltantes = columnas.filter((c) => !buscar(prestacion.id, c.id))

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
        {cargadas.map((c) => {
          const vigente = buscar(prestacion.id, c.id)!
          return (
            <li key={c.id ?? 'particular'}>
              <button
                type="button"
                onClick={() => onAbrir(armarCelda(prestacion, c, vigente))}
                className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
              >
                <span className="min-w-0">
                  <span className="block font-sans text-[14px] text-ink">{c.nombre}</span>
                  <span className="block t-helper">
                    {etiquetaCobertura(vigente.cobertura_tipo, Number(vigente.cobertura_valor))}
                    {vigente.usos > 0 && ' · no editable'}
                  </span>
                </span>
                <Monto valor={vigente.monto} jerarquia="fuerte" />
              </button>
            </li>
          )
        })}

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
              {faltantes.map((c) => (
                <li key={c.id ?? 'particular'}>
                  <button
                    type="button"
                    onClick={() => onCargar(armarCelda(prestacion, c, null))}
                    className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
                  >
                    <span className="font-sans text-[14px] text-body">{c.nombre}</span>
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
