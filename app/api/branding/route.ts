import { NextResponse } from "next/server";
import { getBranding, saveBranding } from "@/lib/branding-server";

export const runtime = "nodejs";

// Branding read/write. Writes via the service role (no real auth yet). If
// Supabase isn't configured, save is a no-op and getBranding returns Phatia.

export async function GET() {
  return NextResponse.json({ ok: true, branding: await getBranding() });
}

type Body = { brandName?: string; accentHex?: string; hidePhatiaFooter?: boolean; logoDataUrl?: string };

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // ignore
  }
  const res = await saveBranding(body);
  return NextResponse.json(res);
}
