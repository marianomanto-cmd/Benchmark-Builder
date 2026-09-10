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
  /**
   * Nunca lanza.
   *
   * `createAdminClient()` tira si falta `SUPABASE_SERVICE_ROLE_KEY`, y
   * esto corre al renderizar `/login`: sin este `try` una variable de
   * entorno sin cargar no dejaba entrar a **nadie** —la pantalla de
   * login entera se caía al boundary de error— por un arreglo que sólo
   * hace falta el primer día del consultorio. El login con contraseña
   * no necesita la service role key; el bootstrap sí, y es el que tiene
   * que rendirse solo.
   */
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('[bootstrap] sin service role key, no se verifica el admin inicial', error)
    return false
  }

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

  // `?.id` y no sólo `?.user`: si GoTrue devolviera un usuario sin id
  // se escribiría `undefined` en `user_id` y la ficha nacería rota.
  if (creado?.user?.id) {
    userId = creado.user.id
  } else {
    const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    userId = lista?.users.find((u) => u.email === email)?.id ?? null

    if (!userId) {
      console.error('[bootstrap] no se pudo crear el admin inicial', errorAlta?.message)
      return false
    }
  }

  /**
   * Acá NO va un `upsert({ onConflict: 'user_id' })`.
   *
   * El índice único de `profesionales.user_id` es parcial (`where
   * user_id is not null`), y Postgres no acepta un índice parcial como
   * árbitro de `ON CONFLICT` salvo que se repita su predicado — que es
   * algo que PostgREST no emite. El upsert fallaba SIEMPRE, incluso en
   * una instalación limpia: el error es de planificación, no de
   * conflicto. El resultado era un consultorio con acceso `admin` que
   * entraba pero no tenía ficha: `/equipo` lo rebotaba a Home y nunca
   * podía dar de alta a nadie.
   *
   * Leer y después escribir es además lo que corresponde: la ficha
   * puede existir sin ser admin (alguien que ya estaba en el equipo), y
   * en ese caso hay que promoverla, no pisarle el nombre.
   */
  const { data: ficha, error: errorLectura } = await admin
    .from('profesionales')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (errorLectura) {
    console.error('[bootstrap] no se pudo leer la ficha del admin', errorLectura.message)
    return false
  }

  const { error: errorFicha } = ficha
    ? await admin.from('profesionales').update({ es_admin: true }).eq('id', ficha.id)
    : await admin
        .from('profesionales')
        .insert({ user_id: userId, nombre: 'Administración', es_admin: true })

  if (errorFicha) {
    console.error('[bootstrap] no se pudo crear la ficha del admin', errorFicha.message)
    return false
  }

  return true
}
