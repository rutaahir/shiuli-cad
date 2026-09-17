import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll } from 'framer-motion';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Diamond, 
  Layers, 
  ShieldCheck, 
  FileCheck, 
  Cpu, 
  Zap, 
  Eye, 
  Award,
  Clock,
  HelpCircle,
  Gem,
  X,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Info,
  Wrench,
  Check,
  ArrowLeft,
  Tag,
  Box,
  MessageCircle,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import { ServicePageData, PageId } from '../types';
import { SkeletonShimmer } from '../components/motion/SkeletonShimmer';
import { BrandLogo } from '../components/BrandLogo';

interface ServiceLandingPageProps {
  slug?: string;
  onNavigate: (page: PageId, slug?: string) => void;
}

const MASTER_SERVICES_FALLBACK: Partial<ServicePageData>[] = [
  {
    id: 1,
    slug: 'ring-cad-design',
    title: 'Ring CAD Design',
    subtitle: 'Solitaires, Halos, Eternity Bands & Cocktail Ring 3D Models',
    intro_text: 'Precision ring CAD engineering calibrated for exact finger sizes, stone seats, and foundry shrinkage factors (+1.25%). Features 42° collet notches and zero non-manifold edges.',
    hero_image: '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
    starting_price_usd: '$25 - $45',
    starting_price_inr: '₹2,000 - ₹3,500',
    cta_label: 'Start Ring CAD Project',
    cta_target: 'custom_design',
    section: 'cad_service',
    display_order: 1,
    features: [
      { id: 101, icon: 'Sparkles', title: '±0.02mm Micron Tolerances', description: 'Calibrated prong heights and shank wall thickness.', display_order: 1 },
      { id: 102, icon: 'ShieldCheck', title: 'Watertight Solid Mesh', description: 'Tested across Formlabs & EnvisionTEC wax printers.', display_order: 2 },
      { id: 103, icon: 'Clock', title: '48-Hour Delivery', description: 'Rapid turnaround with layered .3DM and .STL files.', display_order: 3 },
    ]
  },
  {
    id: 2,
    slug: 'earring-cad-design',
    title: 'Earring CAD Design',
    subtitle: 'Studs, Jhumkas, Drop Earrings & Ear Cuffs 3D Models',
    intro_text: '3D earring CAD modelling engineered with pre-notched post mechanisms, French wire loops, and balanced earlobe weight distribution for maximum wearer comfort.',
    hero_image: '/unsplash-img/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
    starting_price_usd: '$25 - $45',
    starting_price_inr: '₹2,000 - ₹3,500',
    cta_label: 'Start Earring CAD Project',
    cta_target: 'custom_design',
    section: 'cad_service',
    display_order: 2,
    features: [
      { id: 201, icon: 'Gem', title: 'Pre-Notched Posts & Friction Clips', description: '0.9mm post clearance for secure clasping.', display_order: 1 },
      { id: 202, icon: 'Layers', title: 'Weight Hollowing', description: 'Hollow galleries engineered to reduce gold weight by 20%.', display_order: 2 },
      { id: 203, icon: 'Eye', title: 'Symmetrical Pair Mirroring', description: 'Flawless left/right component alignment.', display_order: 3 },
    ]
  },
  {
    id: 3,
    slug: 'pendant-cad-design',
    title: 'Pendant CAD Design',
    subtitle: 'Solitaire Drops, Medallions & Filigree Pendant 3D Models',
    intro_text: 'High-detail pendant CAD models with integrated bail clearance, backplates, and casting sprues designed for effortless diamond setting and casting fluidity.',
    hero_image: '/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
    starting_price_usd: '$25 - $45',
    starting_price_inr: '₹2,000 - ₹3,500',
    cta_label: 'Start Pendant CAD Project',
    cta_target: 'custom_design',
    section: 'cad_service',
    display_order: 3,
    features: [
      { id: 301, icon: 'Sparkles', title: 'Bail Chain Clearance', description: 'Generous inner loop dimensions for 1.5mm-4mm chains.', display_order: 1 },
      { id: 302, icon: 'ShieldCheck', title: 'Filigree Wire Reinforcement', description: '0.8mm structural struts to prevent bending.', display_order: 2 },
      { id: 303, icon: 'Zap', title: 'Micro-Pavé Borders', description: 'Pre-beaded prong seats for 1.0mm-1.3mm melee stones.', display_order: 3 },
    ]
  }
];

