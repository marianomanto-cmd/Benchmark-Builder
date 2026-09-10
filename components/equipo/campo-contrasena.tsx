'use client'

import { Dices } from 'lucide-react'
import * as React from 'react'

import { Button, Input } from '@/components/ui'
import { sugerirContrasena } from '@/lib/auth/usuarios'

/**
 * Contraseña que alguien va a tener que leer y pasar.
 *
 * Va en claro a propósito —quien administra la está por dictar o
 * copiar, no la está escribiendo para sí— y con un botón que propone
 * una. Antes había que inventarla, y lo que se inventa a las apuradas
 * en un mostrador es «1234» o el nombre del consultorio.
 */
export function CampoContrasena({
  id,
  valor,
  onChange,
  invalido,
  autoFocus,
}: {
  id: string
  valor: string
  onChange: (valor: string) => void
  invalido?: boolean
  autoFocus?: boolean
}) {
  const ref = React.useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={ref}
        id={id}
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        // Que el gestor de contraseñas del navegador no la guarde como
        // si fuera la de quien administra: no es suya.
        data-1p-ignore
        data-lpignore="true"
        invalido={invalido}
        autoFocus={autoFocus}
        className="h-11 flex-1 tracking-[0.04em] tnum md:h-9"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
      <Button
        type="button"
        variant="secondary"
        size="md"
        className="shrink-0"
        onClick={() => {
          onChange(sugerirContrasena())
          ref.current?.focus()
        }}
      >
        <Dices aria-hidden />
        Sugerir
      </Button>
    </div>
  )
}
