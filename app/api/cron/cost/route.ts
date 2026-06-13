import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseExpiredCharges } from "@/lib/cost/ledger";
import { checkCostAlerts } from "@/lib/cost/alerts";

export const runtime = "nodejs";

// GET /api/cron/cost — periodic maintenance (Vercel Cron, every 5 min):
//   1) release reservations whose hold expired
//   2) scan the ledger for cost anomalies
// Protected by CRON_SECRET when set (Vercel sends it as a Bearer token).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "service role no configurado" }, { status: 500 });

  const released = await releaseExpiredCharges(admin);
  const alerts = await checkCostAlerts(admin);

  return NextResponse.json({ ok: true, released, alerts });
}
