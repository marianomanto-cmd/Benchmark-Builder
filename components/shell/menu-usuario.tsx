'use client'

import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { cerrarSesion } from '@/app/actions/auth'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui'
import { borrarBorrador } from '@/lib/draft'
import { iniciales } from '@/lib/formato'
import type { Perfil } from '@/lib/supabase/server'

export function MenuUsuario({ perfil }: { perfil: Perfil }) {
  const [saliendo, empezarSalida] = React.useTransition()

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

        <MenuSeparator />

        <MenuItem
          destructiva
          disabled={saliendo}
          onSelect={(evento) => {
            // Sin `preventDefault` Radix desmonta el menú antes de que la
            // action llegue a despacharse.
            evento.preventDefault()
            empezarSalida(async () => {
              // El borrador vive en el navegador con datos del paciente:
              // en una máquina compartida no puede sobrevivir al logout.
              borrarBorrador()
              await cerrarSesion()
            })
          }}
        >
          <LogOut aria-hidden />
          {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
