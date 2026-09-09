import type { Metadata } from 'next'

import { Logo } from '@/components/shell/logo'
import { asegurarAdminInicial } from '@/lib/auth/bootstrap'

import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Ingresar' }

// Depende de la sesión y del estado del equipo: nunca se prerenderiza.
export const dynamic = 'force-dynamic'

export default async function LoginPage(props: PageProps<'/login'>) {
  const { error } = await props.searchParams

  // Primer arranque del consultorio: si todavía no hay ningún admin, se
  // crea uno para poder entrar. Idempotente: a partir del segundo
  // arranque no hace nada.
  const reciénCreado = await asegurarAdminInicial()

  return (
    <main className="w-full max-w-[400px]">
      <div className="mb-7 flex justify-center">
        <Logo tamano="lg" />
      </div>

      <LoginForm
        errorInicial={typeof error === 'string' ? error : null}
        adminReciénCreado={reciénCreado}
      />

      <p className="mt-6 text-center t-helper">Uso interno del consultorio.</p>
    </main>
  )
}
