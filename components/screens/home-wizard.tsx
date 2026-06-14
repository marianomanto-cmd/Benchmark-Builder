"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, ArrowRight, ArrowLeft, X, Check, Wand2, Loader2, Newspaper, Globe } from "lucide-react";
import { suggestFor, assistFor, detectCategory } from "@/lib/discovery/suggest";
import { PlatformBadge } from "@/components/domain";
import type { PlatformKey } from "@/lib/platforms";

const STEPS = ["Tu marca", "Competencia", "Alcance", "Confirmar"];

// Per-source cost model (USD) — rough but realistic so the estimate is useful.
const NET_COST = 0.16; // avg scraping cost per network · per competitor
const PAID: { key: PlatformKey; label: string; perComp: number }[] = [
  { key: "meta_ads", label: "Meta Ad Library", perComp: 0.2 },
  { key: "google_ads", label: "Google Ads Transparency", perComp: 0.18 },
  { key: "linkedin_ads", label: "LinkedIn Ad Library", perComp: 0.14 },
];

// Networks the user can toggle (default: all on). `portales` (news portals) and
// `web` (general web) both feed the web source; the rest map 1:1 to a platform.
const NETWORKS: { key: string; label: string; platform?: PlatformKey }[] = [
  { key: "instagram", label: "Instagram", platform: "instagram" },
  { key: "tiktok", label: "TikTok", platform: "tiktok" },
  { key: "youtube", label: "YouTube", platform: "youtube" },
  { key: "x", label: "X", platform: "x" },
  { key: "facebook", label: "Facebook", platform: "facebook" },
  { key: "reddit", label: "Reddit", platform: "reddit" },
  { key: "portales", label: "Portales" },
  { key: "web", label: "Web", platform: "web" },
];
const ALL_NET = NETWORKS.map((n) => n.key);

const INVEST = ["No pauto", "< US$1k", "US$1–5k", "US$5–20k", "US$20k+"];
const PERIODS = ["30 días", "60 días", "90 días", "YTD"];

