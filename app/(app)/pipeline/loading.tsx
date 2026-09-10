import { Skeleton } from '@/components/ui'

/**
 * Carga del pipeline.
 *
 * Sin este archivo, `/pipeline` heredaba el `loading` de la app —cuatro
 * KPIs y una tabla de diez columnas— y al llegar los datos el esqueleto
 * se desarmaba entero para dejar un kanban. Un esqueleto que no coincide
 * es peor que ninguno: el salto se nota más que la espera.
 *
 * Éste calca lo que viene: encabezado con el total a la derecha, fila de
 * filtros, cinco columnas con su cabecera (etiqueta, conteo y monto) y
 * la franja de perdidos al pie.
 */

/** Cuántas tarjetas dibuja cada columna. Distinto por columna, como en
 *  la realidad: cinco pilas iguales se leen como una plantilla. */
const TARJETAS = [4, 3, 5, 2, 3]

const ANCHOS_ETIQUETA = ['w-20', 'w-16', 'w-20', 'w-[76px]', 'w-[104px]']

function TarjetaFantasma() {
  return (
    <div className="flex flex-col gap-2 rounded-input border border-hairline bg-card p-3 shadow-rest">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* 14px del nombre del paciente + la prestación en helper. */}
          <Skeleton className="h-[15px] w-28 max-w-full" />
          <Skeleton className="h-3 w-20 max-w-full" />
        </div>
        <div className="w-[72px] shrink-0 space-y-1.5">
          <Skeleton className="ml-auto h-2.5 w-12" />
          <Skeleton className="ml-auto h-[15px] w-[68px]" />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-[18px] w-[84px] rounded-pill" />
        <Skeleton className="ml-auto h-3 w-12" />
      </div>
    </div>
  )
}

export default function Cargando() {
  return (
    <div className="flex flex-col gap-5" aria-busy role="status" aria-label="Cargando el pipeline">
      <span className="sr-only">Cargando el pipeline…</span>

      {/* Encabezado: `t-h2` de 26px, helper y el total a cargo. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Skeleton className="h-8 w-40 max-w-full" />
          <Skeleton className="mt-1.5 h-4 w-[24rem] max-w-full" />
        </div>
        <div className="flex items-end gap-5">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-[34px] w-40" />
          </div>
          <Skeleton className="hidden h-10 w-[164px] rounded-pill md:block" />
        </div>
      </div>

      {/* Mobile: el aviso de «esto se usa en escritorio». */}
      <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-hairline bg-card/60 px-6 py-14 md:hidden">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-5 w-56 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="mt-2 h-11 w-full rounded-pill" />
      </div>

      <div className="hidden flex-col gap-4 md:flex">
        {/* Filtros. */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-[34px] w-[180px] rounded-input" />
          <Skeleton className="h-[34px] w-[190px] rounded-input" />
          <Skeleton className="h-[38px] w-[292px] rounded-input" />
        </div>

        {/* Las cinco columnas. */}
        <div className="-mx-8 overflow-x-hidden px-8">
          <div className="grid min-w-[980px] grid-cols-5 gap-3">
            {TARJETAS.map((cuantas, i) => (
              <section
                key={i}
                className="flex min-w-0 flex-col rounded-card border border-hairline bg-[#F8FBFC]"
              >
                <header className="shrink-0 px-3 pb-2 pt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <Skeleton className={`h-[15px] ${ANCHOS_ETIQUETA[i]}`} />
                    <Skeleton className="h-[18px] w-7 rounded-pill" />
                  </div>
                  <Skeleton className="mt-1.5 h-3 w-24" />
                </header>

                <div className="flex flex-col gap-2 px-2 pb-2.5 pt-0.5">
                  {Array.from({ length: cuantas }, (_, j) => (
                    <TarjetaFantasma key={j} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* La franja de perdidos. */}
        <div className="flex items-center gap-5 rounded-card border border-dashed border-hairline bg-card px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-pill" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="space-y-1.5 border-l border-hairline pl-5">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-1.5 border-l border-hairline pl-5">
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>
    </div>
  )
}
