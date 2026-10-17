/**
 * countryContext.ts
 * Centralized client-side country detection, currency management, and tier resolution.
 * Supports:
 * - Authoritative backend sync with /api/catalog/country-context/
 * - 5 pricing groups (Base Country, Tier 1, Tier 2, Tier 3, Rest of the World)
 * - Safe fallback to existing global pricing for legacy products
 * - LocalStorage persistence and cross-tab/cross-component reactive broadcast
 */

import { useState, useEffect } from 'react';
import { Product } from '../types';
import { formatINR } from './currencyHelper';

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  flag: string;
}

export interface CountryContextState {
  country: string;
  countryName: string;
  currency: string;
  symbol: string;
  flag: string;
  exchangeRate: number;
  rates: Record<string, number>;
  supportedCountries: CountryInfo[];
  isLoading: boolean;
}

// Fallback supported country list
export const FALLBACK_COUNTRIES: CountryInfo[] = [
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', flag: '🇮🇳' },
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'CA$', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$', flag: '🇸🇬' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', symbol: '৳', flag: '🇧🇩' },
  { code: 'NP', name: 'Nepal', currency: 'NPR', symbol: 'रू', flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', symbol: 'Rs', flag: '🇱🇰' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€', flag: '🇩🇪' },
  { code: 'FR', name: 'France', currency: 'EUR', symbol: '€', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', currency: 'EUR', symbol: '€', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', currency: 'JPY', symbol: '¥', flag: '🇯🇵' },
];

export const FALLBACK_RATES: Record<string, number> = {
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
  JPY: 152.00,
};

let globalCountryState: CountryContextState = {
  country: 'IN',
  countryName: 'India',
  currency: 'INR',
  symbol: '₹',
  flag: '🇮🇳',
  exchangeRate: 86.85,
  rates: { ...FALLBACK_RATES },
  supportedCountries: [...FALLBACK_COUNTRIES],
  isLoading: false,
};

const listeners = new Set<(state: CountryContextState) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...globalCountryState }));
}

/** Helper to guess country code from browser timezone and locale */
function guessCountryFromBrowser(): string {
  try {
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
    if (tz.includes('kolkata') || tz.includes('calcutta') || tz.includes('india')) return 'IN';
    if (tz.includes('new_york') || tz.includes('chicago') || tz.includes('los_angeles') || tz.includes('denver') || tz.includes('phoenix')) return 'US';
    if (tz.includes('london')) return 'GB';
    if (tz.includes('sydney') || tz.includes('melbourne') || tz.includes('brisbane') || tz.includes('perth') || tz.includes('adelaide')) return 'AU';
    if (tz.includes('toronto') || tz.includes('vancouver') || tz.includes('montreal') || tz.includes('edmonton')) return 'CA';
    if (tz.includes('auckland') || tz.includes('christchurch')) return 'NZ';
    if (tz.includes('singapore')) return 'SG';
    if (tz.includes('dubai')) return 'AE';
    if (tz.includes('tokyo')) return 'JP';
    if (tz.includes('dhaka')) return 'BD';
    if (tz.includes('kathmandu')) return 'NP';
    if (tz.includes('colombo')) return 'LK';
    if (tz.includes('berlin') || tz.includes('frankfurt')) return 'DE';
    if (tz.includes('paris')) return 'FR';
    if (tz.includes('rome')) return 'IT';

    // Fallback: Check navigator.languages
    const lang = (navigator.language || '').toUpperCase();
    if (lang.includes('-IN')) return 'IN';
    if (lang.includes('-US')) return 'US';
    if (lang.includes('-GB')) return 'GB';
    if (lang.includes('-AU')) return 'AU';
    if (lang.includes('-CA')) return 'CA';
    if (lang.includes('-NZ')) return 'NZ';
    if (lang.includes('-SG')) return 'SG';
    if (lang.includes('-AE')) return 'AE';
  } catch {
    // ignore
  }
  return 'IN';
}

