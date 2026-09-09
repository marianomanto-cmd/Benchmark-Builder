import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { usuarioDeMail } from '@/lib/auth/usuarios'

import { credencialesSupabase } from './env'

/**
 * Cliente de servidor para Server Components, Server Actions y route
 * handlers. En Next 16 `cookies()` es asíncrono.
 */
export async function createClient() {
  const cookieStore = await cookies()

  const { url, anonKey } = credencialesSupabase()

  return createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Llamado desde un Server Component: el refresh de sesión
            // lo hace `proxy.ts`, así que se puede ignorar.
          }
        },
      },
    },
  )
}

/**
 * Cliente con service role. Sólo para la route del PDF (firma URLs de
 * Storage) y el cron. Nunca en un componente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  }
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  })
}

/** Usuario logueado o null. */
export async function getUsuario() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/** Ficha del profesional logueado, o `null` si todavía no tiene. */
export interface Perfil {
  userId: string
  /** Lo que se tipea para entrar. El mail interno no se muestra nunca. */
  usuario: string
  profesionalId: string | null
  nombre: string
  matricula: string | null
  esAdmin: boolean
}

/**
 * Quién está usando la app.
 *
 * El nombre sale de la ficha en `profesionales`; si el usuario todavía
 * no la tiene, cae a la parte local del mail para no mostrar un hueco.
 * `esAdmin` decide si ve la pantalla de Equipo.
 */
export async function getPerfil(): Promise<Perfil | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profesional } = await supabase
    .from('profesionales')
    .select('id, nombre, matricula, es_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  const usuario = usuarioDeMail(user.email)

  return {
    userId: user.id,
    usuario,
    profesionalId: profesional?.id ?? null,
    nombre: profesional?.nombre?.trim() || usuario || 'Sin nombre',
    matricula: profesional?.matricula ?? null,
    esAdmin: Boolean(profesional?.es_admin),
  }
}
