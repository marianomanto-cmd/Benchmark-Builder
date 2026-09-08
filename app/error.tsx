'use client'

import { RotateCcw, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Button } from '@/components/ui'
import { Logo } from '@/components/shell/logo'

/**
 * Boundary de error de toda la app. Next 16 pasa `retry()`, que vuelve a
 * pedir y renderizar el segmento; `reset()` sigue existiendo pero sólo
 * limpia el estado sin recuperar los datos.
 */
export default function ErrorApp({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  React.useEffect(() => {
    // Sin servicio de reporte todavía: al menos queda en la consola del
    // navegador y en los logs de Vercel.
    console.error('[Smile Lab]', error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-page px-4 py-10">
      <div className="w-full max-w-[430px] text-center">
        <div className="mb-7 flex justify-center">
          <Logo tamano="md" />
        </div>

        <div className="animate-enter rounded-hero border border-hairline bg-card p-7 shadow-lift">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-pill bg-warm-soft">
            <TriangleAlert className="size-7 stroke-[1.6] text-warm-line" aria-hidden />
          </div>

          <h1 className="t-h2">Se rompió algo</h1>
          <p className="mt-2 t-body">
            No pudimos mostrar esta pantalla. Nada de lo que ya habías guardado se perdió.
          </p>

          {error.digest && (
            <p className="mt-3 t-helper">
              Código del error: <span className="tnum">{error.digest}</span>
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Button variant="primary" size="touch" full onClick={() => retry()}>
              <RotateCcw aria-hidden />
              Reintentar
            </Button>
            <Button variant="ghost" size="touch" full asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
