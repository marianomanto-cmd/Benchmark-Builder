import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

import { credencialesSupabase } from './env'
import { esFallaDeTransporte } from './errores'

/** Rutas que no exigen sesión. */
const PUBLICAS = [
  '/login',
  // Se autentica sola con `CRON_SECRET`: la llama Vercel Cron, que
  // manda `Authorization: Bearer …` y ninguna cookie.
  '/api/cron',
  // El manifest y los íconos los pide el navegador ANTES de entrar (y
  // sin cookies, si el fetch sale en modo no-credentialed). Mandarlos al
  // login rompía el «Agregar a inicio» del celular.
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-icon.png',
]

/**
 * Cookies con las que `@supabase/ssr` guarda la sesión:
 * `sb-<ref>-auth-token`, partida en `.0`, `.1`… cuando no entra en una.
 * Sirven para distinguir «esta persona nunca entró» de «no pude
 * confirmarlo ahora». El `-code-verifier` del flujo PKCE queda afuera a
 * propósito: existir no significa que haya sesión.
 */
const COOKIE_SESION = /^sb-.+-auth-token(\.(?:0|[1-9][0-9]*))?$/

function haySesionEnCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => COOKIE_SESION.test(name))
}

/**
 * Refresca la sesión en cada request y manda al login si no hay.
 * Es un chequeo optimista: la autorización real es la RLS de Supabase.
 */
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request })

  const { pathname } = request.nextUrl
  const esPublica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const esApi = pathname.startsWith('/api/')

  const { url, anonKey } = credencialesSupabase()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  /*
   * Un corte de red no es un cierre de sesión.
   *
   * `getUser()` devuelve `user: null` tanto cuando no hay sesión como
   * cuando no pudo hablar con Supabase Auth, y esto corre en CADA
   * request: con señal mala, un timeout de dos segundos echaba a la
   * recepción al login en medio de un presupuesto. Si las cookies de
   * sesión están y lo que falló fue el transporte, se sigue de largo: el
   * JWT lo valida PostgREST por firma, así que la app funciona igual
   * mientras el servicio de Auth se recupera. Un 401 sí es un no —la
   * sesión venció— y ahí el redirect al login es lo correcto.
   */
  let user: User | null = null
  let noSePudoConfirmar = false

  try {
    const { data, error } = await supabase.auth.getUser()
    user = data.user
    noSePudoConfirmar =
      !user && esFallaDeTransporte(error) && haySesionEnCookies(request)
  } catch (error) {
    noSePudoConfirmar = esFallaDeTransporte(error) && haySesionEnCookies(request)
  }

  if (!user && !esPublica && !noSePudoConfirmar) {
    // Una route de API contesta 401; redirigirla al login le devolvía
    // un 200 con el HTML de la pantalla de acceso, y el sheet de
    // WhatsApp lo adjuntaba como si fuera el PDF del presupuesto.
    if (esApi) {
      return NextResponse.json(
        { error: 'Se cerró la sesión. Volvé a entrar y probá de nuevo.' },
        { status: 401 },
      )
    }

    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    destino.search = ''
    // Volver exactamente a donde estaba después de entrar, con sus
    // parámetros: `/presupuestos/x?whatsapp=1` tiene que reabrir el
    // envío, no dejar al usuario en el detalle preguntándose qué pasó.
    const volverA = `${pathname}${request.nextUrl.search}`
    if (pathname !== '/') destino.searchParams.set('desde', volverA)
    return NextResponse.redirect(destino)
  }

  if (user && pathname === '/login') {
    const destino = request.nextUrl.clone()
    destino.pathname = '/'
    destino.search = ''
    return NextResponse.redirect(destino)
  }

  return response
}
