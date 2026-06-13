import { NextResponse } from "next/server";
import { executeRun } from "@/lib/runner";
import type { PlatformKey } from "@/lib/platforms";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/runs — triggers a research run.
// Body: { slug?: string, platforms?: PlatformKey[] }
// Optional auth: set RUN_TRIGGER_SECRET and send it as the x-run-secret header.
export async function POST(req: Request) {
  const secret = process.env.RUN_TRIGGER_SECRET;
  if (secret && req.headers.get("x-run-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { slug?: string; platforms?: PlatformKey[] } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // empty body is fine — defaults apply
  }

  const result = await executeRun(body.slug, body.platforms);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
