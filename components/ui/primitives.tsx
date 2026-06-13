"use client";

import type { CSSProperties, ReactNode } from "react";
import { Ic } from "@/components/ui/icons";
import type { SentimentKind } from "@/lib/platforms";

// ============================================================
// Btn — HANDOFF §3.1
// ============================================================
type BtnKind = "primary" | "secondary" | "accent" | "ghost" | "destructive";
type BtnSize = "sm" | "md" | "lg";

export function Btn({
  kind = "primary",
  size = "md",
  children,
  icon,
  iconRight,
  disabled,
  loading,
  onClick,
  style,
}: {
  kind?: BtnKind;
  size?: BtnSize;
  children?: ReactNode;
  icon?: ReactNode;
  iconRight?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const sizes: Record<BtnSize, { h: number; px: number; fs: number; ic: number }> = {
    sm: { h: 28, px: 10, fs: 12, ic: 11 },
    md: { h: 34, px: 14, fs: 13, ic: 13 },
    lg: { h: 40, px: 18, fs: 14, ic: 14 },
  };
  const kinds: Record<BtnKind, CSSProperties> = {
    primary: { background: "var(--n900)", color: "#fff", border: "1px solid var(--n900)" },
    secondary: { background: "#fff", color: "var(--n900)", border: "1px solid var(--n300)" },
    accent: { background: "var(--sa-base)", color: "#fff", border: "1px solid var(--sa-base)" },
    ghost: { background: "transparent", color: "var(--n700)", border: "1px solid transparent" },
    destructive: { background: "#fff", color: "var(--danger)", border: "1px solid var(--danger)" },
  };
  const sz = sizes[size];
  const dis: CSSProperties = disabled
    ? { opacity: 0.45, background: "var(--n200)", color: "var(--n500)", border: "1px solid var(--n200)" }
    : {};
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: sz.h,
        padding: `0 ${sz.px}px`,
        fontSize: sz.fs,
        fontWeight: 500,
        borderRadius: "var(--r-sm)",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-sans)",
        whiteSpace: "nowrap",
        transition: "background 120ms ease-out, transform 80ms ease",
        ...kinds[kind],
        ...dis,
        ...style,
      }}
    >
      {loading && <Ic.spinner s={sz.ic} />}
      {icon && !loading && icon}
      {children}
      {iconRight && iconRight}
    </button>
  );
}

// ============================================================
// BBBadge
// ============================================================
type BadgeTone = "success" | "warn" | "danger" | "info" | "accent" | "neutral";

export function BBBadge({
  tone = "neutral",
  dot,
  children,
  size = "md",
}: {
  tone?: BadgeTone;
  dot?: string;
  children: ReactNode;
  size?: "sm" | "md";
}) {
  const tones: Record<BadgeTone, { c: string }> = {
    success: { c: "var(--success)" },
    warn: { c: "var(--warn)" },
    danger: { c: "var(--danger)" },
    info: { c: "var(--info)" },
    accent: { c: "var(--sa-base)" },
    neutral: { c: "var(--n700)" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: size === "sm" ? "1px 7px" : "2px 8px",
        borderRadius: 99,
        fontSize: size === "sm" ? 10 : 11,
        fontWeight: 500,
        color: t.c,
        background: "transparent",
        border: `1px solid ${t.c}`,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot || t.c }} />
      {children}
    </span>
  );
}

// ============================================================
// Field — input / select / search / textarea
// ============================================================
export function Field({
  label,
  value,
  ph,
  select,
  search,
  focused,
  error,
  mono,
  textarea,
}: {
  label: string;
  value?: string;
  ph?: string;
  select?: boolean;
  search?: boolean;
  focused?: boolean;
  error?: string;
  mono?: boolean;
  textarea?: boolean;
}) {
  const border = error ? "var(--danger)" : focused ? "var(--n900)" : "var(--n300)";
  const ring = focused
    ? "0 0 0 3px rgba(24,20,16,.08)"
    : error
      ? "0 0 0 3px rgba(184,38,29,.10)"
      : "none";
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: ".1em",
          color: error ? "var(--danger)" : "var(--n500)",
          textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ position: "relative" }}>
        {search && (
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--n500)" }}>
            <Ic.search />
          </span>
        )}
        <div
          style={{
            height: textarea ? 80 : 36,
            padding: `${textarea ? 8 : 0}px 12px ${textarea ? 8 : 0}px ${search ? 32 : 12}px`,
            border: `1px solid ${border}`,
            borderRadius: "var(--r-sm)",
            background: "#fff",
            display: "flex",
            alignItems: textarea ? "flex-start" : "center",
            fontSize: 13,
            color: value ? "var(--n900)" : "var(--n500)",
            fontFamily: mono ? "var(--font-mono)" : "inherit",
            boxShadow: ring,
            transition: "box-shadow 150ms ease, border-color 150ms ease",
          }}
        >
          {value || <span style={{ color: "var(--n500)" }}>{ph || (textarea ? "Observaciones del scrapeo…" : "—")}</span>}
          {select && (
            <span style={{ marginLeft: "auto", color: "var(--n500)" }}>
              <Ic.arrowDown />
            </span>
          )}
        </div>
      </div>
      {error && (
        <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6, fontFamily: "var(--font-mono)" }}>{error}</div>
      )}
    </div>
  );
}

