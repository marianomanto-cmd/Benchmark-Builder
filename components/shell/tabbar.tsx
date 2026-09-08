'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useWizard } from '@/components/wizard/use-wizard'
import { cn } from '@/lib/utils'
import { DESTINOS_MOBILE, esRutaActiva } from './navegacion'

/**
 * Tabbar inferior de mobile (< 768px) + FAB de 56px.
 *
 * El profesional la usa con una mano, parado al lado del sillón: cada
 * destino ocupa 56px de alto (más de los 44 mínimos) y la barra respeta
 * `env(safe-area-inset-bottom)` para no quedar debajo de la home bar del
 * iPhone. El FAB va sobre la barra, a la derecha, para no taparse con el
 * pulgar cuando se navega.
 */
export function Tabbar() {
  const pathname = usePathname()
  const { abrir } = useWizard()

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Nuevo presupuesto"
        className="press fixed right-4 z-50 grid size-14 place-items-center rounded-pill bg-primary text-white shadow-cta transition-colors hover:bg-primary-hover active:bg-primary-press md:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      >
        <Plus className="size-6 stroke-[2]" aria-hidden />
      </button>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-card/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ul className="flex items-stretch">
          {DESTINOS_MOBILE.map((destino) => {
            const activo = esRutaActiva(pathname, destino.href)
            return (
              <li key={destino.href} className="flex-1">
                <Link
                  href={destino.href}
                  aria-current={activo ? 'page' : undefined}
                  className={cn(
                    'flex h-14 min-h-11 flex-col items-center justify-center gap-1 transition-colors',
                    activo ? 'text-primary-hover' : 'text-faint active:bg-tint',
                  )}
                >
                  <destino.icono
                    className={cn('size-[22px]', activo ? 'stroke-[2]' : 'stroke-[1.6]')}
                    aria-hidden
                  />
                  <span className="font-sans text-[10.5px] font-semibold leading-none tracking-[0.02em]">
                    {destino.etiqueta}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
