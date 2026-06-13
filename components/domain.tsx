"use client";

import type { ReactNode } from "react";
import { Ic, PlatformGlyph } from "@/components/ui/icons";
import { Btn, BBBadge, SentimentChip } from "@/components/ui/primitives";
import { Sparkline } from "@/components/ui/charts";
import { PLATFORMS, type PlatformKey, type SentimentKind } from "@/lib/platforms";

// ============================================================
// PlatformBadge — HANDOFF §3.2
// ============================================================
export function PlatformBadge({ platform, size = "md", label }: { platform: PlatformKey; size?: "sm" | "md" | "lg"; label?: boolean }) {
  const p = PLATFORMS[platform] ?? PLATFORMS.web;
  const glyph = PlatformGlyph[platform] ?? PlatformGlyph.web;
  const sz = { sm: 14, md: 18, lg: 24 }[size];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: sz, height: sz, borderRadius: "var(--r-xs)", background: p.color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {glyph(Math.round(sz * 0.65))}
      </span>
      {label && <span style={{ fontSize: 12, color: "var(--n700)" }}>{p.name}</span>}
    </span>
  );
}

// ============================================================
// ThumbPlaceholder — replaced by <Image> in production (HANDOFF §9)
// ============================================================
export type ThumbKind = "photo" | "video" | "article" | "ad";

export function ThumbPlaceholder({ kind, label }: { kind: ThumbKind; label?: string }) {
  const grad: Record<ThumbKind, string> = {
    photo: "linear-gradient(135deg, #d9c9b8, #a89e8b)",
    video: "linear-gradient(135deg, #2a241c, #635a4b)",
    article: "linear-gradient(135deg, #f4f1eb, #ddd6c7)",
    ad: "linear-gradient(135deg, #6b1a36, #8a2a5f)",
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: grad[kind], display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,.08) 14px 15px)" }} />
      {kind === "video" && (
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.85)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--n900)", zIndex: 1 }}>
          <Ic.play s={14} />
        </span>
      )}
      <span style={{ position: "absolute", bottom: 8, left: 10, fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".08em", color: kind === "video" || kind === "ad" ? "rgba(255,255,255,.8)" : "var(--n600)" }}>
        {label || kind}
      </span>
    </div>
  );
}

// ============================================================
// MentionCard
// ============================================================
export function MentionCard({
  platform,
  author,
  handle,
  ts,
  body,
  metrics,
  sentiment,
  isAd,
  thumbType,
  brand,
}: {
  platform: PlatformKey;
  author: string;
  handle: string;
  ts: string;
  body: string;
  metrics: [string, string][];
  sentiment: SentimentKind;
  isAd?: boolean;
  thumbType?: ThumbKind;
  brand: string;
}) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative", boxShadow: "var(--sh-1)" }}>
      {isAd && (
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2, padding: "2px 7px", background: "var(--sa-base)", color: "#fff", borderRadius: 2, fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
          <Ic.bolt s={9} /> AD
        </div>
      )}
      <div style={{ padding: "12px 14px 10px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
        <PlatformBadge platform={platform} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{author}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>@{handle} · {ts}</div>
        </div>
        <BBBadge tone="neutral" size="sm">{brand}</BBBadge>
      </div>
      {thumbType && (
        <div style={{ height: 140, background: "var(--surface-2)", position: "relative", overflow: "hidden" }}>
          <ThumbPlaceholder kind={thumbType} />
        </div>
      )}
      <div style={{ padding: "10px 14px", flex: 1 }}>
        <div style={{ fontSize: 13, lineHeight: "19px", color: "var(--text)", textWrap: "pretty", display: "-webkit-box", WebkitLineClamp: thumbType ? 2 : 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {body}
        </div>
      </div>
      <div style={{ padding: "8px 14px 12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
        {metrics.map((m, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "var(--text-faint)" }}>{m[0]}</span>
            <span style={{ color: "var(--text)" }}>{m[1]}</span>
          </span>
        ))}
        <div style={{ flex: 1 }} />
        <SentimentChip kind={sentiment} />
      </div>
    </div>
  );
}

// ============================================================
// CompetitorCard + Stat
// ============================================================
function Stat({ label, value, raw }: { label: string; value: ReactNode; raw?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: ".08em", color: "var(--n500)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>{label}</div>
      <div style={{ fontSize: raw ? 12 : 15, fontFamily: raw ? "inherit" : "var(--font-mono)", fontWeight: 500, color: "var(--text)", marginTop: 3 }}>{value}</div>
    </div>
  );
}

export function CompetitorCard({
  name,
  handle,
  brand,
  platforms,
  mentions,
  sov,
  sent,
  sparkData,
  accent,
}: {
  name: string;
  handle: string;
  brand: string;
  platforms: PlatformKey[];
  mentions: string;
  sov: string;
  sent: SentimentKind;
  sparkData: number[];
  accent?: string;
}) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", background: accent || "var(--n200)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 13, fontFamily: "var(--font-sans)" }}>{brand}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, color: "var(--n500)", fontFamily: "var(--font-mono)" }}>@{handle}</div>
        </div>
        <Ic.more />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {platforms.map((p) => (
          <PlatformBadge key={p} platform={p} size="sm" />
        ))}
      </div>
      <div style={{ height: 36, position: "relative" }}>
        <Sparkline data={sparkData} accent={accent} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, paddingTop: 10, borderTop: "1px solid var(--n100)" }}>
        <Stat label="menciones" value={mentions} />
        <Stat label="SOV" value={`${sov} %`} />
        <Stat label="sentim." value={<SentimentChip kind={sent} />} raw />
      </div>
    </div>
  );
}

