'use client'

import { ArrowRight, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

import type { FiltrosHome } from '@/components/home/tipos'
import { Button, EmptyState } from '@/components/ui'

import { urlHomePipeline } from './tipos'

/**
 * En mobile el kanban no existe como experiencia: arrastrar tarjetas
 * entre cinco columnas con el pulgar no es usable, y partirlo en una
 * sola columna con selector sería otra pantalla, no ésta.
 *
 * La ruta sigue existiendo (un link compartido no tiene que romperse),
 * pero manda a lo que sí es el pipeline en el teléfono: la home
 * filtrada por los estados del tablero.
 */
export function AvisoMobile({ filtros }: { filtros: FiltrosHome }) {
  return (
    <EmptyState
      icono={<LayoutGrid className="size-8" />}
      titulo="El kanban se usa en escritorio"
      descripcion="Las cinco columnas necesitan una pantalla ancha, y arrastrar tarjetas necesita mouse. Mientras tanto, el pipeline es el listado de Home filtrado por los estados que están en juego: los mismos presupuestos, en una lista."
      acciones={
        <Button asChild variant="primary" size="touch" full>
          <Link href={urlHomePipeline(filtros)}>
            Ver los que están en juego
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      }
    />
  )
}
