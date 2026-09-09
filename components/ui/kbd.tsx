import { cn } from '@/lib/utils'

/**
 * Tecla de atajo. Se muestra sólo en desktop: en un celular no hay
 * teclado que mostrar y ocuparía lugar sin decir nada.
 */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'hidden md:inline-flex h-5 min-w-5 items-center justify-center rounded-[5px]',
        'border border-hairline bg-page px-1.5',
        'font-sans text-[10.5px] font-semibold text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
