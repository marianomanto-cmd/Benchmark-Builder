import { Skeleton } from '@/components/ui'

/**
 * Carga de las pantallas con sesión. Skeletons y no spinner: la silueta
 * ya anticipa la forma de Home (KPIs arriba, lista de presupuestos abajo),
 * así que el salto al contenido real no reacomoda la pantalla.
 */
export default function Cargando() {
  return (
    <div className="space-y-6" aria-busy role="status" aria-label="Cargando">
      <span className="sr-only">Cargando…</span>

      {/* Encabezado de pantalla */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Fila de KPIs: carrusel en mobile, grilla en desktop */}
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:px-0">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="min-w-[62%] shrink-0 rounded-card border border-hairline bg-card p-4 md:min-w-0"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Filtros de estado */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {[64, 88, 76, 92, 70].map((ancho, i) => (
          <Skeleton key={i} className="h-8 shrink-0 rounded-pill" style={{ width: ancho }} />
        ))}
      </div>

      {/* Listado: card por ítem en mobile, filas en desktop */}
      <div className="space-y-2.5 md:space-y-0 md:rounded-card md:border md:border-hairline md:bg-card md:shadow-rest">
        <div className="hidden items-center gap-4 border-b border-hairline px-5 py-3.5 md:flex">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="ml-auto h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>

        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-card border border-hairline bg-card p-4 shadow-rest md:flex md:items-center md:gap-4 md:rounded-none md:border-0 md:border-b md:border-hairline md:px-5 md:py-4 md:shadow-none md:last:border-b-0"
          >
            <div className="flex items-center gap-3 md:flex-1">
              <Skeleton className="size-9 shrink-0 rounded-pill" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-20 shrink-0 rounded-pill md:hidden" />
            </div>

            <Skeleton className="mt-3 h-6 w-24 rounded-pill md:mt-0 md:block" />

            <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3 md:mt-0 md:block md:border-0 md:pt-0">
              <Skeleton className="h-3 w-16 md:hidden" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
