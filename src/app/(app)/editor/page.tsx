/**
 * Editor de reporte (06) — handoff §4.6.
 * 3 columnas: outline (índice) · canvas (hoja) · properties.
 * Click en bloque → dashed border sangría + label flotante + toolbar; panel
 * derecho refleja el bloque seleccionado. Click fuera deselecciona.
 * Edición rica (TipTap), drag-reorder e insert real quedan para Fase 2.
 */

"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Btn } from "@/components/ui";
import { BBBarChart } from "@/components/charts/bb-bar-chart";
import { RankingBlock } from "@/components/domain";
import { TOP_ADS } from "@/lib/fixtures/rankings";
import { cn } from "@/lib/cn";

const IcPlus = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);
const IcEye = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IcDownload = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" /></svg>
);
const IcCopy = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
);

const PAGES: [string, number, boolean][] = [
  ["Portada", 1, false], ["Resumen ejecutivo", 2, false], ["Metodología", 3, false],
  ["Volumen y SOV", 4, true], ["Avianca", 5, false], ["LATAM", 6, false],
  ["Wingo", 7, false], ["Arajet", 8, false], ["Copa", 9, false],
  ["Galería · orgánico", 10, false], ["Galería · ads", 11, false], ["Insights", 12, false],
  ["Recomendaciones", 13, false], ["Anexo", 14, false],
];

type BlockType = "h1" | "text" | "chart" | "quote" | "ranking";

interface BlockMeta {
  id: string;
  type: BlockType;
  label: string;
}

const BLOCK_TYPE_LABEL: Record<BlockType, string> = {
  h1: "Encabezado · H1",
  text: "Texto · párrafo",
  chart: "Gráfico · barras apiladas",
  quote: "Cita / Hallazgo",
  ranking: "Ranking · list",
};

function blockProps(type: BlockType): [string, string][] {
  switch (type) {
    case "chart":
      return [["Tipo", "Stacked bars"], ["Período", "60 días"], ["Highlight", "Copa · sangría"], ["Mostrar leyenda", "sí"], ["Mostrar ejes", "sí"]];
    case "h1":
      return [["Fuente", "Newsreader"], ["Tamaño", "42 px"], ["Balance", "sí"]];
    case "quote":
      return [["Estilo", "Border sangría"], ["Eyebrow", "HALLAZGO · 4.1"], ["Énfasis", "italic"]];
    case "ranking":
      return [["Layout", "list"], ["Métrica", "reach"], ["Top N", "5"], ["Origen", "ads"]];
    default:
      return [["Fuente", "Newsreader"], ["Tamaño", "16 px"], ["Columnas", "1"]];
  }
}

const PALETTE = ["Texto", "H2", "Cita", "Gráfico", "Tabla", "KPI", "Galería", "Ranking"];

