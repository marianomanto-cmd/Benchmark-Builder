import { Skeleton } from '@/components/ui'

/**
 * Calca la pantalla, no un rectángulo genérico: mismas cuatro tarjetas
 * arriba, mismos bloques abajo y las mismas dos columnas en escritorio.
 * Un esqueleto que no calca hace saltar todo el contenido al llegar, y
 * la pantalla parece que se rompió y se rehizo.
 */
export default function Cargando() {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Skeleton className="h-7 w-[168px]" />
          <Skeleton className="mt-2 h-4 w-[280px]" />
        </div>
        <Skeleton className="h-10 w-[248px] rounded-pill" />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-card border border-hairline bg-card p-4 shadow-rest sm:p-5">
            <Skeleton className="h-3 w-[90px]" />
            <Skeleton className="mt-2 h-8 w-[110px]" />
            <Skeleton className="mt-2 h-3 w-[130px]" />
          </div>
        ))}
      </div>

      <BloqueVacio alto="h-[236px]" />

      <div className="grid gap-5 lg:grid-cols-2">
        <BloqueVacio alto="h-[208px]" />
        <BloqueVacio alto="h-[208px]" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BloqueVacio alto="h-[176px]" />
        <BloqueVacio alto="h-[176px]" />
      </div>

      <BloqueVacio alto="h-[240px]" />
    </div>
  )
}

function BloqueVacio({ alto }: { alto: string }) {
  return (
    <div className="surface p-5 md:p-6">
      <Skeleton className="h-5 w-[190px]" />
      <Skeleton className="mt-2 h-3.5 w-[70%]" />
      <Skeleton className={`shimmer mt-5 w-full ${alto}`} />
    </div>
  )
}
