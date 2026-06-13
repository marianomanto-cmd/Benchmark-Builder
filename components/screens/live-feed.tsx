"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { MentionCard, PlatformBadge } from "@/components/domain";
import { PLATFORMS, type PlatformKey } from "@/lib/platforms";
import type { MentionVM, AnalysisVM } from "@/lib/view-models";
import { AnalysisBlock } from "@/components/analysis-block";

const SENT_LABEL: Record<string, string> = { pos: "Positivo", neu: "Neutro", neg: "Negativo", mix: "Mixto" };

function uniq<T>(a: T[]): T[] {
  return Array.from(new Set(a));
}

// Parse a Spanish-formatted engagement value ("12,4k", "1,2M", "998") to a number.
function engOf(m: MentionVM): number {
  for (const pair of m.metrics ?? []) {
    const s = String(pair[1] ?? "");
    const match = s.match(/([\d.,]+)\s*([kKmM]?)/);
    if (!match) continue;
    const n = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
    if (Number.isNaN(n)) continue;
    const suf = match[2].toLowerCase();
    return suf === "k" ? n * 1e3 : suf === "m" ? n * 1e6 : n;
  }
  return 0;
}

function toCSV(rows: MentionVM[]): string {
  const head = ["plataforma", "autor", "handle", "marca", "sentimiento", "tipo", "fecha", "texto"];
  const esc = (s: unknown) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [
    head.join(","),
    ...rows.map((m) => [m.platform, m.author, m.handle, m.brand, m.sentiment, m.isAd ? "pago" : "orgánico", m.ts, m.body].map(esc).join(",")),
  ];
  return lines.join("\n");
}

