import React from 'react';
import { Award, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';

interface WaxSealStampProps {
  active: boolean;
  title?: string;
  subtitle?: string;
  badgeText?: string;
  onClose?: () => void;
}

export const WaxSealStamp: React.FC<WaxSealStampProps> = ({
  active,
  title = "SEAL OF ASSIGNMENT",
  subtitle = "Secured & Stamped onto Your Workbench",
  badgeText = "SHIULI CAD ATELIER",
  onClose,
}) => {
  if (!active) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative flex flex-col items-center justify-center p-8 max-w-md w-full text-center transform transition-all duration-500 scale-100 animate-bounceIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow halo behind wax seal */}
        <div className="absolute w-80 h-80 rounded-full bg-[#D4AF37]/25 blur-3xl animate-pulse pointer-events-none" />

        {/* Animated Gold Wax Seal Stamp Disc */}
        <div className="relative mb-6 group cursor-pointer" onClick={onClose}>
          {/* Outer wavy wax edge simulation */}
          <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-[#785304] via-[#D4AF37] to-[#FFF2B2] p-[6px] shadow-[0_0_60px_rgba(212,175,55,0.7)] transform hover:scale-105 transition-transform duration-300">
            {/* Inner pressed wax texture */}
            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#09112B] via-[#122254] to-[#050A1A] border-4 border-[#D4AF37]/80 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
              
              {/* Radial wax ring effect */}
              <div className="absolute inset-2 border border-[#D4AF37]/40 rounded-full pointer-events-none" />
              <div className="absolute inset-4 border border-dashed border-[#F5E7A3]/30 rounded-full pointer-events-none animate-spin-slow" />

              {/* Center Seal Emblem */}
              <div className="relative z-10 flex flex-col items-center justify-center text-[#F5E7A3]">
                <div className="p-3.5 rounded-full bg-gradient-to-tr from-[#D4AF37]/40 to-[#F5E7A3]/20 border border-[#D4AF37]/60 mb-1 shadow-xl">
                  <Award className="w-11 h-11 text-[#F5E7A3] drop-shadow-[0_2px_10px_rgba(255,215,0,0.9)]" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.25em] font-serif text-[#F5E7A3] font-bold">
                  {badgeText}
                </span>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-[#D4AF37] font-mono tracking-widest">
                  <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
                  <span>VERIFIED</span>
                </div>
              </div>

              {/* Metallic highlight streak */}
              <div className="absolute -top-10 -left-10 w-28 h-56 bg-white/20 rotate-45 blur-sm pointer-events-none" />
            </div>
          </div>

          {/* Floating sparkling stars */}
          <Sparkles className="absolute -top-2 -right-2 w-9 h-9 text-[#F5E7A3] animate-spin-slow" />
          <Sparkles className="absolute -bottom-1 -left-2 w-7 h-7 text-[#D4AF37] animate-pulse" />
        </div>

        {/* Text Container */}
        <div className="space-y-3 bg-[#09112B] border-2 border-[#D4AF37]/50 p-6 rounded-3xl shadow-2xl backdrop-blur-xl max-w-sm w-full text-white">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F5E7A3] text-xs font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Official Stamp Applied</span>
          </div>
          
          <h3 className="text-xl font-serif font-bold text-white tracking-wide">
            {title}
          </h3>
          
          <p className="text-xs text-[#C9C2A6] leading-relaxed font-sans">
            {subtitle}
          </p>

          <button
            onClick={onClose}
            className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E7A3] to-[#AA820A] hover:brightness-110 text-[#0B1330] font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#D4AF37]/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 w-full"
          >
            Continue to Atelier
          </button>
        </div>
      </div>
    </div>
  );
};
