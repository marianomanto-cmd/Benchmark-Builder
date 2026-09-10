'use client'

import { Plus } from 'lucide-react'
import * as React from 'react'

import { Button, Kbd, type ButtonProps } from '@/components/ui'
import { useWizard } from '@/components/wizard/use-wizard'

/**
 * Abre el wizard de alta. El wizard es un modal sobre la ruta actual
 * (`?nuevo=1`), así que la home no pierde los filtros ni el scroll.
 *
 * `atajo` muestra la tecla (`n`) al lado del texto. `Kbd` ya se esconde
 * solo en mobile, donde no hay teclado que anunciar.
 */
export function BotonNuevoPresupuesto({
  children = 'Nuevo presupuesto',
  variant = 'primary',
  size,
  full,
  className,
  atajo,
}: {
  children?: React.ReactNode
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  full?: boolean
  className?: string
  atajo?: boolean
}) {
  const { abrir } = useWizard()

  return (
    <Button variant={variant} size={size} full={full} className={className} onClick={abrir}>
      <Plus aria-hidden />
      {children}
      {atajo && (
        <Kbd
          className={
            variant === 'primary' ? 'border-white/30 bg-white/15 text-white/90' : undefined
          }
        >
          N
        </Kbd>
      )}
    </Button>
  )
}
