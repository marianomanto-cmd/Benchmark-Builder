import { NextResponse } from "next/server";
import { classifyPrompt } from "@/lib/discovery/classify";

export const runtime = "nodejs";

// POST /api/discovery — { q } → inferred ResearchPlan (mock heuristic unless live).
export async function POST(req: Request) {
  let body: { q?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // empty body → empty prompt
  }
  const { plan, mode } = await classifyPrompt(body.q ?? "");
  return NextResponse.json({ ok: true, plan, mode });
}