export function HomeWizard({ initialQuery, onClose }: { initialQuery: string; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0 — brand
  const [brand, setBrand] = useState("");
  const [brandDesc, setBrandDesc] = useState("");
  const [site, setSite] = useState("");
  const [igUrl, setIgUrl] = useState("");
  const [otherSocial, setOtherSocial] = useState("");
  const [investOrg, setInvestOrg] = useState(INVEST[2]);
  const [investPaid, setInvestPaid] = useState(INVEST[2]);
  const [problem, setProblem] = useState(initialQuery);
  // Step 1 — chip lists
  const [geo, setGeo] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [discards, setDiscards] = useState<string[]>([]);
  // Step 2 — scope + networks + window
  const [scope, setScope] = useState<"organic" | "both">("organic");
  const [networks, setNetworks] = useState<string[]>(ALL_NET);
  const [period, setPeriod] = useState("60 días");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const ctx = useMemo(() => `${brand} ${brandDesc} ${problem}`, [brand, brandDesc, problem]);
  const assist = assistFor(step, { brand, brandDesc, igUrl, problem, geo, competitors, discards });

  function toggleNet(key: string) {
    setNetworks((ns) => (ns.includes(key) ? ns.filter((k) => k !== key) : [...ns, key]));
  }

  const platforms = useMemo<PlatformKey[]>(() => {
    const org = new Set<PlatformKey>();
    for (const k of networks) {
      const n = NETWORKS.find((x) => x.key === k);
      if (n?.platform) org.add(n.platform);
      if (k === "portales") org.add("web");
    }
    const arr = [...org];
    return scope === "both" ? [...arr, ...PAID.map((s) => s.key)] : arr;
  }, [networks, scope]);

  const days = useMemo(() => {
    if (period === "custom") {
      if (!customFrom || !customTo) return 60;
      const d = Math.round((new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400_000);
      return d > 0 ? d : 60;
    }
    if (period === "30 días") return 30;
    if (period === "90 días") return 90;
    if (period === "YTD") return Math.max(30, Math.round((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400_000));
    return 60;
  }, [period, customFrom, customTo]);

  const periodLabel = period === "custom" ? (customFrom && customTo ? `${customFrom} → ${customTo}` : "rango exacto") : period;

  const estimate = useMemo(() => {
    const comps = Math.max(1, competitors.length + 1); // +1 = your own brand
    const periodFactor = Math.min(3, Math.max(0.4, days / 60));
    const orgCount = Math.max(1, networks.length);
    const scraping = (orgCount * NET_COST + (scope === "both" ? PAID.reduce((a, s) => a + s.perComp, 0) : 0)) * comps * periodFactor;
    const ai = 0.35 + comps * 0.12 + (scope === "both" ? 0.4 : 0); // análisis + insights (+ visión en anuncios)
    const total = scraping + ai;
    const low = Math.round(total * 0.8 * 100) / 100;
    const high = Math.round(total * 1.25 * 100) / 100;
    const minutes = Math.max(2, Math.round((platforms.length * comps) / 3));
    return { total: Math.round(total * 100) / 100, low, high, scraping: Math.round(scraping * 100) / 100, ai: Math.round(ai * 100) / 100, minutes, comps };
  }, [competitors.length, scope, days, networks.length, platforms.length]);

  function suggest(field: "geo" | "competitors" | "discards", set: (v: string[]) => void, cur: string[]) {
    const next = suggestFor(field, ctx).filter((x) => !cur.includes(x));
    set([...cur, ...next].slice(0, 8));
  }

  async function execute() {
    setRunning(true);
    setError("");
    let isoFrom: string, isoTo: string;
    if (period === "custom" && customFrom && customTo) {
      isoFrom = customFrom;
      isoTo = customTo;
    } else {
      isoFrom = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
      isoTo = new Date().toISOString().slice(0, 10);
    }
    const plan = {
      client_brand: brand,
      brand_desc: brandDesc,
      brand_site: site,
      brand_handles: [igUrl, otherSocial].filter(Boolean),
      invest_organic: investOrg,
      invest_paid: investPaid,
      competitors,
      category: detectCategory(ctx),
      geo,
      discards,
      timeframe: { from: isoFrom, to: isoTo },
      platforms,
      scope,
      ad_intent: "commercial" as const,
    };
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "cartagena-q2-2026", platforms, keywords: [problem || brand], scope, adIntent: "commercial", plan }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) router.push("/overview");
      else { setError(json.error ?? "Error al ejecutar el run"); setRunning(false); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
      setRunning(false);
    }
  }

  const canNext =
    step === 0 ? Boolean(brand.trim() && problem.trim()) :
    step === 1 ? geo.length > 0 && competitors.length > 0 :
    step === 2 ? networks.length > 0 :
    true;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 70, background: "color-mix(in srgb, var(--bg) 80%, transparent)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", overflowY: "auto" }}
    >
      {/* ambient glow — crece a medida que se completa el marco; pulso suave en cada paso */}
      <motion.div aria-hidden animate={{ opacity: 0.4 + step * 0.1 }} transition={{ duration: 0.7, ease: "easeOut" }} style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(72% 56% at 50% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 72%)" }} />
      <motion.div key={`pulse-${step}`} aria-hidden initial={{ opacity: 0.5, scale: 0.85 }} animate={{ opacity: 0, scale: 1.25 }} transition={{ duration: 1.0, ease: "easeOut" }} style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(50% 42% at 50% 10%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 70%)" }} />
      <div style={{ position: "relative", maxWidth: 680, margin: "0 auto", padding: "clamp(16px, 4vw, 28px) clamp(16px, 5vw, 24px) 64px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.jpg" alt="" width={22} height={22} className="bb-logo" style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} /> Phema
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {/* progress — 1·2·3 + confirmación */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, flex: "1 1 0", minWidth: 0 }}>
              <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-mono)", background: i <= step ? "var(--accent)" : "var(--surface-2)", color: i <= step ? "var(--accent-ink)" : "var(--text-muted)", border: i <= step ? "none" : "1px solid var(--border)" }}>{i < step ? "✓" : i + 1}</span>
              <span className="bb-hide-sm" style={{ fontSize: 11.5, fontWeight: i === step ? 600 : 400, color: i === step ? "var(--text)" : "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* title */}
        <h1 className="t-section" style={{ fontSize: "clamp(1.5rem, 4vw, 2.1rem)", marginBottom: 2 }}>
          {step === 0 && <>Contame de <em style={{ fontStyle: "italic", color: "var(--accent)" }}>tu marca</em></>}
          {step === 1 && <>¿Contra <em style={{ fontStyle: "italic", color: "var(--accent)" }}>quién</em> y dónde?</>}
          {step === 2 && <>¿Qué vamos a <em style={{ fontStyle: "italic", color: "var(--accent)" }}>escuchar</em>?</>}
          {step === 3 && <>Revisá y <em style={{ fontStyle: "italic", color: "var(--accent)" }}>ejecutá</em></>}
        </h1>

        {/* AI assist line */}
        {assist.msg && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "12px 0 16px", padding: "10px 13px", borderRadius: 12, background: "var(--surface)", border: `1px solid ${assist.ok ? "var(--border)" : "color-mix(in srgb, var(--accent) 40%, var(--border))"}` }}>
            <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 8, background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={14} /></span>
            <div style={{ fontSize: 12.5, lineHeight: "18px", color: "var(--text-muted)" }}>{assist.msg}</div>
          </div>
        )}

        {/* step body */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {step === 0 && (
              <div style={cardStack}>
                <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Tu marca"><input style={inp} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: Copa Airlines" /></Field>
                  <Field label="Sitio web"><input style={inp} value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://…" /></Field>
                </div>
                <Field label="¿Qué hacen? (una línea)"><input style={inp} value={brandDesc} onChange={(e) => setBrandDesc(e.target.value)} placeholder="Ej: aerolínea con hub en Panamá, rutas en LatAm" /></Field>
                <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Instagram"><input style={inp} value={igUrl} onChange={(e) => setIgUrl(e.target.value)} placeholder="@tumarca o link" /></Field>
                  <Field label="Otras redes (opcional)"><input style={inp} value={otherSocial} onChange={(e) => setOtherSocial(e.target.value)} placeholder="TikTok, YouTube, LinkedIn…" /></Field>
                </div>
                <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Inversión mensual · orgánico"><select style={inp} value={investOrg} onChange={(e) => setInvestOrg(e.target.value)}>{INVEST.map((x) => <option key={x}>{x}</option>)}</select></Field>
                  <Field label="Inversión mensual · paga"><select style={inp} value={investPaid} onChange={(e) => setInvestPaid(e.target.value)}>{INVEST.map((x) => <option key={x}>{x}</option>)}</select></Field>
                </div>
                <Field label="Tu pregunta de negocio">
                  <textarea style={{ ...inp, height: "auto", minHeight: 74, padding: "10px 14px", resize: "vertical", lineHeight: "20px" }} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="Ej: cómo comunican mis competidores la ruta a Cartagena y cuánto invierten en pauta vs. nosotros" />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div style={cardStack}>
                <ChipGroup title="Mercados" value={geo} onChange={setGeo} placeholder="País o ciudad + Enter" onSuggest={() => suggest("geo", setGeo, geo)} suggestions={suggestFor("geo", ctx)} />
                <ChipGroup title="Competidores" value={competitors} onChange={setCompetitors} placeholder="Competidor + Enter" onSuggest={() => suggest("competitors", setCompetitors, competitors)} suggestions={suggestFor("competitors", ctx)} />
                <ChipGroup title="Descartes (opcional)" value={discards} onChange={setDiscards} placeholder="Tema a descartar + Enter" onSuggest={() => suggest("discards", setDiscards, discards)} suggestions={suggestFor("discards", ctx)} />
              </div>
            )}

            {step === 2 && (
              <div style={cardStack}>
                {/* scope */}
                <div>
                  <SectionLabel>Alcance</SectionLabel>
                  <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([["organic", "Solo orgánico", "Posts y conversación"], ["both", "Orgánico + paid", "Suma anuncios: cuánto y cómo invierten"]] as const).map(([val, t, d]) => {
                      const on = scope === val;
                      return (
                        <button key={val} type="button" onClick={() => setScope(val)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, background: on ? "color-mix(in srgb, var(--accent) 10%, var(--surface))" : "var(--surface)" }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: on ? "var(--accent)" : "var(--text)" }}>{t}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>{d}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* networks */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <SectionLabel>Redes y fuentes</SectionLabel>
                    <button type="button" onClick={() => setNetworks(networks.length === ALL_NET.length ? [] : ALL_NET)} style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
                      {networks.length === ALL_NET.length ? "Ninguna" : "Todas"}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: 8 }}>
                    {NETWORKS.map((n) => {
                      const on = networks.includes(n.key);
                      return (
                        <button key={n.key} type="button" onClick={() => toggleNet(n.key)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 10, cursor: "pointer", textAlign: "left", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, background: on ? "color-mix(in srgb, var(--accent) 9%, var(--surface))" : "var(--surface)", opacity: on ? 1 : 0.6 }}>
                          {n.platform ? (
                            <PlatformBadge platform={n.platform} size="sm" />
                          ) : (
                            <span style={{ width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexShrink: 0 }}>{n.key === "portales" ? <Newspaper size={14} /> : <Globe size={14} />}</span>
                          )}
                          <span style={{ fontSize: 12.5, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>
                          <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1px solid var(--border-strong)", color: "var(--accent-ink)" }}>{on && <Check size={11} />}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* time window */}
                <div>
                  <SectionLabel>Ventana de tiempo</SectionLabel>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {PERIODS.map((p) => {
                      const on = period === p;
                      return (
                        <button key={p} type="button" onClick={() => setPeriod(p)} style={chip(on)}>{p}</button>
                      );
                    })}
                    <button type="button" onClick={() => setPeriod("custom")} style={chip(period === "custom")}>Rango exacto</button>
                  </div>
                  {period === "custom" && (
                    <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                      <Field label="Desde"><input type="date" max={customTo || undefined} style={inp} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></Field>
                      <Field label="Hasta"><input type="date" min={customFrom || undefined} style={inp} value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></Field>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={cardStack}>
                {/* framing — el caso de estudio para revisar */}
                <div style={{ ...cardBox, borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))" }}>
                  <div className="t-micro" style={{ color: "var(--accent)" }}>CASO DE ESTUDIO</div>
                  <div className="t-serif" style={{ fontSize: "clamp(1.1rem, 3vw, 1.45rem)", lineHeight: 1.3, marginTop: 8, color: "var(--text)" }}>
                    Vas a investigar <em style={{ fontStyle: "italic", color: "var(--accent)" }}>{detectCategory(ctx)}</em> en {geo.join(", ") || "—"}, comparando <b>{brand || "tu marca"}</b> frente a {competitors.length ? competitors.join(", ") : "la competencia"}, en {scope === "both" ? "orgánico + paid" : "orgánico"}, durante {periodLabel}.
                  </div>
                </div>

                {/* brief: marca + marco */}
                <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={cardBox}>
                    <div className="t-micro">TU MARCA</div>
                    <ul style={sumList}>
                      <Sum k="Marca">{brand || "—"}</Sum>
                      <Sum k="Qué hace">{brandDesc || "—"}</Sum>
                      <Sum k="Web / IG">{[site, igUrl].filter(Boolean).join(" · ") || "—"}</Sum>
                      <Sum k="Inversión">org. {investOrg} · paga {investPaid}</Sum>
                    </ul>
                  </div>
                  <div style={cardBox}>
                    <div className="t-micro">MARCO DE ANÁLISIS</div>
                    <ul style={sumList}>
                      <Sum k="Mercados">{geo.join(", ") || "—"}</Sum>
                      <Sum k="Competidores">{competitors.join(", ") || "—"}</Sum>
                      <Sum k="Alcance">{scope === "both" ? "orgánico + paid" : "orgánico"}</Sum>
                      <Sum k="Redes">{networks.map((k) => NETWORKS.find((n) => n.key === k)?.label ?? k).join(", ") || "—"}</Sum>
                      <Sum k="Descartes">{discards.join(", ") || "ninguno"}</Sum>
                      <Sum k="Ventana">{periodLabel}</Sum>
                    </ul>
                  </div>
                </div>

                {/* costo */}
                <div style={{ ...cardBox, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
                  <div>
                    <div className="t-micro" style={{ color: "var(--accent)" }}>COSTO ESTIMADO DEL RUN</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 600, marginTop: 4 }}>US${estimate.total.toFixed(2)}</div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginTop: 2 }}>rango US${estimate.low.toFixed(2)}–{estimate.high.toFixed(2)} · ~{estimate.minutes} min · {estimate.comps} marcas</div>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textAlign: "right", lineHeight: "18px" }}>
                    scraping US${estimate.scraping.toFixed(2)}<br />análisis US${estimate.ai.toFixed(2)}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>Revisá el caso de estudio y aprobá para ejecutar. Modo mock = costo real US$0.</div>
                {error && <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
          <button type="button" onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))} style={navBtn(false)}>
            <ArrowLeft size={15} /> {step === 0 ? "Salir" : "Atrás"}
          </button>
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} style={navBtn(true, !canNext)}>
              Siguiente <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" disabled={running} onClick={execute} style={navBtn(true, running)}>
              {running ? <><Loader2 size={15} className="bb-spin" /> Ejecutando…</> : <><Sparkles size={15} /> Aprobar y ejecutar</>}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ChipGroup({ title, value, onChange, placeholder, onSuggest, suggestions }: { title: string; value: string[]; onChange: (v: string[]) => void; placeholder: string; onSuggest: () => void; suggestions: string[] }) {
  const [draft, setDraft] = useState("");
  function add(v: string) { const t = v.trim(); if (t && !value.includes(t)) onChange([...value, t]); setDraft(""); }
  const remaining = suggestions.filter((s) => !value.includes(s)).slice(0, 6);
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          style={{ ...inp, flex: "1 1 200px" }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }}
          placeholder={placeholder}
        />
        <button type="button" onClick={onSuggest} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0 14px", height: 42, borderRadius: 10, border: "1px solid var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          <Wand2 size={14} /> Sugerime
        </button>
      </div>
      {value.length > 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 9 }}>
          {value.map((v) => (
            <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px 5px 11px", borderRadius: 999, background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", border: "1px solid var(--accent)", color: "var(--text)", fontSize: 12.5 }}>
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Quitar ${v}`} style={{ display: "inline-flex", border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer", padding: 0 }}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      {remaining.length > 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 9 }}>
          {remaining.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: "var(--surface-2)", border: "1px dashed var(--border-strong)", color: "var(--text-muted)", fontSize: 12.5, cursor: "pointer" }}>
              <Check size={11} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="t-micro" style={{ marginBottom: 8 }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function Sum({ k, children }: { k: string; children: ReactNode }) {
  return (
    <li style={{ display: "flex", gap: 12 }}>
      <span style={{ width: 96, flexShrink: 0, color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", paddingTop: 1 }}>{k}</span>
      <span style={{ color: "var(--text)", minWidth: 0 }}>{children}</span>
    </li>
  );
}

const cardStack: CSSProperties = { display: "flex", flexDirection: "column", gap: 14 };
const cardBox: CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 };
const sumList: CSSProperties = { margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7, fontSize: 13 };
const inp: CSSProperties = { width: "100%", height: 42, padding: "0 13px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-sans)" };

function chip(on: boolean): CSSProperties {
  return { padding: "10px 16px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: on ? 600 : 400, border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, background: on ? "color-mix(in srgb, var(--accent) 10%, var(--surface))" : "var(--surface)", color: on ? "var(--accent)" : "var(--text)" };
}

function navBtn(primary: boolean, disabled = false): CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "0 20px", height: 44, borderRadius: 999,
    fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
    border: primary ? "none" : "1px solid var(--border-strong)",
    background: primary ? "var(--accent)" : "transparent",
    color: primary ? "var(--accent-ink)" : "var(--text)",
  };
}
