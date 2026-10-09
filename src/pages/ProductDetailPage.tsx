import React, { useState, useEffect, useRef } from 'react';
import { PageId, Product } from '../types';

import { TurntableSimulator } from '../components/TurntableSimulator';
import {
  ShoppingBag,
  Heart,
  Sparkles,
  Check,
  Layers,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileCode2,
  Printer,
  Sliders,
  Zap,
  Clock,
  Star,
  ArrowLeft,
  Download,
  Package,
  BadgeCheck,
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';
import { LazyImage } from '../components/motion/LazyImage';
import { SkeletonShimmer } from '../components/motion/SkeletonShimmer';

import { api } from '../services/api';
import { OTPVerificationModal } from '../components/delivery/OTPVerificationModal';
import { PaymentGatewayModal } from '../components/payment/PaymentGatewayModal';
import { useAuth } from '../context/AuthContext';
import { getOptimizedImageUrl, handleImgError } from '../utils/imageHelper';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (page: PageId, extraId?: string) => void;
  onAddToCart: (product: Product, license: 'standard' | 'commercial') => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  onNavigate,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
}) => {
  const { requireAuth, isLoggedIn, user } = useAuth();
  const [selectedLicense, setSelectedLicense] = useState<'standard' | 'commercial'>('standard');
  const [activeTab, setActiveTab] = useState<'specs' | 'casting' | 'layers'>('specs');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);

  const [otpModalState, setOtpModalState] = useState<{
    isOpen: boolean;
    purchaseId: number;
    productTitle: string;
    maskedEmail: string;
    userEmail?: string;
    debugOtp?: string;
  }>({
    isOpen: false,
    purchaseId: 0,
    productTitle: '',
    maskedEmail: '',
    userEmail: '',
    debugOtp: '',
  });

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [uploadedFilesList, setUploadedFilesList] = useState<{ id: number; file_type: string; file_url?: string }[]>([]);

  useEffect(() => {
    if (!productId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);

    api.getProductBySlug(productId)
      .then((res) => {
        if (res && (res.title || res.id)) {
          const extractedImgs: string[] = (res.images || [])
            .map((img: any) => {
              if (!img) return null;
              let url = typeof img === 'string' ? img : (img.image_url || img.image);
              if (url && typeof url === 'string') {
                if (url.startsWith('/media/')) {
                  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                    return url;
                  }
                  return `http://localhost:8000${url}`;
                }
                return url.trim();
              }
              return null;
            })
            .filter((url: any): url is string => Boolean(url && url.length > 0));

          const primaryUrl = res.primary_image || extractedImgs[0] || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80';
          const galleryImgs = extractedImgs.length > 0 ? extractedImgs : [primaryUrl];

          const rawSpecs = res.specs || {};
          const metalGrams = (res.metal_weight_grams !== null && res.metal_weight_grams !== undefined && res.metal_weight_grams !== '')
            ? Number(res.metal_weight_grams)
            : (rawSpecs.metalWeight18k && rawSpecs.metalWeight18k !== 'undefined' ? parseFloat(rawSpecs.metalWeight18k) : null);

          const hasValidMetalWeight = metalGrams !== null && !isNaN(metalGrams) && metalGrams > 0;
          const metalWeight18k = hasValidMetalWeight
            ? `${metalGrams.toFixed(2)} gm`
            : (rawSpecs.metalWeight18k && rawSpecs.metalWeight18k !== 'undefined' ? rawSpecs.metalWeight18k : undefined);

          const metalWeight14k = hasValidMetalWeight
            ? `${(metalGrams * 0.84).toFixed(2)} gm`
            : (rawSpecs.metalWeight14k && rawSpecs.metalWeight14k !== 'undefined' ? rawSpecs.metalWeight14k : undefined);

          const metalWeightPlatinum = hasValidMetalWeight
            ? `${(metalGrams * 1.32).toFixed(2)} gm`
            : (rawSpecs.metalWeightPlatinum && rawSpecs.metalWeightPlatinum !== 'undefined' ? rawSpecs.metalWeightPlatinum : undefined);

          const metalWeightSilver = hasValidMetalWeight
            ? `${(metalGrams * 0.66).toFixed(2)} gm`
            : (rawSpecs.metalWeightSilver && rawSpecs.metalWeightSilver !== 'undefined' ? rawSpecs.metalWeightSilver : undefined);

          const rawStones = (res.stone_count !== null && res.stone_count !== undefined && res.stone_count !== '')
            ? Number(res.stone_count)
            : (rawSpecs.diamondCount !== undefined && rawSpecs.diamondCount !== 'undefined' ? Number(rawSpecs.diamondCount) : undefined);

          const diamondCount = (rawStones !== undefined && !isNaN(rawStones)) ? rawStones : 0;
          const dimensions = rawSpecs.dimensions || rawSpecs.fingerSize || '';
          const tolerance = rawSpecs.tolerance || '±0.01 mm';

          const fileTypesList: string[] = (res.files && res.files.length > 0)
            ? Array.from(new Set(res.files.map((f: any) => String(f.file_type).toUpperCase())))
            : (res.formats_available && res.formats_available.length > 0
                ? res.formats_available.map((f: string) => f.toUpperCase())
                : []);

          const formatted: Product = {
            id: res.slug || String(res.id),
            dbId: res.id,
            sku: res.sku || (res.id ? `SKU-${res.id}` : undefined),
            title: res.title,
            category: typeof res.category === 'object' ? (res.category?.name || 'Jewellery') : (res.category || 'Jewellery'),
            subcategory: res.category?.parent_name || '',
            price: Number(res.price) || 0,
            originalPrice: res.compare_at_price ? Number(res.compare_at_price) : undefined,
            formats: fileTypesList,
            images: galleryImgs,
            primaryImage: primaryUrl,
            description: res.description || '',
            shortDescription: res.description ? res.description.slice(0, 120) + '...' : '',
            tags: res.style_tags ? res.style_tags.map((s: any) => typeof s === 'string' ? s : s.name) : [],
            rating: typeof res.rating === 'number' ? res.rating : 0,
            reviewsCount: typeof res.reviews_count === 'number' ? res.reviews_count : 0,
            isBestseller: Boolean(res.is_bestseller),
            isNew: Boolean(res.is_new),
            uploadedByName: res.uploaded_by_name || 'Studio Modeller',
            uploadedByAvatar: res.uploaded_by_avatar || undefined,
            specs: {
              ...rawSpecs,
              metalWeight18k,
              metalWeight14k,
              metalWeightPlatinum,
              metalWeightSilver,
              diamondCount,
              diamondTotalWeight: rawSpecs.diamondTotalWeight || (diamondCount > 0 ? `${(diamondCount * 0.03).toFixed(2)} ct est.` : undefined),
              dimensions: dimensions,
              tolerance: tolerance,
              settingType: rawSpecs.settingType,
              minimumWallThickness: rawSpecs.minimumWallThickness,
              fingerSize: rawSpecs.fingerSize || dimensions,
            },
            castingTips: res.casting_tips || undefined,
          };
          setProduct(formatted);
          if (res.files) setUploadedFilesList(res.files);

          // Fetch related products
          const catId = typeof res.category === 'object' ? (res.category?.slug || res.category?.id) : res.category;
          if (catId) {
            api.getProducts({ category: String(catId) }).then((relRes) => {
              const list = Array.isArray(relRes) ? relRes : (relRes?.results || []);
              const mapped: Product[] = list
                .filter((p: any) => (p.slug || String(p.id)) !== (res.slug || String(res.id)))
                .slice(0, 4)
                .map((p: any) => ({
                  id: p.slug || String(p.id),
                  dbId: p.id,
                  title: p.title,
                  category: p.category_name || (typeof p.category === 'object' ? p.category?.name : 'Jewellery'),
                  price: Number(p.price) || 0,
                  primaryImage: p.primary_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
                  formats: ['3DM', 'STL'],
                  images: [p.primary_image || ''],
                  description: '',
                  tags: [],
                }));
              setRelatedProducts(mapped);
            }).catch(() => {});
          }
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  const currentPriceUSD = product
    ? selectedLicense === 'commercial'
      ? Math.round(product.price * 1.8)
      : product.price
    : 0;

  const currentPrice = currentPriceUSD;
  const currentPriceINR = Math.round(currentPriceUSD * 84);
  const originalPriceINR = product?.originalPrice ? Math.round(product.originalPrice * 84) : 0;

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleBuyNow = () => {
    if (!product) return;
    requireAuth(() => {
      setIsPaymentModalOpen(true);
    }, {
      intent: 'purchase',
      message: 'Sign in to purchase this CAD file & unlock secure download',
      productId: product.id,
    });
  };

  const handlePaymentSuccess = async (paymentResult: any) => {
    if (!product) return;
    if (!isLoggedIn || !user) {
      setIsPaymentModalOpen(false);
      requireAuth(() => {}, {
        intent: 'purchase',
        message: 'Sign in to complete your purchase & register your CAD license token.',
        productId: product.id,
      });
      return;
    }

    const recipientEmail = user.email || 'shahharshil3103@gmail.com';

    if (paymentResult?.isPendingVerification) {
      // Proof submitted; admin will confirm and enable download in dashboard
      return;
    }

    setPurchasing(true);
    try {
      const res = await api.post<any>('/payments/purchases/', {
        product_id: product.dbId || product.id,
        license_type: selectedLicense === 'commercial' ? 'commercial' : 'atelier',
        payment_transaction_id: paymentResult.transactionId,
      });

      setIsPaymentModalOpen(false);
      setOtpModalState({
        isOpen: true,
        purchaseId: res.purchase_id,
        productTitle: product.title,
        maskedEmail: res.masked_email || recipientEmail.replace(/(.{2})(.*)(?=@)/, '$1***'),
        userEmail: recipientEmail,
      });
    } catch (err: any) {
      console.error('Purchase initiation failed:', err);
    } finally {
      setPurchasing(false);
    }
  };


  // Staggered load-in animation trigger

  useEffect(() => {
    setLoaded(false);
    const t = setTimeout(() => setLoaded(true), 60);
    return () => clearTimeout(t);
  }, [productId]);

  // Reset image index on product change
  useEffect(() => {
    setActiveImageIdx(0);
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] text-[#17243B] pt-28 pb-32 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1600px] mx-auto">
        <SkeletonShimmer variant="product-detail" />
      </div>
    );
  }

  // Product not found state
  if (!product || notFound) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] text-[#17243B] flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 mx-auto rounded-full bg-[#FFF9F0] border border-[#E8D7B7] flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-[#B88732]" />
          </div>
          <h2 className="font-serif text-3xl text-[#17345C]">Design Not Found</h2>
          <p className="text-sm text-[#687386] leading-relaxed">
            This CAD file may have been archived or the link is invalid.
          </p>
          <button
            onClick={() => onNavigate('collections')}
            className="btn-gold-luxury px-8 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider inline-flex items-center gap-2 shadow-md"
          >
            <ArrowLeft className="w-4 h-4 text-[#17345C]" />
            Browse All Collections
          </button>
        </div>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [product.primaryImage];

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${
          i < Math.round(rating) ? 'text-[#B88732] fill-[#B88732]' : 'text-slate-200'
        }`}
      />
    ));

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#17243B] pt-28 pb-32 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="max-w-[1600px] mx-auto space-y-14">

        {/* Breadcrumb */}
        <nav
          className={`flex items-center gap-2 text-xs text-[#687386] transition-all duration-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
        >
          <button onClick={() => onNavigate('home')} className="hover:text-[#B88732] transition-colors">Home</button>
          <ChevronRight className="w-3 h-3 text-[#D9B66F]" />
          <button onClick={() => onNavigate('collections')} className="hover:text-[#B88732] transition-colors">CAD Collections</button>
          <ChevronRight className="w-3 h-3 text-[#D9B66F]" />
          <span className="text-[#17345C] capitalize font-medium">{product.category}</span>
          <ChevronRight className="w-3 h-3 text-[#D9B66F]" />
          <span className="text-[#B88732] font-semibold truncate max-w-[180px] sm:max-w-[300px]">{product.title}</span>
        </nav>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* Left Column: Gallery (7 cols) */}
          <div
            className={`lg:col-span-7 space-y-5 transition-all duration-700 ${loaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
            style={{ transitionDelay: '80ms' }}
          >
            {/* Interactive Turntable */}
            <TurntableSimulator images={images} title={product.title} activeImageIdx={activeImageIdx} />

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 bg-[#FFF9F0] ${
                      activeImageIdx === idx
                        ? 'border-[#B88732] shadow-[0_0_12px_rgba(184,135,50,0.3)]'
                        : 'border-[#E8D7B7] hover:border-[#B88732]/60'
                    }`}
                  >
                    <img
                      src={getOptimizedImageUrl(img, product.category)}
                      alt={`View ${idx + 1}`}
                      onError={(e) => handleImgError(e, product.category)}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* File Architecture */}
            <div className="p-5 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-wider text-[#17345C] font-semibold flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-[#B88732]" />
                  Included Digital Master Deliverables (.ZIP Package)
                </h4>
                {uploadedFilesList.length > 0 && (
                  <span className="text-[10px] font-mono text-[#236E6A] font-semibold">
                    {uploadedFilesList.length} Verified {uploadedFilesList.length === 1 ? 'Asset' : 'Assets'}
                  </span>
                )}
              </div>

              {uploadedFilesList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {uploadedFilesList.map((f: any) => {
                    const type = (f.file_type || '').toLowerCase();
                    const config: Record<string, { ext: string; label: string; color: string; note: string }> = {
                      '3dm': { ext: '.3DM', label: 'Rhino Native CAD', color: 'text-[#B88732]', note: 'Layered Cutters & Solids' },
                      'stl': { ext: '.STL', label: 'Watertight Mesh', color: 'text-[#17345C]', note: 'Direct Wax 3D Print' },
                      'render': { ext: 'Render', label: 'Studio Preview', color: 'text-purple-700', note: 'High-Res Presentation' },
                      'video': { ext: '360° Video', label: 'Turntable Video', color: 'text-[#236E6A]', note: 'Interactive Inspection' },
                      'zip': { ext: '.ZIP', label: 'Master Package', color: 'text-amber-700', note: 'All Production Files' },
                    };
                    const item = config[type] || {
                      ext: `.${type.toUpperCase()}`,
                      label: 'Production File',
                      color: 'text-[#17345C]',
                      note: 'Atelier Geometry',
                    };

                    return (
                      <div key={f.id} className="p-3 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] space-y-1">
                        <span className={`font-mono font-bold block ${item.color}`}>{item.ext}</span>
                        <span className="text-[10px] text-[#687386] block truncate" title={f.original_filename || item.label}>
                          {f.original_filename || item.label}
                        </span>
                        <span className="text-[9px] text-[#236E6A] block font-mono font-medium">
                          {f.file_size_mb ? `${f.file_size_mb} MB` : item.note}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-center text-xs text-[#687386] space-y-1">
                  <span className="text-[#B88732] font-semibold block">Production Package Being Prepared</span>
                  <p className="text-[11px] font-light">
                    Production CAD assets (.3DM, .STL) are verified directly by the studio atelier. Master assets unlocked instantly upon verified checkout.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pricing & Purchase (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24 self-start">

            {/* Header Block */}
            <div
              className={`space-y-3 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '140ms' }}
            >
              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[10px] uppercase font-mono tracking-wider text-[#17345C] font-semibold">
                  SKU: {product.sku || product.id.toUpperCase()}
                </span>
                {product.isBestseller && (
                  <span className="px-2.5 py-1 rounded-full bg-[#D9B66F] text-[#17345C] text-[10px] font-bold tracking-wider uppercase shadow-sm">
                    ★ Bestseller
                  </span>
                )}
                {product.isNew && (
                  <span className="px-2.5 py-1 rounded-full bg-[#17345C] text-white text-[10px] font-bold tracking-wider uppercase shadow-sm">
                    New Release
                  </span>
                )}
                <span className="ml-auto text-xs text-[#236E6A] font-mono font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Instant Delivery
                </span>
              </div>

              {/* Category Breadcrumb */}
              <div className="text-[11px] uppercase tracking-widest text-[#B88732] font-semibold">
                {product.category} {product.subcategory ? `/ ${product.subcategory}` : ''}
              </div>

              {/* Title */}
              <h1 className="font-serif text-3xl sm:text-4xl text-[#17345C] leading-snug">
                {product.title}
              </h1>

              {/* Star Rating & Modeller Attribution */}
              <div className="flex items-center gap-2 flex-wrap">
                {product.reviewsCount && product.reviewsCount > 0 ? (
                  <>
                    <div className="flex items-center gap-0.5">{renderStars(product.rating || 5)}</div>
                    <span className="text-xs text-[#687386]">
                      {(product.rating || 5).toFixed(1)} ({product.reviewsCount} atelier {product.reviewsCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-[#17345C] bg-[#FFF9F0] px-3 py-1 rounded-full border border-[#E8D7B7]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#B88732]" />
                    <span className="font-mono text-[11px] font-semibold">Atelier Certified Direct CAD Release</span>
                    {product.uploadedByName && (
                      <span className="text-[#687386] font-light">
                        • by <strong className="text-[#17345C] font-medium">{product.uploadedByName}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Short Description (Clamped to 4-5 lines with Read More / Read Less) */}
              {product.description && (
                <div className="space-y-2 pt-1">
                  <div
                    className={`text-xs sm:text-sm text-[#687386] leading-relaxed font-light transition-all relative ${
                      isDescriptionExpanded
                        ? 'max-h-none'
                        : 'line-clamp-4 sm:line-clamp-5 max-h-[6.5rem] overflow-hidden'
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">
                      {product.description}
                    </p>
                    {!isDescriptionExpanded && product.description.length > 200 && (
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FFFDF9] via-[#FFFDF9]/85 to-transparent pointer-events-none" />
                    )}
                  </div>

                  {product.description.length > 200 && (
                    <button
                      type="button"
                      onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                      className="text-xs font-semibold text-[#B88732] hover:text-[#17345C] inline-flex items-center gap-1.5 transition-colors cursor-pointer py-0.5 group/btn"
                    >
                      <span>{isDescriptionExpanded ? 'Read Less' : 'Read More...'}</span>
                      {isDescriptionExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 group-hover/btn:translate-y-0.5 transition-transform" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Key Spec Chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  product.specs.metalWeight18k
                    ? { icon: <Package className="w-3 h-3" />, label: `18K: ${product.specs.metalWeight18k}` }
                    : null,
                  product.specs.diamondCount !== undefined
                    ? {
                        icon: <Sparkles className="w-3 h-3" />,
                        label: product.specs.diamondCount > 0
                          ? `${product.specs.diamondCount} Stones`
                          : 'Solid Metal (0 Stones)',
                      }
                    : null,
                  product.specs.dimensions
                    ? { icon: <Sliders className="w-3 h-3" />, label: `Size/Dim: ${product.specs.dimensions}` }
                    : null,
                  product.formats && product.formats.length > 0
                    ? { icon: <Layers className="w-3 h-3" />, label: product.formats.join(' + ') }
                    : null,
                  product.specs.tolerance
                    ? { icon: <BadgeCheck className="w-3 h-3" />, label: `Tol: ${product.specs.tolerance}` }
                    : null,
                ]
                  .filter((chip): chip is { icon: React.ReactNode; label: string } => Boolean(chip && chip.label && !chip.label.includes('undefined')))
                  .map(({ icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E8D7B7] text-[11px] text-[#687386] shadow-sm"
                    >
                      <span className="text-[#B88732]">{icon}</span>
                      {label}
                    </span>
                  ))}
              </div>
            </div>

            {/* Price + Purchase Card */}
            <div
              className={`p-6 rounded-3xl bg-white border border-[#E8D7B7] shadow-xl space-y-5 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '200ms' }}
            >
              {/* Price */}
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-3xl sm:text-4xl font-serif font-bold text-[#17345C] tracking-tight">
                    ₹{currentPriceINR.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-[#687386] font-mono mt-0.5 block">
                    Instant Deliverables (.3DM + .STL + 4K Render Pack)
                  </span>
                </div>
                {product.originalPrice && (
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm text-[#687386] line-through block font-mono">
                      ₹{originalPriceINR.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase tracking-wider font-bold inline-block mt-0.5">
                      Save ₹{(originalPriceINR - currentPriceINR).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handleBuyNow}
                  disabled={purchasing}
                  className="w-full py-4 rounded-xl btn-gold-luxury text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#17345C]" />
                  <span>{purchasing ? 'Initiating Secure Purchase...' : `Buy Now & Verify OTP — ₹${currentPriceINR.toLocaleString('en-IN')}`}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => onAddToCart(product, selectedLicense)}
                    className="flex-1 py-3 rounded-xl border border-[#17345C] text-xs font-semibold uppercase text-[#17345C] hover:bg-[#17345C] hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#B88732]" />
                    <span>Add to Bag</span>
                  </button>
                  <button
                    onClick={() => onToggleWishlist(product)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer shadow-sm ${
                      isWishlisted
                        ? 'border-[#B88732] bg-[#FFF9F0] text-[#B88732]'
                        : 'border-[#E8D7B7] text-[#687386] hover:border-[#B88732] hover:text-[#B88732] bg-white'
                    }`}
                    title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <button
                  onClick={() => onNavigate('custom-design', product.id)}
                  className="w-full py-3 rounded-xl border border-[#E8D7B7] bg-[#FFF9F0] text-xs text-[#17345C] font-medium hover:border-[#D9B66F] hover:bg-white transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#B88732] group-hover:animate-pulse" />
                  <span>Request Custom Modification (Resize, Prong Tweak, Gem Swap)</span>
                </button>
              </div>

              {/* Trust Strip */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#E8D7B7] text-[11px] text-[#687386]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B88732] flex-shrink-0" />
                  <span>Watertight Mesh Guarantee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#B88732] flex-shrink-0" />
                  <span>Instant ZIP Download</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-[#B88732] flex-shrink-0" />
                  <span>Secure Payment Gateway</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-[#B88732] flex-shrink-0" />
                  <span>MatrixGold / Rhino 7/8</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specs Tabs */}
        <div
          className={`rounded-3xl bg-white border border-[#E8D7B7] overflow-hidden shadow-sm transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '300ms' }}
        >
          {/* Tab Header */}
          <div className="relative flex border-b border-[#E8D7B7] px-6 pt-6 overflow-x-auto bg-[#FFF9F0]">
            {(
              [
                { id: 'specs' as const, label: 'Manufacturing & Metal Specs' },
                { id: 'casting' as const, label: 'Casting & 3D Print Guide' },
                { id: 'layers' as const, label: 'Layer Structure & Software' },
              ]
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative pb-4 mr-6 text-xs sm:text-sm font-serif tracking-wider transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  activeTab === id ? 'text-[#17345C] font-semibold' : 'text-[#687386] hover:text-[#17345C]'
                }`}
              >
                {label}
                {activeTab === id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#B88732] via-[#D9B66F] to-[#B88732] rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8 bg-white">
            {/* Specs Tab */}
            {activeTab === 'specs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                {/* 1. Metal Weights Card */}
                <div className="space-y-3 p-4 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7]">
                  <h5 className="font-serif text-sm text-[#17345C] font-semibold border-b border-[#E8D7B7] pb-2">
                    Estimated Metal Weights
                  </h5>
                  <div className="space-y-1.5 text-[#687386]">
                    {product.specs.metalWeight18k ? (
                      <>
                        <div className="flex justify-between gap-2">
                          <span className="shrink-0">18K Yellow/Rose/White Gold:</span>
                          <strong className="text-[#17345C] text-right">{product.specs.metalWeight18k}</strong>
                        </div>
                        {product.specs.metalWeight14k && (
                          <div className="flex justify-between gap-2">
                            <span className="shrink-0">14K Yellow/White Gold:</span>
                            <strong className="text-[#17345C] text-right">{product.specs.metalWeight14k}</strong>
                          </div>
                        )}
                        {product.specs.metalWeightPlatinum && (
                          <div className="flex justify-between gap-2">
                            <span className="shrink-0">Platinum (PT950):</span>
                            <strong className="text-[#17345C] text-right">{product.specs.metalWeightPlatinum}</strong>
                          </div>
                        )}
                        {product.specs.metalWeightSilver && (
                          <div className="flex justify-between gap-2">
                            <span className="shrink-0">Sterling Silver 925:</span>
                            <strong className="text-[#17345C] text-right">{product.specs.metalWeightSilver}</strong>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-slate-400 italic py-2">
                        Metal weight not specified by uploader
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Gemstones Card */}
                <div className="space-y-3 p-4 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7]">
                  <h5 className="font-serif text-sm text-[#17345C] font-semibold border-b border-[#E8D7B7] pb-2">
                    Gemstone &amp; Setting Geometry
                  </h5>
                  <div className="space-y-1.5 text-[#687386]">
                    <div className="flex justify-between gap-2">
                      <span className="shrink-0">Total Gemstones:</span>
                      <strong className="text-[#17345C] text-right">
                        {product.specs.diamondCount !== undefined
                          ? (product.specs.diamondCount === 0 ? '0 (Solid Metal Only)' : product.specs.diamondCount)
                          : '0 (Solid Metal Only)'}
                      </strong>
                    </div>
                    {product.specs.diamondCount && product.specs.diamondCount > 0 ? (
                      <>
                        <div className="flex justify-between gap-2">
                          <span className="shrink-0">Estimated Total Carat:</span>
                          <strong className="text-[#17345C] text-right">{product.specs.diamondTotalWeight || '—'}</strong>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="shrink-0">Setting Style:</span>
                          <strong className="text-[#17345C] text-right">{product.specs.settingType || 'Pre-Notched Seats'}</strong>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="shrink-0">Stone Seat Angle:</span>
                          <strong className="text-[#17345C] text-right">42° Pre-Notched</strong>
                        </div>
                      </>
                    ) : (
                      <div className="text-[#236E6A] text-[11px] py-1 font-medium">
                        ✓ Metal-only model — no gemstone seats, prongs, or micro-pavé required.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Dimensions & Tolerances */}
                <div className="space-y-3 p-4 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7]">
                  <h5 className="font-serif text-sm text-[#17345C] font-semibold border-b border-[#E8D7B7] pb-2">
                    Dimensions &amp; Tolerances
                  </h5>
                  <div className="space-y-1.5 text-[#687386]">
                    <div className="flex justify-between gap-2">
                      <span className="shrink-0">Manufacturing Tolerance:</span>
                      <strong className="text-[#17345C] text-right">{product.specs.tolerance || '±0.01 mm'}</strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="shrink-0">Ring Size / Dimensions:</span>
                      <strong className="text-[#17345C] text-right">{product.specs.dimensions || product.specs.fingerSize || 'Standard'}</strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="shrink-0">Mesh Topology:</span>
                      <strong className="text-[#17345C] text-right">Watertight Manifold</strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="shrink-0">Quality Control:</span>
                      <strong className="text-[#236E6A] text-right font-medium">Pre-checked for Casting</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Casting Tab */}
            {activeTab === 'casting' && (
              <div className="space-y-5 text-xs">
                {product.castingTips ? (
                  <div className="p-4 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] space-y-2">
                    <div className="flex items-center gap-2 text-[#17345C] font-serif font-bold text-sm">
                      <Zap className="w-4 h-4 text-[#B88732]" />
                      <span>Modeller's Production &amp; Casting Notes</span>
                    </div>
                    <p className="text-[#17345C] text-xs leading-relaxed whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-[#E8D7B7]">
                      {product.castingTips}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-[11px] text-[#687386] italic">
                    Standard studio casting protocols apply to this piece.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      icon: <Printer className="w-5 h-5 text-[#B88732]" />,
                      title: '3D Wax Resin Printing',
                      body: 'Optimal layer height: 25 microns (0.025mm) on DLP/SLA castable resin machines (Asiga, EnvisionTEC, Formlabs Castable Wax 40). Zero supports required inside stone seats.',
                    },
                    {
                      icon: <Sliders className="w-5 h-5 text-[#17345C]" />,
                      title: 'Shrinkage Compensation',
                      body: 'This file contains an integrated +1.25% radial scale to offset the cumulative shrinkage of wax printing, investment expansion, and molten metal cooling.',
                    },
                    {
                      icon: <Zap className="w-5 h-5 text-[#236E6A]" />,
                      title: 'Sprue Attachment Point',
                      body: 'Recommended main sprue gauge: 2.0mm–2.5mm attached to the thickest portion of the bottom shank or main pendant bail to prevent porosity.',
                    },
                  ].map(({ icon, title, body }) => (
                    <div key={title} className="p-4 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] space-y-2 text-[#687386] leading-relaxed">
                      {icon}
                      <h5 className="font-serif text-sm text-[#17345C] font-semibold">{title}</h5>
                      <p>{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Layers Tab */}
            {activeTab === 'layers' && (
              <div className="space-y-4">
                <p className="text-xs text-[#687386]">
                  The master Rhino .3DM file is grouped onto standard CAD studio layers for easy customisation:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  {[
                    { name: 'Layer: 01_Metal_Body', desc: 'Closed PolySurface', color: 'text-[#B88732]' },
                    { name: 'Layer: 02_Prongs_Collets', desc: 'Independent Editable Solids', color: 'text-[#17345C]' },
                    { name: 'Layer: 03_Gemstones', desc: 'Parametric Gem Curves', color: 'text-amber-700' },
                    { name: 'Layer: 04_Boolean_Cutters', desc: 'Pre-aligned for bench customisation', color: 'text-rose-700' },
                    { name: 'Layer: 05_Sprue_Points', desc: 'Casting attachment geometry', color: 'text-[#236E6A]' },
                    { name: 'Layer: 06_Reference_Dims', desc: 'Locked annotation dims', color: 'text-purple-700' },
                  ].map(({ name, desc, color }) => (
                    <div key={name} className="p-2.5 rounded-lg bg-[#FFF9F0] border border-[#E8D7B7] flex justify-between items-center gap-2">
                      <span className={color}>{name}</span>
                      <span className="text-[#687386] text-right">{desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#687386] pt-1">
                  Compatible with Rhino 6, Rhino 7, Rhino 8, MatrixGold, JewelCAD, Blender, and ZBrush.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        <div
          className={`space-y-6 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '420ms' }}
        >
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-[#B88732] font-semibold block mb-1">
                More in {product.category}
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#17345C]">Ateliers Also Acquired</h3>
            </div>
            <button
              onClick={() => onNavigate('collections')}
              className="hidden sm:flex items-center gap-1 text-xs text-[#B88732] hover:text-[#17345C] transition-colors font-serif italic cursor-pointer"
            >
              Explore Collection <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedProducts.map((relProd, index) => (
              <StaggerItem key={relProd.id} index={index}>
                <div
                  onClick={() => onNavigate('product-detail', relProd.id)}
                  className="group bg-white border border-[#E8D7B7] hover:border-[#D9B66F] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col h-full"
                >
                  <div className="aspect-square relative overflow-hidden bg-[#FFF9F0]">
                    <LazyImage
                      src={relProd.primaryImage}
                      alt={relProd.title}
                      className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md border border-[#E8D7B7] text-[10px] font-semibold text-[#17345C] shadow-sm">
                      ${relProd.price}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-[#B88732] uppercase tracking-widest block mb-1">
                        {relProd.category}
                      </span>
                      <h4 className="font-serif text-sm font-semibold text-[#17345C] group-hover:text-[#B88732] transition-colors line-clamp-1">
                        {relProd.title}
                      </h4>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#E8D7B7]/50 flex items-center justify-between text-xs text-[#687386]">
                      <span className="font-mono text-[11px] text-[#236E6A]">Rhino .3DM</span>
                      <span className="text-[#B88732] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        View <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>

      </div>

      {/* Mobile Sticky Add-to-Cart Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white/95 backdrop-blur-xl border-t border-[#E8D7B7] px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#FFF9F0] border border-[#E8D7B7] flex-shrink-0">
            <LazyImage
              src={product.primaryImage}
              alt={product.title}
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-serif text-[#17345C] truncate">{product.title}</div>
            <div className="text-sm font-bold text-[#17345C] font-serif">₹{currentPriceINR.toLocaleString('en-IN')}</div>
          </div>
          <button
            onClick={handleBuyNow}
            disabled={purchasing}
            className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 shadow-md cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#17345C]" />
            Buy Now
          </button>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={product.title}
        subtitle={`${selectedLicense === 'commercial' ? 'Commercial Production License' : 'Standard Atelier License'} • Layered 3DM + STL Meshes`}
        amount={currentPrice}
        currency="USD"
        itemType="ready_cad"
        orderDetails={{
          id: product.id,
          category: typeof product.category === 'string' ? product.category : (product.category as any)?.name,
          license: selectedLicense,
          formats: product.formats,
        }}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={otpModalState.isOpen}
        onClose={() => setOtpModalState(prev => ({ ...prev, isOpen: false }))}
        purchaseId={otpModalState.purchaseId}
        productTitle={otpModalState.productTitle}
        maskedEmail={otpModalState.maskedEmail}
        userEmail={otpModalState.userEmail}
        debugOtp={otpModalState.debugOtp}
        onVerifiedSuccess={() => {
          setOtpModalState(prev => ({ ...prev, isOpen: false }));
          onNavigate('account');
        }}
      />
    </div>
  );
};

