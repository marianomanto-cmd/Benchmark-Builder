/**
 * Alertas — lista de AlertCards con descarte + estado vacío (handoff §3.2 / §5).
 * No es una de las 7 pantallas diseñadas; cubre el destino del item Alertas del
 * sidebar y demuestra los estados de la severidad.
 */

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCard, type Severity } from "@/components/domain";
import { useToast } from "@/components/ui";

interface AlertFixture {
  id: string;
  severity: Severity;
  title: string;
  body: string;
  when: string;
  evidence?: string;
}

const ALERTS: AlertFixture[] = [
  {
    id: "al1",
    severity: "high",
    title: "Pico de sentimiento negativo · LATAM",
    body: "Las menciones negativas de LATAM subieron 38 % en 24 h, concentradas en demoras del vuelo a Cartagena.",
    when: "hace 2 h",
    evidence: "47 menciones · X / Grok · pico 14:00–16:00",
  },
  {
    id: "al2",
    severity: "med",
    title: "Nuevo creativo pago de Avianca",
    body: "Avianca lanzó un anuncio de video en Meta Ad Library con spend estimado USD 12–18k.",
    when: "hace 6 h",
    evidence: "Meta Ad Library · activo 14 d",
  },
  {
    id: "al3",
    severity: "low",
    title: "Run #042 completado",
    body: "Se procesaron 2.418 menciones en 4 min 12 s. Costo final USD 1,84.",
    when: "ayer",
  },
];

export default function AlertsPage() {
  const { push } = useToast();
  const [alerts, setAlerts] = useState(ALERTS);

  const dismiss = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  return (
    <div className="p-6 max-w-[760px] mx-auto flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <div>
          <div className="t-micro text-sa-base">MONITOREO</div>
          <h1 className="t-h1 mt-1.5">Alertas</h1>
        </div>
        <span className="t-mono text-[11px] text-n-500">{alerts.length} activas</span>
      </header>

      {alerts.length > 0 ? (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {alerts.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
              >
                <AlertCard
                  severity={a.severity}
                  title={a.title}
                  body={a.body}
                  when={a.when}
                  evidence={a.evidence}
                  onOpen={() => push({ kind: "info", title: "Abrir evidencia", body: "El detalle de la mención llega en Fase 2." })}
                  onMarkRead={() => push({ kind: "success", title: "Marcada como leída" })}
                  onDismiss={() => dismiss(a.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="border border-dashed border-n-300 rounded-md py-16 flex flex-col items-center text-center gap-3">
          <div className="size-10 rounded-full border border-dashed border-n-400 grid place-items-center text-n-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </div>
          <div className="t-h3">Sin alertas pendientes</div>
          <p className="t-body text-n-600 max-w-sm">Todo al día. Las nuevas alertas del monitoreo van a aparecer acá.</p>
        </div>
      )}
    </div>
  );
}
