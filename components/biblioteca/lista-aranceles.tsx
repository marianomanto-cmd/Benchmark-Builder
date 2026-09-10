'use client'

import { CalendarClock, Lock, Plus } from 'lucide-react'
import * as React from 'react'

import { Button, Card, MicroBadge, Monto } from '@/components/ui'
import { fechaCorta, money, numero } from '@/lib/formato'
import { cn } from '@/lib/utils'

import {
  etiquetaCobertura,
  type Celda,
  type ColumnaObraSocial,
  type PrestacionGrilla,
} from './tipos'

/* ═══════════════════════════════════════════════════════════
   Por qué esto no es una grilla

   Antes esta pantalla era una matriz prestación × obra social. Con seis
   obras sociales de prueba parecía razonable. Con las 42 del
   consultorio son 2.451 celdas para 110 precios: el 95 % de la pantalla
   decía «Sin cargar», la tabla medía 7.464 px dentro de una caja de
   1.114 y había que arrastrar una barra horizontal para llegar a la
   obra social que uno buscaba — que además nunca se sabía dónde estaba,
   porque el orden era alfabético entre cuarenta y dos.

   El dato es RALO por naturaleza: cada prestación tiene su precio
   particular y, si acaso, el de unas pocas obras sociales con las que
   el consultorio negoció. Dibujar el cruce completo es dibujar sobre
   todo ausencias.

   Así que se dibuja lo que hay: una tarjeta por prestación, con el
   particular como referencia y al lado los precios que existen. Lo
   mismo en desktop y en mobile — no hay dos componentes que se puedan
   desincronizar — y sin scroll horizontal en ningún ancho.
   ═══════════════════════════════════════════════════════════ */

interface Props {
  prestaciones: PrestacionGrilla[]
  columnas: ColumnaObraSocial[]
  celdaDe: (prestacion: PrestacionGrilla, columna: ColumnaObraSocial) => Celda
  /** Celda con arancel: abre el historial. */
  onAbrir: (celda: Celda) => void
  /** Celda vacía: abre el form de carga. */
  onCargar: (celda: Celda) => void
  /**
   * Obra social enfocada, o `null` para ver todas.
   *
   * Con una elegida, cada tarjeta muestra el particular y ESA, una al
   * lado de la otra. Es el modo con el que se carga una lista de
   * precios entera: se elige la obra social una vez y se baja.
   */
  enfoque: string | null
}

