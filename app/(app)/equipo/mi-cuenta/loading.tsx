import { Skeleton } from '@/components/ui'

/** Calca «Mi contraseña»: encabezado, card con dos campos y el botón. */
export default function Cargando() {
  return (
    <div
      className="mx-auto flex w-full max-w-[560px] flex-col gap-5"
      aria-busy
      role="status"
      aria-label="Cargando"
    >
      <span className="sr-only">Cargando…</span>

      <div>
        <Skeleton className="h-8 w-52 max-w-full" />
        <Skeleton className="mt-1.5 h-4 w-64 max-w-full" />
      </div>

      <div className="rounded-card border border-hairline bg-card shadow-rest">
        <div className="px-5 pb-3 pt-5">
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="mt-1.5 h-3 w-[22rem] max-w-full" />
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-full rounded-input" />
            </div>
          ))}
          <Skeleton className="h-11 w-[190px] rounded-pill md:h-[34px]" />
        </div>
      </div>
    </div>
  )
}
