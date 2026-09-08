'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { EstadoPerfil } from './auth-estado'

/**
 * Acciones de sesión y de la ficha propia del profesional logueado.
 *
 * El envío del magic link NO vive acá: lo hace el cliente del navegador
 * (`login-form.tsx`) porque el flujo PKCE necesita guardar el verifier en
 * el mismo dispositivo desde el que después se abre el enlace.
 */

/** Cierra la sesión y vuelve al login. */
export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // `redirect` lanza, así que va fuera de cualquier try/catch.
  redirect('/login')
}


function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

/**
 * Crea o actualiza la ficha del profesional que está logueado.
 *
 * Se resuelve siempre por `user_id` del token, nunca por un id que venga
 * del formulario: una server action es un endpoint POST público y no hay
 * que confiar en lo que manda el cliente. La RLS permite escribir a todo
 * el equipo, así que el filtro es responsabilidad de esta función.
 */
export async function guardarPerfil(
  _anterior: EstadoPerfil,
  formData: FormData,
): Promise<EstadoPerfil> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, mensaje: 'Se cerró la sesión. Volvé a entrar para guardar los cambios.' }
  }

  const nombre = texto(formData, 'nombre')
  const matricula = texto(formData, 'matricula')
  const especialidad = texto(formData, 'especialidad')

  if (nombre.length < 3) {
    return {
      ok: false,
      mensaje: 'Escribí tu nombre completo: es el que sale firmando el presupuesto.',
    }
  }

  const { data: ficha, error: errorLectura } = await supabase
    .from('profesionales')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (errorLectura) {
    return { ok: false, mensaje: `No se pudo leer tu ficha: ${errorLectura.message}` }
  }

  const campos = {
    nombre,
    matricula: matricula || null,
    especialidad: especialidad || null,
  }

  if (ficha) {
    const { error } = await supabase.from('profesionales').update(campos).eq('id', ficha.id)
    if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` }
  } else {
    const { error } = await supabase
      .from('profesionales')
      .insert({ ...campos, user_id: user.id, activo: true })
    if (error) return { ok: false, mensaje: `No se pudo crear la ficha: ${error.message}` }
  }

  // Read-your-writes: el shell y el wizard leen el nombre del profesional
  // desde el server, así que hay que refrescar el router.
  refresh()

  return {
    ok: true,
    mensaje: ficha
      ? 'Listo, guardamos tus datos.'
      : 'Ficha creada. Ya podés emitir presupuestos a tu nombre.',
  }
}
