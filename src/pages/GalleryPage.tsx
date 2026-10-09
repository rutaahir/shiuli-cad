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
    <div className="min-h-screen bg-[#FFFDF9] text-[#17243B] pt-28 pb-20 px-4 sm:px-8 lg:px-12 text-left">
      <div className="max-w-[1536px] mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF9F0] border border-[#E8D7B7]">
            <Sparkles className="w-3.5 h-3.5 text-[#B88732]" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#B88732]">
              Atelier Portfolio & Lookbook
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#17345C]">
            The Shiuli CAD Gallery
          </h1>
          <p className="text-sm text-[#687386] font-normal">
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
                    ? 'btn-gold-luxury text-[#17345C] font-bold shadow-sm scale-105'
                    : 'bg-white text-[#17345C] hover:bg-[#FFF9F0] border border-[#E8D7B7]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Gallery Grid */}
        {loading ? (
          <div className="p-16 text-center text-[#687386]">
            <Loader2 className="w-8 h-8 animate-spin text-[#B88732] mx-auto mb-2" />
            Loading 100% dynamic gallery portfolio...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-[#E8D7B7] text-[#687386] shadow-sm">
            <Info className="w-8 h-8 text-[#B88732] mx-auto mb-2" />
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
                    className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#FFF9F0] border border-[#E8D7B7] cursor-pointer shadow-sm hover:border-[#D9B66F] hover:-translate-y-1 transition-all duration-300"
                  >
                    <LazyImage
                      src={itemImg}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Hover Dark Vignette with details */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#17345C]/95 via-[#17345C]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />

                    <div className="absolute bottom-0 inset-x-0 p-5 space-y-1.5 transform transition-transform duration-300 z-20">
                      <div className="flex items-center justify-between text-[10px] text-[#D9B66F] font-bold uppercase tracking-wider">
                        <span>{catLabel}</span>
                        {item.completed_date && (
                          <span className="text-emerald-300 font-mono">{item.completed_date}</span>
                        )}
                      </div>

                      <h3 className="font-serif text-xl font-bold text-white group-hover:text-[#F5E7A3] transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-200 line-clamp-1 font-normal">
                        {item.description}
                      </p>

                      <div className="pt-2 flex items-center gap-1.5 text-xs text-[#D9B66F] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="rounded-3xl bg-[#FFF9F0] border border-[#E8D7B7] p-8 sm:p-12 space-y-6 shadow-sm">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[#B88732] font-semibold">
              Sketches to Master CAD
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#17345C]">
              Hand-Drawn Sketches Transformed
            </h2>
            <p className="text-xs text-[#687386]">
              Every nuance, taper, and diamond seat is engineered to exact foundry tolerances while respecting the designer's original emotional stroke.
            </p>
          </div>

          <BeforeAfterSlider />
        </div>

        {/* Lightbox Modal */}
        {activeLightboxItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="relative w-full max-w-4xl rounded-3xl bg-white border border-[#E8D7B7] shadow-2xl overflow-hidden text-[#17345C] grid grid-cols-1 md:grid-cols-12">
              {/* Close button */}
              <button
                onClick={() => setActiveLightboxItem(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white border border-[#E8D7B7] text-[#17345C] hover:bg-[#FFF9F0] transition-colors cursor-pointer shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Large Image (7 cols) */}
              <div className="md:col-span-7 bg-[#FFF9F0] p-6 flex flex-col items-center justify-center">
                <img
                  src={activeLightboxItem.primary_image || activeLightboxItem.image}
                  alt={activeLightboxItem.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[420px] w-auto object-contain drop-shadow-md rounded-xl"
                />

                {/* Additional gallery thumbnails if present */}
                {activeLightboxItem.gallery_images && activeLightboxItem.gallery_images.length > 0 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto max-w-full pb-2">
                    {activeLightboxItem.gallery_images.map((g: any, gIdx: number) => (
                      <img
                        key={g.id || gIdx}
                        src={g.image}
                        alt="Gallery preview"
                        className="w-14 h-14 object-cover rounded-lg border border-[#E8D7B7] cursor-pointer hover:border-[#D9B66F]"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Specs & CTAs (5 cols) */}
              <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 text-left">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#B88732] font-semibold">
                      {activeLightboxItem.category_name || activeLightboxItem.category_slug || 'Atelier Portfolio'} • Shiuli Archives
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-[#17345C] mt-1">
                      {activeLightboxItem.title}
                    </h3>
                  </div>

                  <p className="text-xs text-[#687386] leading-relaxed font-normal">
                    {activeLightboxItem.description}
                  </p>

                  {/* Spec list */}
                  <div className="p-4 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#687386]">Category Taxon:</span>
                      <strong className="text-[#17345C] font-mono">{activeLightboxItem.category_name || 'Jewellery CAD'}</strong>
                    </div>
                    {activeLightboxItem.completed_date && (
                      <div className="flex justify-between">
                        <span className="text-[#687386]">Archived Date:</span>
                        <strong className="text-[#17345C]">{activeLightboxItem.completed_date}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#687386]">Rhino 3D Specs:</span>
                      <strong className="text-emerald-700 font-semibold">Watertight .3DM + .STL</strong>
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
                    className="btn-gold-luxury text-[#17345C] font-bold w-full py-3.5 rounded-xl tracking-wider uppercase text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>Request Similar Custom CAD</span>
                    <ArrowRight className="w-4 h-4 text-[#17345C]" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveLightboxItem(null);
                      onNavigate('collections');
                    }}
                    className="w-full py-2.5 rounded-xl bg-white border border-[#E8D7B7] text-xs text-[#17345C] hover:bg-[#FFF9F0] cursor-pointer"
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
