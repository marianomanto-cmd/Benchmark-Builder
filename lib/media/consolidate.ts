import type { ImageAnalysis, Transcript, ConsolidatedMedia, MediaFile } from "./types";

// Merge per-frame image analyses + the voiceover transcript into one record:
// what the media SHOWS + what it SAYS. Pure (no API cost).
export function consolidate(
  f: MediaFile,
  frames: ImageAnalysis[],
  transcript: Transcript | null,
  model: string,
): ConsolidatedMedia {
  const shows = Array.from(new Set(frames.flatMap((a) => a.shows))).slice(0, 12);
  const topics = Array.from(new Set(frames.flatMap((a) => a.topics))).slice(0, 8);
  const ocr_text = Array.from(new Set(frames.map((a) => a.ocr_text).filter(Boolean))).join(" · ");
  const summary = frames[0]?.summary ?? "";
  const sentiment = frames[0]?.sentiment ?? "neu";
  const brand_safety = frames.some((a) => a.brand_safety === "unsafe")
    ? "unsafe"
    : frames.some((a) => a.brand_safety === "review")
      ? "review"
      : "safe";
  return {
    kind: f.kind === "video" ? "video" : "image",
    summary,
    shows,
    ocr_text,
    transcript: transcript?.text ?? "",
    language: transcript?.language ?? "",
    sentiment,
    brand_safety,
    topics,
    model,
  };
}
