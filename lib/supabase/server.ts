import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

import { usuarioDeMail } from '@/lib/auth/usuarios'

import { credencialesSupabase } from './env'
import { esFallaDeTransporte } from './errores'

/**
 * Cliente de servidor para Server Components, Server Actions y route
 * handlers. En Next 16 `cookies()` es asíncrono.
 *
 * Va envuelto en `cache()`: una request del detalle llamaba a
 * `createClient()` tres veces y cada instancia levanta su propia máquina
 * de sesión (y su propio refresh del token). Con la memoización de React
 * hay **un cliente por request**, compartido por el layout, la página y
 * las acciones que corran en ese ciclo.
 */
export const createClient = cache(async function createClient() {
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
})

/**
 * Cliente con service role. Sólo para la route del PDF (firma URLs de
 * Storage) y el cron. Nunca en un componente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY. Cargala en Vercel → Settings → ' +
        'Environment Variables (sólo server, nunca con prefijo NEXT_PUBLIC_).',
    )
  }
  // La URL sale del mismo lugar que la del cliente normal: si falta, el
  // error dice cuál es y dónde cargarla en vez de reventar adentro de
  // `createServerClient`.
  const { url } = credencialesSupabase()
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  })
}

/**
 * El usuario de esta request, confirmado contra Supabase Auth.
 *
 * Dos cosas:
 *
 * 1. `auth.getUser()` es un viaje de red, y en un mismo request lo
 *    pedían el layout (`getPerfil`) y cada server action. Memoizado, se
 *    paga una sola vez por request.
 *
 * 2. Un timeout no es un cierre de sesión. Sin el reintento, un bache
 *    de red de medio segundo devolvía `null`, el layout hacía
 *    `redirect('/login')` y la recepción perdía la pantalla en la que
 *    estaba por algo que se arreglaba solo. Se reintenta una vez, y
 *    sólo cuando el error es de transporte.
 */
const usuarioDeLaRequest = cache(async function usuarioDeLaRequest() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (data.user || !esFallaDeTransporte(error)) return data.user

  await new Promise((listo) => setTimeout(listo, 250))
  const segundo = await supabase.auth.getUser()
  if (!segundo.data.user) {
    console.error('[auth] no se pudo confirmar la sesión', segundo.error ?? error)
  }
  return segundo.data.user
})

/** Usuario logueado o null. */
export async function getUsuario() {
  return usuarioDeLaRequest()
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
 *
 * También memoizado: el layout lo pide para la topbar y la tabbar, y
 * `/equipo` lo vuelve a pedir para decidir si deja pasar.
 */
export const getPerfil = cache(async function getPerfil(): Promise<Perfil | null> {
  const user = await usuarioDeLaRequest()
  if (!user) return null

  const supabase = await createClient()
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
})
