import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { assistFor } from "@/lib/discovery/suggest";
import { createAdminClient } from "@/lib/supabase/admin";
import { isApiEnabled } from "@/lib/cost/ledger";
import { pipelineMode, hasProviderKey } from "@/lib/cost/config";

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
  let body: { step?: number; state?: Partial<WizardState> } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // ignore
  }
  const step = Number(body.step ?? 0);
  const state = coerce(body.state);

  // Deterministic heuristic — always the baseline and the fallback.
  const heuristic = assistFor(step, state);

  const admin = createAdminClient();
  const flagOn = admin ? await isApiEnabled(admin, "claude") : false;
  const live = pipelineMode() === "live" && flagOn && hasProviderKey("claude");
  if (!live) return NextResponse.json({ ...heuristic, mode: "mock" });

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 220,
      system:
        "Sos un asistente que ayuda a completar un brief de research competitivo, paso a paso. " +
        "Dado el paso y los datos cargados, evaluá si alcanzan para un buen análisis. " +
        'Devolvé SOLO un JSON {"ok":boolean,"msg":string}. msg en español rioplatense, 1 frase, concreta: ' +
        "si falta info o es vaga, decí puntualmente qué mejorar o sugerí (ej. industrias a descartar); si está bien, confirmá brevemente. " +
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
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as { ok?: boolean; msg?: string };
    if (typeof json.msg === "string" && json.msg.trim()) {
      return NextResponse.json({ ok: Boolean(json.ok), msg: json.msg.trim(), mode: "live" });
    }
  } catch {
    // fall through to heuristic
  }
  return NextResponse.json({ ...heuristic, mode: "mock" });
}
