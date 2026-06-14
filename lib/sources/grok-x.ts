import { grokLiveSource } from "@/lib/sources/grok-live";

// X / Twitter via xAI Grok Live Search. Kept for back-compat; the generic
// factory lives in grok-live.ts (also powers web/news search).
export const grokXSource = grokLiveSource("x");
