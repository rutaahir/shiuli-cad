import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'framer-motion';
import { PageId } from '../types';
import { api } from '../services/api';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  ArrowRight, 
  FileCheck2, 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Eye, 
  RotateCw, 
  Zap, 
  Scissors, 
  Scale,
  Crosshair,
  Check,
  Award
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';

interface HowItWorksPageProps {
  onNavigate: (page: PageId) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getFaqs().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setFaqs(data);
      }
    }).catch(() => {});
  }, []);

  // Scroll Progress Line for the 4-step journey
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 60%', 'end 80%'],
  });

  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      num: '01',
      title: 'Submit Design',
      subtitle: 'Upload Photo, Sketch, Reference or Idea',
      desc: 'You send us a hand-drawn sketch, photo reference, or design brief. We collect initial specifications including stone dimensions, finger size, and metal karat.',
      badge: 'Step 1 • Intake',
      icon: Sparkles,
      image: '/unsplash-img/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
      details: ['Photo / Sketch submission', 'Stone specs intake', 'Initial requirement audit'],
      callouts: ['Instant Upload', 'Any Format Supported', 'Confidential NDA'],
    },
    {
      num: '02',
      title: 'Discuss Requirements',
      subtitle: '1-on-1 Consultation with CAD Engineer',
      desc: 'Our master CAD engineers review your design parameters, metal weight targets, stone setting preferences, and casting tolerances with you directly.',
      badge: 'Step 2 • Consultation',
      icon: Layers,
      image: '/unsplash-img/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
      details: ['Bench jeweler feasibility audit', 'Wall thickness optimization', 'Setting style agreement'],
      callouts: ['WhatsApp & Email', 'Metal Karat Specs', 'Shrinkage Calculation'],
    },
    {
      num: '03',
      title: 'Get Quote',
      subtitle: 'Transparent Estimation & Turnaround Time',
      desc: 'Receive a clear studio estimate based on design complexity, stone setting requirements, and preferred turnaround speed.',
      badge: 'Step 3 • Estimation',
      icon: Award,
      image: '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
      details: ['Fixed studio estimate', 'Clear delivery timeline', 'Zero hidden fees'],
      callouts: ['Fair Rates', 'Standard / Express', 'Instant Invoice'],
    },
    {
      num: '04',
      title: 'CAD Modelling',
      subtitle: 'Precision 3D Surface & Mesh Sculpting',
      desc: 'Our CAD engineers sculpt the 3D model using Rhino 8 and MatrixGold on organized layers with 0.02mm dimensional accuracy.',
      badge: 'Step 4 • 3D CAD Engineering',
      icon: Cpu,
      image: '/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
      details: ['Rhino 8 NURBS surface modeling', 'Pre-notched stone seat cuts', 'Hollowing & weight calibration'],
      callouts: ['0.02mm Precision', 'MatrixGold Engine', 'Rhino 8 Native'],
    },
    {
      num: '05',
      title: 'Review & Revision',
      subtitle: 'Photorealistic Renders & Client Adjustments',
      desc: 'We share 4K ray-traced renders and 3D angle views for your review. We accommodate revisions until the model matches your vision 100%.',
      badge: 'Step 5 • Verification',
      icon: Eye,
      image: '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
      details: ['4K photorealistic renders', 'Unlimited minor adjustments', 'Stone & metal angle checks'],
      callouts: ['4K Renders', 'Interactive Feedback', '100% Satisfaction'],
    },
    {
      num: '06',
      title: 'Final Delivery',
      subtitle: 'Production-Ready .3DM, .STL, .OBJ, .STEP Files',
      desc: 'Download your complete 3D file package with pre-scaled foundry shrinkage (+1.25%), ready for immediate 3D wax printing and lost-wax casting.',
      badge: 'Step 6 • Delivery',
      icon: FileCheck2,
      image: '/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
      details: ['100% Watertight STL mesh', 'Layered Rhino .3DM project file', 'Instant dashboard download & WhatsApp link'],
      callouts: ['Print & Cast Ready', 'Multi-Format Archive', '24/7 Access'],
    },
  ];

  const qcStandards = [
    {
      title: 'Watertight Mesh Guarantee',
      desc: '100% manifold solid with zero non-manifold edges or naked curves, preventing slice errors in 3D wax printers.',
      icon: ShieldCheck,
      number: '01',
    },
    {
      title: 'Wall Thickness Calibration',
      desc: 'Strict adherence to minimum 0.65mm - 0.85mm structural walls to ensure molten metal flow without cold-shuts.',
      icon: Scissors,
      number: '02',
    },
    {
      title: '42° Pre-Notched Stone Seats',
      desc: 'Bearings cut to exact gem pavilion angles so your setter drops diamonds in without excessive burring time.',
      icon: Sparkles,
      number: '03',
    },
    {
      title: 'Lost-Wax Shrinkage Compensation',
      desc: 'Pre-calibrated 1.0% - 1.5% volumetric expansion to offset resin curing, investment expansion, and gold cooling.',
      icon: Scale,
      number: '04',
    },
    {
      title: 'Estimated Weight Precision (±5%)',
      desc: 'Specific gravity calculations for 14K, 18K, 925 Silver, and Platinum (PT950) so your quotes stay accurate.',
      icon: Zap,
      number: '05',
    },
    {
      title: 'Optimized Sprue Feeder Placement',
      desc: 'Strategically located gate zones that feed metal into heavy sections without disrupting delicate prong galleries.',
      icon: RotateCw,
      number: '06',
    },
    {
      title: 'Hinged Assembly Tolerances',
      desc: '0.15mm mechanical clearance on rivets, tongue-in-groove clasps, and tennis bracelet links for smooth articulation.',
      icon: Cpu,
      number: '07',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#17243B] pt-28 pb-24 px-4 sm:px-6 lg:px-8 xl:px-12 relative overflow-hidden">
      {/* Background Subtle Accent Spheres */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-[#D9B66F]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[30rem] h-[30rem] bg-[#17345C]/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[1600px] mx-auto space-y-24 relative z-10">

        {/* HERO SECTION WITH ANIMATED BADGE */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E8D7B7] shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-[#B88732] animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#B88732]">
              The Shiuli Methodology
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl md:text-6xl text-[#17345C] font-bold tracking-tight leading-tight"
          >
            Precision Engineering Meets Fine Jewellery
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xs sm:text-base text-[#687386] font-normal leading-relaxed max-w-2xl mx-auto"
          >
            How our studio bridges the gap between hand-drawn artistic sketches and flawless lost-wax casting production.
          </motion.p>
        </div>

        {/* 4-STEP ANIMATED TIMELINE JOURNEY */}
        <div ref={containerRef} className="relative space-y-20 lg:space-y-28">
          
          {/* Scroll-Linked Laser Beam Timeline (Desktop) */}
          <div className="hidden lg:block absolute top-8 bottom-8 left-1/2 -translate-x-1/2 w-[2px] bg-[#E8D7B7] pointer-events-none">
            <motion.div
              style={{ scaleY, transformOrigin: 'top' }}
              className="w-full h-full bg-gradient-to-b from-[#D9B66F] via-[#B88732] to-[#D9B66F]"
            />
          </div>

          {steps.map((st, idx) => {
            const isEven = idx % 2 === 1;
            const Icon = st.icon;

            return (
              <div
                key={st.num}
                className={`relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center ${
                  isEven ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Text Side Animation */}
                <motion.div
                  initial={{ opacity: 0, x: isEven ? 60 : -60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                  className={`lg:col-span-6 space-y-4 ${
                    isEven ? 'lg:order-2 lg:pl-8' : 'lg:order-1 lg:pr-8 lg:text-right'
                  }`}
                >
                  <div className={`flex items-center gap-2 ${isEven ? 'justify-start' : 'lg:justify-end'}`}>
                    <span className="px-3 py-1 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[10px] uppercase font-mono text-[#B88732] font-bold shadow-sm">
                      {st.badge}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl sm:text-4xl font-bold text-[#17345C]">
                    {st.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#687386] leading-relaxed font-normal">
                    {st.desc}
                  </p>

                  <div className={`flex flex-wrap gap-2 pt-2 ${isEven ? 'justify-start' : 'lg:justify-end'}`}>
                    {st.details.map((d, i) => (
                      <motion.span
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E8D7B7] text-[11px] text-[#17345C] shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" />
                        {d}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>

                {/* Center Node Indicator with Animated Glowing Aura */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-2 border-[#D9B66F] items-center justify-center font-serif font-bold text-base text-[#17345C] shadow-md z-20 group cursor-pointer"
                >
                  <span className="relative z-10">{st.num}</span>
                  <div className="absolute inset-0 rounded-full bg-[#D9B66F]/20 animate-ping pointer-events-none" />
                </motion.div>

                {/* Interactive Visual Card on Opposing Side */}
                <motion.div
                  initial={{ opacity: 0, x: isEven ? -60 : 60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                  className={`lg:col-span-6 rounded-3xl bg-white border border-[#E8D7B7] p-6 shadow-sm space-y-4 relative overflow-hidden group ${
                    isEven ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] flex items-center justify-center text-[#B88732] group-hover:scale-110 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-serif text-base text-[#17345C] font-semibold">{st.subtitle}</h4>
                        <span className="text-[10px] text-emerald-700 font-mono tracking-wider font-semibold">Foundry Approved Spec</span>
                      </div>
                    </div>
                  </div>

                  {/* Image Frame with Floating Blueprint Spec Callouts */}
                  <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-[#FFF9F0] border border-[#E8D7B7] relative shadow-inner">
                    <img
                      src={st.image}
                      alt={st.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    {/* Animated Floating Blueprint Badges on Image */}
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 z-20">
                      {st.callouts.map((callout, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className="px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md border border-[#E8D7B7] text-[10px] font-mono text-[#17345C] shadow-sm flex items-center gap-1 font-semibold"
                        >
                          <Crosshair className="w-3 h-3 text-[#B88732]" />
                          <span>{callout}</span>
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* INTERACTIVE BEFORE & AFTER SLIDER SPOTLIGHT WITH SCROLL REVEAL */}
        <RevealOnScroll className="rounded-3xl bg-[#FFF9F0] border border-[#E8D7B7] p-6 sm:p-12 space-y-8 shadow-sm relative overflow-hidden">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold">
              Live Interactive Demonstration
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#17345C]">
              From Concept Sketch To Casting CAD
            </h2>
            <p className="text-xs text-[#687386] font-normal">
              Drag the center slider to inspect how our 3D modelers preserve every delicate curve while engineering watertight stone seats.
            </p>
          </div>

          <BeforeAfterSlider />
        </RevealOnScroll>

        {/* 7-POINT FOUNDRY INSPECTION PROTOCOL (ANIMATED STAGGER GRID) */}
        <div className="space-y-12">
          <RevealOnScroll className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono uppercase tracking-wider font-semibold">
              <Award className="w-3.5 h-3.5" />
              Zero Foundry Defect Rate
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#17345C]">
              The 7-Point Foundry Inspection Protocol
            </h2>
            <p className="text-xs text-[#687386] font-normal">
              Every file downloaded from Shiuli CAD Studio undergoes this stringent technical audit before release.
            </p>
          </RevealOnScroll>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {qcStandards.map((qc, i) => {
              const Icon = qc.icon;
              return (
                <StaggerItem key={i}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 rounded-2xl bg-white border border-[#E8D7B7] hover:border-[#D9B66F] space-y-3 shadow-sm relative overflow-hidden group cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] flex items-center justify-center text-[#B88732] group-hover:bg-[#D9B66F] group-hover:text-[#17345C] transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h4 className="font-serif text-base text-[#17345C] font-semibold">{qc.title}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#B88732]">#{qc.number}</span>
                    </div>
                    <p className="text-xs text-[#687386] leading-relaxed font-normal">{qc.desc}</p>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>

        {/* FAQ ACCORDION WITH ANIMATED EXPANSION */}
        <div className="space-y-8 max-w-3xl mx-auto">
          <RevealOnScroll className="text-center space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold">
              Frequently Asked Questions
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#17345C]">
              Everything You Need To Know
            </h2>
          </RevealOnScroll>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <RevealOnScroll key={index} delay={index * 0.05}>
                  <div className="rounded-2xl bg-white border border-[#E8D7B7] overflow-hidden transition-all shadow-sm">
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 text-sm sm:text-base font-serif font-semibold text-[#17345C] hover:text-[#B88732] transition-colors"
                    >
                      <span>{faq.question}</span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="w-4 h-4 text-[#B88732] flex-shrink-0" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#687386] leading-relaxed border-t border-[#E8D7B7] font-normal">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>

        {/* BOTTOM CTA BANNER WITH SCROLL REVEAL */}
        <RevealOnScroll className="text-center rounded-3xl bg-[#FFF9F0] border border-[#E8D7B7] p-10 sm:p-14 space-y-6 shadow-sm relative overflow-hidden">
          <h3 className="font-serif text-2xl sm:text-4xl font-bold text-[#17345C]">
            Have an Upcoming Custom Collection?
          </h3>
          <p className="text-xs sm:text-sm text-[#687386] max-w-md mx-auto font-normal leading-relaxed">
            Experience our 48-hour turn-around with 2 free revisions and guaranteed watertight STL meshes.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('custom-design')}
              className="btn-gold-luxury px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Start Custom Request</span>
              <ArrowRight className="w-4 h-4 text-[#17345C]" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('pricing')}
              className="px-8 py-3.5 rounded-full bg-white border border-[#E8D7B7] text-xs font-bold text-[#17345C] uppercase tracking-wider hover:bg-[#FFF9F0] transition-colors"
            >
              View Pricing Rates
            </motion.button>
          </div>
        </RevealOnScroll>

      </div>
    </div>
  );
};
