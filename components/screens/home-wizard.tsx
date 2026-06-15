"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles, ArrowRight, ArrowLeft, X, Check, Loader2, Newspaper, Globe } from "lucide-react";
import { suggestFor, detectCategory } from "@/lib/discovery/suggest";
import { PlatformBadge } from "@/components/domain";
import { useI18n } from "@/components/i18n-provider";
import { useSession } from "@/components/session-provider";
import { SubscriptionModal } from "@/components/screens/subscription-modal";
import { useCredits } from "@/lib/credits/store";
import { REPORT_COST } from "@/lib/credits/config";
import type { TFn } from "@/lib/i18n";
import type { PlatformKey } from "@/lib/platforms";

const STEP_KEYS = ["wizard.step.brand", "wizard.step.competition", "wizard.step.scope", "wizard.step.confirm"];

// Networks (default: all on). `portales`/`web` feed the web source.
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
const PAID_KEYS: PlatformKey[] = ["meta_ads", "google_ads", "linkedin_ads"];

const INVEST = ["No pauto", "< US$1k", "US$1–5k", "US$5–20k", "US$20k+"];
const PERIODS = ["30 días", "60 días", "90 días", "YTD"];
const PERIOD_KEY: Record<string, string> = { "30 días": "wizard.period.30", "60 días": "wizard.period.60", "90 días": "wizard.period.90", YTD: "wizard.period.ytd" };

const easeOut = [0.7, 0.02, 0.2, 1] as const;
const popEase = [0.34, 1.56, 0.64, 1] as const;

