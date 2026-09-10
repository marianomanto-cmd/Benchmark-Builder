import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { Button, Monto } from '@/components/ui'
import { numero } from '@/lib/formato'

import { construirUrl } from './filtros-url'
import { ListaMobile } from './lista-mobile'
import { TablaPresupuestos } from './tabla-presupuestos'
import type { FilaPresupuesto, FiltrosHome, Pagina } from './tipos'

/**
 * El listado en sí. La elección tabla/cards es por CSS y no por
 * `useEsDesktop()`: así el HTML del servidor ya viene con la forma
 * correcta y no hay parpadeo de tabla a card al hidratar.
 *
 * El paginado son links de servidor: el back del navegador vuelve a la
 * página anterior y cada página tiene su URL para compartir.
 */
export function Listado({
  filas,
  filtros,
  pagina,
}: {
  filas: FilaPresupuesto[]
  filtros: FiltrosHome
  pagina: Pagina
}) {
  const aCargo = filas.reduce((total, f) => total + f.total_a_cargo, 0)
  const hayPaginas = pagina.paginas > 1
  const primera = (pagina.actual - 1) * pagina.porPagina + 1
  const ultima = primera + filas.length - 1

  return (
    <section aria-label="Presupuestos" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="t-label tabular-nums">
          {hayPaginas
            ? `${numero(primera)}–${numero(ultima)} de ${numero(pagina.total)}`
            : `${numero(pagina.total)} ${pagina.total === 1 ? 'presupuesto' : 'presupuestos'}`}
        </h2>
        <p className="t-helper">
          Suman <Monto valor={aCargo} jerarquia="fuerte" className="text-[12.5px]" /> a cargo
          {hayPaginas && ' en esta página'}
        </p>
      </div>

      {/* Que el resultado de filtrar se escuche, no sólo se vea. */}
      <p role="status" aria-live="polite" className="sr-only">
        {numero(pagina.total)} {pagina.total === 1 ? 'presupuesto' : 'presupuestos'}
        {hayPaginas && `. Página ${pagina.actual} de ${pagina.paginas}`}
      </p>

      <div className="hidden md:block">
        <TablaPresupuestos filas={filas} />
      </div>

      <div className="md:hidden">
        <ListaMobile filas={filas} />
      </div>

      {hayPaginas && <Paginado filtros={filtros} pagina={pagina} />}
    </section>
  )
}

/**
 * Antes de esto el listado se cortaba en 200 filas y la única salida
 * ofrecida era "achicá el rango de fechas": a los presupuestos viejos
 * no se llegaba nunca.
 */
function Paginado({ filtros, pagina }: { filtros: FiltrosHome; pagina: Pagina }) {
  const hayAnterior = pagina.actual > 1
  const haySiguiente = pagina.actual < pagina.paginas

  return (
    <nav
      aria-label="Paginado del listado"
      className="flex items-center justify-between gap-3 pt-1"
    >
      <Boton
        href={construirUrl(filtros, pagina.actual - 1)}
        habilitado={hayAnterior}
        etiqueta="Página anterior"
      >
        <ChevronLeft aria-hidden />
        Anterior
      </Boton>

      <p className="t-helper tabular-nums">
        Página {numero(pagina.actual)} de {numero(pagina.paginas)}
      </p>

      <Boton
        href={construirUrl(filtros, pagina.actual + 1)}
        habilitado={haySiguiente}
        etiqueta="Página siguiente"
      >
        Siguiente
        <ChevronRight aria-hidden />
      </Boton>
    </nav>
  )
}

function Boton({
  href,
  habilitado,
  etiqueta,
  children,
}: {
  href: string
  habilitado: boolean
  etiqueta: string
  children: React.ReactNode
}) {
  if (!habilitado) {
    return (
      <Button variant="secondary" size="touch" className="md:h-[34px]" disabled aria-label={etiqueta}>
        {children}
      </Button>
    )
  }

  return (
    <Button asChild variant="secondary" size="touch" className="md:h-[34px]">
      <Link href={href} aria-label={etiqueta}>
        {children}
      </Link>
    </Button>
  )
}
