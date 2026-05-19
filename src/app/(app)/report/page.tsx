/**
 * Reporte exportado · PDF (07) — handoff §4.7.
 * Viewer del deliverable: hoja US Letter portrait con la sección 04 diseñada.
 * Page pill + ← →, Descargar (print) y Compartir. La generación vectorial real
 * (@react-pdf/renderer) y el resto de las páginas llegan en Fase 2.
 */

"use client";

import { useState } from "react";
import { Btn, useToast } from "@/components/ui";
import { BBBarChart } from "@/components/charts/bb-bar-chart";

const TOTAL_PAGES = 14;
const DESIGNED_PAGE = 4;

const IcDownload = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" /></svg>
);
const IcShare = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>
);

const TABLE_ROWS: [string, string, string][] = [
  ["Avianca", "998", "41,3 %"],
  ["LATAM Colombia", "581", "24,0 %"],
  ["Wingo", "312", "12,9 %"],
  ["Arajet", "287", "11,9 %"],
  ["Copa Airlines", "240", "9,9 %"],
];

const LEGEND: [string, string][] = [
  ["Avianca", "var(--color-n-900)"],
  ["LATAM", "var(--color-n-700)"],
  ["Wingo", "var(--color-n-500)"],
  ["Arajet", "var(--color-n-300)"],
  ["Copa", "var(--color-sa-base)"],
];

