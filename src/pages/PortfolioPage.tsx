import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Diamond,
  Sparkles,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Filter,
  Layers,
  ArrowRight,
  RotateCcw,
  Sliders,
  Box,
  Clock,
  ShieldCheck,
  Star,
  Wrench,
  Bot,
  Zap,
  Gem,
  Play,
  Pause,
  LayoutGrid,
  Maximize2,
  Crown,
  Compass,
  Flame,
  Check,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { PortfolioItemData, PageId } from '../types';
import { SkeletonShimmer } from '../components/motion/SkeletonShimmer';
import { BrandLogo } from '../components/BrandLogo';

interface PortfolioPageProps {
  onNavigate: (page: PageId, slug?: string) => void;
}

const JEWELLERY_TYPE_FILTERS = [
  { label: 'All Types', slug: '' },
  { label: 'Rings', slug: 'rings' },
  { label: 'Earrings', slug: 'earrings' },
  { label: 'Pendants', slug: 'pendants' },
  { label: 'Necklaces', slug: 'necklaces' },
  { label: 'Bracelets', slug: 'bracelets' },
  { label: 'Bangles', slug: 'bangles' },
  { label: 'Bridal', slug: 'bridal' },
  { label: "Men's", slug: 'mens' },
  { label: 'Sets', slug: 'sets' },
];

const PROJECT_TYPE_FILTERS = [
  { label: 'All Projects', value: '' },
  { label: 'Custom Projects', value: 'custom' },
  { label: 'AI Projects', value: 'ai' },
];

