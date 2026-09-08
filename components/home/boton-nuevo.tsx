'use client'

import { Plus } from 'lucide-react'
import * as React from 'react'

import { Button, type ButtonProps } from '@/components/ui'
import { useWizard } from '@/components/wizard/use-wizard'

/**
 * Abre el wizard de alta. El wizard es un modal sobre la ruta actual
 * (`?nuevo=1`), así que la home no pierde los filtros ni el scroll.
 */
export function BotonNuevoPresupuesto({
  children = 'Nuevo presupuesto',
  variant = 'primary',
  size,
  full,
  className,
}: {
  children?: React.ReactNode
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  full?: boolean
  className?: string
}) {
  const { abrir } = useWizard()

  return (
    <Button variant={variant} size={size} full={full} className={className} onClick={abrir}>
      <Plus aria-hidden />
      {children}
    </Button>
  )
}
