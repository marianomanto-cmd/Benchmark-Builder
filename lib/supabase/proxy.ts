import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { credencialesSupabase } from './env'

/** Rutas que no exigen sesión. */
const PUBLICAS = [
  '/login',
  // Se autentica sola con `CRON_SECRET`: la llama Vercel Cron, que
  // manda `Authorization: Bearer …` y ninguna cookie.
  '/api/cron',
]

/**
 * Refresca la sesión en cada request y manda al login si no hay.
 * Es un chequeo optimista: la autorización real es la RLS de Supabase.
 */
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request })

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const esPublica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!user && !esPublica) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    destino.search = ''
    // Volver a donde estaba después de entrar.
    if (pathname !== '/') destino.searchParams.set('desde', pathname)
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
