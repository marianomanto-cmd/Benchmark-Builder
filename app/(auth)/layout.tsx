/**
 * Shell de las pantallas sin sesión. Tarjeta centrada sobre `bg-page`,
 * sin navegación: acá todavía no hay a dónde ir.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-page px-4 py-10">
      {/* Halo suave detrás de la tarjeta, del mismo hue que el primary. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] size-[560px] -translate-x-1/2 rounded-pill bg-tint opacity-70 blur-3xl"
      />

      <main className="relative z-10 w-full max-w-[430px]">{children}</main>

      <footer className="relative z-10 mt-8 text-center t-helper">
        Uso interno del consultorio.
      </footer>
    </div>
  )
}
