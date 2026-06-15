"use client";

import { useState } from "react";
import Link from "next/link";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn } from "@/components/ui/primitives";
import { MediaThumb, type ThumbKind } from "@/components/domain";
import { mockConsolidated } from "@/lib/media/fixtures";
import type { PlatformKey } from "@/lib/platforms";
import { AnalysisBlock } from "@/components/analysis-block";
import type { AnalysisVM } from "@/lib/view-models";

type Item = [ThumbKind, PlatformKey, string, string[], boolean?, string?, string?];
type Group = { name: string; count: number; items: Item[] };

// Free placeholder media (Lorem Picsum images + Google sample videos). Swap for
// the real scraped creatives once the media pipeline runs.
const img = (s: string) => `https://picsum.photos/seed/bb-${s}/600/750`;
const V = {
  blazes: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  joy: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  fun: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  bunny: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  escapes: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
};

const DEFAULT_AD_GROUPS: Group[] = [
  { name: "Avianca", count: 38, items: [["ad", "meta_ads", "creativo · 12d", ["USD 8–12k", "1,4M 👁"], true, img("av1")], ["ad", "meta_ads", "video · 14d", ["USD 12–18k", "1,8M 👁"], true, img("av2"), V.blazes], ["ad", "meta_ads", "carousel · 6d", ["USD 3–5k", "410k 👁"], true, img("av3")]] },
  { name: "LATAM", count: 24, items: [["ad", "meta_ads", "creativo · 4d", ["USD 4–6k", "620k 👁"], true, img("la1")], ["ad", "meta_ads", "video · 8d", ["USD 6–9k", "940k 👁"], true, img("la2"), V.joy], ["ad", "meta_ads", "static · 2d", ["USD 1–2k", "180k 👁"], true, img("la3")]] },
  { name: "Copa", count: 14, items: [["ad", "meta_ads", "static · 9d", ["USD 5–8k", "680k 👁"], true, img("co1")], ["ad", "meta_ads", "creativo · 3d", ["USD 2–4k", "280k 👁"], true, img("co2")], ["ad", "meta_ads", "video · 5d", ["USD 3–5k", "340k 👁"], true, img("co3"), V.fun]] },
];

const DEFAULT_ORG_GROUPS: Group[] = [
  { name: "Avianca · 84", count: 84, items: [["photo", "instagram", "sunset reel", ["12,4k ♡", "4 h"], false, img("ao1")], ["photo", "instagram", "crew", ["8,2k ♡", "12 h"], false, img("ao2")], ["video", "tiktok", "recorrido", ["480k ▷", "1 d"], false, img("ao3"), V.bunny]] },
  { name: "LATAM · 56", count: 56, items: [["video", "tiktok", "POV viaje", ["1,2M ▷", "9 h"], false, img("lo1"), V.escapes], ["photo", "instagram", "mapa", ["3,2k ♡", "2 d"], false, img("lo2")], ["photo", "facebook", "noticia", ["820 ↗", "3 d"], false, img("lo3")]] },
  { name: "Wingo · 42", count: 42, items: [["video", "youtube", "vlog 48h", ["42k ▷", "1 d"], false, img("wo1"), V.blazes], ["photo", "instagram", "tarifa", ["1,4k ♡", "2 d"], false, img("wo2")], ["video", "tiktok", "duet", ["98k ▷", "3 d"], false, img("wo3"), V.joy]] },
];

