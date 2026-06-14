import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { assistFor, recommendationsFor } from "@/lib/discovery/suggest";
import { createAdminClient } from "@/lib/supabase/admin";
import { isApiEnabled } from "@/lib/cost/ledger";
import { pipelineMode, hasProviderKey } from "@/lib/cost/config";
import { isLocale, type Locale } from "@/lib/i18n";

const LANG: Record<Locale, string> = { es: "español rioplatense", en: "English", pt: "português" };

export const runtime = "nodejs";

// Wizard assistant (orquestación, paso "asistente"). Guía al usuario paso a paso
// al tocar "Siguiente": detecta respuestas vagas y sugiere cómo mejorar el brief.
// Determinista por defecto (heurística, costo cero). En PIPELINE_MODE=live + flag
// + key usa un modelo económico (Haiku). NUNCA revela el motor en el texto.
const MODEL = process.env.ANTHROPIC_WIZARD_MODEL || "claude-haiku-4-5-20251001";

type WizardState = { brand: string; brandDesc: string; igUrl: string; problem: string; geo: string[]; competitors: string[]; discards: string[] };

const STEP_GOAL: Record<number, string> = {
  0: "Datos de la marca: nombre, qué hace, sitio/IG, inversión y la pregunta de negocio.",
  1: "Competencia: mercados (países/ciudades), competidores y temas a descartar.",
  2: "Alcance: orgánico/paid, redes/fuentes y ventana de tiempo.",
};

function coerce(s: Partial<WizardState> | undefined): WizardState {
  return {
    brand: String(s?.brand ?? ""),
    brandDesc: String(s?.brandDesc ?? ""),
    igUrl: String(s?.igUrl ?? ""),
    problem: String(s?.problem ?? ""),
    geo: Array.isArray(s?.geo) ? s!.geo.map(String) : [],
    competitors: Array.isArray(s?.competitors) ? s!.competitors.map(String) : [],
    discards: Array.isArray(s?.discards) ? s!.discards.map(String) : [],
  };
}

export async function POST(req: Request) {
  let body: { step?: number; state?: Partial<WizardState>; locale?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // ignore
  }
  const step = Number(body.step ?? 0);
  const state = coerce(body.state);
  const locale: Locale = isLocale(body.locale) ? body.locale : "es";

  // Deterministic heuristic — always the baseline and the fallback.
  const heuristic = assistFor(step, state, locale);
  const recommendations = recommendationsFor(step, state, locale);

  const admin = createAdminClient();
  const flagOn = admin ? await isApiEnabled(admin, "claude") : false;
  const live = pipelineMode() === "live" && flagOn && hasProviderKey("claude");
  if (!live) return NextResponse.json({ ...heuristic, recommendations, mode: "mock" });

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 220,
      system:
        "Sos un asistente que ayuda a completar un brief de research competitivo, paso a paso. " +
        "Dado el paso y los datos cargados, evaluá si alcanzan para un buen análisis. " +
        `Devolvé SOLO un JSON {"ok":boolean,"msg":string,"recommendations":string[]}. msg y recommendations en ${LANG[locale]}, 1 frase msg. ` +
        "recommendations: 2-3 acciones concretas para mejorar el brief (ej. industrias/temas a descartar, competidores faltantes, ventana de tiempo). " +
        "Si está todo bien, confirmá en msg y dejá recommendations con 1 sugerencia opcional. " +
        "No menciones que sos IA ni ningún modelo/proveedor.",
      messages: [
        {
          role: "user",
          content: `Paso ${step} — objetivo: ${STEP_GOAL[step] ?? ""}\nDatos: ${JSON.stringify(state)}`,
        },
      ],
    });
    const text = msg.content.find((b) => b.type === "text");
    const raw = text && "text" in text ? text.text : "";
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as { ok?: boolean; msg?: string; recommendations?: unknown };
    if (typeof json.msg === "string" && json.msg.trim()) {
      const recs = Array.isArray(json.recommendations) ? json.recommendations.map(String).slice(0, 3) : recommendations;
      return NextResponse.json({ ok: Boolean(json.ok), msg: json.msg.trim(), recommendations: recs, mode: "live" });
    }
  } catch {
    // fall through to heuristic
  }
  return NextResponse.json({ ...heuristic, recommendations, mode: "mock" });
}
