// Parsing helpers for paid-ad metadata. Ad libraries report spend and
// impressions as opaque human strings ("USD 4k–8k", "€100-€499", "600k",
// "< $100"). To aggregate them (inversión / alcance comparativo) we parse those
// into numeric min/max. Pure & portable (no imports) — safe on client or server.

export type NumRange = { min?: number; max?: number; currency?: string };

const SUFFIX_MULT: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

// One numeric token, honoring k/m/b suffixes and thousands separators.
function parseToken(token: string): number | undefined {
  const m = token.match(/([\d][\d.,]*)\s*([kmb])?/i);
  if (!m) return undefined;
  const raw = m[1].replace(/,/g, "");
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const mult = m[2] ? SUFFIX_MULT[m[2].toLowerCase()] ?? 1 : 1;
  return n * mult;
}

function detectCurrency(s: string): string | undefined {
  if (/usd|\$/i.test(s)) return "USD";
  if (/eur|€/i.test(s)) return "EUR";
  if (/gbp|£/i.test(s)) return "GBP";
  if (/\bcop\b/i.test(s)) return "COP";
  if (/\bmxn\b/i.test(s)) return "MXN";
  return undefined;
}

// Parse a range/quantity string into { min, max, currency }. Handles single
// values ("600k" → min=max=600000), ranges with -, –, — or "to" separators,
// and one-sided bounds ("< $100", "≥ 1M"). Returns undefined when nothing
// numeric is found.
export function parseRange(input?: string | null): NumRange | undefined {
  if (!input) return undefined;
  const s = String(input).trim();
  if (!s) return undefined;
  const currency = detectCurrency(s);
  const parts = s.split(/\s*(?:–|—|-|to)\s*/i).filter(Boolean);
  const nums = parts.map(parseToken).filter((n): n is number => n != null);
  if (!nums.length) return undefined;

  let min: number | undefined;
  let max: number | undefined;
  if (/[<≤]/.test(s) && nums.length === 1) {
    max = nums[0];
  } else if (/[>≥]/.test(s) && nums.length === 1) {
    min = nums[0];
  } else if (nums.length === 1) {
    min = nums[0];
    max = nums[0];
  } else {
    min = Math.min(...nums);
    max = Math.max(...nums);
  }
  return { min, max, currency };
}
