import { CalendarCheck2, Clock, TrendingUp, Wallet } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Monto } from '@/components/ui'
import { DIAS_SIN_RESPUESTA } from '@/lib/estados'
import { money, numero, porcentaje } from '@/lib/formato'
import { cn } from '@/lib/utils'

import { construirUrl, FILTROS_VACIOS } from './filtros-url'
import type { EstadoDatos, KpisHome } from './tipos'

/**
 * Los cuatro números que abren la pantalla, siempre en el mismo orden:
 * cuánto emitimos, cuánto está esperando respuesta, cuánto se acepta y
 * cuánta plata hay en juego.
 *
 * Una raya nunca se deja sola. Un `—` sin explicación se lee como
 * "esto se rompió", y son tres cosas distintas:
 *
 *   vacío  → el consultorio todavía no cargó nada (borde punteado y una
 *            línea que dice qué va a aparecer ahí)
 *   sin base → hay presupuestos pero no en esa ventana (la línea de
 *            abajo dice cuál falta)
 *   falla  → la lectura no volvió; se dice con todas las letras, porque
 *            antes se dibujaba igual que "todavía no hay nada"
 */

interface DefinicionKpi {
  id: string
  label: string
  icono: React.ReactNode
  /** Número héroe. `null` = todavía no hay base para calcularlo. */
  hero: React.ReactNode | null
  /** Contexto debajo del número. */
  helper: React.ReactNode
  /** Lo que se muestra en la pantalla vacía en lugar del contexto. */
  helperVacio: string
  /** Tiñe la tarjeta de warm: hay algo que atender. */
  atencion?: boolean
  /** Adónde lleva tocar la tarjeta, cuando hay adónde ir. */
  href?: string
}

/** Filtrar el listado por los estados que esperan respuesta. */
const URL_ESPERANDO = construirUrl({ ...FILTROS_VACIOS, estados: ['enviado', 'pendiente'] })

function definir(kpis: KpisHome): DefinicionKpi[] {
  const { emitidosMes, pendientes, aceptacion, pipeline } = kpis

  return [
    {
      id: 'emitidos',
      label: 'Emitidos del mes',
      icono: <CalendarCheck2 aria-hidden className="size-4" />,
      hero: numero(emitidosMes.cantidad),
      helper:
        emitidosMes.cantidad === 0
          ? 'Todavía ninguno este mes'
          : `${money(emitidosMes.aCargo)} a cargo`,
      helperVacio: 'Cuántos salieron este mes y por cuánto',
    },
    {
      id: 'pendientes',
      label: 'Pendientes de respuesta',
      icono: <Clock aria-hidden className="size-4" />,
      hero: numero(pendientes.cantidad),
      helper:
        pendientes.cantidad === 0
          ? 'Nadie quedó esperando'
          : pendientes.frios > 0
            ? `${numero(pendientes.frios)} ${pendientes.frios === 1 ? 'supera' : 'superan'} ${DIAS_SIN_RESPUESTA} días`
            : 'Ninguno pasa de la semana',
      helperVacio: 'Los que esperan que el paciente conteste',
      atencion: pendientes.frios > 0,
      href: pendientes.cantidad > 0 ? URL_ESPERANDO : undefined,
    },
    {
      id: 'aceptacion',
      label: 'Tasa de aceptación',
      icono: <TrendingUp aria-hidden className="size-4" />,
      hero: aceptacion.pct30 === null ? null : porcentaje(aceptacion.pct30),
      helper:
        aceptacion.pct30 === null
          ? // La raya de acá no es un error: es que no hubo emisiones en
            // la ventana. Se dice, y se ofrece lo que sí hay.
            aceptacion.pct90 === null
            ? 'Se calcula al emitir el primero'
            : `Sin emitidos en 30 días · a 90 días, ${porcentaje(aceptacion.pct90)} sobre ${numero(aceptacion.base90)}`
          : // Cada porcentaje va con SU base: mezclarlas hacía leer la
            // tasa de 90 días contra los emitidos de 30.
            `Sobre ${numero(aceptacion.base30)} a 30 días · a 90 días, ${porcentaje(aceptacion.pct90)} sobre ${numero(aceptacion.base90)}`,
      helperVacio: 'Cuántos se aceptan, medido a 30 días',
    },
    {
      id: 'pipeline',
      label: 'Monto en pipeline',
      icono: <Wallet aria-hidden className="size-4" />,
      hero: <Monto valor={pipeline.monto} jerarquia="hero" />,
      helper: `${numero(pipeline.cantidad)} ${pipeline.cantidad === 1 ? 'presupuesto activo' : 'presupuestos activos'}`,
      helperVacio: 'La plata que todavía está en juego',
      href: pipeline.cantidad > 0 ? '/pipeline' : undefined,
    },
  ]
}

