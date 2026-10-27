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
  Lock,
  Share2,
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';
import { LazyImage } from '../components/motion/LazyImage';
import { useCatalog, toProductShape, fetchCatalog } from '../hooks/useCatalog';
import { formatINR } from '../utils/currencyHelper';
import { useCustomerCountry, resolveDisplayPrice, formatCurrencyAmount } from '../utils/countryContext';
import { getOptimizedImageUrl } from '../utils/imageHelper';
import { isProductInCategory } from '../utils/categoryHelper';
import { ProductPriceTag } from '../components/common/ProductPriceTag';
import { useAuth } from '../context/AuthContext';
import { ProductShareModal, ProductShareData } from '../components/common/ProductShareModal';

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
  const { isLoggedIn } = useAuth();
  const { categories, allCategories, products, styles, isLoading, isError, errorMessage } = useCatalog();
  const { currentCountry, exchangeRates } = useCustomerCountry();

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedSlug, setSelectedSlug] = useState<string>(initialCategory);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc' | 'newest'>('popular');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sharingProduct, setSharingProduct] = useState<ProductShareData | null>(null);
  const catalogTopRef = useRef<HTMLDivElement>(null);

  // ── Derived: max price across all products in customer currency ──
  const globalMaxPrice = useMemo(() => {
    if (!products.length) return currentCountry.currency === 'INR' ? 10000 : 200;
    const maxVal = Math.max(
      ...products.map((p) => {
        const resolved = resolveDisplayPrice(p, 'standard', currentCountry.code, exchangeRates);
        return resolved.amount || 0;
      }),
      currentCountry.currency === 'INR' ? 1000 : 20
    );
    return currentCountry.currency === 'INR' ? Math.ceil(maxVal / 100) * 100 : Math.ceil(maxVal);
  }, [products, currentCountry.code, currentCountry.currency, exchangeRates]);

  const [maxPrice, setMaxPrice] = useState<number>(99999);

  useEffect(() => {
    if (globalMaxPrice > 0) {
      setMaxPrice(globalMaxPrice);
    }
  }, [globalMaxPrice]);

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

    return categories
      .map((cat) => {
        const subcats = (cat.subcategories || [])
          .map((sc) => {
            const count = products.filter((p) => isProductInCategory(p, sc.slug, sc)).length;
            return {
              id: sc.id,
              slug: sc.slug,
              name: sc.name,
              count,
            };
          })
          .filter((sc) => sc.count > 0);

        const totalCount = products.filter((p) => isProductInCategory(p, cat.slug, cat)).length;

        return {
          id: cat.id,
          slug: cat.slug,
          name: cat.name,
          totalCount,
          subcategories: subcats,
        };
      })
      .filter((cat) => cat.totalCount > 0);
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

        // Style filter (supports both ID number and style name comparison)
        if (selectedStyleId !== 'all') {
          const sId = Number(selectedStyleId);
          const hasStyle = (p.style_tags || []).some((st: any) => {
            if (typeof st === 'number') return st === sId;
            if (!st) return false;
            return (
              (sId && st.id === sId) ||
              String(st.id) === selectedStyleId ||
              (st.name && st.name.toLowerCase() === selectedStyleId.toLowerCase())
            );
          });
          if (!hasStyle) return false;
        }

        // Price filter in customer currency
        const resolved = resolveDisplayPrice(p, 'standard', currentCountry.code, exchangeRates);
        if (resolved.amount > maxPrice) return false;

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
        if (sortBy === 'price-asc') {
          const pA = resolveDisplayPrice(a, 'standard', currentCountry.code, exchangeRates).amount;
          const pB = resolveDisplayPrice(b, 'standard', currentCountry.code, exchangeRates).amount;
          return pA - pB;
        }
        if (sortBy === 'price-desc') {
          const pA = resolveDisplayPrice(a, 'standard', currentCountry.code, exchangeRates).amount;
          const pB = resolveDisplayPrice(b, 'standard', currentCountry.code, exchangeRates).amount;
          return pB - pA;
        }
        if (sortBy === 'newest') return (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0);
        return (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0);
      });
  }, [products, categories, selectedSlug, selectedStyleId, maxPrice, searchQuery, sortBy, currentCountry.code, exchangeRates]);

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
      <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
        <h3 className="font-serif text-lg font-bold text-[#0B1330] flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#B88732]" />
          Filter Library
        </h3>
        <button
          onClick={handleResetFilters}
          className="text-xs font-semibold text-[#8C6218] hover:text-[#B88732] flex items-center gap-1 transition-colors cursor-pointer bg-[#FFF9F0] px-2.5 py-1 rounded-lg border border-[#E8D7B7]/80 hover:border-[#D4AF37]"
          title="Reset All Filters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <span className="text-xs uppercase tracking-wider text-[#8C6218] font-bold block">
          Jewellery Category
        </span>

        {isLoading && categories.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-[#475569] py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B88732]" />
            <span>Loading categories…</span>
          </div>
        ) : isError && categories.length === 0 ? (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs space-y-2">
            <p className="text-red-700 text-[11px] font-medium">Failed to load categories.</p>
            <button
              onClick={() => fetchCatalog(true)}
              className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 border border-red-300 text-[10px] font-semibold text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
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
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between font-bold cursor-pointer ${
                selectedSlug === 'all'
                  ? 'bg-[#0B1330] text-[#F5E7A3] font-bold shadow-md border border-[#D4AF37]/40'
                  : 'text-[#0B1330] hover:bg-[#FFF9F0] hover:text-[#B88732]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#B88732]" />
                <span>All Categories</span>
              </div>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                  selectedSlug === 'all'
                    ? 'bg-[#D4AF37]/20 text-[#F5E7A3] font-bold border border-[#D4AF37]/40'
                    : 'bg-[#FFF9F0] border border-[#E8D7B7] text-[#0B1330] font-bold'
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
                          ? 'bg-[#0B1330] text-[#F5E7A3] font-bold shadow-md border border-[#D4AF37]/40'
                          : hasActiveChild
                          ? 'bg-[#FFF9F0] text-[#8C6218] font-bold border border-[#E8D7B7]'
                          : 'text-[#0B1330] font-semibold hover:bg-[#FFF9F0] hover:text-[#B88732]'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {hasSubcats ? (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(cat.slug, e)}
                            className="p-1 -ml-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isExpanded ? 'transform rotate-180' : ''
                              } ${isSelected ? 'text-[#F5E7A3]' : 'text-[#B88732]'}`}
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
                            ? 'bg-[#D4AF37]/20 text-[#F5E7A3] font-bold border border-[#D4AF37]/40'
                            : cat.totalCount > 0
                            ? 'bg-[#FFF9F0] text-[#0B1330] border border-[#E8D7B7] font-bold'
                            : 'bg-black/5 text-[#94A3B8]'
                        }`}
                      >
                        {cat.totalCount}
                      </span>
                    </div>

                    {/* Subcategories (Indented Accordion) */}
                    {hasSubcats && isExpanded && (
                      <div className="mt-1 ml-4 pl-3 border-l-2 border-[#E8D7B7] space-y-0.5 py-1">
                        {cat.subcategories.map((sc) => {
                          const isSubSelected = selectedSlug === sc.slug;
                          return (
                            <button
                              key={sc.slug}
                              onClick={() => setSelectedSlug(sc.slug)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between text-[11px] cursor-pointer ${
                                isSubSelected
                                  ? 'bg-[#FFF9F0] text-[#8C6218] font-bold border border-[#E8D7B7]'
                                  : 'text-[#475569] font-medium hover:text-[#0B1330] hover:bg-white'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSubSelected ? 'bg-[#B88732]' : 'bg-[#94A3B8]'
                                  }`}
                                />
                                <span className="truncate">{sc.name}</span>
                              </span>
                              <span
                                className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${
                                  isSubSelected
                                    ? 'bg-[#E8D7B7]/80 text-[#0B1330] font-bold'
                                    : sc.count > 0
                                    ? 'bg-white text-[#0B1330] border border-[#E8D7B7] font-bold'
                                    : 'text-[#94A3B8]'
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
        <div className="space-y-2.5 pt-3 border-t border-[#E8D7B7]">
          <span className="text-xs uppercase tracking-wider text-[#8C6218] font-bold block">
            Design Style
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[{ id: 0, name: 'All' }, ...styles].map((s) => {
              const isSelected = (s.id === 0 && selectedStyleId === 'all') || String(s.id) === selectedStyleId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyleId(s.id === 0 ? 'all' : String(s.id))}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#B88732] bg-[#0B1330] text-[#F5E7A3] shadow-xs'
                      : 'border-[#E8D7B7] bg-white text-[#0B1330] hover:border-[#D9B66F] hover:bg-[#FFF9F0]'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div className="space-y-2.5 pt-3 border-t border-[#E8D7B7]">
        <div className="flex justify-between items-center text-xs">
          <span className="text-xs uppercase tracking-wider text-[#8C6218] font-bold">
            Max Price Range
          </span>
          <span className="font-mono text-[#0B1330] font-black text-sm">
            {maxPrice >= globalMaxPrice ? 'Any' : formatCurrencyAmount(maxPrice, currentCountry.currency, currentCountry.symbol)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={globalMaxPrice}
          step={Math.max(1, Math.round(globalMaxPrice / 100))}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#B88732] cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-[#475569] font-mono font-semibold">
          <span>{currentCountry.symbol}0</span>
          <span>{formatCurrencyAmount(globalMaxPrice, currentCountry.currency, currentCountry.symbol)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#17243B] pt-28 pb-20 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Breadcrumbs & Header */}
        <RevealOnScroll>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#687386] mb-3 flex-wrap">
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#B88732] transition-colors"
                >
                  Home
                </button>
                <ChevronRight className="w-3 h-3 text-[#D9B66F]" />
                <span className="text-[#17345C] font-medium">CAD Collections</span>
                {selectedSlug !== 'all' && (
                  <>
                    <ChevronRight className="w-3 h-3 text-[#D9B66F]" />
                    <span className="text-[#B88732] font-semibold">{activeCatLabel}</span>
                  </>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#17345C] leading-tight">
                {activeCatLabel}
              </h1>
              <p className="text-xs sm:text-sm text-[#687386] font-light max-w-xl mt-1">
                Explore production-ready Rhino 3DM native files and high-precision watertight STL models.
              </p>
            </div>

            {/* Filter Toggle Mobile & Sort Controls */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden px-4 py-2 rounded-xl bg-white border border-[#E8D7B7] text-xs font-semibold text-[#17345C] flex items-center gap-2 shadow-sm hover:border-[#D9B66F]"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#B88732]" />
                <span>Filters ({filteredProducts.length})</span>
              </button>
            </div>
          </div>
        </RevealOnScroll>

        {/* Offline / Connection Error Banner */}
        {isError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-[#17243B] flex flex-col sm:row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-rose-900">
                  {products.length > 0
                    ? 'Showing cached catalog — live connection unavailable.'
                    : 'Unable to connect to live catalogue server.'}
                </span>
                {errorMessage && (
                  <p className="text-[11px] text-rose-700 mt-0.5 font-mono">{errorMessage}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => fetchCatalog(true)}
              className="px-4 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 border border-rose-300 text-xs font-semibold text-rose-900 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Search & Sort Bar */}
        <div
          ref={catalogTopRef}
          className="scroll-mt-28 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm"
        >
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B88732]" />
            <input
              type="text"
              placeholder="Search by name, category, style…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-xs text-[#17243B] placeholder-[#687386]/70 focus:outline-none focus:border-[#D9B66F] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#687386] hover:text-[#17345C]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort & Count */}
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 text-xs">
            <span className="text-[#687386]">
              Showing{' '}
              <strong className="text-[#17345C]">
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
                  {' '}of <strong className="text-[#17345C]">{filteredProducts.length}</strong>
                </>
              )}{' '}
              {isLoading ? '(loading…)' : 'CAD files'}
            </span>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#B88732]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-xs text-[#17345C] focus:outline-none focus:border-[#D9B66F] transition-colors font-medium cursor-pointer"
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
          <aside className="hidden lg:block lg:col-span-3 rounded-2xl bg-white border border-[#E8D7B7] p-6 sticky top-24 shadow-sm">
            <FilterSidebar />
          </aside>

          {/* Product Grid (9 cols) */}
          <div className="lg:col-span-9">
            {isLoading && products.length === 0 ? (
              <div className="rounded-3xl bg-white border border-[#E8D7B7] p-16 text-center shadow-sm">
                <Loader2 className="w-8 h-8 mx-auto text-[#B88732] animate-spin mb-4" />
                <p className="text-[#687386] text-sm">Loading CAD collection…</p>
              </div>
            ) : isError && products.length === 0 ? (
              /* Error State */
              <div className="rounded-3xl bg-white border border-rose-200 p-16 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-2xl text-[#17345C]">
                  Unable to Load Catalog
                </h3>
                <p className="text-xs text-[#687386] max-w-sm mx-auto">
                  {errorMessage || 'The server could not be reached. Please verify your connection or try again.'}
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => fetchCatalog(true)}
                    className="btn-gold-luxury px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry Connection
                  </button>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              /* Empty State */
              <div className="rounded-3xl bg-white border border-[#E8D7B7] p-16 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#FFF9F0] border border-[#E8D7B7] flex items-center justify-center text-[#B88732]">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-2xl text-[#17345C]">
                  No Designs Match Your Active Filters
                </h3>
                <p className="text-xs text-[#687386] max-w-sm mx-auto">
                  Try adjusting your price range, clearing search terms, or exploring our custom CAD service.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={handleResetFilters}
                    className="btn-gold-luxury px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-md"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={() => onNavigate('custom-design')}
                    className="px-6 py-2.5 rounded-full border border-[#17345C] text-xs text-[#17345C] font-semibold uppercase tracking-wider hover:bg-[#17345C] hover:text-white transition-colors"
                  >
                    Request Custom File
                  </button>
                </div>
              </div>
            ) : (
              <>
                <StaggerGrid
                  key={`${selectedSlug}-${selectedStyleId}-${sortBy}-${searchQuery}-${validCurrentPage}`}
                  className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6"
                >
                  {paginatedProducts.map((bp) => {
                    const product = toProductShape(bp);
                    const isWishlisted = wishlistIds.includes(product.id);
                    return (
                      <StaggerItem key={product.id}>
                        <div
                          onClick={() => onNavigate('product-detail', product.id)}
                          className="group rounded-xl sm:rounded-2xl bg-white border border-[#E8D7B7] overflow-hidden shadow-xs hover:shadow-xl hover:border-[#D9B66F] hover:-translate-y-1 sm:hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                        >
                          {/* Image */}
                          <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-[#FFFDF9] to-[#FAF7F2]">
                            <LazyImage
                              src={getOptimizedImageUrl(product.primaryImage, product.category)}
                              alt={product.title}
                              category={product.category}
                              className="w-full h-full object-contain p-2 sm:p-3 transition-transform duration-500 group-hover:scale-105"
                            />

                            {/* Badges */}
                            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 z-10">
                              {product.isBestseller && (
                                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-[#D4AF37] to-[#B88732] text-[#070D22] text-[9px] sm:text-[10px] font-black tracking-wider uppercase shadow-sm">
                                  Bestseller
                                </span>
                              )}
                              {product.isNew && (
                                <span className="px-2 py-0.5 rounded bg-[#0B1330] text-[#F5E7A3] text-[9px] sm:text-[10px] font-bold tracking-wider uppercase shadow-sm border border-[#D4AF37]/30">
                                  New
                                </span>
                              )}
                            </div>

                            {/* Action Buttons: Wishlist & Share */}
                            <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 flex items-center gap-1.5">
                              {/* Share Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSharingProduct({
                                    id: product.id,
                                    title: product.title,
                                    image: product.primaryImage,
                                    category: product.category,
                                    price: product.price,
                                  });
                                }}
                                className="p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-colors shadow-xs bg-white/95 text-[#0B1330] hover:text-[#B88732] border border-[#E8D7B7]/60 cursor-pointer"
                                title="Share CAD File"
                                aria-label="Share"
                              >
                                <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#B88732]" />
                              </button>

                              {/* Wishlist */}
                              <button
                                onClick={(e) => { e.stopPropagation(); onToggleWishlist(product); }}
                                className={`p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-colors shadow-xs cursor-pointer ${
                                  isWishlisted
                                    ? 'bg-[#B88732] text-white'
                                    : 'bg-white/95 text-[#0B1330] hover:text-[#B88732] border border-[#E8D7B7]/60'
                                }`}
                                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                                aria-label="Wishlist"
                              >
                                <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
                              </button>
                            </div>

                            {/* Quick View (Desktop) */}
                            <button
                              onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
                              className="absolute inset-x-2 sm:inset-x-3 bottom-2 sm:bottom-3 z-10 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/95 backdrop-blur border border-[#E8D7B7] text-[10px] sm:text-xs font-bold text-[#0B1330] hidden sm:flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:border-[#D9B66F]"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#B88732]" />
                              <span>Quick View CAD Specs</span>
                            </button>
                          </div>

                          {/* Info */}
                          <div className="p-3 sm:p-4 space-y-2 sm:space-y-2.5 bg-white">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold">
                              <span className="text-[#8C6218] font-mono tracking-wider truncate max-w-[60%]">
                                {product.category || 'Atelier Design'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[9px] font-bold tracking-wider shrink-0 shadow-2xs">
                                WATERTIGHT STL
                              </span>
                            </div>
                            <h3 className="font-serif text-sm sm:text-base text-[#0B1330] group-hover:text-[#B88732] line-clamp-1 transition-colors font-bold">
                              {product.title}
                            </h3>
                            <div className="grid grid-cols-2 gap-1 text-[11px] text-[#475569] font-mono py-1.5 border-y border-[#E8D7B7]/50">
                              <span className="truncate">18K: <strong className="text-[#0B1330]">{product.specs?.metalWeight18k || '—'}</strong></span>
                              <span className="truncate text-right"><strong className="text-[#0B1330]">{product.specs?.diamondCount ? `${product.specs.diamondCount} Gems` : 'Solid Metal'}</strong></span>
                            </div>
                            <div className="flex items-center justify-between pt-1 gap-2">
                              <div className="min-w-0 flex-1">
                                <ProductPriceTag product={product} size="sm" primaryColorClass="text-[#0B1330] font-black" />
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); onAddToCart(product, 'standard'); }}
                                className="px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3DE9C] to-[#B88732] text-[#070D22] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer shrink-0"
                                title={isLoggedIn ? "Add to Bag" : "Sign in to Order / Add to Bag"}
                                aria-label={isLoggedIn ? "Add to Bag" : "Sign in to Order / Add to Bag"}
                              >
                                {!isLoggedIn ? (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-[#070D22]" />
                                    <span>ADD</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-3.5 h-3.5 text-[#070D22]" />
                                    <span>ADD</span>
                                  </>
                                )}
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
                  <div className="mt-10 pt-6 border-t border-[#E8D7B7] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[#687386]">
                      Showing{' '}
                      <span className="font-mono font-semibold text-[#17345C]">
                        {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}
                      </span>
                      –
                      <span className="font-mono font-semibold text-[#17345C]">
                        {Math.min(validCurrentPage * ITEMS_PER_PAGE, filteredProducts.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-mono font-semibold text-[#17345C]">
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
                        className="p-2 rounded-xl bg-white border border-[#E8D7B7] text-[#687386] hover:text-[#17345C] hover:border-[#D9B66F] hover:bg-[#FFF9F0] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-[#E8D7B7] transition-all cursor-pointer shadow-sm"
                        title="First Page"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>

                      {/* Prev Page */}
                      <button
                        onClick={() => handlePageChange(validCurrentPage - 1)}
                        disabled={validCurrentPage === 1}
                        aria-label="Previous page"
                        className="px-3 py-2 rounded-xl bg-white border border-[#E8D7B7] text-xs font-medium text-[#687386] hover:text-[#17345C] hover:border-[#D9B66F] hover:bg-[#FFF9F0] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-[#E8D7B7] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
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
                                className="w-8 text-center text-xs text-[#687386]/40 select-none"
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
                              className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-sm ${
                                isActive
                                  ? 'bg-gradient-to-r from-[#D9B66F] to-[#E8D7B7] text-[#17345C] font-bold shadow-md shadow-[#D9B66F]/20 border border-[#D9B66F]'
                                  : 'bg-white border border-[#E8D7B7] text-[#687386] hover:text-[#17345C] hover:border-[#D9B66F] hover:bg-[#FFF9F0]'
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
                        className="px-3 py-2 rounded-xl bg-white border border-[#E8D7B7] text-xs font-medium text-[#687386] hover:text-[#17345C] hover:border-[#D9B66F] hover:bg-[#FFF9F0] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-[#E8D7B7] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Last Page */}
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={validCurrentPage === totalPages}
                        aria-label="Last page"
                        className="p-2 rounded-xl bg-white border border-[#E8D7B7] text-[#687386] hover:text-[#17345C] hover:border-[#D9B66F] hover:bg-[#FFF9F0] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-[#E8D7B7] transition-all cursor-pointer shadow-sm"
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative ml-auto w-full max-w-xs bg-white p-6 shadow-2xl overflow-y-auto border-l border-[#E8D7B7]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl text-[#17345C]">Catalog Filters</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 text-[#687386] hover:text-[#17345C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterSidebar />
            <button
              onClick={() => { handleResetFilters(); setMobileFilterOpen(false); }}
              className="w-full mt-6 py-2.5 rounded-xl border border-[#E8D7B7] text-xs font-semibold text-[#17345C] hover:bg-[#FFF9F0] transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {/* Product Share Modal */}
      <ProductShareModal
        product={sharingProduct}
        isOpen={Boolean(sharingProduct)}
        onClose={() => setSharingProduct(null)}
      />
    </div>
  );
};
