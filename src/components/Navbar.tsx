import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useCatalog, toProductShape, fetchCatalog } from '../hooks/useCatalog';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';
import { PageId } from '../types';
import { getOptimizedImageUrl, handleImgError } from '../utils/imageHelper';
import { formatINR } from '../utils/currencyHelper';
import {
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  Sparkles,
  Phone,
  Mail,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Search,
  Layers,
  Shield,
  Briefcase,
  Lock,
  Tag,
  CheckCircle2,
  FileText,
  Gem,
  Sliders,
  Award,
  Box,
  Cpu,
  Edit2,
  Ruler,
  Scale,
  RotateCcw,
} from 'lucide-react';

interface NavbarProps {
  activePage: PageId;
  onNavigate: (page: PageId, extraId?: string) => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenAuth,
  isLoggedIn,
}) => {
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);

  // Active Dropdown States for Desktop
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownHoverTimeout = useRef<NodeJS.Timeout | null>(null);

  // Search & Account States
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchCategorySlug, setSelectedSearchCategorySlug] = useState<string>('all');
  const { categories, products, isError, isLoading } = useCatalog();

  const [hoveredCategorySlug, setHoveredCategorySlug] = useState<string>('');

  useEffect(() => {
    if (categories.length > 0 && !hoveredCategorySlug) {
      setHoveredCategorySlug(categories[0].slug);
    }
  }, [categories]);

  const activeMegaCategory = categories.find(c => c.slug === hoveredCategorySlug) || categories[0];
  const megaMenuCategoryProducts = products.filter(
    p =>
      p.category_slug === hoveredCategorySlug ||
      (p as any).parent_slug === hoveredCategorySlug ||
      (activeMegaCategory && p.category === activeMegaCategory.id) ||
      (p.category_name && hoveredCategorySlug && p.category_name.toLowerCase().includes(hoveredCategorySlug.replace(/-/g, ' '))) ||
      (hoveredCategorySlug && (p.title || '').toLowerCase().includes(hoveredCategorySlug.replace(/s$/i, '').toLowerCase()))
  );
  const megaMenuDisplayProducts = megaMenuCategoryProducts.length > 0 
    ? megaMenuCategoryProducts.slice(0, 4) 
    : products.slice(0, 4);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard Esc key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setAccountDropdownOpen(false);
        setSearchOverlayOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOverlayOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseEnterDropdown = (name: string) => {
    if (dropdownHoverTimeout.current) clearTimeout(dropdownHoverTimeout.current);
    setActiveDropdown(name);
  };

  const handleMouseLeaveDropdown = () => {
    dropdownHoverTimeout.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  // Data Lists for Dropdowns
  const cadServicesItems = [
    { slug: 'ring-cad-design', title: 'Ring CAD Design', desc: 'Solitaires, Halos, Eternity Bands' },
    { slug: 'earring-cad-design', title: 'Earring CAD Design', desc: 'Studs, Jhumkas, Drop Earrings' },
    { slug: 'pendant-cad-design', title: 'Pendant CAD Design', desc: 'Solitaire Drops & Medallions' },
    { slug: 'necklace-cad-design', title: 'Necklace CAD Design', desc: 'Bridal Chokers & Rivieras' },
    { slug: 'bracelet-cad-design', title: 'Bracelet CAD Design', desc: 'Tennis Bracelets & Cuffs' },
    { slug: 'bangle-cad-design', title: 'Bangle CAD Design', desc: 'Kadas & Stackable Bangles' },
    { slug: 'bridal-jewellery-cad', title: 'Bridal Jewellery CAD', desc: 'Haute Joaillerie Sets' },
    { slug: 'mens-jewellery-cad', title: "Men's Jewellery CAD", desc: 'Signet Rings & Cufflinks' },
    { slug: 'jewellery-sets-cad', title: 'Jewellery Sets', desc: 'Matching Suite 3D Models' },
    { slug: 'other-jewellery-cad', title: 'Other Jewellery', desc: 'Brooches, Tiaras & Accessories' },
  ];

  const customDesignItems = [
    { mode: 'photo', title: 'Design from Photo', desc: 'Upload photo reference' },
    { mode: 'sketch', title: 'Design from Sketch', desc: 'Upload hand-drawn sketch' },
    { mode: 'reference', title: 'Design from Reference', desc: 'Pick catalog reference' },
    { mode: 'ring', title: 'Custom Ring Design', desc: 'Bespoke ring creation' },
    { mode: 'jewellery', title: 'Custom Jewellery Design', desc: 'Pendants, earrings & bangles' },
    { mode: 'sets', title: 'Custom Jewellery Sets', desc: 'Full matching suites' },
  ];

  const fileEditingItems = [
    { key: '3dm-file-editing', title: '3DM File Editing', desc: 'Rhino 8 native surface editing' },
    { key: 'stl-file-editing', title: 'STL File Editing', desc: 'Mesh repair & watertight fixes' },
    { key: 'size-modification', title: 'Size Modification', desc: 'US/UK/IN diameter adjustment' },
    { key: 'weight-adjustment', title: 'Weight Adjustment', desc: 'Gram weight & hollowing calibration' },
    { key: 'stone-size-modification', title: 'Stone Size Modification', desc: 'Bait & prong seat recalibration' },
    { key: 'stone-setting-modification', title: 'Stone Setting Modification', desc: 'Prong, Bezel, Pave modification' },
    { key: 'shape-modification', title: 'Shape Modification', desc: 'Shank & halo contour shift' },
    { key: 'add-remove-stones', title: 'Add / Remove Stones', desc: 'Halo additions & plain conversions' },
    { key: 'name-initial-logo', title: 'Name / Initial / Logo', desc: '3D stamp & hallmark relief' },
    { key: 'engraving', title: 'Engraving', desc: 'Inside shank 3D relief text' },
    { key: 'manufacturing-correction', title: 'Manufacturing Correction', desc: 'Casting & wall porosity fixes' },
    { key: 'casting-3d-printing-prep', title: 'Casting & 3D Printing Preparation', desc: 'Sprue feeder & shrink scaling' },
  ];

  const aiJewelleryItems = [
    { type: 'concepts', title: 'AI Jewellery Concepts', desc: 'Parametric generative renders' },
    { type: 'image-to-design', title: 'Image to Jewellery Design', desc: '2D render to 3D model' },
    { type: 'assisted', title: 'AI-Assisted Design', desc: 'Bench jeweler + AI hybrid' },
    { type: 'concept-to-cad', title: 'Concept to CAD', desc: 'Direct wax-ready export' },
    { type: 'custom-ai', title: 'Custom AI Jewellery', desc: 'Tailored prompt modeling' },
  ];

  const readyMadeCadFilesItems = [
    { slug: 'rings', title: 'Ring Files', desc: 'Production ready 3DM & STL' },
    { slug: 'earrings', title: 'Earring Files', desc: 'Studs & drops' },
    { slug: 'pendants', title: 'Pendant Files', desc: 'Medallions & solitaires' },
    { slug: 'necklaces', title: 'Necklace Files', desc: 'Rivieras & chokers' },
    { slug: 'bracelets', title: 'Bracelet Files', desc: 'Tennis & charm links' },
    { slug: 'bangles', title: 'Bangle Files', desc: 'Kadas & stackable bangles' },
    { slug: 'bridal', title: 'Bridal Jewellery Files', desc: 'Full wedding suites' },
    { slug: 'mens', title: "Men's Jewellery Files", desc: 'Signets & cufflinks' },
  ];

  const aboutUsItems = [
    { slug: 'about-shiuli-cad-studio', title: 'About Shiuli CAD Studio', desc: 'Digital Craftsmanship Since 2012' },
    { slug: 'our-services', title: 'Our Services', desc: 'Full CAD & File Revision Suite' },
    { slug: 'our-experience', title: 'Our Experience', desc: '12+ Years & 15,000+ CAD Models' },
    { slug: 'our-technology', title: 'Our Technology', desc: 'Rhino 8, MatrixGold & Magics' },
  ];

  const portfolioItems = [
    { type: 'rings', title: 'Rings', desc: 'Solitaire & Halo Showcases' },
    { type: 'earrings', title: 'Earrings', desc: 'Studs & Drops' },
    { type: 'pendants', title: 'Pendants', desc: 'Medallions & Charms' },
    { type: 'necklaces', title: 'Necklaces', desc: 'Rivieras & Chokers' },
    { type: 'bracelets', title: 'Bracelets', desc: 'Tennis & Cuffs' },
    { type: 'bangles', title: 'Bangles', desc: 'Kadas & Stackable' },
    { type: 'custom', title: 'Custom Projects', desc: 'Bespoke Haute Joaillerie' },
    { type: 'ai', title: 'AI Projects', desc: 'Parametric AI Concepts' },
  ];

  // Character Matching & Category Filtering for Quick Search
  const cleanSearchQuery = searchQuery.trim().toLowerCase();

  const categoryFilteredProducts = selectedSearchCategorySlug === 'all'
    ? products
    : products.filter(p => {
        const catObj = categories.find(c => c.slug === selectedSearchCategorySlug);
        return (
          p.category_slug === selectedSearchCategorySlug ||
          (p as any).parent_slug === selectedSearchCategorySlug ||
          (catObj && p.category === catObj.id) ||
          (p.category_name && p.category_name.toLowerCase().includes(selectedSearchCategorySlug.replace(/-/g, ' ')))
        );
      });

  const searchResults = (cleanSearchQuery
    ? categoryFilteredProducts
        .filter(p => {
          const t = (p.title || '').toLowerCase();
          const c = (p.category_name || '').toLowerCase();
          const d = (p.description || '').toLowerCase();
          const s = (p.slug || '').toLowerCase();
          return (
            t.includes(cleanSearchQuery) ||
            c.includes(cleanSearchQuery) ||
            d.includes(cleanSearchQuery) ||
            s.includes(cleanSearchQuery)
          );
        })
        .sort((a, b) => {
          const aTitle = (a.title || '').toLowerCase();
          const bTitle = (b.title || '').toLowerCase();
          if (aTitle.startsWith(cleanSearchQuery) && !bTitle.startsWith(cleanSearchQuery)) return -1;
          if (!aTitle.startsWith(cleanSearchQuery) && bTitle.startsWith(cleanSearchQuery)) return 1;
          if (aTitle.includes(cleanSearchQuery) && !bTitle.includes(cleanSearchQuery)) return -1;
          if (!aTitle.includes(cleanSearchQuery) && bTitle.includes(cleanSearchQuery)) return 1;
          return 0;
        })
    : categoryFilteredProducts
  ).map(toProductShape);

  // Helper: highlight matched characters in text
  const renderHighlightedMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="text-[#F5E7A3] bg-[#D4AF37]/35 font-bold px-0.5 rounded underline decoration-[#D4AF37]"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-[#E8D7B7] shadow-sm py-3'
            : 'bg-white/90 backdrop-blur-md border-b border-[#E8D7B7]/50 py-3.5'
        }`}
      >
        <div className="w-full px-3 sm:px-6 lg:px-20 xl:px-28">
          <div className="flex items-center justify-between">
            {/* Left Brand Logo - Exactly One Instance */}
            <div className="flex-shrink-0 flex items-center mr-2 sm:mr-8">
              <BrandLogo
                variant="horizontal"
                size="md"
                theme="light"
                onClick={() => onNavigate('home')}
              />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {/* Home */}
              <button
                onClick={() => onNavigate('home')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-semibold transition-colors ${
                  activePage === 'home' ? 'text-[#B88732] font-bold border-b-2 border-[#D9B66F]' : 'text-[#17345C] hover:text-[#B88732]'
                }`}
              >
                Home
              </button>

              {/* Custom Design */}
              <button
                onClick={() => onNavigate('custom-design')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-semibold transition-colors ${
                  activePage === 'custom-design'
                    ? 'text-[#B88732] font-bold border-b-2 border-[#D9B66F]'
                    : 'text-[#17345C] hover:text-[#B88732]'
                }`}
              >
                Custom Design
              </button>

              {/* File Editing */}
              <button
                onClick={() => onNavigate('file-editing')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-semibold transition-colors ${
                  activePage === 'file-editing'
                    ? 'text-[#B88732] font-bold border-b-2 border-[#D9B66F]'
                    : 'text-[#17345C] hover:text-[#B88732]'
                }`}
              >
                File Editing
              </button>

              {/* AI + Jewellery */}
              <button
                onClick={() => onNavigate('ai-jewellery')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-semibold flex items-center gap-1 transition-colors ${
                  activePage === 'ai-jewellery'
                    ? 'text-[#B88732] font-bold border-b-2 border-[#D9B66F]'
                    : 'text-[#17345C] hover:text-[#B88732]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D9B66F] animate-pulse" /> AI + Jewellery
              </button>

              {/* CAD Files Mega Menu (Renamed Collections) */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnterDropdown('cad-files')}
                onMouseLeave={handleMouseLeaveDropdown}
              >
                <button
                  onClick={() => onNavigate('collections')}
                  className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-semibold flex items-center gap-1 transition-colors ${
                    activePage === 'collections' || activeDropdown === 'cad-files'
                      ? 'text-[#B88732] font-bold border-b-2 border-[#D9B66F]'
                      : 'text-[#17345C] hover:text-[#B88732]'
                  }`}
                >
                  CAD Files <ChevronDown className="w-3.5 h-3.5 text-[#D9B66F]" />
                </button>

                {activeDropdown === 'cad-files' && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-[720px] max-w-[95vw] z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white border border-[#E8D7B7] rounded-3xl shadow-[0_20px_50px_rgba(23,52,92,0.12)] p-5 sm:p-6 backdrop-blur-2xl grid grid-cols-12 gap-5 ring-1 ring-[#E8D7B7]/60">
                      {/* Left: Category list */}
                      <div className="col-span-5 border-r border-[#E8D7B7] pr-3.5 space-y-1 max-h-[380px] overflow-y-auto custom-scrollbar">
                        <span className="text-[10px] font-bold text-[#B88732] uppercase tracking-widest block mb-2 px-1">
                          Ready-Made CAD Categories
                        </span>
                        {isLoading && categories.length === 0 ? (
                          <div className="py-8 text-center text-xs text-[#687386]">Loading categories…</div>
                        ) : isError && categories.length === 0 ? (
                          <div className="py-6 px-3 rounded-xl bg-red-50 border border-red-200 text-center space-y-2">
                            <p className="text-xs text-red-600">Unable to load categories</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchCatalog(true);
                              }}
                              className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 border border-red-300 text-[11px] font-medium text-red-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Retry
                            </button>
                          </div>
                        ) : (
                          categories.map(cat => {
                            const isHovered = (hoveredCategorySlug || categories[0]?.slug) === cat.slug;
                            return (
                              <button
                                key={cat.id}
                                onMouseEnter={() => setHoveredCategorySlug(cat.slug)}
                                onClick={() => {
                                  onNavigate('collections', cat.slug);
                                  setActiveDropdown(null);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                                  isHovered
                                    ? 'bg-[#FFF9F0] text-[#17345C] font-bold border border-[#E8D7B7] shadow-sm translate-x-1'
                                    : 'text-[#17243B]/80 hover:text-[#17345C] hover:bg-[#FFF9F0]'
                                }`}
                              >
                                <span>{cat.name}</span>
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isHovered ? 'translate-x-0.5 text-[#B88732]' : 'opacity-40'}`} />
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Right: Featured products matching hovered category */}
                      <div className="col-span-7 flex flex-col justify-between space-y-3">
                        <div className="flex justify-between items-center pb-2.5 border-b border-[#E8D7B7]">
                          <span className="text-xs font-bold text-[#17345C] uppercase tracking-wider flex items-center gap-1.5">
                            <Gem className="w-3.5 h-3.5 text-[#D9B66F]" />
                            {activeMegaCategory?.name || 'Featured'} CAD Models
                          </span>
                          <button
                            onClick={() => {
                              onNavigate('collections', hoveredCategorySlug);
                              setActiveDropdown(null);
                            }}
                            className="text-[11px] font-bold text-[#B88732] hover:text-[#D9B66F] hover:underline transition-colors flex items-center gap-1"
                          >
                            View All ({megaMenuCategoryProducts.length > 0 ? megaMenuCategoryProducts.length : products.length}) →
                          </button>
                        </div>

                        {megaMenuDisplayProducts.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2.5">
                            {megaMenuDisplayProducts.map(p => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  onNavigate('product-detail', p.slug || String(p.id));
                                  setActiveDropdown(null);
                                }}
                                className="p-2.5 bg-[#FFF9F0] hover:bg-white rounded-2xl border border-[#E8D7B7] hover:border-[#D9B66F] cursor-pointer flex gap-3 items-center group transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                <div className="w-[52px] h-[52px] rounded-xl shrink-0 bg-white border border-[#E8D7B7] overflow-hidden flex items-center justify-center p-1 group-hover:border-[#D9B66F] transition-colors">
                                  <img
                                    src={getOptimizedImageUrl(p.primary_image, p.category_name)}
                                    alt={p.title}
                                    onError={(e) => handleImgError(e, p.category_name)}
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="overflow-hidden min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-[#17243B] group-hover:text-[#B88732] truncate transition-colors leading-tight">
                                    {p.title}
                                  </p>
                                  <div className="flex items-center justify-between gap-1 mt-1.5">
                                    <span className="text-xs font-bold text-[#B88732] font-mono tracking-tight">
                                      ₹{formatINR(p.price)}
                                    </span>
                                    <span className="text-[9px] font-medium text-[#17345C] font-mono bg-[#E8D7B7]/40 px-1.5 py-0.5 rounded border border-[#E8D7B7] shrink-0">
                                      3DM+STL
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center bg-[#FFF9F0] rounded-2xl border border-[#E8D7B7]">
                            <p className="text-xs text-[#687386] mb-2">No CAD files currently in this category.</p>
                            <button
                              onClick={() => {
                                onNavigate('collections');
                                setActiveDropdown(null);
                              }}
                              className="text-xs font-bold text-[#B88732] hover:underline"
                            >
                              Explore All Collections →
                            </button>
                          </div>
                        )}

                        <div className="pt-2 border-t border-[#E8D7B7] flex items-center justify-between text-[11px] text-[#687386]">
                          <span className="flex items-center gap-1.5 text-[#236E6A] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#236E6A]" /> Watertight & Cast-Ready
                          </span>
                          <button
                            onClick={() => {
                              onNavigate('custom-design');
                              setActiveDropdown(null);
                            }}
                            className="text-[#17243B] hover:text-[#B88732] transition-colors"
                          >
                            Need Custom CAD? <span className="text-[#B88732] font-semibold">Request Order</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Portfolio */}
              <button
                onClick={() => onNavigate('portfolio')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-semibold transition-colors ${
                  activePage === 'portfolio'
                    ? 'text-[#B88732] font-bold border-b-2 border-[#D9B66F]'
                    : 'text-[#17345C] hover:text-[#B88732]'
                }`}
              >
                Portfolio
              </button>

              {/* About Us */}
              <button
                onClick={() => onNavigate('about')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-semibold transition-colors ${
                  activePage === 'about' ? 'text-[#B88732] font-bold border-b-2 border-[#D9B66F]' : 'text-[#17345C] hover:text-[#B88732]'
                }`}
              >
                About Us
              </button>

              {/* Contact */}
              <button
                onClick={() => onNavigate('contact')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-semibold transition-colors ${
                  activePage === 'contact' ? 'text-[#B88732] font-bold border-b-2 border-[#D9B66F]' : 'text-[#17345C] hover:text-[#B88732]'
                }`}
              >
                Contact
              </button>
            </nav>

            {/* Right Quick Action Icons */}
            <div className="flex items-center space-x-1.5 sm:space-x-3">
              <button
                onClick={() => setSearchOverlayOpen(true)}
                className="p-2 text-[#17345C] hover:text-[#B88732] transition-colors rounded-full hover:bg-[#FFF9F0]"
                title="Search CAD Files (Ctrl+K)"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenCart}
                className="p-2 text-[#17345C] hover:text-[#B88732] transition-colors relative rounded-full hover:bg-[#FFF9F0]"
                title="View Bag"
              >
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-[#B88732] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Account Icon / Button */}
              <div className="relative">
                {isLoggedIn ? (
                  <button
                    onClick={() => setAccountDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-xs font-bold text-[#17345C] hover:border-[#D9B66F] shadow-sm transition-all"
                  >
                    <User className="w-3.5 h-3.5 text-[#B88732]" />
                    <span className="hidden sm:inline">{user?.first_name || 'Account'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('login')}
                    className="btn-gold-luxury px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign In</span>
                  </button>
                )}

                {accountDropdownOpen && isLoggedIn && (
                  <div className="absolute right-0 top-full pt-2 w-52 z-50">
                    <div className="bg-white border border-[#E8D7B7] rounded-2xl shadow-[0_15px_40px_rgba(23,52,92,0.12)] p-2 space-y-1 backdrop-blur-xl">
                      <button
                        onClick={() => {
                          onNavigate('account');
                          setAccountDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-[#17243B] hover:bg-[#FFF9F0] hover:text-[#17345C] rounded-xl transition-colors"
                      >
                        Client Dashboard
                      </button>

                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            onNavigate('admin');
                            setAccountDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-[#B88732] hover:bg-[#FFF9F0] rounded-xl transition-colors"
                        >
                          Super Admin Portal
                        </button>
                      )}

                      {user?.role === 'staff' && (
                        <button
                          onClick={() => {
                            onNavigate('staff-portal');
                            setAccountDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-[#236E6A] hover:bg-[#FFF9F0] rounded-xl transition-colors"
                        >
                          Staff Workspace
                        </button>
                      )}

                      <button
                        onClick={async () => {
                          setAccountDropdownOpen(false);
                          await logout();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border-t border-[#E8D7B7]/50 mt-1 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-[#17345C] hover:text-[#B88732] rounded-full hover:bg-[#FFF9F0]"
                aria-label="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE LUXURY NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white/98 backdrop-blur-3xl flex flex-col justify-between p-5 sm:p-6 overflow-y-auto animate-in fade-in slide-in-from-right duration-300">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-[#E8D7B7]">
              <BrandLogo variant="horizontal" size="sm" onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-full bg-[#FFF9F0] text-[#17345C] hover:text-[#B88732] border border-[#E8D7B7]"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* User status card on mobile menu */}
            <div className="mt-4 p-3.5 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E8D7B7]/40 border border-[#D9B66F] flex items-center justify-center text-[#B88732]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#17243B]">
                    {isLoggedIn ? (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email || 'Valued Client') : 'Guest Atelier'}
                  </p>
                  <p className="text-[10px] text-[#B88732]">
                    {isLoggedIn ? `${user?.role?.toUpperCase() || 'CLIENT'} ACCOUNT` : 'Sign in to access 3DM downloads'}
                  </p>
                </div>
              </div>
              {isLoggedIn ? (
                <button
                  onClick={() => { onNavigate('account'); setMobileMenuOpen(false); }}
                  className="px-3 py-1.5 text-xs font-bold bg-[#17345C] text-[#FFF9F0] rounded-xl hover:bg-[#17243B]"
                >
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }}
                  className="btn-gold-luxury px-3 py-1.5 text-xs font-bold rounded-xl"
                >
                  Sign In
                </button>
              )}
            </div>

            <div className="space-y-2 py-6">
              {[
                { id: 'home', label: 'Home Atelier', icon: <Gem className="w-4 h-4 text-[#B88732]" /> },
                { id: 'custom-design', label: 'Custom Design Order', icon: <Sliders className="w-4 h-4 text-[#B88732]" /> },
                { id: 'file-editing', label: 'File Editing & Revision', icon: <Edit2 className="w-4 h-4 text-[#B88732]" /> },
                { id: 'ai-jewellery', label: 'AI + Jewellery Concepts', icon: <Sparkles className="w-4 h-4 text-[#B88732] animate-pulse" /> },
                { id: 'collections', label: 'CAD Files Library', icon: <Box className="w-4 h-4 text-[#B88732]" /> },
                { id: 'portfolio', label: 'Portfolio & Renders', icon: <Award className="w-4 h-4 text-[#B88732]" /> },
                { id: 'about', label: 'About Studio', icon: <Shield className="w-4 h-4 text-[#B88732]" /> },
                { id: 'contact', label: 'Contact Us', icon: <Phone className="w-4 h-4 text-[#B88732]" /> },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id as PageId); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between font-serif text-base transition-all ${
                    activePage === item.id
                      ? 'bg-[#17345C] text-[#FFF9F0] font-bold shadow-md'
                      : 'text-[#17243B] hover:bg-[#FFF9F0] border border-[#E8D7B7]/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8D7B7] flex items-center justify-between text-xs text-[#687386]">
            <span>Shiuli CAD Studio © 2026</span>
            <span className="text-[#B88732] font-semibold">Rhino .3DM & .STL Atelier</span>
          </div>
        </div>
      )}

      {/* SEARCH OVERLAY MODAL */}
      {searchOverlayOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#17243B]/60 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-20 px-4 animate-in fade-in duration-200"
          onClick={() => setSearchOverlayOpen(false)}
        >
          <div
            className="bg-white border border-[#E8D7B7] rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-[0_25px_60px_rgba(23,52,92,0.2)] space-y-4 text-[#17243B] relative max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title & Close */}
            <div className="flex justify-between items-center border-b border-[#E8D7B7] pb-3 flex-shrink-0">
              <span className="text-xs font-bold text-[#B88732] uppercase tracking-widest flex items-center gap-2">
                <Search className="w-4 h-4 text-[#B88732]" />
                <span>Quick Search CAD Files & Categories</span>
              </span>
              <button
                onClick={() => setSearchOverlayOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FFF9F0] hover:bg-[#E8D7B7]/40 text-[#687386] hover:text-[#17345C] flex items-center justify-center transition-colors cursor-pointer border border-[#E8D7B7]"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Search Input Bar */}
            <div className="relative flex-shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B88732]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  selectedSearchCategorySlug !== 'all'
                    ? `Search in ${categories.find((c) => c.slug === selectedSearchCategorySlug)?.name || 'category'} (by title, SKU, metal, gemstone)...`
                    : 'Search by ring, solitaire, SKU, gemstone, metal...'
                }
                className="w-full text-sm rounded-2xl border border-[#E8D7B7] bg-[#FFF9F0] text-[#17243B] pl-10 pr-10 py-3.5 focus:outline-hidden focus:border-[#D9B66F] focus:ring-1 focus:ring-[#D9B66F]/50 shadow-inner placeholder:text-[#687386]/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#687386] hover:text-[#17243B] p-1 rounded-full hover:bg-black/5 cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* CATEGORIES BAR: Show all categories directly */}
            <div className="space-y-2 flex-shrink-0 pt-0.5">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#B88732]">
                <span className="flex items-center gap-1.5 font-bold">
                  <Layers className="w-3.5 h-3.5 text-[#B88732]" />
                  <span>Categories ({categories.length})</span>
                </span>
                {selectedSearchCategorySlug !== 'all' && (
                  <button
                    onClick={() => {
                      onNavigate('collections', selectedSearchCategorySlug);
                      setSearchOverlayOpen(false);
                    }}
                    className="text-[#17345C] hover:text-[#B88732] underline font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Open Category Page</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Scrollable Category Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedSearchCategorySlug('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    selectedSearchCategorySlug === 'all'
                      ? 'bg-[#17345C] text-[#FFF9F0] font-bold shadow-md scale-105'
                      : 'bg-[#FFF9F0] hover:bg-[#E8D7B7]/40 text-[#17243B] border border-[#E8D7B7]'
                  }`}
                >
                  <span>All Categories</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      selectedSearchCategorySlug === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#E8D7B7]/50 text-[#17345C]'
                    }`}
                  >
                    {products.length}
                  </span>
                </button>

                {categories.map((cat) => {
                  const isSelected = selectedSearchCategorySlug === cat.slug;
                  const catProductCount = products.filter(
                    (p) =>
                      p.category_slug === cat.slug ||
                      (p as any).parent_slug === cat.slug ||
                      p.category === cat.id
                  ).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedSearchCategorySlug(isSelected ? 'all' : cat.slug)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#17345C] text-[#FFF9F0] font-bold shadow-md scale-105'
                          : 'bg-[#FFF9F0] hover:bg-[#E8D7B7]/40 text-[#17243B] border border-[#E8D7B7]'
                      }`}
                    >
                      <span>{cat.name}</span>
                      {catProductCount > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[#E8D7B7]/50 text-[#17345C]'
                          }`}
                        >
                          {catProductCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RESULTS CONTENT AREA (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[220px]">
              {searchResults.length > 0 ? (
                <>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#B88732] px-1">
                    <span>
                      {cleanSearchQuery
                        ? `Found ${searchResults.length} CAD model${searchResults.length === 1 ? '' : 's'} matching "${searchQuery}"`
                        : `Showing ${searchResults.length} CAD model${searchResults.length === 1 ? '' : 's'} ${
                            selectedSearchCategorySlug !== 'all'
                              ? `in ${categories.find((c) => c.slug === selectedSearchCategorySlug)?.name}`
                              : 'in Atelier'
                          }`}
                    </span>
                    {selectedSearchCategorySlug !== 'all' && (
                      <button
                        onClick={() => {
                          onNavigate('collections', selectedSearchCategorySlug);
                          setSearchOverlayOpen(false);
                        }}
                        className="text-[#687386] hover:text-[#17345C] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Open Category View</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Related Products Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onNavigate('product-detail', p.id);
                          setSearchOverlayOpen(false);
                        }}
                        className="p-3 bg-[#FFF9F0] hover:bg-white rounded-2xl border border-[#E8D7B7] hover:border-[#D9B66F] cursor-pointer flex items-center justify-between transition-all group shadow-xs hover:shadow-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-14 rounded-xl shrink-0 bg-white border border-[#E8D7B7] overflow-hidden flex items-center justify-center p-1 group-hover:border-[#D9B66F] transition-colors">
                            <img
                              src={getOptimizedImageUrl(p.primaryImage, p.category)}
                              alt={p.title}
                              onError={(e) => handleImgError(e, p.category)}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-bold text-xs text-[#17243B] truncate group-hover:text-[#B88732] transition-colors">
                              {renderHighlightedMatch(p.title, searchQuery)}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#B88732] font-medium truncate">
                                {renderHighlightedMatch(p.category, searchQuery)}
                              </span>
                              <span className="text-[10px] font-mono text-[#687386]">
                                {p.specs?.metalWeight18k && p.specs.metalWeight18k !== '—'
                                  ? p.specs.metalWeight18k
                                  : '.3DM + .STL'}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-[#B88732] font-mono">
                              ₹{formatINR(p.price)}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#B88732] shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all ml-2" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* No Results State */
                <div className="py-12 text-center space-y-3 bg-[#FFF9F0] rounded-2xl border border-[#E8D7B7] p-6">
                  <div className="w-12 h-12 rounded-full bg-white border border-[#E8D7B7] flex items-center justify-center text-[#B88732] mx-auto shadow-xs">
                    <Search className="w-5 h-5 opacity-60" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#17243B]">
                      No CAD models found for "{searchQuery}"
                    </h4>
                    <p className="text-xs text-[#687386] mt-1 max-w-sm mx-auto">
                      {selectedSearchCategorySlug !== 'all'
                        ? 'No matches in this category. Try switching to "All Categories" or searching for another keyword.'
                        : 'Try searching by jewellery type (e.g. Ring, Solitaire, Pendant, Necklace) or check your spelling.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    {selectedSearchCategorySlug !== 'all' && (
                      <button
                        onClick={() => setSelectedSearchCategorySlug('all')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#17345C] text-[#FFF9F0] text-xs font-bold shadow-xs hover:bg-[#17243B] transition-colors cursor-pointer"
                      >
                        Search All Categories
                      </button>
                    )}
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#E8D7B7]/30 text-[#17243B] text-xs font-semibold border border-[#E8D7B7] transition-colors cursor-pointer"
                    >
                      Clear Search
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
