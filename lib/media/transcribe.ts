import "server-only";
import { readFile } from "fs/promises";
import { TranscriptSchema, type Transcript, type MediaFile } from "./types";
import { mockTranscript } from "./fixtures";
import { pipelineMode, hasProviderKey } from "./config";

const MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

// Transcribe the voiceover. Live uses OpenAI Whisper over the extracted audio
// file (REST, no SDK); mock returns a deterministic fixture. Gemini is a viable
// alternative for native video+audio understanding — see docs/STATUS.md §9.
export async function transcribe(f: MediaFile, audioPath?: string): Promise<Transcript> {
  if (pipelineMode() !== "live" || !hasProviderKey("whisper")) return mockTranscript(f);
  if (!audioPath || audioPath.startsWith("mock://")) return mockTranscript(f);
  try {
    const data = await readFile(audioPath);
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(data)]), "audio.mp3");
    form.append("model", MODEL);
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
      body: form,
    });
    if (!res.ok) throw new Error(`whisper failed ${res.status}`);
    const json = (await res.json()) as { text?: string; language?: string };
    return TranscriptSchema.parse({ text: json.text ?? "", language: json.language ?? "es" });
  } catch {
    return mockTranscript(f);
  }
}
