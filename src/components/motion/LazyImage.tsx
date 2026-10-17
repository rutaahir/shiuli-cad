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
      className={`relative overflow-hidden bg-gradient-to-b from-[#FFFDF9] to-[#FAF7F2] ${containerClassName}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Blurred Gold Glow Backdrop before load */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FAF8F5] via-[#FFFDF9] to-[#FAF7F2] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#D4AF37]/25 blur-lg animate-pulse" />
        </div>
      )}

      {/* Elegant Fallback Placeholder */}
      {hasError && (
        <div className="absolute inset-0 bg-[#FAF7F2] flex flex-col items-center justify-center gap-1.5 border border-[#E8D7B7]/40 p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-[#B88732]/10 border border-[#B88732]/30 flex items-center justify-center text-[#B88732] shadow-2xs">
            <ImageOff className="w-5 h-5 text-[#B88732]" />
          </div>
          <span className="text-[10px] text-[#8C6218] font-mono uppercase tracking-wider font-semibold">CAD Studio Asset</span>
        </div>
      )}

      {/* Main Image with Crossfade */}
      {!hasError && (
        <motion.img
          src={imgSrc}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          initial={{ opacity: 0, filter: prefersReducedMotion ? 'blur(0px)' : 'blur(6px)' }}
          animate={{
            opacity: isLoaded ? 1 : 0,
            filter: isLoaded || prefersReducedMotion ? 'blur(0px)' : 'blur(6px)',
          }}
          transition={{ duration: prefersReducedMotion ? 0.2 : 0.4, ease: 'easeOut' }}
          className={`w-full h-full object-cover ${className}`}
          {...props}
        />
      )}
    </div>
  );
};

