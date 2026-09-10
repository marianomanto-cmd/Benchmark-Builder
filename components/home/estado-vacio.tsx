'use client'

import { BookOpen, SearchX, Sparkles } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Button, EmptyState } from '@/components/ui'

import { BotonNuevoPresupuesto } from './boton-nuevo'
import { construirUrl, contarFiltrosAvanzados, FILTROS_VACIOS } from './filtros-url'
import type { FiltrosHome } from './tipos'

/**
 * Pantalla 03: el consultorio todavía no cargó nada.
 *
 * Dos salidas, y el orden importa: cargar un presupuesto es la acción
 * que se espera, pero sin aranceles cargados el wizard no tiene de
 * dónde sacar montos ni coberturas. Por eso la segunda salida está a la
 * misma vista y no escondida en el menú.
 */
export function HomeVacia() {
  return (
    <EmptyState
      icono={<Sparkles className="size-8" aria-hidden />}
      titulo="Todavía no hay presupuestos"
      descripcion={
        <>
          Cargá el primero y va a aparecer acá, con su número, su estado y lo que queda a cargo
          del paciente. Si todavía no cargaste los aranceles, empezá por ahí: el wizard toma de
          ahí los montos y las coberturas.
        </>
      }
      acciones={
        <>
          <BotonNuevoPresupuesto size="touch" atajo>
            Cargar presupuesto
          </BotonNuevoPresupuesto>
          <Button asChild variant="secondary" size="touch">
            <Link href="/biblioteca/aranceles">
              <BookOpen aria-hidden />
              Cargar aranceles primero
            </Link>
          </Button>
        </>
      }
    />
  )
}

/**
 * Los filtros no trajeron nada. La salida depende de por qué:
 *
 * - Con texto y sin más filtros: casi siempre es un paciente que
 *   todavía no está en la base, así que la salida es crearlo con el
 *   término tipeado.
 * - Con texto y además estado/profesional/obra social/fechas: lo más
 *   probable es que el paciente exista y esté tapado por el resto de
 *   los filtros. Se ofrece buscarlo sin ellos, que es un click en vez
 *   de destildar cuatro cosas.
 * - Sin texto: sacar filtros.
 *
 * El término queda en la URL (`?q=`) cuando se abre el wizard, que es un
 * modal sobre la ruta actual. Todavía no lo lee nadie: el paso 1 podría
 * usarlo para precargar el combobox de paciente y ahorrar retipear el
 * nombre que ya se buscó. Mientras tanto «Crear paciente «X»» abre el
 * wizard en blanco.
 */
export function SinResultados({ filtros }: { filtros: FiltrosHome }) {
  const buscado = filtros.q.trim()
  const otros = contarFiltrosAvanzados(filtros)

  const limpiarTodo = (
    <Button asChild variant="secondary" size="touch">
      <Link href={construirUrl(FILTROS_VACIOS)}>Limpiar los filtros</Link>
    </Button>
  )

  if (!buscado) {
    return (
      <EmptyState
        icono={<SearchX className="size-8" aria-hidden />}
        titulo="Ningún presupuesto con esos filtros"
        descripcion={
          otros <= 1
            ? 'Sacando el filtro que está puesto vuelve a verse todo.'
            : `Hay ${otros} filtros puestos. Probá con un rango de fechas más amplio o sacá algún estado.`
        }
        acciones={limpiarTodo}
      />
    )
  }

  if (otros > 0) {
    return (
      <EmptyState
        icono={<SearchX className="size-8" aria-hidden />}
        titulo={`Ningún «${buscado}» con esos filtros`}
        descripcion={`Puede estar cargado y quedar afuera por ${otros === 1 ? 'el otro filtro' : `los otros ${otros} filtros`}. Buscalo sin ellos antes de darlo por nuevo.`}
        acciones={
          <>
            <Button asChild variant="primary" size="touch">
              <Link href={construirUrl({ ...FILTROS_VACIOS, q: buscado })}>
                Buscar «{buscado}» sin filtros
              </Link>
            </Button>
            {limpiarTodo}
          </>
        }
      />
    )
  }

  return (
    <EmptyState
      icono={<SearchX className="size-8" aria-hidden />}
      titulo={`Ningún presupuesto para «${buscado}»`}
      descripcion="¿Es alguien que viene por primera vez? Cargale el presupuesto y creá la ficha del paciente desde el mismo wizard."
      acciones={
        <>
          <BotonNuevoPresupuesto size="touch" atajo>
            Crear paciente «{buscado}»
          </BotonNuevoPresupuesto>
          {limpiarTodo}
        </>
      }
    />
  )
}
