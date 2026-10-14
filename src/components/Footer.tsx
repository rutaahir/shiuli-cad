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
  ExternalLink
} from 'lucide-react';

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setIsSubscribed(true);
      setTimeout(() => setIsSubscribed(false), 5000);
      setNewsletterEmail('');
    }
  };

  return (
    <footer className="relative bg-[#0A1628] text-slate-200 overflow-hidden border-t border-[#D6AD62]/30">
      {/* Animated Light Glow beam on top border */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D6AD62] to-transparent opacity-90" />

      {/* Subtle luxury ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-64 bg-[#17345C]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-[#D6AD62]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full px-3 sm:px-6 lg:px-20 xl:px-28 pt-16 pb-12 relative z-10">
        {/* Main 4-Column Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          {/* Column 1: Brand & Manifesto */}
          <div className="space-y-4">
            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#FFFDF9]/85 backdrop-blur-md border border-[#D6AD62]/40 shadow-sm hover:bg-[#FFFDF9]/95 transition-all">
              <BrandLogo variant="horizontal" size="md" theme="light" />
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              Where imagination becomes fine jewellery. Delivering production-tested Rhino .3DM files and watertight .STL meshes for high jewellery ateliers and global manufacturers.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs tracking-widest text-[#D6AD62] uppercase font-semibold">
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
                <button onClick={() => onNavigate('collections')} className="hover:text-[#D6AD62] transition-colors cursor-pointer">
                  Ready CAD Collections
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('custom-design')} className="hover:text-[#D6AD62] transition-colors cursor-pointer">
                  Custom Design Request
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-it-works')} className="hover:text-[#D6AD62] transition-colors cursor-pointer">
                  Ordering &amp; Delivery Workflow
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('gallery')} className="hover:text-[#D6AD62] transition-colors cursor-pointer">
                  Lookbook &amp; Render Gallery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-[#D6AD62] transition-colors cursor-pointer">
                  About Our Master Modelers
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors font-semibold text-[#E8D7B7] cursor-pointer">
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
                <span className="leading-snug">468/6, CHATRABHUJDARSHAN CO OP H.SOC, MANEK CHOWK, SANKADI SHERI, OPP B.D.COLLEGE, AHMEDABAD 1</span>
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

        {/* Bottom Copyright & Developer Bar */}
        <div className="pt-8 border-t border-[#D6AD62]/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-center md:text-left">
            <ShieldCheck className="w-4 h-4 text-[#D6AD62] shrink-0" />
            <span className="tracking-wide">
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

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-400">
            <button onClick={() => onNavigate('about')} className="hover:text-[#D6AD62] transition-colors cursor-pointer">
              Terms of Service
            </button>
            <button onClick={() => onNavigate('contact')} className="hover:text-[#D6AD62] transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <button onClick={() => onNavigate('how-it-works')} className="hover:text-[#D6AD62] transition-colors cursor-pointer">
              Casting &amp; Shrinkage Disclaimer
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

