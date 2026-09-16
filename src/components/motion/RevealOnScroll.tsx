import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealOnScrollProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  threshold?: number;
  className?: string;
  staggerIndex?: number;
}

export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  delay = 0,
  duration = 0.5,
  yOffset = 24,
  threshold = 0.15,
  className = '',
  staggerIndex,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const calculatedDelay = delay + (staggerIndex !== undefined ? staggerIndex * 0.08 : 0);

  if (prefersReducedMotion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: threshold }}
        transition={{ duration: 0.2, delay: calculatedDelay }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: threshold }}
      transition={{
        duration,
        delay: calculatedDelay,
        ease: [0.25, 1, 0.5, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