// ============================================================
// InsightCard · AlertCard · CostMeter
// ============================================================
type InsightKind = "opp" | "thr" | "pat" | "ano";

export function InsightCard({ kind, title, body, sources, confidence }: { kind: InsightKind; title: string; body: string; sources: string; confidence: string }) {
  const cfg: Record<InsightKind, { name: string; c: string; icon: ReactNode }> = {
    opp: { name: "OPORTUNIDAD", c: "var(--success)", icon: <Ic.trend s={11} /> },
    thr: { name: "AMENAZA", c: "var(--danger)", icon: <Ic.alert s={11} /> },
    pat: { name: "PATRÓN", c: "var(--info)", icon: <Ic.sort s={11} /> },
    ano: { name: "ANOMALÍA", c: "var(--warn)", icon: <Ic.bolt s={11} /> },
  };
  const c = cfg[kind];
  return (
    <div style={{ background: "#fff", border: "1px solid var(--n200)", borderRadius: "var(--r-md)", padding: 16, display: "flex", flexDirection: "column", gap: 10, borderLeft: `3px solid ${c.c}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 7px", borderRadius: 99, color: c.c, border: `1px solid ${c.c}`, fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: ".06em", fontWeight: 500 }}>
          {c.icon}{c.name}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--n500)", letterSpacing: ".06em" }}>CONF · {confidence}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--n900)", textWrap: "balance", lineHeight: "19px" }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--n600)", lineHeight: "19px", textWrap: "pretty" }}>{body}</div>
      <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--n100)", display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--n500)", fontFamily: "var(--font-mono)" }}>
        soportado por <b style={{ color: "var(--n900)" }}>{sources}</b> fuentes
        <div style={{ flex: 1 }} />
        <a style={{ color: "var(--sa-base)", textDecoration: "underline" }}>Ver evidencia →</a>
      </div>
    </div>
  );
}

export function AlertCard({ severity, title, body, when, evidence }: { severity: "high" | "med" | "low"; title: string; body: string; when: string; evidence?: string }) {
  const cfg = { high: { c: "var(--danger)", name: "ALTA" }, med: { c: "var(--warn)", name: "MEDIA" }, low: { c: "var(--info)", name: "BAJA" } }[severity];
  return (
    <div style={{ background: "#fff", border: "1px solid var(--n200)", borderRadius: "var(--r-md)", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.c }} />
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: cfg.c, letterSpacing: ".08em", fontWeight: 500 }}>SEV · {cfg.name}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--n500)" }}>{when}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--n900)" }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--n600)", lineHeight: "18px" }}>{body}</div>
      {evidence && <div style={{ padding: 8, background: "var(--n50)", borderRadius: "var(--r-sm)", fontSize: 11, color: "var(--n700)", fontFamily: "var(--font-mono)" }}>{evidence}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <Btn kind="ghost" size="sm">Marcar leída</Btn>
        <Btn kind="ghost" size="sm">Descartar</Btn>
        <div style={{ flex: 1 }} />
        <Btn kind="secondary" size="sm" iconRight={<Ic.arrow s={10} />}>Abrir</Btn>
      </div>
    </div>
  );
}

export function CostMeter({ used, soft, hard, period }: { used: number; soft: number; hard: number; period: string }) {
  const pct = Math.min(100, (used / hard) * 100);
  const softPct = (soft / hard) * 100;
  const tone = used >= hard ? "var(--danger)" : used >= soft ? "var(--warn)" : "var(--success)";
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="t-micro">Costo · {period}</div>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: tone, fontWeight: 500 }}>{used >= soft ? "WARN" : "OK"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 22, fontFamily: "var(--font-mono)", fontWeight: 500 }}>USD {used.toFixed(2)}</span>
        <span style={{ fontSize: 11, color: "var(--n500)", fontFamily: "var(--font-mono)" }}>/ {hard.toFixed(0)} cap</span>
      </div>
      <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, marginTop: 10, position: "relative" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: tone, borderRadius: 3, transition: "background 300ms ease" }} />
        <div style={{ position: "absolute", left: `${softPct}%`, top: -3, bottom: -3, width: 1, background: "var(--n400)" }} />
        <div style={{ position: "absolute", left: `${softPct}%`, top: -12, fontSize: 9, color: "var(--n500)", fontFamily: "var(--font-mono)", transform: "translateX(-50%)" }}>soft · {soft}</div>
      </div>
    </div>
  );
}

// ============================================================
// MediaThumb
// ============================================================
export function MediaThumb({ kind, platform, isAd, label, metrics, ratio = "4/5" }: { kind: ThumbKind; platform: PlatformKey; isAd?: boolean; label?: string; metrics?: string[]; ratio?: "4/5" | "1/1" | "9/16" }) {
  return (
    <div style={{ position: "relative", borderRadius: "var(--r-sm)", overflow: "hidden", aspectRatio: ratio, background: "var(--n100)", border: isAd ? "1px solid var(--sa-base)" : "1px solid var(--n200)" }}>
      <ThumbPlaceholder kind={kind} label={label} />
      <div style={{ position: "absolute", top: 6, left: 6 }}>
        <PlatformBadge platform={platform} size="sm" />
      </div>
      {isAd && (
        <div style={{ position: "absolute", top: 6, right: 6, padding: "2px 6px", background: "var(--sa-base)", color: "#fff", fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: ".08em", borderRadius: 2, fontWeight: 500 }}>AD</div>
      )}
      {kind === "video" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <span style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.85)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--n900)" }}>
            <Ic.play s={11} />
          </span>
        </div>
      )}
      {metrics && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 8px 6px", background: "linear-gradient(transparent, rgba(0,0,0,.5))", color: "#fff", fontSize: 11, fontFamily: "var(--font-mono)", display: "flex", gap: 8 }}>
          {metrics.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MiniInsight — compact insight row (Overview)
// ============================================================
export function MiniInsight({ kind, t, s }: { kind: InsightKind; t: string; s: string }) {
  const c = { opp: "var(--success)", thr: "var(--danger)", pat: "var(--info)", ano: "var(--warn)" }[kind];
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, marginTop: 7, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", lineHeight: "18px" }}>{t}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{s}</div>
      </div>
    </div>
  );
}
