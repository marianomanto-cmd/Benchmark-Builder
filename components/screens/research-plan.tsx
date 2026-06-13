"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { PlatformBadge } from "@/components/domain";
import { RunButton } from "@/components/run-button";
import type { PlatformKey } from "@/lib/platforms";

type Comp = { name: string; handle: string; followers: number; followersLabel: string; isClient?: boolean; platforms: PlatformKey[] };

const COMPETITORS: Comp[] = [
  { name: "Avianca", handle: "avianca", followers: 6_200_000, followersLabel: "6,2M", platforms: ["instagram", "tiktok", "youtube", "x", "meta_ads"] },
  { name: "LATAM Colombia", handle: "latamcol", followers: 4_100_000, followersLabel: "4,1M", platforms: ["instagram", "facebook", "x", "meta_ads"] },
  { name: "Copa Airlines", handle: "copaairlines", followers: 1_800_000, followersLabel: "1,8M", isClient: true, platforms: ["instagram", "youtube", "x", "meta_ads"] },
  { name: "Wingo", handle: "wingo.col", followers: 890_000, followersLabel: "890k", platforms: ["instagram", "tiktok", "facebook"] },
  { name: "Arajet", handle: "arajetdom", followers: 210_000, followersLabel: "210k", platforms: ["instagram", "x", "web"] },
];

type Family = "organic" | "paid";
const SOURCES: { key: PlatformKey; label: string; cost: number; note: string; family: Family }[] = [
  { key: "instagram", label: "Instagram", cost: 0.42, note: "orgánico", family: "organic" },
  { key: "tiktok", label: "TikTok", cost: 0.28, note: "orgánico", family: "organic" },
  { key: "youtube", label: "YouTube", cost: 0.18, note: "orgánico", family: "organic" },
  { key: "x", label: "X", cost: 0.14, note: "live search", family: "organic" },
  { key: "reddit", label: "Reddit", cost: 0.12, note: "API pública", family: "organic" },
  { key: "web", label: "Web · prensa", cost: 0.42, note: "orgánico", family: "organic" },
  { key: "meta_ads", label: "Meta Ad Library", cost: 0.3, note: "anuncios", family: "paid" },
  { key: "google_ads", label: "Google Ads Transparency", cost: 0.28, note: "anuncios", family: "paid" },
  { key: "linkedin_ads", label: "LinkedIn Ad Library", cost: 0.22, note: "anuncios", family: "paid" },
];

const MAG = [
  { label: "Todos", min: 0 },
  { label: "> 1M followers", min: 1_000_000 },
  { label: "> 500k followers", min: 500_000 },
];

const STEPS = ["Problema de negocio", "Competidores", "Alcance y fechas", "Estimación"];

const card: CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 18, boxShadow: "var(--sh-1)" };

