import "server-only";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { pipelineMode, LIMITS } from "./config";

// Extract up to N evenly-spaced frames from a video. Live uses ffmpeg (system
// binary or $FFMPEG_PATH; on Vercel add the `ffmpeg-static` package and set
// FFMPEG_PATH to its path, or run this in a worker). Mock returns marker paths.
export async function extractFrames(videoPath: string, n = LIMITS.maxFramesPerVideo): Promise<string[]> {
  const count = Math.max(1, Math.min(n, LIMITS.maxFramesPerVideo));
  if (pipelineMode() !== "live" || videoPath.startsWith("mock://")) {
    return Array.from({ length: Math.min(count, 3) }, (_, i) => `mock://frame/${i}/${videoPath}`);
  }
  const pattern = join(tmpdir(), `bb-frame-${Date.now()}-%d.jpg`);
  const bin = process.env.FFMPEG_PATH || "ffmpeg";
  await runBin(bin, ["-i", videoPath, "-vf", "thumbnail", "-frames:v", String(count), pattern]);
  return Array.from({ length: count }, (_, i) => pattern.replace("%d", String(i + 1)));
}

export function runBin(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args);
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${bin} exited ${code}`))));
  });
}
