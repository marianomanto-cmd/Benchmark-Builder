import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Vuelta del magic link: cambia el `code` por una sesión y deja las
 * cookies puestas antes de mandar al profesional a donde quería ir.
 *
 * Está dentro del grupo `(auth)` pero la URL real es `/auth/callback`,
 * que es la que `proxy.ts` considera pública.
 */

/** Códigos de error de Supabase → los que entiende `login-form.tsx`. */
const ERRORES: Record<string, string> = {
  otp_expired: 'expirado',
  access_denied: 'acceso_denegado',
  otp_disabled: 'acceso_denegado',
  flow_state_expired: 'expirado',
  flow_state_not_found: 'usado',
  bad_code_verifier: 'usado',
}

/**
 * Sólo se acepta volver a una ruta interna. `//evil.com` es una URL
 * protocol-relative: el navegador la trataría como dominio externo, así
 * que se descarta igual que `https://…`.
 */
function rutaInterna(valor: string | null): string {
  if (!valor) return '/'
  if (!valor.startsWith('/')) return '/'
  if (valor.startsWith('//') || valor.startsWith('/\\')) return '/'
  return valor
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  // En Vercel el origin del request puede ser el de la preview; si está
  // configurada la URL pública, esa manda.
  const base = (process.env.NEXT_PUBLIC_SITE_URL || url.origin).replace(/\/+$/, '')
  const destino = rutaInterna(url.searchParams.get('desde'))

  const volverAlLogin = (motivo: string) =>
    NextResponse.redirect(`${base}/login?${new URLSearchParams({ error: motivo }).toString()}`)

  // Supabase avisa los enlaces vencidos o rechazados por querystring.
  const errorDeAuth = url.searchParams.get('error_code') ?? url.searchParams.get('error')
  if (errorDeAuth) {
    return volverAlLogin(ERRORES[errorDeAuth] ?? 'enlace_invalido')
  }

  const code = url.searchParams.get('code')
  if (!code) {
    return volverAlLogin('sin_codigo')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const codigo = (error as { code?: string }).code ?? ''
    return volverAlLogin(ERRORES[codigo] ?? 'enlace_invalido')
  }

  return NextResponse.redirect(`${base}${destino}`)
}