/** Automatic Geo-IP detection */
async function autoDetectCustomerCountry(): Promise<string> {
  // 1. Try real-time fast Geo-IP lookup
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://api.country.is/', { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.country === 'string' && data.country.trim().length === 2) {
        const detected = data.country.trim().toUpperCase();
        localStorage.setItem('shiuli_customer_country', detected);
        return detected;
      }
    }
  } catch {
    // GeoIP fetch timed out or offline, proceed to fallback
  }

  // 2. Check cached country in localStorage
  const saved = localStorage.getItem('shiuli_customer_country');
  if (saved && saved.length === 2) {
    return saved.toUpperCase();
  }

  // 3. Fallback to Browser Timezone & Locale
  const guessed = guessCountryFromBrowser();
  localStorage.setItem('shiuli_customer_country', guessed);
  return guessed;
}

/** Initialize state automatically via Geo-IP and backend context */
export async function initCountryContext(): Promise<void> {
  globalCountryState.isLoading = true;
  notifyListeners();

  const detectedCountry = await autoDetectCustomerCountry();

  try {
    const res = await fetch(`/api/catalog/country-context/?country=${encodeURIComponent(detectedCountry)}`);
    if (res.ok) {
      const data = await res.json();
      const finalCountry = data.country || detectedCountry;
      globalCountryState = {
        country: finalCountry,
        countryName: data.country_name || 'India',
        currency: data.currency || 'INR',
        symbol: data.symbol || '₹',
        flag: data.flag || '🇮🇳',
        exchangeRate: data.exchange_rate || 86.85,
        rates: data.exchange_rates || FALLBACK_RATES,
        supportedCountries: data.supported_countries || FALLBACK_COUNTRIES,
        isLoading: false,
      };
      localStorage.setItem('shiuli_customer_country', finalCountry);
      notifyListeners();
      return;
    }
  } catch (err) {
    console.warn('[CountryContext] Backend context fetch notice:', err);
  }

  // Fallback if network offline
  const match = FALLBACK_COUNTRIES.find((c) => c.code === detectedCountry) || FALLBACK_COUNTRIES[0];
  globalCountryState = {
    ...globalCountryState,
    country: match.code,
    countryName: match.name,
    currency: match.currency,
    symbol: match.symbol,
    flag: match.flag,
    exchangeRate: FALLBACK_RATES[match.currency] || 1.0,
    isLoading: false,
  };
  localStorage.setItem('shiuli_customer_country', match.code);
  notifyListeners();
}

/** Explicitly change the selected country */
export function setCustomerCountry(countryCode: string): void {
  const code = (countryCode || 'IN').toUpperCase().trim();
  localStorage.setItem('shiuli_customer_country', code);

  const matched = globalCountryState.supportedCountries.find((c) => c.code === code) ||
    FALLBACK_COUNTRIES.find((c) => c.code === code);

  const targetCurrency = matched ? matched.currency : 'USD';
  const targetSymbol = matched ? matched.symbol : '$';
  const targetFlag = matched ? matched.flag : '🌐';
  const targetName = matched ? matched.name : `Country (${code})`;
  const targetRate = globalCountryState.rates[targetCurrency] || FALLBACK_RATES[targetCurrency] || 1.0;

  globalCountryState = {
    ...globalCountryState,
    country: code,
    countryName: targetName,
    currency: targetCurrency,
    symbol: targetSymbol,
    flag: targetFlag,
    exchangeRate: targetRate,
  };

  notifyListeners();

  // Trigger optional global event for any decoupled listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shiuli:country_changed', { detail: { country: code } }));
  }
}

/**
 * Resolves product pricing according to 5 groups or global fallback.
 * Authoritative:
 * - If product is in global mode: uses product.price in INR (preserves existing store behavior).
 * - If product is in regional mode: checks Base Country, Tier 1, Tier 2, Tier 3, or Rest of the World,
 *   retrieves the tier USD price, and converts it to current customer currency.
 */
export interface PriceDisplayResult {
  display: string;
  rawAmount: number;
  amount: number;
  currency: string;
  symbol: string;
  tierName?: string;
  isRegional: boolean;
  priceUsd: number;
  originalDisplay?: string;
  savingsDisplay?: string;
}

