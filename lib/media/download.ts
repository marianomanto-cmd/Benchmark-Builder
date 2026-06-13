import "server-only";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile } from "fs/promises";
import { pipelineMode, mediaExpiresAt } from "./config";
import type { MediaFile } from "./types";

export type Downloaded = { path: string; bytes: number; expiresAt: string };

// Download media to a temp path with a 12h TTL. In mock mode it returns a marker
// (no network). The real temp file is swept by purgeExpiredMedia() / the cron.
export async function downloadMedia(f: MediaFile): Promise<Downloaded> {
  if (pipelineMode() !== "live") {
    return { path: `mock://${f.url}`, bytes: 0, expiresAt: mediaExpiresAt() };
  }
  const res = await fetch(f.url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const path = join(tmpdir(), `bb-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await writeFile(path, buf);
  return { path, bytes: buf.byteLength, expiresAt: mediaExpiresAt() };
}
