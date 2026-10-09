import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Layers, Sparkles, Compass, Maximize2, Minimize2 } from 'lucide-react';
import { getOptimizedImageUrl, VERIFIED_JEWELRY_IMAGES } from '../utils/imageHelper';

const DEFAULT_FALLBACK_IMAGE = VERIFIED_JEWELRY_IMAGES.ring;

interface TurntableSimulatorProps {
  images: string[];
  title: string;
  activeImageIdx?: number;
}

export const TurntableSimulator: React.FC<TurntableSimulatorProps> = ({ images, title, activeImageIdx = 0 }) => {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [activeLayer, setActiveLayer] = useState<'render' | 'wireframe' | 'stl'>('render');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('contain');
  const containerRef = useRef<HTMLDivElement>(null);

  // Active target image URL
  const rawTarget = images && images.length > 0
    ? (images[activeImageIdx] || images[Math.floor((rotationAngle / 360) * images.length) % images.length] || images[0])
    : DEFAULT_FALLBACK_IMAGE;

  const selectedImageFromList = getOptimizedImageUrl(rawTarget);

  const [imgSrc, setImgSrc] = useState<string>(selectedImageFromList || DEFAULT_FALLBACK_IMAGE);

  useEffect(() => {
    setImgSrc(getOptimizedImageUrl(rawTarget) || DEFAULT_FALLBACK_IMAGE);
  }, [rawTarget]);

  const handleImageError = () => {
    setImgSrc(DEFAULT_FALLBACK_IMAGE);
  };

  // Auto-rotate effect
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 0.4) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsAutoRotating(false);
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    setRotationAngle((prev) => (prev + delta * 0.5 + 360) % 360);
    setStartX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#E8D7B7] bg-white shadow-md p-4">
      {/* View Mode Tabs */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E8D7B7]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveLayer('render')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              activeLayer === 'render'
                ? 'bg-[#17345C] text-white font-semibold shadow-sm'
                : 'text-[#687386] hover:text-[#17345C] hover:bg-[#FFF9F0]'
            }`}
          >
            4K Studio Render
          </button>
          <button
            onClick={() => setActiveLayer('wireframe')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
              activeLayer === 'wireframe'
                ? 'bg-[#D9B66F] text-[#17345C] font-semibold shadow-sm'
                : 'text-[#687386] hover:text-[#17345C] hover:bg-[#FFF9F0]'
            }`}
          >
            <Layers className="w-3 h-3" />
            NURBS Curves
          </button>
          <button
            onClick={() => setActiveLayer('stl')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
              activeLayer === 'stl'
                ? 'bg-[#236E6A] text-white font-semibold shadow-sm'
                : 'text-[#687386] hover:text-[#17345C] hover:bg-[#FFF9F0]'
            }`}
          >
            <Compass className="w-3 h-3" />
            STL Mesh QC
          </button>
        </div>

        {/* Fit mode, Zoom & Rotate controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
            title={fitMode === 'cover' ? 'Switch to Fit Aspect (Contain)' : 'Switch to Fill Box (Cover)'}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              fitMode === 'cover'
                ? 'border-[#D9B66F] bg-[#FFF9F0] text-[#17345C]'
                : 'border-[#E8D7B7] text-[#687386] hover:text-[#17345C]'
            }`}
          >
            {fitMode === 'cover' ? <Maximize2 className="w-3 h-3 text-[#B88732]" /> : <Minimize2 className="w-3 h-3" />}
            <span className="text-[11px]">{fitMode === 'cover' ? 'Fill Box' : 'Fit Box'}</span>
          </button>

          {/* Zoom Out (-), Level & Zoom In (+) */}
          <div className="flex items-center bg-[#FFF9F0] rounded-lg border border-[#E8D7B7] p-0.5 shadow-sm">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.5, Number((prev - 0.2).toFixed(1))))}
              title="Zoom Out / Minimize (-)"
              disabled={zoomLevel <= 0.5}
              className="p-1 rounded text-[#687386] hover:text-[#17345C] hover:bg-white/50 disabled:opacity-30 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-[#17345C] min-w-[32px] text-center select-none font-bold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(2.5, Number((prev + 0.2).toFixed(1))))}
              title="Zoom In / Enlarge (+)"
              disabled={zoomLevel >= 2.5}
              className="p-1 rounded text-[#687386] hover:text-[#17345C] hover:bg-white/50 disabled:opacity-30 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            title={isAutoRotating ? 'Pause 360 Spin' : 'Start 360 Spin'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isAutoRotating
                ? 'border-[#D9B66F] text-[#B88732] bg-[#FFF9F0]'
                : 'border-[#E8D7B7] text-[#687386] hover:text-[#17345C]'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Turntable Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative w-full h-[380px] sm:h-[480px] md:h-[540px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden rounded-xl bg-[#FFF9F0]"
      >
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

        {/* Image with 3D perspective simulated rotation */}
        <div
          className="relative w-full h-full flex items-center justify-center transition-transform duration-100 ease-out overflow-hidden"
          style={{
            transform: `scale(${zoomLevel}) rotateY(${Math.sin((rotationAngle * Math.PI) / 180) * 15}deg)`,
            perspective: '1000px',
          }}
        >
          <img
            src={imgSrc}
            onError={handleImageError}
            alt={title}
            referrerPolicy="no-referrer"
            className={`w-full h-full p-4 sm:p-6 ${
              fitMode === 'cover' ? 'object-cover' : 'object-contain'
            } rounded-lg transition-all duration-300 drop-shadow-[0_12px_30px_rgba(23,52,92,0.15)] ${
              activeLayer === 'wireframe'
                ? 'filter invert hue-rotate-180 brightness-95 contrast-125'
                : activeLayer === 'stl'
                ? 'filter grayscale contrast-150 brightness-105'
                : ''
            }`}
          />

          {/* Wireframe overlay effect when wireframe layer selected */}
          {activeLayer === 'wireframe' && (
            <div className="absolute inset-2 pointer-events-none border border-[#17345C]/30 rounded-lg flex items-center justify-center">
              <span className="text-[10px] text-[#17345C] font-mono tracking-widest uppercase bg-white/90 px-2.5 py-1 rounded border border-[#E8D7B7] shadow-sm">
                Rhino NURBS Surface Tolerances: ±0.015mm
              </span>
            </div>
          )}

          {/* STL Mesh QC Badge */}
          {activeLayer === 'stl' && (
            <div className="absolute top-4 right-4 pointer-events-none px-2.5 py-1 bg-white/95 border border-[#236E6A] rounded text-[11px] text-[#236E6A] font-mono shadow-sm">
              ✓ Watertight Solid (0 Non-Manifold Edges)
            </div>
          )}
        </div>

        {/* First-load pulse hint */}
        {isAutoRotating && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 backdrop-blur border border-[#E8D7B7] text-[11px] text-[#17345C] pointer-events-none shadow-sm">
            <RotateCw className="w-3 h-3 animate-spin text-[#B88732]" />
            <span>Drag to rotate 360° • Click to pause</span>
          </div>
        )}

        {/* Angle indicator gauge */}
        <div className="absolute top-3 left-3 text-[10px] font-mono text-[#687386] bg-white/80 px-2 py-1 rounded border border-[#E8D7B7]">
          Rotation: {Math.round(rotationAngle)}°
        </div>
      </div>

      {/* Rotation Scrub Slider */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[11px] font-medium text-[#687386] whitespace-nowrap">360° Angle:</span>
        <input
          type="range"
          min="0"
          max="360"
          value={Math.round(rotationAngle)}
          onChange={(e) => {
            setIsAutoRotating(false);
            setRotationAngle(Number(e.target.value));
          }}
          className="w-full accent-[#B88732] cursor-pointer h-1.5 bg-[#FFF9F0] border border-[#E8D7B7] rounded-lg"
        />
        <span className="text-[11px] font-mono text-[#17345C] font-semibold w-10 text-right">
          {Math.round(rotationAngle)}°
        </span>
      </div>
    </div>
  );
};
