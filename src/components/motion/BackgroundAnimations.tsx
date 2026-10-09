import React from 'react';
import { motion } from 'framer-motion';

export const BackgroundAnimations: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {/* Soft Ambient Floating Glow Orbs (Pure Luxury Atmosphere without any particles/dust) */}
      <motion.div
        animate={{
          x: [0, 45, -30, 0],
          y: [0, -40, 25, 0],
          scale: [1, 1.12, 0.96, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed -top-40 -left-40 w-[36rem] h-[36rem] rounded-full bg-[#D9B66F]/6 blur-[160px] pointer-events-none z-[0]"
      />

      <motion.div
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -35, 0],
          scale: [1, 0.92, 1.08, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed top-1/3 -right-40 w-[40rem] h-[40rem] rounded-full bg-[#FFF9F0]/80 blur-[170px] pointer-events-none z-[0]"
      />

      <motion.div
        animate={{
          x: [0, 35, -25, 0],
          y: [0, -30, 40, 0],
          scale: [0.96, 1.08, 1, 0.96],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full bg-[#E8D7B7]/10 blur-[160px] pointer-events-none z-[0]"
      />
    </div>
  );
};
