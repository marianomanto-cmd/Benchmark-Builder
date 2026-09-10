'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

/**
 * Cierra la sesión y vuelve al login.
 *
 * `scope: 'local'` a propósito. El default de supabase-js es `global`,
 * que revoca **todos** los refresh tokens del usuario: en un consultorio
 * donde la recepción, la tablet del sillón y el celular entran con el
 * mismo usuario, cerrar sesión en un lado echaba a los otros dos en la
 * primera renovación. Acá se cierra la sesión de este navegador.
 */
export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient()

  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch (error) {
    // Si Supabase no contesta igual hay que sacar a la persona de la
    // pantalla: las cookies quedan sin refrescar y el proxy la manda al
    // login en el próximo request.
    console.error('[auth] no se pudo cerrar sesión contra Supabase', error)
  }

  // `redirect` lanza, así que va fuera de cualquier try/catch.
  redirect('/login')
}
