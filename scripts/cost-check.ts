/**
 * Cost maintenance, runnable from CLI as a cron fallback:
 *   npm run cost:check
 * Releases expired reservations and prints any cost anomalies.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseExpiredCharges } from "@/lib/cost/ledger";
import { checkCostAlerts } from "@/lib/cost/alerts";

async function main() {
  const admin = createAdminClient();
  if (!admin) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL en .env.local");

  const released = await releaseExpiredCharges(admin);
  console.log(`reservas expiradas liberadas: ${released}`);

  const alerts = await checkCostAlerts(admin);
  if (alerts.length === 0) {
    console.log("sin alertas de costo");
  } else {
    for (const a of alerts) console.log(`[${a.level}] ${a.kind}: ${a.message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
