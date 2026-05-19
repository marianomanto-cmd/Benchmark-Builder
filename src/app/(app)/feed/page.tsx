/**
 * Live feed (02) — handoff §4.2.
 * Sidebar de filtros (240) + feed: header con badge "vivo" + sort + CSV,
 * chips activos removibles, grid 3-col de MentionCards con FLIP.
 * Filtros y sort 100% funcionales sobre las fixtures.
 */

"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Btn } from "@/components/ui";
import { MentionCard, PlatformBadge, PLATFORM_NAMES, type PlatformKey } from "@/components/domain";
import { MENTIONS } from "@/lib/fixtures/mentions";
import { cn } from "@/lib/cn";

type DimKey = "competitor" | "platform" | "sentiment" | "type";

const COMPETITOR_LABELS: Record<string, string> = {
  avianca: "Avianca",
  latam: "LATAM",
  wingo: "Wingo",
  arajet: "Arajet",
  copa: "Copa",
};
const SENTIMENT_LABELS: Record<string, string> = {
  pos: "Positivo",
  neu: "Neutro",
  neg: "Negativo",
  mix: "Mixto",
};
const TYPE_LABELS: Record<string, string> = {
  organic: "Orgánico",
  ad: "Pago · Meta Ads",
};

const ORDER: Record<DimKey, string[]> = {
  competitor: ["avianca", "latam", "wingo", "arajet", "copa"],
  platform: ["instagram", "tiktok", "youtube", "x", "web", "meta_ads"],
  sentiment: ["pos", "neu", "neg", "mix"],
  type: ["organic", "ad"],
};

function labelFor(dim: DimKey, value: string): string {
  if (dim === "competitor") return COMPETITOR_LABELS[value] ?? value;
  if (dim === "platform") return PLATFORM_NAMES[value as PlatformKey] ?? value;
  if (dim === "sentiment") return SENTIMENT_LABELS[value] ?? value;
  return TYPE_LABELS[value] ?? value;
}

function countFor(dim: DimKey, value: string): number {
  return MENTIONS.filter((m) => m[dim] === value).length;
}

const ALL_ENABLED: Record<DimKey, Set<string>> = {
  competitor: new Set(ORDER.competitor),
  platform: new Set(ORDER.platform),
  sentiment: new Set(ORDER.sentiment),
  type: new Set(ORDER.type),
};

const Ic = {
  sort: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" />
    </svg>
  ),
  download: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  ),
  close: (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  ),
  check: (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5L19 6" />
    </svg>
  ),
};

