'use client'

import { ViewTransition } from 'react'

import { useEsDesktop } from './use-media'

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
 * **Por qué `variante` es obligatoria.** Home monta las dos formas del
 * listado a la vez —la tabla con `hidden md:block`, las cards con
 * `md:hidden`— porque la elección es por CSS y no por JS. Estar oculto
 * por CSS no es estar desmontado: sin esto los dos árboles reclamaban
 * `presupuesto-<id>` al mismo tiempo, React lo rechazaba («two
 * <ViewTransition name> components with the same name mounted at the
 * same time») y **ninguna** transición corría. Sólo la forma que el
 * viewport está mostrando se queda con el nombre.
 *
 * Sin soporte del navegador no pasa nada: la navegación funciona igual,
 * sólo que sin animar.
 */
export function TransicionPresupuesto({
  id,
  variante,
  children,
}: {
  id: string
  /** Cuál de las formas del presupuesto es ésta. Ver arriba. */
  variante: 'listado-desktop' | 'listado-mobile' | 'detalle'
  children: React.ReactNode
}) {
  const esDesktop = useEsDesktop()

  const visible =
    variante === 'detalle' ||
    variante === (esDesktop ? 'listado-desktop' : 'listado-mobile')

  if (!visible) return children

  return (
    <ViewTransition name={`presupuesto-${id}`} share="morph" default="none">
      {children}
    </ViewTransition>
  )
}
