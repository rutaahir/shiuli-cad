import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { getOptimizedImageUrl, VERIFIED_JEWELRY_IMAGES } from '../utils/imageHelper';

const DEFAULT_FALLBACK_IMAGE = VERIFIED_JEWELRY_IMAGES.ring;

interface TurntableSimulatorProps {
  images: string[];
  title: string;
  activeImageIdx?: number;
}

export const TurntableSimulator: React.FC<TurntableSimulatorProps> = ({ images, title, activeImageIdx = 0 }) => {
  // Active target image URL
  const rawTarget = images && images.length > 0
    ? (images[activeImageIdx] || images[0])
    : DEFAULT_FALLBACK_IMAGE;

  const selectedImageFromList = getOptimizedImageUrl(rawTarget);
  const [imgSrc, setImgSrc] = useState<string>(selectedImageFromList || DEFAULT_FALLBACK_IMAGE);

  useEffect(() => {
    setImgSrc(getOptimizedImageUrl(rawTarget) || DEFAULT_FALLBACK_IMAGE);
  }, [rawTarget]);

  const handleImageError = () => {
    setImgSrc(DEFAULT_FALLBACK_IMAGE);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#E8D7B7] bg-white shadow-md p-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E8D7B7]">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs rounded-lg bg-[#17345C] text-white font-semibold shadow-sm inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D9B66F]" />
            4K Studio Render
          </span>
          {images && images.length > 1 && (
            <span className="text-[11px] font-mono text-[#687386]">
              Angle {activeImageIdx + 1} of {images.length}
            </span>
          )}
        </div>
      </div>

      {/* Main Studio Image Canvas */}
      <div className="relative w-full h-[380px] sm:h-[480px] md:h-[540px] flex items-center justify-center overflow-hidden rounded-xl bg-[#FFF9F0] p-4 sm:p-6">
        {/* Ambient Ring Platform & Soft Warm Caustics */}
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 60%, rgba(217, 182, 111, 0.22) 0%, rgba(232, 215, 183, 0.15) 45%, transparent 75%)`,
          }}
        />

        {/* 3D Circular CAD Calibration Grid Base */}
        <div className="absolute bottom-6 w-80 h-24 rounded-[100%] border border-[#E8D7B7] opacity-60 [transform:rotateX(75deg)] pointer-events-none">
          <div className="absolute inset-2 rounded-[100%] border border-[#D9B66F]/40" />
        </div>

        {/* Centered, completely uncropped, pristine full jewelry render */}
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={imgSrc}
            onError={handleImageError}
            alt={title}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg drop-shadow-[0_14px_35px_rgba(23,52,92,0.18)] transition-all duration-300 select-none"
          />
        </div>
      </div>
    </div>
  );
};
