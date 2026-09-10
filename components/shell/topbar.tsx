'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { Button, Kbd, useEsDesktop } from '@/components/ui'
import { useWizard } from '@/components/wizard/use-wizard'
import { cn } from '@/lib/utils'
import type { Perfil } from '@/lib/supabase/server'

import { ATAJOS_NAVEGACION } from './atajos'
import { AtajosShell } from './atajos-shell'
import { SheetCuenta } from './cuenta'
import { Logo } from './logo'
import { MenuUsuario } from './menu-usuario'
import { DESTINOS_DESKTOP, esRutaActiva } from './navegacion'

/** `h-16`. Lo necesita el `scroll-padding` de abajo. */
const ALTO_TOPBAR = 64

/**
 * Topbar de desktop (>= 768px). En mobile no existe: ahí manda la tabbar
 * inferior y cada pantalla pone su propio encabezado.
 *
 * También es el punto de montaje de dos cosas que son del marco y no de
 * la barra: los atajos globales y la hoja de cuenta de mobile. Van
 * fuera del `<header>` —que es `hidden` en mobile— porque el sheet lo
 * abre la tabbar.
 */
export function Topbar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname()
  const { abrir } = useWizard()
  const esDesktop = useEsDesktop()
  const [ayuda, setAyuda] = React.useState(false)

  /**
   * La barra es sticky, así que cualquier cosa a la que el navegador
   * quiera scrollear —el campo al que se llega con Tab, un `#hash`, el
   * resultado de «buscar en la página»— aterrizaba justo debajo de
   * ella: quedaba tapada y parecía que el foco se había perdido.
   * `scroll-padding-top` le reserva el alto de la barra.
   */
  React.useEffect(() => {
    const raiz = document.documentElement
    const previo = raiz.style.scrollPaddingTop
    raiz.style.scrollPaddingTop = esDesktop ? `${ALTO_TOPBAR + 12}px` : ''
    return () => {
      raiz.style.scrollPaddingTop = previo
    }
  }, [esDesktop])

  return (
    <>
      <AtajosShell ayudaAbierta={ayuda} onAyuda={setAyuda} />
      <SheetCuenta perfil={perfil} />

      <header className="sticky top-0 z-40 hidden border-b border-hairline bg-page/85 backdrop-blur-md md:block">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-7 px-8">
          <Link
            href="/"
            className="rounded-input transition-opacity hover:opacity-85"
            aria-label="Smile Lab · Presupuestos, ir a Home"
          >
            <Logo tamano="sm" />
          </Link>

          <nav aria-label="Navegación principal">
            <ul className="flex items-center gap-1">
              {DESTINOS_DESKTOP.map((destino) => {
                const activo = esRutaActiva(pathname, destino.href)
                const tecla = ATAJOS_NAVEGACION.find((a) => a.href === destino.href)?.tecla
                return (
                  <li key={destino.href}>
                    <Link
                      href={destino.href}
                      aria-current={activo ? 'page' : undefined}
                      className={cn(
                        'flex h-9 items-center gap-2 rounded-pill px-3 t-ui transition-colors',
                        activo
                          ? 'bg-tint text-primary-hover'
                          : 'text-muted hover:bg-tint hover:text-ink',
                      )}
                    >
                      <destino.icono
                        className={cn('size-4 stroke-[1.75]', activo && 'text-primary')}
                        aria-hidden
                      />
                      {destino.etiqueta}
                      {/* La tecla a la vista: un atajo que nadie ve no existe. */}
                      {tecla && <Kbd className="ml-0.5">{tecla}</Kbd>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Button variant="primary" size="lg" onClick={abrir}>
              <Plus aria-hidden />
              Nuevo presupuesto
            </Button>
            <MenuUsuario perfil={perfil} onAtajos={() => setAyuda(true)} />
          </div>
        </div>
      </header>
    </>
  )
}
