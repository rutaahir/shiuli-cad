import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { PageId } from '../types';
import { 
  Phone, 
  Mail, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Instagram, 
  Linkedin, 
  Facebook, 
  ShieldCheck, 
  FileCode2, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  MessageSquare
} from 'lucide-react';

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [mobileSection, setMobileSection] = useState<'explore' | 'capabilities' | 'contact' | null>('explore');

  const toggleMobileSection = (section: 'explore' | 'capabilities' | 'contact') => {
    setMobileSection(prev => prev === section ? null : section);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setIsSubscribed(true);
      setTimeout(() => setIsSubscribed(false), 5000);
      setNewsletterEmail('');
    }
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative bg-[#0A1628] text-slate-200 overflow-hidden border-t border-[#D6AD62]/30">
      {/* Animated Light Glow beam on top border */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D6AD62] to-transparent opacity-90" />

      {/* Subtle luxury ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-64 bg-[#17345C]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-[#D6AD62]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full px-4 sm:px-6 lg:px-20 xl:px-28 pt-10 sm:pt-16 pb-8 sm:pb-12 relative z-10">
        
        {/* =========================================================================
            DESKTOP & TABLET LAYOUT (sm:grid - 4 Columns)
           ========================================================================= */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          {/* Column 1: Brand & Manifesto */}
          <div className="space-y-4">
            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#FFFDF9]/85 backdrop-blur-md border border-[#D6AD62]/40 shadow-sm hover:bg-[#FFFDF9]/95 transition-all">
              <BrandLogo variant="horizontal" size="md" theme="light" />
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              Where imagination becomes fine jewellery. Delivering production-tested Rhino .3DM files and watertight .STL meshes for high jewellery ateliers and global manufacturers.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs tracking-widest text-[#D6AD62] uppercase font-semibold font-mono">
              <span>CAD</span>
              <span>•</span>
              <span>3D MODELLING</span>
              <span>•</span>
              <span>PRECISION</span>
              <span>•</span>
              <span>LUXURY</span>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full border border-[#D6AD62]/30 flex items-center justify-center text-slate-300 hover:text-[#D6AD62] hover:border-[#D6AD62] hover:bg-[#D6AD62]/10 transition-all shadow-sm"
                title="Follow us on Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full border border-[#D6AD62]/30 flex items-center justify-center text-slate-300 hover:text-[#D6AD62] hover:border-[#D6AD62] hover:bg-[#D6AD62]/10 transition-all shadow-sm"
                title="Connect on LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full border border-[#D6AD62]/30 flex items-center justify-center text-slate-300 hover:text-[#D6AD62] hover:border-[#D6AD62] hover:bg-[#D6AD62]/10 transition-all shadow-sm"
                title="Shiuli CAD on Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Studio Capabilities */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#E8D7B7] font-semibold mb-4 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-[#D6AD62]" />
              Core Capabilities
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2 hover:text-white transition-colors">
                <span className="text-[#D6AD62] mt-0.5">•</span>
                <span>3D Jewellery Modelling &amp; CAD Design</span>
              </li>
              <li className="flex items-start gap-2 hover:text-white transition-colors">
                <span className="text-[#D6AD62] mt-0.5">•</span>
                <span>High-Precision STL Files for Casting</span>
              </li>
              <li className="flex items-start gap-2 hover:text-white transition-colors">
                <span className="text-[#D6AD62] mt-0.5">•</span>
                <span>Physically Based 4K Rendering &amp; Animation</span>
              </li>
              <li className="flex items-start gap-2 hover:text-white transition-colors">
                <span className="text-[#D6AD62] mt-0.5">•</span>
                <span>Bespoke Custom Jewellery Requisition</span>
              </li>
              <li className="flex items-start gap-2 hover:text-white transition-colors">
                <span className="text-[#D6AD62] mt-0.5">•</span>
                <span>Shrinkage Calibration &amp; Mesh Optimization</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Quick Navigation */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#E8D7B7] font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D6AD62]" />
              Explore Studio
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
              <li>
                <button onClick={() => onNavigate('collections')} className="hover:text-[#D6AD62] transition-colors cursor-pointer text-left">
                  Ready CAD Collections
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('custom-design')} className="hover:text-[#D6AD62] transition-colors cursor-pointer text-left">
                  Custom Design Request
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('file-editing')} className="hover:text-[#D6AD62] transition-colors cursor-pointer text-left">
                  CAD File Modification Studio
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-it-works')} className="hover:text-[#D6AD62] transition-colors cursor-pointer text-left">
                  Ordering &amp; Delivery Workflow
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('gallery')} className="hover:text-[#D6AD62] transition-colors cursor-pointer text-left">
                  Lookbook &amp; Render Gallery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-[#D6AD62] transition-colors cursor-pointer text-left">
                  About Our Master Modelers
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors font-semibold text-[#E8D7B7] cursor-pointer text-left">
                  Contact Us / Studio Access
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Newsletter */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#E8D7B7] font-semibold mb-4">
              Direct Contact
            </h4>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#D6AD62] shrink-0" />
                <a href="tel:+919574787098" className="hover:text-white transition-colors">
                  +91 95747 87098
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#D6AD62] shrink-0" />
                <a href="mailto:hello@shiulicadstudio.com" className="hover:text-white transition-colors">
                  hello@shiulicadstudio.com
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D6AD62] shrink-0 mt-0.5" />
                <span className="leading-snug text-xs text-slate-400">
                  468/6, Chatrabhujdarshan Co-Op Soc, Manek Chowk, Sankadi Sheri, Opp. B.D. College, Ahmedabad - 380001
                </span>
              </div>
            </div>

            {/* Newsletter Subscription */}
            <div className="pt-2">
              <p className="text-xs text-slate-200 mb-2 font-medium">
                Subscribe for New CAD Release Drops
              </p>
              {isSubscribed ? (
                <div className="flex items-center gap-2 p-2 bg-emerald-950/70 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Subscribed! You will receive new STL catalog alerts.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex items-center">
                  <input
                    type="email"
                    required
                    placeholder="jeweller@atelier.com"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-l-xl bg-[#0F223D] border border-[#D6AD62]/30 text-white placeholder-slate-400 focus:outline-hidden focus:border-[#D6AD62]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2.5 bg-[#D6AD62] hover:bg-[#E8D7B7] text-[#0A1628] rounded-r-xl text-xs font-bold transition-colors flex items-center justify-center cursor-pointer shadow-xs"
                    title="Subscribe"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            MOBILE RESPONSIVE COMPACT ACCORDION & TOUCH-FIRST LAYOUT (Below sm)
           ========================================================================= */}
        <div className="sm:hidden space-y-6 mb-8">
          {/* Mobile Brand & Quick Action Strip */}
          <div className="space-y-3.5 text-center">
            <div className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-[#FFFDF9]/90 backdrop-blur-md border border-[#D6AD62]/40 shadow-sm">
              <BrandLogo variant="horizontal" size="md" theme="light" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-light px-2">
              Delivering production-tested Rhino .3DM &amp; watertight .STL meshes for high jewellery ateliers and global manufacturers.
            </p>

            {/* Quick Contact Action Pills */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <a
                href="https://wa.me/919574787098?text=Hello%20Shiuli%20CAD%20Studio"
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-2 rounded-xl bg-[#0F223D] border border-[#D6AD62]/40 text-[#E8D7B7] hover:border-[#D6AD62] text-[11px] font-mono font-bold flex flex-col items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <MessageSquare className="w-4 h-4 text-[#D6AD62]" />
                <span>WhatsApp</span>
              </a>
              <a
                href="tel:+919574787098"
                className="py-2.5 px-2 rounded-xl bg-[#0F223D] border border-[#D6AD62]/40 text-[#E8D7B7] hover:border-[#D6AD62] text-[11px] font-mono font-bold flex flex-col items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <Phone className="w-4 h-4 text-[#D6AD62]" />
                <span>Call Studio</span>
              </a>
              <a
                href="mailto:hello@shiulicadstudio.com"
                className="py-2.5 px-2 rounded-xl bg-[#0F223D] border border-[#D6AD62]/40 text-[#E8D7B7] hover:border-[#D6AD62] text-[11px] font-mono font-bold flex flex-col items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <Mail className="w-4 h-4 text-[#D6AD62]" />
                <span>Email Us</span>
              </a>
            </div>

            {/* Social Icons row on mobile */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full border border-[#D6AD62]/30 flex items-center justify-center text-slate-300 hover:text-[#D6AD62] hover:border-[#D6AD62] hover:bg-[#D6AD62]/10 transition-all shadow-sm"
                title="Follow us on Instagram"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full border border-[#D6AD62]/30 flex items-center justify-center text-slate-300 hover:text-[#D6AD62] hover:border-[#D6AD62] hover:bg-[#D6AD62]/10 transition-all shadow-sm"
                title="Connect on LinkedIn"
              >
                <Linkedin className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full border border-[#D6AD62]/30 flex items-center justify-center text-slate-300 hover:text-[#D6AD62] hover:border-[#D6AD62] hover:bg-[#D6AD62]/10 transition-all shadow-sm"
                title="Shiuli CAD on Facebook"
              >
                <Facebook className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Accordion 1: Explore Studio */}
          <div className="rounded-2xl bg-[#0F223D]/60 border border-[#D6AD62]/30 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleMobileSection('explore')}
              className="w-full p-4 flex items-center justify-between text-left text-xs uppercase tracking-wider font-bold text-[#E8D7B7] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D6AD62]" />
                Explore Studio Links
              </span>
              {mobileSection === 'explore' ? (
                <ChevronUp className="w-4 h-4 text-[#D6AD62]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {mobileSection === 'explore' && (
              <div className="p-4 pt-1 border-t border-[#D6AD62]/20 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <button
                  onClick={() => onNavigate('collections')}
                  className="p-2.5 rounded-xl bg-[#0A1628]/80 hover:bg-[#D6AD62]/15 text-left transition-colors font-medium cursor-pointer"
                >
                  Collections
                </button>
                <button
                  onClick={() => onNavigate('custom-design')}
                  className="p-2.5 rounded-xl bg-[#0A1628]/80 hover:bg-[#D6AD62]/15 text-left transition-colors font-medium cursor-pointer"
                >
                  Custom CAD
                </button>
                <button
                  onClick={() => onNavigate('file-editing')}
                  className="p-2.5 rounded-xl bg-[#0A1628]/80 hover:bg-[#D6AD62]/15 text-left transition-colors font-medium cursor-pointer"
                >
                  File Editing
                </button>
                <button
                  onClick={() => onNavigate('how-it-works')}
                  className="p-2.5 rounded-xl bg-[#0A1628]/80 hover:bg-[#D6AD62]/15 text-left transition-colors font-medium cursor-pointer"
                >
                  Workflow
                </button>
                <button
                  onClick={() => onNavigate('gallery')}
                  className="p-2.5 rounded-xl bg-[#0A1628]/80 hover:bg-[#D6AD62]/15 text-left transition-colors font-medium cursor-pointer"
                >
                  Lookbook
                </button>
                <button
                  onClick={() => onNavigate('contact')}
                  className="p-2.5 rounded-xl bg-[#0A1628]/80 hover:bg-[#D6AD62]/15 text-left text-[#E8D7B7] font-bold transition-colors cursor-pointer"
                >
                  Contact Desk
                </button>
              </div>
            )}
          </div>

          {/* Accordion 2: Core Capabilities */}
          <div className="rounded-2xl bg-[#0F223D]/60 border border-[#D6AD62]/30 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleMobileSection('capabilities')}
              className="w-full p-4 flex items-center justify-between text-left text-xs uppercase tracking-wider font-bold text-[#E8D7B7] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-[#D6AD62]" />
                CAD Engineering Standards
              </span>
              {mobileSection === 'capabilities' ? (
                <ChevronUp className="w-4 h-4 text-[#D6AD62]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {mobileSection === 'capabilities' && (
              <div className="p-4 pt-1 border-t border-[#D6AD62]/20 space-y-2 text-xs text-slate-300">
                <div className="p-2 rounded-lg bg-[#0A1628]/70 flex items-start gap-2">
                  <span className="text-[#D6AD62] font-bold">•</span>
                  <span>Rhino 8 native .3DM parametric models</span>
                </div>
                <div className="p-2 rounded-lg bg-[#0A1628]/70 flex items-start gap-2">
                  <span className="text-[#D6AD62] font-bold">•</span>
                  <span>Watertight .STL casting meshes zero naked edges</span>
                </div>
                <div className="p-2 rounded-lg bg-[#0A1628]/70 flex items-start gap-2">
                  <span className="text-[#D6AD62] font-bold">•</span>
                  <span>Shrinkage calibrated for gold, platinum &amp; silver</span>
                </div>
                <div className="p-2 rounded-lg bg-[#0A1628]/70 flex items-start gap-2">
                  <span className="text-[#D6AD62] font-bold">•</span>
                  <span>Precision prong seating &amp; stone security validation</span>
                </div>
              </div>
            )}
          </div>

          {/* Accordion 3: Studio Location & Newsletter */}
          <div className="rounded-2xl bg-[#0F223D]/60 border border-[#D6AD62]/30 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleMobileSection('contact')}
              className="w-full p-4 flex items-center justify-between text-left text-xs uppercase tracking-wider font-bold text-[#E8D7B7] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D6AD62]" />
                Atelier Location &amp; Newsletter
              </span>
              {mobileSection === 'contact' ? (
                <ChevronUp className="w-4 h-4 text-[#D6AD62]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {mobileSection === 'contact' && (
              <div className="p-4 pt-1 border-t border-[#D6AD62]/20 space-y-3.5 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-[#0A1628]/80 border border-[#D6AD62]/20 space-y-1.5">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#D6AD62] block">
                    Headquarters
                  </span>
                  <p className="text-xs text-slate-300 leading-snug">
                    468/6, Chatrabhujdarshan Co-Op Soc, Manek Chowk, Sankadi Sheri, Opp. B.D. College, Ahmedabad - 380001, Gujarat, India
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#E8D7B7] block">
                    Subscribe for New STL Release Drops
                  </span>
                  {isSubscribed ? (
                    <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Subscribed! You will receive new STL catalog alerts.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSubscribe} className="flex items-center">
                      <input
                        type="email"
                        required
                        placeholder="jeweller@atelier.com"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-l-xl bg-[#0A1628] border border-[#D6AD62]/40 text-white placeholder-slate-400 focus:outline-hidden focus:border-[#D6AD62]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-[#D6AD62] hover:bg-[#E8D7B7] text-[#0A1628] rounded-r-xl text-xs font-bold transition-colors flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back-to-Top Button Row */}
        <div className="py-4 border-t border-[#D6AD62]/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] sm:text-xs">Atelier CAD Engine Online</span>
          </div>
          <button
            type="button"
            onClick={scrollToTop}
            className="px-3 py-1.5 rounded-xl bg-[#0F223D] border border-[#D6AD62]/40 text-[#E8D7B7] hover:border-[#D6AD62] text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <ArrowUp className="w-3.5 h-3.5 text-[#D6AD62]" />
            <span>Back to Top</span>
          </button>
        </div>

        {/* Bottom Copyright & Developer Bar */}
        <div className="pt-4 border-t border-[#D6AD62]/20 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-center md:text-left">
            <ShieldCheck className="w-4 h-4 text-[#D6AD62] shrink-0" />
            <span className="tracking-wide text-[11px] sm:text-xs">
              © 2026 SHIULI ALL RIGHTS RESERVED DEVELOPED BY{' '}
              <a
                href="https://technoadviser.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D6AD62] hover:text-[#E8D7B7] font-semibold underline underline-offset-2 transition-colors inline-flex items-center gap-1"
              >
                TECHNOADVISER
                <ExternalLink className="w-3 h-3 inline" />
              </a>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[10px] sm:text-[11px] text-slate-400">
            <button onClick={() => onNavigate('about')} className="hover:text-[#D6AD62] transition-colors cursor-pointer py-1">
              Terms of Service
            </button>
            <button onClick={() => onNavigate('contact')} className="hover:text-[#D6AD62] transition-colors cursor-pointer py-1">
              Privacy Policy
            </button>
            <button onClick={() => onNavigate('how-it-works')} className="hover:text-[#D6AD62] transition-colors cursor-pointer py-1">
              Casting &amp; Shrinkage Disclaimer
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
