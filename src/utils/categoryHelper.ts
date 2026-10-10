/**
 * categoryHelper.ts
 * Normalization, sanitization, and curated main category extraction.
 * Filters out test/garbage categories (e.g. "Nose Pins Test", "xyz", "PANDENT")
 * and provides clean, luxury-standard main categories for homepage & catalog.
 */

export interface CleanCategory {
  id: number | string;
  name: string;
  slug: string;
  image?: string;
  image_display?: string;
  image_url?: string;
  tagline?: string;
  product_count?: number;
  subcategories?: any[];
}

// Canonical fine jewellery main categories in luxury presentation order
export const CANONICAL_MAIN_CATEGORIES: { name: string; slug: string; image: string }[] = [
  {
    name: 'Rings',
    slug: 'rings',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Earrings',
    slug: 'earrings',
    image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Necklaces',
    slug: 'necklaces',
    image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Pendants',
    slug: 'pendants',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Bracelets & Bangles',
    slug: 'bracelets-bangles',
    image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Mangalsutra',
    slug: 'mangalsutra',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Nose Pins',
    slug: 'nosepins',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Polki Jewellery',
    slug: 'polki-jewellery',
    image: 'https://images.unsplash.com/photo-1611591475140-be38b638ed3d?auto=format&fit=crop&w=1000&q=85',
  },
];

/**
 * Checks if a category name or slug is an unwanted test, temporary, or junk entry
 */
export function isJunkCategory(nameOrSlug?: string | null): boolean {
  if (!nameOrSlug) return true;
  const s = nameOrSlug.toLowerCase().trim();
  if (
    s.includes('test') ||
    s.includes('xyz') ||
    s.includes('demo') ||
    s.includes('sample') ||
    s.includes('dummy') ||
    s.includes('temp') ||
    s === 'boll( pada)' ||
    s === 'boll' ||
    s === 'abcd'
  ) {
    return true;
  }
  return false;
}

/**
 * Formats a category name to clean luxury title case and corrects known typos
 */
export function formatCategoryName(rawName?: string | null): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'pandent' || lower === 'pendant') return 'Pendants';
  if (lower === 'nosepin' || lower === 'nosepins' || lower.includes('nose pin')) return 'Nose Pins';
  if (lower.includes('polki')) return 'Polki Jewellery';
  if (lower === 'mangalsutra' || lower === 'mangalsutras') return 'Mangalsutra';
  if (lower === 'bracelet' || lower === 'bracelets') return 'Bracelets';
  if (lower === 'bangle' || lower === 'bangles') return 'Bangles';
  if (lower.includes('bracelet') && lower.includes('bangle')) return 'Bracelets & Bangles';
  if (lower.includes('chain') && lower.includes('bracelet')) return 'Chains & Bracelets';

  // Capitalize words properly
  return trimmed
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

/**
 * Filters and sanitizes raw categories from API to return only clean, legitimate MAIN categories.
 * Removes test categories and duplicates.
 */
/**
 * Checks if a category has at least 1 product assigned to it
 * (either assigned directly to the category, or to any of its subcategories).
 */
export function hasProductsInCategory(category: any, products: any[] = []): boolean {
  if (!category || !products || products.length === 0) return false;
  return products.some((p) => isProductInCategory(p, category.slug, category));
}

/**
 * Filters and sanitizes raw categories from API to return only clean, legitimate MAIN categories.
 * When `products` is supplied, ONLY categories with at least 1 live product are returned.
 * Categories with 0 products will show only in Admin!
 */
