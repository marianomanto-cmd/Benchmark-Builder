/**
 * Cron diario: `enviado → pendiente` a los 7 días sin cambio.
 *
 * El trabajo lo hace `marcar_pendientes()` en la base, que además deja
 * el evento en el historial con autor "Sistema". Acá sólo se valida
 * quién llama y se dispara la RPC: la función es `security definer` y
 * está concedida únicamente a `service_role`, así que hay que usar el
 * cliente admin.
 *
 * Vercel lo invoca según `vercel.json` (`0 9 * * *`) mandando
 * `Authorization: Bearer $CRON_SECRET`.
 */

import { createHash, timingSafeEqual } from 'node:crypto'

import { NextResponse, type NextRequest } from 'next/server'

import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Comparación de tiempo constante. Se hashea primero para que los dos
 * lados midan lo mismo: `timingSafeEqual` tira si los buffers tienen
 * distinto largo, y ese error ya filtra la longitud del secreto.
 */
function coincide(recibido: string, esperado: string): boolean {
  const a = createHash('sha256').update(recibido).digest()
  const b = createHash('sha256').update(esperado).digest()
  return timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET
  const autorizacion = request.headers.get('authorization')

  if (!secreto || !autorizacion || !coincide(autorizacion, `Bearer ${secreto}`)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('marcar_pendientes')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ actualizados: Number(data ?? 0) })
}
