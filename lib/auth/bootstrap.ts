import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'

import {
  CONTRASENA_ADMIN_INICIAL,
  USUARIO_ADMIN,
  mailDeUsuario,
} from './usuarios'

/**
 * Crea el administrador inicial si el consultorio todavía no tiene uno.
 *
 * Es la salida al problema del huevo y la gallina: para crear usuarios
 * hace falta ser admin, y sin admin no se puede empezar. Se ejecuta al
 * abrir el login, es idempotente y no hace nada en cuanto existe un
 * admin — que es el caso en todos los arranques menos el primero.
 *
 * Usa la service role key, así que sólo puede correr en el servidor.
 */
export async function asegurarAdminInicial(): Promise<boolean> {
  const admin = createAdminClient()

  const { count, error: errorConteo } = await admin
    .from('profesionales')
    .select('id', { count: 'exact', head: true })
    .eq('es_admin', true)

  if (errorConteo) {
    console.error('[bootstrap] no se pudo verificar si hay admin', errorConteo.message)
    return false
  }
  if ((count ?? 0) > 0) return false

  const email = mailDeUsuario(USUARIO_ADMIN)

  // El usuario de auth puede existir de un intento anterior en el que
  // falló la ficha: en ese caso se reusa en lugar de fallar.
  let userId: string | null = null

  const { data: creado, error: errorAlta } = await admin.auth.admin.createUser({
    email,
    password: CONTRASENA_ADMIN_INICIAL,
    email_confirm: true,
  })

  if (creado?.user) {
    userId = creado.user.id
  } else {
    const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    userId = lista?.users.find((u) => u.email === email)?.id ?? null

    if (!userId) {
      console.error('[bootstrap] no se pudo crear el admin inicial', errorAlta?.message)
      return false
    }
  }

  const { error: errorFicha } = await admin
    .from('profesionales')
    .upsert({ user_id: userId, nombre: 'Administración', es_admin: true }, { onConflict: 'user_id' })

  if (errorFicha) {
    console.error('[bootstrap] no se pudo crear la ficha del admin', errorFicha.message)
    return false
  }

  return true
}
