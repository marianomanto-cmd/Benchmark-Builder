"use client";

import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn, BBBadge } from "@/components/ui/primitives";
import { BBBarChart } from "@/components/ui/charts";

const outline: [string, number, boolean][] = [
  ["Portada", 1, false], ["Resumen ejecutivo", 2, false], ["Metodología", 3, false],
  ["Volumen y SOV", 4, true], ["Avianca", 5, false], ["LATAM", 6, false], ["Wingo", 7, false],
  ["Arajet", 8, false], ["Copa", 9, false], ["Galería · orgánico", 10, false], ["Galería · ads", 11, false],
  ["Insights", 12, false], ["Recomendaciones", 13, false], ["Anexo", 14, false],
];

function PropRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--surface-2)", borderRadius: "var(--r-sm)" }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{k}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{v} <Ic.arrowDown s={8} /></span>
    </div>
  );
}

export function Editor() {
  return (
    <ScreenShell breadcrumb={["Proyectos", "Cartagena · Q2 2026", "Reportes", "Cartagena Q2 · v3"]} badges={<BBBadge tone="info" size="sm">borrador</BBBadge>} runMeta="autoguardado hace 4 s">
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 280px", gap: 14, height: "100%" }}>
        {/* outline */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14, overflow: "auto" }}>
          <div className="t-micro">ÍNDICE · 14 PÁGINAS</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column" }}>
            {outline.map(([n, p, active]) => (
              <a key={n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: "var(--r-sm)", background: active ? "var(--surface-2)" : "transparent", borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent", fontSize: 12, color: active ? "var(--text)" : "var(--text-muted)", fontWeight: active ? 500 : 400 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", width: 18 }}>{String(p).padStart(2, "0")}</span>
                <span style={{ flex: 1 }}>{n}</span>
              </a>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8 }}>
              <Btn kind="ghost" size="sm" icon={<Ic.plus s={10} />}>Agregar sección</Btn>
            </div>
          </div>
        </div>

        {/* canvas */}
        <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 24, overflow: "auto" }}>
          <div style={{ width: 680, margin: "0 auto", background: "#fff", boxShadow: "var(--sh-3)", minHeight: "100%", padding: "56px 64px", position: "relative" }}>
            <div style={{ position: "absolute", top: 24, left: 24, right: 24, display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--n400)", fontFamily: "var(--font-mono)" }}>
              <span>BENCHMARK BUILDER · CARTAGENA Q2 2026</span>
              <span>04 / 14</span>
            </div>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--sa-base)", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }}>SECCIÓN 04</div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 42, lineHeight: "46px", fontWeight: 500, letterSpacing: "-0.025em", margin: "10px 0 18px", color: "var(--n900)", textWrap: "balance" }}>
              Volumen y share of voice
            </h1>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: "26px", color: "var(--n800)", textWrap: "pretty", margin: "0 0 18px" }}>
              Entre el 1 de marzo y el 30 de abril, las cinco aerolíneas analizadas produjeron <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>2.418</span> piezas relacionadas a Cartagena. <em>Avianca</em> concentra el <span style={{ background: "var(--sa-soft)", padding: "1px 6px", borderRadius: 3, fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--sa-strong)" }}>41,3 %</span> del volumen total, seguida por LATAM (24 %) y Wingo (12,9 %).
            </p>
            {/* embedded chart card with edit chrome */}
            <div style={{ position: "relative", border: "2px dashed var(--sa-base)", borderRadius: "var(--r-sm)", padding: 18, margin: "18px 0", background: "#fffdfa" }}>
              <span style={{ position: "absolute", top: -9, left: 14, background: "var(--sa-base)", color: "#fff", fontSize: 9, fontFamily: "var(--font-mono)", padding: "2px 7px", letterSpacing: ".08em", borderRadius: 2, textTransform: "uppercase" }}>BLOQUE · GRÁFICO · seleccionado</span>
              <span style={{ position: "absolute", top: -30, right: 0, display: "flex", gap: 4 }}>
                <Btn kind="secondary" size="sm">Reemplazar fuente</Btn>
                <Btn kind="ghost" size="sm" icon={<Ic.copy s={11} />}>Duplicar</Btn>
                <Btn kind="ghost" size="sm">Eliminar</Btn>
              </span>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 11, color: "var(--n500)", textTransform: "uppercase", letterSpacing: ".08em" }}>FIG. 4.1</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500, color: "var(--n900)", marginTop: 4 }}>Volumen mensual por competidor</div>
              <BBBarChart />
            </div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: "26px", color: "var(--n800)", textWrap: "pretty", margin: "0 0 14px" }}>
              Copa, en quinta posición con <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>240</span> menciones (9,9 %), opera con un perfil más orgánico que paid: <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>78 %</span> del contenido es no-pago, frente al <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>62 %</span> de Avianca.
            </p>
            <div style={{ background: "var(--n50)", borderLeft: "3px solid var(--sa-base)", padding: "14px 18px", margin: "18px 0" }}>
              <div className="t-micro" style={{ color: "var(--sa-base)" }}>HALLAZGO · 4.1</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, lineHeight: "26px", color: "var(--n900)", marginTop: 6, textWrap: "balance" }}>
                &ldquo;El volumen de Avianca casi cuadruplica al de Copa, pero su engagement promedio por pieza es sólo 1,8× más alto.&rdquo;
              </div>
            </div>
          </div>
        </div>

        {/* properties / blocks */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          <div>
            <div className="t-micro">BLOQUE SELECCIONADO</div>
            <div style={{ marginTop: 8, padding: "10px 12px", border: "1px solid var(--accent)", borderRadius: "var(--r-sm)", background: "var(--accent-soft)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Gráfico · barras apiladas</div>
              <div style={{ fontSize: 11, color: "var(--accent)", fontFamily: "var(--font-mono)", marginTop: 2 }}>fig. 4.1 · 5 series · 12 meses</div>
            </div>
          </div>
          <div>
            <div className="t-micro">FUENTE DE DATOS</div>
            <div style={{ marginTop: 8, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--text)" }}>run #042</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>vigente · 12 min</span>
            </div>
          </div>
          <div>
            <div className="t-micro">PROPIEDADES</div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              <PropRow k="Tipo" v="Stacked bars" />
              <PropRow k="Período" v="60 días" />
              <PropRow k="Highlight" v="Copa · sangría" />
              <PropRow k="Mostrar leyenda" v="sí" />
              <PropRow k="Mostrar ejes" v="sí" />
            </div>
          </div>
          <div>
            <div className="t-micro">INSERTAR BLOQUE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
              {["Texto", "H2", "Cita", "Gráfico", "Tabla", "KPI", "Galería", "Ranking"].map((b) => (
                <button key={b} type="button" style={{ padding: "8px 6px", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "var(--r-sm)", fontSize: 11, color: "var(--text)", cursor: "pointer" }}>{b}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <Btn kind="secondary" size="md" icon={<Ic.eye s={12} />}>Vista previa</Btn>
            <Btn kind="accent" size="md" icon={<Ic.download s={12} />}>Exportar PDF</Btn>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
