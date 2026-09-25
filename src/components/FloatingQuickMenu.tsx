import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronUp,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Send,
  MessageSquare,
  ShoppingBag,
  Gem,
  Info,
  LayoutGrid,
  Briefcase,
} from 'lucide-react';
import { PageId } from '../types';

interface FloatingQuickMenuProps {
  onNavigate: (page: PageId) => void;
}

export const FloatingQuickMenu: React.FC<FloatingQuickMenuProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pulseRing, setPulseRing] = useState(true);

  // Track scroll position for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Disable initial pulse ring after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setPulseRing(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleQuickNav = (page: PageId) => {
    setIsOpen(false);
    onNavigate(page);
  };

  const quickLinks = [
    { label: 'About Us', icon: Info, page: 'about' as PageId, color: '#D4AF37' },
    { label: 'CAD Files', icon: ShoppingBag, page: 'collections' as PageId, color: '#7C9EFF' },
    { label: 'Categories', icon: LayoutGrid, page: 'collections' as PageId, color: '#F5A623' },
    { label: 'Custom Design', icon: Gem, page: 'custom-design' as PageId, color: '#E291FF' },
    { label: 'Portfolio', icon: Briefcase, page: 'portfolio' as PageId, color: '#6EE7B7' },
  ];

  return (
    <>
      {/* Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Quick Menu Panel */}
      <div
        className={`fixed bottom-20 sm:bottom-24 right-4 sm:right-5 z-[50] w-[calc(100vw-32px)] max-w-[340px] max-h-[calc(100vh-120px)] sm:max-h-[calc(100vh-140px)] overflow-y-auto transition-all duration-400 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-90 translate-y-6 pointer-events-none'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <div className="bg-[#080E24]/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl shadow-[0_20px_60px_rgba(212,175,55,0.15)] overflow-hidden">
          {/* Quick Navigation Grid */}
          <div className="p-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#F5E7A3] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#080E24]" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-[#F5E7A3]">
                  Quick Access
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#C9C2A6] hover:text-white transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {quickLinks.map((link, idx) => (
                <button
                  key={link.label}
                  onClick={() => handleQuickNav(link.page)}
                  className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-transparent hover:border-[#D4AF37]/20 transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    animationDelay: `${idx * 60}ms`,
                    animation: isOpen ? `fabSlideUp 0.35s ease-out ${idx * 60}ms both` : 'none',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: `${link.color}15`, border: `1px solid ${link.color}30` }}
                  >
                    <link.icon className="w-4.5 h-4.5" style={{ color: link.color, width: '18px', height: '18px' }} />
                  </div>
                  <span className="text-[10px] font-semibold text-[#C9C2A6] group-hover:text-[#FAF8F3] uppercase tracking-wider leading-tight text-center transition-colors">
                    {link.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="mx-4 mb-3">
            <div className="bg-gradient-to-r from-[#D4AF37]/10 to-[#F5E7A3]/5 rounded-xl p-4 border border-[#D4AF37]/20 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#F5E7A3] uppercase tracking-wider">Let's Talk</p>
                  <p className="text-[9px] text-[#C9C2A6]">We're here to help</p>
                </div>
              </div>

              {/* Phone */}
              <a
                href="tel:+919574787098"
                className="flex items-center gap-3 group hover:bg-white/5 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-3 h-3 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-emerald-400 font-semibold">Phone</p>
                  <p className="text-xs font-semibold text-[#FAF8F3] group-hover:text-[#F5E7A3] transition-colors">
                    +91 95747 87098
                  </p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:hello@shiulicadstudio.com"
                className="flex items-center gap-3 group hover:bg-white/5 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-3 h-3 text-blue-400" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-blue-400 font-semibold">Email</p>
                  <p className="text-xs font-semibold text-[#FAF8F3] group-hover:text-[#F5E7A3] transition-colors">
                    hello@shiulicadstudio.com
                  </p>
                </div>
              </a>

              {/* Location */}
              <div className="flex items-start gap-3 px-2 py-1.5 -mx-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3 h-3 text-amber-400" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-amber-400 font-semibold">Studio</p>
                  <p className="text-[11px] text-[#C9C2A6] leading-relaxed">
                    468/6, Manek Chowk, Ahmedabad 1, Gujarat
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4 space-y-2">
            <button
              onClick={() => handleQuickNav('contact')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] hover:from-[#E5C04B] hover:to-[#FFF3C4] text-[#080E24] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              Send Inquiry Now
            </button>

            <a
              href="https://wa.me/919574787098?text=Hello%20Shiuli%20CAD%20Studio%2C%20I%20have%20an%20inquiry%20regarding%20jewellery%20CAD%20files."
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/25 text-emerald-300 font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat on WhatsApp
            </a>

            <button
              onClick={() => handleQuickNav('contact')}
              className="w-full py-2 rounded-lg text-[#C9C2A6] hover:text-[#FAF8F3] text-[10px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              Full Contact Form & Map →
            </button>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed right-5 sm:right-6 z-[42] w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#080E24]/90 border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#0D1540] flex items-center justify-center text-[#D4AF37] shadow-lg shadow-black/30 transition-all duration-500 hover:scale-110 group ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ bottom: isOpen ? '76px' : '76px' }}
        title="Scroll to top"
        aria-label="Scroll to top"
      >
        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 group-hover:animate-bounce transition-transform" />
      </button>

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[50] w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(212,175,55,0.35)] transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen
            ? 'bg-[#080E24] border-2 border-[#D4AF37]/60 rotate-0'
            : 'bg-gradient-to-br from-[#D4AF37] to-[#C49B28] border-2 border-[#F5E7A3]/30 rotate-0'
        }`}
        title={isOpen ? 'Close quick menu' : 'Open quick menu'}
        aria-label={isOpen ? 'Close quick menu' : 'Open quick menu'}
      >
        {/* Ping Ring (only when closed and pulseRing active) */}
        {!isOpen && pulseRing && (
          <span className="absolute inset-0 rounded-full">
            <span className="absolute inset-0 rounded-full border-2 border-[#D4AF37] animate-ping opacity-50" />
          </span>
        )}

        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-[135deg]' : 'rotate-0'}`}>
          {isOpen ? (
            <X className="w-6 h-6 text-[#D4AF37]" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#080E24]">
              {/* Custom diamond/grid icon */}
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
            </svg>
          )}
        </div>
      </button>

      {/* Keyframe Styles */}
      <style>{`
        @keyframes fabSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};
