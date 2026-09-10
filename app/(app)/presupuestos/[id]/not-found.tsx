import { SearchX } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui'

/**
 * 404 del detalle, dentro del shell.
 *
 * El 404 de toda la app se lleva puesta la navegación y habla de
 * direcciones que no existen; acá el caso concreto es otro —un link
 * viejo, un id mal copiado— y la salida es el listado, no el inicio en
 * abstracto.
 */
export default function PresupuestoNoEncontrado() {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 py-10 text-center">
      <div className="grid size-14 place-items-center rounded-pill bg-tint">
        <SearchX className="size-7 stroke-[1.6] text-primary" aria-hidden />
      </div>

      <div>
        <h1 className="t-h2">Ese presupuesto no está</h1>
        <p className="mt-2 t-body">
          Puede que el link esté incompleto o que sea de otro consultorio. Buscalo por el nombre
          del paciente en el listado.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button variant="primary" size="touch" full asChild>
          <Link href="/">Ir al listado</Link>
        </Button>
      </div>
    </div>
  )
}
