import { SearchX } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui'
import { Logo } from '@/components/shell/logo'

/** 404 de toda la app, con el mismo lenguaje visual que el login y el error. */
export default function NoEncontrado() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-page px-4 py-10">
      <div className="w-full max-w-[430px] text-center">
        <div className="mb-7 flex justify-center">
          <Logo tamano="md" />
        </div>

        <div className="animate-enter rounded-hero border border-hairline bg-card p-7 shadow-lift">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-pill bg-tint">
            <SearchX className="size-7 stroke-[1.6] text-primary" aria-hidden />
          </div>

          <h1 className="t-h2">Acá no hay nada</h1>
          <p className="mt-2 t-body">
            La dirección no existe o el presupuesto que buscabas se eliminó. Probá desde el inicio.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Button variant="primary" size="touch" full asChild>
              <Link href="/">Ir al inicio</Link>
            </Button>
            <Button variant="ghost" size="touch" full asChild>
              <Link href="/biblioteca">Abrir la biblioteca</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
