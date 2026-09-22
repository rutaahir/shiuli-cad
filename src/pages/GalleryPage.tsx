import React, { useState, useEffect } from 'react';
import { PageId, PortfolioItemData } from '../types';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { Sparkles, Eye, X, ArrowRight, Layers, Gem, Scale, Loader2, Info } from 'lucide-react';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';
import { LazyImage } from '../components/motion/LazyImage';
import { api } from '../services/api';

interface GalleryPageProps {
  onNavigate: (page: PageId, extraId?: string) => void;
}

export const GalleryPage: React.FC<GalleryPageProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<PortfolioItemData[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeLightboxItem, setActiveLightboxItem] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getPortfolioItems(),
      api.getCategories(true),
    ])
      .then(([portfolioRes, catsRes]) => {
        if (!isMounted) return;
        
        if (Array.isArray(catsRes)) {
          setCategories(catsRes);
        }

        if (Array.isArray(portfolioRes)) {
          setItems(portfolioRes);
        }
      })
      .catch((err) => {
        console.error('Failed to load portfolio items:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Build dynamic category pills
  const categoryPills = [
    { id: 'all', label: 'All Portfolio' },
    ...categories.map((cat) => ({
      id: cat.slug,
      label: cat.name,
    })),
  ];

  const filteredItems = items.filter((item) => {
    if (selectedCategory === 'all') return true;
    const catSlug = (item.category_slug || '').toLowerCase();
    const catName = (item.category_name || '').toLowerCase();
    const target = selectedCategory.toLowerCase();
    return catSlug === target || catName.includes(target) || catSlug.includes(target);
  });

  return (
    <div className="min-h-screen bg-[#0B1330] text-[#F5F1E8] pt-28 pb-20 px-4 sm:px-8 lg:px-12 text-left">
      <div className="max-w-[1536px] mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121F4D]/60 border border-[#D4AF37]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#F5E7A3]">
              Atelier Portfolio & Lookbook
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#FAF8F3]">
            The Shiuli CAD Gallery
          </h1>
          <p className="text-sm text-[#C9C2A6] font-light">
            A curated showcase of bespoke 3D CAD models, photorealistic ray-traced renders, and cast-verified creations.
          </p>

          {/* DYNAMIC Category Filter Pills */}
          <div className="pt-4 flex flex-wrap justify-center gap-2">
            {categoryPills.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#D4AF37] text-[#0B1330] font-semibold shadow-md scale-105'
                    : 'bg-[#080E24] text-[#C9C2A6] hover:text-white border border-[#D4AF37]/20'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Gallery Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto mb-2" />
            Loading 100% dynamic gallery portfolio...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center bg-[#080E24] rounded-3xl border border-[#D4AF37]/20 text-[#C9C2A6]">
            <Info className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
            No portfolio creations found for filter "{selectedCategory}".
          </div>
        ) : (
          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const itemImg = item.primary_image || (item as any).image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80';
              const catLabel = item.category_name || item.category_slug || 'CAD Model';

              return (
                <StaggerItem key={item.id}>
                  <div
                    onClick={() => setActiveLightboxItem(item)}
                    className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#080E24] border border-[#D4AF37]/20 cursor-pointer shadow-xl hover:border-[#D4AF37]/60 hover:-translate-y-1 transition-all duration-300"
                  >
                    <LazyImage
                      src={itemImg}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Hover Dark Vignette with details */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1330] via-[#0B1330]/40 to-transparent opacity-80 group-hover:opacity-95 transition-opacity z-10" />

                    <div className="absolute bottom-0 inset-x-0 p-5 space-y-1.5 transform transition-transform duration-300 z-20">
                      <div className="flex items-center justify-between text-[10px] text-[#D4AF37] font-semibold uppercase tracking-wider">
                        <span>{catLabel}</span>
                        {item.completed_date && (
                          <span className="text-emerald-400 font-mono">{item.completed_date}</span>
                        )}
                      </div>

                      <h3 className="font-serif text-xl text-[#FAF8F3] group-hover:text-[#F5E7A3] transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-xs text-[#C9C2A6] line-clamp-1 font-light">
                        {item.description}
                      </p>

                      <div className="pt-2 flex items-center gap-1.5 text-xs text-[#F5E7A3] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect 4K Renders & Casting Specs</span>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        )}

        {/* Before / After Sketch to CAD Section */}
        <div className="rounded-3xl bg-[#080E24] border border-[#D4AF37]/30 p-8 sm:p-12 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
              Sketches to Master CAD
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#FAF8F3]">
              Hand-Drawn Sketches Transformed
            </h2>
            <p className="text-xs text-[#C9C2A6]">
              Every nuance, taper, and diamond seat is engineered to exact foundry tolerances while respecting the designer's original emotional stroke.
            </p>
          </div>

          <BeforeAfterSlider />
        </div>

        {/* Lightbox Modal */}
        {activeLightboxItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="relative w-full max-w-4xl rounded-3xl bg-[#0B1330] border border-[#D4AF37]/35 shadow-2xl overflow-hidden text-[#FAF8F3] grid grid-cols-1 md:grid-cols-12">
              {/* Close button */}
              <button
                onClick={() => setActiveLightboxItem(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#0B1330]/80 text-[#C9C2A6] hover:text-[#FAF8F3] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Large Image (7 cols) */}
              <div className="md:col-span-7 bg-[#070D22] p-6 flex flex-col items-center justify-center">
                <img
                  src={activeLightboxItem.primary_image || activeLightboxItem.image}
                  alt={activeLightboxItem.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[420px] w-auto object-contain drop-shadow-2xl rounded-xl"
                />

                {/* Additional gallery thumbnails if present */}
                {activeLightboxItem.gallery_images && activeLightboxItem.gallery_images.length > 0 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto max-w-full pb-2">
                    {activeLightboxItem.gallery_images.map((g: any, gIdx: number) => (
                      <img
                        key={g.id || gIdx}
                        src={g.image}
                        alt="Gallery preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-700 cursor-pointer hover:border-[#D4AF37]"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Specs & CTAs (5 cols) */}
              <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 text-left">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">
                      {activeLightboxItem.category_name || activeLightboxItem.category_slug || 'Atelier Portfolio'} • Shiuli Archives
                    </span>
                    <h3 className="font-serif text-2xl text-[#FAF8F3] mt-1">
                      {activeLightboxItem.title}
                    </h3>
                  </div>

                  <p className="text-xs text-[#C9C2A6] leading-relaxed font-light">
                    {activeLightboxItem.description}
                  </p>

                  {/* Spec list */}
                  <div className="p-4 rounded-xl bg-[#080E24] border border-[#D4AF37]/20 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#C9C2A6]">Category Taxon:</span>
                      <strong className="text-[#FAF8F3] font-mono">{activeLightboxItem.category_name || 'Jewellery CAD'}</strong>
                    </div>
                    {activeLightboxItem.completed_date && (
                      <div className="flex justify-between">
                        <span className="text-[#C9C2A6]">Archived Date:</span>
                        <strong className="text-[#FAF8F3]">{activeLightboxItem.completed_date}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#C9C2A6]">Rhino 3D Specs:</span>
                      <strong className="text-emerald-400">Watertight .3DM + .STL</strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const cat = activeLightboxItem.category_slug || '';
                      setActiveLightboxItem(null);
                      onNavigate('custom-design', cat);
                    }}
                    className="btn-gold-luxury w-full py-3.5 rounded-xl font-semibold tracking-wider uppercase text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Request Similar Custom CAD</span>
                    <ArrowRight className="w-4 h-4 text-[#0B1330]" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveLightboxItem(null);
                      onNavigate('collections');
                    }}
                    className="w-full py-2.5 rounded-xl border border-white/10 text-xs text-[#C9C2A6] hover:text-white cursor-pointer"
                  >
                    Browse Ready Catalog
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryPage;
