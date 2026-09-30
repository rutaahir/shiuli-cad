import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageId, Product } from '../types';
import { useCatalog, toProductShape } from '../hooks/useCatalog';
import { api } from '../services/api';
import { BrandLogo } from '../components/BrandLogo';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft,
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
  Award
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

  const [hoveredProductIdx, setHoveredProductIdx] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const hoveredProduct = hoveredProductIdx !== null ? categoryProducts[hoveredProductIdx] : null;

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

  return (
    <StaggerItem key={cat.id || idx}>
      <motion.div
        whileHover={{ y: -6, scale: 1.01 }}
        transition={{ duration: 0.3 }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          setIsPaused(false);
          setHoveredProductIdx(null);
        }}
        className="group relative rounded-2xl overflow-hidden min-h-[460px] sm:min-h-[490px] bg-[#0A1333] border border-[#D4AF37]/30 hover:border-[#D4AF37] cursor-pointer shadow-2xl transition-all duration-300 flex flex-col justify-between"
      >
        {/* TOP DEDICATED SHOWCASE: Always displays the Category Banner Image uploaded by admin */}
        <div 
          onClick={() => onNavigate('collections', cat.slug)}
          className="relative w-full h-[260px] sm:h-[280px] bg-gradient-to-b from-[#0E1A42] via-[#091333] to-[#070D24] p-3 sm:p-4 flex items-center justify-center overflow-hidden"
        >
          {/* Subtle gold spotlight backdrop behind jewel */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12)_0%,transparent_70%)] pointer-events-none" />

          <img
            key={`cat-banner-${cat.id || cat.slug}-${categoryBannerImg}`}
            src={getOptimizedImageUrl(categoryBannerImg, cat.name)}
            alt={cat.name}
            className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={(e) => handleImgError(e, cat.slug)}
          />

          {/* Discreet luxury tag */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-[#080E24]/85 backdrop-blur-md border border-[#D4AF37]/35 text-[10px] font-mono uppercase tracking-wider text-[#F5E7A3]">
              {cat.tagline || 'Category Collection'}
            </span>
          </div>
        </div>

        {/* BOTTOM METADATA & SELECTOR PANEL: Solid, structured, with distinct unique thumbnails */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-[#070D24] to-[#050A1C] border-t border-[#D4AF37]/25 space-y-3 flex-1 flex flex-col justify-between">

          {/* Category Title & Count */}
          <div 
            onClick={() => onNavigate('collections', cat.slug)}
            className="cursor-pointer flex items-center justify-between"
          >
            <h3 className="font-serif text-xl sm:text-2xl text-[#FAF8F3] font-bold group-hover:text-[#F5E7A3] transition-colors leading-tight line-clamp-1">
              {cat.name}
            </h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#121F4D] border border-[#D4AF37]/30 text-[#F5E7A3] shrink-0">
              {count} Designs
            </span>
          </div>

          {/* Interactive Products Marquee / Selector Strip (ONLY PRODUCTS, NEVER CATEGORY IMAGE) */}
          <div className="pt-0.5 relative overflow-hidden w-full marquee-pause-hover select-none">
            {isMarqueeMode ? (
              <>
                {/* Subtle luxury edge fade overlays for smooth entrance and exit */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-[#070D24] to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-[#070D24] to-transparent z-10" />

                <div className="flex items-center gap-2 w-max py-1">
                  {/* Primary Track with UNIQUE products */}
                  <div className="flex items-center gap-2 shrink-0 animate-marquee-track">
                    {categoryProducts.map((prod, pIdx) => {
                      const isActive = pIdx === hoveredProductIdx;
                      const imgUrl = getImg(prod);
                      return (
                        <button
                          key={`track1-${prod.id || pIdx}`}
                          type="button"
                          onMouseEnter={() => {
                            setIsPaused(true);
                            setHoveredProductIdx(pIdx);
                          }}
                          onTouchStart={() => {
                            setIsPaused(true);
                            setHoveredProductIdx(pIdx);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickView(prod);
                          }}
                          title={`View ${prod.title} (₹${formatINR(prod.price)})`}
                          className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 border p-0.5 bg-[#09112B] transition-all duration-300 cursor-pointer ${
                            isActive
                              ? 'border-[#D4AF37] ring-2 ring-[#D4AF37] scale-105 shadow-[0_0_12px_rgba(212,175,55,0.6)] z-10'
                              : 'border-white/20 opacity-70 hover:opacity-100 hover:border-white/50'
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
                  <div className="flex items-center gap-2 shrink-0 animate-marquee-track" aria-hidden="true">
                    {categoryProducts.map((prod, pIdx) => {
                      const isActive = pIdx === hoveredProductIdx;
                      const imgUrl = getImg(prod);
                      return (
                        <button
                          key={`track2-${prod.id || pIdx}`}
                          type="button"
                          onMouseEnter={() => {
                            setIsPaused(true);
                            setHoveredProductIdx(pIdx);
                          }}
                          onTouchStart={() => {
                            setIsPaused(true);
                            setHoveredProductIdx(pIdx);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickView(prod);
                          }}
                          title={`View ${prod.title} (₹${formatINR(prod.price)})`}
                          className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 border p-0.5 bg-[#09112B] transition-all duration-300 cursor-pointer ${
                            isActive
                              ? 'border-[#D4AF37] ring-2 ring-[#D4AF37] scale-105 shadow-[0_0_12px_rgba(212,175,55,0.6)] z-10'
                              : 'border-white/20 opacity-70 hover:opacity-100 hover:border-white/50'
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
                  const isActive = pIdx === hoveredProductIdx;
                  const imgUrl = getImg(prod);
                  return (
                    <button
                      key={`static-${prod.id || pIdx}`}
                      type="button"
                      onMouseEnter={() => {
                        setIsPaused(true);
                        setHoveredProductIdx(pIdx);
                      }}
                      onTouchStart={() => {
                        setIsPaused(true);
                        setHoveredProductIdx(pIdx);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickView(prod);
                      }}
                      title={`View ${prod.title} (₹${formatINR(prod.price)})`}
                      className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 border p-0.5 bg-[#09112B] transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'border-[#D4AF37] ring-2 ring-[#D4AF37] scale-105 shadow-[0_0_12px_rgba(212,175,55,0.6)] z-10'
                          : 'border-white/20 opacity-70 hover:opacity-100 hover:border-white/50'
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
              <div className="flex items-center justify-center py-2 text-[10px] text-[#C9C2A6]/80 tracking-wider uppercase font-medium">
                Curating Archive Designs
              </div>
            )}
          </div>

          {/* Action Row with Indian Rupee (₹) Price Badge */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-[#F5E7A3] border-t border-white/5">
            <button
              type="button"
              onClick={() => onNavigate('collections', cat.slug)}
              className="font-semibold uppercase tracking-wider flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-3 h-3 text-[#D4AF37]" />
            </button>

            {hoveredProduct ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickView(hoveredProduct);
                }}
                className="px-2.5 py-1 rounded-md bg-[#121F4D] border border-[#D4AF37]/35 text-[10px] text-[#F5E7A3] hover:text-[#FAF8F3] hover:border-[#D4AF37] transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3 h-3 text-[#D4AF37]" />
                <span>₹{formatINR(hoveredProduct.price)}</span>
              </button>
            ) : minPrice && minPrice > 0 ? (
              <div className="px-2.5 py-1 rounded-md bg-[#121F4D] border border-[#D4AF37]/35 text-[10px] text-[#F5E7A3] flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span>From ₹{formatINR(minPrice)}</span>
              </div>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-[#121F4D]/60 border border-[#D4AF37]/25 text-[10px] font-mono text-[#F5E7A3]/75">
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

  // Parallax Scroll for Hero
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause video when hero is scrolled off-screen to eliminate background GPU/CPU drain
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const { products: liveProducts, categories, isLoading } = useCatalog();

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

  return (
    <div className="min-h-screen bg-[#060B1E] text-[#F5F1E8] overflow-x-clip relative">

      {/* SECTION 1: HERO (UNTOUCHED HERO LAYOUT WITH PARALLAX ON-SCROLL) */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden" style={{ backgroundColor: '#09112B' }}>
        {/* BACKGROUND MEDIA: LIGHTWEIGHT OPTIMIZED POSTER ON MOBILE / DATA-SAVER OR MP4 VIDEO ON DESKTOP */}
        {!isSaveData && (
          <video
            ref={videoRef}
            className="hero-video-bg absolute inset-0 w-full h-full object-cover hidden sm:block will-change-transform"
            src="/assets/hero.mp4"
            poster="/assets/hero-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
        )}
        <img
          src="/assets/hero-poster.jpg"
          alt="Shiuli Luxury CAD Studio"
          className={`hero-video-bg absolute inset-0 w-full h-full object-cover ${isSaveData ? 'block' : 'sm:hidden'}`}
          loading="eager"
        />


        {/* DARK SCRIM FOR MAXIMUM HIGH-CONTRAST TEXT VISIBILITY */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(6,11,30,0.72) 0%, rgba(6,11,30,0.86) 50%, rgba(6,11,30,0.96) 100%)',
            zIndex: 1,
          }}
        />

        {/* Ambient glow orbs (zero-cost radial gradients instead of heavy blur filters) */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(30,79,163,0.2) 0%, transparent 70%)', zIndex: 2 }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-60 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at bottom, rgba(212,175,55,0.16) 0%, transparent 70%)', zIndex: 2 }}
        />

        {/* HERO CONTENT WITH HIGH CONTRAST BRIGHT TYPOGRAPHY */}
        <div
          style={{ zIndex: 10, maxWidth: '880px' }}
          className="relative flex flex-col items-start pt-28 sm:pt-36 pb-16 sm:pb-28 px-4 sm:px-12 lg:px-20 xl:px-28 w-full"
        >
          {/* Vertical gold rule */}
          <div className="hero-vert-rule absolute left-0 top-28 sm:top-36 bottom-16 sm:bottom-28 w-[2px]"
               style={{ background: 'linear-gradient(to bottom, transparent, #D4AF37 25%, #D4AF37 75%, transparent)' }} />

          {/* ROYAL CROWN ORNAMENT */}
          <div className="hero-anim-1 flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8 max-w-full overflow-hidden">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-px w-4 sm:w-8 bg-gradient-to-r from-transparent to-[#D4AF37]" />
              <div className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37]" />
              <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]/40" />
            </div>
            <svg width="28" height="22" viewBox="0 0 28 22" fill="none" className="hero-crown-glow flex-shrink-0">
              <path d="M2 20L5 8L10 14L14 2L18 14L23 8L26 20H2Z" fill="none" stroke="#F5E7A3" strokeWidth="1.8" strokeLinejoin="round"/>
              <circle cx="2" cy="8" r="1.5" fill="#D4AF37" opacity="0.9"/>
              <circle cx="14" cy="2" r="1.8" fill="#FFF099"/>
              <circle cx="26" cy="8" r="1.5" fill="#D4AF37" opacity="0.9"/>
              <line x1="2" y1="21" x2="26" y2="21" stroke="#F5E7A3" strokeWidth="1.2" opacity="0.8"/>
            </svg>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/40" />
              <div className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37]" />
              <div className="h-px w-4 sm:w-8 bg-gradient-to-l from-transparent to-[#D4AF37]" />
            </div>
          </div>

          {/* BADGE */}
          <div className="hero-anim-1 relative mb-6 sm:mb-8 max-w-full">
            <div className="hero-badge-ring absolute -inset-[3px] rounded-full" />
            <div className="relative inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full border border-[#D4AF37]/60 bg-[#060E22]/96 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <span className="hero-badge-dot w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#F5E7A3] flex-shrink-0 shadow-[0_0_8px_#F5E7A3]" />
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] font-extrabold text-[#FFF099] drop-shadow-md">Official Luxury CAD Atelier</span>
              <span className="w-px h-3.5 bg-[#D4AF37]/50" />
              <Gem className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F5E7A3] flex-shrink-0" />
            </div>
          </div>

          {/* HEADLINE */}
          <div className="mb-4 sm:mb-6 overflow-hidden max-w-full">
            <h1 className="font-serif leading-[1.15] sm:leading-[1.1] tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              <span className="hero-line-reveal-1 block text-3xl sm:text-5xl lg:text-[3.6rem] xl:text-[4.2rem] text-white font-medium break-words">
                Where{' '}
                <em className="not-italic font-bold hero-italic-word text-[#FFF099] drop-shadow-[0_0_12px_rgba(255,240,153,0.5)]">Imagination</em>
              </span>
              <span className="hero-line-reveal-2 block text-3xl sm:text-5xl lg:text-[3.6rem] xl:text-[4.2rem] font-extrabold break-words">
                <span className="hero-gold-title text-[#F5E7A3]">Becomes Jewellery</span>
              </span>
            </h1>
          </div>

          {/* ORNATE DIVIDER */}
          <div className="hero-anim-3 flex items-center gap-2.5 mb-6 sm:mb-8">
            <div className="h-px flex-1 max-w-[70px] bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]/60" />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37]" />
              <div className="w-2 h-2 rotate-45 bg-[#FFF099]" />
              <div className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37]" />
            </div>
            <div className="h-px w-24 sm:w-36 bg-gradient-to-r from-[#D4AF37]/60 to-transparent" />
          </div>

          {/* SUBHEADLINE (HIGH VISIBILITY BRIGHT FONTS) */}
          <p className="hero-anim-4 font-sans text-sm sm:text-lg text-[#EBE3D3] font-medium leading-[1.7] sm:leading-[1.9] max-w-[540px] mb-8 sm:mb-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            Premium Rhino{' '}
            <span className="text-[#FFE066] font-bold underline decoration-[#D4AF37]/60 underline-offset-4">.3DM</span> files &amp; watertight{' '}
            <span className="text-[#93C5FD] font-bold underline decoration-blue-400/60 underline-offset-4">STL</span> meshes —
            engineered to{' '}
            <span className="text-white font-extrabold bg-[#D4AF37]/20 px-2 py-0.5 rounded border border-[#D4AF37]/40">±0.02 mm tolerance</span>{' '}
            for the world's finest jewellers.
          </p>

          {/* CTA BUTTONS */}
          <div className="hero-anim-5 flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12 w-full sm:w-auto">
            <button
              onClick={() => onNavigate('collections')}
              className="hero-btn-primary group relative overflow-hidden flex items-center justify-center gap-3 px-6 sm:px-9 py-3.5 sm:py-4 rounded-xl font-extrabold tracking-[0.15em] uppercase text-xs shadow-[0_10px_30px_rgba(212,175,55,0.4)] w-full sm:w-auto"
            >
              <span className="hero-btn-shimmer" />
              <span className="hero-corner-tl" />
              <span className="hero-corner-br" />
              <Sparkles className="w-4 h-4 text-[#0B1330] relative z-10 flex-shrink-0" />
              <span className="relative z-10">Explore CAD Files</span>
              <ArrowRight className="w-4 h-4 text-[#0B1330] relative z-10 flex-shrink-0 group-hover:translate-x-1.5 transition-transform duration-300" />
            </button>

            <button
              onClick={() => onNavigate('custom-design')}
              className="hero-btn-secondary group relative overflow-hidden flex items-center justify-center gap-3 px-6 sm:px-9 py-3.5 sm:py-4 rounded-xl font-extrabold tracking-[0.15em] uppercase text-xs text-[#FAF8F3] bg-[#09112B]/90 border-2 border-[#D4AF37] hover:bg-[#121F4D] transition-all shadow-xl w-full sm:w-auto"
            >
              <span className="hero-corner-tl hero-corner-tl--gold" />
              <span className="hero-corner-br hero-corner-br--gold" />
              <Gem className="w-4 h-4 text-[#F5E7A3] flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-[#FAF8F3]">Start Custom Order</span>
              <ChevronRight className="w-4 h-4 text-[#F5E7A3] flex-shrink-0 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>

          {/* TRUST STRIP (BRIGHT HIGH-CONTRAST CHIPS) */}
          <div className="hero-anim-6 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {[
              { icon: <FileCheck2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFE066]" />, label: 'Native .3DM' },
              { icon: <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#60A5FA]" />, label: 'Watertight STL' },
              { icon: <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />, label: 'Castable Ready' },
              { icon: <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F5E7A3]" />, label: '±0.02 mm' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl bg-[#080E24]/96 border border-[#D4AF37]/35 text-[11px] sm:text-xs text-[#FAF8F3] font-bold shadow-md">
                {icon}
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 hero-anim-7" style={{ zIndex: 10 }}>
          <span className="text-[9px] tracking-[0.4em] uppercase text-white/30">Scroll to Explore</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* SECTION 2: TRUST STRIP (ANIMATED METRICS REVEAL) */}
      <section className="relative py-10 bg-[#080E24] border-y border-[#D4AF37]/20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">
          <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-[#D4AF37]/15">
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
                  className="font-serif text-3xl sm:text-4xl text-[#F5E7A3] font-semibold tracking-tight cursor-default"
                >
                  {metric.number}
                </motion.div>
                <div className="text-xs text-[#C9C2A6] uppercase tracking-wider font-light">
                  {metric.label}
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* SECTION 3: FEATURED COLLECTIONS (Category Showcase) */}
      <section className="py-24 bg-[#060B1E] relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
          <RevealOnScroll className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold mb-2">
                <Gem className="w-3.5 h-3.5" />
                Signature Archives
              </div>
              <h2 className="font-serif text-3xl sm:text-5xl text-[#FAF8F3]">
                Explore Our Ready CAD Collections
              </h2>
            </div>
            <motion.button
              whileHover={{ x: 5 }}
              onClick={() => onNavigate('collections')}
              className="inline-flex items-center gap-1.5 text-xs tracking-wider uppercase text-[#F5E7A3] hover:text-[#FAF8F3] transition-colors"
            >
              <span>View All Categories</span>
              <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
            </motion.button>
          </RevealOnScroll>

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
      <section className="py-24 bg-[#070D22] border-y border-[#D4AF37]/20 relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-16">
          <RevealOnScroll className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
              <Award className="w-3.5 h-3.5" />
              The Shiuli Standard
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#FAF8F3]">
              Engineered for Casting. Perfected for Fine Jewellery.
            </h2>
            <p className="text-sm text-[#C9C2A6] font-light">
              Unlike generic 3D asset marketplaces, every Shiuli file is sculpted by certified bench jewellers and MatrixGold engineers with real casting foundry experience.
            </p>
          </RevealOnScroll>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Precision CAD Modelling',
                desc: 'Native Rhino .3DM files with structured layers for prongs, cutters, collets, and metal bodies. Clean NURBS geometry without messy trims.',
                icon: Layers,
                color: 'text-[#D4AF37] bg-[#D4AF37]/15 border-[#D4AF37]/40',
              },
              {
                title: 'High-Res STL for Casting',
                desc: 'Watertight solids verified with zero non-manifold edges. Pre-compensated for 1.25% gold & platinum shrinkage on 3D wax printers.',
                icon: FileCheck2,
                color: 'text-[#7EACFC] bg-[#1E4FA3]/25 border-[#1E4FA3]/50',
              },
              {
                title: '48-Hour Fast Turnaround',
                desc: 'From pencil sketch to 4K client renders and ready-to-cast CAD in under 48 hours. Express 24-hour delivery available on bespoke bridal orders.',
                icon: Clock,
                color: 'text-emerald-400 bg-[#2E7D5B]/20 border-[#2E7D5B]/40',
              },
              {
                title: 'Design Revisions Included',
                desc: 'Up to 2 complimentary revision rounds on custom orders. We adjust ring sizes, prong heights, or stone arrangements until your client approves.',
                icon: Repeat,
                color: 'text-[#F5E7A3] bg-[#D4AF37]/15 border-[#D4AF37]/40',
              },
            ].map((pillar, i) => {
              const IconComp = pillar.icon;
              return (
                <StaggerItem key={i}>
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 rounded-2xl bg-[#091029] border border-[#D4AF37]/25 shadow-xl space-y-4 hover:border-[#D4AF37] transition-all backdrop-blur-md cursor-pointer"
                  >
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${pillar.color}`}>
                      <IconComp className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-xl text-[#FAF8F3]">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-[#C9C2A6] leading-relaxed font-light">
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
      <section className="py-24 bg-[#060B1E] relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-16">
          <RevealOnScroll className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
              Simple 4-Step Process
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-[#FAF8F3]">
              How To Acquire Your Studio CAD Files
            </h2>
            <p className="text-xs text-[#C9C2A6] font-light">
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
              className="hidden md:block absolute top-8 left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#5B8DEF] to-[#D4AF37] z-0 origin-left"
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
                  className="w-16 h-16 mx-auto rounded-full bg-[#060B1E] border-2 border-[#D4AF37] flex items-center justify-center text-lg font-serif font-bold text-[#F5E7A3] shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer"
                >
                  {step.num}
                </motion.div>
                <h4 className="font-serif text-lg text-[#FAF8F3]">
                  {step.title}
                </h4>
                <p className="text-xs text-[#C9C2A6] leading-relaxed font-light">
                  {step.desc}
                </p>
              </RevealOnScroll>
            ))}
          </div>

          <div className="pt-4 text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => onNavigate('how-it-works')}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#D4AF37] hover:text-[#F5E7A3] font-semibold"
            >
              <span>Learn About Full 7-Stage Quality Control</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </section>

      {/* SECTION 6: FEATURED / BESTSELLING DESIGNS */}
      <section className="py-24 bg-[#080E24] border-t border-[#D4AF37]/20 relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
          <RevealOnScroll className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
              Ready-To-Cast CAD Files
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-[#FAF8F3]">
              Bestselling Jewellery CAD Files
            </h2>
            <p className="text-xs text-[#C9C2A6] font-light">
              Instant download includes native Rhino .3DM, castable .STL, and 4K render pack.
            </p>
          </RevealOnScroll>

          {/* Sticky Category Filter Bar — stays pinned below navbar when scrolling products */}
          <div className="sticky top-[64px] sm:top-[84px] z-30 py-2.5 sm:py-3 px-3 sm:px-6 rounded-2xl bg-[#080E24]/95 backdrop-blur-2xl border border-[#D4AF37]/35 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex overflow-x-auto no-scrollbar sm:flex-wrap items-center justify-start sm:justify-center gap-1.5 sm:gap-2 max-w-5xl mx-auto transition-all">
            {filterCategories.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  selectedFilter === filter.id
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#0B1330] font-extrabold shadow-[0_0_14px_rgba(212,175,55,0.45)] scale-105'
                    : 'bg-[#121F4D]/80 text-[#C9C2A6] hover:text-white hover:bg-[#1A2E6D] border border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl bg-[#091029] border border-[#D4AF37]/20 p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#121F4D] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl text-[#FAF8F3]">
                No Designs Found in This Category
              </h3>
              <p className="text-xs text-[#C9C2A6] leading-relaxed">
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
                  className="px-5 py-2 rounded-full border border-[#D4AF37]/30 text-xs text-[#FAF8F3] hover:bg-white/5 transition-colors"
                >
                  Request Custom CAD
                </button>
              </div>
            </div>
          ) : (
            <StaggerGrid key={selectedFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const isWishlisted = wishlistIds.includes(product.id);
                return (
                  <StaggerItem key={product.id}>
                    <motion.div
                      whileHover={{ y: -8 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => onNavigate('product-detail', product.id)}
                      className="group rounded-2xl bg-[#0B1330] border border-[#D4AF37]/20 overflow-hidden shadow-xl hover:border-[#D4AF37]/60 transition-all flex flex-col justify-between cursor-pointer"
                    >
                      {/* Image Frame (object-contain with padding prevents edge cutting) */}
                      <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-[#0c163b] to-[#070D22] flex items-center justify-center p-3">
                        <LazyImage
                          src={getOptimizedImageUrl(product.primaryImage, product.category)}
                          alt={product.title}
                          className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)] transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                          {product.isBestseller && (
                            <span className="px-2 py-0.5 rounded-md bg-[#D4AF37] text-[#0B1330] text-[10px] font-bold tracking-wider uppercase shadow-md">
                              Bestseller
                            </span>
                          )}
                          {product.isNew && (
                            <span className="px-2 py-0.5 rounded-md bg-[#1E4FA3] text-white text-[10px] font-bold tracking-wider uppercase shadow-md">
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
                                ? 'bg-[#D4AF37] text-[#0B1330]'
                                : 'bg-[#0B1330]/70 text-[#FAF8F3] hover:text-[#D4AF37]'
                            }`}
                            title="Wishlist"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
                          className="absolute inset-x-3 bottom-3 z-10 py-2 rounded-xl bg-[#0B1330]/90 backdrop-blur border border-[#D4AF37]/30 text-xs text-[#FAF8F3] flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Quick View Specs</span>
                        </button>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 space-y-3">
                        <div className="text-[10px] uppercase tracking-wider text-[#D4AF37] font-medium">
                          {product.category} • {product.specs.diamondCount} Stones
                        </div>

                        <h3 className="font-serif text-lg text-[#FAF8F3] group-hover:text-[#F5E7A3] line-clamp-1 transition-colors">
                          {product.title}
                        </h3>

                        <div className="flex items-center justify-between text-xs text-[#C9C2A6] pt-1 border-t border-white/5 font-light">
                          <span>18K: {product.specs.metalWeight18k}</span>
                          <span className="font-mono text-emerald-400">STL Verified</span>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div>
                            <span className="text-xl font-serif font-bold text-[#F5E7A3]">
                              ₹{formatINR(product.price)}
                            </span>
                            {product.originalPrice && (
                              <span className="text-xs text-[#C9C2A6] line-through ml-1.5">
                                ₹{formatINR(product.originalPrice)}
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
                    </motion.div>
                  </StaggerItem>
                );
              })}
            </StaggerGrid>
          )}

          <div className="pt-4 text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => onNavigate('collections')}
              className="px-8 py-3.5 rounded-full border border-[#D4AF37]/40 text-[#FAF8F3] hover:border-[#D4AF37] hover:bg-[#121F4D]/40 text-xs font-semibold uppercase tracking-wider transition-all"
            >
              Browse Complete Catalog (200+ CAD Files)
            </motion.button>
          </div>
        </div>
      </section>

      {/* SECTION 7: CUSTOM DESIGN SPOTLIGHT (Split Banner with Before/After Slider) */}
      <section className="py-24 bg-[#060B1E] relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Text Column */}
            <RevealOnScroll className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
                <Zap className="w-3.5 h-3.5" />
                Bespoke CAD Service
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#FAF8F3] leading-tight">
                Have a Design in Mind? Let’s Build It Together.
              </h2>

              <p className="text-sm sm:text-base text-[#C9C2A6] font-light leading-relaxed">
                Send us a hand-drawn pencil sketch, gouache illustration, or client moodboard. Our master MatrixGold modelers will engineer a ready-to-cast 3D NURBS assembly with stone seats and 4K photorealistic renders in 48 hours.
              </p>

              {/* Feature Checklist */}
              <div className="space-y-2.5 text-xs text-[#FAF8F3]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>Zero stone setting rocking guarantee with pre-notched 42° seats</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>Exact finger sizes calibrated across US, EU, and Indian ring standards</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>Includes 4K ray-traced turntable render video for instant client sign-off</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => onNavigate('custom-design')}
                  className="btn-gold-luxury px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-xl"
                >
                  <span>Start Custom Request</span>
                  <ArrowRight className="w-4 h-4 text-[#0B1330]" />
                </motion.button>

                <a
                  href="https://wa.me/919574787098"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3.5 rounded-full border border-[#D4AF37]/30 text-xs text-[#FAF8F3] hover:border-[#D4AF37] hover:bg-white/5 transition-colors"
                >
                  Chat on WhatsApp (+91 95747 87098)
                </a>
              </div>
            </RevealOnScroll>

            {/* Right Column: Interactive Before/After Slider */}
            <RevealOnScroll className="lg:col-span-6" delay={0.2}>
              <BeforeAfterSlider
                beforeImage="/unsplash-img/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80"
                afterImage="/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=80"
                beforeLabel="Client Concept Sketch"
                afterLabel="Shiuli 4K 3D CAD Render"
              />
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* SECTION 8: TESTIMONIALS WITH SMOOTH TRANSITION */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-[#070D22] border-y border-[#D4AF37]/20 relative">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
            <RevealOnScroll className="text-center space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
                Client Testimonials
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl text-[#FAF8F3]">
                Trusted By Master Jewellers Globally
              </h2>
            </RevealOnScroll>

            {/* Carousel Card */}
            <RevealOnScroll className="max-w-4xl mx-auto relative rounded-3xl bg-[#091029] border border-[#D4AF37]/30 p-8 sm:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <div className="text-4xl font-serif text-[#D4AF37] mb-4">“</div>
              
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeTestimonialIdx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="font-serif text-lg sm:text-2xl text-[#FAF8F3] leading-relaxed italic mb-8"
                >
                  {testimonials[activeTestimonialIdx]?.quote}
                </motion.p>
              </AnimatePresence>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#D4AF37]/15 pt-6">
                <div className="flex items-center gap-4">
                  {(testimonials[activeTestimonialIdx]?.avatar_url || testimonials[activeTestimonialIdx]?.avatar) && (
                    <img
                      src={testimonials[activeTestimonialIdx]?.avatar_url || testimonials[activeTestimonialIdx]?.avatar}
                      alt={testimonials[activeTestimonialIdx]?.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#D4AF37] shadow-md"
                    />
                  )}
                  <div>
                    <h4 className="font-serif text-lg text-[#FAF8F3] font-semibold">
                      {testimonials[activeTestimonialIdx]?.name}
                    </h4>
                    <p className="text-xs text-[#C9C2A6] font-light">
                      {testimonials[activeTestimonialIdx]?.role_or_company || testimonials[activeTestimonialIdx]?.role}
                    </p>
                    {testimonials[activeTestimonialIdx]?.project_type && (
                      <p className="text-[11px] text-[#D4AF37] font-mono">
                        {testimonials[activeTestimonialIdx].project_type}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rating and Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="flex text-[#D4AF37]">
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
                      className="p-2.5 rounded-full border border-[#D4AF37]/30 text-[#C9C2A6] hover:text-[#FAF8F3] hover:border-[#D4AF37] transition-colors"
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
                      className="p-2.5 rounded-full border border-[#D4AF37]/30 text-[#C9C2A6] hover:text-[#FAF8F3] hover:border-[#D4AF37] transition-colors"
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
      <section className="py-24 bg-[#060B1E] relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-10">
          <RevealOnScroll className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
                Visual Proof of Craftsmanship
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl text-[#FAF8F3]">
                The Shiuli Lookbook
              </h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => onNavigate('gallery')}
              className="btn-gold-luxury px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
            >
              <span>View Full Studio Gallery</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#0B1330]" />
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
                  className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#0E183D] border border-[#D4AF37]/25 cursor-pointer shadow-xl hover:border-[#D4AF37]"
                >
                  <img
                    src={item.image || item.primary_image || item.primary_image_url}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1330] via-[#0B1330]/30 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-5 space-y-1">
                    <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider font-semibold">
                      {item.category_name || item.category || 'Portfolio'} {item.specs?.weight ? `• ${item.specs.weight}` : ''}
                    </span>
                    <h3 className="font-serif text-xl text-[#FAF8F3] group-hover:text-[#F5E7A3] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#C9C2A6] line-clamp-1 font-light">{item.description}</p>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* SECTION 10: PRICING PREVIEW */}
      <section className="py-24 bg-[#080E24] border-t border-[#D4AF37]/20 relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 space-y-14">
          <RevealOnScroll className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
              Transparent Rates
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-[#FAF8F3]">
              Simple, Predictable CAD Pricing
            </h2>
            <p className="text-xs text-[#C9C2A6] font-light">
              Honest investment without hidden model licensing or seat fees.
            </p>
          </RevealOnScroll>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Basic Tier */}
            <StaggerItem>
              <motion.div
                whileHover={{ y: -8 }}
                className="h-full rounded-2xl bg-[#091029] border border-[#D4AF37]/20 p-8 space-y-6 flex flex-col justify-between shadow-xl"
              >
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl text-[#FAF8F3]">Ready CAD Model</h3>
                  <p className="text-xs text-[#C9C2A6] font-light">
                    Instant download from our curated catalogue of classic solitaires, halos, and bands.
                  </p>
                  <div className="text-3xl font-serif text-[#F5E7A3] font-bold">
                    $35 - $55
                    <span className="text-xs text-[#C9C2A6] font-normal"> / design</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#FAF8F3] pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>Layered Rhino .3DM file</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>Watertight .STL for casting</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>Instant download unlock</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => onNavigate('collections')}
                  className="w-full py-3 rounded-xl border border-[#D4AF37]/30 text-xs text-[#FAF8F3] hover:border-[#D4AF37] uppercase tracking-wider font-semibold transition-colors"
                >
                  Browse Catalog
                </button>
              </motion.div>
            </StaggerItem>

            {/* Custom Tier - Most Popular */}
            <StaggerItem>
              <motion.div
                whileHover={{ y: -10, scale: 1.02 }}
                className="h-full relative rounded-2xl bg-gradient-to-b from-[#0E183D] to-[#0A122E] border-2 border-[#D4AF37] p-8 space-y-6 flex flex-col justify-between shadow-[0_15px_50px_rgba(212,175,55,0.25)]"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#0B1330] text-[10px] font-bold tracking-widest uppercase shadow-md">
                  Most Popular for Bespoke
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="font-serif text-2xl text-[#FAF8F3]">Bespoke Custom CAD</h3>
                  <p className="text-xs text-[#C9C2A6] font-light">
                    Custom engineering modeled from your client’s sketch or reference photos.
                  </p>
                  <div className="text-3xl font-serif text-[#F5E7A3] font-bold">
                    $65 - $110
                    <span className="text-xs text-[#C9C2A6] font-normal"> / piece</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#FAF8F3] pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>48-Hour delivery guarantee</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>2 Rounds of revisions included</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>4K Physically based renders</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>Full manufacturing casting specs</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => onNavigate('custom-design')}
                  className="btn-gold-luxury w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider"
                >
                  Request Custom CAD
                </button>
              </motion.div>
            </StaggerItem>

            {/* High Jewellery Tier */}
            <StaggerItem>
              <motion.div
                whileHover={{ y: -8 }}
                className="h-full rounded-2xl bg-[#091029] border border-[#D4AF37]/20 p-8 space-y-6 flex flex-col justify-between shadow-xl"
              >
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl text-[#FAF8F3]">Heritage & High Jewellery</h3>
                  <p className="text-xs text-[#C9C2A6] font-light">
                    Articulated necklaces, Jadau Kundan Polki sets, and multi-piece bridal suites.
                  </p>
                  <div className="text-3xl font-serif text-[#F5E7A3] font-bold">
                    $140 - $280
                    <span className="text-xs text-[#C9C2A6] font-normal"> / suite</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#FAF8F3] pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>Multi-body sub-assemblies</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>Hinges, clasps & tongue mechanisms</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>Priority WhatsApp direct access</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => onNavigate('pricing')}
                  className="w-full py-3 rounded-xl border border-[#D4AF37]/30 text-xs text-[#FAF8F3] hover:border-[#D4AF37] uppercase tracking-wider font-semibold transition-colors"
                >
                  View Full Pricing
                </button>
              </motion.div>
            </StaggerItem>
          </StaggerGrid>
        </div>
      </section>

      {/* SECTION 11: FINAL CTA BANNER */}
      <section className="relative py-28 text-center bg-gradient-to-b from-[#060B1E] via-[#0E183D] to-[#040816] border-t border-[#D4AF37]/20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <RevealOnScroll className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
          <div className="max-w-3xl mx-auto space-y-6">
            <BrandLogo variant="mark-only" size="lg" className="mx-auto" />

            <h2 className="font-serif text-3xl sm:text-5xl text-[#FAF8F3] leading-tight">
              Ready to Bring Your Jewellery Designs to Life?
            </h2>

            <p className="text-sm sm:text-base text-[#C9C2A6] font-light max-w-xl mx-auto">
              Experience CAD files engineered with 0.02mm tolerance, zero-gap stone seats, and guaranteed castability.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('collections')}
                className="btn-gold-luxury px-9 py-4 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-2xl"
              >
                <span>Explore Ready CAD Files</span>
                <ArrowRight className="w-4 h-4 text-[#0B1330]" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('contact')}
                className="px-9 py-4 rounded-full border border-[#D4AF37]/40 text-[#FAF8F3] hover:border-[#D4AF37] hover:bg-white/5 text-xs font-semibold uppercase tracking-wider transition-all"
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
