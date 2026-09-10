'use client'

import { Check, Eye, EyeOff } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { cambiarMiContrasena } from '@/app/actions/equipo'
import { Button, Field, Input } from '@/components/ui'
import { MIN_CONTRASENA, validarContrasena } from '@/lib/auth/usuarios'

export function FormMiContrasena({ usuario }: { usuario: string }) {
  const [nueva, setNueva] = React.useState('')
  const [repetir, setRepetir] = React.useState('')
  const [ver, setVer] = React.useState(false)
  /** Cada error bajo su campo: el de largo no es el de «no coinciden». */
  const [errores, setErrores] = React.useState<{ nueva?: string; repetir?: string }>({})
  const [guardando, setGuardando] = React.useState(false)
  const [listo, setListo] = React.useState(false)
  const primeroRef = React.useRef<HTMLInputElement>(null)

  async function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (guardando) return

    const nuevos = {
      nueva: validarContrasena(nueva) ?? undefined,
      repetir: nueva && nueva !== repetir ? 'Las dos no coinciden.' : undefined,
    }
    setErrores(nuevos)
    if (nuevos.nueva || nuevos.repetir) return

    setListo(false)
    setGuardando(true)
    try {
      const res = await cambiarMiContrasena(nueva)
      if (!res.ok) return setErrores({ nueva: res.error ?? 'No se pudo cambiar.' })

      setNueva('')
      setRepetir('')
      setListo(true)
      toast.success('Contraseña actualizada.')
      primeroRef.current?.blur()
    } catch {
      setErrores({ nueva: 'No se pudo conectar. Probá de nuevo.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {/*
        Campo de usuario oculto: sin él, el gestor de contraseñas del
        navegador guarda la clave nueva sin saber a qué cuenta pertenece
        y la próxima vez no la ofrece.
      */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={usuario}
        readOnly
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      />

      <Field
        label="Contraseña nueva"
        htmlFor="nueva"
        error={errores.nueva}
        helper={`Al menos ${MIN_CONTRASENA} caracteres.`}
      >
        <div className="relative">
          <Input
            ref={primeroRef}
            id="nueva"
            type={ver ? 'text' : 'password'}
            autoComplete="new-password"
            invalido={Boolean(errores.nueva)}
            className="h-11 pr-12 md:h-9"
            value={nueva}
            onChange={(e) => {
              setNueva(e.target.value)
              setListo(false)
            }}
          />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            aria-label={ver ? 'Ocultar las contraseñas' : 'Mostrar las contraseñas'}
            aria-pressed={ver}
            className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-pill text-faint transition-colors hover:text-ink md:size-9"
          >
            {ver ? (
              <EyeOff className="size-4 stroke-[1.75]" aria-hidden />
            ) : (
              <Eye className="size-4 stroke-[1.75]" aria-hidden />
            )}
          </button>
        </div>
      </Field>

      <Field label="Repetila" htmlFor="repetir" error={errores.repetir}>
        <Input
          id="repetir"
          type={ver ? 'text' : 'password'}
          autoComplete="new-password"
          className="h-11 md:h-9"
          invalido={Boolean(errores.repetir)}
          value={repetir}
          onChange={(e) => {
            setRepetir(e.target.value)
            setListo(false)
          }}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={guardando}>
          {!guardando && <Check aria-hidden />}
          Cambiar contraseña
        </Button>

        {/* El toast se va solo; esto queda mientras la pantalla siga abierta. */}
        <p aria-live="polite" className="t-helper">
          {listo ? 'Listo: la próxima vez entrás con la nueva.' : ''}
        </p>
      </div>
    </form>
  )
}
