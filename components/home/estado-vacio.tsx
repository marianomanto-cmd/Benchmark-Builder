'use client'

import { BookOpen, SearchX, Sparkles } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Button, EmptyState } from '@/components/ui'

import { BotonNuevoPresupuesto } from './boton-nuevo'

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
          <BotonNuevoPresupuesto size="touch">Cargar presupuesto</BotonNuevoPresupuesto>
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
 * La búsqueda no trajo nada. Casi siempre es un paciente que todavía no
 * está en la base, así que la salida es crearlo con el término tipeado,
 * no un cartel de "sin resultados".
 *
 * El término queda en la URL (`?q=`) cuando se abre el wizard: quien
 * implemente el paso 1 puede usarlo para precargar la búsqueda del
 * combobox de paciente.
 */
export function SinResultados({ termino }: { termino: string }) {
  const buscado = termino.trim()

  if (!buscado) {
    return (
      <EmptyState
        icono={<SearchX className="size-8" aria-hidden />}
        titulo="Ningún presupuesto con esos filtros"
        descripcion="Probá con un rango de fechas más amplio o sacá algún estado."
        acciones={
          <Button asChild variant="secondary" size="touch">
            <Link href="/">Limpiar filtros</Link>
          </Button>
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
          <BotonNuevoPresupuesto size="touch">
            Crear paciente «{buscado}»
          </BotonNuevoPresupuesto>
          <Button asChild variant="secondary" size="touch">
            <Link href="/">Limpiar filtros</Link>
          </Button>
        </>
      }
    />
  )
}
