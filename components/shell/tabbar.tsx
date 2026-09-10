'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useWizard } from '@/components/wizard/use-wizard'
import { cn } from '@/lib/utils'

import { IconoCuenta, abrirCuenta, useCuentaAbierta } from './cuenta'
import { destinosMobile, esRutaActiva } from './navegacion'

/**
 * Tabbar inferior de mobile (< 768px) + FAB de 56px.
 *
 * El profesional la usa con una mano, parado al lado del sillón: cada
 * destino ocupa 56px de alto (más de los 44 mínimos) y la barra respeta
 * `env(safe-area-inset-bottom)` para no quedar debajo de la home bar del
 * iPhone. El FAB va sobre la barra, a la derecha, para no taparse con el
 * pulgar cuando se navega.
 *
 * La última pestaña es «Cuenta» y no es un destino: abre la hoja con
 * «Mi contraseña» y «Cerrar sesión». Sin ella el celular no tenía
 * ninguna de las dos —el menú de usuario vive en la topbar, que en
 * mobile no existe—, así que la sesión quedaba abierta sin forma de
 * cerrarla.
 */
export function Tabbar({ esAdmin }: { esAdmin: boolean }) {
  const pathname = usePathname()
  const { abrir } = useWizard()
  const destinos = destinosMobile(esAdmin)
  const cuentaAbierta = useCuentaAbierta()

  const claseTab = (activo: boolean) =>
    cn(
      'flex h-14 min-h-11 w-full flex-col items-center justify-center gap-1 transition-colors',
      activo ? 'text-primary-hover' : 'text-faint active:bg-tint',
    )

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
          {destinos.map((destino) => {
            // Con la hoja de cuenta abierta manda ella: dos pestañas
            // encendidas a la vez no dicen dónde estás.
            const activo = esRutaActiva(pathname, destino.href) && !cuentaAbierta
            return (
              <li key={destino.href} className="flex-1">
                <Link
                  href={destino.href}
                  aria-current={activo ? 'page' : undefined}
                  className={claseTab(activo)}
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

          <li className="flex-1">
            <button
              type="button"
              onClick={abrirCuenta}
              aria-haspopup="dialog"
              aria-expanded={cuentaAbierta}
              className={claseTab(cuentaAbierta)}
            >
              <IconoCuenta
                className={cn('size-[22px]', cuentaAbierta ? 'stroke-[2]' : 'stroke-[1.6]')}
                aria-hidden
              />
              <span className="font-sans text-[10.5px] font-semibold leading-none tracking-[0.02em]">
                Cuenta
              </span>
            </button>
          </li>
        </ul>
      </nav>

      {/*
        Colchón del FAB.

        El layout ya reserva 80px para la tabbar, pero el FAB arranca a
        72px del piso y mide 56: los últimos 48px del contenido quedaban
        abajo del botón. Se nota justo donde molesta —la última tarjeta
        de la lista, el último botón de una pantalla— y no hay forma de
        destaparlo, porque el FAB es `fixed`.
      */}
      <div aria-hidden className="h-14 md:hidden" />
    </>
  )
}