const FALLBACK_PORTFOLIO_ITEMS: Partial<PortfolioItemData>[] = [
  {
    id: 101,
    title: 'Nizam Pearl & Polki Emerald Choker',
    description: 'Bespoke 18K yellow gold royal bridal choker engineered with multi-strand seed pearls, micro-pavé halo prongs, and 0.02mm calibrated Kundan foil seats. Crafted with dual-hinge mechanical joints for zero flip on royal attire.',
    category_slug: 'necklaces',
    category_name: 'Necklaces',
    is_custom_project: true,
    is_ai_project: false,
    is_featured: true,
    is_published: true,
    completed_date: 'Sep 2026',
    primary_image: '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85',
    craftsman_note: 'Engineered with dual-hinge mechanical links preventing neck flips during royal wedding wear.',
    aspect_ratio: 'aspect-[3/4]',
  },
  {
    id: 102,
    title: 'Cathedral Solitaire Diamond Engagement Ring',
    description: 'High-carat solitaire ring featuring a 6-prong lotus collet basket, knife-edge shank profile, and pre-calculated 18K gold casting shrinkage calibration.',
    category_slug: 'rings',
    category_name: 'Rings',
    is_custom_project: true,
    is_ai_project: false,
    is_featured: true,
    is_published: true,
    completed_date: 'Aug 2026',
    primary_image: '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85',
    craftsman_note: 'Collet seat notched at exact 42° pavilion angle to securely lock 2.5ct center stone.',
    aspect_ratio: 'aspect-square',
  },
  {
    id: 103,
    title: 'Parametric Generative AI Lotus Jhumka',
    description: 'AI-assisted concept study converting 2D generative artwork into a wax-ready 3D CAD model featuring cascading filigree bells and micro-bead prongs.',
    category_slug: 'earrings',
    category_name: 'Earrings',
    is_custom_project: false,
    is_ai_project: true,
    is_featured: true,
    is_published: true,
    completed_date: 'Jul 2026',
    primary_image: '/unsplash-img/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85',
    craftsman_note: 'Synthesized via Shiuli AI Studio and converted to Rhino 8 NURBS surfaces.',
    aspect_ratio: 'aspect-[4/5]',
  },
  {
    id: 104,
    title: 'Art Deco Sapphire Medallion Pendant',
    description: 'Geometric 18K white gold pendant with octagonal baguette channel settings, French filigree under-gallery, and pre-drilled chain bail loop.',
    category_slug: 'pendants',
    category_name: 'Pendants',
    is_custom_project: true,
    is_ai_project: false,
    is_featured: false,
    is_published: true,
    completed_date: 'Jul 2026',
    primary_image: '/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85',
    craftsman_note: 'Features 0.15mm laser-engraved edge step chamfers for high polish brilliance.',
    aspect_ratio: 'aspect-[3/4]',
  },
  {
    id: 105,
    title: 'Riviera Diamond Tennis Bracelet',
    description: 'Continuous 4-prong tennis bracelet link assembly with double-latch box clasp and concealed hinge pins engineered for smooth daily wrist movement.',
    category_slug: 'bracelets',
    category_name: 'Bracelets',
    is_custom_project: true,
    is_ai_project: false,
    is_featured: false,
    is_published: true,
    completed_date: 'Jun 2026',
    primary_image: '/unsplash-img/photo-1611591475140-be38b638ed3d?auto=format&fit=crop&w=1000&q=85',
    craftsman_note: '56 individual link assemblies nested with hidden pin joints.',
    aspect_ratio: 'aspect-square',
  },
  {
    id: 106,
    title: 'AI Celestial Galaxy Medallion',
    description: 'AI concept generation featuring celestial constellations, deep relief ZBrush sculpting, and micro-pavé star alignment.',
    category_slug: 'pendants',
    category_name: 'Pendants',
    is_custom_project: false,
    is_ai_project: true,
    is_featured: true,
    is_published: true,
    completed_date: 'May 2026',
    primary_image: '/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85',
    craftsman_note: 'Multi-layered relief map sculpted in ZBrush 2026.',
    aspect_ratio: 'aspect-[4/3]',
  }
];

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<PortfolioItemData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dynamicCategories, setDynamicCategories] = useState<any[]>([]);

  // Independent Dual Filter Group States
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProjectType, setSelectedProjectType] = useState<string>('');

  // Spotlight carousel state
  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Pagination state ("Load More")
  const [displayCount, setDisplayCount] = useState<number>(8);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Lightbox Modal state
  const [activeItem, setActiveItem] = useState<PortfolioItemData | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Fetch portfolio items & dynamic categories from backend API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getPortfolioItems(selectedCategory, selectedProjectType),
      api.getCategories(true),
    ])
      .then(([data, cats]) => {
        if (!isMounted) return;
        if (cats && Array.isArray(cats)) {
          setDynamicCategories(cats);
        }
        if (data && data.length > 0) {
          setItems(data);
        } else {
          const filtered = FALLBACK_PORTFOLIO_ITEMS.filter((item: any) => {
            const matchesCat = !selectedCategory || (item.category_slug && item.category_slug.includes(selectedCategory));
            const matchesType = !selectedProjectType ||
              (selectedProjectType === 'custom' && item.is_custom_project) ||
              (selectedProjectType === 'ai' && item.is_ai_project);
            return matchesCat && matchesType;
          }) as PortfolioItemData[];
          setItems(filtered);
        }
      })
      .catch((err) => {
        console.warn('Using fallback portfolio items:', err);
        const filtered = FALLBACK_PORTFOLIO_ITEMS.filter((item: any) => {
          const matchesCat = !selectedCategory || (item.category_slug && item.category_slug.includes(selectedCategory));
          const matchesType = !selectedProjectType ||
            (selectedProjectType === 'custom' && item.is_custom_project) ||
            (selectedProjectType === 'ai' && item.is_ai_project);
          return matchesCat && matchesType;
        }) as PortfolioItemData[];
        setItems(filtered);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory, selectedProjectType]);

  const jewelleryTypeFilters = useMemo(() => {
    const base = [{ label: 'All Types', slug: '' }];
    if (dynamicCategories.length > 0) {
      return [
        ...base,
        ...dynamicCategories.map((c) => ({ label: c.name, slug: c.slug })),
      ];
    }
    return [
      ...base,
      ...JEWELLERY_TYPE_FILTERS.filter((f) => f.slug !== ''),
    ];
  }, [dynamicCategories]);

  // Featured Spotlight items (uses featured items if > 1, else all items)
  const spotlightItems = useMemo(() => {
    const featured = items.filter(item => item.is_featured);
    return featured.length > 1 ? featured : items;
  }, [items]);

  const nextSpotlight = useCallback(() => {
    setSpotlightIndex(prev => (prev + 1) % (spotlightItems.length || 1));
  }, [spotlightItems.length]);

  const prevSpotlight = useCallback(() => {
    setSpotlightIndex(prev => (prev === 0 ? (spotlightItems.length || 1) - 1 : prev - 1));
  }, [spotlightItems.length]);

  // Auto-change timer (4 seconds)
  useEffect(() => {
    if (isPlaying && spotlightItems.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setSpotlightIndex(prev => (prev + 1) % spotlightItems.length);
      }, 4000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying, spotlightItems.length]);

  // Derived aggregate counts for hero
  const customCount = useMemo(() => {
    return items.filter(i => i.is_custom_project).length || 12;
  }, [items]);

  const visibleGridItems = useMemo(() => {
    return items.slice(0, displayCount);
  }, [items, displayCount]);

  const hasMore = items.length > displayCount;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount((prev) => prev + 6);
      setIsLoadingMore(false);
    }, 400);
  };

  const resetFilters = () => {
    setSelectedCategory('');
    setSelectedProjectType('');
  };

  const isFilterActive = Boolean(selectedCategory || selectedProjectType);

  // Lightbox handlers
  const openLightbox = (item: PortfolioItemData) => {
    setActiveItem(item);
    setActiveImageIndex(0);
  };

  const closeLightbox = () => {
    setActiveItem(null);
  };

  const getLightboxImages = () => {
    if (!activeItem) return [];
    const imgs: string[] = [];
    if (activeItem.primary_image) imgs.push(activeItem.primary_image);
    if (activeItem.gallery_images) {
      activeItem.gallery_images.forEach((g: any) => {
        if (g.image) imgs.push(g.image);
      });
    }
    return imgs.length > 0 ? imgs : ['/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85'];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeItem) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') {
        const imgs = getLightboxImages();
        setActiveImageIndex((prev) => (prev === 0 ? imgs.length - 1 : prev - 1));
      }
      if (e.key === 'ArrowRight') {
        const imgs = getLightboxImages();
        setActiveImageIndex((prev) => (prev === imgs.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItem]);

  const activeSpotlightItem = spotlightItems[spotlightIndex] || spotlightItems[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#060B1E] text-slate-100 font-sans relative overflow-hidden text-left"
    >
      {/* Background Royal Ambient Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-radial from-[#D4AF37]/15 via-[#09112B]/20 to-transparent blur-3xl pointer-events-none" />

      {/* ================= SECTION 1 — HERO ================= */}
      <section className="relative pt-20 sm:pt-24 pb-8 sm:pb-10 px-4 sm:px-6 lg:px-8 xl:px-12 border-b border-[#D4AF37]/20 bg-gradient-to-r from-[#09112B] via-[#060B1E] to-[#09112B]">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 text-left">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-xs font-bold uppercase tracking-widest">
              <Crown className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
              OUR BEST WORK
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-extrabold text-white tracking-tight leading-tight">
              Craftsmanship, On Display.
            </h1>
            <p className="text-slate-300 text-xs sm:text-base max-w-2xl font-light leading-relaxed">
              Real commissions and real precision, spanning both bespoke human artistry and AI-assisted concept exploration.
            </p>
          </div>

          {/* Live Stat Row */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-[#09112B]/90 border border-[#D4AF37]/30 flex items-center gap-2 text-[#F5E7A3] shadow-lg">
              <Diamond className="w-4 h-4 text-[#D4AF37]" />
              <span><strong className="text-white text-sm">{items.length || 24}</strong> Pieces Showcased</span>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-[#09112B]/90 border border-[#D4AF37]/30 flex items-center gap-2 text-[#F5E7A3] shadow-lg">
              <Gem className="w-4 h-4 text-[#D4AF37]" />
              <span><strong className="text-white text-sm">{customCount}</strong> Custom Commissions</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 2 — DUAL INDEPENDENT FILTER BAR ================= */}
      <section className="sticky top-14 sm:top-16 z-30 bg-[#060B1E]/95 backdrop-blur-xl border-b border-[#D4AF37]/25 py-3 px-4 sm:px-6 lg:px-8 xl:px-12 shadow-xl">
        <div className="max-w-[1600px] mx-auto space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Filter Group A: Jewellery Type */}
            <div className="space-y-1 text-left flex-1">
              <span className="text-[10px] font-extrabold text-[#D4AF37] uppercase tracking-widest block">
                FILTER BY JEWELLERY TYPE
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {jewelleryTypeFilters.map((cat) => {
                  const isActive = selectedCategory === cat.slug;
                  return (
                    <button
                      key={cat.slug || 'all'}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                        isActive
                          ? 'bg-[#D4AF37] text-[#060B1E] border-[#D4AF37] shadow-md font-extrabold scale-105'
                          : 'bg-[#09112B]/80 text-slate-300 border-white/10 hover:border-[#D4AF37]/40 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Group B: Project Type */}
            <div className="space-y-1 text-left">
              <span className="text-[10px] font-extrabold text-[#D4AF37] uppercase tracking-widest block">
                FILTER BY PROJECT TYPE
              </span>
              <div className="flex items-center gap-1.5 bg-[#09112B] p-1 rounded-xl border border-white/10">
                {PROJECT_TYPE_FILTERS.map((pt) => {
                  const isActive = selectedProjectType === pt.value;
                  return (
                    <button
                      key={pt.value}
                      onClick={() => setSelectedProjectType(pt.value)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-[#121F4D] text-[#F5E7A3] border border-[#D4AF37]/50 shadow-sm font-extrabold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
            <span className="font-mono text-[#F5E7A3] font-bold">
              Showing {items.length} pieces {isFilterActive && 'matching current filters'}
            </span>

            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="text-[#D4AF37] hover:text-[#F5E7A3] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ================= SECTION 4 — AUTO-CHANGING FEATURED HIGHLIGHTS SPOTLIGHT ================= */}
      {spotlightItems.length > 0 && !isFilterActive && (
        <section className="py-8 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto space-y-4">
          <div className="flex items-center justify-between text-left">
            <div>
              <span className="text-xs font-extrabold text-[#D4AF37] uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
                CURATED FEATURED HIGHLIGHTS
              </span>
              <h2 className="text-2xl font-serif font-extrabold text-white">
                Masterpiece Spotlight
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Auto-play status pill & Play/Pause button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded-xl bg-[#09112B] border border-slate-800 text-[#F5E7A3] text-xs font-mono font-bold flex items-center gap-1.5 hover:border-[#D4AF37] transition-colors cursor-pointer"
                title={isPlaying ? 'Pause Auto-Change Carousel' : 'Start Auto-Change Carousel'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-[#D4AF37]" /> : <Play className="w-3.5 h-3.5 text-[#D4AF37]" />}
                <span>{isPlaying ? 'Auto-Rotating' : 'Paused'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevSpotlight}
                  className="p-2 rounded-xl bg-[#09112B] border border-slate-800 text-slate-300 hover:text-white hover:border-[#D4AF37] transition-colors cursor-pointer"
                  title="Previous Slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextSpotlight}
                  className="p-2 rounded-xl bg-[#09112B] border border-slate-800 text-slate-300 hover:text-white hover:border-[#D4AF37] transition-colors cursor-pointer"
                  title="Next Slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {activeSpotlightItem && (
            <div className="bg-gradient-to-br from-[#09112B] via-[#0B1436] to-[#060B1E] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSpotlightItem.id || spotlightIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-7 relative group">
                    <div className="aspect-[16/10] relative rounded-2xl overflow-hidden bg-[#060B1E] border border-[#D4AF37]/40 shadow-xl">
                      <img
                        src={activeSpotlightItem.primary_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85'}
                        alt={activeSpotlightItem.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        {activeSpotlightItem.is_ai_project ? (
                          <span className="px-3 py-1 rounded-full bg-purple-950/90 border border-purple-500/50 text-purple-200 text-xs font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-purple-300" /> AI Concept
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-[#060B1E]/90 border border-[#D4AF37]/60 text-[#F5E7A3] text-xs font-bold flex items-center gap-1">
                            <Gem className="w-3.5 h-3.5 text-[#D4AF37]" /> Bespoke Custom
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#D4AF37] font-bold uppercase tracking-wider">
                        {activeSpotlightItem.category_name || 'Haute Joaillerie'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Slide {spotlightIndex + 1} of {spotlightItems.length}
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-serif font-extrabold text-white">
                      {activeSpotlightItem.title}
                    </h3>
                    
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-light">
                      {activeSpotlightItem.description}
                    </p>

                    {activeSpotlightItem.craftsman_note && (
                      <div className="p-3.5 rounded-2xl bg-[#060B1E] border border-[#D4AF37]/30 text-xs text-slate-200 italic">
                        "{activeSpotlightItem.craftsman_note}"
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center gap-4">
                      <button
                        onClick={() => openLightbox(activeSpotlightItem)}
                        className="px-6 py-3 bg-[#D4AF37] hover:bg-[#F5E7A3] text-[#060B1E] font-extrabold text-xs rounded-xl transition-all duration-200 shadow-lg flex items-center gap-2 cursor-pointer"
                      >
                        <span>Inspect Portfolio Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Indicator Dots Bar */}
              {spotlightItems.length > 1 && (
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2">
                  {spotlightItems.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSpotlightIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        spotlightIndex === idx
                          ? 'w-8 bg-[#D4AF37]'
                          : 'w-2 bg-slate-700 hover:bg-slate-500'
                      }`}
                      title={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ================= SECTION 3 — GALLERY MASONRY VIEW ================= */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto space-y-6">
        <div className="text-left space-y-1">
          <span className="text-xs font-extrabold text-[#D4AF37] uppercase tracking-widest">
            CURATED GALLERY REPOSITORY
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-white">
            Explore Portfolio Pieces
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <SkeletonShimmer key={n} className="h-80 rounded-3xl bg-slate-900/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center bg-[#09112B]/60 border border-[#D4AF37]/30 rounded-3xl space-y-4 max-w-xl mx-auto">
            <Diamond className="w-10 h-10 text-[#D4AF37]/50 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Portfolio Items Match Selection</h3>
            <p className="text-slate-400 text-xs">
              Try resetting your filters to explore our full repository of fine jewellery CAD designs.
            </p>
            <button
              onClick={resetFilters}
              className="px-5 py-2 bg-[#D4AF37] text-[#060B1E] font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20"
            >
              <RotateCcw className="w-4 h-4" /> Reset All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Uniform Grid Layout — All cards equal height & size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {visibleGridItems.map((item, idx) => (
                  <motion.div
                    key={item.id || idx}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, delay: (idx % 4) * 0.06 }}
                    onClick={() => openLightbox(item)}
                    className="flex flex-col h-full bg-[#09112B]/80 border border-[#D4AF37]/25 rounded-3xl overflow-hidden hover:border-[#D4AF37] hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(212,175,55,0.15)] transition-all duration-500 cursor-pointer group relative text-left"
                  >
                    {/* Fixed Height Uniform Image Container */}
                    <div className="relative h-64 sm:h-72 w-full bg-[#060B1E] overflow-hidden flex items-center justify-center shrink-0 border-b border-[#D4AF37]/15">
                      <img
                        src={item.primary_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />

                      {/* ALWAYS VISIBLE AI Sparkle Badge */}
                      {item.is_ai_project && (
                        <div className="absolute top-3 left-3 bg-purple-950/95 border border-purple-500/50 text-purple-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-md shadow-md z-10">
                          <Sparkles className="w-3.5 h-3.5 text-purple-300" /> AI Project
                        </div>
                      )}
                      {item.is_custom_project && !item.is_ai_project && (
                        <div className="absolute top-3 left-3 bg-[#060B1E]/95 border border-[#D4AF37]/50 text-[#F5E7A3] px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-md shadow-md z-10">
                          <Gem className="w-3.5 h-3.5 text-[#D4AF37]" /> Custom Project
                        </div>
                      )}

                      {/* Hover Overlay Details */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#060B1E] via-[#060B1E]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-5 flex flex-col justify-end text-left space-y-2">
                        <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">
                          {item.category_name || 'Jewelry CAD'} • {item.is_ai_project ? 'AI Project' : 'Custom Project'}
                        </span>
                        <h4 className="font-serif font-extrabold text-white text-base leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-300 line-clamp-2 font-light">
                          {item.description}
                        </p>
                        <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-[#F5E7A3]">
                          <Eye className="w-4 h-4 text-[#D4AF37]" /> View Full Details
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Info */}
                    <div className="p-4 space-y-1 bg-[#09112B] flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-white text-sm truncate group-hover:text-[#F5E7A3] transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[10px] font-mono text-slate-400">
                          {item.category_name || 'Jewelry CAD'} • {item.completed_date || 'Recent'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Load More Pagination Button */}
            {hasMore && (
              <div className="pt-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-8 py-3 bg-[#09112B] hover:bg-[#121F4D] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-xl inline-flex items-center gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <SkeletonShimmer className="w-4 h-4 rounded-full" />
                      <span>Loading Portfolio Pieces...</span>
                    </>
                  ) : (
                    <>
                      <span>Load More Pieces ({items.length - displayCount} Remaining)</span>
                      <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================= SECTION 5 — CLOSING CTA ================= */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-[#09112B] via-[#0D1B4C] to-[#09112B] border-2 border-[#D4AF37]/40 p-8 sm:p-12 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <BrandLogo variant="mark-only" size="md" className="mx-auto" />
          <h3 className="text-2xl sm:text-4xl font-serif font-extrabold text-white leading-tight">
            Ready to Create Your Own Story?
          </h3>
          <p className="text-xs sm:text-base text-slate-200 max-w-2xl mx-auto font-light leading-relaxed">
            Partner with Shiuli CAD Studio for bespoke custom jewelry engineering or explore our ready-to-cast 3D CAD catalog.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => onNavigate('custom-design')}
              className="px-7 py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#F5E7A3] to-[#D4AF37] text-[#060B1E] font-extrabold text-xs sm:text-sm rounded-xl shadow-xl shadow-[#D4AF37]/30 hover:scale-105 transition-all flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span>Start a Custom Design</span>
            </button>
            <button
              onClick={() => onNavigate('collections')}
              className="px-7 py-3.5 bg-[#09112B] border border-[#D4AF37]/50 text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-[#121F4D] transition-all"
            >
              Browse Ready-Made Files
            </button>
          </div>
        </div>
      </section>

      {/* ================= FULL-SCREEN LIGHTBOX MODAL ================= */}
      <AnimatePresence>
        {activeItem && (
          <div
            onClick={closeLightbox}
            className="fixed inset-0 z-50 bg-[#060B1E]/95 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-[#09112B] border-2 border-[#D4AF37]/40 rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-2xl text-left"
            >
              {/* Close Button */}
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-[#060B1E]/80 text-slate-300 hover:text-white hover:bg-[#D4AF37] hover:text-[#060B1E] flex items-center justify-center transition-all shadow-xl"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image Viewer Left Column */}
              <div className="flex-1 bg-[#060B1E] relative flex items-center justify-center min-h-[340px] md:min-h-[520px]">
                {getLightboxImages().length > 0 && (
                  <img
                    src={getLightboxImages()[activeImageIndex]}
                    alt={activeItem.title}
                    className="max-h-[75vh] w-full object-contain p-4"
                  />
                )}

                {/* Left/Right Arrow Navigation */}
                {getLightboxImages().length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev === 0 ? getLightboxImages().length - 1 : prev - 1
                        )
                      }
                      className="absolute left-4 w-10 h-10 rounded-full bg-[#09112B]/90 text-white flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#060B1E] transition-all shadow-md"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev === getLightboxImages().length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-4 w-10 h-10 rounded-full bg-[#09112B]/90 text-white flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#060B1E] transition-all shadow-md"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Details & Conversion Right Column */}
              <div className="w-full md:w-96 p-6 space-y-6 overflow-y-auto border-t md:border-t-0 md:border-l border-[#D4AF37]/20 bg-[#09112B]">
                <div className="space-y-2 border-b border-[#D4AF37]/20 pb-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F5E7A3] text-[10px] font-bold uppercase">
                      {activeItem.category_name || 'Jewelry CAD'}
                    </span>
                    {activeItem.is_ai_project && (
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Project
                      </span>
                    )}
                    {activeItem.is_custom_project && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#121F4D] text-slate-200 text-[10px] font-bold flex items-center gap-1">
                        <Gem className="w-3 h-3 text-[#D4AF37]" /> Custom Project
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-serif font-extrabold text-white">{activeItem.title}</h3>
                  {activeItem.completed_date && (
                    <p className="text-xs text-slate-400 font-mono">Completed: {activeItem.completed_date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#D4AF37] uppercase tracking-wider">
                    Project Story & Specifications
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-light">
                    {activeItem.description}
                  </p>
                </div>

                {/* Lead Conversion Callout */}
                <div className="pt-4 border-t border-[#D4AF37]/20 space-y-3">
                  <p className="text-xs text-slate-300 italic">
                    This began as a Custom Design commission — Start Your Own →
                  </p>

                  <button
                    onClick={() => {
                      closeLightbox();
                      onNavigate('custom-design');
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#F5E7A3] hover:to-[#D4AF37] text-[#060B1E] font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20"
                  >
                    <span>Start Your Own →</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PortfolioPage;
