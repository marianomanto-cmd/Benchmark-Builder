/**
 * Pantalla 13 · El PDF del presupuesto.
 *
 * Una sola URL para todo: "Ver PDF" del detalle, el adjunto que el
 * sheet de WhatsApp descarga y la copia que queda en Storage salen de
 * acá. **El documento del paciente y el del consultorio son el mismo
 * byte**, y esa es la razón por la que el archivo se cachea en el
 * bucket en vez de renderizarse en cada visita.
 *
 * Respuestas:
 *   · 200 con el PDF — cuando se acaba de renderizar.
 *   · 302 a una URL firmada de 7 días — cuando el caché sirve.
 *   · 401 sin sesión · 404 si no existe o la RLS no lo deja ver.
 *   · 502 si el render falló: es un problema del servidor, y quien
 *     llama tiene que poder distinguirlo de "este presupuesto no existe".
 */

import { NextResponse, type NextRequest } from 'next/server'

import { asegurarPdf } from '@/lib/pdf/storage'
import { getUsuario } from '@/lib/supabase/server'
import { nombreArchivoPdf } from '@/lib/whatsapp'

// `@react-pdf/renderer` usa pdfkit y fontkit: filesystem y Node, sin
// Edge posible. Y el documento depende de la sesión, así que nada de
// prerender estático.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Un presupuesto largo con las fuentes de marca puede pasarse de los
// 10 s por defecto, y ahí el consultorio ve un error en vez del PDF.
export const maxDuration = 30

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/presupuestos/[id]/pdf'>,
) {
  const { id } = await ctx.params

  // Lo barato primero: un id que no es uuid no merece dos viajes de red.
  if (!UUID.test(id)) {
    return NextResponse.json({ error: 'Ese presupuesto no existe.' }, { status: 404 })
  }

  /*
   * La sesión y el documento se piden a la vez.
   *
   * Confirmar el usuario contra Supabase Auth es un viaje de red
   * completo, y encadenarlo antes de la consulta le sumaba esa espera a
   * cada apertura del PDF. No hay riesgo en pedir los dos juntos: la
   * lectura va con la misma cookie y la autoriza la RLS, así que sin
   * sesión no devuelve nada igual. La respuesta se decide con el
   * usuario en la mano.
   */
  const [usuario, resultado] = await Promise.all([
    getUsuario(),
    asegurarPdf(id).catch((error: unknown) => {
      console.error('[pdf] falló la generación', error)
      return 'error' as const
    }),
  ])

  if (!usuario) {
    return NextResponse.json({ error: 'Necesitás iniciar sesión.' }, { status: 401 })
  }

  if (resultado === 'error') {
    return NextResponse.json(
      { error: 'No se pudo generar el PDF. Probá de nuevo en un momento.' },
      { status: 502 },
    )
  }

  if (!resultado) {
    return NextResponse.json({ error: 'Ese presupuesto no existe.' }, { status: 404 })
  }

  // Caché vigente: se redirige al objeto firmado en vez de mover los
  // bytes por la función. Es el mismo archivo que se subió al generarlo.
  if (resultado.desdeCache && resultado.url) {
    const respuesta = NextResponse.redirect(resultado.url, 302)
    // La URL firmada vence: el navegador no puede quedarse con el 302.
    respuesta.headers.set('Cache-Control', 'private, no-store')
    return respuesta
  }

  if (!resultado.buffer) {
    return NextResponse.json(
      { error: 'No se pudo generar el PDF. Probá de nuevo en un momento.' },
      { status: 502 },
    )
  }

  return new NextResponse(new Uint8Array(resultado.buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      // `inline`: el consultorio lo abre en una pestaña y decide si lo
      // descarga. El nombre es el mismo con el que le llega al paciente.
      'Content-Disposition': `inline; filename="${nombreArchivoPdf(resultado.numero)}"`,
      // Un presupuesto emitido está congelado: si el consultorio vuelve
      // a la pestaña en los próximos minutos, el navegador reusa lo que
      // ya bajó en vez de pedir otro render. Un borrador todavía cambia.
      'Cache-Control': resultado.congelado ? 'private, max-age=300' : 'private, no-store',
    },
  })
}
