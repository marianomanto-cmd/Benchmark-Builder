'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

/** Cierra la sesión y vuelve al login. */
export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // `redirect` lanza, así que va fuera de cualquier try/catch.
  redirect('/login')
}
