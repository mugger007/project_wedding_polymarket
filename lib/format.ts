/*
 * Shared display formatting helpers for ECY currency, percentages, and safe numeric casts.
 */
// Formats numeric balances into a user-friendly ECY currency string.
export function formatECY(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)} ECY`;
}

// Converts a 0..1 probability value into a percentage label.
export function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

// Safely coerces unknown input into a finite number with a zero fallback.
export function toNumber(input: unknown) {
  const n = Number(input);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return n;
}
