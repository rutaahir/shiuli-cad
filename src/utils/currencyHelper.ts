/**
 * currencyHelper.ts
 * Centralized utility for Indian Rupee (₹ / INR) formatting and conversion.
 * Guarantees Indian Rupee pricing across the studio without accidental dollar signs.
 */

export const USD_TO_INR_RATE = 86.85;

/**
 * Converts a price into a clean integer INR amount.
 * Does NOT blindly multiply numbers under 500 by 84/86.85.
 */
export function toINR(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num);
}

/**
 * Explicitly converts a USD price into integer INR amount.
 */
export function convertUsdToInr(usdVal: number | string | undefined | null, rate: number = USD_TO_INR_RATE): number {
  if (usdVal === undefined || usdVal === null || usdVal === '') return 0;
  const num = typeof usdVal === 'string' ? parseFloat(usdVal) : Number(usdVal);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * rate);
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
