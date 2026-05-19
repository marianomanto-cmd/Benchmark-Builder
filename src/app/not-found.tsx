/**
 * 404 global — handoff §5. Renderiza dentro del root layout (fuentes + tokens).
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper grid place-items-center p-6">
      <div className="text-center max-w-md">
        <div className="t-mono text-[11px] text-sa-base uppercase tracking-[0.12em] font-semibold">ERROR 404</div>
        <h1 className="t-display mt-3 text-balance">Esta página no existe.</h1>
        <p className="t-body text-n-600 mt-3">
          El enlace puede estar roto o la sección se movió. Volvé al resumen del proyecto.
        </p>
        <Link
          href={"/overview" as never}
          className="inline-flex items-center justify-center h-9 px-4 mt-6 rounded-sm bg-n-900 text-white text-[13px] font-medium hover:bg-n-800 transition-colors"
        >
          Volver al resumen
        </Link>
      </div>
    </div>
  );
}
