import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Logo } from '@/components/shell/logo'

import { AvisoAdminInicial } from './aviso-admin'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Ingresar' }

// Depende de la sesión y del estado del equipo: nunca se prerenderiza.
export const dynamic = 'force-dynamic'

export default async function LoginPage(props: PageProps<'/login'>) {
  const { error } = await props.searchParams

  return (
    <main className="w-full max-w-[400px]">
      <div className="mb-7 flex justify-center">
        <Logo tamano="lg" />
      </div>

      <LoginForm
        errorInicial={typeof error === 'string' ? error : null}
        // El bootstrap del admin inicial va en streaming: si Supabase
        // tarda, el formulario ya está en pantalla y se puede tipear.
        aviso={
          <Suspense fallback={null}>
            <AvisoAdminInicial />
          </Suspense>
        }
      />

      <p className="mt-6 text-center t-helper">Uso interno del consultorio.</p>
    </main>
  )
}
