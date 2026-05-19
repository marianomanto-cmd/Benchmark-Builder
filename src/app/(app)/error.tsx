/**
 * Error boundary del grupo (app) — handoff §5 "Error".
 * Renderiza dentro del ScreenShell (sidebar/topbar intactos). Patrón "API down /
 * token expirado": card danger con explicación + Reintentar / Ir a Ajustes.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[app] error boundary:", error);
  }, [error]);

  return (
    <div className="p-6 max-w-[640px] mx-auto">
      <div className="bg-white border border-danger/30 rounded-md p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="size-2 rounded-full bg-danger" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-danger">Error</span>
        </div>
        <h1 className="t-h2 mb-2">Algo se rompió al cargar esta vista</h1>
        <p className="t-body text-n-600 mb-4">
          Puede ser una fuente caída o un token vencido. Reintentá; si persiste, revisá las
          integraciones en Ajustes.
        </p>
        {error.digest && (
          <div className="t-mono text-[11px] text-n-500 bg-n-50 rounded-sm px-2 py-1 mb-4">
            ref: {error.digest}
          </div>
        )}
        <div className="flex gap-2">
          <Btn kind="primary" size="md" onClick={reset}>
            Reintentar
          </Btn>
          <Btn kind="secondary" size="md" onClick={() => router.push("/settings" as never)}>
            Ir a Ajustes
          </Btn>
        </div>
      </div>
    </div>
  );
}
