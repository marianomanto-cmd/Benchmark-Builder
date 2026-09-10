'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { Kbd, ResponsiveModal } from '@/components/ui'
import { useAtajos } from '@/lib/hooks/use-atajos'

import { ATAJOS_NAVEGACION, ATAJOS_PANTALLA, TECLA_AYUDA, type Atajo } from './atajos'
import { useCuentaAbierta } from './cuenta'

/**
 * Los atajos del marco y la chuleta que los muestra.
 *
 * En el mostrador se salta entre Home, Pipeline y Biblioteca todo el
 * día: hacerlo sin soltar el teclado son tres teclas. `?` abre la lista
 * completa, que además es la única forma de que alguien se entere de
 * que existen.
 */
export function AtajosShell({
  ayudaAbierta,
  onAyuda,
}: {
  ayudaAbierta: boolean
  onAyuda: (abierta: boolean) => void
}) {
  const router = useRouter()
  // Vaul no marca el `body` como bloqueado, así que `useAtajos` no ve la
  // hoja de cuenta abierta: navegar por detrás la dejaría flotando sobre
  // otra pantalla.
  const cuentaAbierta = useCuentaAbierta()

  const atajos = React.useMemo(() => {
    const mapa: Record<string, () => void> = {
      [TECLA_AYUDA]: () => {
        if (!cuentaAbierta) onAyuda(true)
      },
    }
    // Las teclas salen de la misma lista que se dibuja en la topbar y en
    // la chuleta: no puede haber un atajo que la pantalla prometa y no
    // exista, ni al revés.
    for (const atajo of ATAJOS_NAVEGACION) {
      mapa[atajo.tecla] = () => {
        if (!cuentaAbierta) router.push(atajo.href)
      }
    }
    return mapa
  }, [cuentaAbierta, onAyuda, router])

  useAtajos(atajos)

  return (
    <ResponsiveModal
      open={ayudaAbierta}
      onOpenChange={onAyuda}
      ancho="sm"
      titulo="Atajos de teclado"
      descripcion="Sirven cuando no estás escribiendo en un campo."
    >
      <div className="flex flex-col gap-5">
        <Grupo titulo="Navegar" atajos={ATAJOS_NAVEGACION} />
        <Grupo titulo="En cada pantalla" atajos={ATAJOS_PANTALLA} />
        <Grupo titulo="Ayuda" atajos={[{ tecla: TECLA_AYUDA, que: 'Esta lista' }]} />
      </div>
    </ResponsiveModal>
  )
}

function Grupo({ titulo, atajos }: { titulo: string; atajos: Atajo[] }) {
  return (
    <section>
      <h3 className="t-label">{titulo}</h3>
      <ul className="mt-2 flex flex-col">
        {atajos.map((atajo) => (
          <li
            key={`${atajo.tecla}-${atajo.que}`}
            className="flex items-baseline gap-3 border-b border-hairline py-2 last:border-b-0"
          >
            {/* `Kbd` se esconde en mobile; acá la tecla ES el contenido. */}
            <Kbd className="inline-flex shrink-0">{atajo.tecla}</Kbd>
            <span className="min-w-0 flex-1 font-sans text-[13.5px] text-ink">{atajo.que}</span>
            {atajo.donde && <span className="shrink-0 t-helper">{atajo.donde}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
