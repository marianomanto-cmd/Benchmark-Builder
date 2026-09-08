import type { Metadata } from 'next'

import { Logo } from '@/components/shell/logo'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Ingresar',
}

/**
 * Pantalla 01 · Login.
 *
 * Un solo campo: el mail. Sin contraseña, sin registro, sin "recordarme".
 * El equipo del consultorio es chico y fijo; el alta la hace Supabase Auth
 * desde el panel.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; error?: string }>
}) {
  // Next 16: `searchParams` es una promesa.
  const { desde, error } = await searchParams

  return (
    <>
      <div className="mb-7 flex justify-center">
        <Logo tamano="lg" />
      </div>

      <div className="rounded-hero border border-hairline bg-card p-7 shadow-lift sm:p-8">
        <LoginForm desde={desde ?? null} errorInicial={error ?? null} />
      </div>
    </>
  )
}
