/**
 * catalogStore.ts
 * A lightweight singleton store for catalog data (categories + products + styles).
 * Fetches once on first subscription, caches result, notifies all subscribers.
 */

import { api } from './api';

// ─── Raw backend shapes ─────────────────────────────────────────────────────

export interface BackendCategory {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  parent_name: string | null;
  display_order: number;
  subcategories: BackendCategory[];
  product_count: number;
  image?: string | null;
  image_url?: string | null;
  image_display?: string | null;
  tagline?: string | null;
}

export interface BackendProduct {
  id: number;
  title: string;
  slug: string;
  category: number;
  category_name: string;
  category_slug?: string;      // the sub-category's own slug
  parent_slug?: string;        // the top-level parent's slug (same as category_slug if already top-level)
  price: string | number;
  compare_at_price?: string | number | null;
  description: string;
  metal_weight_grams?: number | null;
  stone_count?: number;
  is_bestseller: boolean;
  is_new: boolean;
  status: string;
  style_tags?: any[];
  parent_category_id?: number | null;
  primary_image?: string | null;
  created_at: string;
}

export interface BackendStyle {
  id: number;
  name: string;
}

export interface CatalogErrorDetails {
  categories?: string | null;
  styles?: string | null;
  products?: string | null;
}

export interface CatalogState {
  categories: BackendCategory[];      // top-level only, with subcategories[]
  allCategories: BackendCategory[];   // flat list of every category/sub
  products: BackendProduct[];
  styles: BackendStyle[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  errorDetails?: CatalogErrorDetails | null;
  lastFetchedAt: number | null;
}

// ─── Store implementation ───────────────────────────────────────────────────

type Listener = (state: CatalogState) => void;

let state: CatalogState = {
  categories: [],
  allCategories: [],
  products: [],
  styles: [],
  isLoading: true,
  isError: false,
  errorMessage: null,
  errorDetails: null,
  lastFetchedAt: null,
};

const listeners = new Set<Listener>();
let fetchPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((fn) => fn({ ...state }));
}

/** Flatten nested categories into a flat array */
function flattenCategories(cats: BackendCategory[]): BackendCategory[] {
  const result: BackendCategory[] = [];
  function walk(list: BackendCategory[]) {
    list.forEach((c) => {
      result.push(c);
      if (c.subcategories?.length) walk(c.subcategories);
    });
  }
  walk(cats);
  return result;
}

/** Attach category_slug and parent_slug to each product by matching category id */
function enrichProducts(products: BackendProduct[], flat: BackendCategory[]): BackendProduct[] {
  // Build map: category id → category object
  const catMap = new Map<number, BackendCategory>();
  flat.forEach((c) => catMap.set(Number(c.id), c));

  // Build map: category id → parent category
  const parentMap = new Map<number, BackendCategory>();
  flat.forEach((c) => {
    if (c.parent !== null && c.parent !== undefined) {
      const parent = catMap.get(Number(c.parent));
      if (parent) parentMap.set(Number(c.id), parent);
    }
  });

  return products.map((p) => {
    const cat = catMap.get(Number(p.category));
    const parent = parentMap.get(Number(p.category));
    return {
      ...p,
      category_slug: p.category_slug || cat?.slug || '',
      parent_slug: (p as any).parent_category_slug || parent?.slug || (cat && !cat.parent ? cat.slug : ''),
      category_name: p.category_name || cat?.name || '',
      parent_category_id: (p as any).parent_category_id ?? (parent ? parent.id : null),
    };
  });
}

export const FALLBACK_CATEGORIES: BackendCategory[] = [
  {
    id: 1,
    name: 'Rings',
    slug: 'rings',
    parent: null,
    parent_name: null,
    display_order: 1,
    product_count: 5,
    subcategories: [
      { id: 2, name: 'Solitaire Rings', slug: 'solitaire-rings', parent: 1, parent_name: 'Rings', display_order: 1, product_count: 1, subcategories: [] },
      { id: 3, name: 'Band Rings', slug: 'band-rings', parent: 1, parent_name: 'Rings', display_order: 2, product_count: 0, subcategories: [] }
    ]
  },
  {
    id: 6,
    name: 'Earrings',
    slug: 'earrings',
    parent: null,
    parent_name: null,
    display_order: 2,
    product_count: 3,
    subcategories: []
  },
  {
    id: 4,
    name: 'Necklaces',
    slug: 'necklaces',
    parent: null,
    parent_name: null,
    display_order: 3,
    product_count: 4,
    subcategories: [
      { id: 5, name: 'Pendants', slug: 'pendants', parent: 4, parent_name: 'Necklaces', display_order: 1, product_count: 1, subcategories: [] }
    ]
  },
  {
    id: 7,
    name: 'Bracelets & Bangles',
    slug: 'bracelets-bangles',
    parent: null,
    parent_name: null,
    display_order: 4,
    product_count: 3,
    subcategories: []
  },
  {
    id: 17,
    name: 'Bangles',
    slug: 'bangles',
    parent: null,
    parent_name: null,
    display_order: 5,
    product_count: 2,
    subcategories: []
  },
  {
    id: 18,
    name: 'Bracelets',
    slug: 'bracelets',
    parent: null,
    parent_name: null,
    display_order: 6,
    product_count: 2,
    subcategories: []
  },
  {
    id: 19,
    name: 'Nosepins',
    slug: 'nosepins',
    parent: null,
    parent_name: null,
    display_order: 7,
    product_count: 1,
    subcategories: []
  },
  {
    id: 20,
    name: 'Mangalsutra',
    slug: 'mangalsutra',
    parent: null,
    parent_name: null,
    display_order: 8,
    product_count: 1,
    subcategories: []
  }
];

