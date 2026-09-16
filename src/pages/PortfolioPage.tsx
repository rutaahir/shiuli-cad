import React, { useEffect, useState } from 'react';
import { 
  Diamond, 
  Sparkles, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Filter, 
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { PortfolioItemData, PageId } from '../types';
import { SkeletonShimmer } from '../components/motion/SkeletonShimmer';

interface PortfolioPageProps {
  onNavigate: (page: PageId, slug?: string) => void;
}

const CATEGORY_FILTERS = [
  { label: 'All Portfolio', slug: '' },
  { label: 'Rings', slug: 'rings' },
  { label: 'Earrings', slug: 'earrings' },
  { label: 'Pendants', slug: 'pendants' },
  { label: 'Necklaces', slug: 'necklaces' },
  { label: 'Bracelets', slug: 'bracelets' },
  { label: 'Bangles', slug: 'bangles' },
];

const PROJECT_TYPE_FILTERS = [
  { label: 'All Projects', value: '' },
  { label: 'Custom Projects', value: 'custom' },
  { label: 'AI Projects', value: 'ai' },
];

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<PortfolioItemData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProjectType, setSelectedProjectType] = useState<string>('');
  
  // Lightbox Modal state
  const [activeItem, setActiveItem] = useState<PortfolioItemData | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getPortfolioItems(selectedCategory, selectedProjectType)
      .then((data) => {
        if (isMounted) {
          setItems(data);
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
  }, [selectedCategory, selectedProjectType]);

  const openLightbox = (item: PortfolioItemData) => {
    setActiveItem(item);
    setActiveImageIndex(0);
  };

  const closeLightbox = () => {
    setActiveItem(null);
  };

  const getLightboxImages = () => {
    if (!activeItem) return [];
    const imgs = [];
    if (activeItem.primary_image) imgs.push(activeItem.primary_image);
    if (activeItem.gallery_images) {
      activeItem.gallery_images.forEach((g) => imgs.push(g.image));
    }
    return imgs.length > 0 ? imgs : ['/placeholder.jpg'];
  };

  return (
    <div className="min-h-screen bg-[#060B1E] text-slate-100 pt-28 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 xl:px-12">
      {/* Header Banner */}
      <div className="max-w-4xl mx-auto text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          Masterpiece Gallery
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          CAD Studio Portfolio & Render Showcase
        </h1>
        <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
          Explore our completed 3D jewelry CAD projects, custom bespoke creations, and AI-assisted design concepts.
        </p>
      </div>

      {/* Dual Dimension Filter Bar */}
      <div className="max-w-6xl mx-auto space-y-4 mb-10">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-800 pb-4">
          <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#D4AF37]" /> Category:
          </span>
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = selectedCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Project Type Filter Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> Project Type:
          </span>
          {PROJECT_TYPE_FILTERS.map((pt) => {
            const isActive = selectedProjectType === pt.value;
            return (
              <button
                key={pt.value}
                onClick={() => setSelectedProjectType(pt.value)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-[#F5E7A3] border border-[#D4AF37]/50'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                {pt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Showcase Grid */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <SkeletonShimmer key={n} className="h-80 rounded-2xl bg-slate-900/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
            <Diamond className="w-12 h-12 text-[#D4AF37]/50 mx-auto" />
            <h3 className="text-xl font-bold text-white">No Portfolio Items Match Filters</h3>
            <p className="text-slate-400 text-sm">Try selecting a different category or project type filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => openLightbox(item)}
                className="group bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-[#D4AF37]/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-[#D4AF37]/10 flex flex-col justify-between"
              >
                <div className="relative h-64 bg-slate-950 overflow-hidden">
                  {item.primary_image ? (
                    <img
                      src={item.primary_image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Diamond className="w-12 h-12" />
                    </div>
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {item.is_ai_project && (
                      <span className="px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-semibold backdrop-blur-md">
                        AI Concept
                      </span>
                    )}
                    {item.is_custom_project && (
                      <span className="px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F5E7A3] text-[10px] font-semibold backdrop-blur-md">
                        Custom CAD
                      </span>
                    )}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="px-4 py-2 bg-[#D4AF37] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <Eye className="w-4 h-4" /> View Showcase
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{item.category_name || 'Jewelry CAD'}</span>
                    {item.completed_date && <span>{item.completed_date}</span>}
                  </div>
                  <h3 className="font-bold text-white text-lg group-hover:text-[#F5E7A3] transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image Viewer Column */}
            <div className="flex-1 bg-slate-950 relative flex items-center justify-center min-h-[300px] md:min-h-[450px]">
              {getLightboxImages().length > 0 && (
                <img
                  src={getLightboxImages()[activeImageIndex]}
                  alt={activeItem.title}
                  className="max-h-[70vh] w-full object-contain p-4"
                />
              )}

              {getLightboxImages().length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) =>
                        prev === 0 ? getLightboxImages().length - 1 : prev - 1
                      )
                    }
                    className="absolute left-3 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-[#D4AF37] hover:text-slate-950 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) =>
                        prev === getLightboxImages().length - 1 ? 0 : prev + 1
                      )
                    }
                    className="absolute right-3 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-[#D4AF37] hover:text-slate-950 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Details Column */}
            <div className="w-full md:w-80 p-6 space-y-6 overflow-y-auto border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/90">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">
                  {activeItem.category_name || 'Jewelry CAD'}
                </span>
                <h3 className="text-xl font-bold text-white">{activeItem.title}</h3>
                {activeItem.completed_date && (
                  <p className="text-xs text-slate-400">Completed: {activeItem.completed_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Project Description
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {activeItem.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <button
                  onClick={() => {
                    closeLightbox();
                    onNavigate('custom-design');
                  }}
                  className="w-full py-3 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold rounded-xl text-xs transition-colors"
                >
                  Request Similar Custom CAD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
