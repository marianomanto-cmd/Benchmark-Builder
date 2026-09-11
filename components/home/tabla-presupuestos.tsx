'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  EstadoBadge,
  MicroBadge,
  Monto,
  Tabla,
  Tbody,
  Td,
  Th,
  Thead,
  TransicionPresupuesto,
  Tr,
} from '@/components/ui'
import { estaCerrado, estaFrio } from '@/lib/estados'
import { fechaCorta } from '@/lib/formato'
import { cn } from '@/lib/utils'

import { AccionesFila } from './acciones-fila'
import type { FilaPresupuesto } from './tipos'

/**
 * Tabla de desktop. En mobile no se usa nunca: ahí va `ListaMobile`.
 *
 * Los dos montos van juntos en una celda: `a cargo` en peso 600 y, si
 * difieren, el total debajo en gris. El primero es el número que se
 * conversa con el paciente; el segundo es de cuánto sale. En un
 * presupuesto cerrado (perdido o iniciado) los dos se apagan: ya no
 * está en juego.
 *
 * Cada fila va envuelta en `TransicionPresupuesto`: al abrir el detalle
 * la fila se transforma en su cabecera en lugar de desaparecer, así no
 * hay que releer el número para confirmar que se abrió el que se tocó.
 */
export function TablaPresupuestos({ filas }: { filas: FilaPresupuesto[] }) {
  const router = useRouter()

  /**
   * La fila entera navega, pero no siempre: si se está seleccionando
   * texto (leer un DNI en voz alta y marcarlo con el mouse es rutina),
   * si el click salió de un link o un botón, o si viene con modificador
   * —ahí la persona quiere otra pestaña, y para eso está el link del
   * número—, el click no es "abrime esto".
   */
  function abrir(evento: React.MouseEvent<HTMLTableRowElement>, id: string) {
    if (evento.defaultPrevented) return
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return
    if (evento.target instanceof Element && evento.target.closest('a, button, input, [role="menuitem"]')) {
      return
    }
    if ((window.getSelection()?.toString() ?? '') !== '') return
    router.push(`/presupuestos/${id}`)
  }

  return (
    /*
      Las celdas de texto ENVUELVEN y se cortan a dos líneas; no van en
      una sola línea truncada.

      La diferencia no es estética, es de ancho mínimo. `truncate` es
      `white-space: nowrap`, así que la columna le pide al navegador el
      largo entero del texto —topeado por `max-w`— y esa suma es el
      mínimo de la tabla: con los datos reales del consultorio
      —«TRABAJADORES PASTELEROS, CONFITEROS, PIZZEROS Y AL», «Corona de
      zirconio + reconstrucción de muñón con fibras»— daba 1.408px
      dentro de una caja de 1.114, y la Home volvía a scrollear de
      costado. Con el seed no se veía: los nombres del seed son cortos y
      nunca llegaban al tope.

      Envolviendo, el mínimo de una columna pasa a ser su palabra más
      larga (~100px), no la frase entera. `line-clamp-2` le pone techo
      de dos líneas para que la fila no crezca, y `overflow-wrap:
      anywhere` cubre el caso de una sola palabra más ancha que la
      columna. El `title` sigue teniendo el texto completo.

      Y los dos montos van en una celda: «a cargo» grande y el total
      debajo, sólo cuando difieren. Son una columna menos y se leen
      mejor juntos — la pregunta es cuánto paga el paciente DE cuánto.
    */
    <div className="overflow-hidden rounded-card border border-hairline bg-card shadow-rest">
      <Tabla>
        <Thead>
          <tr>
            <Th className="pl-5">Número</Th>
            <Th>Paciente</Th>
            <Th>Prestación principal</Th>
            <Th>Obra social</Th>
            <Th>Profesional</Th>
            <Th>Fecha</Th>
            <Th numerico>A cargo</Th>
            <Th>Estado</Th>
            <Th className="pr-5 text-right">
              <span className="sr-only">Acciones</span>
            </Th>
          </tr>
        </Thead>

        <Tbody>
          {filas.map((fila) => {
            const cerrado = estaCerrado(fila.estado)
            const frio = estaFrio(fila.estado, fila.dias_en_estado)

            return (
              <TransicionPresupuesto key={fila.id} id={fila.id} variante="listado-desktop">
                <Tr className="cursor-pointer" onClick={(e) => abrir(e, fila.id)}>
                  <Td className="pl-5">
                    {/* El número es el ancla real: con el link la fila se
                        alcanza con teclado y se puede abrir en otra pestaña. */}
                    <Link
                      href={`/presupuestos/${fila.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        // `whitespace-nowrap`: el número del documento
                        // es lo que se le lee al paciente por teléfono,
                        // y partido en «2026-» / «0002» deja de leerse
                        // como un número. Las celdas parten el texto
                        // largo para que la tabla entre sin scroll; un
                        // identificador es la excepción.
                        'whitespace-nowrap font-medium tabular-nums',
                        cerrado ? 'text-muted' : 'text-ink',
                        'hover:text-primary-hover hover:underline underline-offset-4',
                      )}
                    >
                      {fila.numero}
                    </Link>
                  </Td>

                  <Td>
                    <span
                      className="line-clamp-2 max-w-[190px] font-medium text-ink [overflow-wrap:anywhere]"
                      title={fila.paciente_nombre}
                    >
                      {fila.paciente_nombre}
                    </span>
                    {fila.paciente_dni && (
                      <span className="block t-helper tabular-nums">DNI {fila.paciente_dni}</span>
                    )}
                  </Td>

                  <Td>
                    <span className="flex items-center gap-2">
                      <span
                        className="line-clamp-2 max-w-[220px] [overflow-wrap:anywhere]"
                        title={fila.prestacion_principal ?? undefined}
                      >
                        {fila.prestacion_principal ?? 'Sin prestaciones'}
                      </span>
                      {fila.items_count > 1 && (
                        <MicroBadge>+{fila.items_count - 1}</MicroBadge>
                      )}
                    </span>
                  </Td>

                  <Td>
                    <span
                      className="line-clamp-2 max-w-[150px] [overflow-wrap:anywhere]"
                      title={fila.obra_social_nombre ?? 'Particular'}
                    >
                      {fila.obra_social_nombre ?? 'Particular'}
                    </span>
                  </Td>

                  <Td>
                    <span
                      className="line-clamp-2 max-w-[150px] [overflow-wrap:anywhere]"
                      title={fila.profesional_nombre}
                    >
                      {fila.profesional_nombre}
                    </span>
                  </Td>

                  <Td className="whitespace-nowrap tabular-nums">
                    {fechaCorta(fila.fecha_emision)}
                  </Td>

                  <Td numerico>
                    <Monto valor={fila.total_a_cargo} jerarquia={cerrado ? 'apagado' : 'fuerte'} />
                    {/* El total sólo cuando dice algo: si la obra social
                        no cubre nada, repetir el mismo número abajo es
                        ruido. */}
                    {fila.subtotal !== fila.total_a_cargo && (
                      <span className="block t-helper tabular-nums">
                        de <Monto valor={fila.subtotal} jerarquia="apagado" className="text-[12px]" />
                      </span>
                    )}
                  </Td>

                  <Td>
                    <span className="flex flex-col items-start gap-1">
                      <EstadoBadge estado={fila.estado} size="sm" />
                      {frio && (
                        <MicroBadge tono="warm">{fila.dias_en_estado} días</MicroBadge>
                      )}
                    </span>
                  </Td>

                  <Td className="pr-5">
                    <AccionesFila
                      presupuestoId={fila.id}
                      numero={fila.numero}
                      telefono={fila.paciente_telefono}
                      variante="tabla"
                    />
                  </Td>
                </Tr>
              </TransicionPresupuesto>
            )
          })}
        </Tbody>
      </Tabla>
    </div>
  )
}
