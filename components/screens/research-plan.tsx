"use client";

import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { PlatformBadge } from "@/components/domain";
import { RunButton } from "@/components/run-button";
import type { PlatformKey } from "@/lib/platforms";

const sources: [PlatformKey, string, string[], string, string][] = [
  ["instagram", "Instagram", ["avianca", "latamcol", "wingo.col", "arajetdom", "copaairlines"], "~840 piezas", "USD 0,42"],
  ["tiktok", "TikTok", ["avianca", "latamcol", "wingo.col"], "~412 piezas", "USD 0,28"],
  ["youtube", "YouTube", ["avianca", "latamcol", "wingo.col", "copaairlines"], "~180 piezas", "USD 0,18"],
  ["x", "X / Grok", ["avianca", "latamcol", "arajetdom", "copaairlines"], "~280 piezas", "USD 0,14"],
  ["reddit", "Reddit", ["r/Colombia", "r/ColombiaTravel", "r/Travel"], "~120 hilos", "USD 0,12"],
  ["web", "Web · prensa", ["eltiempo.com", "elespectador.com", "semana.com", "+8"], "~210 artículos", "USD 0,42"],
  ["meta_ads", "Meta Ad Library", ["avianca", "latamcol", "copaairlines"], "~84 creativos", "USD 0,28"],
];

function ParamRow({ k, v, pos }: { k: string; v: string; pos?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#fff", border: "1px solid var(--n200)", borderRadius: "var(--r-sm)" }}>
      <span style={{ fontSize: 11, color: "var(--n500)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".06em" }}>{k}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: pos ? "var(--success)" : "var(--n900)", fontFamily: "var(--font-mono)" }}>{v}</span>
    </div>
  );
}

export function ResearchPlan() {
  return (
    <ScreenShell breadcrumb={["Proyectos", "Cartagena · Q2 2026", "Plan de research"]} badges={<BBBadge tone="warn" size="sm">esperando aprobación</BBBadge>} runMeta="generado por IA · costo estimado USD 1,84">
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        <div>
          <div className="t-micro" style={{ color: "var(--sa-base)" }}>STEP 2 / 4 · PLAN PROPUESTO</div>
          <div className="t-h1" style={{ marginTop: 6 }}>Antes de gastar tokens, mostrámelo.</div>
          <div className="t-body" style={{ color: "var(--n600)", marginTop: 8, maxWidth: 540 }}>
            La IA propone qué scrapear, dónde y por qué. Vos editás las fuentes, ajustás filtros y aprobás antes del run.
          </div>

          <div style={{ marginTop: 20, background: "#fff", border: "1px solid var(--n200)", borderRadius: "var(--r-md)", padding: 18 }}>
            <div className="t-micro">FUENTES PROPUESTAS · 7 PLATAFORMAS</div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column" }}>
              {sources.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: i ? "1px solid var(--n100)" : "none" }}>
                  <span style={{ width: 18, height: 18, borderRadius: 3, border: "1px solid var(--sa-base)", background: "var(--sa-base)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}><Ic.check s={11} /></span>
                  <PlatformBadge platform={r[0]} size="md" />
                  <div style={{ flex: "0 0 130px", fontSize: 13, fontWeight: 500 }}>{r[1]}</div>
                  <div style={{ flex: 1, fontSize: 11, color: "var(--n500)", fontFamily: "var(--font-mono)" }}>{r[2].slice(0, 3).join(" · ")}{r[2].length > 3 ? ` +${r[2].length - 3}` : ""}</div>
                  <div style={{ flex: "0 0 90px", fontSize: 11, color: "var(--n700)", fontFamily: "var(--font-mono)" }}>{r[3]}</div>
                  <div style={{ flex: "0 0 70px", fontSize: 11, color: "var(--n900)", fontFamily: "var(--font-mono)", textAlign: "right", fontWeight: 500 }}>{r[4]}</div>
                  <Btn kind="ghost" size="sm" icon={<Ic.filter s={10} />}>Editar</Btn>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, paddingTop: 14, borderTop: "1px solid var(--n200)", display: "flex", alignItems: "center", gap: 14 }}>
              <span className="t-micro" style={{ color: "var(--n500)" }}>TOTAL ESTIMADO</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--n500)" }}>~2.126 piezas · 4 min 12 s</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--n900)" }}>USD 1,84</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff", border: "1px solid var(--n200)", borderRadius: "var(--r-md)", padding: 18 }}>
            <div className="t-micro">RAZONAMIENTO · IA</div>
            <div style={{ marginTop: 12, fontSize: 13, lineHeight: "21px", color: "var(--n700)", textWrap: "pretty" }}>
              <p style={{ margin: 0 }}>Para evaluar a Copa contra los principales operadores en la ruta <b>Cartagena</b>, propongo cubrir las plataformas donde concentran su volumen orgánico (Instagram, TikTok, YouTube), donde se discute la marca sin filtro (Reddit) y donde la inversión paga es decisiva en este vertical (Meta Ad Library).</p>
              <p style={{ marginTop: 10, marginBottom: 0 }}>Excluí <b>LinkedIn</b> y <b>Pinterest</b>: volumen marginal en aerolíneas latinoamericanas para audiencia de turismo. Si querés cubrir B2B, agregalas manualmente.</p>
            </div>
          </div>

          <div style={{ background: "var(--n50)", border: "1px solid var(--n200)", borderRadius: "var(--r-md)", padding: 18 }}>
            <div className="t-micro">PARÁMETROS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <ParamRow k="Período" v="60 días" />
              <ParamRow k="Idioma" v="es · en" />
              <ParamRow k="Geo" v="CO · PA · US" />
              <ParamRow k="Min. menciones" v="≥ 3" />
              <ParamRow k="Filtro spam" v="activado" pos />
              <ParamRow k="Análisis sentim." v="GPT-4o-mini" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="secondary" size="md">Editar plan</Btn>
            <div style={{ flex: 1 }} />
            <Btn kind="ghost" size="md">Cancelar</Btn>
            <RunButton slug="cartagena-q2-2026" />
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