// ============================================================
// Toast
// ============================================================
export function Toast({
  kind,
  title,
  body,
  action,
}: {
  kind: "success" | "danger";
  title: string;
  body: string;
  action?: string;
}) {
  const tone =
    kind === "success"
      ? { c: "var(--success)" }
      : { c: "var(--danger)" };
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        border: `1px solid ${tone.c}`,
        borderLeft: `3px solid ${tone.c}`,
        borderRadius: "var(--r-sm)",
        background: kind === "danger" ? "var(--danger-soft)" : "#fff",
      }}
    >
      <div style={{ color: tone.c, marginTop: 2 }}>{kind === "success" ? <Ic.check s={12} /> : <Ic.alert s={14} />}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--n900)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--n600)", marginTop: 2 }}>
          {body} · <a style={{ color: tone.c, textDecoration: "underline" }}>{action}</a>
        </div>
      </div>
      <Ic.close />
    </div>
  );
}

// ============================================================
// Skel — skeleton
// ============================================================
export function Skel({ w, h }: { w: number | string; h: number | string }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        background: "linear-gradient(90deg, var(--n100) 0%, var(--n200) 50%, var(--n100) 100%)",
        backgroundSize: "200% 100%",
        borderRadius: 3,
      }}
    />
  );
}

// ============================================================
// SentimentChip
// ============================================================
export function SentimentChip({ kind, label, big }: { kind: SentimentKind; label?: string; big?: boolean }) {
  const map: Record<SentimentKind, { c: string; t: string }> = {
    pos: { c: "var(--success)", t: "positivo" },
    neu: { c: "var(--n500)", t: "neutro" },
    neg: { c: "var(--danger)", t: "negativo" },
    mix: { c: "var(--warn)", t: "mixto" },
  };
  const m = map[kind] ?? { c: "var(--n500)", t: "—" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: big ? 10 : 8, height: big ? 10 : 8, borderRadius: "50%", background: m.c }} />
      <span style={{ fontSize: big ? 12 : 11, color: "var(--n700)" }}>{label || m.t}</span>
    </span>
  );
}

// ============================================================
// KPI tile
// ============================================================
export function KPI({
  label,
  value,
  delta,
  up,
  spark,
  bar,
  tone,
  empty,
  skeleton,
}: {
  label?: string;
  value?: string;
  delta?: string;
  up?: boolean;
  spark?: boolean;
  bar?: number;
  tone?: "ink";
  empty?: boolean;
  skeleton?: boolean;
}) {
  const ink = tone === "ink";
  if (skeleton) {
    return (
      <div style={{ height: 108, padding: 14, border: "1px solid var(--n200)", borderRadius: "var(--r-sm)", display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
        <Skel w="40%" h={10} />
        <Skel w="65%" h={20} />
      </div>
    );
  }
  if (empty) {
    return (
      <div style={{ height: 108, padding: 14, border: "1px dashed var(--n300)", borderRadius: "var(--r-sm)" }}>
        <div className="t-micro" style={{ color: "var(--n500)" }}>— SIN DATOS —</div>
        <div style={{ height: 10, marginTop: 10, background: "var(--n100)", borderRadius: 2 }} />
        <div style={{ height: 8, marginTop: 6, width: "40%", background: "var(--n100)", borderRadius: 2 }} />
        <div className="t-small" style={{ color: "var(--n500)", marginTop: 14 }}>Sin menciones para el rango.</div>
      </div>
    );
  }
  return (
    <div style={{ height: 108, padding: 14, border: ink ? "none" : "1px solid var(--border)", borderRadius: "var(--r-sm)", background: ink ? "var(--n900)" : "var(--surface)", color: ink ? "#fff" : "var(--text)", position: "relative", overflow: "hidden" }}>
      <div className="t-micro" style={{ color: ink ? "rgba(255,255,255,.6)" : "var(--text-muted)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 500, marginTop: 6, letterSpacing: "-0.01em" }}>{value}</div>
      {delta && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12, color: up ? "var(--success)" : "var(--danger)" }}>
          {up ? <Ic.trend s={10} /> : <Ic.trendDown s={10} />}
          <span style={{ fontFamily: "var(--font-mono)" }}>{delta}</span>
        </div>
      )}
      {spark && (
        <svg width="80" height="22" viewBox="0 0 80 22" style={{ position: "absolute", right: 14, bottom: 14 }}>
          <polyline fill="none" stroke="var(--success)" strokeWidth="1.4" points="0,16 10,14 20,16 30,11 40,12 50,8 60,9 70,5 80,6" />
        </svg>
      )}
      {bar != null && (
        <div style={{ height: 6, marginTop: 14, background: "rgba(255,255,255,.18)", borderRadius: 3 }}>
          <div style={{ width: `${bar}%`, height: "100%", background: "#fff", borderRadius: 3 }} />
        </div>
      )}
    </div>
  );
}
