import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { guardedCall } from "@/lib/cost/guarded";
import { geminiVideoCostUSD, imageAnalysisCostUSD, transcriptionCostUSD } from "@/lib/cost/rates";
import { LIMITS, hasProviderKey } from "./config";
import { downloadMedia } from "./download";
import { extractFrames } from "./frames";
import { extractAudio } from "./audio";
import { analyzeImage } from "./analyze";
import { analyzeVideoGemini } from "./gemini-video";
import { transcribe } from "./transcribe";
import { consolidate } from "./consolidate";
import { mockImageAnalysis, mockTranscript, mockConsolidated } from "./fixtures";
import type { ConsolidatedMedia, ImageAnalysis, MediaFile, Transcript } from "./types";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;
type FileRow = { id: string; url: string; kind: MediaFile["kind"]; mention_id?: string | null };

// Process one media file end-to-end, under the cost guard. Idempotent: if an
// analysis row already exists for the file it is skipped (safe to re-run).
export async function processMediaFile(admin: Admin, runId: string, fileRow: FileRow): Promise<ConsolidatedMedia | null> {
  const { data: existing } = await admin.from("media_analysis").select("id").eq("media_file_id", fileRow.id).maybeSingle();
  if (existing) return null;

  const f: MediaFile = { id: fileRow.id, url: fileRow.url, kind: fileRow.kind };
  const dl = await downloadMedia(f); // free step; records the 12h TTL
  await admin.from("media_files").update({ status: "downloaded", storage_path: dl.path, bytes: dl.bytes, expires_at: dl.expiresAt }).eq("id", fileRow.id);

  let consolidated: ConsolidatedMedia;
  let cost = 0;

  if (f.kind === "image") {
    const out = await guardedCall<ImageAnalysis>({
      admin, runId, provider: "claude_vision", operation: "analyze_image", label: "Visión · imagen",
      estimatedCost: imageAnalysisCostUSD(), call: () => analyzeImage(f, f.url), fixture: () => mockImageAnalysis(f),
    });
    if (!out.ok) return null;
    cost += out.cost;
    consolidated = consolidate(f, [out.result], null, out.mode === "live" ? "claude-vision" : "mock");
  } else {
    // Prefer Gemini for native video understanding (vision + audio in one call)
    // when a Gemini key is configured. On any failure — or with no key — fall
    // back to the frames + Claude vision + Whisper path below.
    const gem = hasProviderKey("gemini")
      ? await guardedCall<ConsolidatedMedia>({
          admin, runId, provider: "gemini", operation: "analyze_video", label: "Gemini · video",
          estimatedCost: geminiVideoCostUSD(), call: () => analyzeVideoGemini(f, dl.path), fixture: () => mockConsolidated(f),
        })
      : null;
    if (gem?.ok) {
      consolidated = gem.result;
      cost += gem.cost;
    } else {
      const frames = await extractFrames(dl.path);
      const analyses: ImageAnalysis[] = [];
      for (const fr of frames.slice(0, LIMITS.maxFramesPerVideo)) {
        const out = await guardedCall<ImageAnalysis>({
          admin, runId, provider: "claude_vision", operation: "analyze_frame", label: "Visión · frame",
          estimatedCost: imageAnalysisCostUSD(), call: () => analyzeImage(f, fr), fixture: () => mockImageAnalysis({ ...f, url: fr }),
        });
        if (out.ok) { analyses.push(out.result); cost += out.cost; }
      }
      const audioPath = await extractAudio(dl.path);
      const trOut = await guardedCall<Transcript>({
        admin, runId, provider: "whisper", operation: "transcribe", label: "Transcripción · voiceover",
        estimatedCost: transcriptionCostUSD(3, true), call: () => transcribe(f, audioPath), fixture: () => mockTranscript(f),
      });
      const transcript = trOut.ok ? trOut.result : null;
      if (trOut.ok) cost += trOut.cost;
      const model = analyses[0]?.summary && transcript?.text ? "claude-vision+whisper" : "mock";
      consolidated = analyses.length || transcript
        ? consolidate(f, analyses.length ? analyses : [mockImageAnalysis(f)], transcript, model)
        : mockConsolidated(f);
    }
  }

  await admin.from("media_analysis").upsert(
    {
      media_file_id: fileRow.id,
      kind: consolidated.kind,
      summary: consolidated.summary,
      shows: consolidated.shows,
      ocr_text: consolidated.ocr_text,
      transcript: consolidated.transcript,
      language: consolidated.language,
      sentiment: consolidated.sentiment,
      brand_safety: consolidated.brand_safety,
      topics: consolidated.topics,
      model: consolidated.model,
      cost_usd: cost,
    },
    { onConflict: "media_file_id" },
  );
  await admin.from("media_files").update({ status: "analyzed" }).eq("id", fileRow.id);
  return consolidated;
}

// Process all pending media for a run (bounded by MAX_VIDEOS_PER_RUN).
export async function processRunMedia(admin: Admin, runId: string): Promise<{ processed: number }> {
  const { data: files } = await admin
    .from("media_files")
    .select("id, url, kind, mention_id")
    .eq("run_id", runId)
    .neq("status", "analyzed")
    .limit(LIMITS.maxVideosPerRun);
  let processed = 0;
  for (const row of (files ?? []) as FileRow[]) {
    const res = await processMediaFile(admin, runId, row);
    if (res) processed++;
  }
  return { processed };
}

// Insert media_files for a run from (mention, url, kind) tuples — idempotent on
// (project_id, url). Returns the count queued.
export async function queueRunMedia(
  admin: Admin,
  projectId: string,
  runId: string,
  items: { mentionId?: string | null; url: string; kind: MediaFile["kind"] }[],
): Promise<{ queued: number }> {
  if (!items.length) return { queued: 0 };
  const rows = items.map((it) => ({ project_id: projectId, run_id: runId, mention_id: it.mentionId ?? null, url: it.url, kind: it.kind, status: "pending" }));
  const { data } = await admin.from("media_files").upsert(rows, { onConflict: "project_id,url", ignoreDuplicates: true }).select("id");
  return { queued: (data ?? []).length };
}

// Sweep: delete media_files past their 12h TTL (analysis rows cascade).
export async function purgeExpiredMedia(admin: Admin): Promise<{ purged: number }> {
  const { data } = await admin.from("media_files").delete().lt("expires_at", new Date().toISOString()).select("id");
  return { purged: (data ?? []).length };
}
