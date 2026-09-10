'use client'

import { Keyboard, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import Link from 'next/link'

import {
  Kbd,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui'
import { iniciales } from '@/lib/formato'
import type { Perfil } from '@/lib/supabase/server'

import { TECLA_AYUDA } from './atajos'
import { useSalir } from './salir'

export function MenuUsuario({ perfil, onAtajos }: { perfil: Perfil; onAtajos: () => void }) {
  const { saliendo, salir } = useSalir()

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          aria-label={`Cuenta de ${perfil.nombre}`}
          className="grid size-9 shrink-0 place-items-center rounded-pill bg-tint font-sans text-[12px] font-semibold text-primary-hover transition-colors hover:bg-primary hover:text-white"
        >
          {iniciales(perfil.nombre)}
        </button>
      </MenuTrigger>

      <MenuContent>
        <MenuLabel>{perfil.nombre}</MenuLabel>
        <p className="px-2.5 pb-1.5 t-helper">
          {perfil.usuario}
          {perfil.esAdmin && ' · administrador'}
        </p>

        <MenuSeparator />

        {perfil.esAdmin && (
          <MenuItem asChild>
            <Link href="/equipo">
              <ShieldCheck aria-hidden />
              Equipo y accesos
            </Link>
          </MenuItem>
        )}

        <MenuItem asChild>
          <Link href="/equipo/mi-cuenta">
            <UserRound aria-hidden />
            Mi contraseña
          </Link>
        </MenuItem>

        {/* La única forma de enterarse de que hay atajos. */}
        <MenuItem
          onSelect={() => {
            // Radix cierra el menú y devuelve el foco al trigger al
            // desmontarlo. Si el modal se abre en el mismo tick, esa
            // restauración le roba el foco recién montado.
            setTimeout(onAtajos, 0)
          }}
        >
          <Keyboard aria-hidden />
          <span className="flex-1">Atajos de teclado</span>
          <Kbd>{TECLA_AYUDA}</Kbd>
        </MenuItem>

        <MenuSeparator />

        <MenuItem
          destructiva
          disabled={saliendo}
          onSelect={(evento) => {
            // Sin `preventDefault` Radix desmonta el menú antes de que la
            // action llegue a despacharse.
            evento.preventDefault()
            salir()
          }}
        >
          <LogOut aria-hidden />
          {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
