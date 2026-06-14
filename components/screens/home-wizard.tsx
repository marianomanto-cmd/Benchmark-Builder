"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, ArrowRight, ArrowLeft, X, Check, Wand2, Loader2, Newspaper, Globe } from "lucide-react";
import { suggestFor, assistFor, detectCategory } from "@/lib/discovery/suggest";
import { PlatformBadge } from "@/components/domain";
import { useI18n } from "@/components/i18n-provider";
import { useSession } from "@/components/session-provider";
import type { TFn } from "@/lib/i18n";
import type { PlatformKey } from "@/lib/platforms";

const STEP_KEYS = ["wizard.step.brand", "wizard.step.competition", "wizard.step.scope", "wizard.step.confirm"];

// Per-source cost model (USD) — rough but realistic so the estimate is useful.
const NET_COST = 0.16; // avg scraping cost per network · per competitor
const PAID: { key: PlatformKey; perComp: number }[] = [
  { key: "meta_ads", perComp: 0.2 },
  { key: "google_ads", perComp: 0.18 },
  { key: "linkedin_ads", perComp: 0.14 },
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

// Investment values are canonical (stored in the plan); only "No pauto" is localized.
const INVEST = ["No pauto", "< US$1k", "US$1–5k", "US$5–20k", "US$20k+"];
const PERIODS = ["30 días", "60 días", "90 días", "YTD"];
const PERIOD_KEY: Record<string, string> = { "30 días": "wizard.period.30", "60 días": "wizard.period.60", "90 días": "wizard.period.90", YTD: "wizard.period.ytd" };

export function HomeWizard({ initialQuery, onClose }: { initialQuery: string; onClose: () => void }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { signIn } = useSession();
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

  // Wizard assistant: instant inline guidance + mention-style bubbles on "Siguiente".
  const snapshot = useMemo(
    () => ({ brand, brandDesc, igUrl, problem, geo, competitors, discards }),
    [brand, brandDesc, igUrl, problem, geo, competitors, discards],
  );
  const assist = assistFor(step, snapshot, locale);
  const [checking, setChecking] = useState(false);
  // Assistant recommendations as mention-style bubbles anchored to fields.
  const [hints, setHints] = useState<{ step: number; items: { field: string; text: string }[] } | null>(null);
  const hintFor = (field: string) => (hints && hints.step === step ? hints.items.find((h) => h.field === field)?.text : undefined);

  function toggleNet(key: string) {
    setNetworks((ns) => (ns.includes(key) ? ns.filter((k) => k !== key) : [...ns, key]));
  }
  const netLabel = (n: { key: string; label: string }) => (n.key === "portales" ? t("wizard.net.portals") : n.key === "web" ? t("wizard.net.web") : n.label);
  const investLabel = (v: string) => (v === "No pauto" ? t("wizard.invest.none") : v);

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

  const periodLabelOf = (p: string) => (p === "custom" ? t("wizard.period.custom") : t(PERIOD_KEY[p] ?? p));
  const periodLabel = period === "custom" ? (customFrom && customTo ? `${customFrom} → ${customTo}` : t("wizard.period.customLabel")) : periodLabelOf(period);

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
      if (json.ok) { signIn(); router.push("/overview"); } // first report → account created
      else { setError(json.error ?? "Error"); setRunning(false); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setRunning(false);
    }
  }

  const canNext =
    step === 0 ? Boolean(brand.trim() && problem.trim()) :
    step === 1 ? geo.length > 0 && competitors.length > 0 :
    step === 2 ? networks.length > 0 :
    true;

  function advance() {
    setHints(null);
    setStep((s) => s + 1);
  }

  // First "Siguiente": the assistant pops mention-style bubbles with
  // recommendations anchored to the relevant fields (built from what's loaded so
  // far). If the user ignores them and clicks again, advance.
  async function onNext() {
    if (!canNext || checking) return;
    if (hints && hints.step === step) { advance(); return; }
    setChecking(true);
    try {
      const res = await fetch("/api/wizard/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, state: snapshot, locale }),
      });
      const json = (await res.json()) as { recommendations?: { field: string; text: string }[] };
      const items = Array.isArray(json.recommendations) ? json.recommendations : [];
      if (items.length) setHints({ step, items });
      else advance();
    } catch {
      advance();
    } finally {
      setChecking(false);
    }
  }

  const scopeStr = scope === "both" ? t("wizard.scopeBoth") : t("wizard.scopeOrg");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 70, background: "color-mix(in srgb, var(--bg) 80%, transparent)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", overflowY: "auto" }}
    >
      {/* ambient glow */}
      <motion.div aria-hidden animate={{ opacity: 0.4 + step * 0.1 }} transition={{ duration: 0.7, ease: "easeOut" }} style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(72% 56% at 50% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 72%)" }} />
      <motion.div key={`pulse-${step}`} aria-hidden initial={{ opacity: 0.5, scale: 0.85 }} animate={{ opacity: 0, scale: 1.25 }} transition={{ duration: 1.0, ease: "easeOut" }} style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(50% 42% at 50% 10%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 70%)" }} />
      <div style={{ position: "relative", maxWidth: 680, margin: "0 auto", padding: "clamp(16px, 4vw, 28px) clamp(16px, 5vw, 24px) 64px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.jpg" alt="" width={22} height={22} className="bb-logo" style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} /> Phatia
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} aria-label={t("wizard.close")} style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {/* progress — 1·2·3 + confirm */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {STEP_KEYS.map((key, i) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 7, flex: "1 1 0", minWidth: 0 }}>
              <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-mono)", background: i <= step ? "var(--accent)" : "var(--surface-2)", color: i <= step ? "var(--accent-ink)" : "var(--text-muted)", border: i <= step ? "none" : "1px solid var(--border)" }}>{i < step ? "✓" : i + 1}</span>
              <span className="bb-hide-sm" style={{ fontSize: 11.5, fontWeight: i === step ? 600 : 400, color: i === step ? "var(--text)" : "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t(key)}</span>
            </div>
          ))}
        </div>

        {/* title */}
        <h1 className="t-section" style={{ fontSize: "clamp(1.5rem, 4vw, 2.1rem)", marginBottom: 2 }}>
          {step === 0 && <>{t("wizard.t0a")}<em style={emItalic}>{t("wizard.t0em")}</em></>}
          {step === 1 && <>{t("wizard.t1a")}<em style={emItalic}>{t("wizard.t1em")}</em>{t("wizard.t1b")}</>}
          {step === 2 && <>{t("wizard.t2a")}<em style={emItalic}>{t("wizard.t2em")}</em>{t("wizard.t2b")}</>}
          {step === 3 && <>{t("wizard.t3a")}<em style={emItalic}>{t("wizard.t3em")}</em></>}
        </h1>

        {/* assist line */}
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
                  <Field label={t("wizard.f.brand")} hint={hintFor("brand")}><input style={inp} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t("wizard.p.brand")} /></Field>
                  <Field label={t("wizard.f.site")}><input style={inp} value={site} onChange={(e) => setSite(e.target.value)} placeholder={t("wizard.p.site")} /></Field>
                </div>
                <Field label={t("wizard.f.desc")} hint={hintFor("desc")}><input style={inp} value={brandDesc} onChange={(e) => setBrandDesc(e.target.value)} placeholder={t("wizard.p.desc")} /></Field>
                <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label={t("wizard.f.ig")} hint={hintFor("ig")}><input style={inp} value={igUrl} onChange={(e) => setIgUrl(e.target.value)} placeholder={t("wizard.p.ig")} /></Field>
                  <Field label={t("wizard.f.other")}><input style={inp} value={otherSocial} onChange={(e) => setOtherSocial(e.target.value)} placeholder={t("wizard.p.other")} /></Field>
                </div>
                <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label={t("wizard.f.investOrg")}><select style={inp} value={investOrg} onChange={(e) => setInvestOrg(e.target.value)}>{INVEST.map((x) => <option key={x} value={x}>{investLabel(x)}</option>)}</select></Field>
                  <Field label={t("wizard.f.investPaid")}><select style={inp} value={investPaid} onChange={(e) => setInvestPaid(e.target.value)}>{INVEST.map((x) => <option key={x} value={x}>{investLabel(x)}</option>)}</select></Field>
                </div>
                <Field label={t("wizard.f.problem")} hint={hintFor("problem")}>
                  <textarea style={{ ...inp, height: "auto", minHeight: 74, padding: "10px 14px", resize: "vertical", lineHeight: "20px" }} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder={t("wizard.p.problem")} />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div style={cardStack}>
                <ChipGroup t={t} title={t("wizard.sec.markets")} hint={hintFor("markets")} value={geo} onChange={setGeo} placeholder={t("wizard.chip.market")} onSuggest={() => suggest("geo", setGeo, geo)} suggestions={suggestFor("geo", ctx)} />
                <ChipGroup t={t} title={t("wizard.sec.competitors")} hint={hintFor("competitors")} value={competitors} onChange={setCompetitors} placeholder={t("wizard.chip.competitor")} onSuggest={() => suggest("competitors", setCompetitors, competitors)} suggestions={suggestFor("competitors", ctx)} />
                <ChipGroup t={t} title={t("wizard.sec.discards")} hint={hintFor("discards")} value={discards} onChange={setDiscards} placeholder={t("wizard.chip.discard")} onSuggest={() => suggest("discards", setDiscards, discards)} suggestions={suggestFor("discards", ctx)} />
              </div>
            )}

            {step === 2 && (
              <div style={cardStack}>
                {/* scope */}
                <div>
                  <SectionLabel>{t("wizard.sec.scope")}</SectionLabel>
                  <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([["organic", t("wizard.scope.org"), t("wizard.scope.orgDesc")], ["both", t("wizard.scope.both"), t("wizard.scope.bothDesc")]] as [("organic" | "both"), string, string][]).map(([val, label, desc]) => {
                      const on = scope === val;
                      return (
                        <button key={val} type="button" onClick={() => setScope(val)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, background: on ? "color-mix(in srgb, var(--accent) 10%, var(--surface))" : "var(--surface)" }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: on ? "var(--accent)" : "var(--text)" }}>{label}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>{desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {hintFor("scope") && <Bubble text={hintFor("scope")!} />}

                {/* networks */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <SectionLabel>{t("wizard.sec.networks")}</SectionLabel>
                    <button type="button" onClick={() => setNetworks(networks.length === ALL_NET.length ? [] : ALL_NET)} style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
                      {networks.length === ALL_NET.length ? t("wizard.net.none") : t("wizard.net.all")}
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
                          <span style={{ fontSize: 12.5, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{netLabel(n)}</span>
                          <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1px solid var(--border-strong)", color: "var(--accent-ink)" }}>{on && <Check size={11} />}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {hintFor("networks") && <Bubble text={hintFor("networks")!} />}

                {/* time window */}
                <div>
                  <SectionLabel>{t("wizard.sec.window")}</SectionLabel>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {PERIODS.map((p) => (
                      <button key={p} type="button" onClick={() => setPeriod(p)} style={chip(period === p)}>{periodLabelOf(p)}</button>
                    ))}
                    <button type="button" onClick={() => setPeriod("custom")} style={chip(period === "custom")}>{t("wizard.period.custom")}</button>
                  </div>
                  {period === "custom" && (
                    <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                      <Field label={t("wizard.date.from")}><input type="date" max={customTo || undefined} style={inp} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></Field>
                      <Field label={t("wizard.date.to")}><input type="date" min={customFrom || undefined} style={inp} value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></Field>
                    </div>
                  )}
                </div>

                {hintFor("window") && <Bubble text={hintFor("window")!} />}
              </div>
            )}

            {step === 3 && (
              <div style={cardStack}>
                {/* framing — the case study */}
                <div style={{ ...cardBox, borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))" }}>
                  <div className="t-micro" style={{ color: "var(--accent)" }}>{t("wizard.caseStudy")}</div>
                  <div className="t-serif" style={{ fontSize: "clamp(1.1rem, 3vw, 1.45rem)", lineHeight: 1.3, marginTop: 8, color: "var(--text)" }}>
                    {t("wizard.fr.invest")} <em style={emItalic}>{detectCategory(ctx)}</em> {t("wizard.fr.in")} {geo.join(", ") || "—"}, {t("wizard.fr.comparing")} <b>{brand || t("wizard.brandFallback")}</b> {t("wizard.fr.vs")} {competitors.length ? competitors.join(", ") : t("wizard.compFallback")}, {t("wizard.fr.scopeWord")} {scopeStr}, {t("wizard.fr.during")} {periodLabel}.
                  </div>
                </div>

                {/* brief */}
                <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={cardBox}>
                    <div className="t-micro">{t("wizard.cardYourBrand")}</div>
                    <ul style={sumList}>
                      <Sum k={t("wizard.sum.brand")}>{brand || "—"}</Sum>
                      <Sum k={t("wizard.sum.does")}>{brandDesc || "—"}</Sum>
                      <Sum k={t("wizard.sum.webIg")}>{[site, igUrl].filter(Boolean).join(" · ") || "—"}</Sum>
                      <Sum k={t("wizard.sum.invest")}>{t("wizard.iorg")} {investLabel(investOrg)} · {t("wizard.ipaid")} {investLabel(investPaid)}</Sum>
                    </ul>
                  </div>
                  <div style={cardBox}>
                    <div className="t-micro">{t("wizard.cardFrame")}</div>
                    <ul style={sumList}>
                      <Sum k={t("wizard.sum.markets")}>{geo.join(", ") || "—"}</Sum>
                      <Sum k={t("wizard.sum.competitors")}>{competitors.join(", ") || "—"}</Sum>
                      <Sum k={t("wizard.sum.scope")}>{scopeStr}</Sum>
                      <Sum k={t("wizard.sum.networks")}>{networks.map((k) => netLabel(NETWORKS.find((n) => n.key === k) ?? { key: k, label: k })).join(", ") || "—"}</Sum>
                      <Sum k={t("wizard.sum.discards")}>{discards.join(", ") || t("wizard.none")}</Sum>
                      <Sum k={t("wizard.sum.window")}>{periodLabel}</Sum>
                    </ul>
                  </div>
                </div>

                {/* cost */}
                <div style={{ ...cardBox, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
                  <div>
                    <div className="t-micro" style={{ color: "var(--accent)" }}>{t("wizard.cost.title")}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 600, marginTop: 4 }}>US${estimate.total.toFixed(2)}</div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginTop: 2 }}>{t("wizard.cost.range", { low: estimate.low.toFixed(2), high: estimate.high.toFixed(2), min: estimate.minutes, comps: estimate.comps })}</div>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textAlign: "right", lineHeight: "18px" }}>
                    {t("wizard.cost.scraping")} US${estimate.scraping.toFixed(2)}<br />{t("wizard.cost.analysis")} US${estimate.ai.toFixed(2)}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{t("wizard.cost.note")}</div>
                {error && <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
          <button type="button" onClick={() => { if (step === 0) { onClose(); } else { setHints(null); setStep((s) => s - 1); } }} style={navBtn(false)}>
            <ArrowLeft size={15} /> {step === 0 ? t("wizard.btn.exit") : t("wizard.btn.back")}
          </button>
          <div style={{ flex: 1 }} />
          {step < STEP_KEYS.length - 1 ? (
            <button type="button" disabled={!canNext || checking} onClick={onNext} style={navBtn(true, !canNext || checking)}>
              {checking ? <><Loader2 size={15} className="bb-spin" /> {t("wizard.btn.checking")}</> : <>{t("wizard.btn.next")} <ArrowRight size={15} /></>}
            </button>
          ) : (
            <button type="button" disabled={running} onClick={execute} style={navBtn(true, running)}>
              {running ? <><Loader2 size={15} className="bb-spin" /> {t("wizard.btn.running")}</> : <><Sparkles size={15} /> {t("wizard.btn.approve")}</>}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Mention-style speech bubble that "pops out" of a field with a recommendation.
function Bubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      style={{ position: "relative", marginTop: 9, display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 12px", borderRadius: 12, background: "color-mix(in srgb, var(--accent) 10%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))", boxShadow: "var(--sh-2)" }}
    >
      <span style={{ position: "absolute", top: -6, left: 18, width: 11, height: 11, background: "color-mix(in srgb, var(--accent) 10%, var(--surface))", borderLeft: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))", borderTop: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))", transform: "rotate(45deg)" }} />
      <span style={{ flexShrink: 0, color: "var(--accent)", marginTop: 1 }}><Sparkles size={13} /></span>
      <span style={{ fontSize: 12.5, lineHeight: "17px", color: "var(--text)" }}>{text}</span>
    </motion.div>
  );
}

function ChipGroup({ t, title, hint, value, onChange, placeholder, onSuggest, suggestions }: { t: TFn; title: string; hint?: string; value: string[]; onChange: (v: string[]) => void; placeholder: string; onSuggest: () => void; suggestions: string[] }) {
  const [draft, setDraft] = useState("");
  function add(v: string) { const x = v.trim(); if (x && !value.includes(x)) onChange([...value, x]); setDraft(""); }
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
          <Wand2 size={14} /> {t("wizard.chip.suggest")}
        </button>
      </div>
      {value.length > 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 9 }}>
          {value.map((v) => (
            <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px 5px 11px", borderRadius: 999, background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", border: "1px solid var(--accent)", color: "var(--text)", fontSize: 12.5 }}>
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`✕ ${v}`} style={{ display: "inline-flex", border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer", padding: 0 }}><X size={12} /></button>
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
      {hint && <Bubble text={hint} />}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="t-micro" style={{ marginBottom: 8 }}>{children}</div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label style={{ display: "block" }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
        {children}
      </label>
      {hint && <Bubble text={hint} />}
    </div>
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

const emItalic: CSSProperties = { fontStyle: "italic", color: "var(--accent)" };
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