export function HomeWizard({ initialQuery, onClose }: { initialQuery: string; onClose: () => void }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { signIn, user } = useSession();
  const { balance, spend } = useCredits();
  const [step, setStep] = useState(0);
  const [showSub, setShowSub] = useState(false);

  // Step 0 — brand
  const [brand, setBrand] = useState("");
  const [brandDesc, setBrandDesc] = useState("");
  const [site, setSite] = useState("");
  const [igUrl, setIgUrl] = useState("");
  const [otherSocial, setOtherSocial] = useState("");
  const [investOrg, setInvestOrg] = useState(INVEST[2]);
  const [investPaid, setInvestPaid] = useState(INVEST[2]);
  const [problem, setProblem] = useState(initialQuery);
  // Step 1 — chips
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

  // Wizard assistant (Haiku in live / heuristic in mock, via /api/wizard/assist):
  // on the first "Siguiente" of a step, mention-style bubbles pop out of the
  // relevant fields with context-aware recommendations; a second click advances.
  const [hints, setHints] = useState<{ step: number; items: { field: string; text: string }[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const snapshot = useMemo(
    () => ({ brand, brandDesc, igUrl, problem, geo, competitors, discards }),
    [brand, brandDesc, igUrl, problem, geo, competitors, discards],
  );
  const hintFor = (field: string) => (hints && hints.step === step ? hints.items.find((h) => h.field === field)?.text : undefined);

  const ctx = useMemo(() => `${brand} ${brandDesc} ${problem}`, [brand, brandDesc, problem]);
  const investLabel = (v: string) => (v === "No pauto" ? t("wizard.invest.none") : v);
  const netLabel = (n: { key: string; label: string }) => (n.key === "portales" ? t("wizard.net.portals") : n.key === "web" ? t("wizard.net.web") : n.label);
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
    return scope === "both" ? [...arr, ...PAID_KEYS] : arr;
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
  const scopeLabel = scope === "both" ? t("wizard.scope.both") : t("wizard.scope.org");

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
      if (json.ok) { signIn(); router.push("/overview"); }
      else { setError(json.error ?? "Error"); setRunning(false); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setRunning(false);
    }
  }

  // Logged-in with credits → spend & run; everyone else → subscription modal.
  function onLaunch() {
    if (!user || balance < REPORT_COST) { setShowSub(true); return; }
    spend(REPORT_COST);
    execute();
  }

  const canNext =
    step === 0 ? Boolean(brand.trim() && problem.trim()) :
    step === 1 ? geo.length > 0 && competitors.length > 0 :
    step === 2 ? networks.length > 0 :
    true;
  const last = step === STEP_KEYS.length - 1;

  function advance() { setHints(null); setStep((s) => s + 1); }

  // First "Siguiente": fetch assistant recommendations and show them as bubbles.
  // If they're already showing (or none come back), advance.
  async function onNext() {
    if (last) { onLaunch(); return; }
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 70, background: "color-mix(in srgb, var(--bg) 78%, transparent)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(16px, 5vh, 56px) 16px" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: easeOut }}
        style={{ position: "relative", width: "min(920px, 100%)", borderRadius: 18, border: "1px solid var(--border-strong)", background: "linear-gradient(155deg, #1b0f1b 0%, #110b15 55%, #0c0810 100%)", boxShadow: "0 40px 100px rgba(0,0,0,0.6)", overflow: "hidden" }}
      >
        {/* accent glow */}
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(120% 75% at 0% 0%, color-mix(in srgb, var(--accent) 13%, transparent), transparent 58%)" }} />

        <div style={{ position: "relative" }}>
          {/* top */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 22px 14px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle at 32% 30%, #ff89a3, #f23a5e 42%, #6b1a36)", boxShadow: "0 0 10px color-mix(in srgb, var(--accent) 50%, transparent)" }} /> Phatia
            </span>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={onClose} aria-label={t("wizard.close")} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={15} />
            </button>
          </div>

          {/* stepper */}
          <Stepper step={step} t={t} />

          {/* split: form + live brief */}
          <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 330px" }}>
            <div style={{ padding: "8px 24px 0" }}>
              {step === 0 && (
                <Step title={<>{t("wizard.qt0a")}<em style={em}>{t("wizard.qt0em")}</em></>}>
                  <div className="bb-collapse" style={twoCol}>
                    <Field label={t("wizard.f.brand")} hint={hintFor("brand")}><input style={inp} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t("wizard.p.brand")} /></Field>
                    <Field label={t("wizard.f.site")}><input style={inp} value={site} onChange={(e) => setSite(e.target.value)} placeholder={t("wizard.p.site")} /></Field>
                  </div>
                  <Field label={t("wizard.f.desc")} hint={hintFor("desc")}><input style={inp} value={brandDesc} onChange={(e) => setBrandDesc(e.target.value)} placeholder={t("wizard.p.desc")} /></Field>
                  <div className="bb-collapse" style={twoCol}>
                    <Field label={t("wizard.f.ig")} hint={hintFor("ig")}><input style={inp} value={igUrl} onChange={(e) => setIgUrl(e.target.value)} placeholder={t("wizard.p.ig")} /></Field>
                    <Field label={t("wizard.f.other")}><input style={inp} value={otherSocial} onChange={(e) => setOtherSocial(e.target.value)} placeholder={t("wizard.p.other")} /></Field>
                  </div>
                  <div className="bb-collapse" style={twoCol}>
                    <Field label={t("wizard.f.investOrg")}><select style={inp} value={investOrg} onChange={(e) => setInvestOrg(e.target.value)}>{INVEST.map((x) => <option key={x} value={x}>{investLabel(x)}</option>)}</select></Field>
                    <Field label={t("wizard.f.investPaid")}><select style={inp} value={investPaid} onChange={(e) => setInvestPaid(e.target.value)}>{INVEST.map((x) => <option key={x} value={x}>{investLabel(x)}</option>)}</select></Field>
                  </div>
                  <Field label={t("wizard.f.problem")} hint={hintFor("problem")}><textarea style={{ ...inp, height: "auto", minHeight: 70, padding: "10px 13px", resize: "vertical", lineHeight: "20px" }} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder={t("wizard.p.problem")} /></Field>
                </Step>
              )}

              {step === 1 && (
                <Step title={<>{t("wizard.qt1a")}<em style={em}>{t("wizard.qt1em")}</em>{t("wizard.qt1b")}</>}>
                  <SugField t={t} label={t("wizard.sec.markets")} placeholder={t("wizard.chip.market")} value={geo} onChange={setGeo} suggestions={suggestFor("geo", ctx)} hint={hintFor("markets")} />
                  <SugField t={t} label={t("wizard.sec.competitors")} placeholder={t("wizard.chip.competitor")} value={competitors} onChange={setCompetitors} suggestions={suggestFor("competitors", ctx)} hint={hintFor("competitors")} />
                  <SugField t={t} label={t("wizard.sec.discards")} placeholder={t("wizard.chip.discard")} value={discards} onChange={setDiscards} suggestions={suggestFor("discards", ctx)} hint={hintFor("discards")} />
                  <p style={{ fontSize: 13, lineHeight: "19px", color: "var(--text-muted)", marginTop: 14 }}>{t("wizard.sugHelp")}</p>
                </Step>
              )}

              {step === 2 && (
                <Step title={<>{t("wizard.qt2a")}<em style={em}>{t("wizard.qt2em")}</em>{t("wizard.qt2b")}</>}>
                  <SectionLabel>{t("wizard.sec.scope")}</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {([["organic", t("wizard.scope.org"), t("wizard.scope.orgDesc")], ["both", t("wizard.scope.both"), t("wizard.scope.bothDesc")]] as [("organic" | "both"), string, string][]).map(([val, label, desc]) => {
                      const on = scope === val;
                      return (
                        <button key={val} type="button" onClick={() => setScope(val)} style={{ textAlign: "left", padding: "11px 13px", borderRadius: 10, cursor: "pointer", border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`, background: on ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "var(--surface)" }}>
                          <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{label}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.35 }}>{desc}</div>
                        </button>
                      );
                    })}
                  </div>

                  {hintFor("scope") && <Bubble text={hintFor("scope")!} />}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8, marginTop: 16 }}>
                    <SectionLabel noMargin>{t("wizard.sec.networks")}</SectionLabel>
                    <button type="button" onClick={() => setNetworks(networks.length === ALL_NET.length ? [] : ALL_NET)} style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
                      {networks.length === ALL_NET.length ? t("wizard.net.none") : t("wizard.net.all")}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9 }} className="bb-collapse">
                    {NETWORKS.map((n) => {
                      const on = networks.includes(n.key);
                      return (
                        <button key={n.key} type="button" onClick={() => toggleNet(n.key)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 9, cursor: "pointer", textAlign: "left", border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`, background: on ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "var(--surface)" }}>
                          {n.platform ? <PlatformBadge platform={n.platform} size="sm" /> : <span style={{ width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexShrink: 0 }}>{n.key === "portales" ? <Newspaper size={14} /> : <Globe size={14} />}</span>}
                          <span style={{ fontSize: 12.5, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{netLabel(n)}</span>
                          <span style={{ width: 15, height: 15, flexShrink: 0, borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1px solid var(--border-strong)", color: "#fff" }}>{on && <Check size={10} />}</span>
                        </button>
                      );
                    })}
                  </div>

                  {hintFor("networks") && <Bubble text={hintFor("networks")!} />}

                  <SectionLabel style={{ marginTop: 16 }}>{t("wizard.sec.window")}</SectionLabel>
                  <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 2, padding: 3, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}>
                    {[...PERIODS, "custom"].map((p) => {
                      const on = period === p;
                      return (
                        <button key={p} type="button" onClick={() => setPeriod(p)} style={{ border: "none", background: on ? "var(--surface)" : "transparent", color: on ? "var(--accent)" : "var(--text-muted)", fontSize: 13, padding: "7px 14px", borderRadius: 7, cursor: "pointer", boxShadow: on ? "var(--sh-1)" : "none", fontFamily: "var(--font-sans)" }}>{periodLabelOf(p)}</button>
                      );
                    })}
                  </div>
                  {period === "custom" && (
                    <div className="bb-collapse" style={{ ...twoCol, marginTop: 12 }}>
                      <Field label={t("wizard.date.from")}><input type="date" max={customTo || undefined} style={inp} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></Field>
                      <Field label={t("wizard.date.to")}><input type="date" min={customFrom || undefined} style={inp} value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></Field>
                    </div>
                  )}
                  {hintFor("window") && <Bubble text={hintFor("window")!} />}
                </Step>
              )}

              {step === 3 && (
                <Step title={<>{t("wizard.qt3a")}<em style={em}>{t("wizard.qt3em")}</em></>}>
                  <p style={{ fontSize: 13, lineHeight: "19px", color: "var(--text-muted)", marginTop: 2 }}>{t("wizard.confirmHelp")}</p>
                  <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 12, background: "color-mix(in srgb, var(--surface) 50%, transparent)", padding: 16 }}>
                    <div style={{ ...lbl, color: "var(--accent)", marginBottom: 7 }}>{t("wizard.confirmDoLabel")}</div>
                    <p style={{ fontSize: 13.5, lineHeight: "20px", color: "var(--text)", margin: 0 }}>
                      {t("wizard.confirmRecap", { brand, competitors: competitors.join(", "), markets: geo.join(", "), sources: networks.length, window: periodLabel })}
                    </p>
                    <div style={{ ...lbl, color: "var(--accent)", margin: "16px 0 8px" }}>{t("wizard.confirmGetLabel")}</div>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 14px" }}>
                      {["deliv.r0n", "deliv.r1n", "deliv.r2n", "deliv.r3n"].map((k) => (
                        <li key={k} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--text)", alignItems: "baseline" }}>
                          <span style={{ color: "var(--accent)", flexShrink: 0 }}>›</span> {t(k)}
                        </li>
                      ))}
                    </ul>
                    <p style={{ fontSize: 12.5, lineHeight: "18px", color: "var(--text-muted)", margin: "14px 0 0", paddingTop: 12, borderTop: "1px solid var(--border)" }}>{t("wizard.confirmValue")}</p>
                  </div>
                  {error && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 12 }}>{error}</div>}
                </Step>
              )}
            </div>

            {/* live brief */}
            <div style={{ background: "linear-gradient(180deg, color-mix(in srgb, #000 22%, transparent), color-mix(in srgb, #000 32%, transparent))", borderLeft: "1px solid var(--border)", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
                <motion.span animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }} /> {t("wizard.brief.live")}
              </div>

              <BriefSec label={t("wizard.brief.brand")}>
                {brand ? <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontStyle: "italic", color: "var(--text)", lineHeight: 1.2 }}>{brand}</div> : <Empty>{t("wizard.brief.empty")}</Empty>}
              </BriefSec>
              <BriefSec label={t("wizard.brief.does")}>
                {brandDesc ? <div style={briefLine}>{brandDesc}</div> : <Empty>—</Empty>}
              </BriefSec>
              <BriefChips label={t("wizard.brief.markets")} items={geo} />
              <BriefChips label={t("wizard.brief.competitors")} items={competitors} />
              <BriefChips label={t("wizard.brief.discards")} items={discards} />
              <BriefSec label={t("wizard.brief.invest")}>
                <div style={briefLine}>{t("wizard.iorg")} {investLabel(investOrg)} · {t("wizard.ipaid")} {investLabel(investPaid)}</div>
              </BriefSec>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <BriefSec label={t("wizard.brief.scopeWin")} noMargin>
                  <div style={briefLine}>{scopeLabel} · {networks.length} {t("wizard.brief.sources")} · {periodLabel}</div>
                </BriefSec>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <BriefSec label={t("wizard.brief.cost")} noMargin>
                  {user ? (
                    <div style={briefLine}>
                      <b style={{ color: "var(--text)" }}>{REPORT_COST} {t("credits.unit")}</b> · {t("wizard.credits.balance")} {balance.toLocaleString()}{" "}
                      {balance >= REPORT_COST ? <span style={{ color: "var(--text-faint)" }}>· {t("wizard.credits.after", { n: (balance - REPORT_COST).toLocaleString() })}</span> : <span style={{ color: "var(--accent)" }}>· {t("wizard.credits.insufficient")}</span>}
                    </div>
                  ) : (
                    <div style={briefLine}><b style={{ color: "var(--text)" }}>{REPORT_COST} {t("credits.unit")}</b> · {t("wizard.brief.pickPlan")}</div>
                  )}
                </BriefSec>
              </div>
            </div>
          </div>

          {/* foot */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 22px" }}>
            {step > 0 ? (
              <button type="button" onClick={() => { setHints(null); setStep((s) => s - 1); }} style={footBtn(false)}><ArrowLeft size={15} /> {t("wizard.btn.back")}</button>
            ) : <span />}
            <button type="button" disabled={(!canNext && !last) || running || checking} onClick={onNext} style={footBtn(true, (!canNext && !last) || running || checking)}>
              {last
                ? (running ? <><Loader2 size={15} className="bb-spin" /> {t("wizard.btn.running")}</> : <><Sparkles size={15} /> {t("wizard.btn.launch")}</>)
                : checking
                  ? <><Loader2 size={15} className="bb-spin" /> {t("wizard.btn.checking")}</>
                  : <>{t("wizard.btn.next")} <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      </motion.div>

      {showSub && <SubscriptionModal onClose={() => setShowSub(false)} />}
    </motion.div>
  );
}

