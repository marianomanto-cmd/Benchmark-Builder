// Runtime gates for the pipeline. The governing rule: a paid call fires only
// when ALL THREE hold simultaneously —
//   1) PIPELINE_MODE=live
//   2) the provider's flag is enabled in system_flags (checked in ledger.ts)
//   3) the provider's API key is present (checked here)
// If any is missing, no paid call is made; the guarded call falls back to a
// deterministic fixture and still passes through reserve/commit with a
// simulated cost so the ledger stays consistent in mock mode.

export type PipelineMode = "mock" | "live";

export function pipelineMode(): PipelineMode {
  return process.env.PIPELINE_MODE === "live" ? "live" : "mock";
}

// Maps a provider name to the env var(s) that must be present for a real call.
const PROVIDER_KEY_ENV: Record<string, string> = {
  apify: "APIFY_TOKEN",
  anthropic: "ANTHROPIC_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  claude_vision: "ANTHROPIC_API_KEY",
  claude_synthesis: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  whisper: "OPENAI_API_KEY",
  transcription: "OPENAI_API_KEY",
  gemini: "GOOGLE_AI_API_KEY",
  google: "GOOGLE_AI_API_KEY",
  brave: "BRAVE_API_KEY",
  meta_api: "META_AD_LIBRARY_TOKEN",
  grok: "XAI_API_KEY",
  xai: "XAI_API_KEY",
  x: "XAI_API_KEY",
};

export function providerKeyEnv(provider: string): string | undefined {
  return PROVIDER_KEY_ENV[provider];
}

export function hasProviderKey(provider: string): boolean {
  const name = PROVIDER_KEY_ENV[provider];
  if (!name) return false; // unknown provider → never treat as live-capable
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// Bounded-iteration counters — hard ceilings so a runaway loop can never spend
// unboundedly. Enforced by the runner/guarded loops.
export const LIMITS = {
  maxClaudeCallsPerRun: int("MAX_CLAUDE_CALLS_PER_RUN", 200),
  maxFramesPerVideo: int("MAX_FRAMES_PER_VIDEO", 8),
  maxVideosPerRun: int("MAX_VIDEOS_PER_RUN", 20),
  maxItemsPerSource: int("MAX_ITEMS_PER_SOURCE", 100),
  maxRetriesPerCall: int("MAX_RETRIES_PER_CALL", 2),
  callTimeoutMs: int("CALL_TIMEOUT_MS", 60_000),
};
