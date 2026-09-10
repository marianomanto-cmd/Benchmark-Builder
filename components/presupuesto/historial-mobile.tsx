'use client'

import { History } from 'lucide-react'

import { Button, Card, CardBody, CardHeader, CardTitle } from '@/components/ui'
import type { PresupuestoEvento } from '@/lib/types'

import { useDetalle } from './contexto'
import { UltimoEvento } from './timeline'

/**
 * Historial en mobile: una línea con el último movimiento y una salida
 * a la lista completa.
 *
 * En una pantalla de teléfono el timeline entero empuja las acciones
 * fuera de la vista; abajo pasa lo mismo con la barra fija. Con el
 * último evento alcanza para saber "en qué quedamos", y el resto está a
 * un toque.
 */
export function HistorialMobile({
  eventos,
  className,
  fallo,
}: {
  eventos: PresupuestoEvento[]
  className?: string
  /** La lectura no llegó: no es lo mismo que «no pasó nada». */
  fallo?: boolean
}) {
  const { abrirHistorial } = useDetalle()
  const ultimo = eventos[0] ?? null

  if (fallo) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="t-helper">
            No se pudo cargar el historial. Recargá la página: el registro está
            completo, lo que falló fue la lectura.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <UltimoEvento evento={ultimo} />
        <Button variant="secondary" size="touch" full onClick={abrirHistorial}>
          <History aria-hidden />
          Ver historial
          {eventos.length > 1 ? ` (${eventos.length} movimientos)` : ''}
        </Button>
      </CardBody>
    </Card>
  )
}
