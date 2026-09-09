'use client'

import { KeyRound, LogIn, TriangleAlert, User } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Banner, Button, Card, CardBody, Field, Input } from '@/components/ui'
import { mailDeUsuario, normalizarUsuario } from '@/lib/auth/usuarios'
import { createClient } from '@/lib/supabase/client'

const MENSAJES: Record<string, string> = {
  sesion_expirada: 'Se cerró la sesión por inactividad. Volvé a entrar.',
}

/** Traduce lo que devuelve Supabase a algo que se entienda en el mostrador. */
function mensajeDeError(error: { message?: string; status?: number }): string {
  const texto = (error.message ?? '').toLowerCase()

  if (texto.includes('invalid login credentials')) {
    return 'Usuario o contraseña incorrectos.'
  }
  if (error.status === 429 || texto.includes('rate limit') || texto.includes('too many')) {
    return 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.'
  }
  if (texto.includes('email logins are disabled') || texto.includes('not enabled')) {
    return 'El login con contraseña está apagado en Supabase. Activá Authentication → Providers → Email.'
  }
  return 'No se pudo entrar. Probá de nuevo en un momento.'
}

/** Sólo rutas internas: `//evil.com` sería un dominio externo. */
function destinoSeguro(desde: string | null): string {
  if (!desde || !desde.startsWith('/') || desde.startsWith('//') || desde.startsWith('/\\')) {
    return '/'
  }
  return desde
}

export function LoginForm({
  errorInicial,
  adminReciénCreado,
}: {
  errorInicial: string | null
  adminReciénCreado: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [usuario, setUsuario] = React.useState('')
  const [contrasena, setContrasena] = React.useState('')
  const [entrando, setEntrando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(
    errorInicial ? (MENSAJES[errorInicial] ?? null) : null,
  )

  async function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)

    const nombre = normalizarUsuario(usuario)
    if (!nombre || !contrasena) {
      setError('Completá usuario y contraseña.')
      return
    }

    setEntrando(true)
    try {
      const supabase = createClient()
      const { error: errorEntrada } = await supabase.auth.signInWithPassword({
        email: mailDeUsuario(nombre),
        password: contrasena,
      })

      if (errorEntrada) {
        setError(mensajeDeError(errorEntrada))
        return
      }

      // `refresh` para que el server vea la cookie nueva antes de navegar.
      router.replace(destinoSeguro(searchParams.get('desde')))
      router.refresh()
    } catch {
      setError('No se pudo conectar. Fijate la conexión y probá de nuevo.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <Card className="animate-enter">
      <CardBody className="pt-6">
        <h1 className="t-h2">Ingresar</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          Entrá con el usuario y la contraseña del consultorio.
        </p>

        {adminReciénCreado && (
          <Banner
            className="mt-5"
            tono="info"
            titulo="Se creó el usuario administrador"
          >
            Usuario <strong className="font-semibold">admin</strong>, contraseña{' '}
            <strong className="font-semibold">smilelab</strong>. Cambiala desde Equipo apenas
            entres.
          </Banner>
        )}

        {error && (
          <Banner
            className="mt-5"
            tono="warm"
            icono={<TriangleAlert className="size-4" />}
            titulo="No se pudo entrar"
          >
            {error}
          </Banner>
        )}

        <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field label="Usuario" htmlFor="usuario">
            <div className="relative">
              <User
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              />
              <Input
                id="usuario"
                name="username"
                autoComplete="username"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="admin"
                className="h-12 pl-9 text-[16px]"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />
            </div>
          </Field>

          <Field label="Contraseña" htmlFor="contrasena">
            <div className="relative">
              <KeyRound
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              />
              <Input
                id="contrasena"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-12 pl-9 text-[16px]"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />
            </div>
          </Field>

          <Button type="submit" variant="primary" size="touch" full loading={entrando}>
            {!entrando && <LogIn aria-hidden />}
            {entrando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-4 t-helper">
          ¿No tenés usuario? Pediselo a quien administra el consultorio.
        </p>
      </CardBody>
    </Card>
  )
}
