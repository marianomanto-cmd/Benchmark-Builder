'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui'
import { useWizard } from '@/components/wizard/use-wizard'
import { cn } from '@/lib/utils'
import { Logo } from './logo'
import { MenuUsuario, type UsuarioShell } from './menu-usuario'
import { DESTINOS_DESKTOP, esRutaActiva } from './navegacion'

/**
 * Topbar de desktop (>= 768px). En mobile no existe: ahí manda la tabbar
 * inferior y cada pantalla pone su propio encabezado.
 */
export function Topbar({ usuario }: { usuario: UsuarioShell }) {
  const pathname = usePathname()
  const { abrir } = useWizard()

  return (
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
              return (
                <li key={destino.href}>
                  <Link
                    href={destino.href}
                    aria-current={activo ? 'page' : undefined}
                    className={cn(
                      'flex h-9 items-center gap-2 rounded-pill px-3.5 t-ui transition-colors',
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
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="primary" size="lg" onClick={abrir}>
            <Plus aria-hidden />
            Nuevo presupuesto
          </Button>
          <MenuUsuario usuario={usuario} />
        </div>
      </div>
    </header>
  )
}
