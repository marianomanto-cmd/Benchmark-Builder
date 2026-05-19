/**
 * Formatters numéricos rioplatenses — handoff §2.2.
 * Miles con punto · decimal con coma · espacio antes de % · currency prefijado con espacio.
 *
 * Estos helpers son la ÚNICA forma de mostrar un número en el producto.
 * Ningún componente debe hacer `n.toLocaleString` ni `n.toFixed` directo.
 */

const LOCALE = "es-AR";

export function formatNumber(
  value: number,
  options: { decimals?: number; compact?: boolean } = {},
): string {
  const { decimals = 0, compact = false } = options;
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

export function formatPercent(
  value: number,
  options: { decimals?: number; alreadyPercent?: boolean } = {},
): string {
  const { decimals = 1, alreadyPercent = false } = options;
  const n = alreadyPercent ? value : value * 100;
  // Espacio explícito antes del %: "41,3 %"
  return `${formatNumber(n, { decimals })} %`;
}

export function formatCurrency(
  value: number,
  options: { currency?: "USD" | "ARS" | "EUR"; decimals?: number } = {},
): string {
  const { currency = "USD", decimals = 2 } = options;
  return `${currency} ${formatNumber(value, { decimals })}`;
}

export function formatDelta(
  value: number,
  options: { decimals?: number } = {},
): { text: string; up: boolean } {
  const up = value >= 0;
  const sign = up ? "+" : "−";
  return {
    text: `${sign}${formatPercent(Math.abs(value), {
      decimals: options.decimals ?? 1,
    })}`,
    up,
  };
}

export function formatRange(
  min: number,
  max: number,
  options: { currency?: "USD" | "ARS" | "EUR"; compact?: boolean } = {},
): string {
  const { currency, compact } = options;
  const left = formatNumber(min, { compact });
  const right = formatNumber(max, { compact });
  // En-dash con espacios: "USD 8 – 12k"
  return currency ? `${currency} ${left} – ${right}` : `${left} – ${right}`;
}

/**
 * Tiempo relativo en español ("hace 4 h", "hace 12 min").
 * Para fechas absolutas usar date-fns con locale es directamente.
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "ahora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `hace ${day} d`;
  const week = Math.floor(day / 7);
  if (week < 4) return `hace ${week} sem`;
  const month = Math.floor(day / 30);
  if (month < 12) return `hace ${month} mes${month > 1 ? "es" : ""}`;
  const year = Math.floor(day / 365);
  return `hace ${year} año${year > 1 ? "s" : ""}`;
}