export function ListaAranceles({
  prestaciones,
  columnas,
  celdaDe,
  onAbrir,
  onCargar,
  enfoque,
}: Props) {
  /*
   * El rubro se saca de cada tarjeta y se pone como encabezado del
   * grupo: con 57 prestaciones, repetir «CONSULTAS» seis veces seguidas
   * es ruido, y lo que hace falta es saber dónde termina un rubro y
   * empieza el otro mientras se baja.
   *
   * Las prestaciones ya vienen ordenadas por rubro y nombre desde la
   * consulta, así que alcanza con comparar cada una con la anterior.
   */
  const grupos = React.useMemo(() => {
    const salida: { rubro: string; prestaciones: PrestacionGrilla[] }[] = []
    for (const p of prestaciones) {
      const rubro = p.rubro ?? 'Sin rubro'
      const ultimo = salida[salida.length - 1]
      if (ultimo && ultimo.rubro === rubro) ultimo.prestaciones.push(p)
      else salida.push({ rubro, prestaciones: [p] })
    }
    return salida
  }, [prestaciones])

  return (
    <div className="flex flex-col gap-5">
      {grupos.map((grupo) => (
        <section key={grupo.rubro} aria-labelledby={`rubro-${grupo.rubro}`}>
          <h2 id={`rubro-${grupo.rubro}`} className="t-label mb-2">
            {grupo.rubro}
            <span className="ml-2 font-normal text-faint">
              {numero(grupo.prestaciones.length)}
            </span>
          </h2>

          <ul className="flex flex-col gap-2">
            {grupo.prestaciones.map((p) => (
              <li key={p.id}>
                <FichaPrestacion
                  prestacion={p}
                  columnas={columnas}
                  celdaDe={celdaDe}
                  onAbrir={onAbrir}
                  onCargar={onCargar}
                  enfoque={enfoque}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function FichaPrestacion({
  prestacion,
  columnas,
  celdaDe,
  onAbrir,
  onCargar,
  enfoque,
}: Omit<Props, 'prestaciones'> & { prestacion: PrestacionGrilla }) {
  const [eligiendo, setEligiendo] = React.useState(false)

  const particular = React.useMemo(() => {
    const columna = columnas.find((c) => c.id === null)
    return columna ? celdaDe(prestacion, columna) : null
  }, [columnas, celdaDe, prestacion])

  const deObraSocial = React.useMemo(
    () => columnas.filter((c) => c.id !== null).map((c) => celdaDe(prestacion, c)),
    [columnas, celdaDe, prestacion],
  )

  const conPrecio = deObraSocial.filter((c) => c.vigente || c.programada)
  const sinPrecio = deObraSocial.filter((c) => !c.vigente && !c.programada)

  const enfocada = enfoque ? deObraSocial.find((c) => c.obra_social_id === enfoque) : null

  return (
    <Card className={cn('p-3 md:px-4', !prestacion.activa && 'opacity-60')}>
      {/*
        En desktop el nombre y el precio particular comparten fila: son
        lo primero que se busca y ponerlos uno debajo del otro duplicaba
        el alto de la tarjeta, que con 57 prestaciones es medio metro de
        scroll de más. En mobile se apilan, que es lo único que entra.
      */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 items-start justify-between gap-3 md:flex-1">
          <div className="min-w-0">
            <p className="font-sans text-[15px] font-medium text-ink">{prestacion.nombre}</p>
            {prestacion.codigo && <p className="t-helper">{prestacion.codigo}</p>}
          </div>
          {!prestacion.activa && <MicroBadge>Inactiva</MicroBadge>}
        </div>

        {enfocada ? (
          // Con una obra social enfocada, las dos que importan quedan
          // una al lado de la otra y el resto no estorba: es el modo
          // con el que se carga una lista de precios entera.
          <div className="grid gap-2 sm:grid-cols-2 md:w-[520px] md:shrink-0">
            <Precio
              celda={exigirParticular(particular)}
              etiqueta="Particular"
              onAbrir={onAbrir}
              onCargar={onCargar}
            />
            <Precio
              celda={enfocada}
              etiqueta={enfocada.obra_social}
              onAbrir={onAbrir}
              onCargar={onCargar}
            />
          </div>
        ) : (
          <div className="md:w-[260px] md:shrink-0">
            <Precio
              celda={exigirParticular(particular)}
              etiqueta="Particular"
              onAbrir={onAbrir}
              onCargar={onCargar}
            />
          </div>
        )}
      </div>

      {!enfocada && (
        <>
          {/*
            Los precios de obra social y la acción de agregar uno viven
            en el MISMO renglón, como pastillas.

            Antes «Cargar precio de otra obra social» era un botón de
            ancho completo debajo de cada tarjeta: una fila entera, por
            57 prestaciones, para una acción secundaria.

            Y es una sola acción, no una lista de 38 «+ Cargar». «Faltan
            38 obras sociales» no era una tarea pendiente: es el estado
            normal de casi toda prestación —el consultorio negocia con
            unas pocas— y presentarlo como deuda hacía que la pantalla
            entera pareciera a medio cargar.
          */}
          {(conPrecio.length > 0 || sinPrecio.length > 0) && !eligiendo && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {conPrecio.map((celda) => (
                <li key={celda.obra_social_id ?? 'particular'}>
                  <PastillaObraSocial celda={celda} onAbrir={onAbrir} />
                </li>
              ))}

              {sinPrecio.length > 0 && (
                <li>
                  <button
                    type="button"
                    onClick={() => setEligiendo(true)}
                    className="flex min-h-11 items-center gap-1 rounded-input border border-dashed border-hairline px-3 font-sans text-[13px] font-medium text-primary transition-colors hover:border-primary/40 hover:bg-tint md:min-h-[34px]"
                  >
                    <Plus aria-hidden className="size-3.5" />
                    {conPrecio.length > 0 ? 'Otra obra social' : 'Precio de obra social'}
                  </button>
                </li>
              )}
            </ul>
          )}

          {eligiendo && (
            <div className="mt-2">
              <ElegirObraSocial
                celdas={sinPrecio}
                onElegir={(celda) => {
                  setEligiendo(false)
                  onCargar(celda)
                }}
                onCancelar={() => setEligiendo(false)}
              />
            </div>
          )}
        </>
      )}
    </Card>
  )
}

/**
 * El particular siempre tiene celda: la columna existe aunque no haya
 * precio cargado. Esto es sólo para que TypeScript no arrastre el
 * `null` por toda la ficha — si faltara, es un bug de quien arma las
 * columnas, no un estado que la pantalla tenga que dibujar.
 */
function exigirParticular(celda: Celda | null): Celda {
  if (!celda) throw new Error('La columna Particular tiene que existir')
  return celda
}

/** El precio de una celda, o la invitación a cargarlo. */
function Precio({
  celda,
  etiqueta,
  onAbrir,
  onCargar,
}: {
  celda: Celda
  etiqueta: string
  onAbrir: (celda: Celda) => void
  onCargar: (celda: Celda) => void
}) {
  const usado = (celda.vigente?.usos ?? 0) > 0

  if (!celda.vigente && !celda.programada) {
    return (
      <button
        type="button"
        onClick={() => onCargar(celda)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-input border border-dashed border-hairline px-3 text-left transition-colors hover:border-primary/40 hover:bg-tint"
      >
        <span className="t-label">{etiqueta}</span>
        <span className="inline-flex items-center gap-1 font-sans text-[13px] font-medium text-primary">
          <Plus aria-hidden className="size-3.5" />
          Cargar
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onAbrir(celda)}
      className="flex min-h-11 w-full items-start justify-between gap-3 rounded-input border border-hairline px-3 py-2 text-left transition-colors hover:bg-tint"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="t-label">{etiqueta}</span>
          {usado && <Lock aria-hidden className="size-3 text-faint" />}
        </span>
        <span className="block t-helper">
          {celda.vigente
            ? etiquetaCobertura(celda.vigente.cobertura_tipo, Number(celda.vigente.cobertura_valor))
            : `Recién desde el ${fechaCorta(celda.programada!.vigente_desde)}`}
        </span>
        {celda.vigente && celda.programada && (
          <span className="flex items-center gap-1 t-helper text-warm-ink">
            <CalendarClock aria-hidden className="size-3" />
            {money(celda.programada.monto)} desde el {fechaCorta(celda.programada.vigente_desde)}
          </span>
        )}
      </span>
      {celda.vigente ? (
        <Monto valor={celda.vigente.monto} jerarquia="fuerte" className="shrink-0" />
      ) : (
        <Monto valor={celda.programada!.monto} jerarquia="apagado" className="shrink-0" />
      )}
    </button>
  )
}

/** Un precio de obra social, compacto: el nombre y el monto. */
function PastillaObraSocial({
  celda,
  onAbrir,
}: {
  celda: Celda
  onAbrir: (celda: Celda) => void
}) {
  const arancel = celda.vigente ?? celda.programada!
  const esProgramada = !celda.vigente

  return (
    <button
      type="button"
      onClick={() => onAbrir(celda)}
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-input border px-3 text-left transition-colors md:min-h-[34px]',
        esProgramada
          ? 'border-warm/30 bg-warm-faint hover:bg-warm-faint/70'
          : 'border-hairline bg-card hover:bg-tint',
      )}
    >
      <span className="font-sans text-[13px] text-body">{celda.obra_social}</span>
      <span className="font-sans text-[13px] font-semibold tnum text-ink">
        {money(arancel.monto)}
      </span>
      {(celda.vigente?.usos ?? 0) > 0 && <Lock aria-hidden className="size-3 text-faint" />}
      {esProgramada && <CalendarClock aria-hidden className="size-3 text-warm-ink" />}
    </button>
  )
}

/**
 * Las obras sociales que todavía no tienen precio para esta prestación.
 *
 * Se despliega sólo cuando alguien lo pide: son cuarenta y pico, y
 * mostrarlas siempre es lo que hacía ilegible la pantalla anterior.
 */
function ElegirObraSocial({
  celdas,
  onElegir,
  onCancelar,
}: {
  celdas: Celda[]
  onElegir: (celda: Celda) => void
  onCancelar: () => void
}) {
  const [filtro, setFiltro] = React.useState('')

  const visibles = React.useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return celdas
    return celdas.filter((c) => c.obra_social.toLowerCase().includes(q))
  }, [celdas, filtro])

  return (
    <div className="rounded-input border border-hairline bg-tint/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="t-label">
          {numero(celdas.length)} sin precio para esta prestación
        </p>
        <Button variant="ghost" size="touch" className="md:h-[34px]" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>

      <input
        autoFocus
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Buscar obra social"
        aria-label="Buscar obra social"
        className="mt-2 h-11 w-full rounded-input border border-hairline bg-card px-3 font-sans text-[14px] text-ink outline-none placeholder:text-faint focus-visible:border-primary md:h-9"
      />

      {visibles.length === 0 ? (
        <p className="mt-2 t-helper">Ninguna coincide con «{filtro}».</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {visibles.map((celda) => (
            <li key={celda.obra_social_id ?? 'particular'}>
              <button
                type="button"
                onClick={() => onElegir(celda)}
                className="flex min-h-11 items-center gap-1 rounded-input border border-hairline bg-card px-3 font-sans text-[13px] text-body transition-colors hover:border-primary/40 hover:bg-card md:min-h-[34px]"
              >
                <Plus aria-hidden className="size-3.5 text-primary" />
                {celda.obra_social}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
