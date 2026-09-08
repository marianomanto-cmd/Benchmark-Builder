import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cliente de servidor para Server Components, Server Actions y route
 * handlers. En Next 16 `cookies()` es asíncrono.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

/**
 * Usuario + su ficha de profesional. El paso 1 del wizard usa esto
 * como default del campo Profesional.
 */
export async function getSesion() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, profesional: null }

  const { data: profesional } = await supabase
    .from('profesionales')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return { user, profesional }
}
