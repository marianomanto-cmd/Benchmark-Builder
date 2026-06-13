import "server-only";
import { ImageAnalysisSchema, type ImageAnalysis, type MediaFile } from "./types";
import { mockImageAnalysis } from "./fixtures";
import { pipelineMode, hasProviderKey } from "./config";

const VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL || "claude-opus-4-8";

// Analyze a single image (or extracted video frame) with Claude vision and
// return structured JSON. Mock returns a deterministic fixture (no API call).
// Uses the Anthropic REST API directly (no SDK typing constraints on image URLs).
export async function analyzeImage(f: MediaFile, imageUrl?: string): Promise<ImageAnalysis> {
  if (pipelineMode() !== "live" || !hasProviderKey("claude_vision")) return mockImageAnalysis(f);
  const url = imageUrl && !imageUrl.startsWith("mock://") ? imageUrl : f.url;
  const prompt =
    "Analizá esta imagen (publicitaria u orgánica). Devolvé SOLO un JSON con: " +
    "summary (qué muestra, 1-2 frases en español), shows (array de objetos/elementos), " +
    "ocr_text (texto visible o ''), sentiment (pos|neu|neg|mix), brand_safety (safe|review|unsafe), " +
    "topics (array). Nada de texto fuera del JSON.";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 600,
        messages: [{ role: "user", content: [{ type: "image", source: { type: "url", url } }, { type: "text", text: prompt }] }],
      }),
    });
    if (!res.ok) throw new Error(`vision failed ${res.status}`);
    const data = await res.json();
    const text: string = (data.content ?? [])
      .map((c: { type: string; text?: string }) => (c.type === "text" ? c.text ?? "" : ""))
      .join("");
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return ImageAnalysisSchema.parse(json);
  } catch {
    return mockImageAnalysis(f);
  }
}

export const analyzeFrame = analyzeImage;
