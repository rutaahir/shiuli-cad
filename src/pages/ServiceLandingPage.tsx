import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Info,
  Wrench,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { ServicePageData, PageId } from '../types';
import { SkeletonShimmer } from '../components/motion/SkeletonShimmer';

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
    cta_label: 'Start Ring CAD Project',
    cta_target: 'custom_design',
    section: 'cad_service',
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
    cta_label: 'Start Earring CAD Project',
    cta_target: 'custom_design',
    section: 'cad_service',
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
    cta_label: 'Start Pendant CAD Project',
    cta_target: 'custom_design',
    section: 'cad_service',
    features: [
      { id: 301, icon: 'Sparkles', title: 'Bail Chain Clearance', description: 'Generous inner loop dimensions for 1.5mm-4mm chains.', display_order: 1 },
      { id: 302, icon: 'ShieldCheck', title: 'Filigree Wire Reinforcement', description: '0.8mm structural struts to prevent bending.', display_order: 2 },
      { id: 303, icon: 'Zap', title: 'Micro-Pavé Borders', description: 'Pre-beaded prong seats for 1.0mm-1.3mm melee stones.', display_order: 3 },
    ]
  },
  {
    id: 4,
    slug: 'necklace-cad-design',
    title: 'Necklace CAD Design',
    subtitle: 'Bridal Chokers, Rivieras & Diamond Collar 3D Models',
    intro_text: 'Articulated necklace link assemblies with 0.15mm mechanical tolerances for fluid drape and ergonomic neck contouring.',
    hero_image: '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    cta_label: 'Start Necklace CAD Project',
    cta_target: 'custom_design',
    section: 'cad_service',
    features: [
      { id: 401, icon: 'Layers', title: 'Fluid Mechanical Joints', description: 'Dual-hinge links preventing neck flips during wear.', display_order: 1 },
      { id: 402, icon: 'Award', title: 'Graduated Stone Alignment', description: 'Smooth proportional stone sizing from center to clasp.', display_order: 2 },
      { id: 403, icon: 'ShieldCheck', title: 'Integrated Safety Clasp', description: 'Double-latch tongue and box lock CAD engineering.', display_order: 3 },
    ]
  },
  {
    id: 5,
    slug: 'bracelet-cad-design',
    title: 'Bracelet CAD Design',
    subtitle: 'Tennis Bracelets, Hinged Cuffs & Charm Link 3D Models',
    intro_text: 'Continuous stone channel alignment and secure double-latch box clasp engineering designed for smooth daily wrist movement.',
    hero_image: '/unsplash-img/photo-1611591475140-be38b638ed3d?auto=format&fit=crop&w=800&q=80',
    cta_label: 'Start Bracelet CAD Project',
    cta_target: 'custom_design',
    section: 'cad_service',
    features: [
      { id: 501, icon: 'Sparkles', title: 'Tennis Link Precision', description: '4-prong & bezel tennis links with hidden pin hinges.', display_order: 1 },
      { id: 502, icon: 'ShieldCheck', title: 'Cuff Hinge Stability', description: 'Internal steel spring channel integration.', display_order: 2 },
      { id: 503, icon: 'Clock', title: 'Custom Wrist Sizing', description: 'Pre-configured for 6.0" to 8.5" circumference.', display_order: 3 },
    ]
  },
  {
    id: 6,
    slug: 'bangle-cad-design',
    title: 'Bangle CAD Design',
    subtitle: 'Traditional Kadas, Stackable Bangles & Polki 3D Models',
    intro_text: 'Rigid and hinged bangle CAD files pre-scaled for Indian and international wrist sizing standards with intricate undercut detail.',
    hero_image: '/unsplash-img/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
    cta_label: 'Start Bangle CAD Project',
    cta_target: 'custom_design',
    section: 'cad_service',
    features: [
      { id: 601, icon: 'Gem', title: 'Traditional Kada Profiles', description: 'Deep relief floral motifs and screw-lock closures.', display_order: 1 },
      { id: 602, icon: 'Layers', title: 'Polki & Kundan Seats', description: 'Open-back and foiled foil seat preparations.', display_order: 2 },
      { id: 603, icon: 'ShieldCheck', title: 'Hollow Bangle Shells', description: '1.0mm wall thickness for lightweight gold casting.', display_order: 3 },
    ]
  },
  {
    id: 7,
    slug: 'bridal-jewellery-cad',
    title: 'Bridal Jewellery CAD',
    subtitle: 'Haute Joaillerie Engagement & Wedding Suite 3D Models',
    intro_text: 'Complete bridal jewelry suites matching ring, pendant, earring, and bangle design motifs seamlessly for luxury wedding collections.',
    hero_image: '/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
    cta_label: 'Start Bridal CAD Suite',
    cta_target: 'custom_design',
    section: 'cad_service',
    features: [
      { id: 701, icon: 'Award', title: 'Haute Joaillerie Motifs', description: 'Unified design language across 4 matching pieces.', display_order: 1 },
      { id: 702, icon: 'Sparkles', title: 'High Carat Stone Layouts', description: 'Engineered for 2.0ct+ center stones and halo frames.', display_order: 2 },
      { id: 703, icon: 'ShieldCheck', title: 'Foundry Certified', description: 'Pre-checked for platinum and 18K gold casting trees.', display_order: 3 },
    ]
  },
  {
    id: 8,
    slug: 'mens-jewellery-cad',
    title: "Men's Jewellery CAD",
    subtitle: 'Signet Rings, Cufflinks & Cuban Chain Link 3D Models',
    intro_text: 'Heavy solid-metal design architecture with crisp geometric facets, deep relief engraving, and bold masculine stone mounts.',
    hero_image: '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
    cta_label: "Start Men's CAD Project",
    cta_target: 'custom_design',
    section: 'cad_service',
    features: [
      { id: 801, icon: 'Layers', title: 'Heavy Metal Architecture', description: 'Solid under-galleries for substantial weight feel.', display_order: 1 },
      { id: 802, icon: 'Wrench', title: 'Cufflink Swivel Mechanisms', description: 'T-bar hinge cavities engineered with exact tolerances.', display_order: 2 },
      { id: 803, icon: 'ShieldCheck', title: 'Crisp Faceted Geometry', description: 'Sharp chamfers optimized for mirror polish finish.', display_order: 3 },
    ]
  },
  {
    id: 9,
    slug: 'jewellery-sets-cad',
    title: 'Jewellery Sets',
    subtitle: 'Matching Necklace, Earring, Ring & Bracelet 3D Suites',
    intro_text: 'Harmonious jewelry sets designed with unified motif proportions, setting aesthetics, and stone sizes for commercial production.',
    hero_image: '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    cta_label: 'Start Set CAD Request',
    cta_target: 'custom_design',
    section: 'cad_service',
    features: [
      { id: 901, icon: 'Sparkles', title: 'Proportional Scaling', description: 'Matching design motifs scaled per jewelry piece type.', display_order: 1 },
      { id: 902, icon: 'ShieldCheck', title: 'Batch Render Archive', description: 'Includes 4K renders of full set and individual pieces.', display_order: 2 },
      { id: 903, icon: 'Clock', title: 'Complete File Bundle', description: 'All .3DM, .STL, .OBJ, and .STEP files packaged.', display_order: 3 },
    ]
  },
  {
    id: 10,
    slug: 'other-jewellery-cad',
    title: 'Other Jewellery',
    subtitle: 'Brooches, Tiara Crowns, Keychains & Specialty Accessories',
    intro_text: 'Custom 3D CAD modeling for unique accessories, lapel pins, tiara crowns, and bespoke jewelry artifacts requiring high-detail sculpting.',
    hero_image: '/unsplash-img/photo-1611591475140-be38b638ed3d?auto=format&fit=crop&w=800&q=80',
    cta_label: 'Start Specialty CAD Request',
    cta_target: 'custom_design',
    section: 'cad_service',
    features: [
      { id: 1001, icon: 'Gem', title: 'Sculptural ZBrush Detailing', description: '3D organic reliefs, animal motifs, and insignia.', display_order: 1 },
      { id: 1002, icon: 'ShieldCheck', title: 'Multi-Part Assembly', description: 'Complex pin mechanisms and latch attachments.', display_order: 2 },
      { id: 1003, icon: 'Clock', title: 'Custom Prototype Prep', description: 'Ready for direct resin 3D printing & lost-wax casting.', display_order: 3 },
    ]
  }
];

