import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { SentimentKind, InsightKind } from "@/lib/platforms";

// Claude (Anthropic) powers sentiment scoring + insight generation.
const MODEL = "claude-opus-4-8";

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function textOf(msg: Anthropic.Message): string {
  for (const b of msg.content) if (b.type === "text") return b.text;
  return "";
}

function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
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

// Sentiment score in [0,1] per text. Falls back to 0.5 (neutral) on any failure.
export async function scoreSentiments(texts: string[]): Promise<number[]> {
  if (texts.length === 0) return [];
  if (!aiAvailable()) return texts.map(() => 0.5);
  try {
    const client = new Anthropic();
    const numbered = texts.map((t, i) => `${i + 1}. ${t.replace(/\s+/g, " ").slice(0, 300)}`).join("\n");
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system:
        "Sos un analista de sentimiento de marca. Para cada texto numerado, devolvé un score de 0 (muy negativo) a 1 (muy positivo) sobre la aerolínea/marca mencionada. Respondé SOLO un array JSON de números, en el mismo orden.",
      messages: [{ role: "user", content: numbered }],
    });
    const arr = extractJson<number[]>(textOf(msg));
    if (!arr || arr.length !== texts.length) return texts.map(() => 0.5);
    return arr.map((n) => Math.min(1, Math.max(0, Number(n) || 0.5)));
  } catch {
    return texts.map(() => 0.5);
  }
}

export type InsightDraft = { kind: InsightKind; title: string; body: string; sources: number; confidence: number };

// Generates up to 4 insights from a textual summary of the run.
export async function generateInsights(summary: string): Promise<InsightDraft[]> {
  if (!aiAvailable()) return [];
  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system:
        "Sos un analista de inteligencia competitiva. A partir del resumen, devolvé hasta 4 insights accionables. " +
        'Respondé SOLO un array JSON de objetos: {"kind":"opp|thr|pat|ano","title":string,"body":string,"sources":number,"confidence":number}. ' +
        "kind: opp=oportunidad, thr=amenaza, pat=patrón, ano=anomalía. confidence entre 0 y 1. Español rioplatense.",
      messages: [{ role: "user", content: summary.slice(0, 8000) }],
    });
    const arr = extractJson<InsightDraft[]>(textOf(msg));
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
