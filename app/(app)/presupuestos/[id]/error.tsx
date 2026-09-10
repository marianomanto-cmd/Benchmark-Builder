'use client'

import { RotateCcw, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Button } from '@/components/ui'

/**
 * Error propio del detalle.
 *
 * Antes, una lectura fallida terminaba en `notFound()`: la pantalla
 * decía «acá no hay nada» y el que estaba al mostrador entendía que el
 * presupuesto se había borrado. No es lo mismo que la base no conteste
 * a que el documento no exista, y con un paciente enfrente la
 * diferencia importa.
 *
 * Vive dentro del shell —topbar y tabbar siguen ahí— así que se puede
 * seguir trabajando aunque este presupuesto no abra.
 */
export default function ErrorDetalle({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  React.useEffect(() => {
    console.error('[detalle]', error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 py-10 text-center">
      <div className="grid size-14 place-items-center rounded-pill bg-warm-soft">
        <TriangleAlert className="size-7 stroke-[1.6] text-warm-line" aria-hidden />
      </div>

      <div>
        <h1 className="t-h2">No pudimos abrir este presupuesto</h1>
        <p className="mt-2 t-body">
          El documento está intacto: lo que falló fue la lectura. Suele ser la conexión —probá de
          nuevo en unos segundos.
        </p>
      </div>

      {error.digest && (
        <p className="t-helper">
          Código del error: <span className="tnum">{error.digest}</span>
        </p>
      )}

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button variant="primary" size="touch" full onClick={() => retry()}>
          <RotateCcw aria-hidden />
          Reintentar
        </Button>
        <Button variant="ghost" size="touch" full asChild>
          <Link href="/">Volver al listado</Link>
        </Button>
      </div>
    </div>
  )
}
