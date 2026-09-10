import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { listarEquipo } from '@/app/actions/equipo'
import { PantallaEquipo } from '@/components/equipo/pantalla-equipo'
import { getPerfil } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Equipo' }

/**
 * Equipo y accesos — sólo para administradores.
 *
 * Es la salida a tener que entrar al dashboard de Supabase para dar de
 * alta a alguien: acá se crea el usuario, se le pone contraseña y se
 * decide si administra.
 */
export default async function EquipoPage() {
  const perfil = await getPerfil()
  if (!perfil) redirect('/login')
  // Que la pantalla no exista para quien no administra es la mitad: las
  // server actions vuelven a verificarlo, porque son alcanzables por POST.
  if (!perfil.esAdmin) redirect('/')

  const equipo = await listarEquipo()

  return (
    <PantallaEquipo
      equipo={equipo}
      usuarioActual={perfil.usuario}
      profesionalActual={perfil.profesionalId}
    />
  )
}
