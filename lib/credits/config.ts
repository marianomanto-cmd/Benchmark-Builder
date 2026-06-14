// Phatia credits monetization — SINGLE SOURCE OF TRUTH for all credit math.
// The user spends "credits" (not money) to lower resistance to consumption.
// Credits are topped up via a monthly subscription.

export const CREDIT_USD = 0.1; // 1 credit = USD 0.10  → USD 1 = 10 credits
export const REPORT_COST = 120; // credits for a full report (= USD 12 @ base = Basic price/report)
export const ASSISTANT_COST = 2; // credits per assistant query inside a run

export type TierId = "basic" | "pro" | "marketer";
export type Tier = { id: TierId; name: string; priceUsd: number; credits: number; recommended?: boolean };

// More credits per dollar as you go up (Pro/Marketer get bonus credits over base).
export const TIERS: Tier[] = [
  { id: "basic", name: "Basic", priceUsd: 60, credits: 600 },
  { id: "pro", name: "Pro", priceUsd: 200, credits: 2400, recommended: true },
  { id: "marketer", name: "Marketer", priceUsd: 450, credits: 6000 },
];

export const creditsToUsd = (c: number) => Math.round(c * CREDIT_USD * 100) / 100;
export const reportsFor = (credits: number) => Math.floor(credits / REPORT_COST);
export const usdPerReport = (tier: Tier) => {
  const r = reportsFor(tier.credits);
  return r ? Math.round((tier.priceUsd / r) * 100) / 100 : 0;
};
export const getTier = (id: string): Tier | undefined => TIERS.find((t) => t.id === id);