// ============================================================ sub-components
function Stepper({ step, t }: { step: number; t: TFn }) {
  return (
    <div className="bb-scroll-x" style={{ display: "flex", alignItems: "center", padding: "0 22px 4px" }}>
      {STEP_KEYS.map((key, i) => {
        const done = i < step, active = i === step;
        return (
          <div key={key} style={{ display: "contents" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, whiteSpace: "nowrap", color: active ? "var(--text)" : "var(--text-faint)" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, border: done || active ? "1.5px solid var(--accent)" : "1.5px solid var(--border-strong)", background: done ? "var(--accent)" : "transparent", color: done ? "#fff" : active ? "var(--accent)" : "var(--text-faint)", boxShadow: active ? "0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)" : "none" }}>{done ? "✓" : i + 1}</span>
              <span className="bb-hide-sm">{t(key)}</span>
            </div>
            {i < STEP_KEYS.length - 1 && <span style={{ flex: 1, height: 1.5, minWidth: 14, margin: "0 9px", borderRadius: 2, background: i < step ? "var(--accent)" : "var(--border)" }} />}
          </div>
        );
      })}
    </div>
  );
}

function Step({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.32, ease: easeOut }}>
      <div style={{ padding: "16px 0 0", marginBottom: 14 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 27, fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0, color: "var(--text)" }}>{title}</h2>
      </div>
      {children}
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
      style={{ position: "relative", marginTop: 9, display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 12px", borderRadius: 12, background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))", boxShadow: "var(--sh-2)" }}
    >
      <span style={{ position: "absolute", top: -6, left: 18, width: 11, height: 11, background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", borderLeft: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))", borderTop: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))", transform: "rotate(45deg)" }} />
      <span style={{ flexShrink: 0, color: "var(--accent)", marginTop: 1 }}><Sparkles size={13} /></span>
      <span style={{ fontSize: 12.5, lineHeight: "17px", color: "var(--text)" }}>{text}</span>
    </motion.div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block" }}>
        <span style={lbl}>{label}</span>
        {children}
      </label>
      {hint && <Bubble text={hint} />}
    </div>
  );
}

