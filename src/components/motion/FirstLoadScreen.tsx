import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface FirstLoadScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export const FirstLoadScreen: React.FC<FirstLoadScreenProps> = ({
  onComplete,
  duration = 1400,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Show splash on page load/refresh, then smoothly fade out
    const displayDuration = prefersReducedMotion ? 400 : duration;
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, displayDuration);

    return () => clearTimeout(timer);
  }, [prefersReducedMotion, duration, onComplete]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="first-load-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[99999] bg-[#070D1F] flex flex-col items-center justify-center text-center select-none overflow-hidden px-4"
          style={{
            background: 'radial-gradient(circle at center, #0F1D45 0%, #070D1F 100%)',
          }}
        >
          {/* Subtle Ambient Gold and Sapphire Glow Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[360px] bg-[#D4AF37]/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[240px] bg-[#2563EB]/20 rounded-full blur-[80px] pointer-events-none" />

          {/* Current Official Brand Logo with Smooth Reveal */}
          <motion.div
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.92, y: prefersReducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0.3 : 0.7,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative z-10 flex flex-col items-center justify-center"
          >
            <div className="relative">
              <img
                src="/assets/logo.png"
                alt="Shiuli CAD Studio"
                className="w-[280px] xs:w-[320px] sm:w-[400px] md:w-[460px] max-w-[88vw] h-auto object-contain drop-shadow-[0_10px_35px_rgba(212,175,55,0.45)]"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </div>

            {/* Luxurious Accent Shimmer Line */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{
                delay: prefersReducedMotion ? 0.1 : 0.35,
                duration: prefersReducedMotion ? 0.2 : 0.75,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-6 w-36 sm:w-52 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent origin-center shadow-[0_0_12px_rgba(212,175,55,0.8)]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

