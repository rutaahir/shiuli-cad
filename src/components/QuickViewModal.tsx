import React, { useState } from 'react';
import { Product, PageId } from '../types';
import { X, Check, ShoppingBag, Heart, ExternalLink, ShieldCheck, Sparkles, Layers } from 'lucide-react';
import { getOptimizedImageUrl, handleImgError } from '../utils/imageHelper';
import { useCustomerCountry, resolveDisplayPrice } from '../utils/countryContext';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, license?: 'standard' | 'commercial') => void;
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
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [addedNotice, setAddedNotice] = useState<boolean>(false);
  const { currentCountry, exchangeRates } = useCustomerCountry();

  if (!product) return null;

  const resolved = resolveDisplayPrice(
    product,
    'standard',
    currentCountry.code,
    exchangeRates
  );

  const handleAdd = () => {
    onAddToCart(product, 'standard');
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-[28px] sm:rounded-[32px] bg-gradient-to-b from-[#FFFDF9] via-[#FAF4E8] to-[#F5EAD6] border-2 border-[#E7CE97] shadow-[0_25px_70px_rgba(180,140,50,0.28),0_6px_20px_rgba(0,0,0,0.06)] overflow-hidden text-[#0F264A] max-h-[92vh] overflow-y-auto">
        
        {/* Subtle decorative gold radial flourishes */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[radial-gradient(circle_at_top_right,rgba(224,179,84,0.3)_0%,transparent_70%)] pointer-events-none rounded-tr-[32px]" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[radial-gradient(circle_at_bottom_left,rgba(224,179,84,0.2)_0%,transparent_70%)] pointer-events-none rounded-bl-[32px]" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-[#6B5A3E] hover:text-[#0F264A] rounded-full bg-white/80 hover:bg-white border border-[#E5D2B0] shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4 stroke-[2.2]" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Image Gallery */}
          <div className="p-5 sm:p-6 bg-gradient-to-b from-white via-[#FCF9F2] to-[#F7EFE0] border-b md:border-b-0 md:border-r border-[#EADAC0] flex flex-col justify-between space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-[#EADAC0] bg-white flex items-center justify-center aspect-square shadow-2xs">
              {/* Radial gold spotlight */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,182,111,0.15)_0%,transparent_70%)] pointer-events-none" />

              <img
                src={getOptimizedImageUrl(product.images[activeImageIndex] || product.primaryImage, product.category)}
                alt={product.title}
                onError={(e) => handleImgError(e, product.category)}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-4 drop-shadow-[0_12px_24px_rgba(23,52,92,0.12)] transition-all duration-300"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#E8D7B7] text-[10px] text-[#B88732] font-semibold tracking-wider uppercase shadow-2xs">
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
                    className={`w-14 h-14 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                      activeImageIndex === i
                        ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30 scale-105 shadow-sm'
                        : 'border-[#EADAC0] bg-white/80 opacity-75 hover:opacity-100 hover:border-[#D4AF37]'
                    }`}
                  >
                    <img
                      src={getOptimizedImageUrl(img, product.category)}
                      alt=""
                      onError={(e) => handleImgError(e, product.category)}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details & Order Config */}
          <div className="p-6 sm:p-7 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-[#B88732] font-semibold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ready-To-Cast CAD Model</span>
              </div>

              <h3 className="font-serif text-2xl font-bold text-[#0F264A] leading-snug">
                {product.title}
              </h3>

              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-serif text-[#0F264A] font-bold">
                  {resolved.display}
                </span>
                {resolved.originalDisplay && (
                  <span className="text-sm text-[#8E9CAE] line-through">
                    {resolved.originalDisplay}
                  </span>
                )}
                {resolved.isRegional && resolved.tierName && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF9ED] border border-[#E2C898] text-[#A67823] font-semibold">
                    {currentCountry.flag} {resolved.tierName}
                  </span>
                )}
                <span className="text-[11px] text-[#697A91]">
                  (Instant Digital Delivery)
                </span>
              </div>

              <p className="text-xs text-[#526075] leading-relaxed">
                {product.shortDescription}
              </p>

              {/* Technical Spec Matrix */}
              <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-white/90 border border-[#EADAC0] text-xs shadow-2xs">
                <div>
                  <span className="text-[#A67823] block text-[9.5px] font-bold uppercase tracking-wider">18K Gold Weight</span>
                  <span className="font-bold text-[#0F264A]">{product.specs?.metalWeight18k || '—'}</span>
                </div>
                <div>
                  <span className="text-[#A67823] block text-[9.5px] font-bold uppercase tracking-wider">Stone Setting</span>
                  <span className="font-bold text-[#0F264A]">
                    {product.specs?.diamondCount && product.specs.diamondCount > 0
                      ? `${product.specs.diamondCount} Gems ${product.specs.diamondTotalWeight ? `(${product.specs.diamondTotalWeight})` : ''}`
                      : 'Solid Metal (No Stones)'}
                  </span>
                </div>
                <div>
                  <span className="text-[#A67823] block text-[9.5px] font-bold uppercase tracking-wider">Tolerance</span>
                  <span className="font-bold text-[#0F264A]">{product.specs?.tolerance || '±0.01 mm'}</span>
                </div>
                <div>
                  <span className="text-[#A67823] block text-[9.5px] font-bold uppercase tracking-wider">Mesh Quality</span>
                  <span className="font-bold text-emerald-700">Watertight STL</span>
                </div>
              </div>

              {/* Included Production Package */}
              <div className="p-3 rounded-2xl bg-white/90 border border-[#EADAC0] space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F264A]">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>Production-Ready CAD Package Included</span>
                </div>
                <p className="text-[11px] text-[#526075] leading-relaxed">
                  Direct instant download of layered Rhino <strong className="text-[#0F264A]">.3DM</strong> + castable watertight <strong className="text-[#0F264A]">.STL</strong> mesh with precision shrinkage allowance.
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2.5 pt-2 border-t border-[#EADAC0]">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onAddToCart(product, 'standard');
                    onClose();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#DFB35A] via-[#ECC976] to-[#C99834] hover:from-[#E6BC64] hover:to-[#D4A33F] text-[#0C2340] font-serif font-bold text-xs sm:text-[13px] tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(209,161,54,0.32)] transition-all hover:-translate-y-0.5 active:scale-[0.98] border border-[#FFF0BA] cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
                  <span>Add To CAD Bag ({resolved.display})</span>
                </button>
                <button
                  onClick={() => onToggleWishlist(product)}
                  className={`p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
                    isWishlisted
                      ? 'border-[#D4AF37] bg-[#FFF9ED] text-[#D4AF37]'
                      : 'border-[#EADAC0] bg-white text-[#697A91] hover:text-[#B88732] hover:border-[#D4AF37]'
                  }`}
                  title="Add to Wishlist"
                  aria-label="Add to Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onNavigateToDetail(product.id);
                }}
                className="w-full py-1.5 text-xs font-serif font-bold text-[#0F264A] hover:text-[#B88732] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open Full 360° Studio Viewer &amp; Casting Specs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
