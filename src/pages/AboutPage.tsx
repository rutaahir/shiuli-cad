import React from 'react';
import { motion } from 'framer-motion';
import { PageId } from '../types';
import { BrandLogo } from '../components/BrandLogo';
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
  Eye
} from 'lucide-react';
import { LazyImage } from '../components/motion/LazyImage';

interface AboutPageProps {
  onNavigate: (page: PageId, slug?: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const stats = [
    { label: 'Years Studio Legacy', value: '12+', subtext: 'Digital Craftsmanship Since 2012', icon: Clock },
    { label: 'Master CAD Models Delivered', value: '15,000+', subtext: 'Ready for Wax 3D Printing', icon: Box },
    { label: 'Castability Success Rate', value: '99.8%', subtext: 'Zero Porosity & Pre-Scaled', icon: ShieldCheck },
    { label: 'Global Atelier Partners', value: '45+', subtext: 'Surat, Antwerp, NYC & Dubai', icon: Award },
  ];

  const servicesSpectrum = [
    {
      title: '10 Master CAD Design Lines',
      badge: 'Bespoke Modelling',
      description: 'Solitaires, Halos, Jhumkas, Rivieras, Cuban Links, & Traditional Bangles engineered for exact finger/wrist sizes.',
      icon: Gem,
      action: () => onNavigate('cad-service'),
      btnLabel: 'Explore CAD Services',
    },
    {
      title: '12 CAD File Modifications',
      badge: 'Revision Suite',
      description: '3DM/STL repair, ring resizing, weight hollowing, stone seat adjustments, Inside shank engraving, and sprue additions.',
      icon: Wrench,
      action: () => onNavigate('file-editing'),
      btnLabel: 'Explore File Editing',
    },
    {
      title: 'AI + Jewellery Concepts',
      badge: 'Generative CAD',
      description: 'Transform 2D client sketches or AI images into production-ready 3D wax CAD models with bench-setting logic.',
      icon: Bot,
      action: () => onNavigate('ai-jewellery'),
      btnLabel: 'Explore AI Jewellery',
    },
    {
      title: 'Ready-to-Cast CAD Catalog',
      badge: 'Instant Files',
      description: 'Extensive library of pre-tested, watertight 3DM & STL master files for instant manufacturing download.',
      icon: Box,
      action: () => onNavigate('collections'),
      btnLabel: 'Browse CAD Catalog',
    },
  ];

  const technologyStack = [
    {
      name: 'Rhino 8 & MatrixGold',
      category: 'Primary CAD Kernel',
      description: 'Parametric history modelling, 42° bearing cutters, dynamic collets, and real-time metal weight estimation per karat.',
      icon: Cpu,
    },
    {
      name: 'Materialise Magics',
      category: 'Mesh & STL Validation',
      description: 'Automated mesh healing, zero non-manifold edge verification, volume inspection, and slice thickness checks.',
      icon: Layers,
    },
    {
      name: 'Formlabs & EnvisionTEC',
      category: '3D Wax Print Validation',
      description: 'Pre-flight slice simulation ensuring smooth resin burnout without ash residue in lost-wax casting investment.',
      icon: Zap,
    },
    {
      name: 'ZBrush Digital Sculpting',
      category: 'Organic Reliefs & Motifs',
      description: 'High-polygon 3D sculpting for animal motifs, heraldic seals, filigree scrollwork, and textured surface finishes.',
      icon: Sparkles,
    },
  ];

  const team = [
    {
      name: 'Pravin Varma',
      role: 'Head of CAD Architecture & MatrixGold Specialist',
      experience: '14+ Years in Surat & Antwerp Diamond Hubs',
      bio: 'Former master bench modeler specializing in micro-prong halos and complex articulated mechanisms. Has modeled over 3,500 commercial casting files.',
      image: '/unsplash-img/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Anya Chen',
      role: 'Senior Gemmological Setting Engineer',
      experience: 'GIA Graduate Gemmologist',
      bio: 'Calibrates 42° pavilion bearing depth for certified melee diamonds and fancy shape colored sapphires, ensuring zero setting looseness.',
      image: '/unsplash-img/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Rohit Kulkarni',
      role: 'Foundry & Lost-Wax Casting Technical Lead',
      experience: 'Specialist in 18K/PT950 Shrinkage',
      bio: 'Inspects all STL mesh closures and gates. Guarantees that every design casts without porosity, shrinkage fissures, or cold-shuts.',
      image: '/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-[#060B1E] text-slate-100 font-sans selection:bg-[#D4AF37] selection:text-[#060B1E]"
    >
      {/* ================= SECTION 1: ABOUT SHIULI CAD STUDIO (Digital Craftsmanship Since 2012) ================= */}
      <section className="relative pt-20 sm:pt-24 pb-12 sm:pb-16 border-b border-slate-800/80 overflow-hidden bg-gradient-to-b from-[#09112B] via-[#060B1E] to-[#060B1E]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_60%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-12 relative z-10">
          {/* Main Hero Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-xs font-semibold uppercase tracking-widest shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
              About Shiuli CAD Studio • Digital Craftsmanship Since 2012
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
              The Studio Behind Every Sparkle
            </h1>

            <p className="text-slate-300 text-sm sm:text-lg leading-relaxed">
              Founded by veteran bench jewellers and digital sculptors who believe fine jewellery engineering demands micron-level mathematical precision.
            </p>
          </div>

          {/* Brand Narrative & Origin */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-4">
            <div className="lg:col-span-6 space-y-5 text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                Why Shiuli CAD Studio Exists
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
                Created For Jewellers, Not 3D Animators
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                For years, jewellery manufacturers suffered from downloading generic 3D files created by video game artists and animators. Those files looked pretty in renders, but failed catastrophically at the casting tree: wafer-thin prongs snapped off, stones didn't fit into un-calibrated seats, and non-manifold edges crashed 3D wax printers.
              </p>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Shiuli CAD Studio was established in the heart of the diamond cutting hub to solve this once and for all. Every single .3DM model and .STL mesh we produce is built with real bench-setting knowledge, accounting for metal cooling shrinkage, polishing loss, and stone bearing tolerances.
              </p>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span className="text-xs font-bold text-slate-200">Zero Non-Manifold Edges</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span className="text-xs font-bold text-slate-200">+1.25% Shrinkage Pre-Scaled</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl overflow-hidden border border-slate-700 bg-slate-950 p-3 shadow-2xl group">
                <LazyImage
                  src="/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=80"
                  alt="Master Jeweller Bench Craftsmanship"
                  className="w-full h-80 sm:h-96 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 space-y-1">
                  <div className="text-xs font-mono font-bold text-[#F5E7A3] tracking-widest uppercase">
                    CAD • 3D • PRECISION • LUXURY
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    Where digital curves translate directly to precious metals.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 2: OUR SERVICES (Full CAD & File Revision Suite) ================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-7xl mx-auto space-y-10 border-b border-slate-800/80">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            Full CAD & File Revision Suite
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Our Services Spectrum
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Everything your jewellery atelier needs from custom design to wax printer preparation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {servicesSpectrum.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-[#D4AF37]/50 transition-all duration-300 flex flex-col justify-between group shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-[10px] font-bold uppercase">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-[#F5E7A3] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <button
                  onClick={item.action}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-[#D4AF37] text-white hover:text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  <span>{item.btnLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ================= SECTION 3: OUR EXPERIENCE (12+ Years & 15,000+ CAD Models) ================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-7xl mx-auto space-y-12 border-b border-slate-800/80">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            Proven Industry Track Record
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Our Experience & Metrics
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Over a decade of micro-toleranced CAD architecture serving global manufacturers.
          </p>
        </div>

        {/* 4 Counter Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-center space-y-2 relative overflow-hidden shadow-xl"
              >
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 mx-auto flex items-center justify-center text-[#D4AF37]">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight text-[#F5E7A3]">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-slate-200">{stat.label}</div>
                <div className="text-[11px] text-slate-400">{stat.subtext}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Master Team Grid */}
        <div className="pt-6 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
              Master Technicians
            </span>
            <h3 className="text-xl sm:text-3xl font-extrabold text-white">
              Meet Our Senior CAD Modelers & Gemmologists
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-[#D4AF37]/50 transition-colors"
              >
                <div className="aspect-[4/3] relative rounded-2xl overflow-hidden border border-slate-800">
                  <LazyImage
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <h4 className="text-lg font-bold text-white">{member.name}</h4>
                  <div className="text-xs text-[#D4AF37] font-semibold">{member.role}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{member.experience}</div>
                  <p className="text-xs text-slate-300 pt-2 leading-relaxed font-light">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION 4: OUR TECHNOLOGY (Rhino 8, MatrixGold & Magics) ================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            State-of-the-Art Software Stack
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Our Technology & Engineering Tools
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            We utilize industry-leading digital sculpting and mesh verification engines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {technologyStack.map((tech, idx) => {
            const IconComp = tech.icon;
            return (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-3 text-left hover:border-[#D4AF37]/50 transition-all duration-300 shadow-xl"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <IconComp className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-wider">
                  {tech.category}
                </div>
                <h3 className="text-base font-bold text-white">
                  {tech.name}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {tech.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Direct Studio Contact Banner */}
        <div className="pt-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#09112B] via-[#060B1E] to-[#09112B] border border-slate-800 p-8 sm:p-12 text-center space-y-5 shadow-2xl relative overflow-hidden">
            <BrandLogo variant="mark-only" size="md" className="mx-auto" />
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Partner with Shiuli CAD Studio
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
              Direct Senior Engineer Line • WhatsApp: +91 9662159084 • Email: info@shiulicadstudio.com
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => onNavigate('custom-design')}
                className="px-6 py-3 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2 shadow-lg"
              >
                <span>Request Custom CAD Design</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="px-6 py-3 bg-slate-900 border border-slate-700 text-white font-semibold text-xs sm:text-sm rounded-xl hover:border-[#D4AF37]/50 transition-colors"
              >
                Contact Atelier
              </button>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default AboutPage;
