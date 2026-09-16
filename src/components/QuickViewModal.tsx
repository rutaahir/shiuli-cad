import React, { useState } from 'react';
import { Product, PageId } from '../types';
import { X, Check, ShoppingBag, Heart, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, license: 'standard' | 'commercial') => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
  onNavigateToDetail: (productId: string) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  onNavigateToDetail,
}) => {
  const [selectedLicense, setSelectedLicense] = useState<'standard' | 'commercial'>('standard');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!product) return null;

  const currentPrice = selectedLicense === 'commercial' ? product.price * 1.8 : product.price;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#0B1330] border border-[#D4AF37]/30 shadow-2xl overflow-hidden text-[#FAF8F3]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-[#C9C2A6] hover:text-[#FAF8F3] rounded-full bg-[#0B1330]/70 hover:bg-[#121F4D] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Image Gallery */}
          <div className="p-6 bg-[#070D22] flex flex-col justify-between space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-[#D4AF37]/20 bg-[#0B1330] flex items-center justify-center aspect-square">
              <img
                src={product.images[activeImageIndex] || product.primaryImage}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-all duration-300"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#0B1330]/80 backdrop-blur text-[10px] text-[#F5E7A3] border border-[#D4AF37]/30 font-semibold tracking-wider uppercase">
                {product.category}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border transition-all ${
                      activeImageIndex === i ? 'border-[#D4AF37] scale-105 shadow-md' : 'border-white/10 opacity-70'
                    }`}
                  >
                    <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details & Order Config */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#D4AF37]">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="tracking-wider uppercase font-semibold">Ready-To-Cast CAD Model</span>
              </div>

              <h3 className="font-serif text-2xl text-[#FAF8F3] leading-snug">
                {product.title}
              </h3>

              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-serif text-[#F5E7A3] font-bold">
                  ${currentPrice.toFixed(0)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-[#C9C2A6] line-through">
                    ${(product.originalPrice * (selectedLicense === 'commercial' ? 1.8 : 1)).toFixed(0)}
                  </span>
                )}
                <span className="text-[11px] text-[#C9C2A6]">
                  (Instant Digital Delivery)
                </span>
              </div>

              <p className="text-xs text-[#C9C2A6] leading-relaxed">
                {product.shortDescription}
              </p>

              {/* Technical Spec Matrix */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#121F4D]/30 border border-[#D4AF37]/15 text-xs">
                <div>
                  <span className="text-[#C9C2A6]/70 block text-[10px] uppercase">18K Gold Weight</span>
                  <span className="font-medium text-[#FAF8F3]">{product.specs.metalWeight18k}</span>
                </div>
                <div>
                  <span className="text-[#C9C2A6]/70 block text-[10px] uppercase">Stone Setting</span>
                  <span className="font-medium text-[#FAF8F3]">{product.specs.diamondCount} Gems ({product.specs.diamondTotalWeight})</span>
                </div>
                <div>
                  <span className="text-[#C9C2A6]/70 block text-[10px] uppercase">Tolerance</span>
                  <span className="font-medium text-[#FAF8F3]">{product.specs.tolerance}</span>
                </div>
                <div>
                  <span className="text-[#C9C2A6]/70 block text-[10px] uppercase">Mesh Quality</span>
                  <span className="font-medium text-emerald-400">Watertight STL</span>
                </div>
              </div>

              {/* License Option */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-[#C9C2A6] uppercase tracking-wider block">
                  Select CAD License
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedLicense('standard')}
                    className={`p-2 rounded-xl text-left border text-xs transition-all ${
                      selectedLicense === 'standard'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#FAF8F3]'
                        : 'border-white/10 text-[#C9C2A6] hover:border-white/30'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">Atelier License</div>
                    <div className="text-[10px] text-[#C9C2A6]">Single workshop cast</div>
                  </button>
                  <button
                    onClick={() => setSelectedLicense('commercial')}
                    className={`p-2 rounded-xl text-left border text-xs transition-all ${
                      selectedLicense === 'commercial'
                        ? 'border-[#1E4FA3] bg-[#1E4FA3]/20 text-[#FAF8F3]'
                        : 'border-white/10 text-[#C9C2A6] hover:border-white/30'
                    }`}
                  >
                    <div className="font-semibold text-[11px] text-[#7EACFC]">Commercial License</div>
                    <div className="text-[10px] text-[#C9C2A6]">Mass production rights</div>
                  </button>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onAddToCart(product, selectedLicense);
                    onClose();
                  }}
                  className="btn-gold-luxury flex-1 py-3 rounded-xl font-medium tracking-wider uppercase text-xs flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-[#0B1330]" />
                  Add To CAD Bag (${currentPrice.toFixed(0)})
                </button>
                <button
                  onClick={() => onToggleWishlist(product)}
                  className={`p-3 rounded-xl border transition-colors ${
                    isWishlisted
                      ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]'
                      : 'border-white/20 text-[#C9C2A6] hover:text-white'
                  }`}
                  title="Add to Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onNavigateToDetail(product.id);
                }}
                className="w-full py-2 text-xs text-[#C9C2A6] hover:text-[#D4AF37] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Open Full 360° Studio Viewer & Casting Specs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
