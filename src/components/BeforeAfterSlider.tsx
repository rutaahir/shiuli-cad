import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, MoveHorizontal } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage = '/unsplash-img/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
  afterImage = '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=80',
  beforeLabel = 'Client Pencil Sketch',
  afterLabel = '4K Ray-Traced 3D Render',
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = useState(52);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className={`relative select-none overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#0B1330] shadow-2xl ${className}`}
      style={{ cursor: isDragging ? 'ew-resize' : 'default' }}
    >
      {/* After Image (Right - 3D Render) */}
      <img
        src={afterImage}
        alt={afterLabel}
        referrerPolicy="no-referrer"
        className="w-full h-[360px] md:h-[480px] object-cover"
      />

      {/* Before Image (Left - Sketch, clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          referrerPolicy="no-referrer"
          className="absolute top-0 left-0 h-[360px] md:h-[480px] object-cover max-w-none filter contrast-125 brightness-90 sepia-[0.3]"
          style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%' }}
        />
        {/* Subtle sketch grid overlay */}
        <div className="absolute inset-0 bg-blue-950/20 mix-blend-overlay pointer-events-none" />
      </div>

      {/* Divider Line */}
      <div
        className="absolute top-0 bottom-0 z-20 w-[2px] bg-gradient-to-b from-[#F5E7A3] via-[#D4AF37] to-[#1E4FA3] shadow-[0_0_12px_rgba(212,175,55,0.7)]"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        {/* Center Drag Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-[#0B1330] border-2 border-[#D4AF37] shadow-[0_4px_16px_rgba(0,0,0,0.8)] cursor-ew-resize hover:scale-110 transition-transform">
          <MoveHorizontal className="w-4 h-4 text-[#F5E7A3]" />
        </div>
      </div>

      {/* Floating Badges */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-[#0B1330]/80 backdrop-blur-md border border-[#D4AF37]/30 text-xs font-medium text-[#FAF8F3] flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        {beforeLabel}
      </div>

      <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full bg-[#0B1330]/80 backdrop-blur-md border border-[#D4AF37]/30 text-xs font-medium text-[#FAF8F3] flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
        {afterLabel}
      </div>

      {/* Drag instruction on hover */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-[#0B1330]/85 backdrop-blur-md border border-[#D4AF37]/25 text-[11px] text-[#C9C2A6] tracking-wider uppercase">
        Drag slider to compare craftsmanship
      </div>
    </div>
  );
};
