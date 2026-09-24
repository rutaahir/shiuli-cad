import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'mark-only' | 'horizontal' | 'compact';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  imageSrc?: string; // Path to custom logo image (e.g., '/assets/logo.png')
  useCustomImage?: boolean;
}

// Global default custom logo image path — change this path if you place your logo file in public/assets/
const DEFAULT_CUSTOM_LOGO_PATH = '/assets/logo.png';

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  onClick,
  imageSrc,
  useCustomImage = true,
}) => {
  const activeImageSrc = imageSrc || (useCustomImage ? DEFAULT_CUSTOM_LOGO_PATH : null);

  // Balanced, legible, luxury proportions for full image logos (without empty padding)
  const pixelDimensions: Record<string, { height: number; maxWidth: number; className: string }> = {
    sm: { height: 42, maxWidth: 165, className: 'h-[42px] max-w-[165px]' },
    md: { height: 58, maxWidth: 230, className: 'h-[58px] max-w-[230px]' },
    lg: { height: 76, maxWidth: 290, className: 'h-[76px] max-w-[290px]' },
    xl: { height: 96, maxWidth: 360, className: 'h-[96px] max-w-[360px]' },
  };

  const dim = pixelDimensions[size] || pixelDimensions.md;

  // Dimension presets with prominent Shiuli font scaling (for SVG vector fallback)
  const sizeMap = {
    sm: { icon: 30, shiuliTitle: 'text-sm sm:text-base', cadTitle: 'text-xs sm:text-sm', subtitle: 'text-[8px] sm:text-[9px]' },
    md: { icon: 42, shiuliTitle: 'text-lg sm:text-2xl', cadTitle: 'text-sm sm:text-lg', subtitle: 'text-[9px] sm:text-[11px]' },
    lg: { icon: 54, shiuliTitle: 'text-2xl sm:text-3xl', cadTitle: 'text-lg sm:text-xl', subtitle: 'text-xs sm:text-sm' },
    xl: { icon: 76, shiuliTitle: 'text-3xl sm:text-5xl', cadTitle: 'text-xl sm:text-3xl', subtitle: 'text-sm sm:text-base' },
  };

  // If a custom image logo (like logo.png) is active, display it with guaranteed exact dimensions
  if (activeImageSrc) {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center flex-shrink-0 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
        style={{ height: `${dim.height}px`, maxHeight: `${dim.height}px` }}
      >
        <img
          src={activeImageSrc}
          alt="Shiuli CAD Studio Logo"
          style={{
            height: `${dim.height}px`,
            maxHeight: `${dim.height}px`,
            maxWidth: `${dim.maxWidth}px`,
            width: 'auto',
            objectFit: 'contain',
            imageRendering: '-webkit-optimize-contrast',
          }}
          className={`${dim.className} w-auto object-contain transition-transform duration-300 hover:scale-105 drop-shadow-[0_2px_8px_rgba(212,175,55,0.25)]`}
        />
      </div>
    );
  }

  const currentSize = sizeMap[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 sm:gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Precision 3D Metallic Ribbon Vector Logo Mark */}
      <div
        style={{ width: currentSize.icon, height: currentSize.icon }}
        className="relative flex-shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <svg
          viewBox="0 0 200 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]"
        >
          <defs>
            {/* Top Gold Ribbon Metallic Gradient */}
            <linearGradient id="brandGoldGrad" x1="30" y1="10" x2="160" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF7C2" />
              <stop offset="25%" stopColor="#F5D061" />
              <stop offset="55%" stopColor="#D4AF37" />
              <stop offset="85%" stopColor="#A67C0D" />
              <stop offset="100%" stopColor="#694B00" />
            </linearGradient>

            {/* Gold Inner Reflection */}
            <linearGradient id="brandGoldHighlight" x1="45" y1="110" x2="135" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#F5E7A3" />
              <stop offset="100%" stopColor="#C29618" />
            </linearGradient>

            {/* Bottom Vibrant Sapphire Blue Ribbon Gradient */}
            <linearGradient id="brandBlueGrad" x1="70" y1="90" x2="175" y2="230" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#62B5FF" />
              <stop offset="25%" stopColor="#1E82FF" />
              <stop offset="60%" stopColor="#0B4ECB" />
              <stop offset="90%" stopColor="#052E84" />
              <stop offset="100%" stopColor="#021B54" />
            </linearGradient>

            {/* Sapphire Outer Shadow/Bevel */}
            <linearGradient id="brandBlueBevel" x1="100" y1="95" x2="170" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4198FF" />
              <stop offset="60%" stopColor="#0E45A8" />
              <stop offset="100%" stopColor="#041B4B" />
            </linearGradient>

            <filter id="logoBevelShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Sapphire Blue Lower Ribbon Loop */}
          <path
            d="M 94 95 C 122 92, 150 108, 160 134 C 172 165, 154 185, 126 195 C 102 203, 85 220, 72 235 C 70 237, 72 232, 75 224 C 88 190, 110 168, 138 152 C 148 146, 150 132, 142 122 C 132 110, 114 104, 94 95 Z"
            fill="url(#brandBlueGrad)"
            filter="url(#logoBevelShadow)"
          />

          {/* Sapphire 3D Side Fold Overlay */}
          <path
            d="M 126 195 C 145 186, 164 162, 158 136 C 153 118, 134 104, 112 100 L 105 106 C 124 112, 140 124, 142 138 C 146 158, 130 178, 115 186 Z"
            fill="url(#brandBlueBevel)"
            opacity="0.9"
          />

          {/* Top Metallic Gold Swirl Ribbon */}
          <path
            d="M 134 22 C 126 36, 102 60, 74 72 C 48 84, 42 104, 46 128 C 50 150, 68 168, 92 170 C 114 172, 124 162, 120 152 C 114 140, 94 138, 76 132 C 60 126, 56 114, 62 98 C 70 78, 98 56, 134 22 Z"
            fill="url(#brandGoldGrad)"
            filter="url(#logoBevelShadow)"
          />

          {/* Gold Specular Highlight */}
          <path
            d="M 134 22 C 118 42, 90 66, 68 84 C 58 92, 54 104, 58 116 C 64 106, 76 96, 92 88 C 112 78, 126 54, 134 22 Z"
            fill="url(#brandGoldHighlight)"
            opacity="0.8"
          />

          {/* Interlock Core Shadow */}
          <path
            d="M 88 120 C 96 112, 108 110, 118 114 C 110 122, 98 126, 88 120 Z"
            fill="#03081A"
            opacity="0.65"
          />

          {/* Top Diamond Facet Sparkle */}
          <circle cx="134" cy="22" r="2.5" fill="#FFFFFF" opacity="0.95" />
        </svg>
      </div>

      {/* Brand Typography matching user reference image */}
      {variant !== 'mark-only' && (
        <div className={`flex flex-col ${variant === 'full' ? 'items-center text-center' : 'items-start'}`}>
          <div className="flex items-baseline gap-1 sm:gap-1.5 leading-none whitespace-nowrap">
            {/* Gold 'Shiuli' Title — Prominent larger font size */}
            <span
              className={`font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FFF2B2] via-[#E2B743] to-[#B38612] ${currentSize.shiuliTitle} drop-shadow-[0_2px_8px_rgba(212,175,55,0.3)]`}
            >
              Shiuli
            </span>
            {/* Bold White 'CAD Studio' Title */}
            <span
              className={`font-serif font-bold tracking-normal text-white ${currentSize.cadTitle} drop-shadow-md`}
            >
              CAD Studio
            </span>
          </div>

          {/* Tagline: Jewellery Design | 3D Modeling | CAD Files (visible across screen sizes) */}
          <div
            className={`font-sans tracking-tight font-medium text-[#FAF8F3]/90 ${currentSize.subtitle} flex items-center gap-0.5 sm:gap-1 mt-0.5 whitespace-nowrap`}
          >
            <span>Jewellery Design</span>
            <span className="text-[#D4AF37] font-bold">|</span>
            <span>3D Modeling</span>
            <span className="text-[#D4AF37] font-bold">|</span>
            <span>CAD Files</span>
          </div>
        </div>
      )}
    </div>
  );
};
