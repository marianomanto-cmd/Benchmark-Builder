import { money } from '@/lib/formato'
import { cn } from '@/lib/utils'

/**
 * Todo monto en pantalla pasa por acá: garantiza tabular-nums y el
 * formato es-AR (`$ 128.400`).
 *
 * `jerarquia`:
 *   hero   → el número que el paciente busca (34px)
 *   fuerte → "a cargo" en tablas: peso 600, tinta
 *   normal → total y subtotales: gris
 *   apagado→ presupuesto cerrado, ya no está en juego
 */
export function Monto({
  valor,
  jerarquia = 'normal',
  className,
}: {
  valor: number | string | null | undefined
  jerarquia?: 'hero' | 'fuerte' | 'normal' | 'apagado'
  className?: string
}) {
  return (
    <span
      data-monto=""
      className={cn(
        'tabular-nums whitespace-nowrap',
        jerarquia === 'hero' && 't-hero-num',
        jerarquia === 'fuerte' && 'font-semibold text-ink',
        jerarquia === 'normal' && 'text-muted',
        jerarquia === 'apagado' && 'text-faint',
        className,
      )}
    >
      {money(valor)}
    </span>
  )
}
