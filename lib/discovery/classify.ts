import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isApiEnabled } from "@/lib/cost/ledger";
import { pipelineMode, hasProviderKey } from "@/lib/cost/config";
import { ResearchPlanSchema, inferPlanHeuristic, type ResearchPlan } from "./schema";

const MODEL = "claude-opus-4-8";

const SYSTEM = `Sos un planificador de research competitivo. A partir del prompt libre del usuario,
inferí un plan estructurado. Señales: "anuncios/publicidad/campañas/pauta/creatives" → paid;
"qué se dice/conversación/menciones/sentimiento/contenido" → organic; candidato/elección/partido
/tema social → ad_intent político. Devolvé SOLO un JSON con las claves:
client_brand, competitors[], category, geo[] (ISO), timeframe{from,to} (YYYY-MM-DD),
platforms[] (instagram,tiktok,youtube,facebook,x,reddit,mastodon,bluesky,web,meta_ads,google_ads,linkedin_ads),
scope ('organic'|'paid'|'both'), ad_intent ('commercial'|'political'|'mixed').`;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Infers a ResearchPlan from the user's prompt. A real Claude call fires ONLY
// when PIPELINE_MODE=live AND anthropic flag on AND key present; otherwise (mock,
// flag off, or no key) it returns the deterministic heuristic at zero cost.
export async function classifyPrompt(prompt: string): Promise<{ plan: ResearchPlan; mode: "live" | "mock" }> {
  const heuristic = inferPlanHeuristic(prompt);

  const admin = createAdminClient();
  const flagOn = admin ? await isApiEnabled(admin, "claude") : false;
  const live = pipelineMode() === "live" && flagOn && hasProviderKey("claude");
  if (!live) return { plan: heuristic, mode: "mock" };

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content.find((b) => b.type === "text");
    const raw = extractJson(text && "text" in text ? text.text : "");
    const parsed = ResearchPlanSchema.safeParse(raw);
    if (parsed.success) return { plan: { ...heuristic, ...parsed.data }, mode: "live" };
  } catch {
    // fall through to heuristic
  }
  return { plan: heuristic, mode: "mock" };
}
