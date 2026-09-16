import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonShimmerProps {
  variant?: 'product-card' | 'grid' | 'product-detail' | 'text' | 'banner';
  count?: number;
  className?: string;
}

export const SkeletonShimmer: React.FC<SkeletonShimmerProps> = ({
  variant = 'product-card',
  count = 4,
  className = '',
}) => {
  const renderSingleSkeleton = (key: number) => {
    if (variant === 'product-card') {
      return (
        <div
          key={key}
          className="relative rounded-2xl bg-[#080E24] border border-[#D4AF37]/15 overflow-hidden p-4 space-y-4 shadow-xl"
        >
          {/* Image Placeholder */}
          <div className="relative aspect-square rounded-xl bg-[#0B1330]/80 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/15 to-transparent animate-[shimmer_1.8s_infinite]" />
          </div>
          {/* Title & Tag Skeletons */}
          <div className="space-y-2">
            <div className="h-3 w-1/3 rounded bg-[#121F4D] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/15 to-transparent animate-[shimmer_1.8s_infinite]" />
            </div>
            <div className="h-5 w-3/4 rounded bg-[#121F4D] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/15 to-transparent animate-[shimmer_1.8s_infinite]" />
            </div>
          </div>
          {/* Price & Button */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="h-6 w-20 rounded bg-[#121F4D] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/15 to-transparent animate-[shimmer_1.8s_infinite]" />
            </div>
            <div className="h-8 w-16 rounded-lg bg-[#D4AF37]/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent animate-[shimmer_1.8s_infinite]" />
            </div>
          </div>
        </div>
      );
    }

    if (variant === 'product-detail') {
      return (
        <div key={key} className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-pulse">
          <div className="lg:col-span-7 aspect-[4/3] rounded-3xl bg-[#080E24] border border-[#D4AF37]/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/15 to-transparent animate-[shimmer_1.8s_infinite]" />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-4 w-1/4 rounded bg-[#121F4D]" />
            <div className="h-10 w-3/4 rounded bg-[#121F4D]" />
            <div className="h-6 w-1/3 rounded bg-[#121F4D]" />
            <div className="h-24 w-full rounded-2xl bg-[#080E24]" />
            <div className="h-12 w-full rounded-xl bg-[#D4AF37]/20" />
          </div>
        </div>
      );
    }

    return (
      <div key={key} className="h-16 w-full rounded-xl bg-[#080E24] border border-[#D4AF37]/15 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/15 to-transparent animate-[shimmer_1.8s_infinite]" />
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className={className || (variant === 'grid' || variant === 'product-card' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6' : 'space-y-4')}
    >
      {Array.from({ length: count }, (_, i) => renderSingleSkeleton(i))}
    </motion.div>
  );
};
