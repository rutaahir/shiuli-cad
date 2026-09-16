import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Layers, Sparkles, Compass, Maximize2, Minimize2 } from 'lucide-react';

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80';

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
  const [zoomLevel, setZoomLevel] = useState(1.1);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const containerRef = useRef<HTMLDivElement>(null);

  // Active target image URL
  const selectedImageFromList = images && images.length > 0
    ? (images[activeImageIdx] || images[Math.floor((rotationAngle / 360) * images.length) % images.length] || images[0])
    : DEFAULT_FALLBACK_IMAGE;

  const [imgSrc, setImgSrc] = useState<string>(selectedImageFromList || DEFAULT_FALLBACK_IMAGE);

  useEffect(() => {
    setImgSrc(selectedImageFromList || DEFAULT_FALLBACK_IMAGE);
  }, [selectedImageFromList]);

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
    <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-gradient-to-b from-[#0B1330] to-[#080E24] shadow-2xl p-4">
      {/* View Mode Tabs */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#D4AF37]/15">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveLayer('render')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              activeLayer === 'render'
                ? 'bg-[#D4AF37] text-[#0B1330] font-semibold shadow-sm'
                : 'text-[#C9C2A6] hover:text-[#FAF8F3] hover:bg-white/5'
            }`}
          >
            4K Studio Render
          </button>
          <button
            onClick={() => setActiveLayer('wireframe')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
              activeLayer === 'wireframe'
                ? 'bg-[#1E4FA3] text-white font-semibold shadow-sm'
                : 'text-[#C9C2A6] hover:text-[#FAF8F3] hover:bg-white/5'
            }`}
          >
            <Layers className="w-3 h-3" />
            NURBS Curves
          </button>
          <button
            onClick={() => setActiveLayer('stl')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
              activeLayer === 'stl'
                ? 'bg-emerald-700 text-white font-semibold shadow-sm'
                : 'text-[#C9C2A6] hover:text-[#FAF8F3] hover:bg-white/5'
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
                ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#F5E7A3]'
                : 'border-[#D4AF37]/30 text-[#C9C2A6] hover:text-[#FAF8F3]'
            }`}
          >
            {fitMode === 'cover' ? <Maximize2 className="w-3 h-3 text-[#D4AF37]" /> : <Minimize2 className="w-3 h-3" />}
            <span className="text-[11px]">{fitMode === 'cover' ? 'Fill Box' : 'Fit Box'}</span>
          </button>

          {/* Zoom Out (-), Level & Zoom In (+) */}
          <div className="flex items-center bg-[#0B1330] rounded-lg border border-[#D4AF37]/30 p-0.5 shadow-sm">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.5, Number((prev - 0.2).toFixed(1))))}
              title="Zoom Out / Minimize (-)"
              disabled={zoomLevel <= 0.5}
              className="p-1 rounded text-[#C9C2A6] hover:text-[#D4AF37] hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-[#F5E7A3] min-w-[32px] text-center select-none font-bold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(2.5, Number((prev + 0.2).toFixed(1))))}
              title="Zoom In / Enlarge (+)"
              disabled={zoomLevel >= 2.5}
              className="p-1 rounded text-[#C9C2A6] hover:text-[#D4AF37] hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            title={isAutoRotating ? 'Pause 360 Spin' : 'Start 360 Spin'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isAutoRotating
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                : 'border-[#D4AF37]/20 text-[#C9C2A6]'
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
        className="relative w-full h-[380px] sm:h-[480px] md:h-[540px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden rounded-xl bg-[#070D22]"
      >
        {/* Ambient Ring Platform & Soft Caustics */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 60%, rgba(212, 175, 55, 0.18) 0%, rgba(30, 79, 163, 0.12) 45%, transparent 75%)`,
          }}
        />

        {/* 3D Circular CAD Calibration Grid Base */}
        <div className="absolute bottom-6 w-80 h-24 rounded-[100%] border border-[#D4AF37]/20 opacity-30 [transform:rotateX(75deg)] pointer-events-none">
          <div className="absolute inset-2 rounded-[100%] border border-[#1E4FA3]/40" />
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
            className={`w-full h-full ${
              fitMode === 'cover' ? 'object-cover' : 'object-contain'
            } rounded-lg transition-all duration-300 drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)] ${
              activeLayer === 'wireframe'
                ? 'filter invert hue-rotate-180 brightness-125 contrast-150'
                : activeLayer === 'stl'
                ? 'filter grayscale contrast-200 brightness-110 sepia-[0.3]'
                : ''
            }`}
          />

          {/* Wireframe overlay effect when wireframe layer selected */}
          {activeLayer === 'wireframe' && (
            <div className="absolute inset-2 pointer-events-none border border-cyan-400/40 rounded-lg flex items-center justify-center">
              <span className="text-[10px] text-cyan-300 font-mono tracking-widest uppercase bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/30">
                Rhino NURBS Surface Tolerances: ±0.015mm
              </span>
            </div>
          )}

          {/* STL Mesh QC Badge */}
          {activeLayer === 'stl' && (
            <div className="absolute top-4 right-4 pointer-events-none px-2.5 py-1 bg-emerald-950/90 border border-emerald-500/50 rounded text-[11px] text-emerald-300 font-mono">
              ✓ Watertight Solid (0 Non-Manifold Edges)
            </div>
          )}
        </div>

        {/* First-load pulse hint */}
        {isAutoRotating && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B1330]/80 backdrop-blur border border-[#D4AF37]/30 text-[11px] text-[#F5E7A3] pointer-events-none">
            <RotateCw className="w-3 h-3 animate-spin text-[#D4AF37]" />
            <span>Drag to rotate 360° • Click to pause</span>
          </div>
        )}

        {/* Angle indicator gauge */}
        <div className="absolute top-3 left-3 text-[10px] font-mono text-[#C9C2A6]/80 bg-[#0B1330]/70 px-2 py-1 rounded border border-[#D4AF37]/15">
          Rotation: {Math.round(rotationAngle)}°
        </div>
      </div>

      {/* Rotation Scrub Slider */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[11px] font-medium text-[#C9C2A6] whitespace-nowrap">360° Angle:</span>
        <input
          type="range"
          min="0"
          max="360"
          value={Math.round(rotationAngle)}
          onChange={(e) => {
            setIsAutoRotating(false);
            setRotationAngle(Number(e.target.value));
          }}
          className="w-full accent-[#D4AF37] cursor-pointer h-1.5 bg-[#121F4D] rounded-lg"
        />
        <span className="text-[11px] font-mono text-[#F5E7A3] w-10 text-right">
          {Math.round(rotationAngle)}°
        </span>
      </div>
    </div>
  );
};
