// Single source of truth for unit prices (USD). Pure & portable — no imports,
// safe to use on client or server. Every value can be overridden with the
// matching env var so we can re-price without a redeploy.
//
// Verified 2026-06:
//   - Anthropic Claude Opus 4.8: $5.00 / Mtok input, $25.00 / Mtok output.
//   - OpenAI Whisper: $0.006 / minute of audio.
//   - Apify: per-actor pricing varies; we model a per-result default + a small
//     fixed actor-start cost. TODO: refine per actor once live volumes are known.
//   - xAI Grok Live Search: per-search default (TODO: confirm against invoice).
//   - Brave Search: ~$3 / 1k queries on the paid tier.

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export type Rates = {
  anthropic: {
    inputPerMTok: number;
    outputPerMTok: number;
    // Rough token weight of one image attached to a vision request.
    tokensPerImage: number;
  };
  apify: {
    perResult: number;
    actorStart: number;
  };
  transcription: {
    whisperPerMinute: number;
    // YouTube captions are free to fetch — kept as a knob in case that changes.
    youtubeCaptionsPerVideo: number;
  };
  grok: {
    perSearch: number;
  };
  gemini: {
    // One native video-understanding call over a short clip (inline base64).
    videoPerClip: number;
  };
  brave: {
    perThousandQueries: number;
  };
};

export function getRates(): Rates {
  return {
    anthropic: {
      inputPerMTok: num("RATE_ANTHROPIC_INPUT_PER_MTOK", 5.0),
      outputPerMTok: num("RATE_ANTHROPIC_OUTPUT_PER_MTOK", 25.0),
      tokensPerImage: num("RATE_ANTHROPIC_TOKENS_PER_IMAGE", 1600),
    },
    apify: {
      perResult: num("RATE_APIFY_PER_RESULT", 0.004),
      actorStart: num("RATE_APIFY_ACTOR_START", 0.02),
    },
    transcription: {
      whisperPerMinute: num("RATE_WHISPER_PER_MINUTE", 0.006),
      youtubeCaptionsPerVideo: num("RATE_YOUTUBE_CAPTIONS", 0),
    },
    grok: {
      perSearch: num("RATE_GROK_PER_SEARCH", 0.02),
    },
    gemini: {
      videoPerClip: num("RATE_GEMINI_VIDEO_PER_CLIP", 0.01),
    },
    brave: {
      perThousandQueries: num("RATE_BRAVE_PER_1K", 3.0),
    },
  };
}

// ---- Per-operation cost helpers (USD) ----------------------------------------

export function claudeCostUSD(inputTokens: number, outputTokens: number, r: Rates = getRates()): number {
  return (inputTokens / 1_000_000) * r.anthropic.inputPerMTok + (outputTokens / 1_000_000) * r.anthropic.outputPerMTok;
}

// One Claude vision call: image tokens + a small prompt + a short JSON answer.
export function imageAnalysisCostUSD(r: Rates = getRates()): number {
  const promptTokens = num("EST_VISION_PROMPT_TOKENS", 350);
  const outputTokens = num("EST_VISION_OUTPUT_TOKENS", 300);
  return claudeCostUSD(r.anthropic.tokensPerImage + promptTokens, outputTokens, r);
}

// One synthesis section (per-section AI analysis): larger context, longer answer.
export function synthesisCostUSD(r: Rates = getRates()): number {
  const inputTokens = num("EST_SYNTH_INPUT_TOKENS", 6000);
  const outputTokens = num("EST_SYNTH_OUTPUT_TOKENS", 1200);
  return claudeCostUSD(inputTokens, outputTokens, r);
}

export function transcriptionCostUSD(minutes: number, useWhisper: boolean, r: Rates = getRates()): number {
  return useWhisper ? minutes * r.transcription.whisperPerMinute : r.transcription.youtubeCaptionsPerVideo;
}

export function apifyCostUSD(items: number, r: Rates = getRates()): number {
  return r.apify.actorStart + items * r.apify.perResult;
}

export function grokSearchCostUSD(searches: number, r: Rates = getRates()): number {
  return searches * r.grok.perSearch;
}

// One Gemini native video-understanding call over a short clip.
export function geminiVideoCostUSD(r: Rates = getRates()): number {
  return r.gemini.videoPerClip;
}

export function braveCostUSD(queries: number, r: Rates = getRates()): number {
  return (queries / 1000) * r.brave.perThousandQueries;
}

// Round to whole cents for storage/display.
export function cents(usd: number): number {
  return Math.round(usd * 100) / 100;
}
