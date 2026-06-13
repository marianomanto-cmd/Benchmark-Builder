import { z } from "zod";

// Structured, validated outputs of the media pipeline.

export type MediaKind = "image" | "video" | "audio";
export type MediaFile = { id?: string; url: string; kind: MediaKind; label?: string };

export const ImageAnalysisSchema = z.object({
  summary: z.string().default(""),        // what the image shows (1-2 sentences)
  shows: z.array(z.string()).default([]), // objects / elements / scene
  ocr_text: z.string().default(""),       // text detected in the image
  sentiment: z.enum(["pos", "neu", "neg", "mix"]).default("neu"),
  brand_safety: z.enum(["safe", "review", "unsafe"]).default("safe"),
  topics: z.array(z.string()).default([]),
});
export type ImageAnalysis = z.infer<typeof ImageAnalysisSchema>;

export const TranscriptSchema = z.object({
  text: z.string().default(""),
  language: z.string().default("es"),
});
export type Transcript = z.infer<typeof TranscriptSchema>;

export const ConsolidatedMediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  summary: z.string().default(""),
  shows: z.array(z.string()).default([]),
  ocr_text: z.string().default(""),
  transcript: z.string().default(""),
  language: z.string().default(""),
  sentiment: z.enum(["pos", "neu", "neg", "mix"]).default("neu"),
  brand_safety: z.enum(["safe", "review", "unsafe"]).default("safe"),
  topics: z.array(z.string()).default([]),
  model: z.string().default(""),
});
export type ConsolidatedMedia = z.infer<typeof ConsolidatedMediaSchema>;