function SectionLabel({ children, style, noMargin }: { children: ReactNode; style?: CSSProperties; noMargin?: boolean }) {
  return <div style={{ ...lbl, marginBottom: noMargin ? 0 : 8, ...style }}>{children}</div>;
}

function SugField({ t, label, placeholder, value, onChange, suggestions, hint }: { t: TFn; label: string; placeholder: string; value: string[]; onChange: (v: string[]) => void; suggestions: string[]; hint?: string }) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  function add(v: string) { const x = v.trim(); if (x && !value.includes(x)) onChange([...value, x]); setDraft(""); }
  function suggest() {
    setLoading(true);
    setTimeout(() => {
      const next = suggestions.filter((s) => !value.includes(s)).slice(0, 3);
      onChange([...value, ...next]);
      setLoading(false);
    }, 700);
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <span style={lbl}>{label}</span>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <input style={{ ...inp, flex: 1 }} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }} placeholder={placeholder} />
        <button type="button" onClick={suggest} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 14px", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--accent) 42%, var(--border))", background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
          {loading ? <Loader2 size={12} className="bb-spin" /> : <Sparkles size={12} />} {t("wizard.chip.suggest")}
        </button>
      </div>
      {value.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 9 }}>
          {value.map((v) => (
            <motion.span key={v} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ duration: 0.32, ease: popEase }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 999, border: "1px solid var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--text)", fontSize: 13 }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Check size={9} /></span>
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`✕ ${v}`} style={{ display: "inline-flex", border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer", padding: 0 }}><X size={12} /></button>
            </motion.span>
          ))}
        </div>
      )}
      {hint && <Bubble text={hint} />}
    </div>
  );
}

function BriefSec({ label, children, noMargin }: { label: string; children: ReactNode; noMargin?: boolean }) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : 16 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function BriefChips({ label, items }: { label: string; items: string[] }) {
  return (
    <BriefSec label={label}>
      {items.length === 0 ? (
        <Empty>—</Empty>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {items.map((v) => (
            <motion.span key={v} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ duration: 0.32, ease: popEase }} style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", padding: "3px 9px", borderRadius: 999, background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))", color: "var(--text)" }}>{v}</motion.span>
          ))}
        </div>
      )}
    </BriefSec>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-faint)" }}>{children}</div>;
}

const em: CSSProperties = { fontStyle: "italic", color: "var(--accent)" };
const twoCol: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const lbl: CSSProperties = { display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 7 };
const inp: CSSProperties = { width: "100%", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: 14, padding: "11px 13px", outline: "none" };
const briefLine: CSSProperties = { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 };

function footBtn(primary: boolean, disabled = false): CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 22px", borderRadius: 999,
    fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
    border: primary ? "none" : "1px solid var(--border-strong)",
    background: primary ? "var(--accent)" : "transparent",
    color: primary ? "var(--accent-ink)" : "var(--text)",
    fontFamily: "var(--font-sans)",
  };
}
