"use client";

import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { MentionCard, PlatformBadge } from "@/components/domain";
import type { PlatformKey } from "@/lib/platforms";
import type { MentionVM } from "@/lib/view-models";

function FilterGroup({ title, items, platforms }: { title: string; items: (string | number | boolean | PlatformKey)[][]; platforms?: boolean }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="t-micro">{title}</div>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>todos</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((it, i) => {
          const name = it[0] as string;
          const second = (platforms ? it[1] : null) as PlatformKey | null;
          const third = (platforms ? it[2] : it[1]) as string | number;
          const checked = (platforms ? it[3] : it[2]) as boolean;
          return (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: "var(--r-sm)", background: checked ? "var(--surface-2)" : "transparent", cursor: "pointer" }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${checked ? "var(--accent)" : "var(--border-strong)"}`, background: checked ? "var(--accent)" : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                {checked && <Ic.check s={9} />}
              </span>
              {platforms && second && <PlatformBadge platform={second} size="sm" />}
              <span style={{ fontSize: 12, color: "var(--text)", flex: 1 }}>{name}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{third}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function LiveFeed({ mentions }: { mentions: MentionVM[] }) {
  return (
    <ScreenShell breadcrumb={["Proyectos", "Cartagena · Q2 2026", "Live feed"]} badges={<BBBadge tone="success" size="sm">activo</BBBadge>} runMeta="2.418 menciones · 60 días">
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, height: "100%" }}>
        {/* Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FilterGroup title="Competidores" items={[["Avianca", 998, true], ["LATAM", 581, true], ["Wingo", 312, true], ["Arajet", 287, false], ["Copa", 240, true]]} />
          <FilterGroup title="Plataformas" platforms items={[["Instagram", "instagram", 842, true], ["TikTok", "tiktok", 412, true], ["YouTube", "youtube", 182, true], ["X / Grok", "x", 281, false], ["Reddit", "reddit", 98, false], ["Web", "web", 208, true], ["Meta Ads", "meta_ads", 395, true]]} />
          <FilterGroup title="Sentimiento" items={[["Positivo", 1402, true], ["Neutro", 682, true], ["Negativo", 218, false], ["Mixto", 116, false]]} />
          <FilterGroup title="Tipo" items={[["Orgánico", 2023, true], ["Pago · Meta Ads", 395, true]]} />
          <div style={{ marginTop: "auto" }}>
            <Btn kind="ghost" size="sm">Limpiar filtros</Btn>
          </div>
        </div>

        {/* Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="t-h2" style={{ color: "var(--text)" }}>Live feed</div>
            <BBBadge tone="success" size="sm" dot="var(--success)">en vivo</BBBadge>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>Ordenar:
              <span style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "4px 10px", background: "var(--surface)", gap: 6, fontWeight: 500, color: "var(--text)" }}>
                <Ic.sort s={11} /> Engagement <Ic.arrowDown s={9} />
              </span>
            </div>
            <Btn kind="secondary" size="sm" icon={<Ic.download s={11} />}>CSV</Btn>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["60 días", "Avianca", "LATAM", "Wingo", "Copa", "IG", "TT", "YT", "Web", "Meta Ads", "Pos+Neu", "Orgánico+Pago"].map((c, i) => (
              <span key={i} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, background: "var(--surface-2)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                {c}<Ic.close s={8} />
              </span>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, overflow: "auto", paddingBottom: 14 }}>
            {mentions.map((m, i) => (
              <MentionCard key={i} platform={m.platform} author={m.author} handle={m.handle} ts={m.ts} brand={m.brand} body={m.body} thumbType={m.thumbType} sentiment={m.sentiment} isAd={m.isAd} metrics={m.metrics} />
            ))}
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
