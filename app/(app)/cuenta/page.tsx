import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { BotonCerrarSesion } from '@/components/shell/boton-cerrar-sesion'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui'
import { fechaLarga } from '@/lib/formato'
import { getSesion } from '@/lib/supabase/server'
import { PerfilForm } from './perfil-form'

export const metadata: Metadata = {
  title: 'Mi cuenta',
}

/**
 * Pantalla Cuenta: la ficha del profesional logueado y el cierre de sesión.
 *
 * Los datos de esta ficha son los que se copian dentro del presupuesto al
 * emitirlo (nombre y matrícula del firmante), así que tenerla completa no
 * es cosmético.
 */
export default async function CuentaPage() {
  const { user, profesional } = await getSesion()

  if (!user) redirect('/login')

  return (
    <div className="animate-enter mx-auto w-full max-w-[640px] space-y-5">
      <header>
        <h1 className="t-h2">Mi cuenta</h1>
        <p className="mt-1 t-helper">
          Estos datos salen en el encabezado de los presupuestos que emitís.
        </p>
      </header>

      <PerfilForm
        email={user.email ?? ''}
        nombreSugerido={
          (user.user_metadata as { nombre?: string } | null)?.nombre?.trim() ||
          (user.email ?? '').split('@')[0] ||
          ''
        }
        profesional={profesional}
      />

      <Card>
        <CardHeader>
          <CardTitle>Sesión</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="t-body">
              Entrás con <strong className="font-semibold text-ink">{user.email}</strong>.
            </p>
            <p className="t-helper">
              Sesión iniciada el {fechaLarga(user.last_sign_in_at ?? user.created_at)}. La sesión
              queda abierta en este dispositivo hasta que la cierres.
            </p>
          </div>

          <div className="shrink-0">
            <BotonCerrarSesion />
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
