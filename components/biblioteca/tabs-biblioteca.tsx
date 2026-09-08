import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { Tab } from './tipos'

/**
 * Barra de tabs de la biblioteca.
 *
 * Son links, no un `Tabs` con estado: la pestaña vive en la URL y así
 * la pantalla se arma entera en el servidor, sin traerse a la vez las
 * cinco listas. Aranceles no es una pestaña: es la pantalla 10, con su
 * propia URL, y por eso se ve igual pero navega afuera.
 */

interface Destino {
  href: string
  etiqueta: string
  clave: Tab | 'aranceles'
}

const DESTINOS: Destino[] = [
  { href: '/biblioteca?tab=prestaciones', etiqueta: 'Prestaciones', clave: 'prestaciones' },
  { href: '/biblioteca/aranceles', etiqueta: 'Aranceles', clave: 'aranceles' },
  { href: '/biblioteca?tab=obras-sociales', etiqueta: 'Obras sociales', clave: 'obras-sociales' },
  { href: '/biblioteca?tab=pacientes', etiqueta: 'Pacientes', clave: 'pacientes' },
  { href: '/biblioteca?tab=profesionales', etiqueta: 'Profesionales', clave: 'profesionales' },
]

export function TabsBiblioteca({ activa }: { activa: Tab | 'aranceles' }) {
  return (
    <nav
      aria-label="Secciones de la biblioteca"
      className="flex items-center gap-1 overflow-x-auto border-b border-hairline no-scrollbar"
    >
      {DESTINOS.map((destino) => {
        const esActiva = destino.clave === activa
        return (
          <Link
            key={destino.clave}
            href={destino.href}
            aria-current={esActiva ? 'page' : undefined}
            className={cn(
              'relative -mb-px whitespace-nowrap border-b-2 border-transparent px-3',
              // 44px de alto: la tabbar de mobile también se toca con el dedo.
              'flex h-11 items-center font-sans text-[13px] font-medium transition-colors',
              esActiva ? 'border-primary text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {destino.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