/** La raya, con su explicación para quien no ve la tarjeta. */
function Raya({ motivo }: { motivo: string }) {
  return (
    <>
      <span aria-hidden>—</span>
      <span className="sr-only">{motivo}</span>
    </>
  )
}

function TarjetaKpi({ kpi, estado }: { kpi: DefinicionKpi; estado: EstadoDatos }) {
  const vacio = estado === 'vacio'
  const falla = estado === 'falla'
  const sinBase = kpi.hero === null

  const contenido = (
    <>
      {/* La etiqueta se parte en dos líneas en vez de cortarse. Truncada,
          mostraba "EMITIDOS DEL …" y "PENDIENTES D…": una etiqueta a
          medias no dice qué se está mirando, que es todo lo que la
          etiqueta tiene que hacer.

          El `min-h` de dos líneas alinea los números entre las tarjetas
          de una misma fila, se parta la etiqueta o no. Abajo de 360px
          no hay fila —las tarjetas se apilan— y esa altura reservada
          sería un hueco entre la etiqueta y el número. */}
      <p className="t-label flex items-start gap-1.5 min-[360px]:min-h-[2.6em]">
        <span
          className={cn(
            'mt-px shrink-0',
            vacio || falla ? 'text-faint' : 'text-primary',
          )}
        >
          {kpi.icono}
        </span>
        <span className="min-w-0 [overflow-wrap:anywhere]">{kpi.label}</span>
      </p>

      <p className={cn('t-hero-num', (vacio || falla || sinBase) && 'text-faint')}>
        {falla ? (
          <Raya motivo="No se pudo leer" />
        ) : vacio ? (
          <Raya motivo="Todavía sin datos" />
        ) : sinBase ? (
          <Raya motivo="Todavía sin datos" />
        ) : (
          kpi.hero
        )}
      </p>

      <p className={cn('t-helper', !vacio && !falla && kpi.atencion && 'font-medium text-warm-ink')}>
        {falla ? 'No se pudo leer ahora; se recalcula al recargar' : vacio ? kpi.helperVacio : kpi.helper}
      </p>
    </>
  )

  const clases = cn(
    'flex h-full flex-col gap-1.5 rounded-card bg-card p-4 sm:p-5',
    vacio || falla
      ? 'border border-dashed border-hairline shadow-none'
      : 'border border-hairline shadow-rest',
    !vacio && !falla && kpi.atencion && 'border-warm-line/30 bg-warm-faint',
  )

  // Un KPI que lleva a su listado ahorra el viaje "leer 6 pendientes →
  // buscar el filtro → tildar dos estados". En la pantalla vacía o
  // caída no lleva a ningún lado: no habría nada del otro lado.
  if (kpi.href && estado === 'ok') {
    return (
      <Link
        href={kpi.href}
        className={cn(clases, 'transition-colors hover:border-primary/35 hover:bg-tint')}
      >
        {contenido}
      </Link>
    )
  }

  return <article className={clases}>{contenido}</article>
}

export function Kpis({ kpis, estado = 'ok' }: { kpis: KpisHome; estado?: EstadoDatos }) {
  const definiciones = definir(kpis)

  return (
    <section aria-label="Resumen del consultorio">
      {/*
        Una grilla, no un carrusel.

        Antes en mobile eran cuatro tarjetas en fila con scroll
        horizontal y 2,5 a la vista: el corte de la tercera era la señal
        de que había más para el costado. Funcionaba, pero el resumen
        del consultorio es lo primero que se mira al abrir la app, y
        tener que arrastrar para ver la mitad —«Tasa de aceptación» y
        «Monto en pipeline» quedaban siempre escondidos— es pedirle un
        gesto a alguien que sólo quería saber cómo viene el mes.

        En 2×2 entran las cuatro de una. Abajo de 360px se apilan: en
        dos columnas la tarjeta mide 138 y le quedan 106 para el número,
        y «$ 12.345.678» —un pipeline de ocho cifras, que este
        consultorio alcanza— necesita 139 y se salía por la derecha
        arrastrando a la página. Achicar más la tipografía no alcanza:
        a 16px un monto así sigue sin entrar, y un monto ilegible no
        sirve para nada.
      */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 md:hidden">
        {definiciones.map((k) => (
          <TarjetaKpi key={k.id} kpi={k} estado={estado} />
        ))}
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
        {definiciones.map((k) => (
          <TarjetaKpi key={k.id} kpi={k} estado={estado} />
        ))}
      </div>
    </section>
  )
}
