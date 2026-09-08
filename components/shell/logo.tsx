import { cn } from '@/lib/utils'

/**
 * Marca de Smile Lab. Va inline (no `<img src="/brand/logo.svg">`) porque
 * el wordmark tiene que renderizarse con Sora, la display del sistema:
 * dentro de un SVG externo la fuente no está garantizada. El archivo
 * `public/brand/logo.svg` existe para usos fuera de la app (mail, PDF).
 */

const TAMANOS = {
  sm: { marca: 26, texto: 'text-[15px]', gap: 'gap-2' },
  md: { marca: 30, texto: 'text-[17px]', gap: 'gap-2.5' },
  lg: { marca: 44, texto: 'text-[24px]', gap: 'gap-3' },
} as const

export type TamanoLogo = keyof typeof TAMANOS

/** Sólo el símbolo: cuadrado redondeado con la sonrisa. */
export function MarcaSmileLab({
  size = 30,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <rect width="28" height="28" rx="9" className="fill-primary" />
      <path
        d="M8.6 13.4c0 3.2 2.4 5.8 5.4 5.8s5.4-2.6 5.4-5.8"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="10.9" cy="9.3" r="1.55" fill="#FFFFFF" />
      <circle cx="17.1" cy="9.3" r="1.55" fill="#FFFFFF" />
    </svg>
  )
}

/** Marca + wordmark. `soloMarca` para lugares angostos. */
export function Logo({
  tamano = 'md',
  soloMarca = false,
  className,
}: {
  tamano?: TamanoLogo
  soloMarca?: boolean
  className?: string
}) {
  const t = TAMANOS[tamano]

  return (
    <span className={cn('inline-flex items-center', t.gap, className)}>
      <MarcaSmileLab size={t.marca} />
      {!soloMarca && (
        <span
          className={cn(
            'font-display font-semibold leading-none tracking-[-0.03em] text-primary',
            t.texto,
          )}
        >
          Smile Lab
        </span>
      )}
      <span className="sr-only">Smile Lab · Presupuestos</span>
    </span>
  )
}
