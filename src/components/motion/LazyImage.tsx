import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ImageOff } from 'lucide-react';
import { getOptimizedImageUrl, getCategoryFallbackImage } from '../../utils/imageHelper';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  category?: string;
  aspectRatio?: string;
  className?: string;
  containerClassName?: string;
  fallbackSrc?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  category,
  aspectRatio,
  className = '',
  containerClassName = '',
  fallbackSrc,
  ...props
}) => {
  const normalizedInitial = getOptimizedImageUrl(src, category);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [imgSrc, setImgSrc] = useState<string>(normalizedInitial);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const nextUrl = getOptimizedImageUrl(src, category);
    setImgSrc(nextUrl);
    setHasError(false);
    setIsLoaded(false);
  }, [src, category]);

  const handleError = () => {
    const nextFallback = fallbackSrc || getCategoryFallbackImage(category);
    if (imgSrc !== nextFallback) {
      setImgSrc(nextFallback);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  return (
    <div
      className={`relative overflow-hidden bg-[#070D22] ${containerClassName}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Blurred Gold Glow Backdrop before load */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-[#0B1330] flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 blur-xl animate-pulse" />
        </div>
      )}

      {/* Error Placeholder */}
      {hasError && (
        <div className="absolute inset-0 bg-[#080E24] flex flex-col items-center justify-center gap-2">
          <ImageOff className="w-8 h-8 text-[#D4AF37]/30" />
          <span className="text-[10px] text-[#C9C2A6]/50 font-mono uppercase tracking-wider">CAD Asset</span>
        </div>
      )}

      {/* Main Image with Crossfade */}
      {!hasError && (
        <motion.img
          src={imgSrc}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          initial={{ opacity: 0, filter: prefersReducedMotion ? 'blur(0px)' : 'blur(8px)' }}
          animate={{
            opacity: isLoaded ? 1 : 0,
            filter: isLoaded || prefersReducedMotion ? 'blur(0px)' : 'blur(8px)',
          }}
          transition={{ duration: prefersReducedMotion ? 0.2 : 0.45, ease: 'easeOut' }}
          className={`w-full h-full object-cover ${className}`}
          {...props}
        />
      )}
    </div>
  );
};

