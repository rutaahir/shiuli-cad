import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageId, Product } from '../types';
import { useCatalog, toProductShape, fetchCatalog } from '../hooks/useCatalog';
import { api } from '../services/api';
import { BrandLogo } from '../components/BrandLogo';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  Layers, 
  ShieldCheck, 
  Clock, 
  Repeat, 
  Eye, 
  ShoppingBag, 
  Heart, 
  Star, 
  Check, 
  FileCheck2, 
  Zap, 
  Gem, 
  Award,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Search,
  SlidersHorizontal,
  Sliders,
  Headphones,
  X,
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';
import { LazyImage } from '../components/motion/LazyImage';
import { formatINR, formatRupee } from '../utils/currencyHelper';
import { getMainShowcaseCategories, getSanitizedCategories, formatCategoryName, isProductInCategory } from '../utils/categoryHelper';
import { getOptimizedImageUrl, handleImgError } from '../utils/imageHelper';

// Dynamic Category Box with slowly moving product slideshow + hover/touch selector
// Curated category design presets to ensure rich, distinct previews for each category
const CATEGORY_DESIGN_PRESETS: Record<string, { title: string; price: number; image: string }[]> = {
  rings: [
    { title: 'Solitaire Emerald Diamond Ring', price: 2499, image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=85' },
    { title: 'Royal Halo Pavé Engagement Ring', price: 1899, image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=85' },
    { title: 'Baguette Diamond Eternity Band', price: 1499, image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=85' },
    { title: 'Vintage Gents Signet Crown Ring', price: 2199, image: 'https://images.unsplash.com/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=800&q=85' },
  ],
  earrings: [
    { title: 'Royal Chandelier Drop Earrings', price: 2899, image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=85' },
    { title: 'Diamond Studded Huggie Hoops', price: 1699, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=85' },
    { title: 'Heritage Antique Temple Jhumka', price: 3499, image: 'https://images.unsplash.com/photo-1589674781759-c21c37956a44?auto=format&fit=crop&w=800&q=85' },
    { title: 'Teardrop Solitaire Diamond Dangle', price: 1999, image: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=85' },
  ],
  necklaces: [
    { title: 'Royal Kundan Choker Necklace', price: 4999, image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=800&q=85' },
    { title: 'Riviera Diamond Collar Necklace', price: 5899, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=85' },
    { title: 'Contemporary Diamond Waterfall', price: 4499, image: 'https://images.unsplash.com/photo-1611591475140-be38b638ed3d?auto=format&fit=crop&w=800&q=85' },
    { title: 'Imperial Princess Filigree Chain', price: 3899, image: 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?auto=format&fit=crop&w=800&q=85' },
  ],
  pendants: [
    { title: 'Antique Peacock Kundan Pendant', price: 2299, image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=85' },
    { title: 'Solitaire Pear Diamond Pendant', price: 1899, image: 'https://images.unsplash.com/photo-1600003014755-ba31aa59c4b6?auto=format&fit=crop&w=800&q=85' },
    { title: 'Lotus Floral Diamond Medallion', price: 2199, image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=85' },
    { title: 'Celestial Sunburst Halo Pendant', price: 2499, image: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=800&q=85' },
  ],
  'bracelets-bangles': [
    { title: 'Modern Baguette Diamond Kada', price: 3199, image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=85' },
    { title: 'Diamond Tennis Link Bracelet', price: 2799, image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=85' },
    { title: 'Geometric Solid Gold Bangle', price: 2499, image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=85' },
    { title: 'Filigree Interlocking Cuff Bracelet', price: 3599, image: 'https://images.unsplash.com/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=800&q=85' },
  ],
  mangalsutra: [
    { title: 'Dual-Strand Royal Tanmaniya', price: 2999, image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=800&q=85' },
    { title: 'Infinity Diamond Mangalsutra', price: 2499, image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=85' },
    { title: 'Auspicious Floral Cluster Cord', price: 2799, image: 'https://images.unsplash.com/photo-1600003014755-ba31aa59c4b6?auto=format&fit=crop&w=800&q=85' },
    { title: 'Minimalist Solitaire Mangalsutra', price: 2199, image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=85' },
  ],
  nosepins: [
    { title: 'Solitaire Diamond Nose Stud', price: 999, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=85' },
    { title: 'Floral 7-Stone Diamond Nosepin', price: 1299, image: 'https://images.unsplash.com/photo-1589674781759-c21c37956a44?auto=format&fit=crop&w=800&q=85' },
    { title: 'Traditional Bridal Gold Nath', price: 1899, image: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=85' },
    { title: 'Star Cluster Diamond Screw Pin', price: 1199, image: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=800&q=85' },
  ],
  'polki-jewellery': [
    { title: 'Mughal Heritage Polki Choker', price: 5499, image: 'https://images.unsplash.com/photo-1543290108-01ca9d329143?auto=format&fit=crop&w=800&q=85' },
    { title: 'Royal Jadau Polki Chandbali', price: 3999, image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=800&q=85' },
    { title: 'Uncut Diamond Antique Kada', price: 4699, image: 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?auto=format&fit=crop&w=800&q=85' },
    { title: 'Royal Polki Tika & Earring Suite', price: 4899, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=85' },
  ],
};

interface CategoryBoxCardProps {
  cat: any;
  idx: number;
  allProducts: Product[];
  onNavigate: (page: PageId, extraId?: string) => void;
  onQuickView: (product: Product) => void;
}

const CategoryBoxCard: React.FC<CategoryBoxCardProps> = ({
  cat,
  idx,
  allProducts,
  onNavigate,
  onQuickView,
}) => {
  const cSlug = (cat.slug || cat.id || '').toLowerCase().trim();
  const cName = (cat.name || '').toLowerCase().trim();

  // 1. Gather all strictly matching products from live inventory
  const categoryProducts = React.useMemo(() => {
    const matched = allProducts.filter((p) => isProductInCategory(p, cSlug, cat));

    // Strictly deduplicate matched live products by ID or Title
    const uniqueMap = new Map<string, Product>();
    for (const p of matched) {
      const key = (p.id || p.title || '').trim().toLowerCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, p);
      }
    }
    const uniqueList = Array.from(uniqueMap.values());

    // If live inventory has products, use ONLY the real products from the database
    if (uniqueList.length > 0) {
      return uniqueList;
    }

    // Only if a category has 0 products in the database, supplement with curated preview designs
    let presetKey = 'rings';
    if (cSlug.includes('earring') || cName.includes('earring')) presetKey = 'earrings';
    else if (cSlug.includes('necklace') || cName.includes('necklace')) presetKey = 'necklaces';
    else if (cSlug.includes('pendant') || cName.includes('pendant') || cSlug.includes('pandent')) presetKey = 'pendants';
    else if (cSlug.includes('bracelet') || cSlug.includes('bangle') || cName.includes('bracelet') || cName.includes('bangle')) presetKey = 'bracelets-bangles';
    else if (cSlug.includes('mangal') || cName.includes('mangal')) presetKey = 'mangalsutra';
    else if (cSlug.includes('nose') || cName.includes('nose')) presetKey = 'nosepins';
    else if (cSlug.includes('polki') || cName.includes('polki')) presetKey = 'polki-jewellery';

    const presets = CATEGORY_DESIGN_PRESETS[presetKey];
    if (presets && presets.length > 0) {
      return presets.slice(0, 4).map((preset, pIdx) => ({
        id: `${cat.id || cSlug}-preset-${pIdx + 1}`,
        title: preset.title,
        category: cat.name,
        categoryName: cat.name,
        price: preset.price,
        image: preset.image,
        images: [preset.image],
        primaryImage: preset.image,
        description: `Precision engineered ${cat.name} 3D CAD deliverable. Watertight mesh ready for 3D wax printing.`,
        rating: 4.9,
        reviewsCount: 28,
        formats: ['3DM', 'STL', 'Render'] as any,
        specs: {
          metalWeight18k: '4.80 gm',
          metalWeight14k: '4.10 gm',
          diamondCount: 24,
          diamondTotalWeight: '0.45 ct',
          dimensions: '18.2 x 2.1 mm',
          meshTriangles: '124,000',
          tolerance: '±0.02 mm',
        },
      } as unknown as Product));
    }

    return [];
  }, [allProducts, cat, cSlug, cName]);

  // 1. Resolve Category Banner Cover image (fallback if category has no products)
  const categoryBannerImg = (cat as any).image_display || cat.image || (cat as any).image_url;

  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Automatically cycle through category products one by one
  useEffect(() => {
    if (categoryProducts.length <= 1 || isPaused || hoveredProduct !== null) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % categoryProducts.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [categoryProducts.length, isPaused, hoveredProduct]);

  const currentProduct = hoveredProduct || (categoryProducts.length > 0 ? categoryProducts[activeIdx % categoryProducts.length] : null);

  const getImg = (p: any) => {
    if (!p) return categoryBannerImg || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80';
    return getOptimizedImageUrl(p.primaryImage || p.image || (Array.isArray(p.images) && p.images[0]), cat.name);
  };

  const currentImgUrl = currentProduct
    ? getImg(currentProduct)
    : (categoryBannerImg ? getOptimizedImageUrl(categoryBannerImg, cat.name) : 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80');

  // Calculate minimum price for "From ₹X" badge
  const minPrice = React.useMemo(() => {
    if (!categoryProducts.length) return null;
    const prices = categoryProducts.map((p) => Number(p.price) || 0).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [categoryProducts]);

  const count = cat.product_count ?? categoryProducts.length;
  const isMarqueeMode = categoryProducts.length > 3;

  // Memoize seamless marquee track items:
  // Ensure the track has at least 8 items so the loop never leaves an empty gap across card width
  const marqueeItems = React.useMemo(() => {
    if (categoryProducts.length === 0) return [];
    let list = [...categoryProducts];
    while (list.length < 8) {
      list = [...list, ...categoryProducts];
    }
    return list;
  }, [categoryProducts]);

  // UNIFORM NORMAL SPEED:
  // Each thumbnail takes ~2.2 seconds to pass a reference point.
  // Linear velocity is identical across every category card regardless of design count!
  const marqueeDuration = Math.max(12, Math.round(marqueeItems.length * 2.2));

  return (
    <StaggerItem key={cat.id || idx}>
      <motion.div
        whileHover={{ y: -6, scale: 1.01 }}
        transition={{ duration: 0.3 }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          setIsPaused(false);
          setHoveredProduct(null);
        }}
        className="group relative rounded-2xl overflow-hidden min-h-[460px] sm:min-h-[490px] bg-white border border-[#E8D7B7] hover:border-[#D9B66F] cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
      >
        {/* TOP DEDICATED SHOWCASE: Shows products images, automatically changes one by one */}
        <div 
          onClick={() => {
            if (currentProduct) {
              onQuickView(currentProduct);
            } else {
              onNavigate('collections', cat.slug);
            }
          }}
          className="relative w-full h-[260px] sm:h-[280px] bg-gradient-to-b from-[#FFFDF9] via-[#FFF9F0] to-[#FFF5E6] p-3 sm:p-4 flex items-center justify-center overflow-hidden cursor-pointer"
        >
          {/* Subtle gold spotlight backdrop behind jewel */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,182,111,0.18)_0%,transparent_70%)] pointer-events-none" />

          <AnimatePresence mode="wait">
            <motion.img
              key={`cat-prod-${cat.id || cat.slug}-${currentProduct?.id || activeIdx}`}
              src={currentImgUrl}
              alt={currentProduct?.title || cat.name}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(23,52,92,0.12)] transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(e) => handleImgError(e, cat.slug)}
            />
          </AnimatePresence>

          {/* Discreet luxury tag / Active Product Title */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 max-w-[70%]">
            <span className="px-2.5 py-0.5 rounded-md bg-white/95 backdrop-blur-md border border-[#E8D7B7] text-[10px] font-mono uppercase tracking-wider text-[#B88732] shadow-xs truncate">
              {currentProduct?.title || cat.tagline || cat.name}
            </span>
          </div>

          {/* Price badge if current product has price */}
          {currentProduct?.price ? (
            <div className="absolute top-3 right-3 z-10">
              <span className="px-2 py-0.5 rounded-md bg-[#17345C]/90 backdrop-blur-md border border-[#17345C] text-[10px] font-mono font-semibold text-white shadow-xs">
                ₹{formatINR(currentProduct.price)}
              </span>
            </div>
          ) : null}

          {/* Elegant slide indicator dots */}
          {categoryProducts.length > 1 && (
            <div className="absolute bottom-2.5 inset-x-0 z-10 flex items-center justify-center gap-1.5 pointer-events-none">
              {categoryProducts.slice(0, Math.min(8, categoryProducts.length)).map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    (activeIdx % categoryProducts.length) === dotIdx
                      ? 'w-4 bg-[#B88732]'
                      : 'w-1 bg-[#B88732]/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM METADATA & SELECTOR PANEL: Solid, structured, with distinct unique thumbnails */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#E8D7B7] space-y-3 flex-1 flex flex-col justify-between">

          {/* Category Title & Count */}
          <div 
            onClick={() => onNavigate('collections', cat.slug)}
            className="cursor-pointer flex items-center justify-between"
          >
            <h3 className="font-serif text-xl sm:text-2xl text-[#17345C] font-bold group-hover:text-[#B88732] transition-colors leading-tight line-clamp-1">
              {cat.name}
            </h3>
            <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[#B88732] font-semibold shrink-0">
              {count} Designs
            </span>
          </div>

          {/* Interactive Products Marquee / Selector Strip (ONLY PRODUCTS, NEVER CATEGORY IMAGE) */}
          <div className="pt-0.5 relative overflow-hidden w-full marquee-pause-hover select-none">
            {isMarqueeMode ? (
              <>
                {/* Subtle luxury edge fade overlays for smooth entrance and exit */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-white to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-white to-transparent z-10" />

                <div className="flex items-center gap-2 w-max py-1">
                  {/* Primary Track with UNIQUE products */}
                  <div
                    className="flex items-center gap-2 shrink-0 animate-marquee-track"
                    style={{
                      animationDuration: `${marqueeDuration}s`,
                      ['--marquee-duration' as any]: `${marqueeDuration}s`,
                    }}
                  >
                    {marqueeItems.map((prod, pIdx) => {
                      const isActive = currentProduct?.id === prod.id || (currentProduct && currentProduct.title === prod.title);
                      const imgUrl = getImg(prod);
                      return (
                        <button
                          key={`track1-${prod.id || pIdx}-${pIdx}`}
                          type="button"
                          onMouseEnter={() => {
                            setIsPaused(true);
                            setHoveredProduct(prod);
                            const found = categoryProducts.findIndex(p => p.id === prod.id || p.title === prod.title);
                            if (found >= 0) setActiveIdx(found);
                          }}
                          onTouchStart={() => {
                            setIsPaused(true);
                            setHoveredProduct(prod);
                            const found = categoryProducts.findIndex(p => p.id === prod.id || p.title === prod.title);
                            if (found >= 0) setActiveIdx(found);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickView(prod);
                          }}
                          title={`View ${prod.title} (₹${formatINR(prod.price)})`}
                          className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 border p-0.5 bg-[#FFF9F0] transition-all duration-300 cursor-pointer ${
                            isActive
                              ? 'border-[#B88732] ring-2 ring-[#B88732] scale-105 shadow-[0_0_12px_rgba(217,182,111,0.5)] z-10'
                              : 'border-[#E8D7B7] opacity-80 hover:opacity-100 hover:border-[#D9B66F]'
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={prod.title}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => handleImgError(e, cat.slug)}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Loop Duplicate Track for Infinite Seamless Flow */}
                  <div
                    className="flex items-center gap-2 shrink-0 animate-marquee-track"
                    aria-hidden="true"
                    style={{
                      animationDuration: `${marqueeDuration}s`,
                      ['--marquee-duration' as any]: `${marqueeDuration}s`,
                    }}
                  >
                    {marqueeItems.map((prod, pIdx) => {
                      const isActive = currentProduct?.id === prod.id || (currentProduct && currentProduct.title === prod.title);
                      const imgUrl = getImg(prod);
                      return (
                        <button
                          key={`track2-${prod.id || pIdx}-${pIdx}`}
                          type="button"
                          onMouseEnter={() => {
                            setIsPaused(true);
                            setHoveredProduct(prod);
                            const found = categoryProducts.findIndex(p => p.id === prod.id || p.title === prod.title);
                            if (found >= 0) setActiveIdx(found);
                          }}
                          onTouchStart={() => {
                            setIsPaused(true);
                            setHoveredProduct(prod);
                            const found = categoryProducts.findIndex(p => p.id === prod.id || p.title === prod.title);
                            if (found >= 0) setActiveIdx(found);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickView(prod);
                          }}
                          title={`View ${prod.title} (₹${formatINR(prod.price)})`}
                          className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 border p-0.5 bg-[#FFF9F0] transition-all duration-300 cursor-pointer ${
                            isActive
                              ? 'border-[#B88732] ring-2 ring-[#B88732] scale-105 shadow-[0_0_12px_rgba(217,182,111,0.5)] z-10'
                              : 'border-[#E8D7B7] opacity-80 hover:opacity-100 hover:border-[#D9B66F]'
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={prod.title}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => handleImgError(e, cat.slug)}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : categoryProducts.length > 0 ? (
              /* Centered Distinct Unique Designs Row */
              <div className="flex items-center justify-center gap-2 py-1">
                {categoryProducts.map((prod, pIdx) => {
                  const isActive = currentProduct?.id === prod.id || (currentProduct && currentProduct.title === prod.title);
                  const imgUrl = getImg(prod);
                  return (
                    <button
                      key={`static-${prod.id || pIdx}`}
                      type="button"
                      onMouseEnter={() => {
                        setIsPaused(true);
                        setHoveredProduct(prod);
                        const found = categoryProducts.findIndex(p => p.id === prod.id || p.title === prod.title);
                        if (found >= 0) setActiveIdx(found);
                      }}
                      onTouchStart={() => {
                        setIsPaused(true);
                        setHoveredProduct(prod);
                        const found = categoryProducts.findIndex(p => p.id === prod.id || p.title === prod.title);
                        if (found >= 0) setActiveIdx(found);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickView(prod);
                      }}
                      title={`View ${prod.title} (₹${formatINR(prod.price)})`}
                      className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 border p-0.5 bg-[#FFF9F0] transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'border-[#B88732] ring-2 ring-[#B88732] scale-105 shadow-[0_0_12px_rgba(217,182,111,0.5)] z-10'
                          : 'border-[#E8D7B7] opacity-80 hover:opacity-100 hover:border-[#D9B66F]'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={prod.title}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => handleImgError(e, cat.slug)}
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-2 text-[10px] text-[#687386] tracking-wider uppercase font-medium">
                Curating Archive Designs
              </div>
            )}
          </div>

          {/* Action Row with Indian Rupee (₹) Price Badge */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-[#17345C] border-t border-[#E8D7B7]">
            <button
              type="button"
              onClick={() => onNavigate('collections', cat.slug)}
              className="font-semibold uppercase tracking-wider flex items-center gap-1 text-[#17345C] hover:text-[#B88732] transition-colors"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-3 h-3 text-[#B88732]" />
            </button>

            {hoveredProduct ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickView(hoveredProduct);
                }}
                className="px-2.5 py-1 rounded-md bg-[#FFF9F0] border border-[#E8D7B7] text-[10px] text-[#B88732] hover:text-[#17345C] hover:border-[#D9B66F] transition-all flex items-center gap-1.5 shadow-xs font-semibold"
              >
                <Eye className="w-3 h-3 text-[#B88732]" />
                <span>₹{formatINR(hoveredProduct.price)}</span>
              </button>
            ) : minPrice && minPrice > 0 ? (
              <div className="px-2.5 py-1 rounded-md bg-[#FFF9F0] border border-[#E8D7B7] text-[10px] text-[#B88732] flex items-center gap-1.5 shadow-xs font-semibold">
                <Sparkles className="w-3 h-3 text-[#B88732]" />
                <span>From ₹{formatINR(minPrice)}</span>
              </div>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[10px] font-mono text-[#687386]">
                Bespoke Order
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </StaggerItem>
  );
};

interface HomePageProps {
  onNavigate: (page: PageId, extraId?: string) => void;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, license: 'standard' | 'commercial') => void;
  onToggleWishlist: (product: Product) => void;
  wishlistIds: string[];
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistIds,
}) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const INITIAL_VISIBLE_COUNT = 12; // 3 rows of 4 columns = 12 products
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_COUNT);

  // Reset to 3 rows whenever the user changes the category filter tab
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [selectedFilter]);

  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [isSaveData, setIsSaveData] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any)?.connection?.saveData) {
      setIsSaveData(true);
    }
  }, []);

  useEffect(() => {
    api.getTestimonials().then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setTestimonials(res);
      }
    }).catch(() => {});

    api.getPortfolioItems().then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setGalleryItems(res);
      }
    }).catch(() => {});
  }, []);

  // State for prominent central search bar with live category & character matching
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [isHeroSearchOpen, setIsHeroSearchOpen] = useState(false);
  const [selectedHeroCategorySlug, setSelectedHeroCategorySlug] = useState<string>('all');
  const heroSearchRef = useRef<HTMLDivElement>(null);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsHeroSearchOpen(false);
    if (heroSearchQuery.trim()) {
      onNavigate('collections', heroSearchQuery.trim());
    } else {
      onNavigate('collections');
    }
  };

  // Keyboard Escape & Click-Outside handlers for Hero Search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (heroSearchRef.current && !heroSearchRef.current.contains(event.target as Node)) {
        setIsHeroSearchOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHeroSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const { products: liveProducts, categories, isLoading, isError, errorMessage } = useCatalog();

  // Character Matching & Category Filtering for Hero Search
  const cleanHeroSearchQuery = heroSearchQuery.trim().toLowerCase();

  const heroCategoryFilteredProducts = React.useMemo(() => {
    if (selectedHeroCategorySlug === 'all') return liveProducts;
    const catObj = categories.find((c) => c.slug === selectedHeroCategorySlug || String(c.id) === selectedHeroCategorySlug);
    return liveProducts.filter((p) => isProductInCategory(p, selectedHeroCategorySlug, catObj));
  }, [liveProducts, selectedHeroCategorySlug, categories]);

  const heroSearchResults = React.useMemo(() => {
    if (!cleanHeroSearchQuery) {
      return heroCategoryFilteredProducts.map(toProductShape);
    }
    return heroCategoryFilteredProducts
      .filter((p) => {
        const t = (p.title || '').toLowerCase();
        const c = (p.category_name || '').toLowerCase();
        const d = (p.description || '').toLowerCase();
        const s = (p.slug || '').toLowerCase();
        const k = ((p as any).sku || '').toLowerCase();
        return (
          t.includes(cleanHeroSearchQuery) ||
          c.includes(cleanHeroSearchQuery) ||
          d.includes(cleanHeroSearchQuery) ||
          s.includes(cleanHeroSearchQuery) ||
          k.includes(cleanHeroSearchQuery)
        );
      })
      .sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        if (aTitle.startsWith(cleanHeroSearchQuery) && !bTitle.startsWith(cleanHeroSearchQuery)) return -1;
        if (!aTitle.startsWith(cleanHeroSearchQuery) && bTitle.startsWith(cleanHeroSearchQuery)) return 1;
        if (aTitle.includes(cleanHeroSearchQuery) && !bTitle.includes(cleanHeroSearchQuery)) return -1;
        if (!aTitle.includes(cleanHeroSearchQuery) && bTitle.includes(cleanHeroSearchQuery)) return 1;
        return 0;
      })
      .map(toProductShape);
  }, [heroCategoryFilteredProducts, cleanHeroSearchQuery]);

  // Helper: highlight matched characters in text
  const renderHighlightedMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="text-[#17365D] bg-[#D6AD62]/40 font-bold px-0.5 rounded underline decoration-[#D6AD62]"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const heroCategoryOptions = React.useMemo(() => {
    return categories
      .map((c) => {
        const count = liveProducts.filter((p) => isProductInCategory(p, c.slug, c)).length;
        return {
          id: c.id,
          slug: c.slug,
          name: c.name,
          count,
        };
      })
      .filter((c) => c.count > 0);
  }, [categories, liveProducts]);

  const allProducts: Product[] = React.useMemo(
    () => liveProducts.map(toProductShape),
    [liveProducts]
  );

  // Main categories only for Section 3 (ONLY categories with at least 1 real product)
  const mainCategories = React.useMemo(
    () => getMainShowcaseCategories(categories, liveProducts),
    [categories, liveProducts]
  );

  // Clean categories for Section 6 filter bar (ONLY categories with at least 1 real product)
  const filterCategories = React.useMemo(() => {
    const sanitized = getSanitizedCategories(categories, liveProducts);
    return [
      { id: 'all', label: 'All Designs' },
      ...sanitized.map((c) => ({ id: c.slug, label: c.name })),
    ];
  }, [categories, liveProducts]);

  // If selectedFilter category no longer has products, gracefully reset to 'all'
  useEffect(() => {
    if (selectedFilter !== 'all' && filterCategories.length > 1) {
      const exists = filterCategories.some((c) => c.id === selectedFilter);
      if (!exists) {
        setSelectedFilter('all');
      }
    }
  }, [filterCategories, selectedFilter]);

  // Robust matching for Section 6 filter: matches strictly against assigned category, never title strings
  const filteredProducts: Product[] = React.useMemo(() => {
    const source = liveProducts.map(toProductShape);
    if (selectedFilter === 'all') return source;

    const filterCatObj = categories.find((c) => c.slug === selectedFilter || String(c.id) === selectedFilter);

    return source.filter((p) => isProductInCategory(p, selectedFilter, filterCatObj));
  }, [liveProducts, selectedFilter, categories]);

  // Paginated visible products: 3 rows initially (12 items), expands via "View More"
  const displayedProducts = React.useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );
  const hasMoreProducts = filteredProducts.length > visibleCount;

  return (
    <div className="min-h-screen bg-white text-[#17243B] overflow-x-clip relative">

      {/* SECTION 1: LUXURY HERO (UNIFIED SEAMLESS BACKGROUND - NO BLURRY VEIL, COMPACT HEIGHT) */}
      <section
        className="relative flex items-center justify-center pt-20 pb-4 sm:pt-22 sm:pb-5 lg:pt-24 lg:pb-5 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat overflow-visible"
        style={{
          backgroundImage: "url('/assets/redesign/hero_bg_clean.jpg')",
        }}
      >
        {/* CENTER EDITORIAL CONTENT */}
        <div className="relative z-20 max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto text-center flex flex-col items-center space-y-2 sm:space-y-2.5">
          
          {/* Top Decorative Line & Eyebrow (Generous top clearance from fixed navbar) */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3"
          >
            <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-[#D6AD62]" />
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/90 border border-[#E8D7B7] shadow-2xs">
              <Gem className="w-3 h-3 text-[#B88735]" />
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.24em] text-[#B88735] uppercase">
                PREMIUM JEWELLERY CAD STUDIO
              </span>
            </div>
            <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-[#D6AD62]" />
          </motion.div>

          {/* Main Headline & Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-1"
          >
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[44px] xl:text-[48px] font-bold tracking-tight leading-[1.12]">
              <span className="block text-[#17365D]">Where Imagination</span>
              <span className="block text-[#D6AD62] bg-gradient-to-r from-[#C99A45] via-[#D6AD62] to-[#B88735] bg-clip-text text-transparent">
                Becomes Jewellery
              </span>
            </h1>
            <p className="font-serif text-xs sm:text-[13px] md:text-[14px] text-[#626875] font-normal tracking-wide max-w-xl mx-auto leading-relaxed">
              From your imagination to a perfect 3D model — unique, high-precision CAD designs tailored just for you.
            </p>
          </motion.div>

          {/* CENTRAL SEARCH BAR WITH DIRECT ANCHORED DROPDOWN */}
          <div
            ref={heroSearchRef}
            className="w-full max-w-2xl sm:max-w-3xl pt-1 relative z-40"
          >
            <form
              onSubmit={handleHeroSearch}
              className="relative flex items-center bg-white rounded-full border border-[#E2CEAB] shadow-[0_12px_36px_rgba(23,54,93,0.08)] hover:shadow-[0_16px_42px_rgba(23,54,93,0.12)] focus-within:shadow-[0_16px_42px_rgba(23,54,93,0.14)] focus-within:border-[#D6AD62] transition-all p-1.5 sm:p-2"
            >
              <div className="pl-3 sm:pl-4 text-[#17365D]">
                <Search className="w-5 h-5 text-[#17365D]" />
              </div>

              <input
                type="text"
                value={heroSearchQuery}
                onChange={(e) => {
                  setHeroSearchQuery(e.target.value);
                  setIsHeroSearchOpen(true);
                }}
                onFocus={() => setIsHeroSearchOpen(true)}
                placeholder="Search rings, earrings, pendants, chains, bangles..."
                className="w-full bg-transparent px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-[#17243B] placeholder-[#626875]/70 focus:outline-hidden"
              />

              {heroSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setHeroSearchQuery('');
                  }}
                  className="p-1.5 text-gray-400 hover:text-[#17365D] rounded-full transition-colors mr-1 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsHeroSearchOpen((prev) => !prev)}
                className={`p-2 sm:p-2.5 rounded-full transition-colors mr-1 cursor-pointer ${
                  isHeroSearchOpen
                    ? 'text-[#B88735] bg-[#FFF9F0]'
                    : 'text-[#17365D] hover:text-[#B88735] hover:bg-[#FFF9F0]'
                }`}
                title="Filter Categories"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              <button
                type="submit"
                className="bg-[#17365D] hover:bg-[#122b4a] text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
              >
                <span>Search</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* INLINE ATTACHED RESULTS PANEL DIRECTLY BELOW SEARCH BAR */}
            <AnimatePresence>
              {isHeroSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.99 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-white/98 backdrop-blur-xl rounded-3xl border border-[#E2CEAB] shadow-[0_24px_60px_rgba(23,54,93,0.18)] p-4 sm:p-5 text-left transition-all"
                >
                  {/* Top Header bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#EADCC8]/80">
                    <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold tracking-wider text-[#B88735] uppercase">
                      <Search className="w-3.5 h-3.5 text-[#B88735]" />
                      <span>Quick Search CAD Files &amp; Categories</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsHeroSearchOpen(false);
                      }}
                      className="w-7 h-7 rounded-full bg-[#FFF9F0] hover:bg-[#F3E6D0] text-[#17365D] flex items-center justify-center transition-colors cursor-pointer border border-[#E2CEAB]"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Categories Row */}
                  <div className="pt-3 pb-2 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#B88735] uppercase tracking-wider">
                      <Layers className="w-3.5 h-3.5 text-[#B88735]" />
                      <span>Categories ({categories.length || 8})</span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-0.5 thin-gold-scrollbar scroll-smooth">
                      {/* All Categories Chip */}
                      <button
                        type="button"
                        onClick={() => setSelectedHeroCategorySlug('all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                          selectedHeroCategorySlug === 'all'
                            ? 'bg-[#17365D] text-white shadow-sm'
                            : 'bg-[#FFF9F0] text-[#17365D] border border-[#E2CEAB] hover:border-[#D6AD62] hover:bg-white'
                        }`}
                      >
                        <span>All Categories</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            selectedHeroCategorySlug === 'all'
                              ? 'bg-white/20 text-white'
                              : 'bg-[#EADCC8] text-[#17365D]'
                          }`}
                        >
                          {liveProducts.length}
                        </span>
                      </button>

                      {/* Category Pills */}
                      {heroCategoryOptions.map((cat) => {
                        const isSelected = selectedHeroCategorySlug === cat.slug;
                        return (
                          <button
                            key={cat.slug || cat.id}
                            type="button"
                            onClick={() => setSelectedHeroCategorySlug(cat.slug)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-[#17365D] text-white shadow-sm'
                                : 'bg-[#FFF9F0] text-[#17365D] border border-[#E2CEAB] hover:border-[#D6AD62] hover:bg-white'
                            }`}
                          >
                            <span>{cat.name}</span>
                            {cat.count > 0 && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[#EADCC8] text-[#17365D]'
                                }`}
                              >
                                {cat.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subtitle status bar */}
                  <div className="pt-2 pb-2 text-[11px] sm:text-xs text-[#B88735] font-medium tracking-wide">
                    Showing {heroSearchResults.length} CAD models in Atelier
                  </div>

                  {/* Product Grid Results */}
                  <div className="max-h-[300px] sm:max-h-[340px] overflow-y-auto pr-1 sm:pr-1.5 space-y-2 custom-scrollbar">
                    {heroSearchResults.length === 0 ? (
                      <div className="py-8 text-center text-[#626875] space-y-2">
                        <AlertTriangle className="w-6 h-6 text-[#D6AD62] mx-auto" />
                        <p className="text-xs sm:text-sm">
                          No CAD models found matching &quot;{heroSearchQuery}&quot;
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setHeroSearchQuery('');
                            setSelectedHeroCategorySlug('all');
                          }}
                          className="text-xs text-[#B88735] underline font-medium hover:text-[#17365D] cursor-pointer"
                        >
                          Clear search filters
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                        {heroSearchResults.map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => {
                              setIsHeroSearchOpen(false);
                              onQuickView(prod);
                            }}
                            className="group flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#FFFDF9] hover:bg-[#FFF9F0] border border-[#EADCC8] hover:border-[#D6AD62] transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Dark thumbnail box */}
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-[#111927] p-1 shrink-0 flex items-center justify-center overflow-hidden border border-[#EADCC8]/60">
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.title}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                  onError={(e) => handleImgError(e, prod.category)}
                                />
                              </div>

                              {/* Details */}
                              <div className="min-w-0 flex-1">
                                <div className="text-xs sm:text-[13px] font-semibold text-[#17365D] group-hover:text-[#B88735] transition-colors truncate">
                                  {renderHighlightedMatch(prod.title, heroSearchQuery)}
                                </div>
                                <div className="text-[11px] text-[#626875] truncate">
                                  {prod.categoryName || 'Jewellery CAD'} &bull; .3DM + .STL
                                </div>
                                <div className="text-xs sm:text-[13px] font-bold text-[#17365D] mt-0.5">
                                  ₹{formatINR(prod.price)}
                                </div>
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-[#D6AD62] group-hover:text-[#17365D] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer bar */}
                  <div className="pt-3 mt-2 border-t border-[#EADCC8]/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#626875] hidden sm:inline">
                      Press <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-100 border border-gray-300 rounded-sm">Esc</kbd> or click outside to dismiss
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeroSearchOpen(false);
                        onNavigate('collections', heroSearchQuery.trim());
                      }}
                      className="ml-auto text-xs font-semibold text-[#17365D] hover:text-[#B88735] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore all matching collections</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 4 SERVICE SHORTCUT CARDS (SECOND HIGHEST PRIORITY) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="w-full max-w-4xl xl:max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1"
          >
            {[
              {
                id: 'custom-design',
                title: 'Custom Design',
                desc: 'Share your idea & get unique CAD design',
                image: '/assets/redesign/card_ring_hd.png',
                imageAlt: 'Custom Design Jewellery CAD',
                isHighlighted: true,
                onClick: () => onNavigate('custom-design'),
              },
              {
                id: 'ready-cad-files',
                title: 'Ready CAD Files',
                desc: 'Browse high-quality jewellery CAD models',
                image: '/assets/redesign/card_cad_files.png',
                imageAlt: 'Ready CAD Files Catalog',
                isHighlighted: false,
                onClick: () => onNavigate('collections'),
              },
              {
                id: 'our-portfolio',
                title: 'Our Portfolio',
                desc: 'Explore our latest designs & creations',
                image: '/assets/redesign/card_portfolio.png',
                imageAlt: 'Our Jewellery CAD Portfolio',
                isHighlighted: false,
                onClick: () => onNavigate('portfolio'),
              },
              {
                id: 'file-editing',
                title: 'File Editing',
                desc: 'Modify your existing CAD files',
                image: '/assets/redesign/card_file_editing.png',
                imageAlt: 'Jewellery CAD File Editing',
                isHighlighted: false,
                onClick: () => onNavigate('file-editing'),
              },
            ].map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={card.onClick}
                className={`group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl cursor-pointer text-center transition-all duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-[#D6AD62] min-h-[120px] sm:min-h-[135px] ${
                  card.isHighlighted
                    ? 'bg-gradient-to-b from-[#FFFDF9] to-[#FCF6EC] border border-[#D6AD62] shadow-[0_6px_20px_rgba(214,173,98,0.15)] hover:shadow-[0_12px_28px_rgba(214,173,98,0.22)]'
                    : 'bg-white/95 border border-[#EADCC8] hover:border-[#D6AD62] shadow-[0_4px_16px_rgba(23,54,93,0.04)] hover:shadow-[0_10px_24px_rgba(23,54,93,0.08)]'
                }`}
              >
                <div className="h-8 sm:h-9 flex items-center justify-center shrink-0 mb-1">
                  <img
                    src={card.image}
                    alt={card.imageAlt}
                    className="max-h-8 sm:max-h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="space-y-0.5 min-w-0 flex-1 flex flex-col justify-center">
                  <h3 className="font-serif font-bold text-xs sm:text-[13px] text-[#17365D] group-hover:text-[#B88735] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[#626875] line-clamp-1 sm:line-clamp-2 leading-snug">
                    {card.desc}
                  </p>
                </div>

                <div className="w-full flex justify-end mt-1">
                  <div className="w-5 h-5 rounded-full border border-[#D6AD62]/70 group-hover:border-[#D6AD62] group-hover:bg-[#D6AD62] group-hover:text-white flex items-center justify-center text-[#B88735] transition-colors shrink-0">
                    <ChevronRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </button>
            ))}
          </motion.div>

          {/* 4 FEATURE BENEFITS ROW */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="w-full max-w-4xl xl:max-w-5xl mx-auto flex flex-wrap lg:flex-nowrap items-center justify-center lg:justify-between gap-3 sm:gap-5 pt-1.5 sm:pt-2 text-xs sm:text-[13px] text-[#17365D]"
          >
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-[#B88735] shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-xs sm:text-[12px] text-[#17365D]">Photorealistic</div>
                <div className="text-[10px] sm:text-[11px] text-[#626875]">3D Modelling</div>
              </div>
            </div>

            <div className="hidden lg:block w-px h-5 bg-[#EADCC8]" />

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B88735] shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-xs sm:text-[12px] text-[#17365D]">High Precision</div>
                <div className="text-[10px] sm:text-[11px] text-[#626875]">&amp; Accuracy</div>
              </div>
            </div>

            <div className="hidden lg:block w-px h-5 bg-[#EADCC8]" />

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#B88735] shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-xs sm:text-[12px] text-[#17365D]">Fast Turnaround</div>
                <div className="text-[10px] sm:text-[11px] text-[#626875]">(48 Hours)</div>
              </div>
            </div>

            <div className="hidden lg:block w-px h-5 bg-[#EADCC8]" />

            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-[#B88735] shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-xs sm:text-[12px] text-[#17365D]">Expert Support</div>
                <div className="text-[10px] sm:text-[11px] text-[#626875]">for Your Designs</div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* SECTION 2: FEATURED COLLECTIONS (Category Showcase) */}
      <section className="pt-4 pb-10 sm:pt-5 sm:pb-12 bg-white relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-4 sm:space-y-6">
          <RevealOnScroll className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-[0.22em] text-[#B88732] font-semibold mb-1.5">
                <Gem className="w-3.5 h-3.5" />
                Signature Archives
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-[34px] font-bold text-[#17345C] tracking-tight leading-snug">
                Explore Our Ready CAD Collections
              </h2>
            </div>
            <motion.button
              whileHover={{ x: 5 }}
              onClick={() => onNavigate('collections')}
              className="inline-flex items-center gap-1.5 text-xs tracking-wider uppercase font-semibold text-[#17345C] hover:text-[#B88732] transition-colors cursor-pointer"
            >
              <span>View All Categories</span>
              <ChevronRight className="w-4 h-4 text-[#B88732]" />
            </motion.button>
          </RevealOnScroll>

          {/* Categories Error Notice */}
          {isError && categories.length === 0 && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-[#17243B] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm mb-6">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-red-700">Unable to load live categories.</span>
                  {errorMessage && (
                    <p className="text-[11px] text-red-600 mt-0.5 font-mono">{errorMessage}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => fetchCatalog(true)}
                className="px-4 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 border border-red-300 text-xs font-semibold text-red-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Category Cards Grid with Slowly Moving Slideshow & Hover/Touch Product Switcher */}
          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {mainCategories.map((cat: any, idx: number) => (
              <CategoryBoxCard
                key={cat.id || cat.slug || idx}
                cat={cat}
                idx={idx}
                allProducts={allProducts}
                onNavigate={onNavigate}
                onQuickView={onQuickView}
              />
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* SECTION 3: TRUST STRIP (ANIMATED METRICS REVEAL - MOVED BELOW READY COLLECTIONS) */}
      <section className="relative py-10 bg-[#FFF9F0] border-y border-[#E8D7B7]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">
          <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-[#E8D7B7]">
            {[
              { number: '500+', label: 'Designs Delivered' },
              { number: '120+', label: 'Happy Jewellers & Ateliers' },
              { number: '15+', label: 'Countries Served' },
              { number: '48-Hour', label: 'Avg. Custom Turnaround' },
            ].map((metric, i) => (
              <StaggerItem key={i} className="space-y-1 py-2 sm:py-0">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.2 }}
                  className="font-serif text-3xl sm:text-4xl text-[#17345C] font-semibold tracking-tight cursor-default"
                >
                  {metric.number}
                </motion.div>
                <div className="text-xs text-[#687386] uppercase tracking-wider font-medium">
                  {metric.label}
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* SECTION 4: WHY SHIULI CAD STUDIO (The 4 Pillars) */}
      <section className="py-24 bg-[#FFF9F0] border-y border-[#E8D7B7] relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-16">
          <RevealOnScroll className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold">
              <Award className="w-3.5 h-3.5" />
              The Shiuli Standard
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#17345C]">
              Engineered for Casting. Perfected for Fine Jewellery.
            </h2>
            <p className="text-sm text-[#687386] font-normal leading-relaxed">
              Unlike generic 3D asset marketplaces, every Shiuli file is sculpted by certified bench jewellers and MatrixGold engineers with real casting foundry experience.
            </p>
          </RevealOnScroll>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Precision CAD Modelling',
                desc: 'Native Rhino .3DM files with structured layers for prongs, cutters, collets, and metal bodies. Clean NURBS geometry without messy trims.',
                icon: Layers,
                color: 'text-[#B88732] bg-[#FFF9F0] border-[#E8D7B7]',
              },
              {
                title: 'High-Res STL for Casting',
                desc: 'Watertight solids verified with zero non-manifold edges. Pre-compensated for 1.25% gold & platinum shrinkage on 3D wax printers.',
                icon: FileCheck2,
                color: 'text-[#17345C] bg-[#FFF9F0] border-[#E8D7B7]',
              },
              {
                title: '48-Hour Fast Turnaround',
                desc: 'From pencil sketch to 4K client renders and ready-to-cast CAD in under 48 hours. Express 24-hour delivery available on bespoke bridal orders.',
                icon: Clock,
                color: 'text-[#236E6A] bg-[#FFF9F0] border-[#E8D7B7]',
              },
              {
                title: 'Design Revisions Included',
                desc: 'Up to 2 complimentary revision rounds on custom orders. We adjust ring sizes, prong heights, or stone arrangements until your client approves.',
                icon: Repeat,
                color: 'text-[#B88732] bg-[#FFF9F0] border-[#E8D7B7]',
              },
            ].map((pillar, i) => {
              const IconComp = pillar.icon;
              return (
                <StaggerItem key={i}>
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm space-y-4 hover:border-[#D9B66F] hover:shadow-xl transition-all cursor-pointer"
                  >
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${pillar.color}`}>
                      <IconComp className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-xl text-[#17345C]">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-[#687386] leading-relaxed font-normal">
                      {pillar.desc}
                    </p>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS (Process Preview Timeline) */}
      <section className="py-24 bg-white relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-16">
          <RevealOnScroll className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold">
              Simple 4-Step Process
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-[#17345C]">
              How To Acquire Your Studio CAD Files
            </h2>
            <p className="text-xs text-[#687386] font-normal">
              Whether choosing instant download from our catalog or requesting a bespoke file.
            </p>
          </RevealOnScroll>

          {/* Timeline with connecting gold line */}
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Scroll Animated Connecting Line */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="hidden md:block absolute top-8 left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-[#D9B66F] via-[#236E6A] to-[#D9B66F] z-0 origin-left"
            />

            {[
              { num: '01', title: 'Browse or Request', desc: 'Pick a ready design from our collection or upload your customer’s pencil sketch for a custom quote.' },
              { num: '02', title: 'Confirm Specifications', desc: 'Choose your license, metal karat, stone dimensions, and desired casting shrinkage parameters.' },
              { num: '03', title: 'Master CAD Crafting', desc: 'Our Rhino 3D modeler builds the geometry with calibrated seat angles and verifies watertight mesh.' },
              { num: '04', title: 'Instant CAD Download', desc: 'Receive your .3DM, production .STL, and 4K photorealistic studio renders straight to your dashboard.' },
            ].map((step, i) => (
              <RevealOnScroll key={step.num} delay={i * 0.1} className="relative z-10 text-center space-y-3">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-16 h-16 mx-auto rounded-full bg-[#FFF9F0] border-2 border-[#D9B66F] flex items-center justify-center text-lg font-serif font-bold text-[#17345C] shadow-md cursor-pointer"
                >
                  {step.num}
                </motion.div>
                <h4 className="font-serif text-lg text-[#17345C]">
                  {step.title}
                </h4>
                <p className="text-xs text-[#687386] leading-relaxed font-normal">
                  {step.desc}
                </p>
              </RevealOnScroll>
            ))}
          </div>

          <div className="pt-4 text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => onNavigate('how-it-works')}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#17345C] hover:text-[#B88732] font-semibold cursor-pointer"
            >
              <span>Learn About Full 7-Stage Quality Control</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#B88732]" />
            </motion.button>
          </div>
        </div>
      </section>

      {/* SECTION 6: FEATURED / BESTSELLING DESIGNS */}
      <section className="py-24 bg-[#FFF9F0] border-t border-[#E8D7B7] relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
          <RevealOnScroll className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold">
              Ready-To-Cast CAD Files
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-[#17345C]">
              Bestselling Jewellery CAD Files
            </h2>
            <p className="text-xs text-[#687386] font-normal">
              Instant download includes native Rhino .3DM, castable .STL, and 4K render pack.
            </p>
          </RevealOnScroll>

          {/* Sticky Category Filter Bar — stays pinned below navbar when scrolling products */}
          <div className="sticky top-[64px] sm:top-[84px] z-30 py-2.5 sm:py-3 px-3 sm:px-6 rounded-2xl bg-white/95 backdrop-blur-2xl border border-[#E8D7B7] shadow-sm flex overflow-x-auto no-scrollbar sm:flex-wrap items-center justify-start sm:justify-center gap-1.5 sm:gap-2 max-w-5xl mx-auto transition-all">
            {filterCategories.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  selectedFilter === filter.id
                    ? 'bg-[#17345C] text-[#FFF9F0] font-bold shadow-md scale-105'
                    : 'bg-[#FFF9F0] text-[#17345C] hover:bg-[#E8D7B7]/40 border border-[#E8D7B7]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Offline / Stale Data Banner */}
          {isError && liveProducts.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[#17243B] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span className="text-xs text-amber-800">
                  Showing cached catalog — live catalogue server unavailable.
                </span>
              </div>
              <button
                onClick={() => fetchCatalog(true)}
                className="px-3.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-xs font-semibold text-amber-900 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Retry Connection
              </button>
            </div>
          )}

          {/* Product Grid */}
          {isLoading && liveProducts.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E8D7B7] p-16 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-[#B88732] animate-spin mb-4" />
              <p className="text-[#687386] text-sm">Loading ready-made designs…</p>
            </div>
          ) : isError && liveProducts.length === 0 ? (
            <div className="rounded-3xl bg-white border border-red-200 p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-2xl text-[#17345C]">
                Unable to Load Catalog
              </h3>
              <p className="text-xs text-[#687386] leading-relaxed">
                {errorMessage || 'The server could not be reached. Please verify your connection or try again.'}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
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
            <div className="rounded-3xl bg-white border border-[#E8D7B7] p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#FFF9F0] border border-[#E8D7B7] flex items-center justify-center text-[#B88732]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl text-[#17345C]">
                No Designs Found in This Category
              </h3>
              <p className="text-xs text-[#687386] leading-relaxed">
                We haven't listed ready CAD files under this filter yet. You can browse all designs or request a bespoke model.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className="btn-gold-luxury px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider"
                >
                  View All Designs
                </button>
                <button
                  onClick={() => onNavigate('custom-design')}
                  className="px-5 py-2 rounded-full border border-[#E8D7B7] text-xs text-[#17345C] hover:bg-[#FFF9F0] transition-colors"
                >
                  Request Custom CAD
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <StaggerGrid key={`${selectedFilter}-${visibleCount}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {displayedProducts.map((product) => {
                  const isWishlisted = wishlistIds.includes(product.id);
                  return (
                    <StaggerItem key={product.id}>
                      <motion.div
                        whileHover={{ y: -8 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => onNavigate('product-detail', product.id)}
                        className="group rounded-2xl bg-white border border-[#E8D7B7] overflow-hidden shadow-xs hover:shadow-xl hover:border-[#D9B66F] transition-all flex flex-col justify-between cursor-pointer"
                      >
                        {/* Image Frame (object-contain with padding prevents edge cutting) */}
                        <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-[#FFFDF9] via-white to-[#FFF9F0] flex items-center justify-center p-3">
                          <LazyImage
                            src={getOptimizedImageUrl(product.primaryImage, product.category)}
                            alt={product.title}
                            className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(23,52,92,0.1)] transition-transform duration-500 group-hover:scale-105"
                          />

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                            {product.isBestseller && (
                              <span className="px-2 py-0.5 rounded-md bg-[#B88732] text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                                Bestseller
                              </span>
                            )}
                            {product.isNew && (
                              <span className="px-2 py-0.5 rounded-md bg-[#17345C] text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                                New
                              </span>
                            )}
                          </div>

                          {/* Quick View and Wishlist overlay */}
                          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                            <button
                              onClick={(e) => { e.stopPropagation(); onToggleWishlist(product); }}
                              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                                isWishlisted
                                  ? 'bg-[#B88732] text-white'
                                  : 'bg-white/90 text-[#17345C] border border-[#E8D7B7] hover:border-[#D9B66F]'
                              }`}
                              title="Wishlist"
                            >
                              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
                            className="absolute inset-x-3 bottom-3 z-10 py-2 rounded-xl bg-white/95 backdrop-blur border border-[#E8D7B7] text-xs text-[#17345C] font-semibold flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#B88732]" />
                            <span>Quick View Specs</span>
                          </button>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 space-y-3">
                          <div className="text-[10px] uppercase tracking-wider text-[#B88732] font-semibold">
                            {product.category} • {product.specs.diamondCount} Stones
                          </div>

                          <h3 className="font-serif text-lg text-[#17345C] group-hover:text-[#B88732] line-clamp-1 transition-colors">
                            {product.title}
                          </h3>

                          <div className="flex items-center justify-between text-xs text-[#687386] pt-1 border-t border-[#E8D7B7]/60 font-normal">
                            <span>18K: {product.specs?.metalWeight18k || '—'}</span>
                            <span className="font-mono text-[#236E6A] font-semibold">STL Verified</span>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div>
                              <span className="text-xl font-serif font-bold text-[#B88732]">
                                ₹{formatINR(product.price)}
                              </span>
                              {product.originalPrice && (
                                <span className="text-xs text-[#687386] line-through ml-1.5">
                                  ₹{formatINR(product.originalPrice)}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={(e) => { e.stopPropagation(); onAddToCart(product, 'standard'); }}
                              className="btn-gold-luxury px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </StaggerGrid>

              {/* VIEW MORE & CATALOG ACTIONS */}
              <div className="pt-6 flex flex-col items-center justify-center space-y-4">
                {/* Count indicator */}
                <div className="flex items-center gap-2 text-xs font-mono text-[#B88732]">
                  <span>Showing {displayedProducts.length} of {filteredProducts.length} designs</span>
                  {selectedFilter !== 'all' && (
                    <span className="text-[#687386]">
                      • {filterCategories.find((c) => c.id === selectedFilter)?.label}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {hasMoreProducts && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setVisibleCount((prev) => prev + INITIAL_VISIBLE_COUNT)}
                      className="btn-gold-luxury px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span>View More Products ({filteredProducts.length - visibleCount} More)</span>
                      <ChevronDown className="w-4 h-4" />
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate('collections', selectedFilter === 'all' ? undefined : selectedFilter)}
                    className="px-8 py-3.5 rounded-full border border-[#E8D7B7] text-[#17345C] hover:border-[#B88732] hover:bg-[#FFF9F0] text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Browse All in Collections ({liveProducts.length}+ CAD Files)</span>
                    <ArrowRight className="w-4 h-4 text-[#B88732]" />
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 7: CUSTOM DESIGN SPOTLIGHT (Split Banner with Before/After Slider) */}
      <section className="py-24 bg-white relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Text Column */}
            <RevealOnScroll className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold">
                <Zap className="w-3.5 h-3.5" />
                Bespoke CAD Service
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#17345C] leading-tight">
                Have a Design in Mind? Let’s Build It Together.
              </h2>

              <p className="text-sm sm:text-base text-[#687386] font-normal leading-relaxed">
                Send us a hand-drawn pencil sketch, gouache illustration, or client moodboard. Our master MatrixGold modelers will engineer a ready-to-cast 3D NURBS assembly with stone seats and 4K photorealistic renders in 48 hours.
              </p>

              {/* Feature Checklist */}
              <div className="space-y-2.5 text-xs text-[#17243B]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#B88732]" />
                  <span>Zero stone setting rocking guarantee with pre-notched 42° seats</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#B88732]" />
                  <span>Exact finger sizes calibrated across US, EU, and Indian ring standards</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#B88732]" />
                  <span>Includes 4K ray-traced turntable render video for instant client sign-off</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => onNavigate('custom-design')}
                  className="btn-navy-luxury px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Start Custom Request</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </motion.button>

                <a
                  href="https://wa.me/919574787098"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3.5 rounded-full border border-[#E8D7B7] text-xs font-semibold text-[#17345C] hover:border-[#B88732] hover:bg-[#FFF9F0] transition-colors"
                >
                  Chat on WhatsApp (+91 95747 87098)
                </a>
              </div>
            </RevealOnScroll>

            {/* Right Column: Interactive Before/After Slider */}
            <RevealOnScroll className="lg:col-span-6" delay={0.2}>
              <div className="rounded-3xl border border-[#E8D7B7] p-2 bg-[#FFF9F0] shadow-xl">
                <BeforeAfterSlider
                  beforeImage="/unsplash-img/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80"
                  afterImage="/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=80"
                  beforeLabel="Client Concept Sketch"
                  afterLabel="Shiuli 4K 3D CAD Render"
                />
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* SECTION 8: TESTIMONIALS WITH SMOOTH TRANSITION */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-[#FFF9F0] border-y border-[#E8D7B7] relative">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
            <RevealOnScroll className="text-center space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold">
                Client Testimonials
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl text-[#17345C]">
                Trusted By Master Jewellers Globally
              </h2>
            </RevealOnScroll>

            {/* Carousel Card */}
            <RevealOnScroll className="max-w-4xl mx-auto relative rounded-3xl bg-white border border-[#E8D7B7] p-8 sm:p-12 shadow-lg">
              <div className="text-4xl font-serif text-[#D9B66F] mb-4">“</div>
              
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeTestimonialIdx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="font-serif text-lg sm:text-2xl text-[#17243B] leading-relaxed italic mb-8"
                >
                  {testimonials[activeTestimonialIdx]?.quote}
                </motion.p>
              </AnimatePresence>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#E8D7B7] pt-6">
                <div className="flex items-center gap-4">
                  {(testimonials[activeTestimonialIdx]?.avatar_url || testimonials[activeTestimonialIdx]?.avatar) && (
                    <img
                      src={testimonials[activeTestimonialIdx]?.avatar_url || testimonials[activeTestimonialIdx]?.avatar}
                      alt={testimonials[activeTestimonialIdx]?.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#D9B66F] shadow-sm"
                    />
                  )}
                  <div>
                    <h4 className="font-serif text-lg text-[#17345C] font-semibold">
                      {testimonials[activeTestimonialIdx]?.name}
                    </h4>
                    <p className="text-xs text-[#687386] font-normal">
                      {testimonials[activeTestimonialIdx]?.role_or_company || testimonials[activeTestimonialIdx]?.role}
                    </p>
                    {testimonials[activeTestimonialIdx]?.project_type && (
                      <p className="text-[11px] text-[#B88732] font-mono">
                        {testimonials[activeTestimonialIdx].project_type}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rating and Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="flex text-[#B88732]">
                    {[...Array(testimonials[activeTestimonialIdx]?.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() =>
                        setActiveTestimonialIdx((prev) =>
                          prev === 0 ? testimonials.length - 1 : prev - 1
                        )
                      }
                      className="p-2.5 rounded-full border border-[#E8D7B7] text-[#17345C] hover:bg-[#FFF9F0] transition-colors cursor-pointer"
                      title="Previous"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() =>
                        setActiveTestimonialIdx((prev) =>
                          (prev + 1) % testimonials.length
                        )
                      }
                      className="p-2.5 rounded-full border border-[#E8D7B7] text-[#17345C] hover:bg-[#FFF9F0] transition-colors cursor-pointer"
                      title="Next"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>
      )}

      {/* SECTION 9: PORTFOLIO / GALLERY STRIP */}
      <section className="py-24 bg-white relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-10">
          <RevealOnScroll className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold">
                Visual Proof of Craftsmanship
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl text-[#17345C]">
                The Shiuli Lookbook
              </h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => onNavigate('gallery')}
              className="btn-gold-luxury px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <span>View Full Studio Gallery</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </RevealOnScroll>

          {/* Grid with Stagger */}
          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(galleryItems.length > 0 ? galleryItems.slice(0, 3) : []).map((item) => (
              <StaggerItem key={item.id}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => onNavigate('gallery')}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#FFF9F0] border border-[#E8D7B7] cursor-pointer shadow-md hover:border-[#D9B66F] hover:shadow-xl transition-all"
                >
                  <img
                    src={item.image || item.primary_image || item.primary_image_url}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#17345C]/90 via-[#17345C]/30 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-5 space-y-1">
                    <span className="text-[10px] text-[#D9B66F] uppercase tracking-wider font-semibold">
                      {item.category_name || item.category || 'Portfolio'} {item.specs?.weight ? `• ${item.specs.weight}` : ''}
                    </span>
                    <h3 className="font-serif text-xl text-white group-hover:text-[#F5E7A3] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#E8D7B7] line-clamp-1 font-light">{item.description}</p>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* SECTION 10: PRICING PREVIEW */}
      <section className="py-24 bg-[#FFF9F0] border-t border-[#E8D7B7] relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-14">
          <RevealOnScroll className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold">
              Transparent Rates
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-[#17345C]">
              Simple, Predictable CAD Pricing
            </h2>
            <p className="text-xs text-[#687386] font-normal">
              Honest investment without hidden model licensing or seat fees.
            </p>
          </RevealOnScroll>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Basic Tier */}
            <StaggerItem>
              <motion.div
                whileHover={{ y: -8 }}
                className="h-full rounded-2xl bg-white border border-[#E8D7B7] p-8 space-y-6 flex flex-col justify-between shadow-xs hover:shadow-lg transition-shadow"
              >
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl text-[#17345C]">Ready CAD Model</h3>
                  <p className="text-xs text-[#687386] font-normal">
                    Instant download from our curated catalogue of classic solitaires, halos, and bands.
                  </p>
                  <div className="text-3xl font-serif text-[#B88732] font-bold">
                    $35 - $55
                    <span className="text-xs text-[#687386] font-normal"> / design</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#17243B] pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#B88732]" />
                      <span>Layered Rhino .3DM file</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#B88732]" />
                      <span>Watertight .STL for casting</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#B88732]" />
                      <span>Instant download unlock</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => onNavigate('collections')}
                  className="w-full py-3 rounded-xl border border-[#E8D7B7] text-xs text-[#17345C] hover:border-[#D9B66F] hover:bg-[#FFF9F0] uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                >
                  Browse Catalog
                </button>
              </motion.div>
            </StaggerItem>

            {/* Custom Tier - Most Popular */}
            <StaggerItem>
              <motion.div
                whileHover={{ y: -10, scale: 1.02 }}
                className="h-full relative rounded-2xl bg-white border-2 border-[#D9B66F] p-8 space-y-6 flex flex-col justify-between shadow-xl"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#17345C] text-[#FFF9F0] text-[10px] font-bold tracking-widest uppercase shadow-md">
                  Most Popular for Bespoke
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="font-serif text-2xl text-[#17345C]">Bespoke Custom CAD</h3>
                  <p className="text-xs text-[#687386] font-normal">
                    Custom engineering modeled from your client’s sketch or reference photos.
                  </p>
                  <div className="text-3xl font-serif text-[#B88732] font-bold">
                    $65 - $110
                    <span className="text-xs text-[#687386] font-normal"> / piece</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#17243B] pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#B88732]" />
                      <span>48-Hour delivery guarantee</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#B88732]" />
                      <span>2 Rounds of revisions included</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#B88732]" />
                      <span>4K Physically based renders</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#B88732]" />
                      <span>Full manufacturing casting specs</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => onNavigate('custom-design')}
                  className="btn-navy-luxury w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Request Custom CAD
                </button>
              </motion.div>
            </StaggerItem>

            {/* High Jewellery Tier */}
            <StaggerItem>
              <motion.div
                whileHover={{ y: -8 }}
                className="h-full rounded-2xl bg-white border border-[#E8D7B7] p-8 space-y-6 flex flex-col justify-between shadow-xs hover:shadow-lg transition-shadow"
              >
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl text-[#17345C]">Heritage & High Jewellery</h3>
                  <p className="text-xs text-[#687386] font-normal">
                    Articulated necklaces, Jadau Kundan Polki sets, and multi-piece bridal suites.
                  </p>
                  <div className="text-3xl font-serif text-[#B88732] font-bold">
                    $140 - $280
                    <span className="text-xs text-[#687386] font-normal"> / suite</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#17243B] pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#B88732]" />
                      <span>Multi-body sub-assemblies</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#B88732]" />
                      <span>Hinges, clasps & tongue mechanisms</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#B88732]" />
                      <span>Priority WhatsApp direct access</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => onNavigate('pricing')}
                  className="w-full py-3 rounded-xl border border-[#E8D7B7] text-xs text-[#17345C] hover:border-[#D9B66F] hover:bg-[#FFF9F0] uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                >
                  View Full Pricing
                </button>
              </motion.div>
            </StaggerItem>
          </StaggerGrid>
        </div>
      </section>

      {/* SECTION 11: FINAL CTA BANNER */}
      <section className="relative py-28 text-center bg-gradient-to-b from-[#FFF9F0] via-white to-[#FFF9F0] border-t border-[#E8D7B7] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-[#D9B66F]/10 rounded-full blur-3xl pointer-events-none" />

        <RevealOnScroll className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
          <div className="max-w-3xl mx-auto space-y-6">
            <BrandLogo variant="mark-only" size="lg" className="mx-auto" />

            <h2 className="font-serif text-3xl sm:text-5xl text-[#17345C] leading-tight">
              Ready to Bring Your Jewellery Designs to Life?
            </h2>

            <p className="text-sm sm:text-base text-[#687386] font-normal max-w-xl mx-auto">
              Experience CAD files engineered with 0.02mm tolerance, zero-gap stone seats, and guaranteed castability.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('collections')}
                className="btn-navy-luxury px-9 py-4 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-xl cursor-pointer"
              >
                <span>Explore Ready CAD Files</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('contact')}
                className="px-9 py-4 rounded-full border border-[#E8D7B7] text-[#17345C] hover:border-[#D9B66F] hover:bg-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
              >
                Contact Atelier Team
              </motion.button>
            </div>
          </div>
        </RevealOnScroll>
      </section>

    </div>
  );
};
