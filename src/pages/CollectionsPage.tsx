import React, { useState, useMemo, useEffect } from 'react';
import { PageId, Product } from '../types';
import {
  Search,
  SlidersHorizontal,
  X,
  Eye,
  ShoppingBag,
  Heart,
  Sparkles,
  RotateCcw,
  ArrowUpDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';
import { LazyImage } from '../components/motion/LazyImage';
import { useCatalog, toProductShape } from '../hooks/useCatalog';

interface CollectionsPageProps {
  initialCategory?: string;
  initialSearch?: string;
  onNavigate: (page: PageId, extraId?: string) => void;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, license: 'standard' | 'commercial') => void;
  onToggleWishlist: (product: Product) => void;
  wishlistIds: string[];
}

export const CollectionsPage: React.FC<CollectionsPageProps> = ({
  initialCategory = 'all',
  initialSearch = '',
  onNavigate,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistIds,
}) => {
  const { categories, allCategories, products, styles, isLoading } = useCatalog();

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedSlug, setSelectedSlug] = useState<string>(initialCategory);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(99999);
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc' | 'newest'>('popular');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync when parent navigates to a specific category
  useEffect(() => {
    if (initialCategory) setSelectedSlug(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialSearch !== undefined) setSearchQuery(initialSearch);
  }, [initialSearch]);

  // ── Derived: max price across all products ──
  const globalMaxPrice = useMemo(() => {
    if (!products.length) return 10000;
    return Math.max(...products.map((p) => Number(p.price) || 0), 100);
  }, [products]);

  // ── Build sidebar category list with per-category product counts ──────────
  // Each entry is a top-level or sub-category with a real count from the filtered product set
  const categoryFilters = useMemo(() => {
    // Build a slug → product count map
    const countBySlug = new Map<string, number>();
    products.forEach((p) => {
      if (p.category_slug) {
        countBySlug.set(p.category_slug, (countBySlug.get(p.category_slug) || 0) + 1);
      }
    });

    // Build full flat list: top-level categories first, then sub-cats indented
    const result: { slug: string; name: string; count: number; isSubcat: boolean }[] = [];

    categories.forEach((cat) => {
      const getMatchingCount = (slug: string) => {
        const s = slug.toLowerCase();
        return products.filter((p) => {
          const pCatSlug = (p.category_slug || '').toLowerCase();
          const pParentSlug = ((p as any).parent_slug || '').toLowerCase();
          const pCatName = (p.category_name || '').toLowerCase();

          return (
            pCatSlug === s ||
            pParentSlug === s ||
            pCatName === s ||
            (s.includes('ring') && (pCatSlug.includes('ring') || pParentSlug.includes('ring'))) ||
            (s.includes('necklace') && (pCatSlug.includes('necklace') || pCatSlug.includes('pendant') || pParentSlug.includes('necklace'))) ||
            (s.includes('earring') && (pCatSlug.includes('earring') || pParentSlug.includes('earring'))) ||
            (s.includes('bracelet') && (pCatSlug.includes('bracelet') || pCatSlug.includes('bangle') || pParentSlug.includes('bracelet')))
          );
        }).length;
      };

      const directCount = getMatchingCount(cat.slug);
      const subCount = (cat.subcategories || []).reduce(
        (sum, sc) => sum + getMatchingCount(sc.slug),
        0
      );
      const totalCount = Math.max(directCount, subCount);
      result.push({ slug: cat.slug, name: cat.name, count: totalCount > 0 ? totalCount : directCount + subCount, isSubcat: false });

      (cat.subcategories || []).forEach((sc) => {
        result.push({
          slug: sc.slug,
          name: sc.name,
          count: getMatchingCount(sc.slug),
          isSubcat: true,
        });
      });
    });

    return result;
  }, [categories, products]);

  // ── Get slugs that match the selected filter (include parent + children or just self) ──
  const matchingSlugs = useMemo(() => {
    if (selectedSlug === 'all') return null; // null = all products

    // Is it a top-level category? Include its subcategories too
    const topLevel = categories.find((c) => c.slug === selectedSlug);
    if (topLevel) {
      const subSlugs = (topLevel.subcategories || []).map((sc) => sc.slug);
      return new Set([topLevel.slug, ...subSlugs]);
    }

    // Otherwise just this slug (sub-category)
    return new Set([selectedSlug]);
  }, [selectedSlug, categories]);

  // ── Filtered & sorted product list ──────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter: match if:
        //  - no filter selected (all)
        //  - product's own category_slug matches (e.g. sub-category selected directly)
        //  - product's parent_slug matches (e.g. top-level "Rings" selected, product is in "Solitaire Rings")
        if (selectedSlug !== 'all') {
          const exactMatch = (p.category_slug || '').toLowerCase() === selectedSlug.toLowerCase();
          const parentMatch = ((p as any).parent_slug || '').toLowerCase() === selectedSlug.toLowerCase();
          const catNameMatch = (p.category_name || '').toLowerCase().includes(selectedSlug.toLowerCase()) || selectedSlug.toLowerCase().includes((p.category_name || '').toLowerCase());
          const flexibleMatch =
            (selectedSlug.includes('ring') && ((p.category_slug || '').includes('ring') || ((p as any).parent_slug || '').includes('ring'))) ||
            (selectedSlug.includes('necklace') && ((p.category_slug || '').includes('necklace') || (p.category_slug || '').includes('pendant') || ((p as any).parent_slug || '').includes('necklace'))) ||
            (selectedSlug.includes('earring') && ((p.category_slug || '').includes('earring') || ((p as any).parent_slug || '').includes('earring'))) ||
            (selectedSlug.includes('bracelet') && ((p.category_slug || '').includes('bracelet') || (p.category_slug || '').includes('bangle') || ((p as any).parent_slug || '').includes('bracelet')));

          if (!exactMatch && !parentMatch && !catNameMatch && !flexibleMatch) return false;
        }

        // Price filter
        if (Number(p.price) > maxPrice) return false;

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (
            !p.title.toLowerCase().includes(q) &&
            !p.category_name?.toLowerCase().includes(q) &&
            !(p.category_slug || '').includes(q)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
        if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
        if (sortBy === 'newest') return (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0);
        return (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0);
      });
  }, [products, matchingSlugs, maxPrice, searchQuery, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSlug('all');
    setSelectedStyleId('all');
    setMaxPrice(globalMaxPrice);
    setSortBy('popular');
  };

  // Active category display label
  const activeCatLabel =
    selectedSlug === 'all'
      ? 'All Collections'
      : allCategories.find((c) => c.slug === selectedSlug)?.name || selectedSlug;

  // ── Sidebar component (shared between desktop & mobile) ─────────────────
  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <h3 className="font-serif text-lg text-[#FAF8F3] flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
          Filter Library
        </h3>
        <button
          onClick={handleResetFilters}
          className="text-[11px] text-[#C9C2A6] hover:text-[#D4AF37] flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Category Filter */}
      <div className="space-y-1.5">
        <span className="text-[11px] uppercase tracking-wider text-[#D4AF37] font-semibold block">
          Jewellery Category
        </span>

        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-[#C9C2A6] py-2">
            <Loader2 className="w-3 h-3 animate-spin text-[#D4AF37]" />
            Loading categories…
          </div>
        ) : (
          <div className="space-y-0.5 text-xs">
            {/* All */}
            <button
              onClick={() => setSelectedSlug('all')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                selectedSlug === 'all'
                  ? 'bg-[#D4AF37] text-[#0B1330] font-semibold'
                  : 'text-[#C9C2A6] hover:bg-white/5'
              }`}
            >
              <span>All Categories</span>
              <span className="font-mono text-[10px]">{products.length}</span>
            </button>

            {categoryFilters.map((c) => (
              <button
                key={c.slug}
                onClick={() => setSelectedSlug(c.slug)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                  c.isSubcat ? 'pl-6' : ''
                } ${
                  selectedSlug === c.slug
                    ? 'bg-[#D4AF37] text-[#0B1330] font-semibold'
                    : 'text-[#C9C2A6] hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-1">
                  {c.isSubcat && (
                    <ChevronRight className="w-3 h-3 opacity-50 shrink-0" />
                  )}
                  {c.name}
                </span>
                <span className="font-mono text-[10px]">{c.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Design Style Filter — from live backend */}
      {styles.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <span className="text-[11px] uppercase tracking-wider text-[#D4AF37] font-semibold block">
            Design Style
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[{ id: 0, name: 'All' }, ...styles].map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStyleId(s.id === 0 ? 'all' : String(s.id))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  (s.id === 0 && selectedStyleId === 'all') || String(s.id) === selectedStyleId
                    ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#F5E7A3]'
                    : 'border-white/10 text-[#C9C2A6] hover:border-[#D4AF37]/40'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex justify-between text-xs">
          <span className="text-[11px] uppercase tracking-wider text-[#D4AF37] font-semibold">
            Max Price Range
          </span>
          <span className="font-mono text-[#F5E7A3] font-bold">
            ${maxPrice >= globalMaxPrice ? 'Any' : maxPrice}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={globalMaxPrice}
          step={Math.max(5, Math.round(globalMaxPrice / 100))}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#D4AF37] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#C9C2A6]/50 font-mono">
          <span>$0</span>
          <span>${globalMaxPrice}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1330] text-[#F5F1E8] pt-28 pb-20 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Breadcrumbs & Header */}
        <RevealOnScroll>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#C9C2A6] mb-3 flex-wrap">
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#D4AF37] transition-colors"
                >
                  Home
                </button>
                <ChevronRight className="w-3 h-3 text-[#D4AF37]/50" />
                <span className="text-[#F5E7A3]">CAD Collections</span>
                {selectedSlug !== 'all' && (
                  <>
                    <ChevronRight className="w-3 h-3 text-[#D4AF37]/50" />
                    <span className="text-[#FAF8F3] font-semibold">{activeCatLabel}</span>
                  </>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#FAF8F3] leading-tight">
                {activeCatLabel}
              </h1>
              <p className="text-xs sm:text-sm text-[#C9C2A6] font-light max-w-xl mt-1">
                Explore production-ready Rhino 3DM native files and high-precision watertight STL models.
              </p>
            </div>

            {/* Filter Toggle Mobile & Sort Controls */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden px-4 py-2 rounded-xl bg-[#121F4D] border border-[#D4AF37]/40 text-xs font-semibold text-[#F5E7A3] flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
                <span>Filters ({filteredProducts.length})</span>
              </button>
            </div>
          </div>
        </RevealOnScroll>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#080E24] border border-[#D4AF37]/20">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]" />
            <input
              type="text"
              placeholder="Search by name, category, style…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#0B1330] border border-[#D4AF37]/30 text-xs text-[#FAF8F3] placeholder-[#C9C2A6]/50 focus:outline-none focus:border-[#D4AF37]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C9C2A6] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort & Count */}
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 text-xs">
            <span className="text-[#C9C2A6]">
              Showing{' '}
              <strong className="text-[#F5E7A3]">{filteredProducts.length}</strong>{' '}
              {isLoading ? '(loading…)' : 'CAD files'}
            </span>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#D4AF37]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-[#0B1330] border border-[#D4AF37]/30 text-xs text-[#FAF8F3] focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="popular">Most Popular</option>
                <option value="newest">Newest Releases</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Grid + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 rounded-2xl bg-[#080E24] border border-[#D4AF37]/25 p-6 sticky top-24">
            <FilterSidebar />
          </aside>

          {/* Product Grid (9 cols) */}
          <div className="lg:col-span-9">
            {isLoading && products.length === 0 ? (
              <div className="rounded-3xl bg-[#080E24] border border-[#D4AF37]/20 p-16 text-center">
                <Loader2 className="w-8 h-8 mx-auto text-[#D4AF37] animate-spin mb-4" />
                <p className="text-[#C9C2A6] text-sm">Loading CAD collection…</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              /* Empty State */
              <div className="rounded-3xl bg-[#080E24] border border-[#D4AF37]/20 p-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#121F4D]/50 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-2xl text-[#FAF8F3]">
                  No Designs Match Your Active Filters
                </h3>
                <p className="text-xs text-[#C9C2A6] max-w-sm mx-auto">
                  Try adjusting your price range, clearing search terms, or exploring our custom CAD service.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={handleResetFilters}
                    className="btn-gold-luxury px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={() => onNavigate('custom-design')}
                    className="px-6 py-2.5 rounded-full border border-[#D4AF37]/40 text-xs text-[#FAF8F3] uppercase tracking-wider hover:bg-white/5"
                  >
                    Request Custom File
                  </button>
                </div>
              </div>
            ) : (
              <StaggerGrid key={`${selectedSlug}-${selectedStyleId}-${sortBy}-${searchQuery}`} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((bp) => {
                  const product = toProductShape(bp);
                  const isWishlisted = wishlistIds.includes(product.id);
                  return (
                    <StaggerItem key={product.id}>
                      <div
                        onClick={() => onNavigate('product-detail', product.id)}
                        className="group rounded-2xl bg-[#080E24] border border-[#D4AF37]/20 overflow-hidden shadow-xl hover:border-[#D4AF37]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                      >
                        {/* Image */}
                        <div className="relative aspect-square overflow-hidden bg-[#070D22]">
                          <LazyImage
                            src={product.primaryImage}
                            alt={product.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                            {product.isBestseller && (
                              <span className="px-2 py-0.5 rounded bg-[#D4AF37] text-[#0B1330] text-[10px] font-bold tracking-wider uppercase">
                                Bestseller
                              </span>
                            )}
                            {product.isNew && (
                              <span className="px-2 py-0.5 rounded bg-[#1E4FA3] text-white text-[10px] font-bold tracking-wider uppercase">
                                New
                              </span>
                            )}
                          </div>

                          {/* Wishlist */}
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleWishlist(product); }}
                            className={`absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-md transition-colors ${
                              isWishlisted
                                ? 'bg-[#D4AF37] text-[#0B1330]'
                                : 'bg-[#0B1330]/70 text-[#FAF8F3] hover:text-[#D4AF37]'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
                          </button>

                          {/* Quick View */}
                          <button
                            onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
                            className="absolute inset-x-3 bottom-3 z-10 py-2 rounded-xl bg-[#0B1330]/90 backdrop-blur border border-[#D4AF37]/30 text-xs text-[#FAF8F3] flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Quick View CAD Specs</span>
                          </button>
                        </div>

                        {/* Info */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#D4AF37]">
                            <span>{product.category}</span>
                            <span className="text-emerald-400 font-mono">Watertight STL</span>
                          </div>
                          <h3 className="font-serif text-lg text-[#FAF8F3] group-hover:text-[#F5E7A3] line-clamp-1 transition-colors">
                            {product.title}
                          </h3>
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-[#C9C2A6] py-1 border-y border-white/5">
                            <span>18K: {product.specs.metalWeight18k}</span>
                            <span>Stones: {product.specs.diamondCount}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <div>
                              <span className="text-xl font-serif font-bold text-[#F5E7A3]">
                                ${product.price}
                              </span>
                              {product.originalPrice && (
                                <span className="text-xs text-[#C9C2A6] line-through ml-1.5">
                                  ${product.originalPrice}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); onAddToCart(product, 'standard'); }}
                              className="btn-gold-luxury px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1"
                            >
                              <ShoppingBag className="w-3 h-3 text-[#0B1330]" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerGrid>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            onClick={() => setMobileFilterOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative ml-auto w-full max-w-xs bg-[#0B1330] p-6 shadow-2xl overflow-y-auto border-l border-[#D4AF37]/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl text-[#FAF8F3]">Catalog Filters</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 text-[#C9C2A6] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterSidebar />
            <button
              onClick={() => { handleResetFilters(); setMobileFilterOpen(false); }}
              className="w-full mt-6 py-2.5 rounded-xl border border-[#D4AF37]/30 text-xs text-[#FAF8F3] hover:bg-white/5 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