export const ServiceLandingPage: React.FC<ServiceLandingPageProps> = ({ slug, onNavigate }) => {
  const [services, setServices] = useState<any[]>(MASTER_SERVICES_FALLBACK);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);
  const [modalService, setModalService] = useState<any | null>(null);

  // Scroll Progress for Process Strip
  const processStripRef = useRef<HTMLDivElement>(null);
  const servicesGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getServicePages('cad_service'),
      api.getCategories(true),
    ])
      .then(([pagesData, catsData]) => {
        if (!isMounted) return;
        if (Array.isArray(catsData)) {
          setCategories(catsData);
        }

        if (Array.isArray(pagesData) && pagesData.length > 0) {
          const sorted = [...pagesData].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
          setServices(sorted);
        } else {
          setServices(MASTER_SERVICES_FALLBACK);
        }
      })
      .catch((err) => {
        console.warn('Using fallback CAD service pages:', err);
        setServices(MASTER_SERVICES_FALLBACK);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // If a slug was passed, set activeTab or auto-scroll to services section
  useEffect(() => {
    if (slug && slug !== 'master-jewellery-cad' && slug !== 'all') {
      const matched = services.find((s) => s.slug === slug);
      if (matched) {
        if (matched.linked_category_slug) {
          setActiveTab(matched.linked_category_slug);
        } else {
          setActiveTab(slug);
        }
      }
    }
  }, [slug, services]);

  // Pricing helper
  const getDisplayPrice = (service: any) => {
    const usd = service?.starting_price_usd || '$25 - $45';
    const inr = service?.starting_price_inr || '₹2,000 - ₹3,500';
    return { usd, inr };
  };

  // Build Dynamic Category Tabs
  const dynamicCategoryTabs = [
    { id: 'all', label: `All Services (${services.length})` },
    ...categories.map((cat) => ({
      id: cat.slug,
      label: cat.name,
    })),
  ];

  // Filter services by active tab
  const filteredServices = services.filter((s) => {
    if (activeTab === 'all') return true;
    if (s.linked_category_slug) {
      if (s.linked_category_slug === activeTab) return true;
    }
    const cleanTab = activeTab.toLowerCase().replace('-cad-design', '').replace('-cad', '');
    const cleanSlug = s.slug?.toLowerCase() || '';
    const cleanTitle = s.title?.toLowerCase() || '';
    return cleanSlug.includes(cleanTab) || cleanTitle.includes(cleanTab);
  });

  // Spotlight Auto-Play Carousel
  useEffect(() => {
    if (services.length <= 1) return;
    const timer = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % services.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [services.length]);

  const currentSpotlight = services[spotlightIndex] || services[0];
  const spotlightPrices = currentSpotlight ? getDisplayPrice(currentSpotlight) : { usd: '$25 - $45', inr: '₹2,000 - ₹3,500' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-[#060B1E] text-slate-100 font-sans"
    >
      {/* Breadcrumb Bar */}
      <section className="pt-20 sm:pt-24 pb-4 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium overflow-x-auto no-scrollbar">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="text-[#F5E7A3] font-semibold">CAD Services Studio</span>
        </div>
      </section>

      {/* SECTION 1 — HERO & 3D ANIMATED SPOTLIGHT SHOWCASE */}
      <section className="relative pb-10 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto space-y-8">
        {/* Main Banner Header */}
        <div className="text-center space-y-4 relative z-10 py-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-xs font-semibold uppercase tracking-widest shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
            {services.length} DISCIPLINES • NATIVE RHINO 8 + MATRIXGOLD
          </motion.div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-extrabold text-white tracking-tight leading-tight">
            CAD Services Hub
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed font-light">
            Explore all {services.length} master jewellery CAD specializations. Engineered to ±0.02mm precision with 100% castable watertight .3DM and .STL files ready for production.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-4 text-xs font-mono pt-2">
            <div className="px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-[#F5E7A3] font-bold flex items-center gap-2 shadow-md">
              <Box className="w-4 h-4 text-[#D4AF37]" />
              <span>{services.length} Master Services Available</span>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-emerald-400 font-bold flex items-center gap-2 shadow-md">
              <CheckCircle2 className="w-4 h-4" />
              <span>±0.02mm Toleranced • 48-72h Delivery</span>
            </div>
          </div>
        </div>

        {/* Animated Spotlight Banner (Interactive Carousel) */}
        {currentSpotlight && (
          <div className="bg-gradient-to-r from-[#09112B] via-[#0D183B] to-[#09112B] border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-[#D4AF37] text-slate-950 font-extrabold text-xs tracking-wider uppercase">
                    SPOTLIGHT SPECIALIZATION
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Service {spotlightIndex + 1} of {services.length}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSpotlight.slug || currentSpotlight.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <h2 className="text-2xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
                      {currentSpotlight.title}
                    </h2>
                    <p className="text-sm sm:text-lg text-[#F5E7A3] font-medium">
                      {currentSpotlight.subtitle}
                    </p>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-light line-clamp-3">
                      {currentSpotlight.intro_text}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono">
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="text-slate-400">Starting Price:</span>
                    <span className="text-[#F5E7A3] font-bold">{spotlightPrices.usd} / {spotlightPrices.inr}</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => onNavigate('custom-design', currentSpotlight.linked_category_slug || currentSpotlight.slug)}
                      className="px-6 py-3 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all duration-300 shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <span>Start {currentSpotlight.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setModalService(currentSpotlight)}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Info className="w-4 h-4 text-[#D4AF37]" />
                      <span>View Specs & Details</span>
                    </button>
                  </div>

                  {/* Carousel Controls */}
                  {services.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSpotlightIndex((prev) => (prev === 0 ? services.length - 1 : prev - 1))}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#D4AF37] text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Previous Spotlight"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSpotlightIndex((prev) => (prev + 1) % services.length)}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#D4AF37] text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Next Spotlight"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Spotlight Image Card */}
              <div className="lg:col-span-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSpotlight.slug || currentSpotlight.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-slate-950 shadow-2xl group/img"
                  >
                    <img
                      src={currentSpotlight.hero_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80'}
                      alt={currentSpotlight.title}
                      className="w-full h-72 sm:h-80 object-cover group-hover/img:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] font-mono">
                      <span className="text-[#F5E7A3] font-bold">Rhino 8 + MatrixGold</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 100% Watertight Mesh
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2 — CATEGORY FILTER BAR & ALL DYNAMIC SERVICES SHOWCASE */}
      <section ref={servicesGridRef} className="py-10 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto space-y-8">
        {/* Category Selector Tabs */}
        <div className="space-y-4 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                EXPLORE ALL SERVICES
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-white">
                Complete CAD Engineering Catalog ({services.length} Services)
              </h2>
            </div>

            {/* Filter Count Badge */}
            <span className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-[#F5E7A3]">
              Showing {filteredServices.length} of {services.length} Services
            </span>
          </div>

          {/* DYNAMIC Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar border-b border-slate-800/80">
            {dynamicCategoryTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-[#D4AF37] text-slate-950 shadow-lg shadow-[#D4AF37]/20 scale-105'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DYNAMIC SERVICES GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <SkeletonShimmer key={n} className="h-96 rounded-3xl bg-slate-900/60" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-16 text-center bg-slate-900/50 rounded-3xl border border-slate-800 text-slate-400">
            <Info className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
            No service pages found matching category tab "{activeTab}".
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <AnimatePresence>
              {filteredServices.map((service, index) => {
                const prices = getDisplayPrice(service);
                const categorySlug = service.linked_category_slug || service.slug;

                return (
                  <motion.div
                    key={service.slug || service.id || index}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 hover:border-[#D4AF37]/60 hover:-translate-y-1.5 transition-all duration-300 shadow-2xl flex flex-col justify-between group text-left relative overflow-hidden"
                  >
                    {/* Top Glow Accent */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-2xl group-hover:bg-[#D4AF37]/15 transition-all" />

                    <div className="space-y-4 relative z-10">
                      {/* Image Thumbnail with Badges */}
                      <div className="aspect-[16/10] relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 group/img">
                        <img
                          src={service.hero_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80'}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

                        {/* Top Left Number Badge */}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono font-bold text-[#D4AF37]">
                          #{service.display_order || index + 1}
                        </div>

                        {/* Bottom Price Tag */}
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80 text-[11px] font-mono">
                          <span className="text-slate-400">Starting:</span>
                          <span className="text-[#F5E7A3] font-bold">{prices.usd} / {prices.inr}</span>
                        </div>
                      </div>

                      {/* Header Info */}
                      <div className="space-y-1 pt-1">
                        <h3 className="text-xl font-serif font-extrabold text-white group-hover:text-[#F5E7A3] transition-colors">
                          {service.title}
                        </h3>
                        <p className="text-xs text-[#D4AF37] font-medium line-clamp-1">
                          {service.subtitle}
                        </p>
                      </div>

                      {/* Intro Text */}
                      <p className="text-xs text-slate-300 leading-relaxed font-light line-clamp-3">
                        {service.intro_text}
                      </p>

                      {/* Dynamic Feature Chips from Database */}
                      {service.features && service.features.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                          {service.features.slice(0, 3).map((feat: any, fIdx: number) => (
                            <div key={feat.id || fIdx} className="flex items-center gap-2 text-[11px] text-slate-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                              <span className="truncate">{feat.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-6 flex flex-col sm:flex-row items-center gap-2.5 relative z-10 border-t border-slate-800/80 mt-4">
                      <button
                        onClick={() => onNavigate('custom-design', categorySlug)}
                        className="w-full sm:flex-1 py-2.5 px-4 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-extrabold text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <span>Start Design</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setModalService(service)}
                        className="w-full sm:w-auto py-2.5 px-3 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="View full technical specs"
                      >
                        <Info className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Specs</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* SECTION 3 — TECHNICAL SPECIFICATIONS & FOUNDRY GUARANTEES */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto space-y-8 border-y border-slate-800/80 bg-slate-900/30">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            FOUNDRY & PRINTING STANDARDS
          </span>
          <h3 className="text-2xl sm:text-4xl font-serif font-extrabold text-white">
            Why Jewellers & Factories Trust Shiuli CAD Studio
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Zero Non-Manifold Geometry</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Every 3D mesh is audited in Magics & MatrixGold for 100% closed, watertight solids ready for high-resolution wax printing.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Shrinkage & Seat Clearance</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Prong angles, collet notches, and wall thicknesses are pre-calibrated for +1.25% casting shrinkage to guarantee exact stone seating.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">48-Hour Rapid Delivery</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Receive your organized native .3DM Rhino file alongside high-density .STL meshes and 4K photorealistic renders.
            </p>
          </div>
        </div>
      </section>

      {/* QUICK SPECS & DETAILS MODAL */}
      <AnimatePresence>
        {modalService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative overflow-hidden text-left max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setModalService(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                {modalService.hero_image ? (
                  <img src={modalService.hero_image} alt={modalService.title} className="w-16 h-16 object-cover rounded-2xl border border-[#D4AF37]/40" />
                ) : (
                  <div className="p-3 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">
                    <Diamond className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-serif font-extrabold text-white">
                    {modalService.title}
                  </h3>
                  <p className="text-xs text-[#F5E7A3] font-medium">
                    {modalService.subtitle}
                  </p>
                  <p className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
                    Pricing: {modalService.starting_price_usd || '$25 - $45'} / {modalService.starting_price_inr || '₹2,000 - ₹3,500'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  Description & Engineering Specs
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                  {modalService.intro_text}
                </p>
              </div>

              {/* Technical Specifications list */}
              {modalService.features && modalService.features.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                    Technical Tolerances & Deliverables
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {modalService.features.map((feat: any, fIdx: number) => (
                      <div
                        key={feat.id || fIdx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                          <span>{feat.title}</span>
                        </div>
                        {feat.description && (
                          <p className="text-[11px] text-slate-400 leading-snug">
                            {feat.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery Images in Modal if present */}
              {modalService.gallery && modalService.gallery.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                    Showcase Gallery Images
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {modalService.gallery.map((gImg: any, gIdx: number) => (
                      <div key={gImg.id || gIdx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                        <img src={gImg.image} alt={gImg.caption || 'Gallery'} className="w-full h-24 object-cover" />
                        {gImg.caption && (
                          <p className="p-1.5 text-[10px] text-slate-300 text-center font-mono truncate">{gImg.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap gap-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    const cat = modalService.linked_category_slug || modalService.slug;
                    setModalService(null);
                    onNavigate('custom-design', cat);
                  }}
                  className="flex-1 py-3 px-5 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-colors shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Start {modalService.title} Project</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setModalService(null)}
                  className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ServiceLandingPage;
