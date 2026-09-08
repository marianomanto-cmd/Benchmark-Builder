'use client'

import { CircleSlash, Clock, MoveRight } from 'lucide-react'

import { Button, Card, CardBody, CardHeader, CardTitle, EstadoBadge } from '@/components/ui'
import {
  DIAS_SIN_RESPUESTA,
  ETIQUETA_ESTADO,
  estaFrio,
  puedeMarcarsePerdido,
  transicionesSugeridas,
} from '@/lib/estados'
import type { EstadoPresupuesto } from '@/lib/types'

import { useDetalle } from './contexto'

/**
 * Panel de seguimiento: dónde está el presupuesto y a un clic de qué.
 *
 * Las transiciones sugeridas no abren ningún diálogo — mover un
 * presupuesto en el pipeline es la acción más frecuente del día y no
 * merece un paso de confirmación. La única que sí lo pide es "perdido",
 * porque necesita el motivo.
 */
export function PanelSeguimiento({
  estado,
  diasEnEstado,
}: {
  estado: EstadoPresupuesto
  /** Calculado en el servidor para que no haya desfasaje al hidratar. */
  diasEnEstado: number
}) {
  const { cambiar, abrirEstado, abrirPerdido, aplicando, cambiando } = useDetalle()
  const sugeridas = transicionesSugeridas(estado)
  const frio = estaFrio(estado, diasEnEstado)

  return (
    <Card className="animate-enter">
      <CardHeader>
        <CardTitle>Seguimiento</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge estado={estado} />
          <span className="t-helper flex items-center gap-1">
            <Clock aria-hidden className="size-3.5 text-faint" />
            {diasEnEstado === 0
              ? 'desde hoy'
              : `hace ${diasEnEstado} ${diasEnEstado === 1 ? 'día' : 'días'}`}
          </span>
        </div>

        {frio && (
          <p className="rounded-input border border-warm-line/25 bg-warm-soft px-3 py-2 text-[13px] leading-relaxed text-warm-ink">
            Pasaron más de {DIAS_SIN_RESPUESTA} días sin novedades. Un mensaje corto suele
            destrabarlo.
          </p>
        )}

        {sugeridas.length > 0 ? (
          <div>
            <p className="t-label">Pasar a</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sugeridas.map((destino) => (
                <Button
                  key={destino}
                  variant="secondary"
                  size="touch"
                  className="md:h-[34px] md:px-4"
                  onClick={() => cambiar(destino)}
                  loading={aplicando === destino}
                  disabled={cambiando}
                >
                  <MoveRight aria-hidden />
                  {ETIQUETA_ESTADO[destino]}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p className="t-helper">
            {estado === 'iniciado'
              ? 'El tratamiento ya arrancó: no queda nada por mover acá.'
              : 'No hay un paso siguiente sugerido. Podés elegir el estado a mano.'}
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-hairline pt-3">
          <Button variant="ghost" size="touch" className="md:h-[34px]" onClick={abrirEstado}>
            Elegir otro estado
          </Button>

          {puedeMarcarsePerdido(estado) && (
            /* Nunca un ícono solo en una acción negativa: va con texto. */
            <Button variant="danger" size="touch" className="md:h-[34px]" onClick={abrirPerdido}>
              <CircleSlash aria-hidden />
              Marcar como perdido
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
