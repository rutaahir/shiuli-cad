import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronUp,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Send,
  ShoppingBag,
  Gem,
  Info,
  LayoutGrid,
  Folder,
  ChevronRight,
  ArrowRight,
  Headphones,
} from 'lucide-react';
import { PageId } from '../types';

interface FloatingQuickMenuProps {
  onNavigate: (page: PageId) => void;
  currentPage?: PageId;
}

export const FloatingQuickMenu: React.FC<FloatingQuickMenuProps> = ({ onNavigate, currentPage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pulseRing, setPulseRing] = useState(true);

  // Check if user is on Custom Design page
  const isCustomDesignPage =
    currentPage === 'custom-design' ||
    (typeof window !== 'undefined' && (
      window.location.pathname.includes('custom-design') ||
      window.location.pathname.includes('custom_design')
    ));

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

  return (
    <>
      {/* Quick Menu Backdrop & Panel (Only on non-custom-design pages) */}
      {!isCustomDesignPage && (
        <>
          {/* Overlay Backdrop */}
          {isOpen && (
            <div
              className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Quick Menu Panel */}
          <div
            className={`fixed bottom-16 sm:bottom-24 right-2 sm:right-6 z-[50] w-[calc(100vw-16px)] max-w-[335px] sm:max-w-[365px] max-h-[calc(100dvh-70px)] sm:max-h-[calc(100vh-100px)] overflow-y-auto no-scrollbar transition-all duration-400 origin-bottom-right ${
              isOpen
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 scale-90 translate-y-6 pointer-events-none'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {/* LUXURY GOLD/CHAMPAGNE GLASS CONTAINER */}
            <div className="relative rounded-[26px] sm:rounded-[34px] bg-gradient-to-b from-[#FFFDF9] via-[#FAF3E4] to-[#F5E8D0] border-2 border-[#E7CE97] shadow-[0_20px_60px_rgba(180,140,50,0.28),0_6px_20px_rgba(0,0,0,0.06)] overflow-hidden p-3 sm:p-5 select-none">
              
              {/* Decorative Golden Ribbon Curves (Top-right & bottom-left flourishes) */}
              <div className="absolute top-0 right-0 w-32 sm:w-36 h-32 sm:h-36 bg-[radial-gradient(circle_at_top_right,rgba(224,179,84,0.32)_0%,transparent_70%)] pointer-events-none rounded-tr-[26px] sm:rounded-tr-[34px]" />
              <div className="absolute bottom-0 left-0 w-28 sm:w-32 h-28 sm:h-32 bg-[radial-gradient(circle_at_bottom_left,rgba(224,179,84,0.22)_0%,transparent_70%)] pointer-events-none rounded-bl-[26px] sm:rounded-bl-[34px]" />

              {/* TOP BAR: Sparkle Badge + QUICK ACCESS Title + Close Button */}
              <div className="relative z-10 flex items-center justify-between mb-2 sm:mb-3.5">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#F6DC94] via-[#DEAC3E] to-[#B37E1C] p-0.5 shadow-[0_3px_10px_rgba(200,150,40,0.35)] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-xs" />
                  </div>
                  <h2 className="font-serif font-bold text-sm sm:text-lg text-[#0F264A] tracking-wider uppercase">
                    Quick Access
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/80 hover:bg-white border border-[#E5D2B0] flex items-center justify-center text-[#6B5A3E] hover:text-[#0F264A] shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  aria-label="Close Quick Access Menu"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                </button>
              </div>

              {/* ROW 1: 3 OPTION CARDS (ABOUT US | CAD FILES | CATEGORIES) */}
              <div className="relative z-10 grid grid-cols-3 gap-1.5 sm:gap-2.5">
                {/* 1. About Us */}
                <button
                  type="button"
                  onClick={() => handleQuickNav('about')}
                  className="group relative rounded-xl sm:rounded-2xl bg-gradient-to-b from-white via-[#FCF9F2] to-[#F7EFE0] border border-[#EADAC0] hover:border-[#D4AF37] p-2 sm:p-3 flex flex-col items-center justify-between text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(214,175,70,0.2)] cursor-pointer"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#FFFDF9] to-[#F5EAD4] border border-[#DEC9A6] flex items-center justify-center text-[#0F264A] group-hover:text-[#B88726] transition-colors mb-0.5 sm:mb-1 shadow-2xs shrink-0">
                    <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                  </div>
                  <span className="font-serif font-bold text-[9px] sm:text-[11px] text-[#0F264A] group-hover:text-[#B88726] tracking-wider uppercase leading-tight my-0.5">
                    About Us
                  </span>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-[#D6AD62]/80 bg-white/90 group-hover:bg-[#D6AD62] group-hover:border-[#D6AD62] text-[#B88726] group-hover:text-white flex items-center justify-center transition-all mt-0.5 sm:mt-1">
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                  </div>
                </button>

                {/* 2. CAD Files */}
                <button
                  type="button"
                  onClick={() => handleQuickNav('collections')}
                  className="group relative rounded-xl sm:rounded-2xl bg-gradient-to-b from-white via-[#FCF9F2] to-[#F7EFE0] border border-[#EADAC0] hover:border-[#D4AF37] p-2 sm:p-3 flex flex-col items-center justify-between text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(214,175,70,0.2)] cursor-pointer"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#FFFDF9] to-[#F5EAD4] border border-[#DEC9A6] flex items-center justify-center text-[#0F264A] group-hover:text-[#B88726] transition-colors mb-0.5 sm:mb-1 shadow-2xs shrink-0">
                    <Folder className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                  </div>
                  <span className="font-serif font-bold text-[9px] sm:text-[11px] text-[#0F264A] group-hover:text-[#B88726] tracking-wider uppercase leading-tight my-0.5">
                    CAD Files
                  </span>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-[#D6AD62]/80 bg-white/90 group-hover:bg-[#D6AD62] group-hover:border-[#D6AD62] text-[#B88726] group-hover:text-white flex items-center justify-center transition-all mt-0.5 sm:mt-1">
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                  </div>
                </button>

                {/* 3. Categories */}
                <button
                  type="button"
                  onClick={() => handleQuickNav('collections')}
                  className="group relative rounded-xl sm:rounded-2xl bg-gradient-to-b from-white via-[#FCF9F2] to-[#F7EFE0] border border-[#EADAC0] hover:border-[#D4AF37] p-2 sm:p-3 flex flex-col items-center justify-between text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(214,175,70,0.2)] cursor-pointer"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#FFFDF9] to-[#F5EAD4] border border-[#DEC9A6] flex items-center justify-center text-[#0F264A] group-hover:text-[#B88726] transition-colors mb-0.5 sm:mb-1 shadow-2xs shrink-0">
                    <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                  </div>
                  <span className="font-serif font-bold text-[9px] sm:text-[11px] text-[#0F264A] group-hover:text-[#B88726] tracking-wider uppercase leading-tight my-0.5">
                    Categories
                  </span>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-[#D6AD62]/80 bg-white/90 group-hover:bg-[#D6AD62] group-hover:border-[#D6AD62] text-[#B88726] group-hover:text-white flex items-center justify-center transition-all mt-0.5 sm:mt-1">
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                  </div>
                </button>
              </div>

              {/* ROW 2: 2 WIDER CARDS (CUSTOM DESIGN | PORTFOLIO) */}
              <div className="relative z-10 grid grid-cols-2 gap-1.5 sm:gap-2.5 mt-1.5 sm:mt-2">
                {/* 1. Custom Design (with faint diamond sketch) */}
                <button
                  type="button"
                  onClick={() => handleQuickNav('custom-design')}
                  className="group relative rounded-xl sm:rounded-2xl bg-gradient-to-b from-white via-[#FCF9F2] to-[#F7EFE0] border border-[#EADAC0] hover:border-[#D4AF37] p-2 sm:p-3 overflow-hidden flex items-center justify-between text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(214,175,70,0.2)] cursor-pointer min-h-[58px] sm:min-h-[76px]"
                >
                  {/* Faint diamond sketch background artwork */}
                  <img
                    src="/assets/redesign/qa_sketch_custom.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 w-14 h-14 sm:w-20 sm:h-20 object-contain opacity-55 pointer-events-none transition-transform duration-300 group-hover:scale-105"
                  />

                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#FFFDF9] to-[#F5EAD4] border border-[#DEC9A6] flex items-center justify-center text-[#0F264A] group-hover:text-[#B88726] transition-colors mb-0.5 sm:mb-1 shadow-2xs shrink-0">
                      <Gem className="w-3 h-3 sm:w-4 sm:h-4 stroke-[2.2]" />
                    </div>
                    <span className="font-serif font-bold text-[9px] sm:text-[11px] text-[#0F264A] group-hover:text-[#B88726] tracking-wider uppercase leading-tight">
                      Custom<br />Design
                    </span>
                  </div>

                  <div className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-[#D6AD62]/80 bg-white/90 group-hover:bg-[#D6AD62] group-hover:border-[#D6AD62] text-[#B88726] group-hover:text-white flex items-center justify-center transition-all self-end mb-0.5 shrink-0 ml-1">
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                  </div>
                </button>

                {/* 2. Portfolio (with 3D Gold Ring Render) */}
                <button
                  type="button"
                  onClick={() => handleQuickNav('portfolio')}
                  className="group relative rounded-xl sm:rounded-2xl bg-gradient-to-b from-white via-[#FCF9F2] to-[#F7EFE0] border border-[#EADAC0] hover:border-[#D4AF37] p-2 sm:p-3 overflow-hidden flex items-center justify-between text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(214,175,70,0.2)] cursor-pointer min-h-[58px] sm:min-h-[76px]"
                >
                  {/* 3D Ring Render Artwork */}
                  <img
                    src="/assets/redesign/qa_ring_portfolio.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 w-12 sm:w-16 h-auto object-contain pointer-events-none transition-transform duration-300 group-hover:scale-110 drop-shadow-xs"
                  />

                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#FFFDF9] to-[#F5EAD4] border border-[#DEC9A6] flex items-center justify-center text-[#0F264A] group-hover:text-[#B88726] transition-colors mb-0.5 sm:mb-1 shadow-2xs shrink-0">
                      <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 stroke-[2.2]" />
                    </div>
                    <span className="font-serif font-bold text-[9px] sm:text-[11px] text-[#0F264A] group-hover:text-[#B88726] tracking-wider uppercase leading-tight">
                      Portfolio
                    </span>
                  </div>

                  <div className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-[#D6AD62]/80 bg-white/90 group-hover:bg-[#D6AD62] group-hover:border-[#D6AD62] text-[#B88726] group-hover:text-white flex items-center justify-center transition-all self-end mb-0.5 shrink-0 ml-1">
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                  </div>
                </button>
              </div>

              {/* ROW 3: CONTACT CARD ("LET'S TALK") */}
              <div className="relative z-10 rounded-xl sm:rounded-3xl bg-gradient-to-br from-white via-[#FBF7EE] to-[#F6ECD8] border border-[#E8D7B8] p-2.5 sm:p-4 mt-2 sm:mt-2.5 overflow-hidden shadow-xs">
                
                {/* 3D Diamond Engagement Ring Artwork + Gold Ribbon Corner Flourish */}
                <img
                  src="/assets/redesign/qa_ring_letstalk.png"
                  alt=""
                  aria-hidden="true"
                  className="absolute right-0 -top-1 w-20 sm:w-28 h-auto object-contain pointer-events-none drop-shadow-sm z-0"
                />
                <div className="absolute top-0 right-0 w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-bl from-[#D9A83E] via-[#F4D98C] to-transparent rounded-tr-xl sm:rounded-tr-2xl pointer-events-none opacity-80" />

                {/* Header: Badge + LET'S TALK + We're here to help */}
                <div className="relative z-10 flex items-start gap-2 sm:gap-2.5 mb-1.5 sm:mb-2.5">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#EBBF5E] via-[#DEAC3E] to-[#B88726] p-1 flex items-center justify-center text-white shadow-2xs shrink-0 mt-0.5">
                    <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-[11px] sm:text-[13px] text-[#0F264A] tracking-wider uppercase leading-tight">
                      Let's Talk
                    </h3>
                    <p className="text-[8.5px] sm:text-[10px] text-[#697A91] leading-tight">
                      We're here to help
                    </p>
                    <div className="w-8 sm:w-10 h-0.5 bg-[#D6AD62] mt-0.5 sm:mt-1" />
                  </div>
                </div>

                {/* Contact Rows: Phone, Email, Studio */}
                <div className="relative z-10 space-y-1 sm:space-y-2 pt-1 border-t border-[#EEDFCA]/80 max-w-[70%] sm:max-w-[72%]">
                  {/* Phone */}
                  <a
                    href="tel:+919574787098"
                    className="flex items-center gap-1.5 sm:gap-2 group transition-colors"
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#FFF9ED] border border-[#DFCBAA] flex items-center justify-center text-[#B88726] group-hover:bg-[#B88726] group-hover:text-white transition-all shrink-0">
                      <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[7.5px] sm:text-[9px] font-bold text-[#A67823] uppercase tracking-wider leading-none">
                        Phone
                      </span>
                      <span className="block text-[10px] sm:text-xs font-bold text-[#0F264A] group-hover:text-[#B88726] transition-colors leading-tight truncate">
                        +91 95747 87098
                      </span>
                    </div>
                  </a>

                  {/* Email */}
                  <a
                    href="mailto:hello@shiulicadstudio.com"
                    className="flex items-center gap-1.5 sm:gap-2 group transition-colors"
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#FFF9ED] border border-[#DFCBAA] flex items-center justify-center text-[#B88726] group-hover:bg-[#B88726] group-hover:text-white transition-all shrink-0">
                      <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[7.5px] sm:text-[9px] font-bold text-[#A67823] uppercase tracking-wider leading-none">
                        Email
                      </span>
                      <span className="block text-[9.5px] sm:text-[11px] font-bold text-[#0F264A] group-hover:text-[#B88726] transition-colors leading-tight truncate">
                        hello@shiulicadstudio.com
                      </span>
                    </div>
                  </a>

                  {/* Studio */}
                  <div className="flex items-start gap-1.5 sm:gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#FFF9ED] border border-[#DFCBAA] flex items-center justify-center text-[#B88726] shrink-0 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[7.5px] sm:text-[9px] font-bold text-[#A67823] uppercase tracking-wider leading-none">
                        Studio
                      </span>
                      <span className="block text-[8.5px] sm:text-[10px] font-medium text-[#0F264A] leading-tight line-clamp-1 sm:line-clamp-none">
                        468/6, Manek Chowk, Ahmedabad 1, Gujarat
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 4: ACTION BUTTONS */}
              <div className="relative z-10 mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                {/* 1. SEND INQUIRY NOW (Metallic Gold Gradient) */}
                <button
                  type="button"
                  onClick={() => handleQuickNav('contact')}
                  className="w-full py-2 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#DFB35A] via-[#ECC976] to-[#C99834] hover:from-[#E6BC64] hover:to-[#D4A33F] text-[#0C2340] font-serif font-bold text-[11px] sm:text-[13px] uppercase tracking-wider flex items-center justify-between shadow-[0_4px_16px_rgba(209,161,54,0.32)] transition-all hover:-translate-y-0.5 active:scale-[0.98] border border-[#FFF0BA] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                  <span>Send Inquiry Now</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </button>

                {/* 2. CHAT ON WHATSAPP (Luxury Emerald/Mint Gradient) */}
                <a
                  href="https://wa.me/919574787098?text=Hello%20Shiuli%20CAD%20Studio%2C%20I%20have%20an%20inquiry%20regarding%20jewellery%20CAD%20files."
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#F0FBF5] via-[#E2F7EB] to-[#F0FBF5] hover:bg-[#D7F5E3] border border-[#25D366]/60 text-[#14532D] font-serif font-bold text-[11px] sm:text-[13px] uppercase tracking-wider flex items-center justify-between shadow-[0_3px_12px_rgba(37,211,102,0.12)] transition-all hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                >
                  {/* Vibrant WhatsApp Icon */}
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#25D366]" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.159.57 4.185 1.564 5.939l-1.564 5.889 6.088-1.597c1.705.936 3.659 1.471 5.742 1.471 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span>Chat on WhatsApp</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </a>

                {/* 3. Full Contact Form & Map Link */}
                <button
                  type="button"
                  onClick={() => handleQuickNav('contact')}
                  className="w-full pt-0.5 text-center text-[9.5px] sm:text-[11px] font-serif font-bold text-[#0F264A] hover:text-[#B88726] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Full Contact Form &amp; Map →</span>
                </button>

                {/* Bottom Diamond Ornament */}
                <div className="flex items-center justify-center gap-2 text-[#D6AD62] pt-0.5">
                  <span className="w-6 sm:w-8 h-px bg-[#DEC9A6]" />
                  <span className="text-[9px] sm:text-[10px]">❖</span>
                  <span className="w-6 sm:w-8 h-px bg-[#DEC9A6]" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Action Controls Dock (Bottom Right) */}
      <div className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 z-[50] flex flex-col items-center gap-2.5 sm:gap-3 pointer-events-none">
        {/* Scroll to Top Button */}
        {showScrollTop && !isOpen && (
          <button
            onClick={scrollToTop}
            className="pointer-events-auto w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#FFFDF9] border border-[#DEC9A6] hover:border-[#D4AF37] hover:bg-[#FFF9ED] flex items-center justify-center text-[#B88726] shadow-md shadow-[#D4AF37]/20 transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer animate-in fade-in zoom-in-75 duration-200"
            title="Scroll to top"
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-0.5 transition-transform stroke-[2.5]" />
          </button>
        )}

        {/* Main Floating Action Button (FAB) */}
        {isCustomDesignPage ? (
          <a
            href="https://wa.me/919574787098?text=Hello%20Shiuli%20CAD%20Studio%2C%20I%20have%20an%20inquiry%20regarding%20custom%20jewellery%20CAD%20design."
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs sm:text-sm shadow-[0_10px_35px_rgba(37,211,102,0.45)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group"
            title="Chat with us on WhatsApp"
          >
            <div className="relative flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.159.57 4.185 1.564 5.939l-1.564 5.889 6.088-1.597c1.705.936 3.659 1.471 5.742 1.471 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping opacity-75" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-200 rounded-full" />
            </div>
            <span className="tracking-wide">Chat with Us</span>
          </a>
        ) : (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`pointer-events-auto w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-[0_10px_35px_rgba(212,175,55,0.45)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
              isOpen
                ? 'bg-[#FFFDF9] border-2 border-[#D6AD62] text-[#0F264A]'
                : 'bg-gradient-to-br from-[#F5D888] via-[#DEAC3E] to-[#B37E1C] border-2 border-white/80 text-white'
            }`}
            title={isOpen ? 'Close quick menu' : 'Open quick menu'}
            aria-label={isOpen ? 'Close quick menu' : 'Open quick menu'}
          >
            {/* Ping Ring (only when closed and pulseRing active) */}
            {!isOpen && pulseRing && (
              <span className="absolute inset-0 rounded-full pointer-events-none">
                <span className="absolute inset-0 rounded-full border-2 border-[#D4AF37] animate-ping opacity-50" />
              </span>
            )}

            <div className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`}>
              {isOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-[#0F264A]" />
              ) : (
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" />
              )}
            </div>
          </button>
        )}
      </div>
    </>
  );
};
