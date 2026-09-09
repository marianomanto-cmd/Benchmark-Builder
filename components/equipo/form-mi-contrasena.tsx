'use client'

import { Check } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { cambiarMiContrasena } from '@/app/actions/equipo'
import { Button, Field, Input } from '@/components/ui'
import { MIN_CONTRASENA, validarContrasena } from '@/lib/auth/usuarios'

export function FormMiContrasena() {
  const [nueva, setNueva] = React.useState('')
  const [repetir, setRepetir] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [guardando, setGuardando] = React.useState(false)

  async function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const motivo = validarContrasena(nueva)
    if (motivo) return setError(motivo)
    if (nueva !== repetir) return setError('Las dos contraseñas no coinciden.')

    setError(null)
    setGuardando(true)
    try {
      const res = await cambiarMiContrasena(nueva)
      if (!res.ok) return setError(res.error ?? 'No se pudo cambiar.')

      setNueva('')
      setRepetir('')
      toast.success('Contraseña actualizada.')
    } catch {
      setError('No se pudo conectar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <Field
        label="Contraseña nueva"
        htmlFor="nueva"
        helper={`Al menos ${MIN_CONTRASENA} caracteres.`}
      >
        <Input
          id="nueva"
          type="password"
          autoComplete="new-password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
      </Field>

      <Field label="Repetila" htmlFor="repetir" error={error}>
        <Input
          id="repetir"
          type="password"
          autoComplete="new-password"
          invalido={Boolean(error)}
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
        />
      </Field>

      <div>
        <Button type="submit" variant="primary" loading={guardando}>
          {!guardando && <Check aria-hidden />}
          Cambiar contraseña
        </Button>
      </div>
    </form>
  )
}
