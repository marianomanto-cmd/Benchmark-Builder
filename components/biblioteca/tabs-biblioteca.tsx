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
    /*
      Dos formas del mismo control, sin scroll horizontal en ninguna.

      Las cuatro pestañas necesitan 510px y en un teléfono de 390 hay
      358: antes la fila scrolleaba de costado y «Profesionales» —a
      veces también «Obras sociales»— quedaba escondida detrás de un
      arrastre que compite con el scroll vertical de la página.

      Por debajo de `sm` son píldoras que envuelven en dos filas: la
      línea de subrayado no sobrevive al envoltorio —la del renglón de
      arriba queda flotando lejos del borde de la nav— así que ahí el
      estado activo lo lleva el fondo, que es el mismo recurso que usa
      la navegación de la topbar. Desde `sm` entran las cuatro y vuelve
      el subrayado.
    */
    <nav
      aria-label="Secciones de la biblioteca"
      className="flex flex-wrap items-center gap-1.5 sm:gap-1 sm:border-b sm:border-hairline"
    >
      {DESTINOS.map((destino) => {
        const esActiva = destino.clave === activa
        return (
          <Link
            key={destino.clave}
            href={destino.href}
            aria-current={esActiva ? 'page' : undefined}
            className={cn(
              'relative whitespace-nowrap px-3',
              // 44px de alto: la tabbar de mobile también se toca con el dedo.
              'flex h-11 items-center font-sans text-[13px] font-medium transition-colors',
              // Mobile: píldora. Desde `sm`: subrayado.
              'rounded-pill sm:-mb-px sm:rounded-none sm:border-b-2 sm:border-transparent',
              esActiva
                ? 'bg-tint text-ink sm:bg-transparent sm:border-primary'
                : 'text-muted hover:text-ink',
            )}
          >
            {destino.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