function formatErrorReason(reason: unknown): string {
  if (!reason) return 'Unknown error';
  if (typeof reason === 'string') return reason;
  if (typeof reason === 'object') {
    const err = reason as Record<string, unknown>;
    const status = err.status || (err.response as Record<string, unknown> | undefined)?.status;
    const msg = (err.message as string) || (err.statusText as string) || '';
    if (status && msg) return `HTTP ${status}: ${msg}`;
    if (status) return `HTTP ${status}`;
    if (msg) return msg;
  }
  return String(reason);
}

export async function fetchCatalog(force = false): Promise<void> {
  const CACHE_TTL = 60_000; // 1 minute
  const now = Date.now();
  if (
    !force &&
    !state.isError &&
    state.lastFetchedAt &&
    now - state.lastFetchedAt < CACHE_TTL &&
    state.products.length > 0
  ) {
    return;
  }

  if (fetchPromise) return fetchPromise;

  // On retry/force, clear any prior error message immediately to show in-flight retry
  state = {
    ...state,
    isLoading: true,
    ...(force ? { isError: false, errorMessage: null, errorDetails: null } : {}),
  };
  notify();

  fetchPromise = (async () => {
    try {
      const [catsResult, stylesResult, prodsResult] = await Promise.allSettled([
        api.getCategories(false),
        api.getDesignStyles(),
        api.getProducts({ page_size: '500' }),
      ]);

      const errors: CatalogErrorDetails = {};
      const errorMessages: string[] = [];

      if (catsResult.status === 'rejected') {
        const formatted = formatErrorReason(catsResult.reason);
        errors.categories = formatted;
        errorMessages.push(`Categories: ${formatted}`);
      }

      if (stylesResult.status === 'rejected') {
        const formatted = formatErrorReason(stylesResult.reason);
        errors.styles = formatted;
        errorMessages.push(`Styles: ${formatted}`);
      }

      if (prodsResult.status === 'rejected') {
        const formatted = formatErrorReason(prodsResult.reason);
        errors.products = formatted;
        errorMessages.push(`Products: ${formatted}`);
      }

      // Handle categories: update on success, keep stale on error. Never inject dummy data on failure.
      let nextCategories = state.categories;
      let nextAllCategories = state.allCategories;

      if (catsResult.status === 'fulfilled') {
        const catsRaw = catsResult.value;
        const parsedCats: BackendCategory[] = Array.isArray(catsRaw)
          ? catsRaw
          : (catsRaw as any)?.results ?? [];
        nextCategories = parsedCats;
        nextAllCategories = flattenCategories(parsedCats);
      } else {
        // Optional explicit flag for offline dev mode only; default is disabled
        const meta = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string | undefined> }) : undefined;
        const enableDevFallback = meta?.env?.VITE_ENABLE_CATALOG_FALLBACK === 'true';
        if (enableDevFallback && nextCategories.length === 0) {
          nextCategories = FALLBACK_CATEGORIES;
          nextAllCategories = flattenCategories(FALLBACK_CATEGORIES);
        }
      }

      // Handle styles: update on success, keep stale on error
      let nextStyles = state.styles;
      if (stylesResult.status === 'fulfilled') {
        const stylesRaw = stylesResult.value;
        nextStyles = Array.isArray(stylesRaw)
          ? stylesRaw
          : (stylesRaw as any)?.results ?? [];
      }

      let nextProducts = state.products;
      if (prodsResult.status === 'fulfilled') {
        const prodsRaw = prodsResult.value;
        const rawProds: BackendProduct[] = prodsRaw?.results
          ? prodsRaw.results
          : Array.isArray(prodsRaw)
          ? prodsRaw
          : [];
        // Only keep approved products in public catalog store
        const approvedProds = rawProds.filter((p: any) => {
          const st = (p.status || '').toLowerCase();
          return st === 'approved' || st === 'published';
        });
        nextProducts = enrichProducts(approvedProds, nextAllCategories);
      }

      const hasError = errorMessages.length > 0;
      const combinedErrorMessage = hasError ? errorMessages.join('; ') : null;

      state = {
        categories: nextCategories,
        allCategories: nextAllCategories,
        products: nextProducts,
        styles: nextStyles,
        isLoading: false,
        isError: hasError,
        errorMessage: combinedErrorMessage,
        errorDetails: hasError ? errors : null,
        lastFetchedAt: !hasError || (catsResult.status === 'fulfilled' || prodsResult.status === 'fulfilled') ? Date.now() : state.lastFetchedAt,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[catalogStore] unexpected fetchCatalog error:', message);
      state = {
        ...state,
        isLoading: false,
        isError: true,
        errorMessage: `Catalog service error: ${message}`,
        errorDetails: {
          categories: message,
          styles: message,
          products: message,
        },
      };
    } finally {
      state = {
        ...state,
        isLoading: false,
      };
      fetchPromise = null;
      notify();
    }
  })();

  return fetchPromise;
}

export function retryCatalog(): Promise<void> {
  return fetchCatalog(true);
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn({ ...state }); // immediate snapshot
  fetchCatalog();   // trigger fetch if needed
  return () => listeners.delete(fn);
}

export function getSnapshot(): CatalogState {
  return { ...state };
}

/** Invalidate cache and immediately re-fetch to notify all subscribers */
export function invalidateCatalog() {
  state = { ...state, lastFetchedAt: null };
  fetchCatalog(true);
}
