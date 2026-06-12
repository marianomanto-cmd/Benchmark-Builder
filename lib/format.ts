// Numeral formatting — HANDOFF §2.2 (numerales en español rioplatense).
// Miles con punto (2.418), decimal con coma (41,3), % con espacio (41,3 %),
// currency prefijado con espacio (USD 1,84).

const esAR = "es-AR";

export function formatInt(n: number): string {
  return new Intl.NumberFormat(esAR, { maximumFractionDigits: 0 }).format(n);
}

export function formatDecimal(n: number, digits = 1): string {
  return new Intl.NumberFormat(esAR, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatPercent(n: number, digits = 1): string {
  return `${formatDecimal(n, digits)} %`;
}

export function formatUSD(n: number, digits = 2): string {
  return `USD ${formatDecimal(n, digits)}`;
}

// Compact form for big numbers: 842300 -> "842k", 1240000 -> "1,2M".
export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `${formatDecimal(n / 1_000_000, 1).replace(/,0$/, "")}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${Math.round(n / 1_000)}k`;
  }
  return formatInt(n);
}
