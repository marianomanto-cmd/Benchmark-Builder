import "server-only";
import { env } from "@/lib/sources/types";
import type { SentimentKind, InsightKind } from "@/lib/platforms";

// xAI Grok — OpenAI-compatible chat completions API.
const BASE = "https://api.x.ai/v1";

export function grokAvailable(): boolean {
  return Boolean(env("XAI_API_KEY"));
}

function model(): string {
  return env("XAI_MODEL") ?? "grok-3";
}

async function chat(system: string, user: string): Promise<string> {
  const key = env("XAI_API_KEY");
  if (!key) throw new Error("XAI_API_KEY no configurado");
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model(),
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`xAI ${res.status} — ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

function extractJson<T>(text: string): T | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text];
  const raw = (match[1] ?? text).trim();
  const start = raw.search(/[[{]/);
  if (start < 0) return null;
  try {
    return JSON.parse(raw.slice(start)) as T;
  } catch {
    return null;
  }
}

export function scoreToSentiment(score: number): SentimentKind {
  if (score < 0.35) return "neg";
  if (score < 0.65) return "neu";
  return "pos";
}

// Returns a sentiment score in [0,1] per input text. Falls back to 0.5 (neutral).
export async function scoreSentiments(texts: string[]): Promise<number[]> {
  if (texts.length === 0) return [];
  if (!grokAvailable()) return texts.map(() => 0.5);
  try {
    const numbered = texts.map((t, i) => `${i + 1}. ${t.replace(/\s+/g, " ").slice(0, 280)}`).join("\n");
    const out = await chat(
      "Sos un analista de sentimiento. Para cada texto devolvé un score de 0 (muy negativo) a 1 (muy positivo) sobre la marca/aerolínea mencionada. Respondé SOLO un array JSON de números, en orden.",
      numbered,
    );
    const arr = extractJson<number[]>(out);
    if (!arr || arr.length !== texts.length) return texts.map(() => 0.5);
    return arr.map((n) => Math.min(1, Math.max(0, Number(n) || 0.5)));
  } catch {
    return texts.map(() => 0.5);
  }
}

export type InsightDraft = { kind: InsightKind; title: string; body: string; sources: number; confidence: number };

// Generates up to 4 insights from a textual summary of the run.
export async function generateInsights(summary: string): Promise<InsightDraft[]> {
  if (!grokAvailable()) return [];
  try {
    const out = await chat(
      "Sos un analista de inteligencia competitiva. A partir del resumen, devolvé hasta 4 insights accionables. " +
        'Respondé SOLO un array JSON de objetos: {"kind":"opp|thr|pat|ano","title":string,"body":string,"sources":number,"confidence":number}. ' +
        "kind: opp=oportunidad, thr=amenaza, pat=patrón, ano=anomalía. confidence entre 0 y 1. Español rioplatense.",
      summary.slice(0, 6000),
    );
    const arr = extractJson<InsightDraft[]>(out);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((d) => d && d.title && ["opp", "thr", "pat", "ano"].includes(d.kind))
      .slice(0, 4)
      .map((d) => ({
        kind: d.kind,
        title: String(d.title),
        body: String(d.body ?? ""),
        sources: Number(d.sources) || 0,
        confidence: Math.min(1, Math.max(0, Number(d.confidence) || 0.5)),
      }));
  } catch {
    return [];
  }
}