const SORTS = [
  { id: "engagement", label: "Engagement" },
  { id: "reciente", label: "Reciente" },
  { id: "plataforma", label: "Plataforma" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

// Parse a Spanish-formatted metric ("12,4k", "1,8M", "820") to a number.
function parseNum(s: string): number {
  const m = s.match(/([\d.,]+)\s*([kKmM])?/);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  const u = (m[2] || "").toLowerCase();
  return u === "m" ? n * 1e6 : u === "k" ? n * 1e3 : n;
}
// Engagement/views value of an item — the metric carrying ♡ ▷ ↗ 👁.
function engOf(it: Item): number {
  const m = it[3].find((x) => /[♡▷↗👁]/u.test(x));
  return m ? parseNum(m) : 0;
}
// Age in hours, lower = more recent. Organic carries "4 h"/"1 d" in its metrics;
// ads carry the age in the label ("creativo · 12d").
function ageHours(it: Item): number {
  const text = `${it[3].join(" ")} ${it[2]}`;
  const d = text.match(/(\d+)\s*d/);
  const h = text.match(/(\d+)\s*h/);
  if (d) return parseInt(d[1], 10) * 24;
  if (h) return parseInt(h[1], 10);
  return 1e6;
}
function sortItems(items: Item[], sort: SortId): Item[] {
  const arr = [...items];
  if (sort === "engagement") arr.sort((a, b) => engOf(b) - engOf(a));
  else if (sort === "reciente") arr.sort((a, b) => ageHours(a) - ageHours(b));
  else arr.sort((a, b) => a[1].localeCompare(b[1]));
  return arr;
}

function GalleryColumn({ kind, groups, total, spend }: { kind: "organic" | "ad"; groups: Group[]; total: number; spend?: string }) {
  const isAd = kind === "ad";
  const [sort, setSort] = useState<SortId>("engagement");
  return (
    <div style={{ background: isAd ? "var(--accent-soft)" : "var(--surface)", border: `1px solid ${isAd ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--r-md)", padding: 18, boxShadow: "var(--sh-1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, background: isAd ? "var(--ad)" : "var(--organic)", borderRadius: 2, flexShrink: 0 }} />
            <div className="t-h2" style={{ color: isAd ? "var(--accent)" : "var(--text)" }}>{isAd ? "Anuncios pagos · Meta Ad Library" : "Contenido orgánico"}</div>
          </div>
          <div className="t-small" style={{ color: isAd ? "var(--accent)" : "var(--text-muted)", marginTop: 4 }}>
            {isAd ? `${total} creativos activos · ${spend ?? "—"} spend estimado` : `${total} piezas en últimos 60 días`}
          </div>
        </div>
        <div role="tablist" aria-label="Ordenar" style={{ display: "flex", border: `1px solid ${isAd ? "var(--accent)" : "var(--border-strong)"}`, borderRadius: "var(--r-sm)", overflow: "hidden", background: "var(--surface)", flexShrink: 0 }}>
          {SORTS.map((so, i) => {
            const on = sort === so.id;
            return (
              <button
                key={so.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setSort(so.id)}
                style={{ padding: "4px 10px", fontSize: 11, fontFamily: "var(--font-mono)", cursor: "pointer", border: "none", borderLeft: i ? "1px solid var(--border)" : "none", background: on ? (isAd ? "var(--accent)" : "var(--n900)") : "var(--surface)", color: on ? "#fff" : "var(--text-muted)" }}
              >
                {so.label}
              </button>
            );
          })}
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.name} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: isAd ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: isAd ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }}>{g.count} piezas</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 8 }}>
            {sortItems(g.items, sort).map((it) => {
              const a = mockConsolidated({ url: it[5] ?? it[2], kind: it[0] === "video" ? "video" : "image" });
              return (
                <div key={`${it[1]}-${it[2]}-${it[5] ?? it[6] ?? ""}`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <MediaThumb kind={it[0]} platform={it[1]} label={it[2]} metrics={it[3]} isAd={it[4]} src={it[5]} video={it[6]} />
                  <div style={{ fontSize: 10, lineHeight: "13px", color: "var(--text-muted)" }}>
                    <div style={{ color: "var(--text)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>👁 {a.summary}</div>
                    {a.transcript && <div style={{ marginTop: 2, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>🗣 &ldquo;{a.transcript}&rdquo;</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Galeria({
  analysis,
  adGroups = DEFAULT_AD_GROUPS,
  organicGroups = DEFAULT_ORG_GROUPS,
  adTotal = 84,
  adSpend = "USD 18–28k",
  organicTotal = 218,
  breadcrumb,
  runMeta,
  caseSlug,
}: {
  analysis?: AnalysisVM | null;
  adGroups?: Group[];
  organicGroups?: Group[];
  adTotal?: number;
  adSpend?: string;
  organicTotal?: number;
  breadcrumb?: string[];
  runMeta?: string;
  caseSlug?: string;
}) {
  const [view, setView] = useState<"ambos" | "organico" | "pago">("ambos");
  return (
    <ScreenShell breadcrumb={breadcrumb ?? ["Proyectos", "Cartagena · Q2 2026", "Galería"]} runMeta={runMeta ?? `${organicTotal} piezas orgánicas · ${adTotal} anuncios pagos`} caseSlug={caseSlug}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-micro" style={{ color: "var(--accent)" }}>GALERÍA · ORGÁNICO VS PAGO</div>
          <div className="t-h1" style={{ marginTop: 6, color: "var(--text)" }}>Lo que la competencia muestra y lo que paga por mostrar</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn kind="ghost" size="sm" icon={<Ic.filter s={11} />} onClick={() => setView((v) => (v === "ambos" ? "organico" : v === "organico" ? "pago" : "ambos"))}>
            {view === "ambos" ? "Orgánico + pago" : view === "organico" ? "Sólo orgánico" : "Sólo pago"}
          </Btn>
          <Link href="/reporte"><Btn kind="secondary" size="sm" iconRight={<Ic.eye s={11} />}>Modo presentación</Btn></Link>
        </div>
      </div>
      {analysis && <div style={{ marginBottom: 16 }}><AnalysisBlock analysis={analysis} /></div>}
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: view === "ambos" ? "1fr 1fr" : "1fr", gap: 18 }}>
        {view !== "pago" && <GalleryColumn kind="organic" groups={organicGroups} total={organicTotal} />}
        {view !== "organico" && <GalleryColumn kind="ad" groups={adGroups} total={adTotal} spend={adSpend} />}
      </div>
    </ScreenShell>
  );
}
