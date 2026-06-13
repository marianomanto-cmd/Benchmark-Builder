"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/primitives";
import { Ic } from "@/components/ui/icons";
import { PlatformBadge } from "@/components/domain";
import type { PlatformKey } from "@/lib/platforms";

export type SourceSettingVM = {
  platform: PlatformKey;
  scope: "organic" | "paid";
  provider: string;
  name: string;
  actorId: string;
  enabled: boolean;
  resultsLimit: number;
  usesActor: boolean;
};

export function SourceSettingsForm({ initial }: { initial: SourceSettingVM[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<SourceSettingVM[]>(initial);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  function patch(platform: PlatformKey, scope: string, p: Partial<SourceSettingVM>) {
    setRows((rs) => rs.map((r) => (r.platform === platform && r.scope === scope ? { ...r, ...p } : r)));
    setState("idle");
  }

  async function save() {
    setState("saving");
    setMsg("");
    try {
      const res = await fetch("/api/settings/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map((r) => ({
            platform: r.platform,
            scope: r.scope,
            provider: r.provider,
            actor_id: r.usesActor ? r.actorId : null,
            enabled: r.enabled,
            results_limit: r.resultsLimit,
          })),
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setState("done");
        setMsg("Guardado");
        router.refresh();
      } else {
        setState("error");
        setMsg(json.error ?? "Error al guardar");
      }
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Error de red");
    }
  }

  const inputStyle: CSSProperties = {
    height: 32,
    padding: "0 10px",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--r-sm)",
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    background: "var(--surface)",
    color: "var(--text)",
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div>
          <div className="t-micro" style={{ color: "var(--accent)" }}>SETTINGS · FUENTES</div>
          <div className="t-h1" style={{ marginTop: 6 }}>Fuentes y actores de scraping</div>
          <div className="t-body" style={{ color: "var(--text-muted)", marginTop: 6, maxWidth: 560 }}>
            Activá o desactivá cada fuente y editá el actor de Apify sin salir de la app. Los cambios se aplican en el próximo run.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {msg && <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: state === "error" ? "var(--danger)" : "var(--success)" }}>{msg}</span>}
          <Btn kind="primary" loading={state === "saving"} onClick={save} icon={state !== "saving" ? <Ic.check s={12} /> : undefined}>Guardar cambios</Btn>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 2fr 0.8fr 0.8fr", gap: 12, padding: "10px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
          {["Fuente", "Actor de Apify", "Límite", "Activa"].map((h) => (
            <div key={h} className="t-micro">{h}</div>
          ))}
        </div>
        {rows.map((r) => (
          <div key={`${r.platform}-${r.scope}`} style={{ display: "grid", gridTemplateColumns: "1.4fr 2fr 0.8fr 0.8fr", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--border)", alignItems: "center", opacity: r.enabled ? 1 : 0.55 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PlatformBadge platform={r.platform} size="md" />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
              <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", padding: "1px 6px", borderRadius: 99, border: `1px solid ${r.scope === "paid" ? "var(--accent)" : "var(--border-strong)"}`, color: r.scope === "paid" ? "var(--accent)" : "var(--text-muted)" }}>{r.scope === "paid" ? "paid" : "org"}</span>
            </div>
            {r.usesActor ? (
              <input
                value={r.actorId}
                onChange={(e) => patch(r.platform, r.scope, { actorId: e.target.value })}
                placeholder="usuario~actor"
                style={inputStyle}
              />
            ) : (
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{r.provider === "meta_api" ? "API oficial · sin actor" : "API pública · sin actor"}</span>
            )}
            <input
              type="number"
              min={1}
              max={200}
              value={r.resultsLimit}
              onChange={(e) => patch(r.platform, r.scope, { resultsLimit: Number(e.target.value) })}
              style={{ ...inputStyle, width: 72 }}
            />
            <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => patch(r.platform, r.scope, { enabled: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
