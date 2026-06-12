"use client";

import { ScreenShell } from "@/components/shell/screen-shell";
import { Ic } from "@/components/ui/icons";
import { Btn } from "@/components/ui/primitives";
import { MediaThumb, type ThumbKind } from "@/components/domain";
import type { PlatformKey } from "@/lib/platforms";

type Item = [ThumbKind, PlatformKey, string, string[], boolean?];
type Group = { name: string; count: number; items: Item[] };

const adGroups: Group[] = [
  { name: "Avianca", count: 38, items: [["ad", "meta_ads", "creativo · 12d", ["USD 8–12k", "1,4M 👁"], true], ["ad", "meta_ads", "video · 14d", ["USD 12–18k", "1,8M 👁"], true], ["ad", "meta_ads", "carousel · 6d", ["USD 3–5k", "410k 👁"], true]] },
  { name: "LATAM", count: 24, items: [["ad", "meta_ads", "creativo · 4d", ["USD 4–6k", "620k 👁"], true], ["ad", "meta_ads", "video · 8d", ["USD 6–9k", "940k 👁"], true], ["ad", "meta_ads", "static · 2d", ["USD 1–2k", "180k 👁"], true]] },
  { name: "Copa", count: 14, items: [["ad", "meta_ads", "static · 9d", ["USD 5–8k", "680k 👁"], true], ["ad", "meta_ads", "creativo · 3d", ["USD 2–4k", "280k 👁"], true], ["ad", "meta_ads", "video · 5d", ["USD 3–5k", "340k 👁"], true]] },
];

const organicGroups: Group[] = [
  { name: "Avianca · 84", count: 84, items: [["photo", "instagram", "sunset reel", ["12,4k ♡", "4 h"]], ["photo", "instagram", "crew", ["8,2k ♡", "12 h"]], ["video", "tiktok", "recorrido", ["480k ▷", "1 d"]]] },
  { name: "LATAM · 56", count: 56, items: [["video", "tiktok", "POV viaje", ["1,2M ▷", "9 h"]], ["photo", "instagram", "mapa", ["3,2k ♡", "2 d"]], ["photo", "facebook", "noticia", ["820 ↗", "3 d"]]] },
  { name: "Wingo · 42", count: 42, items: [["video", "youtube", "vlog 48h", ["42k ▷", "1 d"]], ["photo", "instagram", "tarifa", ["1,4k ♡", "2 d"]], ["video", "tiktok", "duet", ["98k ▷", "3 d"]]] },
];

function GalleryColumn({ kind }: { kind: "organic" | "ad" }) {
  const isAd = kind === "ad";
  const groups = isAd ? adGroups : organicGroups;
  return (
    <div style={{ background: isAd ? "var(--sa-soft)" : "#fff", border: `1px solid ${isAd ? "var(--sa-base)" : "var(--n200)"}`, borderRadius: "var(--r-md)", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, background: isAd ? "var(--ad)" : "var(--organic)", borderRadius: 2 }} />
            <div className="t-h2" style={{ color: isAd ? "var(--sa-strong)" : "var(--n900)" }}>{isAd ? "Anuncios pagos · Meta Ad Library" : "Contenido orgánico"}</div>
          </div>
          <div className="t-small" style={{ color: isAd ? "var(--sa-strong)" : "var(--n500)", marginTop: 4 }}>
            {isAd ? "84 creativos activos · USD 18–28k spend estimado" : "218 piezas en últimos 60 días"}
          </div>
        </div>
        <div style={{ display: "flex", border: `1px solid ${isAd ? "var(--sa-base)" : "var(--n300)"}`, borderRadius: "var(--r-sm)", overflow: "hidden", background: "#fff" }}>
          {["Engagement", "Reciente", "Plataforma"].map((t, i) => (
            <span key={t} style={{ padding: "4px 10px", fontSize: 11, fontFamily: "var(--font-mono)", background: i === 0 ? (isAd ? "var(--sa-base)" : "var(--n900)") : "#fff", color: i === 0 ? "#fff" : "var(--n700)", borderLeft: i ? "1px solid var(--n200)" : "none" }}>{t}</span>
          ))}
        </div>
      </div>

      {groups.map((g, gi) => (
        <div key={gi} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: isAd ? "var(--sa-strong)" : "var(--n800)" }}>{g.name}</div>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: isAd ? "var(--sa-strong)" : "var(--n500)" }}>{g.count} piezas</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {g.items.map((it, i) => (
              <MediaThumb key={i} kind={it[0]} platform={it[1]} label={it[2]} metrics={it[3]} isAd={it[4]} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Galeria() {
  return (
    <ScreenShell breadcrumb={["Proyectos", "Cartagena · Q2 2026", "Galería"]} runMeta="218 piezas orgánicas · 84 anuncios pagos">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div>
          <div className="t-micro" style={{ color: "var(--sa-base)" }}>GALERÍA · ORGÁNICO VS PAGO</div>
          <div className="t-h1" style={{ marginTop: 6 }}>Lo que la competencia muestra y lo que paga por mostrar</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="ghost" size="sm" icon={<Ic.filter s={11} />}>Filtros</Btn>
          <Btn kind="secondary" size="sm" iconRight={<Ic.eye s={11} />}>Modo presentación</Btn>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <GalleryColumn kind="organic" />
        <GalleryColumn kind="ad" />
      </div>
    </ScreenShell>
  );
}