export function getSanitizedCategories(rawCats: any[] = [], products?: any[]): CleanCategory[] {
  const seenSlugs = new Set<string>();
  const seenNames = new Set<string>();
  const cleanList: CleanCategory[] = [];

  for (const cat of rawCats) {
    if (!cat) continue;

    // Strictly skip subcategories (any category with a parent)
    if (cat.parent !== null && cat.parent !== undefined) continue;

    const name = formatCategoryName(cat.name);
    const slug = (cat.slug || cat.id || '').toLowerCase().trim();

    // Skip junk or test categories
    if (isJunkCategory(name) || isJunkCategory(slug)) continue;

    // If products array is provided, ONLY include categories that actually have at least 1 product
    if (products && products.length > 0) {
      if (!hasProductsInCategory(cat, products)) {
        continue;
      }
    }

    // Normalizing slug key for deduplication
    let canonicalKey = slug;
    if (slug.includes('ring') && !slug.includes('earring')) canonicalKey = 'rings';
    else if (slug.includes('earring')) canonicalKey = 'earrings';
    else if (slug.includes('pendant') || slug.includes('pandent')) canonicalKey = 'pendants';
    else if (slug.includes('necklace')) canonicalKey = 'necklaces';
    else if (slug.includes('bracelet') || slug.includes('bangle')) canonicalKey = 'bracelets-bangles';
    else if (slug.includes('nose')) canonicalKey = 'nosepins';
    else if (slug.includes('mangal')) canonicalKey = 'mangalsutra';
    else if (slug.includes('polki')) canonicalKey = 'polki-jewellery';

    const normalizedName = formatCategoryName(name);

    // Skip redundant / duplicate categories if we already have the main category
    if (seenNames.has(normalizedName.toLowerCase())) continue;

    seenNames.add(normalizedName.toLowerCase());
    seenSlugs.add(canonicalKey);

    const prodCount = products ? products.filter((p) => isProductInCategory(p, cat.slug || slug, cat)).length : (cat.product_count ?? 0);

    cleanList.push({
      ...cat,
      name: normalizedName,
      slug: cat.slug || canonicalKey,
      product_count: prodCount,
    });
  }

  return cleanList;
}

/**
 * Returns the curated list of MAIN CATEGORIES for the homepage showcase (Section 3).
 * Prioritizes live categories from backend in their exact configured display_order.
 * When `products` is supplied, ONLY categories with at least 1 live product are shown.
 * Empty categories (0 products) are hidden from the frontend and shown only in Admin.
 */
export function getMainShowcaseCategories(rawCats: any[] = [], products?: any[]): CleanCategory[] {
  const sanitized = getSanitizedCategories(rawCats, products);
  const result: CleanCategory[] = [];
  const addedSlugs = new Set<string>();

  // Filter top-level categories (no parent) from backend
  const topLevelLive = sanitized.filter((c: any) => !c.parent);
  const liveList = topLevelLive.length > 0 ? topLevelLive : sanitized;

  // Sort strictly by admin's display_order
  const sortedLive = [...liveList].sort((a: any, b: any) => {
    const ordA = typeof a.display_order === 'number' ? a.display_order : 999;
    const ordB = typeof b.display_order === 'number' ? b.display_order : 999;
    return ordA - ordB;
  });

  // Add all live categories that have products
  for (const liveCat of sortedLive) {
    const slug = (liveCat.slug || '').toLowerCase().trim();
    if (!slug || addedSlugs.has(slug)) continue;

    // Attach high-res image if none set on category
    let finalImg = (liveCat as any).image_display || (liveCat as any).image_url || liveCat.image;
    if (!finalImg) {
      const matchCanon = CANONICAL_MAIN_CATEGORIES.find((canon) => {
        const cSlug = canon.slug.toLowerCase();
        const cName = canon.name.toLowerCase();
        const catName = (liveCat.name || '').toLowerCase();
        return slug.includes(cSlug) || cSlug.includes(slug) || catName.includes(cName) || cName.includes(catName);
      });
      finalImg = matchCanon?.image || CANONICAL_MAIN_CATEGORIES[0].image;
    }

    const prodCount = products ? products.filter((p) => isProductInCategory(p, liveCat.slug || slug, liveCat)).length : (liveCat.product_count ?? 0);

    result.push({
      ...liveCat,
      name: formatCategoryName(liveCat.name),
      slug: liveCat.slug || slug,
      image: finalImg,
      image_display: (liveCat as any).image_display || finalImg,
      image_url: (liveCat as any).image_url || finalImg,
      product_count: prodCount,
    });
    addedSlugs.add(slug);
  }

  // Only if products is NOT provided and we have zero categories, fallback to canonical
  if (!products && result.length === 0) {
    for (const canon of CANONICAL_MAIN_CATEGORIES) {
      result.push({
        id: canon.slug,
        name: canon.name,
        slug: canon.slug,
        image: canon.image,
        product_count: 0,
      });
    }
  }

  return result;
}

/**
 * Normalizes a category key (slug or name) by stripping non-alphanumeric characters
 * and trailing 's' for resilient, plural-insensitive comparison.
 */
export function normalizeCategoryKey(val?: string | null): string {
  if (!val) return '';
  return String(val)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/s$/, '');
}

