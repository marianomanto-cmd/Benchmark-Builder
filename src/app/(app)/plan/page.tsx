/**
 * ResearchPlanReview (05) — handoff §4.5. Pantalla crítica de control de costo.
 * Toggle de fuentes atenúa la fila y decrementa el total con counter animation.
 * "Aprobar y ejecutar" → modal de confirmación → toast + transición a /feed.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Btn, Modal, useToast } from "@/components/ui";
import { PlatformBadge } from "@/components/domain";
import { PLAN_SOURCES, PLAN_PARAMS } from "@/lib/fixtures/plan";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

const IcCheck = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 5 5L19 6" />
  </svg>
);
const IcEdit = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const IcBolt = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
  </svg>
);

function useCountUp(target: number, ms = 350) {
  const [val, setVal] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const from = ref.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

export default function PlanPage() {
  const router = useRouter();
  const { push } = useToast();
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(PLAN_SOURCES.map((s) => s.platform)));
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggle = (platform: string) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });

  const { totalCost, totalCount } = useMemo(() => {
    let cost = 0;
    let count = 0;
    PLAN_SOURCES.forEach((s) => {
      if (enabled.has(s.platform)) {
        cost += s.cost;
        count += s.volumeCount;
      }
    });
    return { totalCost: cost, totalCount: count };
  }, [enabled]);

  const animatedCost = useCountUp(totalCost);
  const animatedCount = useCountUp(totalCount);

  const approve = () => {
    setConfirmOpen(false);
    push({
      kind: "success",
      title: "Run #043 iniciado",
      body: "4 min 12 s estimado · te avisamos al terminar.",
    });
    router.push("/feed" as never);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* Left: plan */}
        <div>
          <div className="t-micro text-sa-base">STEP 2 / 4 · PLAN PROPUESTO</div>
          <h1 className="t-h1 mt-1.5">Antes de gastar tokens, mostrámelo.</h1>
          <p className="t-body text-n-600 mt-2 max-w-[540px]">
            La IA propone qué scrapear, dónde y por qué. Vos editás las fuentes, ajustás filtros y
            aprobás antes del run.
          </p>

          <div className="mt-5 bg-white border border-n-200 rounded-md p-[18px]">
            <div className="t-micro">FUENTES PROPUESTAS · {PLAN_SOURCES.length} PLATAFORMAS</div>
            <div className="mt-3 flex flex-col">
              {PLAN_SOURCES.map((s, i) => {
                const on = enabled.has(s.platform);
                return (
                  <div
                    key={s.platform}
                    className={cn(
                      "flex items-center gap-3.5 py-3 transition-opacity",
                      i > 0 && "border-t border-n-100",
                      !on && "opacity-50",
                    )}
                  >
                    <button
                      onClick={() => toggle(s.platform)}
                      aria-pressed={on}
                      aria-label={`${on ? "Quitar" : "Agregar"} ${s.name}`}
                      className={cn(
                        "size-[18px] rounded-[3px] border grid place-items-center text-white shrink-0 transition-colors",
                        on ? "bg-sa-base border-sa-base" : "bg-white border-n-300",
                      )}
                    >
                      {on && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.12 }}>
                          {IcCheck}
                        </motion.span>
                      )}
                    </button>
                    <PlatformBadge platform={s.platform} size="md" />
                    <div className="flex-[0_0_130px] text-[13px] font-medium">{s.name}</div>
                    <div className="flex-1 t-mono text-[11px] text-n-500 truncate">
                      {s.accounts.slice(0, 3).join(" · ")}
                      {s.accounts.length > 3 ? ` +${s.accounts.length - 3}` : ""}
                    </div>
                    <div className="flex-[0_0_90px] t-mono text-[11px] text-n-700">{s.volume}</div>
                    <div className="flex-[0_0_70px] t-mono text-[11px] text-n-900 text-right font-medium">
                      {formatCurrency(s.cost)}
                    </div>
                    <Btn kind="ghost" size="sm" icon={IcEdit}>
                      Editar
                    </Btn>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 pt-3.5 border-t border-n-200 flex items-center gap-3.5">
              <span className="t-micro text-n-500">TOTAL ESTIMADO</span>
              <div className="flex-1" />
              <span className="t-mono text-[11px] text-n-500">
                ~{formatNumber(Math.round(animatedCount))} piezas · 4 min 12 s
              </span>
              <span className="font-mono tabular-nums text-[18px] font-semibold text-n-900">
                {formatCurrency(animatedCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: reasoning + params + actions */}
        <div className="flex flex-col gap-3.5">
          <div className="bg-white border border-n-200 rounded-md p-[18px]">
            <div className="t-micro">RAZONAMIENTO · IA</div>
            <div className="mt-3 text-[13px] leading-[21px] text-n-700">
              <p className="m-0">
                Para evaluar a Copa contra los principales operadores en la ruta <b>Cartagena</b>,
                propongo cubrir las plataformas donde concentran su volumen orgánico (Instagram,
                TikTok, YouTube), donde se discute la marca sin filtro (Reddit) y donde la inversión
                paga es decisiva en este vertical (Meta Ad Library).
              </p>
              <p className="mt-2.5 mb-0">
                Excluí <b>LinkedIn</b> y <b>Pinterest</b>: volumen marginal en aerolíneas
                latinoamericanas para audiencia de turismo. Si querés cubrir B2B, agregalas
                manualmente.
              </p>
            </div>
          </div>

          <div className="bg-n-50 border border-n-200 rounded-md p-[18px]">
            <div className="t-micro">PARÁMETROS</div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {PLAN_PARAMS.map((p) => (
                <div
                  key={p.k}
                  className="flex justify-between items-center px-3 py-2 bg-white border border-n-200 rounded-sm"
                >
                  <span className="t-mono text-[11px] text-n-500 uppercase tracking-[0.06em]">{p.k}</span>
                  <span className={cn("t-mono text-[12px] font-medium", p.pos ? "text-success" : "text-n-900")}>
                    {p.v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Btn kind="secondary" size="md">
              Editar plan
            </Btn>
            <div className="flex-1" />
            <Btn kind="ghost" size="md" onClick={() => router.push("/overview" as never)}>
              Cancelar
            </Btn>
            <Btn kind="accent" size="md" iconRight={IcBolt} onClick={() => setConfirmOpen(true)} disabled={enabled.size === 0}>
              Aprobar y ejecutar
            </Btn>
          </div>
        </div>
      </div>

      {/* Sticky cost bar — mobile. El costo nunca se pierde de vista (handoff §4.5). */}
      <div className="lg:hidden sticky bottom-[78px] -mx-6 mt-5 px-4 py-3 bg-white/95 backdrop-blur border-t border-n-200 flex items-center gap-3 z-20">
        <div>
          <div className="t-mono text-[10px] text-n-500 uppercase tracking-[0.08em]">total estimado</div>
          <div className="font-mono tabular-nums text-[18px] font-semibold text-n-900">{formatCurrency(animatedCost)}</div>
        </div>
        <div className="flex-1" />
        <Btn kind="accent" size="md" iconRight={IcBolt} onClick={() => setConfirmOpen(true)} disabled={enabled.size === 0}>
          Aprobar
        </Btn>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar ejecución del run"
        description={
          <>
            Vas a ejecutar el run sobre <b>{enabled.size}</b> plataforma{enabled.size === 1 ? "" : "s"}.
            Costo final estimado <b>{formatCurrency(totalCost)}</b> · ~{formatNumber(totalCount)} piezas ·
            tiempo estimado 4 min 12 s.
          </>
        }
        footer={
          <>
            <Btn kind="secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Btn>
            <Btn kind="accent" iconRight={IcBolt} onClick={approve}>
              Ejecutar run
            </Btn>
          </>
        }
      />
    </div>
  );
}
