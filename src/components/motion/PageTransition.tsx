import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface PageTransitionProps {
  pageKey: string;
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ pageKey, children }) => {
  const prefersReducedMotion = useReducedMotion();
  const [showSheen, setShowSheen] = useState<boolean>(false);

  useEffect(() => {
    // Trigger sheen animation sweep on route key change if motion enabled
    if (!prefersReducedMotion) {
      setShowSheen(true);
      const timer = setTimeout(() => setShowSheen(false), 450);
      return () => clearTimeout(timer);
    }
  }, [pageKey, prefersReducedMotion]);

  return (
    <div className="relative w-full">
      {/* Metallic Gold Sheen Sweep Indicator across top of viewport */}
      <AnimatePresence>
        {showSheen && !prefersReducedMotion && (
          <motion.div
            key={`sheen-${pageKey}`}
            initial={{ x: '-100%', opacity: 0.8 }}
            animate={{ x: '100%', opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-0 left-0 right-0 h-[2.5px] z-[90] pointer-events-none bg-gradient-to-r from-transparent via-[#F5E7A3] via-[#D4AF37] to-transparent shadow-[0_2px_12px_rgba(212,175,55,0.8)]"
          />
        )}
      </AnimatePresence>

      {/* Page Content Animation Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pageKey}
          initial={{
            opacity: 0,
            y: prefersReducedMotion ? 0 : 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
            transition: {
              duration: prefersReducedMotion ? 0.2 : 0.45,
              ease: [0.25, 1, 0.5, 1],
            },
          }}
          exit={{
            opacity: 0,
            y: prefersReducedMotion ? 0 : -10,
            transition: {
              duration: prefersReducedMotion ? 0.15 : 0.2,
              ease: [0.4, 0, 1, 1],
            },
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
