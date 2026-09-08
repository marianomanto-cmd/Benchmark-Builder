'use client'

import { LogOut } from 'lucide-react'
import * as React from 'react'

import { cerrarSesion } from '@/app/actions/auth'
import { Button } from '@/components/ui'
import { borrarBorrador } from '@/lib/draft'

/**
 * Cerrar sesión también limpia el borrador del navegador.
 *
 * El autoguardado del wizard vive en `localStorage` con el nombre del
 * paciente y la nota interna adentro. La computadora de la recepción la
 * usa todo el consultorio: si el borrador sobrevive al logout, el
 * siguiente que entra ve el paciente del anterior en el banner de la
 * home. La sesión de Supabase la cierra el server action; esto es lo
 * que el servidor no puede tocar.
 */
export function BotonCerrarSesion() {
  const [saliendo, empezarSalida] = React.useTransition()

  return (
    <Button
      type="button"
      variant="danger"
      size="touch"
      loading={saliendo}
      onClick={() =>
        empezarSalida(async () => {
          borrarBorrador()
          await cerrarSesion()
        })
      }
    >
      {!saliendo && <LogOut aria-hidden />}
      {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </Button>
  )
}
