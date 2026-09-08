'use client'

import { MessageCircle, MoveRight } from 'lucide-react'

import { Button } from '@/components/ui'

import { useDetalle } from './contexto'

/**
 * Barra de acciones fija de mobile.
 *
 * Las dos cosas que se hacen parado al lado del sillón: mover el estado
 * y mandarle el presupuesto al paciente. Ambas de 44px de alto.
 *
 * Flota **sobre** la tabbar del shell y deja libre la columna derecha
 * para que el FAB de "nuevo presupuesto" no le pase por encima: los
 * tres controles quedan alineados en la misma franja.
 */
export function BarraMobile() {
  const { abrirEstado, abrirWhatsApp, cambiando } = useDetalle()

  return (
    <div
      className="no-print fixed left-3 z-40 flex items-center gap-2 rounded-pill border border-hairline bg-card/95 p-1.5 shadow-lift backdrop-blur-md md:hidden"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
        // 56 del FAB + 16 de su margen derecho + 12 de aire.
        right: 'calc(56px + 1rem + 0.75rem)',
      }}
    >
      <Button
        variant="ghost"
        size="touch"
        full
        className="px-3"
        onClick={abrirEstado}
        disabled={cambiando}
      >
        <MoveRight aria-hidden />
        Estado
      </Button>

      <Button variant="primary" size="touch" full className="px-3" onClick={abrirWhatsApp}>
        <MessageCircle aria-hidden />
        WhatsApp
      </Button>
    </div>
  )
}
