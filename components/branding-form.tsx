"use client";

import { useState, type ChangeEvent, type CSSProperties } from "react";
import { Lock, Check } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { SubscriptionModal } from "@/components/screens/subscription-modal";
import { DEFAULT_BRANDING, planAllowsWhiteLabel, type Branding } from "@/lib/branding";

// Agency white-label: logo, name, accent color + (plan-gated) hide the
// "Generado con Phatia" footer. Persists via /api/branding (service role). The
// preview applies the accent live by overriding --sa-base/--accent on a paper card.
export function BrandingForm({ initial }: { initial: Branding }) {
  const [brandName, setBrandName] = useState(initial.brandName === DEFAULT_BRANDING.brandName ? "" : initial.brandName);
  const [accent, setAccent] = useState(initial.accentHex || DEFAULT_BRANDING.accentHex);
  const [logo, setLogo] = useState(initial.logoUrl);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [hideFooter, setHideFooter] = useState(initial.hidePhatiaFooter);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showSub, setShowSub] = useState(false);
  const allowed = planAllowsWhiteLabel();
  const displayName = brandName.trim() || "Phatia";

  function onLogo(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { const url = String(r.result); setLogo(url); setLogoData(url); };
    r.readAsDataURL(f);
  }
  function toggleFooter() {
    if (!allowed) { setShowSub(true); return; }
    setHideFooter((v) => !v);
  }
  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/branding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandName: brandName.trim() || undefined, accentHex: accent, hidePhatiaFooter: hideFooter, logoDataUrl: logoData ?? undefined }) });
      const json = (await res.json()) as { ok: boolean };
      setMsg(json.ok ? "Marca guardada · se aplica al reporte, al link compartido y al PPTX." : "Guardado local — sin conexión a la nube (se aplicará al configurar Supabase).");
    } catch {
      setMsg("Guardado local — sin conexión a la nube.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ marginBottom: 26 }}>
      <div className="t-micro" style={{ color: "var(--accent)" }}>MARCA · WHITE-LABEL</div>
      <h2 className="t-h2" style={{ color: "var(--text)", marginTop: 4 }}>Tu marca en el entregable</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 16px", maxWidth: "60ch", lineHeight: 1.5 }}>Logo, nombre y color de acento de tu agencia. Se aplican al reporte (`/reporte`), al link compartido (`/r/…`) y al export PPTX.</p>

      <div className="bb-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        {/* form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "block" }}>
            <span style={lbl}>Nombre de marca</span>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tu agencia" style={inp} />
          </label>

          <div>
            <span style={lbl}>Color de acento</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 44, height: 36, padding: 0, border: "1px solid var(--border-strong)", borderRadius: 8, background: "none", cursor: "pointer" }} aria-label="Color de acento" />
              <input value={accent} onChange={(e) => setAccent(e.target.value)} style={{ ...inp, width: 120, fontFamily: "var(--font-mono)" }} />
            </div>
          </div>

          <div>
            <span style={lbl}>Logo</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" width={40} height={40} style={{ borderRadius: 8, objectFit: "cover", background: "var(--surface-2)", border: "1px solid var(--border)" }} />
              <label style={{ ...btnLike, cursor: "pointer" }}>
                Subir logo
                <input type="file" accept="image/*" onChange={onLogo} style={{ display: "none" }} />
              </label>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>PNG/JPG/SVG · cuadrado, ≤ 1 MB.</div>
          </div>

          <button type="button" onClick={toggleFooter} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", background: "var(--surface)", cursor: "pointer", textAlign: "left", minHeight: 44 }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `1px solid ${hideFooter ? "var(--accent)" : "var(--border-strong)"}`, background: hideFooter ? "var(--accent)" : "transparent", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{hideFooter && <Check size={11} />}</span>
            <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>Ocultar «Generado con Phatia»</span>
            {!allowed && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}><Lock size={11} /> Pro</span>}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Btn kind="accent" size="md" loading={saving} onClick={save}>Guardar marca</Btn>
            {msg && <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1, minWidth: 0 }}>{msg}</span>}
          </div>
        </div>

        {/* live preview (paper card; accent overridden via CSS vars) */}
        <div style={{ "--sa-base": accent, "--accent": accent } as CSSProperties}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-faint)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Vista previa</div>
          <div style={{ background: "#fff", border: "1px solid var(--n200)", borderRadius: 10, padding: 22, boxShadow: "var(--sh-2)", color: "var(--n900)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--n200)" }}>
              <span style={{ width: 5, height: 18, background: accent, borderRadius: 1 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" width={20} height={20} style={{ borderRadius: "50%", objectFit: "cover" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--n500)" }}>{displayName} · Cartagena Q2</span>
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "14px 0 8px" }}>Resumen ejecutivo</div>
            <div style={{ fontSize: 12, color: "var(--n700)", lineHeight: 1.5 }}>Avianca concentra el <b style={{ color: accent }}>41,3 %</b> del volumen; Copa lidera en engagement por pieza.</div>
            <div style={{ height: 6, background: "#f0ece6", borderRadius: 3, marginTop: 12 }}><div style={{ width: "62%", height: "100%", background: accent, borderRadius: 3 }} /></div>
            <div style={{ marginTop: 16, paddingTop: 10, borderTop: "1px solid var(--n200)", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--n400)", textTransform: "uppercase", letterSpacing: ".06em", textDecoration: hideFooter ? "line-through" : "none", opacity: hideFooter ? 0.4 : 1 }}>Generado con Phatia</div>
          </div>
        </div>
      </div>

      {showSub && <SubscriptionModal onClose={() => setShowSub(false)} />}
    </section>
  );
}

const lbl: CSSProperties = { display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 };
const inp: CSSProperties = { width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-sans)", outline: "none" };
const btnLike: CSSProperties = { display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontWeight: 500 };
