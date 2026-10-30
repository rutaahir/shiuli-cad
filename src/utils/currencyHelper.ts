/**
 * currencyHelper.ts
 * Centralized utility for currency conversion, formatting, and dual-layer display.
 * 
 * Studio Architectural Rule:
 * 1. Admin manages EVERYTHING authoritatively in base USD ($).
 * 2. Customers/clients view all product pricing, wallet floats, and credit lines
 *    in their country's local currency (INR ₹, GBP £, EUR €, AUD A$, CAD CA$, etc.).
 * 3. Dual Preview:
 *    - Admin sees USD ($) with customer equivalent preview (~ ₹INR).
 *    - Customers see local currency with USD reference ($ USD).
 */

export const USD_TO_INR_RATE = 86.85;

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 86.85,
  EUR: 0.93,
  GBP: 0.79,
  CAD: 1.38,
  AUD: 1.55,
  NZD: 1.68,
  SGD: 1.35,
  BDT: 121.50,
  NPR: 139.00,
  LKR: 295.00,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  JPY: 152.00,
  CHF: 0.88,
  MYR: 4.42,
  THB: 34.60,
  IDR: 15950.00,
  PHP: 58.20,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  NZD: 'NZ$',
  SGD: 'S$',
  BDT: '৳',
  NPR: 'रू',
  LKR: 'Rs',
  AED: 'د.إ',
  SAR: '﷼',
  QAR: 'QR',
  JPY: '¥',
  CHF: 'CHF',
  MYR: 'RM',
  THB: '฿',
  IDR: 'Rp',
  PHP: '₱',
};

/**
 * Converts an INR amount to clean USD amount rounded to 2 decimals.
 */
export function convertInrToUsd(inrVal: number | string | undefined | null): number {
  if (inrVal === undefined || inrVal === null || inrVal === '') return 0;
  const num = typeof inrVal === 'string' ? parseFloat(inrVal) : Number(inrVal);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round((num / USD_TO_INR_RATE) * 100) / 100;
}

/**
 * Formats a value strictly into USD ($) for Admin and base reference.
 */
export function formatUSD(val: number | string | undefined | null, isAlreadyUsd: boolean = true): string {
  if (val === undefined || val === null || val === '') return '$0.00';
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num) || num <= 0) return '$0.00';
  const usd = isAlreadyUsd ? num : num / USD_TO_INR_RATE;
  return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats amount into customer currency according to regional rules.
 */
export function formatCustomerAmount(
  amount: number | string | undefined | null,
  currencyCode: string = 'INR',
  symbol?: string
): string {
  if (amount === undefined || amount === null || amount === '') {
    const sym = symbol || CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || '$';
    return `${sym}0`;
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num) || num <= 0) {
    const sym = symbol || CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || '$';
    return `${sym}0`;
  }

  const cur = currencyCode.toUpperCase();
  const sym = symbol !== undefined ? symbol : (CURRENCY_SYMBOLS[cur] || '$');

  if (['INR', 'JPY', 'KRW', 'VND', 'IDR', 'BDT', 'NPR', 'LKR'].includes(cur)) {
    const rounded = Math.round(num);
    const formattedNum = cur === 'INR'
      ? rounded.toLocaleString('en-IN')
      : rounded.toLocaleString();
    return `${sym}${formattedNum}`;
  }

  return `${sym}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Converts a base USD amount to customer country currency.
 */
export function convertUsdToCustomer(
  usdVal: number | string | undefined | null,
  currencyCode: string = 'INR',
  customRate?: number
): {
  amount: number;
  display: string;
  displayWithUsd: string;
  currency: string;
  symbol: string;
  rate: number;
  usdAmount: number;
} {
  const usd = typeof usdVal === 'string' ? parseFloat(usdVal) : Number(usdVal || 0);
  const cleanUsd = isNaN(usd) ? 0 : Math.max(0, usd);
  const cur = (currencyCode || 'INR').toUpperCase();
  const sym = CURRENCY_SYMBOLS[cur] || '$';
  const rate = customRate || DEFAULT_EXCHANGE_RATES[cur] || 1.0;

  const rawConverted = cleanUsd * rate;
  let finalAmount = 0;
  if (['INR', 'JPY', 'KRW', 'VND', 'IDR', 'BDT', 'NPR', 'LKR'].includes(cur)) {
    finalAmount = Math.round(rawConverted);
  } else {
    finalAmount = Math.round(rawConverted * 100) / 100;
  }

  const display = formatCustomerAmount(finalAmount, cur, sym);
  const displayWithUsd = cur === 'USD'
    ? display
    : `${display} (${formatUSD(cleanUsd)} USD)`;

  return {
    amount: finalAmount,
    display,
    displayWithUsd,
    currency: cur,
    symbol: sym,
    rate,
    usdAmount: cleanUsd,
  };
}

/**
 * Converts a customer entered local currency amount (e.g. ₹5,000 INR) back to base USD.
 */
export function convertCustomerToUsd(
  customerVal: number | string | undefined | null,
  currencyCode: string = 'INR',
  customRate?: number
): {
  usdAmount: number;
  displayUsd: string;
  rate: number;
} {
  const localNum = typeof customerVal === 'string' ? parseFloat(customerVal) : Number(customerVal || 0);
  const cleanLocal = isNaN(localNum) ? 0 : Math.max(0, localNum);
  const cur = (currencyCode || 'INR').toUpperCase();
  const rate = customRate || DEFAULT_EXCHANGE_RATES[cur] || 1.0;

  const usd = rate > 0 ? Math.round((cleanLocal / rate) * 100) / 100 : 0;
  return {
    usdAmount: usd,
    displayUsd: formatUSD(usd),
    rate,
  };
}

/**
 * Admin helper: formats a base USD amount with customer equivalent preview.
 * Example: "$100.00 USD (~ ₹8,685 INR)"
 */
export function formatAdminWithCustomerPreview(
  usdVal: number | string | undefined | null,
  customerCurrency: string = 'INR',
  rate?: number
): string {
  const usd = typeof usdVal === 'string' ? parseFloat(usdVal) : Number(usdVal || 0);
  const cleanUsd = isNaN(usd) ? 0 : Math.max(0, usd);
  const usdStr = formatUSD(cleanUsd);
  const cur = (customerCurrency || 'INR').toUpperCase();
  if (cur === 'USD') return `${usdStr} USD`;

  const converted = convertUsdToCustomer(cleanUsd, cur, rate);
  return `${usdStr} USD (~ ${converted.display} ${cur})`;
}

/**
 * Explicitly converts a USD price into integer INR amount if needed.
 */
export function convertUsdToInr(usdVal: number | string | undefined | null, rate: number = USD_TO_INR_RATE): number {
  if (usdVal === undefined || usdVal === null || usdVal === '') return 0;
  const num = typeof usdVal === 'string' ? parseFloat(usdVal) : Number(usdVal);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * rate);
}

/**
 * Formats a value in INR. Converts USD if val is in USD.
 */
export function formatINR(val: number | string | undefined | null, isAlreadyInr: boolean = false): string {
  if (val === undefined || val === null || val === '') return '₹0';
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num) || num <= 0) return '₹0';
  const inr = isAlreadyInr ? num : (num * USD_TO_INR_RATE);
  return `₹${Math.round(inr).toLocaleString('en-IN')}`;
}

export function formatRupee(val: number | string | undefined | null): string {
  return formatINR(val, true);
}

export function toINR(val: number | string | undefined | null): number {
  return convertInrToUsd(val);
}
