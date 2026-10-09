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
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';
import { LazyImage } from '../components/motion/LazyImage';
import { formatINR, formatRupee } from '../utils/currencyHelper';
import { getMainShowcaseCategories, getSanitizedCategories, formatCategoryName } from '../utils/categoryHelper';
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
    const matched = allProducts.filter((p) => {
      const pCat = (p.category || '').toLowerCase();
      const pCatName = (p.categoryName || '').toLowerCase();
      const pTitle = (p.title || '').toLowerCase();

      if (pCat === cSlug || pCatName === cName) return true;

      // 1. Check EARRINGS first so 'earrings' never falsely matches 'ring' substring!
      if (cSlug.includes('earring') || cName.includes('earring')) {
        return (
          pCat.includes('earring') || pCatName.includes('earring') || pTitle.includes('earring') || pTitle.includes('jhumka') || pTitle.includes('stud')
        );
      }

      // 2. RINGS strictly check for ring, and exclude earrings
      if (
        (cSlug.includes('ring') || cName.includes('ring')) &&
        !cSlug.includes('earring') && !cName.includes('earring')
      ) {
        return (
          (pCat.includes('ring') || pCatName.includes('ring') || pTitle.includes('ring')) &&
          !pCat.includes('earring') && !pCatName.includes('earring') && !pTitle.includes('earring')
        );
      }

      if (cSlug.includes('necklace') || cName.includes('necklace')) {
        return pCat.includes('necklace') || pCatName.includes('necklace') || pTitle.includes('necklace') || pTitle.includes('choker');
      }

      if (cSlug.includes('pendant') || cName.includes('pendant') || cSlug.includes('pandent') || cName.includes('pandent')) {
        return pCat.includes('pendant') || pCatName.includes('pendant') || pTitle.includes('pendant') || pCat.includes('pandent') || pTitle.includes('pandent');
      }

      if (cSlug.includes('bracelet') || cName.includes('bracelet') || cSlug.includes('bangle') || cName.includes('bangle')) {
        return (
          pCat.includes('bracelet') || pCatName.includes('bracelet') || pTitle.includes('bracelet') ||
          pCat.includes('bangle') || pCatName.includes('bangle') || pTitle.includes('bangle') || pTitle.includes('kada')
        );
      }

      if (cSlug.includes('mangal') || cName.includes('mangal')) {
        return pCat.includes('mangal') || pCatName.includes('mangal') || pTitle.includes('mangal') || pTitle.includes('tanmaniya');
      }

      if (cSlug.includes('nose') || cName.includes('nose')) {
        return pCat.includes('nose') || pCatName.includes('nose') || pTitle.includes('nose') || pTitle.includes('nath');
      }

      if (cSlug.includes('polki') || cName.includes('polki')) {
        return pCat.includes('polki') || pCatName.includes('polki') || pTitle.includes('polki') || pTitle.includes('jadau');
      }

      return false;
    });

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

  // 1. Resolve Category Banner Cover image (set by admin via file upload or URL)
  const categoryBannerImg = (cat as any).image_display || cat.image || (cat as any).image_url;

  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const getImg = (p: any) => {
    if (!p) return categoryBannerImg || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80';
    return getOptimizedImageUrl(p.primaryImage || p.image || (Array.isArray(p.images) && p.images[0]), cat.name);
  };

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
        {/* TOP DEDICATED SHOWCASE: Always displays the Category Banner Image uploaded by admin */}
        <div 
          onClick={() => onNavigate('collections', cat.slug)}
          className="relative w-full h-[260px] sm:h-[280px] bg-gradient-to-b from-[#FFFDF9] via-[#FFF9F0] to-[#FFF5E6] p-3 sm:p-4 flex items-center justify-center overflow-hidden"
        >
          {/* Subtle gold spotlight backdrop behind jewel */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,182,111,0.18)_0%,transparent_70%)] pointer-events-none" />

          <img
            key={`cat-banner-${cat.id || cat.slug}-${categoryBannerImg}`}
            src={getOptimizedImageUrl(categoryBannerImg, cat.name)}
            alt={cat.name}
            className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(23,52,92,0.12)] transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={(e) => handleImgError(e, cat.slug)}
          />

          {/* Discreet luxury tag */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-md bg-white/95 backdrop-blur-md border border-[#E8D7B7] text-[10px] font-mono uppercase tracking-wider text-[#B88732] shadow-xs">
              {cat.tagline || 'Category Collection'}
            </span>
          </div>
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
                      const isActive = hoveredProduct?.id === prod.id || (hoveredProduct && hoveredProduct.title === prod.title);
                      const imgUrl = getImg(prod);
                      return (
                        <button
                          key={`track1-${prod.id || pIdx}-${pIdx}`}
                          type="button"
                          onMouseEnter={() => {
                            setIsPaused(true);
                            setHoveredProduct(prod);
                          }}
                          onTouchStart={() => {
                            setIsPaused(true);
                            setHoveredProduct(prod);
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
                      const isActive = hoveredProduct?.id === prod.id || (hoveredProduct && hoveredProduct.title === prod.title);
                      const imgUrl = getImg(prod);
                      return (
                        <button
                          key={`track2-${prod.id || pIdx}-${pIdx}`}
                          type="button"
                          onMouseEnter={() => {
                            setIsPaused(true);
                            setHoveredProduct(prod);
                          }}
                          onTouchStart={() => {
                            setIsPaused(true);
                            setHoveredProduct(prod);
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
                  const isActive = hoveredProduct?.id === prod.id || (hoveredProduct && hoveredProduct.title === prod.title);
                  const imgUrl = getImg(prod);
                  return (
                    <button
                      key={`static-${prod.id || pIdx}`}
                      type="button"
                      onMouseEnter={() => {
                        setIsPaused(true);
                        setHoveredProduct(prod);
                      }}
                      onTouchStart={() => {
                        setIsPaused(true);
                        setHoveredProduct(prod);
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

  // State for prominent central search bar
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearchQuery.trim()) {
      onNavigate('collections', heroSearchQuery.trim());
    } else {
      onNavigate('collections');
    }
  };

  const { products: liveProducts, categories, isLoading, isError, errorMessage } = useCatalog();

  const allProducts: Product[] = React.useMemo(
    () => liveProducts.map(toProductShape),
    [liveProducts]
  );

  // Main categories only for Section 3 (guarantees the 8 canonical luxury fine jewellery categories)
  const mainCategories = React.useMemo(
    () => getMainShowcaseCategories(categories),
    [categories]
  );

  // Clean categories for Section 6 filter bar (filters out test, duplicate, and junk categories)
  const filterCategories = React.useMemo(() => {
    const sanitized = getSanitizedCategories(categories);
    const list = sanitized.length > 0 ? sanitized : getMainShowcaseCategories([]);
    return [
      { id: 'all', label: 'All Designs' },
      ...list.map((c) => ({ id: c.slug, label: c.name })),
    ];
  }, [categories]);

  // Robust matching for Section 6 filter
  const filteredProducts: Product[] = React.useMemo(() => {
    const source = liveProducts.map(toProductShape);
    if (selectedFilter === 'all') return source;

    const sFilter = selectedFilter.toLowerCase().trim();

    return source.filter((p) => {
      const pCat = (p.category || '').toLowerCase();
      const pCatSlug = ((p as any).category_slug || '').toLowerCase();
      const pParentSlug = ((p as any).parent_slug || '').toLowerCase();
      const pTitle = (p.title || '').toLowerCase();

      if (pCatSlug === sFilter || pParentSlug === sFilter || pCat === sFilter) return true;

      if (sFilter === 'rings' && (pCat.includes('ring') || pTitle.includes('ring')) && !pCat.includes('earring') && !pTitle.includes('earring')) return true;
      if (sFilter === 'earrings' && (pCat.includes('earring') || pTitle.includes('earring') || pTitle.includes('jhumka') || pTitle.includes('stud'))) return true;
      if (sFilter === 'necklaces' && (pCat.includes('necklace') || pTitle.includes('necklace') || pTitle.includes('choker') || pTitle.includes('collar'))) return true;
      if (sFilter === 'pendants' && (pCat.includes('pendant') || pCat.includes('pandent') || pTitle.includes('pendant') || pTitle.includes('pandent'))) return true;
      if (sFilter.includes('bracelet') && (pCat.includes('bracelet') || pCat.includes('bangle') || pTitle.includes('bracelet') || pTitle.includes('bangle') || pTitle.includes('kada'))) return true;
      if (sFilter === 'mangalsutra' && (pCat.includes('mangal') || pTitle.includes('mangal') || pTitle.includes('tanmaniya'))) return true;
      if (sFilter.includes('nose') && (pCat.includes('nose') || pTitle.includes('nose') || pTitle.includes('nath'))) return true;
      if (sFilter.includes('polki') && (pCat.includes('polki') || pTitle.includes('polki') || pTitle.includes('jadau'))) return true;

      return false;
    });
  }, [liveProducts, selectedFilter]);

  // Paginated visible products: 3 rows initially (12 items), expands via "View More"
  const displayedProducts = React.useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );
  const hasMoreProducts = filteredProducts.length > visibleCount;

  return (
    <div className="min-h-screen bg-white text-[#17243B] overflow-x-clip relative">

      {/* SECTION 1: LUXURY HERO (INSPIRED BY REFERENCE DESIGN) */}
      <section className="relative min-h-[92vh] sm:min-h-screen flex items-center justify-center pt-28 pb-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFFDF9] via-[#FFF9F0] to-[#FFFFFF] overflow-hidden">
        {/* Soft studio illumination glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#D9B66F]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-[#FFF9F0] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />

        {/* LEFT LUXURY RING COMPOSITION */}
        <div className="hidden lg:block absolute left-[-1%] xl:left-[1%] 2xl:left-[3%] top-1/2 -translate-y-1/2 w-[300px] xl:w-[380px] 2xl:w-[440px] pointer-events-none select-none z-10 transition-transform duration-700 hover:scale-105">
          <img
            src="/assets/redesign/hero_ring_left.png"
            alt="Shiuli Luxury Fine Diamond Ring"
            className="w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(23,52,92,0.12)]"
            loading="eager"
          />
        </div>

        {/* RIGHT TECHNICAL CAD SKETCH COMPOSITION */}
        <div className="hidden lg:block absolute right-[-1%] xl:right-[1%] 2xl:right-[3%] top-1/2 -translate-y-1/2 w-[300px] xl:w-[380px] 2xl:w-[440px] pointer-events-none select-none z-10 opacity-95 transition-transform duration-700 hover:scale-105">
          <img
            src="/assets/redesign/hero_cad_sketch_right.png"
            alt="Technical 3D Rhino CAD Engineering Sketch"
            className="w-full h-auto object-contain drop-shadow-[0_15px_30px_rgba(23,52,92,0.08)]"
            loading="eager"
          />
        </div>

        {/* CENTER EDITORIAL CONTENT */}
        <div className="relative z-20 max-w-4xl mx-auto text-center flex flex-col items-center space-y-6 sm:space-y-8">
          
          {/* Top Decorative Line & Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3"
          >
            <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-[#D9B66F]" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-[#B88732] uppercase">
              PREMIUM JEWELLERY CAD STUDIO
            </span>
            <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-[#D9B66F]" />
          </motion.div>

          {/* Main Headline & Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-2.5 sm:space-y-3"
          >
            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-bold text-[#17345C] tracking-tight leading-[1.08]">
              Custom CAD Design
            </h1>
            <p className="font-serif text-lg sm:text-2xl md:text-[26px] text-[#17345C]/85 font-normal tracking-wide">
              From concept to perfect 3D model in 48h
            </p>
          </motion.div>

          {/* 4 Feature Highlights Chips */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2.5 sm:gap-6 pt-1 text-xs sm:text-[13px] text-[#17345C] font-medium"
          >
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#E8D7B7] shadow-xs">
              <Gem className="w-4 h-4 text-[#B88732] shrink-0" />
              <span>Photorealistic 3D Modelling</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#E8D7B7] shadow-xs">
              <FileCheck2 className="w-4 h-4 text-[#B88732] shrink-0" />
              <span>Production Ready CAD Files</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#E8D7B7] shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#236E6A] shrink-0" />
              <span>High Precision &amp; Accuracy</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#E8D7B7] shadow-xs">
              <Clock className="w-4 h-4 text-[#B88732] shrink-0" />
              <span>Fast Turnaround (48 Hours)</span>
            </div>
          </motion.div>

          {/* CENTRAL SEARCH BAR (HIGHEST PRIORITY) */}
          <motion.form
            onSubmit={handleHeroSearch}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="w-full max-w-2xl sm:max-w-3xl pt-2"
          >
            <div className="relative flex items-center bg-white rounded-full border border-[#D9B66F] shadow-[0_12px_36px_rgba(23,52,92,0.1)] hover:shadow-[0_16px_45px_rgba(23,52,92,0.14)] transition-all p-1.5 sm:p-2">
              <div className="pl-3 sm:pl-4 text-[#17345C]">
                <Search className="w-5 h-5 sm:w-5 sm:h-5 text-[#17345C]" />
              </div>

              <input
                type="text"
                value={heroSearchQuery}
                onChange={(e) => setHeroSearchQuery(e.target.value)}
                placeholder="Search rings, earrings, chains, pendants..."
                className="w-full bg-transparent px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-[#17243B] placeholder-[#687386]/70 focus:outline-hidden"
              />

              <button
                type="button"
                onClick={() => onNavigate('collections')}
                className="p-2 sm:p-2.5 text-[#17345C] hover:text-[#B88732] hover:bg-[#FFF9F0] rounded-full transition-colors mr-1 cursor-pointer"
                title="Filter Collections"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              <button
                type="submit"
                className="bg-[#17345C] hover:bg-[#102442] text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
              >
                <span>Search</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.form>

          {/* 4 JEWELLERY CATEGORY SHORTCUTS */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-1"
          >
            {[
              {
                id: 'rings',
                label: 'Rings',
                icon: (
                  <svg className="w-6 h-6 text-[#17345C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="12" cy="14" r="7" />
                    <path d="M12 7L10 3h4l-2 4z" fill="currentColor" opacity="0.25" />
                    <path d="M9 3h6l1.5 4h-9L9 3z" />
                  </svg>
                ),
              },
              {
                id: 'earrings',
                label: 'Earrings',
                icon: (
                  <svg className="w-6 h-6 text-[#17345C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="8" cy="8" r="3" />
                    <circle cx="8" cy="17" r="4" />
                    <circle cx="16" cy="8" r="3" />
                    <circle cx="16" cy="17" r="4" />
                  </svg>
                ),
              },
              {
                id: 'necklaces',
                label: 'Necklace',
                icon: (
                  <svg className="w-6 h-6 text-[#17345C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 6c3 8 13 8 16 0" />
                    <circle cx="12" cy="15" r="2.5" fill="currentColor" opacity="0.25" />
                  </svg>
                ),
              },
              {
                id: 'bracelets-bangles',
                label: 'Bracelet',
                icon: (
                  <svg className="w-6 h-6 text-[#17345C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <ellipse cx="12" cy="12" rx="8" ry="6" strokeDasharray="2 2" strokeWidth="2.5" />
                    <ellipse cx="12" cy="12" rx="8" ry="6" />
                  </svg>
                ),
              },
            ].map((catItem) => (
              <button
                key={catItem.id}
                type="button"
                onClick={() => onNavigate('collections', catItem.id)}
                className="group flex items-center justify-between p-3 sm:p-3.5 bg-[#FFF9F0]/90 hover:bg-[#FFF9F0] rounded-2xl border border-[#E8D7B7] hover:border-[#D9B66F] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 p-1 rounded-xl bg-white border border-[#E8D7B7]/60 group-hover:border-[#D9B66F] transition-colors">
                    {catItem.icon}
                  </div>
                  <span className="text-xs sm:text-sm font-serif font-bold text-[#17345C] group-hover:text-[#B88732] truncate transition-colors">
                    {catItem.label}
                  </span>
                </div>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#D9B66F] flex items-center justify-center text-[#B88732] group-hover:bg-[#17345C] group-hover:text-white group-hover:border-[#17345C] transition-colors shrink-0 ml-1">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </motion.div>

        </div>
      </section>

      {/* SECTION 2: TRUST STRIP (ANIMATED METRICS REVEAL) */}
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

      {/* SECTION 3: FEATURED COLLECTIONS (Category Showcase) */}
      <section className="py-24 bg-white relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
          <RevealOnScroll className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold mb-2">
                <Gem className="w-3.5 h-3.5" />
                Signature Archives
              </div>
              <h2 className="font-serif text-3xl sm:text-5xl text-[#17345C]">
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