export function ResearchPlan() {
  const sp = useSearchParams();
  const initialQ = sp.get("q") ?? "";

  const [step, setStep] = useState(0);
  const [problem, setProblem] = useState(initialQ);
  const [comps, setComps] = useState<Set<string>>(new Set(COMPETITORS.map((c) => c.handle)));
  const [src, setSrc] = useState<Set<PlatformKey>>(new Set(SOURCES.filter((s) => s.family === "organic").map((s) => s.key)));
  const [scope, setScope] = useState<"organic" | "both">("organic");
  const [adIntent, setAdIntent] = useState<"commercial" | "political" | "mixed">("commercial");
  const [period, setPeriod] = useState("60 días");
  const [dates, setDates] = useState("");
  const [geo, setGeo] = useState<Set<string>>(new Set(["CO", "PA", "US"]));

  const PAID_KEYS = SOURCES.filter((s) => s.family === "paid").map((s) => s.key);

  // Discovery: infer scope/ad_intent from the prompt and pre-select (mock-safe).
  useEffect(() => {
    if (!initialQ.trim()) return;
    let active = true;
    fetch("/api/discovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: initialQ }) })
      .then((r) => r.json())
      .then((d: { plan?: { scope?: string; ad_intent?: "commercial" | "political" | "mixed" } }) => {
        if (!active || !d?.plan) return;
        const sc = d.plan.scope === "organic" ? "organic" : "both";
        chooseScope(sc);
        setAdIntent(d.plan.ad_intent ?? "commercial");
      })
      .catch(() => {});
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  function toggle<T>(set: Set<T>, v: T): Set<T> {
    const n = new Set(set);
    if (n.has(v)) n.delete(v); else n.add(v);
    return n;
  }

  // Choosing scope also adds/removes the paid sources from the selection.
  function chooseScope(sc: "organic" | "both") {
    setScope(sc);
    setSrc((p) => {
      const n = new Set(p);
      if (sc === "both") PAID_KEYS.forEach((k) => n.add(k));
      else PAID_KEYS.forEach((k) => n.delete(k));
      return n;
    });
  }

  function applyMagnitude(min: number) {
    setComps(new Set(COMPETITORS.filter((c) => c.followers >= min || c.isClient).map((c) => c.handle)));
  }

  // Sources that actually count: organic always, paid only when scope includes it.
  const activeSources = SOURCES.filter((s) => src.has(s.key) && (s.family === "organic" || scope === "both"));

  const estimate = useMemo(() => {
    const factor = Math.max(1, comps.size) / COMPETITORS.length;
    const active = SOURCES.filter((s) => src.has(s.key) && (s.family === "organic" || scope === "both"));
    const total = Math.round(active.reduce((a, s) => a + s.cost, 0) * (0.4 + 0.6 * factor) * 100) / 100;
    const paidDelta = Math.round(
      SOURCES.filter((s) => s.family === "paid" && src.has(s.key) && scope === "both").reduce((a, s) => a + s.cost, 0) * (0.4 + 0.6 * factor) * 100,
    ) / 100;
    const minutes = Math.max(1, Math.round((active.length * comps.size) / 3));
    return { total, minutes, srcCount: active.length, paidDelta };
  }, [src, comps, scope]);

  const selectedPlatforms = activeSources.map((s) => s.key);
  const runScope: "organic" | "both" = scope;

  const keywords = problem.trim()
    ? [problem.trim()]
    : COMPETITORS.filter((c) => comps.has(c.handle)).map((c) => c.name);

  return (
    <ScreenShell breadcrumb={["Proyectos", "Cartagena · Q2 2026", "Nuevo run"]} badges={<BBBadge tone="warn" size="sm">armando marco</BBBadge>} runMeta={`paso ${step + 1} / 4`}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-mono)", background: i <= step ? "var(--accent)" : "var(--surface-2)", color: i <= step ? "#fff" : "var(--text-muted)", border: i <= step ? "none" : "1px solid var(--border)" }}>{i < step ? "✓" : i + 1}</span>
                <span style={{ fontSize: 12, fontWeight: i === step ? 600 : 400, color: i === step ? "var(--text)" : "var(--text-muted)", whiteSpace: "nowrap" }}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: "var(--border)" }} />}
            </div>
          ))}
        </div>

        {/* STEP 0 — problem */}
        {step === 0 && (
          <div style={card}>
            <div className="t-micro" style={{ color: "var(--accent)" }}>PASO 1 · PROBLEMA DE NEGOCIO</div>
            <div className="t-h2" style={{ marginTop: 8, color: "var(--text)" }}>¿Qué querés investigar?</div>
            <div className="t-small" style={{ color: "var(--text-muted)", marginTop: 6, marginBottom: 14 }}>
              Describí la pregunta de negocio: un destino, una nueva ruta, tarifas publicitadas, un lanzamiento. Incluí límites y alcance.
            </div>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Ej: Quiero entender cómo comunica Avianca su nueva frecuencia a Cartagena y qué tarifas publicita, frente a LATAM y Wingo, en los últimos 60 días."
              style={{ width: "100%", minHeight: 120, resize: "vertical", padding: 14, borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-sans)", lineHeight: "21px" }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {["Una nueva ruta / destino", "Tarifas publicitadas", "Lanzamiento de producto", "Sentimiento de marca"].map((t) => (
                <button key={t} type="button" onClick={() => setProblem((p) => (p ? p : t))} style={chip()}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 — competitors */}
        {step === 1 && (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="t-micro" style={{ color: "var(--accent)" }}>PASO 2 · COMPETIDORES</div>
                <div className="t-h2" style={{ marginTop: 8, color: "var(--text)" }}>¿A quién analizamos?</div>
              </div>
              <select
                onChange={(e) => applyMagnitude(Number(e.target.value))}
                defaultValue={0}
                style={{ height: 34, padding: "0 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 12 }}
              >
                {MAG.map((m) => <option key={m.label} value={m.min}>Magnitud: {m.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {COMPETITORS.map((c) => {
                const on = comps.has(c.handle);
                return (
                  <label key={c.handle} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: "var(--r-sm)", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, background: on ? "var(--accent-soft)" : "var(--surface)", cursor: "pointer" }}>
                    <input type="checkbox" checked={on} onChange={() => setComps((s) => toggle(s, c.handle))} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", minWidth: 150 }}>{c.name}{c.isClient && <span style={{ fontSize: 9, color: "var(--accent)", fontFamily: "var(--font-mono)", marginLeft: 6 }}>CLIENTE</span>}</span>
                    <div style={{ display: "flex", gap: 4 }}>{c.platforms.map((p) => <PlatformBadge key={p} platform={p} size="sm" />)}</div>
                    <span style={{ marginLeft: "auto", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{c.followersLabel} followers</span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn kind="ghost" size="sm" onClick={() => setComps(new Set(COMPETITORS.map((c) => c.handle)))}>Todos</Btn>
              <Btn kind="ghost" size="sm" onClick={() => setComps(new Set(COMPETITORS.filter((c) => c.isClient).map((c) => c.handle)))}>Solo cliente</Btn>
            </div>
          </div>
        )}

        {/* STEP 2 — scope */}
        {step === 2 && (
          <div style={card}>
            <div className="t-micro" style={{ color: "var(--accent)" }}>PASO 3 · ALCANCE Y FECHAS</div>
            <div className="t-h2" style={{ marginTop: 8, color: "var(--text)" }}>Acotá la ventana de análisis</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
              <Field label="Período">
                <select value={period} onChange={(e) => setPeriod(e.target.value)} style={fieldInput()}>
                  {["7 días", "30 días", "60 días", "90 días", "YTD"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Fechas específicas (opcional)">
                <input value={dates} onChange={(e) => setDates(e.target.value)} placeholder="ej: 01/03 – 30/04" style={fieldInput()} />
              </Field>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="t-micro" style={{ marginBottom: 8 }}>GEOGRAFÍAS</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["CO", "PA", "US", "MX", "AR", "CL", "DO"].map((g) => {
                  const on = geo.has(g);
                  return (
                    <button key={g} type="button" onClick={() => setGeo((s) => toggle(s, g))} style={{ ...chip(), background: on ? "var(--accent-soft)" : "var(--surface-2)", borderColor: on ? "var(--accent)" : "var(--border)", color: on ? "var(--accent)" : "var(--text-muted)" }}>{g}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — estimate */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* organic / paid toggle */}
            <div style={card}>
              <div className="t-micro" style={{ color: "var(--accent)" }}>ALCANCE DE FUENTES</div>
              <div className="t-h2" style={{ marginTop: 8, color: "var(--text)" }}>¿Solo orgánico, o también paid media?</div>
              <div className="t-small" style={{ color: "var(--text-muted)", marginTop: 6, marginBottom: 14 }}>
                Paid suma las bibliotecas de anuncios (Meta, Google, LinkedIn). Cada fuente suma costo por anuncio.
                {adIntent === "political" && " · Intención política detectada: se prioriza la transparencia de anuncios que declara cada plataforma."}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {([["organic", "Solo orgánico"], ["both", "Orgánico + paid"]] as const).map(([val, label]) => {
                  const on = scope === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => chooseScope(val)}
                      style={{ flex: 1, minWidth: 200, textAlign: "left", padding: "12px 14px", borderRadius: "var(--r-sm)", cursor: "pointer", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, background: on ? "var(--accent-soft)" : "var(--surface)" }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: on ? "var(--accent)" : "var(--text)" }}>{label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 3 }}>
                        {val === "organic" ? "posts y conversación" : `+ anuncios · est. +USD ${estimate.paidDelta.toFixed(2)}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={card}>
              <div className="t-micro" style={{ color: "var(--accent)" }}>PASO 4 · FUENTES Y COSTO</div>
              <div className="t-h2" style={{ marginTop: 8, color: "var(--text)" }}>Antes de gastar tokens, revisalo</div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
                {SOURCES.filter((s) => s.family === "organic" || scope === "both").map((s, i) => {
                  const on = src.has(s.key);
                  return (
                    <label key={s.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderTop: i ? "1px solid var(--border)" : "none", opacity: on ? 1 : 0.5, cursor: "pointer" }}>
                      <input type="checkbox" checked={on} onChange={() => setSrc((p) => toggle(p, s.key))} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                      <PlatformBadge platform={s.key} size="md" />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", minWidth: 130 }}>{s.label}</span>
                      <span style={{ flex: 1, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{s.note}</span>
                      <span style={{ fontSize: 11, color: s.family === "paid" ? "var(--accent)" : "var(--text)", fontFamily: "var(--font-mono)" }}>USD {s.cost.toFixed(2)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ ...card, display: "flex", alignItems: "center", gap: 16, background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
              <div>
                <div className="t-micro" style={{ color: "var(--accent)" }}>COSTO ESTIMADO DEL RUN</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>USD {estimate.total.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {comps.size} competidores · {estimate.srcCount} fuentes · {scope === "both" ? "orgánico + paid" : "orgánico"} · ~{estimate.minutes} min
                  {scope === "both" && estimate.paidDelta > 0 && <> · paid +USD {estimate.paidDelta.toFixed(2)}</>}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <RunButton slug="cartagena-q2-2026" platforms={selectedPlatforms} keywords={keywords} scope={runScope} adIntent={adIntent} label="Aprobar y ejecutar" />
            </div>
          </div>
        )}

        {/* nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
          <Btn kind="ghost" size="md" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Atrás</Btn>
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 && (
            <Btn kind="primary" size="md" iconRight={<Ic.arrow s={12} />} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Siguiente</Btn>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--text-muted)", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function fieldInput(): CSSProperties {
  return { width: "100%", height: 36, padding: "0 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "var(--font-sans)" };
}

function chip(): CSSProperties {
  return { fontSize: 12, padding: "6px 12px", borderRadius: 99, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-muted)", cursor: "pointer" };
}
