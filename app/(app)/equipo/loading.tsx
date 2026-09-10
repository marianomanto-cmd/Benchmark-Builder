import { Skeleton } from '@/components/ui'

/**
 * Carga de «Equipo y accesos».
 *
 * Sin este archivo la ruta caía en `app/(app)/loading.tsx`, que calca la
 * home: cuatro KPIs, la barra de filtros y una tabla de diez columnas.
 * Se veía un rato la home vacía y después saltaba a otra pantalla
 * entera. Un esqueleto que no coincide es peor que ninguno.
 */

const FILAS = [0, 1, 2, 3]

export default function Cargando() {
  return (
    <div className="flex flex-col gap-5" aria-busy role="status" aria-label="Cargando">
      <span className="sr-only">Cargando el equipo…</span>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="mt-1.5 h-4 w-[30rem] max-w-full" />
        </div>
        <Skeleton className="h-11 w-[150px] rounded-pill md:h-[34px]" />
      </div>

      <Skeleton className="h-3 w-40" />

      {/* Desktop: la tabla de cinco columnas dentro de su card. */}
      <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest md:block">
        <div className="flex items-center gap-4 border-b border-hairline px-5 py-2.5">
          <Skeleton className="h-3 w-[180px] shrink-0" />
          <Skeleton className="h-3 w-24 shrink-0" />
          <Skeleton className="h-3 w-20 shrink-0" />
          <Skeleton className="h-3 w-20 shrink-0" />
          <Skeleton className="ml-auto h-3 w-16 shrink-0" />
        </div>

        {FILAS.map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-hairline px-5 py-[15px] last:border-b-0"
          >
            <div className="w-[180px] shrink-0 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton className="h-4 w-20 shrink-0" />
            <Skeleton className="h-6 w-11 shrink-0 rounded-pill" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-7 w-[108px] rounded-pill" />
              <Skeleton className="h-7 w-[98px] rounded-pill" />
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: card por persona. */}
      <div className="flex flex-col gap-3 md:hidden">
        {FILAS.map((i) => (
          <div key={i} className="rounded-card border border-hairline bg-card p-4 shadow-rest">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-[22px] w-44 max-w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 shrink-0 rounded-pill" />
            </div>
            <Skeleton className="mt-3 h-11 w-full rounded-input" />
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-11 w-[124px] rounded-pill" />
              <Skeleton className="h-11 w-[112px] rounded-pill" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-[92px] w-full rounded-card" />
    </div>
  )
}
