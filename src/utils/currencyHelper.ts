/**
 * currencyHelper.ts
 * Centralized utility for Indian Rupee (₹ / INR) formatting and conversion.
 * Guarantees Indian Rupee pricing across the studio without accidental dollar signs.
 */

export const USD_TO_INR_RATE = 84;

/**
 * Converts a price into an integer INR amount.
 * If the value is a small unit (e.g., legacy USD database prices like 2, 3, 149),
 * it converts via USD_TO_INR_RATE (84).
 * If the value is already an INR price (>= 500), it returns the clean integer.
 */
export function toINR(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num) || num <= 0) return 0;

  // Values under 500 are legacy USD prices from initial catalog seeds (e.g. $2, $3, $149)
  if (num < 500) {
    return Math.round(num * USD_TO_INR_RATE);
  }
  return Math.round(num);
}

/**
 * Returns formatted Indian Rupee number string with Indian grouping (e.g. "1,49,000", "12,516", "252")
 */
export function formatINR(val: number | string | undefined | null): string {
  const inr = toINR(val);
  return inr.toLocaleString('en-IN');
}

/**
 * Returns formatted Rupee string with the ₹ symbol (e.g. "₹252", "₹12,516")
 */
export function formatRupee(val: number | string | undefined | null): string {
  return `₹${formatINR(val)}`;
}