function downloadCSV(rows: MentionVM[]) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "phema-live-feed.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function FilterGroup({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; label: string; count: number; checked: boolean; badge?: ReactNode; onToggle: () => void }[];
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="t-micro">{title}</div>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{rows.filter((r) => r.checked).length}/{rows.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={r.onToggle}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: "var(--r-sm)", background: r.checked ? "var(--surface-2)" : "transparent", cursor: "pointer", border: "none", textAlign: "left", width: "100%" }}
          >
            <span style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${r.checked ? "var(--accent)" : "var(--border-strong)"}`, background: r.checked ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              {r.checked && <Ic.check s={9} />}
            </span>
            {r.badge}
            <span style={{ fontSize: 12, color: "var(--text)", flex: 1 }}>{r.label}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{r.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LiveFeed({ mentions, analysis }: { mentions: MentionVM[]; analysis?: AnalysisVM | null }) {
  const brands = useMemo(() => uniq(mentions.map((m) => m.brand)).filter((b) => b && b !== "—"), [mentions]);
  const platforms = useMemo(() => uniq(mentions.map((m) => m.platform)), [mentions]);
  const sentiments = useMemo(() => uniq(mentions.map((m) => m.sentiment)), [mentions]);

  // We store DESELECTED keys, so the default is "everything on".
  const [offBrands, setOffBrands] = useState<Set<string>>(new Set());
  const [offPlat, setOffPlat] = useState<Set<string>>(new Set());
  const [offSent, setOffSent] = useState<Set<string>>(new Set());
  const [offType, setOffType] = useState<Set<string>>(new Set());
  const [sortEng, setSortEng] = useState(true);

  const mk = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (k: string) =>
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const toggleBrand = mk(setOffBrands);
  const togglePlat = mk(setOffPlat);
  const toggleSent = mk(setOffSent);
  const toggleType = mk(setOffType);

  const count = (pred: (m: MentionVM) => boolean) => mentions.filter(pred).length;

  const visible = useMemo(() => {
    const v = mentions.filter(
      (m) =>
        (m.brand === "—" || !offBrands.has(m.brand)) &&
        !offPlat.has(m.platform) &&
        !offSent.has(m.sentiment) &&
        !offType.has(m.isAd ? "paid" : "organic"),
    );
    return sortEng ? [...v].sort((a, b) => engOf(b) - engOf(a)) : v;
  }, [mentions, offBrands, offPlat, offSent, offType, sortEng]);

  const activeFilters = offBrands.size + offPlat.size + offSent.size + offType.size;
  const clearAll = () => { setOffBrands(new Set()); setOffPlat(new Set()); setOffSent(new Set()); setOffType(new Set()); };

  return (
    <ScreenShell breadcrumb={["Proyectos", "Cartagena · Q2 2026", "Live feed"]} badges={<BBBadge tone="success" size="sm">activo</BBBadge>} runMeta={`${visible.length} de ${mentions.length} menciones`}>
      {analysis && <div style={{ marginBottom: 16 }}><AnalysisBlock analysis={analysis} /></div>}
      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
        {/* Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FilterGroup
            title="Competidores"
            rows={brands.map((b) => ({ key: b, label: b, count: count((m) => m.brand === b), checked: !offBrands.has(b), onToggle: () => toggleBrand(b) }))}
          />
          <FilterGroup
            title="Plataformas"
            rows={platforms.map((p) => ({ key: p, label: PLATFORMS[p]?.name ?? p, count: count((m) => m.platform === p), checked: !offPlat.has(p), badge: <PlatformBadge platform={p as PlatformKey} size="sm" />, onToggle: () => togglePlat(p) }))}
          />
          <FilterGroup
            title="Sentimiento"
            rows={sentiments.map((sn) => ({ key: sn, label: SENT_LABEL[sn] ?? sn, count: count((m) => m.sentiment === sn), checked: !offSent.has(sn), onToggle: () => toggleSent(sn) }))}
          />
          <FilterGroup
            title="Tipo"
            rows={[
              { key: "organic", label: "Orgánico", count: count((m) => !m.isAd), checked: !offType.has("organic"), onToggle: () => toggleType("organic") },
              { key: "paid", label: "Pago · Ads", count: count((m) => m.isAd), checked: !offType.has("paid"), onToggle: () => toggleType("paid") },
            ]}
          />
          <div style={{ marginTop: "auto" }}>
            <Btn kind="ghost" size="sm" disabled={activeFilters === 0} onClick={clearAll}>Limpiar filtros{activeFilters ? ` (${activeFilters})` : ""}</Btn>
          </div>
        </div>

        {/* Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          <div className="bb-row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="t-h2" style={{ color: "var(--text)" }}>Live feed</div>
            <BBBadge tone="success" size="sm" dot="var(--success)">en vivo</BBBadge>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => setSortEng((s) => !s)} style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "5px 10px", background: "var(--surface)", gap: 6, fontWeight: 500, color: "var(--text)", fontSize: 12, cursor: "pointer" }}>
              <Ic.sort s={11} /> {sortEng ? "Engagement" : "Reciente"} <Ic.arrowDown s={9} />
            </button>
            <Btn kind="secondary" size="sm" icon={<Ic.download s={11} />} onClick={() => downloadCSV(visible)}>CSV</Btn>
          </div>

          {activeFilters > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[...offBrands].map((b) => <Chip key={`b${b}`} label={b} onClear={() => toggleBrand(b)} />)}
              {[...offPlat].map((p) => <Chip key={`p${p}`} label={`sin ${PLATFORMS[p as PlatformKey]?.name ?? p}`} onClear={() => togglePlat(p)} />)}
              {[...offSent].map((sn) => <Chip key={`s${sn}`} label={`sin ${SENT_LABEL[sn] ?? sn}`} onClear={() => toggleSent(sn)} />)}
              {[...offType].map((t) => <Chip key={`t${t}`} label={t === "paid" ? "sin pago" : "sin orgánico"} onClear={() => toggleType(t)} />)}
            </div>
          )}

          {visible.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border-strong)", borderRadius: "var(--r-md)" }}>
              Ninguna mención coincide con los filtros. <button type="button" onClick={clearAll} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Limpiar</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, overflow: "auto", paddingBottom: 14 }}>
              {visible.map((m, i) => (
                <MentionCard key={i} platform={m.platform} author={m.author} handle={m.handle} ts={m.ts} brand={m.brand} body={m.body} thumbType={m.thumbType} sentiment={m.sentiment} isAd={m.isAd} metrics={m.metrics} media={m.media} video={m.video} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span style={{ fontSize: 11, padding: "3px 6px 3px 9px", borderRadius: 99, background: "var(--surface-2)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
      {label}
      <button type="button" onClick={onClear} aria-label={`Quitar ${label}`} style={{ border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "inline-flex", padding: 0 }}><Ic.close s={8} /></button>
    </span>
  );
}
