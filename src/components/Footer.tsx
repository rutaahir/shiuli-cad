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
  Sparkles 
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
    <footer className="relative bg-[#070D22] text-[#F5F1E8] overflow-hidden border-t border-[#D4AF37]/20">
      {/* Animated Light Glow beam on top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-60 animate-pulse" />

      {/* Decorative subtle ribbon watermark in background */}
      <div className="absolute -right-20 -bottom-20 w-96 h-96 opacity-5 pointer-events-none">
        <BrandLogo variant="mark-only" size="xl" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 pt-16 pb-12">
        {/* Main 4-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          {/* Column 1: Brand & Manifesto */}
          <div className="space-y-4">
            <BrandLogo variant="horizontal" size="md" />
            <p className="text-sm text-[#C9C2A6] leading-relaxed font-light">
              Where imagination becomes fine jewellery. Delivering production-tested Rhino .3DM files and watertight .STL meshes for high jewellery ateliers and global manufacturers.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs tracking-widest text-[#D4AF37] uppercase font-semibold">
              <span>CAD</span>
              <span>•</span>
              <span>3D</span>
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
                className="w-8 h-8 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-[#C9C2A6] hover:text-[#D4AF37] hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all"
                title="Follow us on Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-[#C9C2A6] hover:text-[#D4AF37] hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all"
                title="Connect on LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-[#C9C2A6] hover:text-[#D4AF37] hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all"
                title="Shiuli CAD on Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Studio Services */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#F5E7A3] font-semibold mb-4 flex items-center gap-2">
              <FileCode2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              Core Capabilities
            </h4>
            <ul className="space-y-2.5 text-sm text-[#C9C2A6]">
              <li className="flex items-start gap-2 hover:text-[#FAF8F3] transition-colors">
                <span className="text-[#D4AF37] mt-1">•</span>
                <span>3D Jewellery Modelling & CAD Design</span>
              </li>
              <li className="flex items-start gap-2 hover:text-[#FAF8F3] transition-colors">
                <span className="text-[#D4AF37] mt-1">•</span>
                <span>High-Precision STL Files for Casting</span>
              </li>
              <li className="flex items-start gap-2 hover:text-[#FAF8F3] transition-colors">
                <span className="text-[#D4AF37] mt-1">•</span>
                <span>Physically Based 4K Rendering & Turnaround</span>
              </li>
              <li className="flex items-start gap-2 hover:text-[#FAF8F3] transition-colors">
                <span className="text-[#D4AF37] mt-1">•</span>
                <span>Bespoke Custom Jewellery Requisition</span>
              </li>
              <li className="flex items-start gap-2 hover:text-[#FAF8F3] transition-colors">
                <span className="text-[#D4AF37] mt-1">•</span>
                <span>Shrinkage Calibration & Mesh Optimization</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Quick Navigation */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#F5E7A3] font-semibold mb-4">
              Explore Studio
            </h4>
            <ul className="space-y-2 text-sm text-[#C9C2A6]">
              <li>
                <button onClick={() => onNavigate('collections')} className="hover:text-[#D4AF37] transition-colors">
                  Ready CAD Collections
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('custom-design')} className="hover:text-[#D4AF37] transition-colors">
                  Custom Design Request
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-it-works')} className="hover:text-[#D4AF37] transition-colors">
                  Ordering & Delivery Workflow
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('gallery')} className="hover:text-[#D4AF37] transition-colors">
                  Lookbook & Render Gallery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-[#D4AF37] transition-colors">
                  About Our Master Modelers
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-[#D4AF37] transition-colors font-semibold text-[#F5E7A3]">
                  Contact Us / Studio Access
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('blog')} className="hover:text-[#D4AF37] transition-colors">
                  Jewellery CAD Insights & Guides
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Newsletter */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#F5E7A3] font-semibold mb-4">
              Direct Contact
            </h4>
            <div className="space-y-2.5 text-sm text-[#C9C2A6]">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#D4AF37]" />
                <a href="tel:+919662159084" className="hover:text-[#FAF8F3] transition-colors">
                  +91 9662159084
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#D4AF37]" />
                <a href="mailto:info@shiulicadstudio.com" className="hover:text-[#FAF8F3] transition-colors">
                  info@shiulicadstudio.com
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                <span>Diamond & Jewellery Hub, Surat / Mumbai, India</span>
              </div>
            </div>

            {/* Newsletter Subscription */}
            <div className="pt-2">
              <p className="text-xs text-[#FAF8F3] mb-2 font-medium">
                Subscribe for New CAD Release Drops
              </p>
              {isSubscribed ? (
                <div className="flex items-center gap-2 p-2 bg-emerald-950/70 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
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
                    className="w-full px-3 py-2 text-xs rounded-l-lg bg-[#0B1330] border border-[#D4AF37]/30 text-[#FAF8F3] placeholder-[#C9C2A6]/50 focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#D4AF37] hover:bg-[#F5E7A3] text-[#0B1330] rounded-r-lg text-xs font-semibold transition-colors flex items-center justify-center"
                    title="Subscribe"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#D4AF37]/15 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#C9C2A6]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>© {new Date().getFullYear()} Shiuli CAD Studio. All Rights Reserved. Precision Jewellers CAD House.</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('about')} className="hover:text-[#D4AF37] transition-colors">
              Terms of CAD Licensing
            </button>
            <button onClick={() => onNavigate('contact')} className="hover:text-[#D4AF37] transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => onNavigate('how-it-works')} className="hover:text-[#D4AF37] transition-colors">
              Casting & Shrinkage Disclaimer
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
