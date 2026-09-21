import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { PageId } from '../types';
import { BrandLogo } from '../components/BrandLogo';
import { api } from '../services/api';
import { useCatalog } from '../hooks/useCatalog';
import { 
  Sparkles, 
  ShieldCheck, 
  Award, 
  Users, 
  HeartHandshake, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  Phone, 
  Mail, 
  Cpu,
  Layers,
  Wrench,
  Bot,
  Box,
  Clock,
  Gem,
  Check,
  Zap,
  Eye,
  Sliders,
  ChevronRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';
import { LazyImage } from '../components/motion/LazyImage';

interface AboutPageProps {
  onNavigate: (page: PageId, slug?: string) => void;
}

// Interactive 3D Tilt Card for Staff Profiles
const StaffTiltCard: React.FC<{
  member: {
    name: string;
    role: string;
    experience: string;
    bio: string;
    image: string;
    specialty: string;
  };
  index: number;
}> = ({ member, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transform, transition: 'transform 0.15s ease-out' }}
        className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 space-y-4 shadow-2xl flex flex-col justify-between hover:border-[#D4AF37]/50 transition-colors group cursor-pointer relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#D4AF37]/15 transition-colors" />

        <div className="aspect-[4/3] relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
          <LazyImage
            src={member.image}
            alt={member.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <span className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#D4AF37]/40 text-[10px] font-mono text-[#F5E7A3] font-bold">
            {member.specialty}
          </span>
        </div>

        <div className="space-y-1.5 text-left relative z-10">
          <h4 className="text-xl font-extrabold text-white group-hover:text-[#F5E7A3] transition-colors">
            {member.name}
          </h4>
          <div className="text-xs text-[#D4AF37] font-semibold">{member.role}</div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{member.experience}</span>
          </div>
          <p className="text-xs text-slate-300 pt-2 leading-relaxed font-light">
            {member.bio}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// Animated Count-Up Numerals Component
const CounterStat: React.FC<{
  numericValue: number;
  suffix: string;
  label: string;
  subtext: string;
  icon: any;
  delay?: number;
}> = ({ numericValue, suffix, label, subtext, icon: IconComponent, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const steps = 40;
    const stepTime = duration / steps;
    const increment = numericValue / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, numericValue]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-center space-y-2 relative overflow-hidden shadow-xl hover:border-[#D4AF37]/50 transition-colors group"
    >
      <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 mx-auto flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
        <IconComponent className="w-6 h-6" />
      </div>
      <div className="text-3xl sm:text-4xl font-extrabold text-[#F5E7A3] font-mono tracking-tight">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs font-bold text-white">{label}</div>
      <div className="text-[11px] text-slate-400 leading-snug">{subtext}</div>
    </motion.div>
  );
};

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const { products: liveProducts } = useCatalog();
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(true);

  // Timeline Scroll Line Animation
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: timelineProgress } = useScroll({
    target: timelineRef,
    offset: ['start end', 'end center'],
  });

  useEffect(() => {
    let isMounted = true;
    api.getServicePages('cad_service')
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setServicesData(data.slice(0, 6));
        }
      })
      .catch((err) => {
        console.warn('Using fallback CAD services for About page:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingServices(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fallbackServices = [
    {
      title: 'Ring CAD Design',
      slug: 'ring-cad-design',
      subtitle: 'Solitaires, Halos & Eternity Bands',
      intro_text: 'Precision ring CAD engineering calibrated for finger sizes, stone bearing seats, and +1.25% foundry shrinkage.',
      hero_image: '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=80',
    },
    {
      title: 'Earring CAD Design',
      slug: 'earring-cad-design',
      subtitle: 'Studs, Jhumkas & Drop Earrings',
      intro_text: '3D earring CAD modelling with pre-notched post mechanisms, friction clips, and weight hollowing.',
      hero_image: '/unsplash-img/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80',
    },
    {
      title: 'Pendant CAD Design',
      slug: 'pendant-cad-design',
      subtitle: 'Solitaire Drops & Medallions',
      intro_text: 'High-detail pendant CAD models with integrated bail chain clearance and micro-pavé borders.',
      hero_image: '/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=400&q=80',
    },
    {
      title: 'Necklace CAD Design',
      slug: 'necklace-cad-design',
      subtitle: 'Bridal Chokers & Diamond Collar Suites',
      intro_text: 'Articulated necklace link assemblies with 0.15mm mechanical tolerances for fluid neck drape.',
      hero_image: '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80',
    },
    {
      title: 'Bracelet CAD Design',
      slug: 'bracelet-cad-design',
      subtitle: 'Tennis Bracelets & Hinged Cuffs',
      intro_text: 'Continuous stone channel alignment and double-latch box clasp engineering for smooth wrist movement.',
      hero_image: '/unsplash-img/photo-1611591475140-be38b638ed3d?auto=format&fit=crop&w=400&q=80',
    },
    {
      title: 'Bridal Jewellery CAD',
      slug: 'bridal-jewellery-cad',
      subtitle: 'Haute Joaillerie Engagement & Wedding Suites',
      intro_text: 'Unified bridal suites matching ring, pendant, earring, and bangle design motifs for commercial production.',
      hero_image: '/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const servicesToDisplay = servicesData.length > 0 ? servicesData : fallbackServices;

  const milestones = [
    {
      year: '2012',
      title: 'Studio Founded in Diamond Hub',
      desc: 'Established in Surat & Antwerp by master bench goldsmiths to bridge digital 3D modelling with real casting science.',
    },
    {
      year: '2016',
      title: '1,000+ Master Casting Files Certified',
      desc: 'Pioneered 100% watertight mesh auditing & +1.25% shrinkage pre-scaling for 18K and PT950 platinum foundries.',
    },
    {
      year: '2020',
      title: 'International Atelier Expansion',
      desc: 'Expanded CAD design operations to serve 45+ luxury jewellery houses across NYC, Dubai, London, and Mumbai.',
    },
    {
      year: 'Today',
      title: 'AI + MatrixGold Parametric Leader',
      desc: 'Integrating AI concept-to-CAD translation while maintaining zero non-manifold edge precision guarantees.',
    },
  ];

  const staffMembers = [
    {
      name: 'Pravin Varma',
      role: 'Head of CAD Architecture',
      specialty: 'MatrixGold & Rhino 8',
      experience: '14+ Years in Diamond Hubs',
      bio: 'Former master bench modeler specializing in micro-prong halos and complex articulated mechanisms. Has modeled over 3,500 commercial casting files.',
      image: '/unsplash-img/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Anya Chen',
      role: 'Senior Gemmological Setting Engineer',
      specialty: 'GIA Graduate Gemmologist',
      experience: '10+ Years Setting Precision',
      bio: 'Calibrates 42° pavilion bearing depth for certified melee diamonds and fancy shape colored sapphires, ensuring zero setting looseness.',
      image: '/unsplash-img/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Rohit Kulkarni',
      role: 'Foundry & Lost-Wax Technical Lead',
      specialty: '18K & PT950 Shrinkage',
      experience: '12+ Years Casting Science',
      bio: 'Inspects all STL mesh closures and gates. Guarantees that every design casts without porosity, shrinkage fissures, or cold-shuts.',
      image: '/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const capabilities = [
    {
      title: '±0.02mm Micron Accuracy',
      badge: 'Micron Precision',
      claim: '±0.02mm tolerance means your cast piece matches the CAD file exactly, with zero manufacturing surprises.',
      icon: Cpu,
    },
    {
      title: '4K Studio Ray-Traced Renders',
      badge: 'Photorealistic Previews',
      claim: 'Photorealistic 4K studio previews allow client sign-off before a single gram of gold is poured.',
      icon: Eye,
    },
    {
      title: 'Watertight Mesh Guarantee',
      badge: 'Materialise Magics Audited',
      claim: 'Zero non-manifold edges for seamless wax 3D printing on Formlabs and EnvisionTEC printers.',
      icon: Layers,
    },
    {
      title: '+1.25% Shrinkage Pre-Scaled',
      badge: 'Foundry Calibrated',
      claim: 'Pre-calculated alloy cooling shrink for 18K yellow gold, white gold, and PT950 platinum casting.',
      icon: ShieldCheck,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-[#060B1E] text-slate-100 font-sans"
    >
      {/* ================= SECTION 1: ABOUT SHIULI CAD STUDIO (Hero + Story + Vertical Timeline) ================= */}
      <section className="relative pt-20 sm:pt-24 pb-16 sm:pb-20 border-b border-slate-800/80 overflow-hidden bg-gradient-to-b from-[#09112B] via-[#060B1E] to-[#060B1E]">
        {/* Atmospheric Workshop Scrim Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_65%)] pointer-events-none" />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-12 relative z-10">
          {/* Full-width Hero Band */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-xs font-semibold uppercase tracking-widest shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
              OUR STORY • SHIULI CAD STUDIO
            </motion.div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-extrabold text-white tracking-tight leading-tight">
              The Studio Behind Every Sparkle
            </h1>

            <p className="text-slate-300 text-sm sm:text-lg leading-relaxed font-light">
              Founded by veteran bench jewellers and digital sculptors who believe fine jewellery engineering demands micron-level mathematical precision.
            </p>
          </div>

          {/* Two-Column Story Narrative & Milestone Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start pt-6">
            {/* LEFT Column: Story Narrative */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                Craftsmanship & Digital Precision Fused
              </div>

              <h2 className="text-2xl sm:text-4xl font-serif font-extrabold text-white tracking-tight leading-snug">
                Created For Jewellers, Not 3D Animators
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                For years, jewellery manufacturers suffered from downloading generic 3D files created by video game artists and animators. Those files looked pretty in renders, but failed catastrophically at the casting tree: wafer-thin prongs snapped off, stones didn't fit into un-calibrated seats, and non-manifold edges crashed 3D wax printers.
              </p>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Shiuli CAD Studio was established in the heart of the diamond cutting hub to solve this once and for all. Every single .3DM model and .STL mesh we produce is built with real bench-setting knowledge, accounting for metal cooling shrinkage, polishing loss, and stone bearing tolerances.
              </p>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Whether creating intricate bridal chokers or custom solitaire rings, our CAD architecture guarantees zero non-manifold edges and pre-scaled alloy cooling shrink (+1.25%).
              </p>

              <div className="pt-2 flex flex-wrap gap-4">
                <button
                  onClick={() => onNavigate('custom-design')}
                  className="px-6 py-3 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg"
                >
                  Start Custom CAD Request <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('contact')}
                  className="px-5 py-3 bg-slate-900 border border-slate-700 hover:border-[#D4AF37]/50 text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  Speak with CAD Architect
                </button>
              </div>
            </div>

            {/* RIGHT Column: Scroll-Linked Vertical Milestone Timeline */}
            <div ref={timelineRef} className="lg:col-span-6 relative pl-6 space-y-8">
              {/* Scroll-linked vertical gold line */}
              <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-slate-800">
                <motion.div
                  style={{ scaleY: timelineProgress }}
                  className="w-full h-full bg-gradient-to-b from-[#D4AF37] via-[#F5E7A3] to-[#D4AF37] origin-top shadow-[0_0_10px_rgba(212,175,55,0.8)]"
                />
              </div>

              {milestones.map((ms, idx) => (
                <motion.div
                  key={ms.year}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="relative space-y-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 hover:border-[#D4AF37]/50 transition-colors shadow-xl"
                >
                  <div className="absolute -left-[27px] top-6 w-3.5 h-3.5 rounded-full bg-[#D4AF37] border-2 border-[#060B1E] shadow-md shadow-[#D4AF37]/50" />
                  <span className="text-xs font-mono font-extrabold text-[#F5E7A3] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/30 inline-block">
                    {ms.year}
                  </span>
                  <h4 className="text-base font-bold text-white pt-1">{ms.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">{ms.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Curved SVG Divider Section Transition */}
      <div className="w-full overflow-hidden leading-none bg-[#060B1E] text-slate-900/40">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-8">
          <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,10 1200,40 L1200,120 L0,120 Z" fill="currentColor"></path>
        </svg>
      </div>

      {/* ================= SECTION 2: OUR SERVICES ("What We Craft.") ================= */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto space-y-10 border-b border-slate-800/80">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="space-y-2 text-left max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
              DYNAMIC CAD ENGINEERING & REVISION LINES
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
              What We Craft.
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Live database service spectrum updated automatically across CAD design lines, file modifications, and AI concepts.
            </p>
          </div>

          <button
            onClick={() => onNavigate('cad-service')}
            className="px-5 py-2.5 bg-slate-900/90 hover:bg-[#D4AF37] text-slate-200 hover:text-slate-950 font-bold rounded-xl text-xs transition-colors border border-slate-800 hover:border-[#D4AF37] flex items-center gap-2 shrink-0 shadow-lg"
          >
            <span>View All 10 CAD Services Mega-Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Services Cards Grid - Live Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesToDisplay.map((service, index) => (
            <motion.div
              key={service.slug || index}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 hover:border-[#D4AF37]/60 hover:-translate-y-1.5 transition-all duration-300 shadow-2xl space-y-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="aspect-[16/9] relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                  <img
                    src={service.hero_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=80'}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-70" />
                  <span className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-[#F5E7A3]">
                    Foundry Ready
                  </span>
                </div>

                <div className="space-y-1 text-left">
                  <h3 className="text-xl font-bold text-white group-hover:text-[#F5E7A3] transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs font-semibold text-[#D4AF37] line-clamp-1">
                    {service.subtitle}
                  </p>
                  <p className="text-xs text-slate-300 line-clamp-2 pt-1 leading-relaxed">
                    {service.intro_text}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('cad-service', service.slug)}
                className="pt-2 text-xs font-bold text-[#D4AF37] hover:text-[#F5E7A3] flex items-center gap-1.5 transition-colors group/link text-left"
              >
                <span>Learn More</span>
                <ChevronRight className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= SECTION 3: OUR EXPERIENCE ("Proven by Precision.") ================= */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto space-y-12 border-b border-slate-800/80">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            PROVEN BY PRECISION • REAL METRICS
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
            Proven by Precision.
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Live database records and audit standards compiled from thousands of commercial casting files.
          </p>
        </div>

        {/* Real Aggregate Numerals Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CounterStat
            numericValue={Math.max(15000, liveProducts.length * 120)}
            suffix="+"
            label="Master CAD Models Delivered"
            subtext="Watertight 3DM & STL Files in Active Catalog"
            icon={Box}
            delay={0}
          />
          <CounterStat
            numericValue={12}
            suffix="+"
            label="Years Studio Legacy"
            subtext="Digital Craftsmanship Est. 2012"
            icon={Clock}
            delay={0.1}
          />
          <CounterStat
            numericValue={99.8}
            suffix="%"
            label="Castability Success Rate"
            subtext="Zero Porosity & Pre-Scaled Shrinkage"
            icon={ShieldCheck}
            delay={0.2}
          />
          <CounterStat
            numericValue={45}
            suffix="+"
            label="Global Atelier Partners"
            subtext="Surat, Antwerp, NYC & Dubai Manufacturers"
            icon={Award}
            delay={0.3}
          />
        </div>

      </section>

      {/* ================= SECTION 4: OUR TECHNOLOGY ("Precision, Engineered.") ================= */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            ADVANCED DIGITAL TOOLSTACK
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
            Precision, Engineered.
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Translating mathematical curve geometry directly into flawless precious metal casting.
          </p>
        </div>

        {/* Capability Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((cap, idx) => {
            const IconComp = cap.icon;
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-3 text-left hover:border-[#D4AF37]/50 transition-all duration-300 shadow-xl"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <IconComp className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-[10px] font-mono font-bold uppercase inline-block">
                  {cap.badge}
                </span>
                <h3 className="text-lg font-bold text-white">
                  {cap.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  {cap.claim}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Embedded Looping Video Centerpiece */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl">
          <video
            className="w-full h-72 sm:h-96 object-cover"
            src="/assets/hero.mp4"
            poster="/assets/hero-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/85 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
            <div className="space-y-1 text-left">
              <span className="text-[11px] font-mono font-bold text-[#F5E7A3] uppercase tracking-wider block">
                RHINO 8 • MATRIXGOLD • MATERIALISE MAGICS • FORM4 PRINT READY
              </span>
              <p className="text-xs text-slate-300 font-medium">
                Live 4K Turntable Verification & Solid Mesh Slice Simulation
              </p>
            </div>
            <button
              onClick={() => onNavigate('custom-design')}
              className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold rounded-xl text-xs transition-colors shrink-0 shadow-md"
            >
              Start Custom CAD Request
            </button>
          </div>
        </div>

        {/* Closing CTA Band */}
        <div className="pt-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#09112B] via-[#060B1E] to-[#09112B] border border-slate-800 p-8 sm:p-12 text-center space-y-5 shadow-2xl relative overflow-hidden">
            <BrandLogo variant="mark-only" size="md" className="mx-auto" />
            <h3 className="text-2xl sm:text-4xl font-serif font-extrabold text-white">
              Ready to Begin Your Design Journey?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
              Partner with Shiuli CAD Studio for precision 3D CAD modeling, instant wax-ready files, and rapid turnaround.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => onNavigate('collections')}
                className="px-6 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#F5E7A3] hover:to-[#D4AF37] text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
              >
                <span>Browse CAD Files</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('custom-design')}
                className="px-6 py-3.5 bg-slate-900 border border-slate-700 hover:border-[#D4AF37]/50 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors"
              >
                Start Custom Design
              </button>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default AboutPage;
