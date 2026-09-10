'use client'

import { Check, Copy } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Copia un texto y lo confirma en el mismo botón.
 *
 * Existe para lo que se pasa de una persona a otra: la contraseña que
 * un admin acaba de generar, el número de presupuesto que se dicta por
 * teléfono. Escribirlo a mano desde la pantalla es donde aparecen los
 * errores.
 *
 * El clipboard falla sin HTTPS o sin permiso, así que el estado sólo
 * pasa a «copiado» si de verdad copió.
 */
export function CopiarBoton({
  texto,
  etiqueta = 'Copiar',
  className,
}: {
  texto: string
  etiqueta?: string
  className?: string
}) {
  const [copiado, setCopiado] = React.useState(false)

  React.useEffect(() => {
    if (!copiado) return
    const id = window.setTimeout(() => setCopiado(false), 2000)
    return () => window.clearTimeout(id)
  }, [copiado])

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto)
          setCopiado(true)
        } catch {
          // Sin permiso de portapapeles: que no diga que copió.
        }
      }}
      aria-label={copiado ? 'Copiado' : `${etiqueta}: ${texto}`}
      className={cn(
        'inline-flex h-11 items-center gap-1.5 rounded-pill px-3 md:h-8',
        'font-sans text-[12px] font-medium transition-colors',
        copiado
          ? 'bg-tint text-primary-hover'
          : 'text-muted hover:bg-tint hover:text-ink',
        className,
      )}
    >
      {copiado ? (
        <Check className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Copy className="size-3.5 shrink-0" aria-hidden />
      )}
      {copiado ? 'Copiado' : etiqueta}
    </button>
  )
}