/**
 * Resolves product pricing according to 5 groups or global fallback.
 * Authoritative:
 * - If product is in global mode: uses product.price in INR (preserves existing store behavior).
 * - If product is in regional mode: checks Base Country, Tier 1, Tier 2, Tier 3, or Rest of the World,
 *   retrieves the tier USD price, and converts it to current customer currency.
 */
/**
 * Format any numeric currency amount into proper localized currency string.
 */
export function formatCurrencyAmount(
  amount: number | string | undefined | null,
  currencyCode?: string,
  symbol?: string
): string {
  if (amount === undefined || amount === null || amount === '') return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return '0';

  const cur = (currencyCode || globalCountryState.currency || 'INR').toUpperCase();
  const sym = symbol !== undefined ? symbol : (globalCountryState.symbol || (cur === 'INR' ? '₹' : '$'));

  if (['INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(cur)) {
    const rounded = Math.round(num);
    return `${sym}${rounded.toLocaleString('en-IN')}`;
  }

  const rounded = Math.round(num * 100) / 100;
  return `${sym}${rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Resolves product pricing according to 5 groups or global fallback.
 * Authoritative:
 * - Admin enters prices in USD.
 * - Converts USD price into customer country's local currency based on exchange rate.
 * - In India: shows in Rupee (₹ INR).
 * - In other countries: shows in local currency (USD, GBP, EUR, CAD, AUD, etc.).
 */
export function resolveDisplayPrice(
  product: Product | { price: number | string; originalPrice?: number; compare_at_price?: any; pricing_mode?: string; regional_pricing?: any; [key: string]: any },
  licenseType: 'standard' | 'commercial' | string = 'standard',
  forcedCountryCode?: string,
  forcedRates?: Record<string, number>
): PriceDisplayResult {
  const currentCountry = (forcedCountryCode || globalCountryState.country || 'IN').toUpperCase();
  const currentCurrency = globalCountryState.currency || 'INR';
  const currentSymbol = globalCountryState.symbol || '₹';
  const ratesTable = forcedRates || globalCountryState.rates;
  const currentRate = ratesTable[currentCurrency] || globalCountryState.exchangeRate || 1.0;

  const isCommercial = licenseType === 'commercial';
  const commercialMarkup = 1.8; // +80%

  // ── CASE A: Global Pricing Mode (Default) ─────────────────────────────────
  if (product.pricing_mode !== 'regional') {
    const usdPrice = Number(product.price) || 0;
    const finalUsd = isCommercial ? Math.round(usdPrice * commercialMarkup * 100) / 100 : usdPrice;
    const converted = finalUsd * currentRate;

    let displayStr = '';
    let finalRaw = 0;

    if (['INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(currentCurrency)) {
      finalRaw = Math.round(converted);
      displayStr = `${currentSymbol}${finalRaw.toLocaleString('en-IN')}`;
    } else {
      finalRaw = Math.round(converted * 100) / 100;
      displayStr = `${currentSymbol}${finalRaw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    let origDisplay: string | undefined;
    let savingsDisplay: string | undefined;

    const rawOrigUsd = Number(product.originalPrice || (product as any).compare_at_price) || 0;
    if (rawOrigUsd > 0) {
      const origUsd = isCommercial ? Math.round(rawOrigUsd * commercialMarkup * 100) / 100 : rawOrigUsd;
      const origConverted = origUsd * currentRate;
      const origRaw = ['INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(currentCurrency)
        ? Math.round(origConverted)
        : Math.round(origConverted * 100) / 100;

      origDisplay = ['INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(currentCurrency)
        ? `${currentSymbol}${origRaw.toLocaleString('en-IN')}`
        : `${currentSymbol}${origRaw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      if (origRaw > finalRaw) {
        savingsDisplay = ['INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(currentCurrency)
          ? `${currentSymbol}${(origRaw - finalRaw).toLocaleString('en-IN')}`
          : `${currentSymbol}${(origRaw - finalRaw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    return {
      display: displayStr,
      rawAmount: finalRaw,
      amount: finalRaw,
      currency: currentCurrency,
      symbol: currentSymbol,
      tierName: 'Standard Catalog',
      isRegional: false,
      priceUsd: finalUsd,
      originalDisplay: origDisplay,
      savingsDisplay: savingsDisplay,
    };
  }

  // ── CASE B: Country-Based Tier Pricing (5 Groups) ─────────────────────────
  const regionalCfg = product.regional_pricing || {};
  const baseTier = regionalCfg.base_tier;
  const tier1 = regionalCfg.tier_1;
  const tier2 = regionalCfg.tier_2;
  const tier3 = regionalCfg.tier_3;
  const restOfWorld = regionalCfg.rest_of_world;

  let selectedTierName = restOfWorld?.name || 'Rest of the World';
  let usdPrice = Number(restOfWorld?.price_usd ?? 15.0);

  // Check explicit tiers
  if (baseTier?.countries && baseTier.countries.includes(currentCountry)) {
    selectedTierName = baseTier.name || 'Base Country';
    usdPrice = Number(baseTier.price_usd);
  } else if (tier1?.countries && tier1.countries.includes(currentCountry)) {
    selectedTierName = tier1.name || 'Tier 1';
    usdPrice = Number(tier1.price_usd);
  } else if (tier2?.countries && tier2.countries.includes(currentCountry)) {
    selectedTierName = tier2.name || 'Tier 2';
    usdPrice = Number(tier2.price_usd);
  } else if (tier3?.countries && tier3.countries.includes(currentCountry)) {
    selectedTierName = tier3.name || 'Tier 3';
    usdPrice = Number(tier3.price_usd);
  }

  // Commercial license markup (+80%)
  const finalUsd = isCommercial ? usdPrice * commercialMarkup : usdPrice;
  const converted = finalUsd * currentRate;

  let displayStr = '';
  let finalRaw = 0;

  if (['INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(currentCurrency)) {
    finalRaw = Math.round(converted);
    displayStr = `${currentSymbol}${finalRaw.toLocaleString('en-IN')}`;
  } else {
    finalRaw = Math.round(converted * 100) / 100;
    displayStr = `${currentSymbol}${finalRaw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Calculate optional comparison/original display if product has originalPrice
  let origDisplay: string | undefined;
  let savingsDisplay: string | undefined;

  if (product.originalPrice && product.originalPrice > 0) {
    const origUsd = isCommercial ? (usdPrice * 1.3) * commercialMarkup : usdPrice * 1.3;
    const origConverted = origUsd * currentRate;
    const origRaw = ['INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(currentCurrency)
      ? Math.round(origConverted)
      : Math.round(origConverted * 100) / 100;
    origDisplay = ['INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(currentCurrency)
      ? `${currentSymbol}${origRaw.toLocaleString('en-IN')}`
      : `${currentSymbol}${origRaw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    savingsDisplay = ['INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(currentCurrency)
      ? `${currentSymbol}${Math.max(0, origRaw - finalRaw).toLocaleString('en-IN')}`
      : `${currentSymbol}${Math.max(0, origRaw - finalRaw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return {
    display: displayStr,
    rawAmount: finalRaw,
    amount: finalRaw,
    currency: currentCurrency,
    symbol: currentSymbol,
    tierName: selectedTierName,
    isRegional: true,
    priceUsd: finalUsd,
    originalDisplay: origDisplay,
    savingsDisplay: savingsDisplay,
  };
}

/** React hook for components to access customer country and price formatting */
export function useCustomerCountry() {
  const [state, setState] = useState<CountryContextState>(globalCountryState);

  useEffect(() => {
    listeners.add(setState);
    // On initial mount, trigger background context fetch if not yet initialized
    if (globalCountryState.supportedCountries.length <= FALLBACK_COUNTRIES.length) {
      initCountryContext();
    }
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    currentCountry: {
      code: state.country,
      name: state.countryName,
      currency: state.currency,
      symbol: state.symbol,
      flag: state.flag,
    },
    availableCountries: state.supportedCountries,
    isDetecting: state.isLoading,
    exchangeRates: state.rates,
    setCountry: setCustomerCountry,
    formatPrice: (product: Product, licenseType?: 'standard' | 'commercial') =>
      resolveDisplayPrice(product, licenseType),
  };
}

