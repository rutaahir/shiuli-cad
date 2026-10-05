import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';
import { LazyImage } from '../components/motion/LazyImage';
import { useCatalog, toProductShape, fetchCatalog } from '../hooks/useCatalog';
import { formatINR } from '../utils/currencyHelper';
import { getOptimizedImageUrl } from '../utils/imageHelper';

interface CollectionsPageProps {
  initialCategory?: string;
  initialSearch?: string;
  onNavigate: (page: PageId, extraId?: string) => void;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, license: 'standard' | 'commercial') => void;
  onToggleWishlist: (product: Product) => void;
  wishlistIds: string[];
}

const ITEMS_PER_PAGE = 9; // 3 rows of 3 items

const getPageNumbers = (current: number, total: number): (number | '...')[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }

  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, '...', current - 1, current, current + 1, '...', total];
};

export const CollectionsPage: React.FC<CollectionsPageProps> = ({
  initialCategory = 'all',
  initialSearch = '',
  onNavigate,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistIds,
}) => {
  const { categories, allCategories, products, styles, isLoading, isError, errorMessage } = useCatalog();

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedSlug, setSelectedSlug] = useState<string>(initialCategory);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(99999);
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc' | 'newest'>('popular');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const catalogTopRef = useRef<HTMLDivElement>(null);

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

  // ── State for expanded parent categories in sidebar ──
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Auto-expand the parent category that contains selectedSlug
  useEffect(() => {
    if (selectedSlug !== 'all') {
      const selectedLower = selectedSlug.toLowerCase();
      const parent = categories.find(
        (c) =>
          c.slug.toLowerCase() === selectedLower ||
          (c.subcategories || []).some((sc) => sc.slug.toLowerCase() === selectedLower)
      );
      if (parent) {
        setExpandedCats((prev) => ({ ...prev, [parent.slug]: true }));
      }
    }
  }, [selectedSlug, categories]);

  const toggleExpand = (catSlug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCats((prev) => ({ ...prev, [catSlug]: !prev[catSlug] }));
  };

  // ── Build structured categories with accurate counts ─────────────────────
  const categoryTree = useMemo(() => {
    const directCountById = new Map<number, number>();
    const directCountBySlug = new Map<string, number>();

    products.forEach((p) => {
      const catId = Number(p.category);
      if (catId) {
        directCountById.set(catId, (directCountById.get(catId) || 0) + 1);
      }
      if (p.category_slug) {
        const slugLower = p.category_slug.toLowerCase();
        directCountBySlug.set(slugLower, (directCountBySlug.get(slugLower) || 0) + 1);
      }
    });

    return categories.map((cat) => {
      const subcats = (cat.subcategories || []).map((sc) => {
        const count =
          directCountById.get(Number(sc.id)) ??
          directCountBySlug.get(sc.slug.toLowerCase()) ??
          0;
        return {
          id: sc.id,
          slug: sc.slug,
          name: sc.name,
          count,
        };
      });

      const parentDirect =
        directCountById.get(Number(cat.id)) ??
        directCountBySlug.get(cat.slug.toLowerCase()) ??
        0;
      const subTotal = subcats.reduce((sum, sc) => sum + sc.count, 0);
      const totalCount = parentDirect + subTotal;

      return {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        totalCount,
        subcategories: subcats,
      };
    });
  }, [categories, products]);

  // ── Filtered & sorted product list ──────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedSlug !== 'all') {
          const selectedLower = selectedSlug.toLowerCase();
          const pCatSlug = (p.category_slug || '').toLowerCase();
          const pParentSlug = ((p as any).parent_slug || '').toLowerCase();
          const pCatId = Number(p.category);
          const pParentId = Number((p as any).parent_category_id);

          // Find if selectedSlug is a top-level category
          const topLevel = categories.find((c) => c.slug.toLowerCase() === selectedLower);
          if (topLevel) {
            const subSlugs = (topLevel.subcategories || []).map((sc) => sc.slug.toLowerCase());
            const subIds = (topLevel.subcategories || []).map((sc) => Number(sc.id));

            const isDirectMatch =
              pCatSlug === selectedLower ||
              pCatId === Number(topLevel.id) ||
              pParentSlug === selectedLower ||
              pParentId === Number(topLevel.id);

            const isSubcatMatch = subSlugs.includes(pCatSlug) || subIds.includes(pCatId);

            if (!isDirectMatch && !isSubcatMatch) return false;
          } else {
            // Selected slug is a specific subcategory
            const exactSubMatch =
              pCatSlug === selectedLower ||
              p.category_name?.toLowerCase() === selectedLower;

            if (!exactSubMatch) return false;
          }
        }

        // Style filter
        if (selectedStyleId !== 'all') {
          const sId = Number(selectedStyleId);
          const hasStyle = (p.style_tags || []).some((st: any) =>
            typeof st === 'number'
              ? st === sId
              : st.id === sId || st.name?.toLowerCase() === selectedStyleId.toLowerCase()
          );
          if (!hasStyle) return false;
        }

        // Price filter
        if (Number(p.price) > maxPrice) return false;

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (
            !p.title.toLowerCase().includes(q) &&
            !p.category_name?.toLowerCase().includes(q) &&
            !(p.category_slug || '').toLowerCase().includes(q) &&
            !(p.description || '').toLowerCase().includes(q)
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
  }, [products, categories, selectedSlug, selectedStyleId, maxPrice, searchQuery, sortBy]);

  // Reset page to 1 whenever any filter or sort option changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSlug, selectedStyleId, maxPrice, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, validCurrentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === validCurrentPage) return;
    setCurrentPage(newPage);
    if (catalogTopRef.current) {
      catalogTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSlug('all');
    setSelectedStyleId('all');
    setMaxPrice(globalMaxPrice);
    setSortBy('popular');
    setCurrentPage(1);
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
      <div className="space-y-2">
        <span className="text-[11px] uppercase tracking-wider text-[#D4AF37] font-semibold block">
          Jewellery Category
        </span>

        {isLoading && categories.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-[#C9C2A6] py-2">
            <Loader2 className="w-3 h-3 animate-spin text-[#D4AF37]" />
            Loading categories…
          </div>
        ) : isError && categories.length === 0 ? (
          <div className="p-3 rounded-xl bg-[#2A1515]/60 border border-red-500/30 text-xs space-y-2">
            <p className="text-red-300 text-[11px]">Failed to load categories.</p>
            <button
              onClick={() => fetchCatalog(true)}
              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-[10px] font-semibold text-red-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Retry Categories
            </button>
          </div>
        ) : (
          <div className="space-y-1 text-xs">
            {/* All Categories */}
            <button
              onClick={() => setSelectedSlug('all')}
              className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between font-medium cursor-pointer ${
                selectedSlug === 'all'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#0B1330] font-bold shadow-md shadow-[#D4AF37]/20'
                  : 'text-[#C9C2A6] hover:bg-white/5 hover:text-[#FAF8F3]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>All Categories</span>
              </div>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                  selectedSlug === 'all'
                    ? 'bg-[#0B1330]/20 text-[#0B1330] font-bold'
                    : 'bg-white/10 text-[#C9C2A6]'
                }`}
              >
                {products.length}
              </span>
            </button>

            {/* Tree of Categories with Accordions */}
            <div className="space-y-1 pt-1">
              {categoryTree.map((cat) => {
                const isSelected = selectedSlug === cat.slug;
                const hasSubcats = cat.subcategories.length > 0;
                const isExpanded = !!expandedCats[cat.slug];
                const hasActiveChild = cat.subcategories.some((sc) => sc.slug === selectedSlug);

                return (
                  <div key={cat.slug} className="rounded-xl overflow-hidden transition-colors">
                    {/* Top Level Category Row */}
                    <div
                      onClick={() => setSelectedSlug(cat.slug)}
                      className={`group w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#D4AF37] text-[#0B1330] font-bold shadow-md'
                          : hasActiveChild
                          ? 'bg-white/5 text-[#F5E7A3] font-semibold border border-[#D4AF37]/30'
                          : 'text-[#C9C2A6] hover:bg-white/5 hover:text-[#FAF8F3]'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {hasSubcats ? (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(cat.slug, e)}
                            className="p-1 -ml-1 rounded-md hover:bg-white/10 transition-colors"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isExpanded ? 'transform rotate-180' : ''
                              } ${isSelected ? 'text-[#0B1330]' : 'text-[#D4AF37]'}`}
                            />
                          </button>
                        ) : (
                          <span className="w-3" />
                        )}
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                          isSelected
                            ? 'bg-[#0B1330]/25 text-[#0B1330] font-bold'
                            : cat.totalCount > 0
                            ? 'bg-white/10 text-[#FAF8F3]'
                            : 'bg-white/5 text-[#C9C2A6]/40'
                        }`}
                      >
                        {cat.totalCount}
                      </span>
                    </div>

                    {/* Subcategories (Indented Accordion) */}
                    {hasSubcats && isExpanded && (
                      <div className="mt-1 ml-4 pl-3 border-l-2 border-[#D4AF37]/25 space-y-0.5 py-1">
                        {cat.subcategories.map((sc) => {
                          const isSubSelected = selectedSlug === sc.slug;
                          return (
                            <button
                              key={sc.slug}
                              onClick={() => setSelectedSlug(sc.slug)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between text-[11px] cursor-pointer ${
                                isSubSelected
                                  ? 'bg-[#D4AF37]/25 text-[#F5E7A3] font-bold border border-[#D4AF37]/40'
                                  : 'text-[#C9C2A6] hover:text-[#FAF8F3] hover:bg-white/5'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <span
                                  className={`w-1 h-1 rounded-full ${
                                    isSubSelected ? 'bg-[#D4AF37]' : 'bg-[#C9C2A6]/50'
                                  }`}
                                />
                                <span className="truncate">{sc.name}</span>
                              </span>
                              <span
                                className={`font-mono text-[9px] px-1.5 py-0.2 rounded-full shrink-0 ml-1.5 ${
                                  isSubSelected
                                    ? 'bg-[#D4AF37]/30 text-[#F5E7A3] font-bold'
                                    : sc.count > 0
                                    ? 'bg-white/10 text-[#FAF8F3]'
                                    : 'text-[#C9C2A6]/30'
                                }`}
                              >
                                {sc.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
            {maxPrice >= globalMaxPrice ? 'Any' : `₹${formatINR(maxPrice)}`}
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
          <span>₹0</span>
          <span>₹{formatINR(globalMaxPrice)}</span>
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

        {/* Offline / Connection Error Banner */}
        {isError && (
          <div className="p-4 rounded-2xl bg-[#2A1515] border border-red-500/40 text-[#FAF8F3] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-red-200">
                  {products.length > 0
                    ? 'Showing cached catalog — live connection unavailable.'
                    : 'Unable to connect to live catalogue server.'}
                </span>
                {errorMessage && (
                  <p className="text-[11px] text-red-300/80 mt-0.5 font-mono">{errorMessage}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => fetchCatalog(true)}
              className="px-4 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-xs font-semibold text-red-100 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Search & Sort Bar */}
        <div
          ref={catalogTopRef}
          className="scroll-mt-28 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#080E24] border border-[#D4AF37]/20"
        >
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
              <strong className="text-[#F5E7A3]">
                {filteredProducts.length === 0
                  ? 0
                  : filteredProducts.length <= ITEMS_PER_PAGE
                  ? filteredProducts.length
                  : `${(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
                      validCurrentPage * ITEMS_PER_PAGE,
                      filteredProducts.length
                    )}`}
              </strong>
              {filteredProducts.length > ITEMS_PER_PAGE && (
                <>
                  {' '}of <strong className="text-[#F5E7A3]">{filteredProducts.length}</strong>
                </>
              )}{' '}
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
            ) : isError && products.length === 0 ? (
              /* Error State */
              <div className="rounded-3xl bg-[#080E24] border border-red-500/30 p-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-2xl text-[#FAF8F3]">
                  Unable to Load Catalog
                </h3>
                <p className="text-xs text-[#C9C2A6] max-w-sm mx-auto">
                  {errorMessage || 'The server could not be reached. Please verify your connection or try again.'}
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => fetchCatalog(true)}
                    className="btn-gold-luxury px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry Connection
                  </button>
                </div>
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
              <>
                <StaggerGrid
                  key={`${selectedSlug}-${selectedStyleId}-${sortBy}-${searchQuery}-${validCurrentPage}`}
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {paginatedProducts.map((bp) => {
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
                              src={getOptimizedImageUrl(product.primaryImage, product.category)}
                              alt={product.title}
                              className="w-full h-full object-contain p-3 drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)] transition-transform duration-500 group-hover:scale-105"
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
                              <span>18K: {product.specs?.metalWeight18k || '—'}</span>
                              <span>{product.specs?.diamondCount ? `Stones: ${product.specs.diamondCount}` : 'Solid Metal'}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <div>
                                <span className="text-lg font-serif font-bold text-[#F5E7A3] block">
                                  ₹{formatINR(product.price)}
                                </span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); onAddToCart(product, 'standard'); }}
                                className="btn-gold-luxury px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 shadow-md"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-[#0B1330]" />
                                <span>Add to Bag</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerGrid>

                {/* Pagination Controls (After 3 Rows) */}
                {totalPages > 1 && (
                  <div className="mt-10 pt-6 border-t border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[#C9C2A6]">
                      Showing{' '}
                      <span className="font-mono font-semibold text-[#F5E7A3]">
                        {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}
                      </span>
                      –
                      <span className="font-mono font-semibold text-[#F5E7A3]">
                        {Math.min(validCurrentPage * ITEMS_PER_PAGE, filteredProducts.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-mono font-semibold text-[#F5E7A3]">
                        {filteredProducts.length}
                      </span>{' '}
                      CAD designs (Page {validCurrentPage} of {totalPages})
                    </p>

                    <nav aria-label="Collections Pagination" className="flex items-center gap-1.5 flex-wrap justify-center">
                      {/* First Page */}
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={validCurrentPage === 1}
                        aria-label="First page"
                        className="p-2 rounded-xl bg-[#080E24] border border-[#D4AF37]/20 text-[#C9C2A6] hover:text-[#F5E7A3] hover:border-[#D4AF37]/60 hover:bg-[#121F4D]/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#080E24] disabled:hover:border-[#D4AF37]/20 transition-all cursor-pointer"
                        title="First Page"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>

                      {/* Prev Page */}
                      <button
                        onClick={() => handlePageChange(validCurrentPage - 1)}
                        disabled={validCurrentPage === 1}
                        aria-label="Previous page"
                        className="px-3 py-2 rounded-xl bg-[#080E24] border border-[#D4AF37]/20 text-xs font-medium text-[#C9C2A6] hover:text-[#F5E7A3] hover:border-[#D4AF37]/60 hover:bg-[#121F4D]/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#080E24] disabled:hover:border-[#D4AF37]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Prev</span>
                      </button>

                      {/* Numbers */}
                      <div className="flex items-center gap-1">
                        {getPageNumbers(validCurrentPage, totalPages).map((p, idx) => {
                          if (p === '...') {
                            return (
                              <span
                                key={`ellipsis-${idx}`}
                                className="w-8 text-center text-xs text-[#C9C2A6]/40 select-none"
                              >
                                …
                              </span>
                            );
                          }
                          const pageNum = p as number;
                          const isActive = pageNum === validCurrentPage;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              aria-current={isActive ? 'page' : undefined}
                              className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                                isActive
                                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#0B1330] font-bold shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]'
                                  : 'bg-[#080E24] border border-[#D4AF37]/20 text-[#C9C2A6] hover:text-[#FAF8F3] hover:border-[#D4AF37]/60 hover:bg-[#121F4D]/40'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Page */}
                      <button
                        onClick={() => handlePageChange(validCurrentPage + 1)}
                        disabled={validCurrentPage === totalPages}
                        aria-label="Next page"
                        className="px-3 py-2 rounded-xl bg-[#080E24] border border-[#D4AF37]/20 text-xs font-medium text-[#C9C2A6] hover:text-[#F5E7A3] hover:border-[#D4AF37]/60 hover:bg-[#121F4D]/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#080E24] disabled:hover:border-[#D4AF37]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Last Page */}
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={validCurrentPage === totalPages}
                        aria-label="Last page"
                        className="p-2 rounded-xl bg-[#080E24] border border-[#D4AF37]/20 text-[#C9C2A6] hover:text-[#F5E7A3] hover:border-[#D4AF37]/60 hover:bg-[#121F4D]/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#080E24] disabled:hover:border-[#D4AF37]/20 transition-all cursor-pointer"
                        title="Last Page"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </nav>
                  </div>
                )}
              </>
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
