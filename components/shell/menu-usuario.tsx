'use client'

import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { cerrarSesion } from '@/app/actions/auth'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui'
import { iniciales } from './navegacion'

export interface UsuarioShell {
  nombre: string
  email: string
  /** Null cuando todavía no tiene ficha en `profesionales`. */
  matricula: string | null
  tieneFicha: boolean
}

/**
 * Menú de usuario del topbar. El "Cerrar sesión" dispara una server
 * action que borra las cookies y redirige: no se cierra desde el cliente
 * para que el `proxy` no se quede con una sesión fantasma.
 */
export function MenuUsuario({ usuario }: { usuario: UsuarioShell }) {
  const [saliendo, empezarSalida] = React.useTransition()

  return (
    <Menu>
      <MenuTrigger
        className="flex h-11 items-center gap-2 rounded-pill pl-1 pr-2.5 transition-colors hover:bg-tint data-[state=open]:bg-tint"
        aria-label={`Cuenta de ${usuario.nombre}`}
      >
        <span
          aria-hidden
          className="grid size-9 place-items-center rounded-pill bg-primary font-sans text-[12.5px] font-semibold tracking-[0.02em] text-white"
        >
          {iniciales(usuario.nombre)}
        </span>
        <span className="hidden max-w-[160px] truncate font-sans text-[13px] font-medium text-ink lg:block">
          {usuario.nombre}
        </span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </MenuTrigger>

      <MenuContent>
        <div className="px-2.5 pb-2 pt-1.5">
          <p className="truncate font-sans text-[13.5px] font-semibold text-ink">
            {usuario.nombre}
          </p>
          <p className="truncate t-helper">{usuario.email}</p>
          {usuario.matricula && <p className="t-helper">Matrícula {usuario.matricula}</p>}
          {!usuario.tieneFicha && (
            <p className="mt-1 text-[12.5px] leading-snug text-warm-ink">
              Todavía no cargaste tu ficha profesional.
            </p>
          )}
        </div>

        <MenuSeparator />

        <MenuItem asChild>
          <Link href="/cuenta">
            <UserRound aria-hidden />
            Mi cuenta
          </Link>
        </MenuItem>

        <MenuItem
          destructiva
          disabled={saliendo}
          onSelect={(evento) => {
            // Sin `preventDefault` Radix desmonta el menú antes de que la
            // action llegue a despacharse.
            evento.preventDefault()
            empezarSalida(async () => {
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
