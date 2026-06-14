import "server-only";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { PLATFORM_KEYS, type PlatformKey } from "@/lib/platforms";
import { createAdminClient } from "@/lib/supabase/admin";
import { isApiEnabled } from "@/lib/cost/ledger";
import { pipelineMode, hasProviderKey } from "@/lib/cost/config";
import type { ResearchPlan } from "./schema";

// ---------------------------------------------------------------------------
// Planner / Interpreter (orquestación, paso 1).
// Convierte un ResearchPlan (+ perfil de cliente opcional) en queries ACOTADAS
// por fuente — no el prompt crudo del usuario. Determinista por defecto (costo
// cero); en PIPELINE_MODE=live + flag claude + key, Claude refina el spec y se
// valida con Zod (fallback a la heurística ante cualquier error).
//
// El motor real (Claude) NO se nombra en la UI: política de etiquetado.
// ---------------------------------------------------------------------------

const MODEL = process.env.ANTHROPIC_PLANNER_MODEL || "claude-opus-4-8";

// Perfil de cliente — hoy se arma desde los campos de marca del plan; a futuro
// vendrá de `client_profiles` guardado (un marketer con varias marcas).
export type ClientProfile = {
  brand: string;
  brand_desc?: string;
  brand_site?: string;
  brand_handles?: string[];
  invest_organic?: string;
  invest_paid?: string;
  default_discards?: string[];
};

export const QuerySourceSchema = z.object({
  platform: z.enum(PLATFORM_KEYS),
  scope: z.enum(["organic", "paid"]),
  handles: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  phrases: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  geo: z.array(z.string()).default([]),
  notes: z.string().default(""),
});
export type QuerySource = z.infer<typeof QuerySourceSchema>;

export const QuerySpecSchema = z.object({
  sources: z.array(QuerySourceSchema).default([]),
  rationale: z.string().default(""),
});
export type QuerySpec = z.infer<typeof QuerySpecSchema>;

const PAID_ONLY: PlatformKey[] = ["meta_ads", "google_ads", "linkedin_ads"];

function uniqNonEmpty(xs: (string | undefined | null)[]): string[] {
  return Array.from(new Set(xs.map((x) => (x ?? "").trim()).filter(Boolean)));
}

// Tailors the keyword set per platform from structured signals (brand,
// competitors, category) — deliberately NOT the raw business question.
function keywordsFor(platform: PlatformKey, base: string[], category: string): string[] {
  const cat = category.trim();
  const withCat = cat ? [...base, cat] : base;
  switch (platform) {
    case "web":
      return uniqNonEmpty([...withCat, cat ? `${cat} noticias` : "", cat ? `${cat} prensa` : ""]).slice(0, 8);
    case "youtube":
      return uniqNonEmpty([...withCat, cat ? `${cat} review` : ""]).slice(0, 8);
    case "x":
      return uniqNonEmpty(base).slice(0, 8);
    default:
      return uniqNonEmpty(withCat).slice(0, 8);
  }
}

// Deterministic, zero-cost spec. Always available; also the live fallback.
export function buildQuerySpec(plan: ResearchPlan, profile?: ClientProfile): QuerySpec {
  const includeOrganic = plan.scope !== "paid";
  const includePaid = plan.scope !== "organic";
  const brand = (profile?.brand || plan.client_brand || "").trim();
  const base = uniqNonEmpty([brand, ...plan.competitors]);
  const phrases = uniqNonEmpty([brand, ...plan.competitors]);
  const category = plan.category || "";

  const sources: QuerySource[] = [];
  for (const platform of plan.platforms) {
    const isPaidOnly = PAID_ONLY.includes(platform);
    const mk = (scope: "organic" | "paid"): QuerySource => ({
      platform,
      scope,
      handles: uniqNonEmpty([...(profile?.brand_handles ?? []), ...plan.competitors]),
      keywords: keywordsFor(platform, base, category),
      phrases,
      languages: [],
      geo: plan.geo ?? [],
      notes: "",
    });
    if (isPaidOnly) {
      if (includePaid) sources.push(mk("paid"));
    } else {
      if (includeOrganic) sources.push(mk("organic"));
      if (includePaid && platform === "x") sources.push(mk("paid"));
    }
  }
  return { sources, rationale: "heuristic" };
}

const SYSTEM = `Sos un planificador de research competitivo. Recibís un plan estructurado y la
intención del usuario, y devolvés queries ACOTADAS por fuente (no el prompt crudo).
Devolvé SOLO un JSON: {"sources":[{"platform","scope":"organic|paid","handles":[],
"keywords":[],"phrases":[],"languages":[],"geo":[],"notes":""}],"rationale":""}.
platform ∈ instagram,tiktok,youtube,facebook,x,reddit,mastodon,bluesky,web,meta_ads,google_ads,linkedin_ads.
keywords: 3-8 términos enfocados por fuente (marca + competidores + categoría, tailored a la plataforma).
Sin texto fuera del JSON.`;

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

// Returns the query spec. Live Claude refinement only when all gates pass;
// otherwise the deterministic heuristic at zero cost.
export async function planQueries(
  plan: ResearchPlan,
  opts: { profile?: ClientProfile; intent?: string } = {},
): Promise<{ spec: QuerySpec; mode: "live" | "mock" }> {
  const heuristic = buildQuerySpec(plan, opts.profile);

  const admin = createAdminClient();
  const flagOn = admin ? await isApiEnabled(admin, "claude") : false;
  const live = pipelineMode() === "live" && flagOn && hasProviderKey("claude");
  if (!live) return { spec: heuristic, mode: "mock" };

  try {
    const client = new Anthropic();
    const userMsg =
      `Plan: ${JSON.stringify({ ...plan, brand_desc: undefined })}\n` +
      `Intención: ${opts.intent ?? ""}\n` +
      `Marca: ${opts.profile?.brand ?? plan.client_brand}\n` +
      `Generá el query spec acotado por fuente.`;
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = msg.content.find((b) => b.type === "text");
    const raw = extractJson(text && "text" in text ? text.text : "");
    const parsed = QuerySpecSchema.safeParse(raw);
    if (parsed.success && parsed.data.sources.length) return { spec: parsed.data, mode: "live" };
  } catch {
    // fall through to heuristic
  }
  return { spec: heuristic, mode: "mock" };
}

// Helper: focused keywords for a given job, with a safe fallback.
export function keywordsForJob(spec: QuerySpec, platform: PlatformKey, scope: string, fallback: string[]): string[] {
  const s = spec.sources.find((x) => x.platform === platform && x.scope === scope);
  return s && s.keywords.length ? s.keywords : fallback;
}
