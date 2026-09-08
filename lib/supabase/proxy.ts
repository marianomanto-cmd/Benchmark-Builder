import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Rutas que no exigen sesión.
 *
 * `/api/cron` se autentica sola con `CRON_SECRET`: la llama Vercel Cron,
 * que manda `Authorization: Bearer …` y ninguna cookie. Si el proxy la
 * mandara al login, el pase de `enviado → pendiente` no correría nunca.
 */
const PUBLICAS = ['/login', '/auth', '/api/cron']

/**
 * Refresca la sesión en cada request y redirige al login si no hay.
 * Es un chequeo optimista: la autorización real es la RLS de Supabase.
 */
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const esPublica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!user && !esPublica) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    // Volver a donde estaba después de entrar.
    if (pathname !== '/') url.searchParams.set('desde', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
