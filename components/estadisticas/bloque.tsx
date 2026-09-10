import { cn } from '@/lib/utils'

/**
 * Un bloque de la pantalla: la pregunta arriba, la respuesta abajo.
 *
 * El título es la pregunta que alguien del consultorio se hace de
 * verdad («¿dónde se cae la venta?»), no el nombre técnico de la
 * métrica. Un tablero lleno de sustantivos —«Conversión», «Funnel»,
 * «Cohortes»— obliga a traducir antes de leer, y en el mostrador nadie
 * traduce: cierra la pestaña.
 */
export function Bloque({
  titulo,
  pregunta,
  accion,
  children,
  className,
}: {
  titulo: string
  pregunta?: string
  accion?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('surface p-5 md:p-6', className)}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="t-h3">{titulo}</h2>
          {pregunta && <p className="t-helper mt-0.5">{pregunta}</p>}
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </header>
      {children}
    </section>
  )
}

/**
 * Cuando un bloque no tiene nada que mostrar dice por qué, no se
 * esconde. Un bloque que desaparece hace dudar de si la pantalla se
 * rompió; uno que dice «todavía no se perdió ninguno» es una respuesta.
 */
export function SinDatos({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-input border border-dashed border-hairline px-4 py-6 text-center t-helper">
      {children}
    </p>
  )
}
