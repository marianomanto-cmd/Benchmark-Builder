import type { NextRequest } from 'next/server'
import { actualizarSesion } from '@/lib/supabase/proxy'

// Next 16: `middleware.ts` pasó a llamarse `proxy.ts` y la función
// exportada es `proxy`. El runtime es nodejs y no se configura.
export async function proxy(request: NextRequest) {
  return actualizarSesion(request)
}

export const config = {
  matcher: [
    /*
     * Todo menos estáticos, imágenes y el favicon.
     * La route del PDF sí pasa: necesita sesión.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
}
