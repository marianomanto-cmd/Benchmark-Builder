'use client'

import Link from 'next/link'
import * as React from 'react'

import { EstadoBadge, MicroBadge, Monto, TransicionPresupuesto } from '@/components/ui'
import { estaCerrado, estaFrio } from '@/lib/estados'
import { fechaCorta } from '@/lib/formato'
import { cn } from '@/lib/utils'

import { AccionesFila } from './acciones-fila'
import type { FilaPresupuesto } from './tipos'

/**
 * Mobile nunca usa tabla: una card por presupuesto.
 *
 * El estado va arriba a la derecha (se escanea de un vistazo) y el "a
 * cargo" abajo a la izquierda como número grande: es el dato que el
 * consultorio lee en voz alta cuando el paciente pregunta.
 *
 * La card entera navega al detalle con un link que cubre la superficie;
 * PDF y WhatsApp quedan por encima, con sus 44px propios. Cada card va
 * envuelta en `TransicionPresupuesto` para que se transforme en la
 * cabecera del detalle en vez de desaparecer.
 *
 * **Sin entrada escalonada.** Esta lista se rehace en cada tecleo de la
 * búsqueda, en cada chip de estado y en cada página: filtrar es EL gesto
 * de esta pantalla en el celular. `.stagger` arranca en `opacity: 0` con
 * `fill: both`, así que de la card 12 en adelante el dato quedaba tapado
 * 300 ms —también con `prefers-reduced-motion`, que anula la duración
 * pero no el `animation-delay`— y recién después entraba en 320 ms más.
 * Una cascada que no dice nada sobre los presupuestos, cobrada cada vez.
 * La tabla de desktop nunca la tuvo: ahora las dos mitades de la misma
 * pantalla se comportan igual.
 */
export function ListaMobile({ filas }: { filas: FilaPresupuesto[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {filas.map((fila) => {
        const cerrado = estaCerrado(fila.estado)
        const frio = estaFrio(fila.estado, fila.dias_en_estado)

        return (
          <li key={fila.id}>
            <TransicionPresupuesto id={fila.id} variante="listado-mobile">
              <article
                className={cn(
                  'relative rounded-card border bg-card p-4 shadow-rest',
                  'transition-transform duration-200 active:scale-[.985]',
                  frio ? 'border-warm-line/25 bg-warm-faint' : 'border-hairline',
                )}
              >
                {/* Superficie clickeable de la card. Va debajo de las
                    acciones para no comerse sus targets. */}
                <Link
                  href={`/presupuestos/${fila.id}`}
                  className="absolute inset-0 z-0 rounded-card"
                  aria-label={`Abrir el presupuesto ${fila.numero} de ${fila.paciente_nombre}`}
                />

                <header className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="t-helper tabular-nums">
                      {fila.numero} · {fechaCorta(fila.fecha_emision)}
                    </p>
                    <h3 className="t-h3 truncate">{fila.paciente_nombre}</h3>
                    <p className="t-helper truncate">
                      {fila.prestacion_principal ?? 'Sin prestaciones'}
                      {fila.items_count > 1 && ` · +${fila.items_count - 1}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <EstadoBadge estado={fila.estado} size="sm" />
                    {frio && <MicroBadge tono="warm">{fila.dias_en_estado} días</MicroBadge>}
                  </div>
                </header>

                <p className="pointer-events-none relative z-10 mt-2 t-helper truncate">
                  {fila.obra_social_nombre ?? 'Particular'} · {fila.profesional_nombre}
                </p>

                <footer className="relative z-10 mt-4 flex items-end justify-between gap-3">
                  <div className="pointer-events-none min-w-0">
                    <p className="t-label">A cargo</p>
                    <Monto
                      valor={fila.total_a_cargo}
                      jerarquia={cerrado ? 'apagado' : 'hero'}
                      className={cn('block', cerrado && 't-hero-num text-faint')}
                    />
                  </div>

                  <AccionesFila
                    presupuestoId={fila.id}
                    numero={fila.numero}
                    telefono={fila.paciente_telefono}
                    variante="card"
                  />
                </footer>
              </article>
            </TransicionPresupuesto>
          </li>
        )
      })}
    </ul>
  )
}
