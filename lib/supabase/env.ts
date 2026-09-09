/**
 * Credenciales de Supabase, con un error que se entiende.
 *
 * Sin estas dos variables, `createServerClient` tira «Your project's
 * URL and Key are required to create a Supabase client!» desde
 * `proxy.ts`, que corre en CADA request. Resultado: 500 en todo,
 * incluido el login, y un log que no dice cuál falta ni dónde cargarla.
 *
 * Ojo con el acceso literal a `process.env.NEXT_PUBLIC_*`: Next las
 * reemplaza en el build buscando exactamente ese texto. Leerlas con
 * `process.env[nombre]` las dejaría vacías en el bundle del navegador.
 */

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const COMO_CARGARLAS =
  'Cargalas en Vercel → Settings → Environment Variables (Production, ' +
  'Preview y Development) y volvé a deployar: las NEXT_PUBLIC_* se ' +
  'hornean en el build, así que guardarlas sin redeployar no alcanza. ' +
  'Si el proyecto usa la integración Supabase↔Vercel, fijate que las ' +
  'que inyecta son SUPABASE_URL y SUPABASE_ANON_KEY, SIN el prefijo: ' +
  'esas no llegan al navegador y hay que agregar las NEXT_PUBLIC_ igual.'

export function credencialesSupabase(): { url: string; anonKey: string } {
  if (!URL_SUPABASE || !CLAVE_ANON) {
    const faltan = [
      !URL_SUPABASE && 'NEXT_PUBLIC_SUPABASE_URL',
      !CLAVE_ANON && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ]
      .filter(Boolean)
      .join(' y ')

    throw new Error(`Falta ${faltan}. ${COMO_CARGARLAS}`)
  }

  return { url: URL_SUPABASE, anonKey: CLAVE_ANON }
}
