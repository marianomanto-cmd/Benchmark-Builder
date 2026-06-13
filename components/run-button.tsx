"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/primitives";
import { Ic } from "@/components/ui/icons";

type RunState = "idle" | "running" | "done" | "error";

// Triggers POST /api/runs and surfaces inline status. Wired to the
// "Aprobar y ejecutar" CTA on the Research Plan screen.
export function RunButton({ slug, platforms, keywords, label = "Aprobar y ejecutar" }: { slug?: string; platforms?: string[]; keywords?: string[]; label?: string }) {
  const router = useRouter();
  const [state, setState] = useState<RunState>("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    setState("running");
    setMsg("");
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, platforms, keywords }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        mentionsCount?: number;
        platforms?: { status: string }[];
      };
      if (json.ok) {
        setState("done");
        const ok = (json.platforms ?? []).filter((p) => p.status === "done").length;
        setMsg(`${json.mentionsCount ?? 0} menciones · ${ok} fuentes ok`);
        router.refresh();
      } else {
        setState("error");
        setMsg(json.error ?? "Error en el run");
      }
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Error de red");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {msg && (
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: state === "error" ? "var(--danger)" : "var(--n500)", maxWidth: 260, textAlign: "right" }}>
          {msg}
        </span>
      )}
      <Btn kind="accent" size="md" loading={state === "running"} onClick={run} iconRight={state !== "running" ? <Ic.bolt s={12} /> : undefined}>
        {label}
      </Btn>
    </div>
  );
}
