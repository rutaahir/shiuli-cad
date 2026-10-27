import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Twitter, Mail, X, ExternalLink } from 'lucide-react';
import { getOptimizedImageUrl, handleImgError } from '../../utils/imageHelper';

export interface ProductShareData {
  id: string | number;
  title: string;
  image?: string;
  category?: string;
  price?: string | number;
  url?: string;
}

interface ProductShareModalProps {
  product: ProductShareData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductShareModal: React.FC<ProductShareModalProps> = ({ product, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !product) return null;

  // Build full absolute URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = product.url || (origin ? `${origin}/product/${product.id}` : `https://shiulicad.com/product/${product.id}`);
  const shareImage = product.image ? (product.image.startsWith('http') ? product.image : `${origin}${product.image}`) : '';
  const shareText = `Check out ${product.title} on Shiuli CAD Studio — Haute Joaillerie 3D CAD Library`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed:', err);
        }
      }
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(shareImage)}&description=${encodeURIComponent(product.title)}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(product.title)}&body=${encodeURIComponent(`${shareText}\n\nExplore at:\n${shareUrl}`)}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
      />

      {/* Modal Dialog */}
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="share-modal-title"
        className="relative w-full max-w-md bg-[#FFFDF9] border-2 border-[#E8D7B7] rounded-3xl p-6 shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-200 text-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0B1330] text-[#F5E7A3] flex items-center justify-center shadow-sm">
              <Share2 className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <h3 id="share-modal-title" className="font-serif text-lg font-bold text-[#17345C]">
                Share Atelier Design
              </h3>
              <p className="text-[10px] text-[#687386] font-mono uppercase tracking-wider">
                Direct CAD File Link &amp; Preview
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#687386] hover:text-[#17345C] hover:bg-[#FFF9F0] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Preview Card */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7]">
          {shareImage ? (
            <div className="w-16 h-16 rounded-xl bg-white border border-[#E8D7B7] overflow-hidden shrink-0 flex items-center justify-center p-1">
              <img
                src={getOptimizedImageUrl(shareImage, product.category)}
                alt={product.title}
                onError={(e) => handleImgError(e, product.category)}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white border border-[#E8D7B7] shrink-0 flex items-center justify-center text-[#B88732]">
              <Share2 className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono text-[#8C6218] uppercase tracking-wider block font-bold truncate">
              {product.category || 'Fine Jewellery CAD'}
            </span>
            <h4 className="font-serif text-sm font-bold text-[#17345C] truncate" title={product.title}>
              {product.title}
            </h4>
            <span className="text-[11px] text-[#236E6A] font-mono font-semibold block mt-0.5">
              Watertight 3DM + STL Digital Deliverables
            </span>
          </div>
        </div>

        {/* Native Web Share Button (Mobile / Supported Browsers) */}
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            onClick={handleNativeShare}
            className="w-full py-3 rounded-xl btn-gold-luxury text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer hover:shadow-lg transition-all"
          >
            <Share2 className="w-4 h-4 text-[#17345C]" />
            <span>Share via Device Sheet (WhatsApp, AirDrop, Messages)</span>
          </button>
        )}

        {/* Copy Link Input Bar */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[#687386] font-bold block">
            Direct Product Link
          </label>
          <div className="flex items-center gap-2 bg-white border border-[#E8D7B7] rounded-xl p-1.5 pl-3 focus-within:border-[#B88732] transition-colors">
            <span className="text-xs text-[#17345C] font-mono truncate flex-1 select-all" title={shareUrl}>
              {shareUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Social Channels */}
        <div className="space-y-2 pt-1 border-t border-[#E8D7B7]">
          <span className="text-[10px] uppercase tracking-wider text-[#687386] font-bold block">
            Quick Share to Platforms
          </span>
          <div className="grid grid-cols-4 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white border border-[#E8D7B7] hover:border-[#25D366] hover:bg-[#25D366]/5 transition-all text-[#17345C] group"
              title="Share on WhatsApp"
            >
              <div className="w-8 h-8 rounded-full bg-[#25D366]/10 group-hover:bg-[#25D366] group-hover:text-white text-[#25D366] flex items-center justify-center transition-colors">
                <MessageCircle className="w-4 h-4 fill-current" />
              </div>
              <span className="text-[10px] font-medium">WhatsApp</span>
            </a>

            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white border border-[#E8D7B7] hover:border-[#1DA1F2] hover:bg-[#1DA1F2]/5 transition-all text-[#17345C] group"
              title="Share on X / Twitter"
            >
              <div className="w-8 h-8 rounded-full bg-[#1DA1F2]/10 group-hover:bg-[#1DA1F2] group-hover:text-white text-[#1DA1F2] flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4 fill-current" />
              </div>
              <span className="text-[10px] font-medium">X (Twitter)</span>
            </a>

            <a
              href={pinterestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white border border-[#E8D7B7] hover:border-[#E60023] hover:bg-[#E60023]/5 transition-all text-[#17345C] group"
              title="Share on Pinterest"
            >
              <div className="w-8 h-8 rounded-full bg-[#E60023]/10 group-hover:bg-[#E60023] group-hover:text-white text-[#E60023] flex items-center justify-center transition-colors">
                <ExternalLink className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium">Pinterest</span>
            </a>

            <a
              href={mailtoUrl}
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white border border-[#E8D7B7] hover:border-[#B88732] hover:bg-[#B88732]/5 transition-all text-[#17345C] group"
              title="Share via Email"
            >
              <div className="w-8 h-8 rounded-full bg-[#B88732]/10 group-hover:bg-[#B88732] group-hover:text-white text-[#B88732] flex items-center justify-center transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium">Email</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FloatingProductShareButtonProps {
  product: ProductShareData;
  className?: string;
}

export const FloatingProductShareButton: React.FC<FloatingProductShareButtonProps> = ({ product, className = '' }) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`group fixed bottom-20 sm:bottom-8 left-4 sm:left-8 z-40 px-3.5 py-2.5 rounded-full bg-[#0B1330]/95 hover:bg-[#0B1330] text-[#F5E7A3] border-2 border-[#D4AF37] shadow-[0_8px_30px_rgba(11,19,48,0.35)] backdrop-blur-md flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer ${className}`}
        title={`Share ${product.title}`}
        aria-label={`Share ${product.title}`}
      >
        <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
          <Share2 className="w-3.5 h-3.5 text-[#F5E7A3]" />
        </div>
        <span className="text-xs font-bold font-mono tracking-wider uppercase pr-1">
          Share Design
        </span>
      </button>

      <ProductShareModal
        product={product}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </>
  );
};
