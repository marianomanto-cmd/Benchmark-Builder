import "server-only";
import { readFile } from "fs/promises";
import { ConsolidatedMediaSchema, type ConsolidatedMedia, type MediaFile } from "./types";
import { pipelineMode, hasProviderKey } from "./config";
import { NO_NOISE_RULE } from "@/lib/ai/style";

const MODEL = process.env.GOOGLE_AI_VIDEO_MODEL || "gemini-2.5-flash";
// Inline base64 payloads are capped (~20MB on the REST endpoint). Stay under it;
// longer/heavier clips fall back to the frames + Claude + Whisper path.
const MAX_INLINE_BYTES = 18 * 1024 * 1024;

// True when a live Gemini video call is possible (mode + key present). The
// system_flags gate (gemini_enabled) is enforced separately by guardedCall via
// isApiEnabled — this only reports local capability.
export function geminiVideoAvailable(): boolean {
  return pipelineMode() === "live" && hasProviderKey("gemini");
}

function mimeFor(path: string): string {
  const ext = path.toLowerCase().split(".").pop() ?? "";
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  if (ext === "mkv") return "video/x-matroska";
  if (ext === "avi") return "video/x-msvideo";
  if (ext === "3gp") return "video/3gpp";
  return "video/mp4";
}

// Analyze a short video clip natively with Gemini — vision AND audio in a single
// call — and return a consolidated, schema-validated result. Throws on any
// failure so the guarded caller falls back to frames + Claude vision + Whisper.
export async function analyzeVideoGemini(f: MediaFile, path?: string): Promise<ConsolidatedMedia> {
  if (!path || path.startsWith("mock://")) throw new Error("gemini: no local video path");
  const bytes = await readFile(path);
  if (bytes.byteLength > MAX_INLINE_BYTES) throw new Error(`gemini: clip too large (${bytes.byteLength} bytes)`);

  const prompt =
    "Analizá este video (publicitario u orgánico) usando imagen Y audio. Devolvé SOLO un JSON con: " +
    "summary (qué muestra y qué dice, 1-3 frases en español), shows (array de objetos/elementos/escenas), " +
    "ocr_text (texto en pantalla o ''), transcript (transcripción del audio/voz o ''), " +
    "language (código del idioma del audio, p. ej. 'es'), sentiment (pos|neu|neg|mix), " +
    "brand_safety (safe|review|unsafe), topics (array). Nada de texto fuera del JSON." +
    NO_NOISE_RULE;

  const key = process.env.GOOGLE_AI_API_KEY ?? "";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: mimeFor(path), data: bytes.toString("base64") } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 800 },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini video failed ${res.status}`);
  const data = await res.json();
  const text: string = ((data?.candidates?.[0]?.content?.parts ?? []) as { text?: string }[])
    .map((p) => p.text ?? "")
    .join("");
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return ConsolidatedMediaSchema.parse({ ...json, kind: "video", model: `gemini:${MODEL}` });
}