/**
 * Checks whether a product strictly belongs to a target category.
 * Matches strictly against category IDs, slugs, parent category IDs/slugs, and category names.
 * Handles cases where subcategory selection in admin was optional (product assigned directly to parent),
 * or where subcategory was selected (product matches both subcategory and parent category).
 * NEVER matches against product titles or arbitrary description text to prevent cross-category bleeding.
 */
export function isProductInCategory(
  product: any,
  targetFilterSlug: string,
  targetCategoryObj?: any
): boolean {
  if (!product) return false;
  if (!targetFilterSlug || targetFilterSlug === 'all') return true;

  const targetId = targetCategoryObj && targetCategoryObj.id !== undefined && targetCategoryObj.id !== null
    ? String(targetCategoryObj.id)
    : null;

  const pCatId = product.categoryId !== undefined && product.categoryId !== null
    ? String(product.categoryId)
    : product.category_id !== undefined && product.category_id !== null
    ? String(product.category_id)
    : (typeof product.category === 'object' && product.category !== null && product.category.id !== undefined && product.category.id !== null)
    ? String(product.category.id)
    : product.category !== undefined && product.category !== null
    ? String(product.category)
    : null;

  const pParentId = product.parent_category_id !== undefined && product.parent_category_id !== null
    ? String(product.parent_category_id)
    : (typeof product.category === 'object' && product.category !== null && product.category.parent !== undefined && product.category.parent !== null)
    ? (typeof product.category.parent === 'object' ? String(product.category.parent.id) : String(product.category.parent))
    : null;

  // 1. Direct Category ID Match (e.g. admin selected this category directly, whether parent or sub)
  if (targetId && pCatId && targetId === pCatId) {
    return true;
  }

  // 2. Direct Parent Category ID Match (e.g. product belongs to a subcategory whose parent is target)
  if (targetId && pParentId && targetId === pParentId) {
    return true;
  }

  // 3. Subcategories check if targetCategoryObj has subcategories
  if (targetCategoryObj && Array.isArray(targetCategoryObj.subcategories) && targetCategoryObj.subcategories.length > 0) {
    for (const sub of targetCategoryObj.subcategories) {
      if (!sub) continue;
      const subId = sub.id !== undefined && sub.id !== null ? String(sub.id) : null;
      if (subId && pCatId && subId === pCatId) return true;

      const subSlugKey = normalizeCategoryKey(sub.slug);
      const subNameKey = normalizeCategoryKey(sub.name);

      const pSlug = product.category_slug || (typeof product.category === 'object' ? product.category?.slug : '') || '';
      const pName = product.categoryName || product.category_name || (typeof product.category === 'object' ? product.category?.name : (typeof product.category === 'string' ? product.category : ''));

      if (subSlugKey && normalizeCategoryKey(pSlug) === subSlugKey) return true;
      if (subNameKey && normalizeCategoryKey(pName) === subNameKey) return true;
    }
  }

  // 4. Normalized Slug & Name Matching
  const targetSlugKey = normalizeCategoryKey(targetCategoryObj?.slug || targetFilterSlug);
  const targetNameKey = normalizeCategoryKey(targetCategoryObj?.name);

  const pSlugKey = normalizeCategoryKey(
    product.category_slug || (typeof product.category === 'object' ? product.category?.slug : '')
  );
  const pParentSlugKey = normalizeCategoryKey(
    product.parent_slug || product.parent_category_slug || (typeof product.category === 'object' && product.category?.parent ? (typeof product.category.parent === 'object' ? product.category.parent?.slug : '') : '')
  );
  const pNameKey = normalizeCategoryKey(
    product.categoryName || product.category_name || (typeof product.category === 'object' ? product.category?.name : (typeof product.category === 'string' ? product.category : ''))
  );

  if (targetSlugKey) {
    if (pSlugKey && pSlugKey === targetSlugKey) return true;
    if (pParentSlugKey && pParentSlugKey === targetSlugKey) return true;
    if (pNameKey && pNameKey === targetSlugKey) return true;
  }

  if (targetNameKey) {
    if (pNameKey && pNameKey === targetNameKey) return true;
    if (pSlugKey && pSlugKey === targetNameKey) return true;
    if (pParentSlugKey && pParentSlugKey === targetNameKey) return true;
  }

  return false;
}
