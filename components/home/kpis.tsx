import { CalendarCheck2, Clock, TrendingUp, Wallet } from 'lucide-react'
import * as React from 'react'

import { Monto } from '@/components/ui'
import { DIAS_SIN_RESPUESTA } from '@/lib/estados'
import { money, numero, porcentaje } from '@/lib/formato'
import { cn } from '@/lib/utils'

import type { KpisHome } from './tipos'

/**
 * Los cuatro números que abren la pantalla, siempre en el mismo orden:
 * cuánto emitimos, cuánto está esperando respuesta, cuánto se acepta y
 * cuánta plata hay en juego.
 *
 * Cuando el consultorio todavía no cargó nada (pantalla 03) los KPIs no
 * se esconden: se muestran en `—` con borde punteado. Enseñan qué va a
 * aparecer ahí en cuanto se emita el primer presupuesto.
 */

interface DefinicionKpi {
  id: string
  label: string
  icono: React.ReactNode
  /** Número héroe. */
  hero: React.ReactNode
  /** Contexto debajo del número. */
  helper: React.ReactNode
  /** Lo que se muestra en la pantalla vacía en lugar del contexto. */
  helperVacio: string
  /** Tiñe la tarjeta de warm: hay algo que atender. */
  atencion?: boolean
}

function definir(kpis: KpisHome): DefinicionKpi[] {
  const { emitidosMes, pendientes, aceptacion, pipeline } = kpis

  return [
    {
      id: 'emitidos',
      label: 'Emitidos del mes',
      icono: <CalendarCheck2 aria-hidden className="size-4" />,
      hero: numero(emitidosMes.cantidad),
      helper: `${money(emitidosMes.aCargo)} a cargo`,
      helperVacio: 'Cuántos salieron este mes y por cuánto',
    },
    {
      id: 'pendientes',
      label: 'Pendientes de respuesta',
      icono: <Clock aria-hidden className="size-4" />,
      hero: numero(pendientes.cantidad),
      helper:
        pendientes.frios > 0
          ? `${numero(pendientes.frios)} ${pendientes.frios === 1 ? 'supera' : 'superan'} ${DIAS_SIN_RESPUESTA} días`
          : 'Ninguno pasa de la semana',
      helperVacio: 'Los que esperan que el paciente conteste',
      atencion: pendientes.frios > 0,
    },
    {
      id: 'aceptacion',
      label: 'Tasa de aceptación',
      icono: <TrendingUp aria-hidden className="size-4" />,
      hero: aceptacion.pct30 === null ? '—' : porcentaje(aceptacion.pct30),
      helper:
        aceptacion.pct90 === null
          ? `Sobre ${numero(aceptacion.base30)} emitidos a 30 días`
          : // Cada porcentaje va con SU base: mezclarlas hacía leer la
            // tasa de 90 días contra los emitidos de 30.
            `A 90 días: ${porcentaje(aceptacion.pct90)} sobre ${numero(aceptacion.base90)} · a 30 días, ${numero(aceptacion.base30)}`,
      helperVacio: 'Cuántos se aceptan, medido a 30 días',
    },
    {
      id: 'pipeline',
      label: 'Monto en pipeline',
      icono: <Wallet aria-hidden className="size-4" />,
      hero: <Monto valor={pipeline.monto} jerarquia="hero" />,
      helper: `${numero(pipeline.cantidad)} ${pipeline.cantidad === 1 ? 'presupuesto activo' : 'presupuestos activos'}`,
      helperVacio: 'La plata que todavía está en juego',
    },
  ]
}

function TarjetaKpi({ kpi, vacio }: { kpi: DefinicionKpi; vacio: boolean }) {
  return (
    <article
      className={cn(
        'flex flex-col gap-1.5 rounded-card bg-card p-4 sm:p-5',
        vacio
          ? 'border border-dashed border-hairline shadow-none'
          : 'border border-hairline shadow-rest',
        !vacio && kpi.atencion && 'border-warm-line/30 bg-warm-faint',
      )}
    >
      <p className="t-label flex items-center gap-1.5">
        <span className={cn('shrink-0', vacio ? 'text-faint' : 'text-primary')}>{kpi.icono}</span>
        <span className="truncate">{kpi.label}</span>
      </p>

      <p className={cn('t-hero-num', vacio && 'text-faint')}>{vacio ? '—' : kpi.hero}</p>

      <p
        className={cn(
          't-helper',
          !vacio && kpi.atencion && 'font-medium text-warm-ink',
        )}
      >
        {vacio ? kpi.helperVacio : kpi.helper}
      </p>
    </article>
  )
}

export function Kpis({ kpis, vacio = false }: { kpis: KpisHome; vacio?: boolean }) {
  const definiciones = definir(kpis)

  return (
    <section aria-label="Resumen del consultorio">
      {/* Mobile: carrusel con 2,5 tarjetas a la vista. El corte de la
          tercera es la señal de que hay más para el costado. */}
      {/* El `-mx-4 px-4` sangra hasta el borde del `<main>` del layout. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:hidden">
        {definiciones.map((k) => (
          <div key={k.id} className="w-[42vw] shrink-0 snap-start">
            <TarjetaKpi kpi={k} vacio={vacio} />
          </div>
        ))}
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
        {definiciones.map((k) => (
          <TarjetaKpi key={k.id} kpi={k} vacio={vacio} />
        ))}
      </div>
    </section>
  )
}
