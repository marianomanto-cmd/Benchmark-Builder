import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { FormMiContrasena } from '@/components/equipo/form-mi-contrasena'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui'
import { getPerfil } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Mi contraseña' }

export default async function MiCuentaPage() {
  const perfil = await getPerfil()
  if (!perfil) redirect('/login')

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5 animate-enter">
      <header>
        <h1 className="t-h2">Mi contraseña</h1>
        <p className="mt-1 t-helper">
          Entrás como <strong className="font-semibold text-ink">{perfil.usuario}</strong>
          {perfil.esAdmin && ' · administrador'}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar la contraseña</CardTitle>
          <p className="t-helper">
            Se aplica a este usuario. Si la olvidás, un administrador puede ponerte una nueva.
          </p>
        </CardHeader>
        <CardBody>
          <FormMiContrasena usuario={perfil.usuario} />
        </CardBody>
      </Card>
    </div>
  )
}
