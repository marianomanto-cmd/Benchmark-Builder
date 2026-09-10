'use client'

import { ChevronRight, KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Button, Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui'
import { iniciales } from '@/lib/formato'
import type { Perfil } from '@/lib/supabase/server'

import { useSalir } from './salir'

/**
 * La hoja de cuenta de mobile.
 *
 * Existe porque en el celular no había ninguna: el menú de usuario vive
 * dentro de la topbar, que es `hidden md:block`, así que desde un
 * teléfono **nadie podía cerrar sesión ni cambiar su contraseña**. En un
 * consultorio donde el celular pasa de mano en mano eso no es una
 * comodidad que faltaba, es la sesión de la recepcionista abierta toda
 * la tarde.
 *
 * La abre la tabbar, que es un componente hermano sin ancestro común
 * más cercano que el layout —y el layout no es de esta partición—, así
 * que el estado va en una tienda de módulo leída con
 * `useSyncExternalStore`, igual que el borrador del wizard.
 */

let abierta = false
const oyentes = new Set<() => void>()

function avisar() {
  for (const oyente of oyentes) oyente()
}

export function abrirCuenta() {
  abierta = true
  avisar()
}

export function cerrarCuenta() {
  abierta = false
  avisar()
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function useCuentaAbierta(): boolean {
  return React.useSyncExternalStore(
    suscribir,
    () => abierta,
    () => false,
  )
}

function Fila({
  href,
  icono: Icono,
  children,
}: {
  href: string
  icono: typeof KeyRound
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={cerrarCuenta}
      className="press flex min-h-14 items-center gap-3 rounded-input px-3 font-sans text-[15px] text-ink transition-colors active:bg-tint"
    >
      <Icono className="size-[18px] shrink-0 stroke-[1.75] text-muted" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight className="size-4 shrink-0 stroke-[1.75] text-faint" aria-hidden />
    </Link>
  )
}

export function SheetCuenta({ perfil }: { perfil: Perfil }) {
  const abiertaAhora = useCuentaAbierta()
  const { saliendo, salir } = useSalir()

  return (
    <Sheet open={abiertaAhora} onOpenChange={(v) => !v && cerrarCuenta()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="sr-only">Cuenta</SheetTitle>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-pill bg-tint font-sans text-[14px] font-semibold text-primary-hover"
            >
              {iniciales(perfil.nombre)}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-sans text-[15px] font-semibold text-ink">
                {perfil.nombre}
              </span>
              <span className="block truncate t-helper">
                {perfil.usuario}
                {perfil.esAdmin && ' · administrador'}
              </span>
            </span>
          </div>
        </SheetHeader>

        <SheetBody className="py-1">
          <nav className="flex flex-col">
            <Fila href="/equipo/mi-cuenta" icono={KeyRound}>
              Mi contraseña
            </Fila>
            {perfil.esAdmin && (
              <Fila href="/equipo" icono={ShieldCheck}>
                Equipo y accesos
              </Fila>
            )}
          </nav>
        </SheetBody>

        <SheetFooter>
          {/* Nunca un ícono solo en una acción destructiva. */}
          <Button variant="danger" size="touch" full loading={saliendo} onClick={salir}>
            {!saliendo && <LogOut aria-hidden />}
            {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** El ícono de la pestaña «Cuenta» de la tabbar. */
export const IconoCuenta = UserRound