export default function EditorPage() {
  const [activePage, setActivePage] = useState(4);
  const [selected, setSelected] = useState<string | null>("b3");

  const blocks: BlockMeta[] = [
    { id: "b1", type: "h1", label: "TÍTULO" },
    { id: "b2", type: "text", label: "TEXTO" },
    { id: "b3", type: "chart", label: "GRÁFICO" },
    { id: "b4", type: "text", label: "TEXTO" },
    { id: "b5", type: "quote", label: "CITA" },
    { id: "b6", type: "ranking", label: "RANKING" },
  ];
  const selectedBlock = blocks.find((b) => b.id === selected) ?? null;

  return (
    <div className="p-4 lg:h-[calc(100vh-3.5rem)]">
      {/* Mobile: viewer (editor full sólo en desktop) */}
      <EditorMobile activePage={activePage} onPage={setActivePage} />

      {/* Desktop: 3 columnas */}
      <div className="hidden lg:grid grid-cols-[220px_1fr_280px] gap-3.5 h-full">
        {/* Outline */}
        <div className="bg-white border border-n-200 rounded-md p-3.5 overflow-auto">
          <div className="t-micro">ÍNDICE · 14 PÁGINAS</div>
          <div className="mt-3 flex flex-col">
            {PAGES.map(([name, p]) => {
              const active = p === activePage;
              return (
                <button
                  key={name}
                  onClick={() => setActivePage(p)}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-left text-[12px] border-l-2 transition-colors",
                    active ? "bg-n-50 border-sa-base text-n-900 font-medium" : "border-transparent text-n-600 hover:bg-n-50",
                  )}
                >
                  <span className="t-mono text-[10px] text-n-400 w-[18px]">{String(p).padStart(2, "0")}</span>
                  <span className="flex-1">{name}</span>
                </button>
              );
            })}
            <div className="border-t border-n-100 mt-2 pt-2">
              <Btn kind="ghost" size="sm" icon={IcPlus}>
                Agregar sección
              </Btn>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-n-100 rounded-md p-6 overflow-auto" onClick={() => setSelected(null)}>
          <div className="w-[680px] max-w-full mx-auto bg-white shadow-3 min-h-full px-16 py-14 relative">
            <div className="absolute top-6 left-6 right-6 flex justify-between t-mono text-[10px] text-n-400">
              <span>BENCHMARK BUILDER · CARTAGENA Q2 2026</span>
              <span>{String(activePage).padStart(2, "0")} / 14</span>
            </div>
            <div className="t-mono text-[10px] text-sa-base tracking-[0.1em] uppercase font-semibold">SECCIÓN 04</div>

            <Block id="b1" label="TÍTULO" selected={selected === "b1"} onSelect={setSelected}>
              <h1 className="t-serif text-[42px] leading-[46px] font-medium tracking-[-0.025em] my-2.5 text-n-900 text-balance">
                Volumen y share of voice
              </h1>
            </Block>

            <Block id="b2" label="TEXTO" selected={selected === "b2"} onSelect={setSelected}>
              <p className="t-serif text-[16px] leading-[26px] text-n-800 text-pretty mb-4">
                Entre el 1 de marzo y el 30 de abril, las cinco aerolíneas analizadas produjeron{" "}
                <span className="font-mono text-[14px]">2.418</span> piezas relacionadas a Cartagena.{" "}
                <em>Avianca</em> concentra el{" "}
                <span className="bg-sa-soft px-1.5 py-px rounded-[3px] font-mono text-[14px] text-sa-strong">41,3 %</span>{" "}
                del volumen total, seguida por LATAM (24 %) y Wingo (12,9 %).
              </p>
            </Block>

            <Block id="b3" label="GRÁFICO" selected={selected === "b3"} onSelect={setSelected} toolbar>
              <div className="t-serif text-[11px] text-n-500 uppercase tracking-[0.08em]">FIG. 4.1</div>
              <div className="t-serif text-[18px] font-medium text-n-900 mt-1 mb-2">Volumen mensual por competidor</div>
              <BBBarChart height={220} />
            </Block>

            <Block id="b4" label="TEXTO" selected={selected === "b4"} onSelect={setSelected}>
              <p className="t-serif text-[16px] leading-[26px] text-n-800 text-pretty mb-3.5">
                Copa, en quinta posición con <span className="font-mono text-[14px]">240</span> menciones (9,9 %),
                opera con un perfil más orgánico que paid: <span className="font-mono text-[14px]">78 %</span> del
                contenido es no-pago, frente al <span className="font-mono text-[14px]">62 %</span> de Avianca.
              </p>
            </Block>

            <Block id="b5" label="CITA" selected={selected === "b5"} onSelect={setSelected}>
              <div className="bg-n-50 border-l-[3px] border-sa-base px-[18px] py-3.5">
                <div className="t-micro text-sa-base">HALLAZGO · 4.1</div>
                <div className="t-serif text-[18px] leading-[26px] text-n-900 mt-1.5 text-balance">
                  &ldquo;El volumen de Avianca casi cuadruplica al de Copa, pero su engagement promedio por pieza es
                  sólo 1,8× más alto.&rdquo;
                </div>
              </div>
            </Block>

            <Block id="b6" label="RANKING" selected={selected === "b6"} onSelect={setSelected}>
              <RankingBlock layout="list" eyebrow="RANKING · LIST" title="Top 5 anuncios pagos · reach" items={TOP_ADS} />
            </Block>
          </div>
        </div>

        {/* Properties */}
        <div className="bg-white border border-n-200 rounded-md p-3.5 flex flex-col gap-3.5 overflow-auto">
          <div>
            <div className="t-micro">BLOQUE SELECCIONADO</div>
            {selectedBlock ? (
              <div className="mt-2 px-3 py-2.5 border border-sa-base rounded-sm bg-sa-soft">
                <div className="text-[13px] font-semibold text-sa-strong">{BLOCK_TYPE_LABEL[selectedBlock.type]}</div>
                <div className="t-mono text-[11px] text-sa-strong mt-0.5">
                  {selectedBlock.type === "chart" ? "fig. 4.1 · 5 series · 12 meses" : `bloque ${selectedBlock.id}`}
                </div>
              </div>
            ) : (
              <div className="mt-2 px-3 py-2.5 border border-dashed border-n-300 rounded-sm text-[12px] text-n-500">
                Ningún bloque seleccionado. Hacé click en un bloque del canvas.
              </div>
            )}
          </div>

          {selectedBlock && (
            <>
              <div>
                <div className="t-micro">FUENTE DE DATOS</div>
                <div className="mt-2 px-3 py-2 border border-n-200 rounded-sm flex justify-between">
                  <span className="text-[12px]">run #042</span>
                  <span className="t-mono text-[11px] text-n-500">vigente · 12 min</span>
                </div>
              </div>
              <div>
                <div className="t-micro">PROPIEDADES</div>
                <div className="mt-2 flex flex-col gap-2">
                  {blockProps(selectedBlock.type).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center px-2.5 py-1.5 bg-n-50 rounded-sm">
                      <span className="text-[11px] text-n-500">{k}</span>
                      <span className="text-[12px] font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <div className="t-micro">INSERTAR BLOQUE</div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {PALETTE.map((b) => (
                <button
                  key={b}
                  className="px-1.5 py-2 border border-n-200 bg-white rounded-sm text-[11px] text-n-700 hover:border-sa-base hover:text-sa-strong transition-colors"
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Btn kind="secondary" size="md" icon={IcEye}>
              Vista previa
            </Btn>
            <Btn kind="accent" size="md" icon={IcDownload}>
              Exportar PDF
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({
  id,
  label,
  selected,
  onSelect,
  toolbar,
  children,
}: {
  id: string;
  label: string;
  selected: boolean;
  onSelect: (id: string) => void;
  toolbar?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      className={cn(
        "relative my-3 rounded-sm cursor-pointer transition-colors",
        selected ? "p-[18px] -mx-[18px]" : "hover:bg-n-50/60",
      )}
    >
      {selected && (
        <motion.div
          className="absolute inset-0 rounded-sm border-2 border-dashed border-sa-base pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          style={{ background: "#fffdfa" }}
        />
      )}
      {selected && (
        <span className="absolute -top-[9px] left-3.5 bg-sa-base text-white t-mono text-[9px] px-1.5 py-0.5 tracking-[0.08em] rounded-[2px] uppercase z-10">
          BLOQUE · {label} · seleccionado
        </span>
      )}
      {selected && toolbar && (
        <span className="absolute -top-[34px] right-0 flex gap-1 z-10">
          <Btn kind="secondary" size="sm">Reemplazar fuente</Btn>
          <Btn kind="ghost" size="sm" icon={IcCopy}>Duplicar</Btn>
          <Btn kind="ghost" size="sm">Eliminar</Btn>
        </span>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

function EditorMobile({ activePage, onPage }: { activePage: number; onPage: (p: number) => void }) {
  return (
    <div className="lg:hidden flex flex-col gap-3">
      {/* Desktop notice */}
      <div className="bg-sa-soft border border-sa-base rounded-md p-3 flex gap-2.5">
        <span className="size-6 rounded-full bg-sa-base text-white grid place-items-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 9v4m0 4h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /></svg>
        </span>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-sa-strong">Editor disponible en desktop</div>
          <div className="text-[12px] text-sa-strong/90 mt-0.5 leading-[17px]">
            Acá podés previsualizar páginas y exportar. Para editar bloques abrí el proyecto en escritorio.
          </div>
        </div>
      </div>

      {/* Page index */}
      <div className="t-micro">ÍNDICE · 14 PÁGINAS</div>
      <div className="bg-white border border-n-200 rounded-md overflow-hidden">
        {PAGES.slice(0, 9).map(([name, p], i) => {
          const active = p === activePage;
          return (
            <button
              key={name}
              onClick={() => onPage(p)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3.5 py-3 text-left transition-colors",
                i > 0 && "border-t border-n-100",
                active ? "bg-n-50 border-l-[3px] border-l-sa-base pl-[11px]" : "border-l-[3px] border-l-transparent",
              )}
            >
              <span className="font-mono text-[11px] text-n-400 w-6">{String(p).padStart(2, "0")}</span>
              <span className={cn("text-[13px] flex-1", active && "font-semibold")}>{name}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-n-400"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div>
        <div className="t-micro mb-2">PREVIEW · PÁGINA {String(activePage).padStart(2, "0")}</div>
        <div className="bg-white border border-n-200 rounded-sm shadow-2 px-5 py-4">
          <div className="t-mono text-[9px] text-sa-base tracking-[0.12em] uppercase font-semibold">SECCIÓN 04</div>
          <div className="t-serif text-[24px] leading-[28px] font-medium tracking-[-0.02em] my-2 text-n-900 text-balance">
            Volumen y share of voice
          </div>
          <p className="t-serif text-[13px] leading-[19px] text-n-800 mb-2.5 text-pretty">
            Entre el 1 de marzo y el 30 de abril, las cinco aerolíneas produjeron{" "}
            <span className="font-mono text-[12px]">2.418</span> piezas. <em>Avianca</em> concentra el{" "}
            <span className="bg-sa-soft px-1 font-mono text-[12px] text-sa-strong">41,3 %</span>…
          </p>
          <BBBarChart height={150} />
        </div>
      </div>

      <div className="flex gap-2">
        <Btn kind="secondary" size="md" icon={IcEye} className="flex-1">
          Vista previa
        </Btn>
        <Btn kind="accent" size="md" icon={IcDownload} className="flex-1">
          PDF
        </Btn>
      </div>
    </div>
  );
}
