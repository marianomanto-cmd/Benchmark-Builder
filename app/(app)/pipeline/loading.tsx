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
 * la franja de perdidos al pie. Desde `md`, igual que el tablero, y sin
 * piso de ancho: las columnas se reparten lo que hay.
 */

/** Cuántas tarjetas dibuja cada columna. Distinto por columna, como en
 *  la realidad: cinco pilas iguales se leen como una plantilla. */
const TARJETAS = [4, 3, 5, 2, 3]

const ANCHOS_ETIQUETA = ['w-[70%]', 'w-[60%]', 'w-[72%]', 'w-[76%]', 'w-[86%]']

function TarjetaFantasma() {
  return (
    <div className="flex flex-col gap-1.5 rounded-input border border-hairline bg-card p-2.5 shadow-rest lg:gap-2 lg:p-3">
      {/* Nombre del paciente (14px) y la prestación en helper. */}
      <div className="space-y-1.5">
        <Skeleton className="h-[15px] w-[85%]" />
        <Skeleton className="h-3 w-[60%]" />
      </div>
      {/* El monto a cargo y los días en el estado. */}
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-[15px] w-[55%]" />
        <Skeleton className="h-3 w-[25%]" />
      </div>
      {/* La obra social. */}
      <Skeleton className="h-6 w-[60%] rounded-pill" />
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

      {/* Teléfono: el aviso de «se usa en una pantalla más ancha». */}
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

        <div className="flex flex-col gap-3 md:-mx-4 lg:mx-0">
          {/* Las cinco columnas. */}
          <div className="grid grid-cols-5 gap-2 lg:gap-3">
            {TARJETAS.map((cuantas, i) => (
              <section
                key={i}
                className="flex min-w-0 flex-col rounded-card border border-hairline bg-[#F8FBFC]"
              >
                <header className="shrink-0 px-2.5 pb-2 pt-2.5 lg:px-3 lg:pt-3">
                  <Skeleton className={`h-[15px] max-w-full ${ANCHOS_ETIQUETA[i]}`} />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Skeleton className="h-3 w-[60%]" />
                    <Skeleton className="h-[18px] w-7 shrink-0 rounded-pill" />
                  </div>
                </header>

                <div className="flex flex-col gap-2 px-1.5 pb-2 pt-1 lg:px-2 lg:pb-2.5">
                  {Array.from({ length: cuantas }, (_, j) => (
                    <TarjetaFantasma key={j} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* La franja de perdidos. */}
          <div className="flex items-center gap-4 rounded-card border border-dashed border-hairline bg-card px-4 py-3 lg:gap-5">
            <Skeleton className="size-8 shrink-0 rounded-pill" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="space-y-1.5 border-l border-hairline pl-4 lg:pl-5">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 border-l border-hairline pl-4 lg:pl-5">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-4 w-36 max-w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