export const ServiceLandingPage: React.FC<ServiceLandingPageProps> = ({ slug, onNavigate }) => {
  const [services, setServices] = useState<any[]>(MASTER_SERVICES_FALLBACK);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [activeModalService, setActiveModalService] = useState<any | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // References for smooth scrolling
  const serviceRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getServicePages('cad_service')
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setServices(data);
        }
      })
      .catch((err) => {
        console.warn('Using fallback CAD service pages:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Also fetch sample catalog products
    api.getProducts()
      .then((res) => {
        if (isMounted) {
          const prods = Array.isArray(res) ? res : (res.results || []);
          setCategoryProducts(prods.slice(0, 8));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Smooth scroll to targeted service if slug is provided
  useEffect(() => {
    if (slug && serviceRefs.current[slug]) {
      setTimeout(() => {
        serviceRefs.current[slug]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [slug, services]);

  const filteredServices = services.filter((srv) => {
    if (selectedCategoryFilter === 'all') return true;
    return srv.slug.includes(selectedCategoryFilter);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-[#060B1E] text-slate-100 font-sans selection:bg-[#D4AF37] selection:text-[#060B1E]"
    >
      {/* Master Hero Banner - Tight spacing & space management */}
      <section className="relative pt-20 sm:pt-24 pb-8 sm:pb-10 px-4 sm:px-6 lg:px-8 xl:px-12 border-b border-slate-800/80 overflow-hidden bg-gradient-to-b from-[#09112B] via-[#060B1E] to-[#060B1E]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_60%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto text-center space-y-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-xs font-semibold uppercase tracking-widest shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
            Full CAD Engineering Services Suite
          </motion.div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Master 3D Jewelry CAD Services
          </h1>

          <p className="text-slate-300 text-sm sm:text-lg max-w-3xl mx-auto leading-relaxed">
            10 Specialized CAD Engineering Lines • 0.02mm Micron Accuracy • 100% Watertight Mesh & Pre-Scaled Foundry Shrinkage (+1.25%)
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onNavigate('custom-design')}
              className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#F5E7A3] hover:to-[#D4AF37] text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#D4AF37]/20 transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              Start Custom CAD Request <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="px-5 py-2.5 bg-slate-900/90 border border-slate-700/80 hover:border-[#D4AF37]/50 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl hover:text-white transition-all duration-200"
            >
              Speak with Senior CAD Engineer
            </button>
          </div>
        </div>
      </section>

      {/* Filter Category Pills Bar - Sticky & space optimized */}
      <section className="sticky top-16 sm:top-20 z-30 bg-[#060B1E]/95 backdrop-blur-md border-b border-slate-800/80 py-3 px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <Sliders className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filter Services:</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {[
              { id: 'all', label: 'All 10 Services' },
              { id: 'ring', label: 'Rings' },
              { id: 'earring', label: 'Earrings' },
              { id: 'pendant', label: 'Pendants' },
              { id: 'necklace', label: 'Necklaces' },
              { id: 'bracelet', label: 'Bracelets' },
              { id: 'bangle', label: 'Bangles' },
              { id: 'bridal', label: 'Bridal' },
              { id: 'mens', label: "Men's" },
              { id: 'sets', label: 'Sets' },
            ].map((tab) => {
              const isActive = selectedCategoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategoryFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20 font-bold'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Single-Page All Services Showcase - Uniform Container Alignment */}
      <section className="py-10 sm:py-12 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-7xl mx-auto space-y-10 sm:space-y-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((n) => (
              <SkeletonShimmer key={n} className="h-96 rounded-3xl bg-slate-900/60" />
            ))}
          </div>
        ) : (
          <div className="space-y-10 sm:space-y-12">
            {filteredServices.map((service, index) => (
              <motion.div
                key={service.slug || index}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                ref={(el) => (serviceRefs.current[service.slug] = el)}
                className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 hover:border-[#D4AF37]/50 transition-all duration-300 shadow-2xl space-y-6 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#D4AF37]/10 transition-colors" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  {/* Left Specs & Copy */}
                  <div className="lg:col-span-7 space-y-4 text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-[11px] font-bold uppercase tracking-wider">
                      <Diamond className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Specialization #{index + 1}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {service.title}
                    </h2>

                    <p className="text-sm sm:text-base text-[#F5E7A3]/90 font-medium">
                      {service.subtitle}
                    </p>

                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      {service.intro_text}
                    </p>

                    {/* Features List */}
                    {service.features && service.features.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {service.features.map((feat: any) => (
                          <div key={feat.id || feat.title} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-[#D4AF37] font-bold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{feat.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-2">{feat.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap gap-3">
                      <button
                        onClick={() => onNavigate('custom-design')}
                        className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-md"
                      >
                        Start Custom CAD Request <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setActiveModalService(service)}
                        className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition-colors"
                      >
                        <Eye className="w-4 h-4 text-[#D4AF37]" /> View 3D Specs & Blueprints
                      </button>
                    </div>
                  </div>

                  {/* Right 4D Render Card */}
                  <div className="lg:col-span-5">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl group/img">
                      <img
                        src={service.hero_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80'}
                        alt={service.title}
                        className="w-full h-64 sm:h-72 object-cover group-hover/img:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-70" />
                      
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-slate-950/80 backdrop-blur-md p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-mono text-[#F5E7A3] font-bold">Rhino 8 + MatrixGold</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          100% Watertight Mesh
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Live Ready-to-Cast Product Samples Grid */}
      {categoryProducts.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 xl:px-12 bg-slate-900/30 border-y border-slate-800/80">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Live Ready-to-Cast 3D CAD Catalog</h2>
                <p className="text-slate-400 text-sm mt-1">Downloadable master 3D jewelry files built by our senior bench engineers</p>
              </div>
              <button
                onClick={() => onNavigate('collections')}
                className="inline-flex items-center gap-2 text-sm text-[#D4AF37] font-semibold hover:text-[#F5E7A3] transition-colors"
              >
                Browse Full Catalog <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categoryProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => onNavigate('product-detail', prod.slug)}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-[#D4AF37]/50 transition-all duration-300 cursor-pointer group shadow-lg"
                >
                  <div className="h-52 bg-slate-950 relative overflow-hidden">
                    <img
                      src={prod.primary_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80'}
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 right-3 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-700 text-[10px] font-mono text-[#D4AF37]">
                      .3DM + .STL
                    </span>
                  </div>
                  <div className="p-4 space-y-1">
                    <h4 className="font-bold text-white text-sm truncate group-hover:text-[#F5E7A3] transition-colors">
                      {prod.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {prod.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Master Studio Quality Guarantee Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Our 4-Point Foundry Quality Guarantee</h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Engineered by bench goldsmiths to ensure every model sets smoothly without prong snapping or porosity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">0.02mm Tolerances</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Exact prong seats, bezel boundaries, and table depths calibrated per gemstone millimeter.</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">100% Watertight Mesh</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Zero non-manifold edges, self-intersections, or naked edges ready for instant 3D wax printing.</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">+1.25% Shrinkage Scale</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Pre-calculated alloy cooling shrinkage for 18K yellow gold, white gold, and PT950 platinum casting.</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">24/7 Engineer Support</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Direct WhatsApp line to senior MatrixGold modellers for instant sketch audits and quotes.</p>
          </div>
        </div>
      </section>

      {/* 3D Specs & Blueprints Drawer/Modal */}
      {activeModalService && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModalService(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">3D CAD Blueprint & Specifications</span>
              <h3 className="text-2xl font-bold text-white">{activeModalService.title}</h3>
              <p className="text-xs text-slate-400">{activeModalService.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-64">
                <img
                  src={activeModalService.hero_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80'}
                  alt={activeModalService.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-white uppercase tracking-wider">Engineering Specs & Tolerances</h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">File Formats Delivered</span>
                    <span className="font-mono text-[#F5E7A3]">.3DM (Rhino) + .STL + .STEP</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Wall Thickness</span>
                    <span className="font-mono text-white">Min 0.70mm (Optimum Strength)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Prong Seat Cut Angle</span>
                    <span className="font-mono text-white">42° Collet Girdle Bearing</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Shrinkage Pre-Allowance</span>
                    <span className="font-mono text-[#D4AF37]">+1.25% (Foundry Standard)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Standard Turnaround</span>
                    <span className="font-mono text-white">48 - 72 Hours</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setActiveModalService(null);
                  onNavigate('custom-design');
                }}
                className="flex-1 py-3 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                Request Custom {activeModalService.title}
              </button>
              <button
                onClick={() => {
                  setActiveModalService(null);
                  onNavigate('contact');
                }}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Inquire on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ServiceLandingPage;
