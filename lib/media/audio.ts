import "server-only";
import { tmpdir } from "os";
import { join } from "path";
import { pipelineMode } from "./config";
import { runBin } from "./frames";

// Extract the audio track from a video for transcription. Live uses ffmpeg;
// mock returns a marker (no ffmpeg, no file).
export async function extractAudio(videoPath: string): Promise<string> {
  if (pipelineMode() !== "live" || videoPath.startsWith("mock://")) return `mock://audio/${videoPath}`;
  const out = join(tmpdir(), `bb-audio-${Date.now()}.mp3`);
  const bin = process.env.FFMPEG_PATH || "ffmpeg";
  await runBin(bin, ["-i", videoPath, "-vn", "-acodec", "libmp3lame", "-y", out]);
  return out;
}
