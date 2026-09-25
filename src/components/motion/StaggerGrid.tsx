import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

interface StaggerGridProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
  threshold?: number;
}

export const StaggerGrid: React.FC<StaggerGridProps> = ({
  children,
  staggerDelay = 0.08,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // Using 'some' ensures intersection triggers as soon as the top edge of the grid enters the viewport,
  // regardless of how tall the element is (preventing permanent opacity: 0 on mobile viewports).
  const isInView = useInView(ref, { once: true, amount: 'some', margin: '0px 0px -20px 0px' });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
        delayChildren: 0.02,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({ children, className = '' }) => {
  const prefersReducedMotion = useReducedMotion();

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.15 : 0.35,
        ease: [0.25, 1, 0.5, 1],
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
};

