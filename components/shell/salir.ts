'use client'

import * as React from 'react'

import { cerrarSesion } from '@/app/actions/auth'
import { borrarBorrador } from '@/lib/draft'

/**
 * Cerrar sesión, una sola vez y en un solo lugar.
 *
 * Se sale desde dos lados (el menú de desktop y la hoja de cuenta de
 * mobile) y las dos tienen que hacer lo mismo: el borrador vive en el
 * navegador **con el nombre del paciente**, así que en una máquina
 * compartida no puede sobrevivir al logout. Cuando eso estaba copiado
 * en cada botón, alcanzaba con agregar una salida nueva y olvidarse.
 */
export function useSalir(): { saliendo: boolean; salir: () => void } {
  const [saliendo, empezarSalida] = React.useTransition()

  const salir = React.useCallback(() => {
    empezarSalida(async () => {
      borrarBorrador()
      await cerrarSesion()
    })
  }, [])

  return { saliendo, salir }
}
