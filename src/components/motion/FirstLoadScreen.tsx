import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface FirstLoadScreenProps {
  onComplete?: () => void;
}

export const FirstLoadScreen: React.FC<FirstLoadScreenProps> = ({ onComplete }) => {
  const [shouldShow, setShouldShow] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Session storage check — only show once per hard refresh / first visit
    const hasLoaded = sessionStorage.getItem('shiuli_first_load_done');
    if (!hasLoaded) {
      setShouldShow(true);
      sessionStorage.setItem('shiuli_first_load_done', 'true');
    } else {
      setShouldShow(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldShow) return;

    // Total duration: ~1.4s, then fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, prefersReducedMotion ? 400 : 1450);

    return () => clearTimeout(timer);
  }, [shouldShow, prefersReducedMotion, onComplete]);

  if (!shouldShow || !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="first-load-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
          className="fixed inset-0 z-[9999] bg-[#0D1B4C] flex flex-col items-center justify-center text-center select-none overflow-hidden"
        >
          {/* Subtle Ambient Gold Glow Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Animated SVG Ribbon Logo */}
          <div className="relative w-36 h-36 mb-6">
            <svg
              viewBox="0 0 200 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-[0_8px_24px_rgba(212,175,55,0.4)]"
            >
              <defs>
                <linearGradient id="goldTopGrad" x1="50" y1="20" x2="140" y2="130" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFF2B2" />
                  <stop offset="50%" stopColor="#E2B743" />
                  <stop offset="100%" stopColor="#785304" />
                </linearGradient>

                <linearGradient id="sapphireGrad" x1="80" y1="100" x2="160" y2="220" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7EACFC" />
                  <stop offset="50%" stopColor="#306EE8" />
                  <stop offset="100%" stopColor="#0B1C47" />
                </linearGradient>
              </defs>

              {/* Sapphire Loop Stroke Line Draw */}
              <motion.path
                d="M 94 95 C 122 92, 150 108, 160 134 C 172 165, 154 185, 126 195 C 102 203, 85 220, 72 235 C 70 237, 72 232, 75 224 C 88 190, 110 168, 138 152 C 148 146, 150 132, 142 122 C 132 110, 114 104, 94 95 Z"
                fill="url(#sapphireGrad)"
                stroke="#7EACFC"
                strokeWidth={prefersReducedMotion ? 0 : 2}
                initial={{ pathLength: 0, opacity: 0, fillOpacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: 1,
                  fillOpacity: prefersReducedMotion ? 1 : [0, 0, 1],
                }}
                transition={{
                  pathLength: { duration: prefersReducedMotion ? 0 : 0.85, ease: 'easeInOut' },
                  fillOpacity: { delay: prefersReducedMotion ? 0 : 0.75, duration: 0.3 },
                }}
              />

              {/* Gold Swirl Stroke Line Draw */}
              <motion.path
                d="M 134 22 C 126 36, 102 60, 74 72 C 48 84, 42 104, 46 128 C 50 150, 68 168, 92 170 C 114 172, 124 162, 120 152 C 114 140, 94 138, 76 132 C 60 126, 56 114, 62 98 C 70 78, 98 56, 134 22 Z"
                fill="url(#goldTopGrad)"
                stroke="#F5E7A3"
                strokeWidth={prefersReducedMotion ? 0 : 2}
                initial={{ pathLength: 0, opacity: 0, fillOpacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: 1,
                  fillOpacity: prefersReducedMotion ? 1 : [0, 0, 1],
                }}
                transition={{
                  pathLength: { duration: prefersReducedMotion ? 0 : 0.9, ease: 'easeInOut', delay: 0.1 },
                  fillOpacity: { delay: prefersReducedMotion ? 0 : 0.8, duration: 0.3 },
                }}
              />

              {/* Gold Crest Sparkle */}
              <motion.circle
                cx="134"
                cy="22"
                r="3"
                fill="#FFFFFF"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: prefersReducedMotion ? 0 : 0.9, duration: 0.3 }}
              />
            </svg>
          </div>

          {/* Brand Name Typography Reveal */}
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.6, duration: 0.4 }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="font-serif text-2xl uppercase tracking-[0.25em] font-semibold text-[#FAF8F3]">
                Shiuli
              </span>
              <span className="font-serif text-2xl uppercase tracking-[0.25em] font-light text-[#D4AF37]">
                CAD Studio
              </span>
            </div>

            <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-[#C9C2A6] font-medium opacity-80">
              High Jewellery 3D Precision
            </p>
          </motion.div>

          {/* Thin Shimmer Line Bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.8, duration: 0.5, ease: 'easeInOut' }}
            className="mt-6 w-32 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent origin-center"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
