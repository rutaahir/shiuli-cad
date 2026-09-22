/**
 * imageHelper.ts
 * Centralized utility for resolving and providing fallbacks for jewelry CAD & luxury images.
 */
import type React from 'react';

// Curated high-resolution Unsplash jewelry images that are guaranteed to be active & fast-loading
export const VERIFIED_JEWELRY_IMAGES = {
  ring: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85',
  earrings: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=85',
  pendant: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85',
  necklace: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1000&q=85',
  bangle: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=85',
  bracelet: 'https://images.unsplash.com/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1000&q=85',
  nosepin: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85',
  mangalsutra: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85',
  general: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85',
  ai: 'https://images.unsplash.com/photo-1611591475140-be38b638ed3d?auto=format&fit=crop&w=1000&q=85',
};

/**
 * Returns a category-matched verified fallback image
 */
export function getCategoryFallbackImage(category?: string): string {
  if (!category) return VERIFIED_JEWELRY_IMAGES.ring;
  const c = category.toLowerCase();
  if (c.includes('ring')) return VERIFIED_JEWELRY_IMAGES.ring;
  if (c.includes('earring') || c.includes('jhumka')) return VERIFIED_JEWELRY_IMAGES.earrings;
  if (c.includes('pendant') || c.includes('medallion')) return VERIFIED_JEWELRY_IMAGES.pendant;
  if (c.includes('necklace') || c.includes('choker') || c.includes('riviera')) return VERIFIED_JEWELRY_IMAGES.necklace;
  if (c.includes('bangle') || c.includes('kada')) return VERIFIED_JEWELRY_IMAGES.bangle;
  if (c.includes('bracelet')) return VERIFIED_JEWELRY_IMAGES.bracelet;
  if (c.includes('nose')) return VERIFIED_JEWELRY_IMAGES.nosepin;
  if (c.includes('mangal') || c.includes('tanmaniya')) return VERIFIED_JEWELRY_IMAGES.mangalsutra;
  if (c.includes('ai') || c.includes('concept')) return VERIFIED_JEWELRY_IMAGES.ai;
  return VERIFIED_JEWELRY_IMAGES.ring;
}

/**
 * Normalizes raw image URLs from backend or mock data to valid, directly accessible URLs.
 * Automatically rewrites '/unsplash-img/' to direct 'https://images.unsplash.com/' so images
 * always load regardless of proxy configuration.
 */
export function getOptimizedImageUrl(src?: string | null, category?: string): string {
  if (!src || typeof src !== 'string' || src.trim() === '') {
    return getCategoryFallbackImage(category);
  }

  const trimmed = src.trim();

  // If already full HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Handle /unsplash-img/ proxy path
  // Let the Vite proxy handle it to add the required Referer headers and avoid hotlinking blocks
  if (trimmed.startsWith('/unsplash-img/')) {
    return trimmed;
  }

  // Handle django media files
  if (trimmed.startsWith('/media/')) {
    return `http://127.0.0.1:8000${trimmed}`;
  }

  // Relative public assets or root-relative paths
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Synthetic event handler for <img> onError
 */
export function handleImgError(e: React.SyntheticEvent<HTMLImageElement>, category?: string) {
  const target = e.currentTarget;
  const fallback = getCategoryFallbackImage(category);
  if (target.src !== fallback) {
    target.src = fallback;
  }
}