export default function FeedPage() {
  const [enabled, setEnabled] = useState(() => ({
    competitor: new Set(ALL_ENABLED.competitor),
    platform: new Set(ALL_ENABLED.platform),
    sentiment: new Set(ALL_ENABLED.sentiment),
    type: new Set(ALL_ENABLED.type),
  }));
  const [sort, setSort] = useState<"engagement" | "recent">("engagement");

  const toggle = (dim: DimKey, value: string) =>
    setEnabled((prev) => {
      const next = { ...prev, [dim]: new Set(prev[dim]) };
      if (next[dim].has(value)) next[dim].delete(value);
      else next[dim].add(value);
      return next;
    });

  const clear = () =>
    setEnabled({
      competitor: new Set(ALL_ENABLED.competitor),
      platform: new Set(ALL_ENABLED.platform),
      sentiment: new Set(ALL_ENABLED.sentiment),
      type: new Set(ALL_ENABLED.type),
    });

  const visible = useMemo(() => {
    const list = MENTIONS.filter(
      (m) =>
        enabled.competitor.has(m.competitor) &&
        enabled.platform.has(m.platform) &&
        enabled.sentiment.has(m.sentiment) &&
        enabled.type.has(m.type),
    );
    const key = sort === "engagement" ? "engagement" : "recency";
    return [...list].sort((a, b) => b[key] - a[key]);
  }, [enabled, sort]);

  const chips = useMemo(() => {
    const out: { dim: DimKey; value: string; label: string }[] = [];
    (Object.keys(ORDER) as DimKey[]).forEach((dim) => {
      if (enabled[dim].size < ORDER[dim].length) {
        ORDER[dim]
          .filter((v) => enabled[dim].has(v))
          .forEach((v) => out.push({ dim, value: v, label: labelFor(dim, v) }));
      }
    });
    return out;
  }, [enabled]);

  const isFiltered = chips.length > 0;
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Filters — colapsable en mobile, fijo en desktop */}
        <aside className={cn("flex-col gap-3.5", showFilters ? "flex" : "hidden", "lg:flex")}>
          <FilterGroup dim="competitor" enabled={enabled.competitor} onToggle={toggle} />
          <FilterGroup dim="platform" enabled={enabled.platform} onToggle={toggle} platforms />
          <FilterGroup dim="sentiment" enabled={enabled.sentiment} onToggle={toggle} />
          <FilterGroup dim="type" enabled={enabled.type} onToggle={toggle} />
          {isFiltered && (
            <div className="pt-1">
              <Btn kind="ghost" size="sm" onClick={clear}>
                Limpiar filtros
              </Btn>
            </div>
          )}
        </aside>

        {/* Feed */}
        <section className="flex flex-col gap-3.5 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="t-h2">Live feed</h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success bg-success-soft px-2 py-0.5 rounded-full">
              <motion.span
                className="size-1.5 rounded-full bg-success"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
              en vivo
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className={cn(
                "lg:hidden inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm border text-[12px] font-medium transition-colors",
                isFiltered ? "border-sa-base text-sa-strong bg-sa-soft" : "border-n-300 text-n-700 bg-white",
              )}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h18M6 12h12M10 19h4" /></svg>
              Filtros{chips.length ? ` · ${chips.length}` : ""}
            </button>
            <label className="flex items-center gap-2 text-[12px] text-n-600">
              <span className="text-n-500">{Ic.sort}</span>
              Ordenar
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "engagement" | "recent")}
                className="h-8 pl-2 pr-7 rounded-sm border border-n-300 bg-white text-[12px] font-medium text-n-900 cursor-pointer focus:border-n-900 outline-none appearance-none bg-[length:14px] bg-[right_0.4rem_center] bg-no-repeat"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23857a68' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                }}
              >
                <option value="engagement">Engagement</option>
                <option value="recent">Recientes</option>
              </select>
            </label>
            <Btn kind="secondary" size="sm" icon={Ic.download} onClick={() => exportCsv(visible)}>
              CSV
            </Btn>
          </div>

          {/* Active filter chips */}
          <AnimatePresence initial={false}>
            {isFiltered && (
              <motion.div
                className="flex gap-1.5 flex-wrap"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatePresence initial={false}>
                  {chips.map((c) => (
                    <motion.button
                      key={`${c.dim}:${c.value}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => toggle(c.dim, c.value)}
                      className="text-[11px] pl-2.5 pr-2 py-1 rounded-full bg-n-100 text-n-700 inline-flex items-center gap-1.5 hover:bg-n-200 transition-colors"
                    >
                      {c.label}
                      <span className="text-n-500">{Ic.close}</span>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cards */}
          {visible.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((m) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
                  >
                    <MentionCard
                      platform={m.platform}
                      author={m.author}
                      handle={m.handle}
                      ts={m.ts}
                      brand={m.brand}
                      body={m.body}
                      metrics={m.metrics}
                      sentiment={m.sentiment}
                      thumbType={m.thumbType}
                      isAd={m.isAd}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <EmptyFeed onClear={clear} />
          )}
        </section>
      </div>
    </div>
  );
}

function FilterGroup({
  dim,
  enabled,
  onToggle,
  platforms,
}: {
  dim: DimKey;
  enabled: Set<string>;
  onToggle: (dim: DimKey, value: string) => void;
  platforms?: boolean;
}) {
  const titles: Record<DimKey, string> = {
    competitor: "Competidores",
    platform: "Plataformas",
    sentiment: "Sentimiento",
    type: "Tipo",
  };
  const allOn = enabled.size === ORDER[dim].length;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <div className="t-micro">{titles[dim]}</div>
        <span className="t-mono text-[10px] text-n-500">{allOn ? "todos" : `${enabled.size}/${ORDER[dim].length}`}</span>
      </div>
      <div className="flex flex-col gap-1">
        {ORDER[dim].map((value) => {
          const checked = enabled.has(value);
          return (
            <label
              key={value}
              className={cn(
                "flex items-center gap-2 px-1.5 py-1.5 rounded-sm cursor-pointer transition-colors",
                checked ? "bg-n-50" : "hover:bg-n-50",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(dim, value)}
                className="sr-only"
              />
              <span
                className={cn(
                  "size-3.5 rounded-[3px] border grid place-items-center text-white shrink-0",
                  checked ? "bg-sa-base border-sa-base" : "bg-white border-n-300",
                )}
              >
                {checked && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.12 }}>
                    {Ic.check}
                  </motion.span>
                )}
              </span>
              {platforms && <PlatformBadge platform={value as PlatformKey} size="sm" />}
              <span className="text-[12px] text-n-800 flex-1 truncate">{labelFor(dim, value)}</span>
              <span className="t-mono text-[11px] text-n-500">{countFor(dim, value)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function EmptyFeed({ onClear }: { onClear: () => void }) {
  return (
    <div className="border border-dashed border-n-300 rounded-md py-16 px-6 flex flex-col items-center text-center gap-3">
      <div className="size-10 rounded-full border border-dashed border-n-400 grid place-items-center text-n-400">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>
      <div className="t-h3">Ninguna mención coincide con tus filtros</div>
      <p className="t-body text-n-600 max-w-sm">
        Ajustá o limpiá los filtros para ver más resultados del run actual.
      </p>
      <Btn kind="secondary" size="sm" onClick={onClear}>
        Limpiar filtros
      </Btn>
    </div>
  );
}

function exportCsv(rows: typeof MENTIONS) {
  const header = ["plataforma", "marca", "autor", "handle", "fecha", "sentimiento", "tipo", "engagement", "texto"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((m) =>
    [m.platform, m.brand, m.author, m.handle, m.ts, m.sentiment, m.type, String(m.engagement), m.body]
      .map(escape)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "live-feed.csv";
  a.click();
  URL.revokeObjectURL(url);
}
