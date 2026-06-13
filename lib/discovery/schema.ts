import { z } from "zod";
import { PLATFORM_KEYS, type PlatformKey } from "@/lib/platforms";

// Structured, validated output of the discovery step (doc 07). The classifier
// reads the user's free prompt and infers what to research.
export const ResearchPlanSchema = z.object({
  client_brand: z.string().default(""),
  competitors: z.array(z.string()).default([]),
  category: z.string().default(""),
  geo: z.array(z.string()).default([]),
  timeframe: z.object({ from: z.string(), to: z.string() }),
  platforms: z.array(z.enum(PLATFORM_KEYS)).default([]),
  scope: z.enum(["organic", "paid", "both"]).default("organic"),
  ad_intent: z.enum(["commercial", "political", "mixed"]).default("commercial"),
});

export type ResearchPlan = z.infer<typeof ResearchPlanSchema>;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
}

// Deterministic heuristic inference — used in mock mode and as a live fallback.
// Keeps the "infer from prompt" behavior at zero cost.
export function inferPlanHeuristic(prompt: string): ResearchPlan {
  const t = prompt.toLowerCase();

  const paidSignals = /(anuncio|publicidad|campañ|pauta|ad creative|ads?\b|creativ|spend|impresion)/.test(t);
  const organicSignals = /(qué se dice|que se dice|conversaci|mencion|sentimiento|contenido|orgánico|organico)/.test(t);
  const political = /(candidat|elecci|partido|político|politico|gobierno|campaña electoral|voto)/.test(t);

  const scope: ResearchPlan["scope"] = paidSignals && organicSignals ? "both" : paidSignals ? "paid" : organicSignals ? "organic" : "both";
  const ad_intent: ResearchPlan["ad_intent"] = political ? "political" : "commercial";

  // Platform hints from the prompt; default to a sensible multi-source set.
  const hinted = PLATFORM_KEYS.filter((p) => t.includes(p.replace("_", " ")) || t.includes(p.replace("_ads", "")));
  const organicDefault: PlatformKey[] = ["instagram", "tiktok", "youtube", "x", "reddit"];
  const paidDefault: PlatformKey[] = political ? ["meta_ads", "google_ads"] : ["meta_ads", "google_ads", "linkedin_ads"];
  const platforms = Array.from(
    new Set<PlatformKey>([
      ...(hinted.length ? hinted : []),
      ...(scope !== "paid" ? organicDefault : []),
      ...(scope !== "organic" ? paidDefault : []),
    ]),
  );

  return {
    client_brand: "",
    competitors: [],
    category: "",
    geo: [],
    timeframe: { from: isoDaysAgo(60), to: isoDaysAgo(0) },
    platforms,
    scope,
    ad_intent,
  };
}
