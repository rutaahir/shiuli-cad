/**
 * useCatalog.ts
 * React hook that subscribes to the catalogStore singleton.
 */

import { useState, useEffect } from 'react';
import {
  subscribe,
  getSnapshot,
  fetchCatalog,
  CatalogState,
  BackendProduct,
  BackendCategory,
} from '../services/catalogStore';

export type { CatalogState, BackendProduct, BackendCategory };

export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>(getSnapshot);

  useEffect(() => {
    const unsubscribe = subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
}

/** Helper: convert a BackendProduct to the legacy Product interface shape used by CartDrawer / QuickView */
export function toProductShape(bp: BackendProduct) {
  const FALLBACK_IMG =
    '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80';
  return {
    id: bp.slug || String(bp.id),
    title: bp.title,
    category: bp.category_name || '',
    subcategory: '',
    price: Number(bp.price) || 0,
    originalPrice: bp.compare_at_price ? Number(bp.compare_at_price) : undefined,
    formats: ['3DM', 'STL', 'Render'] as any,
    images: [bp.primary_image || FALLBACK_IMG],
    primaryImage: bp.primary_image || FALLBACK_IMG,
    description: bp.description || '',
    shortDescription: 'High precision 3DM + STL CAD model.',
    tags: [bp.is_bestseller ? 'Bestseller' : '', bp.is_new ? 'New' : ''].filter(Boolean),
    rating: 5.0,
    reviewsCount: 1,
    isBestseller: bp.is_bestseller,
    isNew: bp.is_new,
    specs: {
      metalWeight18k: bp.metal_weight_grams ? `${bp.metal_weight_grams} gm` : '—',
      metalWeight14k: '—',
      diamondCount: bp.stone_count || 0,
      diamondTotalWeight: '—',
      dimensions: '—',
      meshTriangles: '—',
      tolerance: '±0.01 mm',
    },
  };
}

export { fetchCatalog };
