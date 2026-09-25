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
  primary_image?: string | null;
  created_at: string;
}

export interface BackendStyle {
  id: number;
  name: string;
}

export interface CatalogState {
  categories: BackendCategory[];      // top-level only, with subcategories[]
  allCategories: BackendCategory[];   // flat list of every category/sub
  products: BackendProduct[];
  styles: BackendStyle[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
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
  flat.forEach((c) => catMap.set(c.id, c));

  // Build map: category id → parent category
  const parentMap = new Map<number, BackendCategory>();
  flat.forEach((c) => {
    if (c.parent !== null) {
      const parent = catMap.get(c.parent as number);
      if (parent) parentMap.set(c.id, parent);
    }
  });

  return products.map((p) => {
    const cat = catMap.get(p.category);
    const parent = parentMap.get(p.category); // parent of the sub-category (if any)
    const topLevelCat = parent ?? cat; // if this is already top-level, use itself
    return {
      ...p,
      category_slug: cat?.slug ?? '',          // exact category slug (may be sub-cat)
      parent_slug: topLevelCat?.slug ?? '',    // top-level parent slug
      category_name: cat?.name ?? p.category_name ?? '',
    };
  });
}

const FALLBACK_CATEGORIES: BackendCategory[] = [
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

export async function fetchCatalog(force = false): Promise<void> {
  const CACHE_TTL = 60_000; // 1 minute
  const now = Date.now();
  if (
    !force &&
    state.lastFetchedAt &&
    now - state.lastFetchedAt < CACHE_TTL &&
    state.products.length > 0
  ) {
    return;
  }

  if (fetchPromise) return fetchPromise;

  state = { ...state, isLoading: true };
  notify();

  fetchPromise = (async () => {
    try {
      const [catsRaw, stylesRaw, prodsRaw] = await Promise.all([
        api.getCategories(false).catch(() => null),
        api.getDesignStyles().catch(() => null),
        api.getProducts().catch(() => null),
      ]);

      let cats: BackendCategory[] = Array.isArray(catsRaw)
        ? catsRaw
        : (catsRaw as any)?.results ?? [];

      if (!cats || cats.length === 0) {
        cats = FALLBACK_CATEGORIES;
      }

      const styles: BackendStyle[] = Array.isArray(stylesRaw)
        ? stylesRaw
        : (stylesRaw as any)?.results ?? [];

      const rawProds: BackendProduct[] = prodsRaw?.results
        ? prodsRaw.results
        : Array.isArray(prodsRaw)
        ? prodsRaw
        : [];

      const flat = flattenCategories(cats);
      const products = enrichProducts(rawProds, flat);

      state = {
        categories: cats,
        allCategories: flat,
        products,
        styles,
        isLoading: false,
        isError: false,
        errorMessage: null,
        lastFetchedAt: Date.now(),
      };
    } catch (err: any) {
      console.warn('[catalogStore] using resilient fallback catalog:', err?.message);
      const flat = flattenCategories(FALLBACK_CATEGORIES);
      state = {
        ...state,
        categories: state.categories.length > 0 ? state.categories : FALLBACK_CATEGORIES,
        allCategories: state.allCategories.length > 0 ? state.allCategories : flat,
        isLoading: false,
        isError: false,
        errorMessage: null,
      };
    } finally {
      fetchPromise = null;
      notify();
    }
  })();

  return fetchPromise;
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

/** Invalidate cache so the next subscribe/fetchCatalog re-fetches */
export function invalidateCatalog() {
  state = { ...state, lastFetchedAt: null };
}