export default function ReportPage() {
  const { push } = useToast();
  const [page, setPage] = useState(DESIGNED_PAGE);

  return (
    <div className="bg-n-100 min-h-[calc(100vh-3.5rem)]">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-paper/95 backdrop-blur border-b border-n-200 flex-wrap">
        <span className="inline-flex items-center gap-2 t-mono text-[12px] text-n-700 bg-white border border-n-300 rounded-full px-3 py-1">
          página {String(page).padStart(2, "0")} / {TOTAL_PAGES}
        </span>
        <Btn kind="ghost" size="sm" onClick={() => setPage(DESIGNED_PAGE)}>
          Índice
        </Btn>
        <div className="flex-1" />
        <Btn kind="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          ← Anterior
        </Btn>
        <Btn kind="secondary" size="sm" onClick={() => setPage((p) => Math.min(TOTAL_PAGES, p + 1))} disabled={page >= TOTAL_PAGES}>
          Siguiente →
        </Btn>
        <Btn kind="secondary" size="sm" icon={IcShare} onClick={() => push({ kind: "info", title: "Compartir", body: "Links compartibles llegan en Fase 2." })}>
          Compartir
        </Btn>
        <Btn kind="accent" size="sm" icon={IcDownload} onClick={() => window.print()}>
          Descargar PDF
        </Btn>
      </div>

      {/* Sheet */}
      <div className="p-6 flex justify-center">
        {page === DESIGNED_PAGE ? (
          <ReportSheet />
        ) : (
          <div className="w-[816px] max-w-full aspect-[816/1056] bg-white shadow-3 grid place-items-center text-center px-12">
            <div>
              <div className="t-mono text-[10px] text-sa-base uppercase tracking-[0.12em] font-semibold">
                SECCIÓN {String(page).padStart(2, "0")}
              </div>
              <div className="t-serif text-[28px] text-n-700 mt-3 text-balance">
                Esta página se genera desde el editor.
              </div>
              <p className="t-body text-n-500 mt-3 max-w-sm mx-auto">
                En Fase 1 sólo está diseñada la sección 04. El render completo del reporte llega con
                el pipeline de exportación en Fase 2.
              </p>
              <Btn kind="secondary" size="sm" className="mt-4" onClick={() => setPage(DESIGNED_PAGE)}>
                Ir a la sección 04
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportSheet() {
  return (
    <article className="w-[816px] max-w-full bg-white shadow-3 relative px-[88px] py-[72px] text-n-900" style={{ fontFamily: "var(--font-serif)" }}>
      {/* Running header */}
      <div className="absolute top-9 left-[88px] right-[88px] flex justify-between t-mono text-[10px] text-n-500 uppercase tracking-[0.08em]">
        <span>Benchmark Builder · Cartagena Q2 2026</span>
        <span>04 / 14</span>
      </div>
      <div className="absolute top-9 left-[88px] w-1.5 h-6 bg-sa-base" />

      <div className="t-mono text-[10px] text-sa-base tracking-[0.12em] uppercase font-semibold mt-2">
        SECCIÓN 04 · VOLUMEN Y SOV
      </div>
      <h1 className="text-[54px] leading-[58px] font-medium tracking-[-0.03em] mt-3.5 mb-2.5 text-balance">
        Cartagena, en el aire <em className="italic text-n-700">de cuatro aerolíneas.</em>
      </h1>
      <div className="t-mono text-[11px] text-n-500 mb-[18px] tracking-[0.04em]">
        Período · 1 mar – 30 abr 2026 · 5 competidores · 7 plataformas · 2.418 menciones
      </div>

      <div className="grid grid-cols-2 gap-6 mb-5">
        <p className="text-[14px] leading-[22px] m-0 text-pretty">
          Entre el 1 de marzo y el 30 de abril de 2026, las cinco aerolíneas con presencia activa en
          la ruta produjeron <span className="font-mono text-[13px]">2.418</span> piezas relacionadas a
          Cartagena. <em>Avianca</em> concentra el <b className="text-sa-base">41,3 %</b> del volumen
          total, seguida por LATAM (24 %) y Wingo (12,9 %).
        </p>
        <p className="text-[14px] leading-[22px] m-0 text-pretty">
          Copa, en quinta posición con <span className="font-mono text-[13px]">240</span> menciones
          (<b>9,9 %</b>), opera con un perfil más orgánico que paid: 78 % del contenido es no-pago,
          frente al 62 % de Avianca. Esto sugiere una oportunidad — y un costo — de igualar la
          cadencia paga del líder.
        </p>
      </div>

      {/* Figure */}
      <div className="border-t border-b border-n-200 py-[18px] my-2 mb-[22px]">
        <div className="flex justify-between items-baseline mb-1.5">
          <div className="t-mono text-[10px] uppercase tracking-[0.08em] text-n-500">FIG. 4.1</div>
          <div className="t-mono text-[10px] text-n-500">fuente · run #042 · 04/05/26</div>
        </div>
        <div className="text-[18px] font-medium mb-2 tracking-[-0.01em]">Volumen mensual por competidor (menciones)</div>
        <BBBarChart height={220} />
        <div className="flex gap-3.5 mt-2" style={{ fontFamily: "var(--font-sans)" }}>
          {LEGEND.map(([n, c]) => (
            <div key={n} className="flex items-center gap-1.5 text-[11px] text-n-700">
              <span className="size-2 rounded-[1px]" style={{ background: c }} />
              {n}
            </div>
          ))}
        </div>
      </div>

      {/* Pull quote */}
      <div className="border-l-[3px] border-sa-base pl-[18px] py-1 mb-[22px]">
        <div className="t-mono text-[10px] text-sa-base tracking-[0.1em] uppercase font-semibold">HALLAZGO · 4.1</div>
        <div className="text-[22px] leading-[30px] font-medium mt-1.5 tracking-[-0.015em] text-balance">
          El volumen de Avianca casi cuadruplica al de Copa, pero su <em>engagement</em> por pieza es
          sólo 1,8 × más alto.
        </div>
      </div>

      {/* Mini table */}
      <div className="grid grid-cols-3 border-t border-n-900" style={{ fontFamily: "var(--font-sans)" }}>
        {TABLE_ROWS.map(([name, vol, sov]) => {
          const isClient = name === "Copa Airlines";
          return (
            <div key={name} className="contents">
              <div className={`py-2.5 text-[13px] border-b border-n-200 ${isClient ? "text-sa-base font-semibold" : "text-n-900"}`}>{name}</div>
              <div className="py-2.5 text-[13px] font-mono border-b border-n-200 text-right">{vol}</div>
              <div className="py-2.5 text-[13px] font-mono border-b border-n-200 text-right">{sov}</div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="absolute bottom-9 left-[88px] right-[88px] flex justify-between t-mono text-[9px] text-n-400 uppercase tracking-[0.08em]">
        <span>preparado para Copa Airlines · uso interno</span>
        <span>generado con Benchmark Builder</span>
      </div>
    </article>
  );
}
