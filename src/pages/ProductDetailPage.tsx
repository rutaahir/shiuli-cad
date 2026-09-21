import React, { useState, useEffect, useRef } from 'react';
import { PageId, Product } from '../types';
import { PRODUCTS } from '../data/mockData';
import { TurntableSimulator } from '../components/TurntableSimulator';
import {
  ShoppingBag,
  Heart,
  Sparkles,
  Check,
  Layers,
  ShieldCheck,
  ChevronRight,
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
import { useAuth } from '../context/AuthContext';

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
  const { requireAuth } = useAuth();
  const [selectedLicense, setSelectedLicense] = useState<'standard' | 'commercial'>('standard');
  const [activeTab, setActiveTab] = useState<'specs' | 'casting' | 'layers'>('specs');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);

  const [otpModalState, setOtpModalState] = useState<{
    isOpen: boolean;
    purchaseId: number;
    productTitle: string;
    maskedEmail: string;
  }>({
    isOpen: false,
    purchaseId: 0,
    productTitle: '',
    maskedEmail: '',
  });


  // Live product state initialized with mock fallback
  const mockFallback = PRODUCTS.find(
    (p) => p.id === productId || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === productId?.toLowerCase()
  ) || PRODUCTS[0];

  const [liveProduct, setLiveProduct] = useState<Product | null>(mockFallback);
  const [uploadedFilesList, setUploadedFilesList] = useState<{ id: number; file_type: string; file_url?: string }[]>([]);

  useEffect(() => {
    if (productId) {
      api.getProductBySlug(productId).then((res) => {
        if (res && res.title) {
          const extractedImgs: string[] = (res.images || [])
            .map((img: any) => {
              if (!img) return null;
              let url = typeof img === 'string' ? img : (img.image_url || img.image);
              if (url && typeof url === 'string') {
                if (url.startsWith('/media/')) {
                  return `http://localhost:8000${url}`;
                }
                return url.trim();
              }
              return null;
            })
            .filter((url: any): url is string => Boolean(url && url.length > 0));

          const fallbackImgs = mockFallback?.images && mockFallback.images.length > 0
            ? mockFallback.images
            : ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80'];

          const galleryImgs = extractedImgs.length > 0 ? extractedImgs : fallbackImgs;

          const formatted: Product = {
            id: res.slug || String(res.id),
            dbId: res.id,
            title: res.title,
            category: res.category?.name || 'Rings',
            subcategory: res.category?.parent_name || '',
            price: Number(res.price) || 79,
            originalPrice: res.compare_at_price ? Number(res.compare_at_price) : undefined,
            formats: res.files && res.files.length > 0
              ? Array.from(new Set(res.files.map((f: any) => f.file_type.toUpperCase())))
              : ['3DM', 'STL', 'Render'],
            images: galleryImgs,
            primaryImage: galleryImgs[0],
            description: res.description || '',
            shortDescription: 'High precision 3DM + STL CAD model.',
            tags: res.style_tags ? res.style_tags.map((s: any) => s.name) : ['New Release'],
            rating: 5.0,
            reviewsCount: 1,
            isBestseller: res.is_bestseller,
            isNew: res.is_new,
            specs: {
              metalWeight18k: res.metal_weight_grams ? `${res.metal_weight_grams} gm` : '14.20 gm',
              metalWeight14k: '11.80 gm',
              diamondCount: res.stone_count || 0,
              diamondTotalWeight: '1.45 ct',
              dimensions: '22 x 18 mm',
              meshTriangles: '480,000',
              tolerance: '0.01 mm',
            },
          };
          setLiveProduct(formatted);
          if (res.files) setUploadedFilesList(res.files);
        }
      }).catch(() => {});
    }
  }, [productId]);

  const product = liveProduct || mockFallback;

  // Related: same category, different product
  const getCatStr = (cat: any) => typeof cat === 'string' ? cat : (cat?.name || cat?.slug || '');
  const relatedProducts = product
    ? PRODUCTS.filter((p) => getCatStr(p.category).toLowerCase() === getCatStr(product.category).toLowerCase() && p.id !== product.id).slice(0, 4)
    : PRODUCTS.slice(0, 4);

  const currentPrice = product
    ? selectedLicense === 'commercial'
      ? Math.round(product.price * 1.8)
      : product.price
    : 0;

  const handleBuyNow = () => {
    requireAuth(async () => {
      setPurchasing(true);
      try {
        const res = await api.post<any>('/payments/purchases/', {
          product_id: product.dbId || product.id,
          license_type: selectedLicense === 'commercial' ? 'commercial' : 'atelier',
        });

        setOtpModalState({
          isOpen: true,
          purchaseId: res.purchase_id,
          productTitle: product.title,
          maskedEmail: res.masked_email,
        });
      } catch (err: any) {
        alert(err.response?.data?.error || err.message || 'Failed to initiate purchase.');
      } finally {
        setPurchasing(false);
      }
    }, {
      intent: 'purchase',
      message: 'Sign in to purchase this CAD file & unlock secure download',
      productId: product.id,
    });
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

  // Product not found state
  if (!product) {
    return (
      <div className="min-h-screen bg-[#0B1330] flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 mx-auto rounded-full bg-[#121F4D] border border-[#D4AF37]/30 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-[#D4AF37]" />
          </div>
          <h2 className="font-serif text-3xl text-[#FAF8F3]">Design Not Found</h2>
          <p className="text-sm text-[#C9C2A6] leading-relaxed">
            This CAD file may have been archived or the link is invalid.
          </p>
          <button
            onClick={() => onNavigate('collections')}
            className="btn-gold-luxury px-8 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-[#0B1330]" />
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
          i < Math.round(rating) ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#3A3320]'
        }`}
      />
    ));

  return (
    <div className="min-h-screen bg-[#0B1330] text-[#F5F1E8] pt-28 pb-32 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="max-w-[1600px] mx-auto space-y-14">

        {/* Breadcrumb */}
        <nav
          className={`flex items-center gap-2 text-xs text-[#C9C2A6] transition-all duration-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
        >
          <button onClick={() => onNavigate('home')} className="hover:text-[#D4AF37] transition-colors">Home</button>
          <ChevronRight className="w-3 h-3 text-[#D4AF37]/50" />
          <button onClick={() => onNavigate('collections')} className="hover:text-[#D4AF37] transition-colors">CAD Collections</button>
          <ChevronRight className="w-3 h-3 text-[#D4AF37]/50" />
          <span className="text-[#F5E7A3] capitalize">{product.category}</span>
          <ChevronRight className="w-3 h-3 text-[#D4AF37]/50" />
          <span className="text-[#FAF8F3] truncate max-w-[180px] sm:max-w-[300px]">{product.title}</span>
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
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      activeImageIdx === idx
                        ? 'border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                        : 'border-white/10 hover:border-[#D4AF37]/40'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`View ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* File Architecture */}
            <div className="p-5 rounded-2xl bg-[#080E24] border border-[#D4AF37]/20 space-y-4">
              <h4 className="text-xs uppercase tracking-wider text-[#F5E7A3] font-semibold flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-[#D4AF37]" />
                Included Digital Master Deliverables (.ZIP Package)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { ext: '.3DM', label: 'Rhino 7/8 Native', note: 'Layered Cutters', color: 'text-[#D4AF37]' },
                  { ext: '.STL', label: 'Watertight Solid', note: 'Direct Wax Print', color: 'text-[#7EACFC]' },
                  { ext: '.OBJ', label: 'Universal Mesh', note: 'KeyShot Ready', color: 'text-amber-300' },
                  { ext: '4K PNG', label: 'Studio Lighting', note: 'Client Approval', color: 'text-purple-300' },
                ].map(({ ext, label, note, color }) => (
                  <div key={ext} className="p-3 rounded-xl bg-[#0B1330] border border-white/5 space-y-1">
                    <span className={`font-mono font-bold block ${color}`}>{ext}</span>
                    <span className="text-[10px] text-[#C9C2A6] block">{label}</span>
                    <span className="text-[9px] text-emerald-400 block">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Purchase (5 cols) */}
          <div className="lg:col-span-5 space-y-5">

            {/* Header Block */}
            <div
              className={`space-y-3 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '140ms' }}
            >
              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-[#121F4D] border border-[#D4AF37]/30 text-[10px] uppercase font-mono tracking-wider text-[#F5E7A3]">
                  SKU: {product.sku || product.id.toUpperCase()}
                </span>
                {product.isBestseller && (
                  <span className="px-2.5 py-1 rounded-full bg-[#D4AF37] text-[#0B1330] text-[10px] font-bold tracking-wider uppercase">
                    ★ Bestseller
                  </span>
                )}
                {product.isNew && (
                  <span className="px-2.5 py-1 rounded-full bg-[#1E4FA3] text-white text-[10px] font-bold tracking-wider uppercase">
                    New Release
                  </span>
                )}
                <span className="ml-auto text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Instant Delivery
                </span>
              </div>

              {/* Category Breadcrumb */}
              <div className="text-[11px] uppercase tracking-widest text-[#D4AF37] font-semibold">
                {product.category} / {product.subcategory}
              </div>

              {/* Title */}
              <h1 className="font-serif text-3xl sm:text-4xl text-[#FAF8F3] leading-snug">
                {product.title}
              </h1>

              {/* Star Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">{renderStars(product.rating)}</div>
                <span className="text-xs text-[#C9C2A6]">
                  {product.rating.toFixed(1)} ({product.reviewsCount} atelier reviews)
                </span>
              </div>

              {/* Short Description */}
              <p className="text-xs sm:text-sm text-[#C9C2A6] leading-relaxed font-light">
                {product.description}
              </p>

              {/* Key Spec Chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: <Package className="w-3 h-3" />, label: `18K: ${product.specs.metalWeight18k}` },
                  { icon: <Sparkles className="w-3 h-3" />, label: `${product.specs.diamondCount} Stones` },
                  { icon: <Layers className="w-3 h-3" />, label: product.formats.join(' + ') },
                  { icon: <BadgeCheck className="w-3 h-3" />, label: 'Watertight STL' },
                ].map(({ icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121F4D] border border-[#D4AF37]/20 text-[11px] text-[#C9C2A6]"
                  >
                    <span className="text-[#D4AF37]">{icon}</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Price + Purchase Card */}
            <div
              className={`p-5 rounded-2xl bg-[#080E24] border border-[#D4AF37]/25 space-y-5 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '200ms' }}
            >
              {/* Price */}
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-4xl font-serif font-bold text-[#F5E7A3]">
                    ₹{product.price.toFixed(0)} INR
                  </div>
                </div>
                {product.originalPrice && (
                  <div className="text-right">
                    <span className="text-sm text-[#C9C2A6] line-through block">
                      ₹{product.originalPrice.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
                      Save ₹{(product.originalPrice - product.price).toFixed(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handleBuyNow}
                  disabled={purchasing}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(212,175,55,0.35)] hover:shadow-[0_8px_40px_rgba(212,175,55,0.5)] transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-zinc-950" />
                  <span>{purchasing ? 'Initiating Secure Purchase...' : `Buy Now & Verify OTP — ₹${currentPrice.toFixed(0)} INR`}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => onAddToCart(product, selectedLicense)}
                    className="flex-1 py-3 rounded-xl border border-[#D4AF37]/40 text-xs font-semibold uppercase text-[#F5E7A3] hover:bg-[#D4AF37]/10 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                    <span>Add to Bag</span>
                  </button>
                  <button
                    onClick={() => onToggleWishlist(product)}
                    className={`p-3 rounded-xl border transition-all ${
                      isWishlisted
                        ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                        : 'border-white/20 text-[#C9C2A6] hover:border-[#D4AF37]/50 hover:text-[#D4AF37]'
                    }`}
                    title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <button
                  onClick={() => onNavigate('custom-design', product.id)}
                  className="w-full py-3 rounded-xl border border-[#D4AF37]/30 text-xs text-[#FAF8F3] hover:border-[#D4AF37] hover:bg-[#121F4D]/40 transition-all flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] group-hover:animate-pulse" />
                  <span>Request Custom Modification (Resize, Prong Tweak, Gem Swap)</span>
                </button>
              </div>

              {/* Trust Strip */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-[11px] text-[#C9C2A6]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                  <span>Watertight Mesh Guarantee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                  <span>Instant ZIP Download</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                  <span>Secure Payment Gateway</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                  <span>MatrixGold / Rhino 7/8</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specs Tabs */}
        <div
          className={`rounded-3xl bg-[#080E24] border border-[#D4AF37]/20 overflow-hidden transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '300ms' }}
        >
          {/* Tab Header */}
          <div className="relative flex border-b border-[#D4AF37]/20 px-6 pt-6 overflow-x-auto">
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
                className={`relative pb-4 mr-6 text-xs sm:text-sm font-serif tracking-wider transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === id ? 'text-[#F5E7A3]' : 'text-[#C9C2A6] hover:text-white'
                }`}
              >
                {label}
                {activeTab === id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C29618] via-[#F5E7A3] to-[#C29618] rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            {/* Specs Tab */}
            {activeTab === 'specs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                {[
                  {
                    title: 'Estimated Metal Weights',
                    rows: [
                      ['18K Yellow/Rose/White Gold', product.specs.metalWeight18k],
                      ['14K Yellow/White Gold', product.specs.metalWeight14k],
                      ['Platinum (PT950)', product.specs.metalWeightPlatinum || '—'],
                      ['Sterling Silver 925', product.specs.metalWeightSilver || '—'],
                    ] as [string, string][],
                  },
                  {
                    title: 'Gemstone & Setting Geometry',
                    rows: [
                      ['Total Gemstones', String(product.specs.diamondCount)],
                      ['Estimated Total Weight', product.specs.diamondTotalWeight],
                      ['Setting Style', product.specs.settingType || '—'],
                      ['Stone Seat Angle', '42° Pre-Notched'],
                    ] as [string, string][],
                  },
                  {
                    title: 'Dimensions & Tolerances',
                    rows: [
                      ['Manufacturing Tolerance', product.specs.tolerance],
                      ['Min. Wall Thickness', product.specs.minimumWallThickness || '0.5mm'],
                      ['Default Ring Size', product.specs.fingerSize || 'US 6.5'],
                      ['Mesh Topology', 'Manifold Solid'],
                    ] as [string, string][],
                  },
                ].map(({ title, rows }) => (
                  <div key={title} className="space-y-3 p-4 rounded-xl bg-[#0B1330] border border-white/5">
                    <h5 className="font-serif text-sm text-[#FAF8F3] border-b border-white/5 pb-2">{title}</h5>
                    <div className="space-y-1.5 text-[#C9C2A6]">
                      {rows.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2">
                          <span className="shrink-0">{label}:</span>
                          <strong className="text-[#FAF8F3] text-right">{value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Casting Tab */}
            {activeTab === 'casting' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {[
                  {
                    icon: <Printer className="w-5 h-5 text-[#D4AF37]" />,
                    title: '3D Wax Resin Printing',
                    body: 'Optimal layer height: 25 microns (0.025mm) on DLP/SLA castable resin machines (Asiga, EnvisionTEC, Formlabs Castable Wax 40). Zero supports required inside stone seats.',
                  },
                  {
                    icon: <Sliders className="w-5 h-5 text-[#7EACFC]" />,
                    title: 'Shrinkage Compensation',
                    body: 'This file contains an integrated +1.25% radial scale to offset the cumulative shrinkage of wax printing, investment expansion, and molten metal cooling.',
                  },
                  {
                    icon: <Zap className="w-5 h-5 text-emerald-400" />,
                    title: 'Sprue Attachment Point',
                    body: 'Recommended main sprue gauge: 2.0mm–2.5mm attached to the thickest portion of the bottom shank or main pendant bail to prevent porosity.',
                  },
                ].map(({ icon, title, body }) => (
                  <div key={title} className="p-4 rounded-xl bg-[#0B1330] border border-[#D4AF37]/20 space-y-2 text-[#C9C2A6] leading-relaxed">
                    {icon}
                    <h5 className="font-serif text-sm text-[#FAF8F3]">{title}</h5>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Layers Tab */}
            {activeTab === 'layers' && (
              <div className="space-y-4">
                <p className="text-xs text-[#C9C2A6]">
                  The master Rhino .3DM file is grouped onto standard CAD studio layers for easy customisation:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  {[
                    { name: 'Layer: 01_Metal_Body', desc: 'Closed PolySurface', color: 'text-[#D4AF37]' },
                    { name: 'Layer: 02_Prongs_Collets', desc: 'Independent Editable Solids', color: 'text-[#7EACFC]' },
                    { name: 'Layer: 03_Gemstones', desc: 'Parametric Gem Curves', color: 'text-amber-400' },
                    { name: 'Layer: 04_Boolean_Cutters', desc: 'Pre-aligned for bench customisation', color: 'text-red-400' },
                    { name: 'Layer: 05_Sprue_Points', desc: 'Casting attachment geometry', color: 'text-emerald-400' },
                    { name: 'Layer: 06_Reference_Dims', desc: 'Locked annotation dims', color: 'text-purple-400' },
                  ].map(({ name, desc, color }) => (
                    <div key={name} className="p-2.5 rounded-lg bg-[#0B1330] border border-white/5 flex justify-between items-center gap-2">
                      <span className={color}>{name}</span>
                      <span className="text-[#C9C2A6] text-right">{desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#C9C2A6] pt-1">
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
              <span className="text-[11px] uppercase tracking-widest text-[#D4AF37] font-semibold block mb-1">
                More in {product.category}
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#FAF8F3]">Ateliers Also Acquired</h3>
            </div>
            <button
              onClick={() => onNavigate('collections')}
              className="hidden sm:flex items-center gap-1 text-xs text-[#D4AF37] hover:text-[#F5E7A3] transition-colors font-serif italic"
            >
              Explore Collection <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedProducts.map((relProd, index) => (
              <StaggerItem key={relProd.id} index={index}>
                <div
                  onClick={() => onNavigate('product', relProd.id)}
                  className="group bg-[#0D183D] border border-[#D4AF37]/15 hover:border-[#D4AF37]/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_10px_30px_rgba(212,175,55,0.15)] flex flex-col h-full"
                >
                  <div className="aspect-square relative overflow-hidden bg-[#070D22]">
                    <LazyImage
                      src={relProd.primaryImage}
                      alt={relProd.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#080E24]/80 backdrop-blur-md border border-[#D4AF37]/30 text-[10px] font-semibold text-[#F5E7A3]">
                      ${relProd.price}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-[#D4AF37]/70 uppercase tracking-widest block mb-1">
                        {relProd.category}
                      </span>
                      <h4 className="font-serif text-sm font-semibold text-[#FAF8F3] group-hover:text-[#F5E7A3] transition-colors line-clamp-1">
                        {relProd.title}
                      </h4>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#C9C2A6]">
                      <span className="font-mono text-[11px] text-[#7EACFC]">Rhino .3DM</span>
                      <span className="text-[#D4AF37] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
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
      <div className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-[#080E24]/95 backdrop-blur-xl border-t border-[#D4AF37]/30 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#0B1330] border border-[#D4AF37]/20 flex-shrink-0">
            <LazyImage
              src={product.primaryImage}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-serif text-[#FAF8F3] truncate">{product.title}</div>
            <div className="text-sm font-bold text-[#F5E7A3] font-serif">${currentPrice}</div>
          </div>
          <button
            onClick={handleBuyNow}
            disabled={purchasing}
            className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 shadow-[0_4px_20px_rgba(212,175,55,0.35)]"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0B1330]" />
            Buy Now
          </button>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={otpModalState.isOpen}
        onClose={() => setOtpModalState(prev => ({ ...prev, isOpen: false }))}
        purchaseId={otpModalState.purchaseId}
        productTitle={otpModalState.productTitle}
        maskedEmail={otpModalState.maskedEmail}
        onVerifiedSuccess={() => {
          setOtpModalState(prev => ({ ...prev, isOpen: false }));
          onNavigate('account');
        }}
      />
    </div>
  );
};

