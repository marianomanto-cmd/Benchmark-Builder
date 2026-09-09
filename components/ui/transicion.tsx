'use client'

import { ViewTransition } from 'react'

/**
 * Marca un presupuesto para que morphee entre el listado y su detalle.
 *
 * El mismo `name` en las dos pantallas le dice al navegador que es EL
 * MISMO objeto: la tarjeta se transforma en la cabecera del detalle en
 * lugar de desaparecer y aparecer. Es la diferencia entre «se abrió
 * algo» y «se abrió esto», y evita tener que releer el número para
 * confirmar que se tocó el que se quería.
 *
 * `default="none"` es obligatorio junto con `share`: sin él, cada
 * elemento con nombre se anima en CUALQUIER transición de la página,
 * no sólo en la suya.
 *
 * Sin soporte del navegador no pasa nada: la navegación funciona igual,
 * sólo que sin animar.
 */
export function TransicionPresupuesto({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <ViewTransition name={`presupuesto-${id}`} share="morph" default="none">
      {children}
    </ViewTransition>
  )
}
