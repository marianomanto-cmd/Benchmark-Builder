import { Skeleton } from '@/components/ui'

/**
 * Carga de las pantallas con sesión.
 *
 * Calca la home, que es la que se abre diez veces por día: mismo ritmo
 * vertical (`gap-5`), misma grilla de KPIs —2×2 en mobile, 2/4 en
 * desktop—, misma barra sticky y mismo listado. Un esqueleto que no
 * coincide es peor que ninguno: el contenido salta al llegar y ese
 * salto se nota más que la espera.
 */

/** Anchos fijos para que el esqueleto no baile entre renders. */
const KPIS = [
  { label: 'w-24', hero: 'w-14', helper: 'w-28' },
  { label: 'w-32', hero: 'w-10', helper: 'w-24' },
  { label: 'w-28', hero: 'w-16', helper: 'w-32' },
  { label: 'w-28', hero: 'w-28', helper: 'w-24' },
]

function TarjetaKpi({ i }: { i: number }) {
  const k = KPIS[i]
  return (
    <div className="flex h-full flex-col gap-1.5 rounded-card border border-hairline bg-card p-4 sm:p-5">
      <Skeleton className={`h-3 ${k.label} max-w-full`} />
      {/* El alto de `t-hero-num` en mobile (21px abajo de 380, 23 desde
          ahí), para que el número no empuje al llegar. */}
      <Skeleton className={`h-[21px] min-[380px]:h-[23px] md:h-[28px] lg:h-[34px] ${k.hero} max-w-full`} />
      <Skeleton className={`h-3 ${k.helper} max-w-full`} />
    </div>
  )
}

export default function Cargando() {
  return (
    <div className="flex flex-col gap-5" aria-busy role="status" aria-label="Cargando">
      <span className="sr-only">Cargando…</span>

      {/* Encabezado: `t-h2` de 26px + una línea de helper. */}
      <div className="min-w-0">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="mt-1.5 h-4 w-[26rem] max-w-full" />
      </div>

      {/* KPIs: grilla 2×2 en mobile, 2/4 en desktop. Calca a `Kpis`: si
          el esqueleto no tiene la misma forma, al llegar los datos
          salta todo. */}
      <section>
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 md:hidden">
          {KPIS.map((_, i) => (
            <TarjetaKpi key={i} i={i} />
          ))}
        </div>
        <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((_, i) => (
            <TarjetaKpi key={i} i={i} />
          ))}
        </div>
      </section>

      {/* Barra de filtros sticky: mismas sangrías que la real. */}
      <div className="-mx-4 border-b border-hairline/70 px-4 py-3 md:-mx-8 md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2">
          <div className="md:min-w-[240px] md:flex-1">
            <Skeleton className="h-11 w-full rounded-input md:h-9" />
          </div>

          {/* Mobile: sólo el botón de filtros. Los chips de al lado
              existen únicamente cuando hay algo puesto, y al abrir la
              home sin filtros no hay ninguno: dibujarlos haría que la
              barra se achique al llegar los datos. */}
          <div className="md:hidden">
            <Skeleton className="h-11 w-[104px] rounded-pill" />
          </div>

          {/* Desktop: estado, profesional, obra social, fechas. */}
          <div className="hidden md:contents">
            <Skeleton className="h-[34px] w-[92px] rounded-pill" />
            <Skeleton className="h-[34px] w-[180px] rounded-input" />
            <Skeleton className="h-[34px] w-[180px] rounded-input" />
            <Skeleton className="h-[34px] w-[116px] rounded-pill" />
            <Skeleton className="ml-auto h-[38px] w-[168px] rounded-pill" />
          </div>
        </div>
      </div>

      {/* Listado. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-40" />
        </div>

        {/* Desktop: la tabla de diez columnas, dentro de su card. */}
        <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest md:block">
          <div className="flex items-center gap-3 border-b border-hairline px-5 py-2.5">
            <Skeleton className="h-3 w-16 shrink-0" />
            <Skeleton className="h-3 w-[150px] shrink-0" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="ml-auto h-3 w-20 shrink-0" />
            <Skeleton className="h-3 w-20 shrink-0" />
          </div>

          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-hairline px-5 py-[15px] last:border-b-0"
            >
              <Skeleton className="h-4 w-16 shrink-0" />
              <div className="w-[150px] shrink-0 space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="ml-auto h-4 w-20 shrink-0" />
              <Skeleton className="h-6 w-[88px] shrink-0 rounded-pill" />
            </div>
          ))}
        </div>

        {/* Mobile: card por presupuesto, con su número héroe. */}
        <div className="flex flex-col gap-3 md:hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-card border border-hairline bg-card p-4 shadow-rest">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-[22px] w-44 max-w-full" />
                  <Skeleton className="h-3 w-36 max-w-full" />
                </div>
                <Skeleton className="h-6 w-[86px] shrink-0 rounded-pill" />
              </div>

              <Skeleton className="mt-2 h-3 w-40 max-w-full" />

              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-[34px] w-32" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="size-11 rounded-pill" />
                  <Skeleton className="size-11 rounded-pill" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
