import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useCatalog, toProductShape } from '../hooks/useCatalog';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';
import { PageId } from '../types';
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
  Scale
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
  const { categories, products } = useCatalog();

  const [hoveredCategorySlug, setHoveredCategorySlug] = useState<string>('');

  useEffect(() => {
    if (categories.length > 0 && !hoveredCategorySlug) {
      setHoveredCategorySlug(categories[0].slug);
    }
  }, [categories]);

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

  // Search Results
  const searchResults = searchQuery.trim()
    ? products
        .filter(
          p =>
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.category_name || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
        .map(toProductShape)
    : [];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#060B1E]/95 backdrop-blur-md border-b border-[#D4AF37]/25 shadow-[0_10px_30px_rgba(0,0,0,0.5)] py-3'
            : 'bg-gradient-to-b from-[#060B1E] via-[#060B1E]/80 to-transparent py-4'
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between">
            {/* Left Brand Logo */}
            <BrandLogo
              variant="horizontal"
              size="md"
              onClick={() => onNavigate('home')}
            />

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {/* Home */}
              <button
                onClick={() => onNavigate('home')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-medium transition-colors ${
                  activePage === 'home' ? 'text-[#F5E7A3] font-bold' : 'text-[#F5F1E8]/80 hover:text-[#FAF8F3]'
                }`}
              >
                Home
              </button>

              {/* CAD Services */}
              <button
                onClick={() => onNavigate('cad-service')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-medium transition-colors ${
                  activePage === 'cad-service'
                    ? 'text-[#F5E7A3] font-bold'
                    : 'text-[#F5F1E8]/80 hover:text-[#FAF8F3]'
                }`}
              >
                CAD Services
              </button>

              {/* Custom Design */}
              <button
                onClick={() => onNavigate('custom-design')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-medium transition-colors ${
                  activePage === 'custom-design'
                    ? 'text-[#F5E7A3] font-bold'
                    : 'text-[#F5F1E8]/80 hover:text-[#FAF8F3]'
                }`}
              >
                Custom Design
              </button>

              {/* File Editing */}
              <button
                onClick={() => onNavigate('file-editing')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-medium transition-colors ${
                  activePage === 'file-editing'
                    ? 'text-[#F5E7A3] font-bold'
                    : 'text-[#F5F1E8]/80 hover:text-[#FAF8F3]'
                }`}
              >
                File Editing
              </button>

              {/* AI + Jewellery */}
              <button
                onClick={() => onNavigate('ai-jewellery')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-medium flex items-center gap-1 transition-colors ${
                  activePage === 'ai-jewellery'
                    ? 'text-[#F5E7A3] font-bold'
                    : 'text-[#F5F1E8]/80 hover:text-[#FAF8F3]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" /> AI + Jewellery
              </button>

              {/* CAD Files Mega Menu (Renamed Collections) */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnterDropdown('cad-files')}
                onMouseLeave={handleMouseLeaveDropdown}
              >
                <button
                  onClick={() => onNavigate('collections')}
                  className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-medium flex items-center gap-1 transition-colors ${
                    activePage === 'collections' || activeDropdown === 'cad-files'
                      ? 'text-[#F5E7A3] font-bold'
                      : 'text-[#F5F1E8]/80 hover:text-[#FAF8F3]'
                  }`}
                >
                  CAD Files <ChevronDown className="w-3.5 h-3.5 text-[#D4AF37]" />
                </button>

                {activeDropdown === 'cad-files' && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-[680px] z-50">
                    <div className="bg-[#09112B] border border-[#D4AF37]/30 rounded-3xl shadow-2xl p-6 backdrop-blur-xl grid grid-cols-12 gap-6">
                      <div className="col-span-5 border-r border-[#D4AF37]/20 pr-4 space-y-1">
                        <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest block mb-2">
                          Ready-Made CAD Categories
                        </span>
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            onMouseEnter={() => setHoveredCategorySlug(cat.slug)}
                            onClick={() => {
                              onNavigate('collections', cat.slug);
                              setActiveDropdown(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                              hoveredCategorySlug === cat.slug
                                ? 'bg-[#D4AF37] text-[#0B1330] shadow-md'
                                : 'text-[#FAF8F3]/80 hover:bg-[#121F4D]'
                            }`}
                          >
                            <span>{cat.name}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>

                      <div className="col-span-7 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-[#D4AF37]/20">
                          <span className="text-xs font-bold text-[#F5E7A3] uppercase">
                            Featured CAD Files
                          </span>
                          <button
                            onClick={() => {
                              onNavigate('collections', hoveredCategorySlug);
                              setActiveDropdown(null);
                            }}
                            className="text-[11px] font-bold text-[#D4AF37] hover:underline"
                          >
                            View All →
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {products.slice(0, 4).map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                onNavigate('product-detail', p.slug || String(p.id));
                                setActiveDropdown(null);
                              }}
                              className="p-2 bg-[#121F4D]/60 rounded-xl border border-white/10 hover:border-[#D4AF37]/40 cursor-pointer flex gap-2 items-center group"
                            >
                              <img
                                src={p.primary_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80'}
                                alt={p.title}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-[#FAF8F3] group-hover:text-[#F5E7A3] truncate">
                                  {p.title}
                                </p>
                                <span className="text-[10px] text-[#D4AF37] font-mono">3DM + STL</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Portfolio */}
              <button
                onClick={() => onNavigate('portfolio')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-medium transition-colors ${
                  activePage === 'portfolio'
                    ? 'text-[#F5E7A3] font-bold'
                    : 'text-[#F5F1E8]/80 hover:text-[#FAF8F3]'
                }`}
              >
                Portfolio
              </button>

              {/* Pricing */}
              <button
                onClick={() => onNavigate('pricing')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-medium transition-colors ${
                  activePage === 'pricing' ? 'text-[#F5E7A3] font-bold' : 'text-[#F5F1E8]/80 hover:text-[#FAF8F3]'
                }`}
              >
                Pricing
              </button>

              {/* About Us */}
              <button
                onClick={() => onNavigate('about')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-medium transition-colors ${
                  activePage === 'about' ? 'text-[#F5E7A3] font-bold' : 'text-[#F5F1E8]/80 hover:text-[#FAF8F3]'
                }`}
              >
                About Us
              </button>

              {/* Contact */}
              <button
                onClick={() => onNavigate('contact')}
                className={`px-2.5 py-1.5 text-xs xl:text-[13px] tracking-wider uppercase font-medium transition-colors ${
                  activePage === 'contact' ? 'text-[#F5E7A3] font-bold' : 'text-[#F5F1E8]/80 hover:text-[#FAF8F3]'
                }`}
              >
                Contact
              </button>
            </nav>

            {/* Right Quick Action Icons */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => setSearchOverlayOpen(true)}
                className="p-2 text-[#F5F1E8]/80 hover:text-[#D4AF37] transition-colors rounded-full hover:bg-white/5"
                title="Search CAD Files (Ctrl+K)"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenCart}
                className="p-2 text-[#F5F1E8]/80 hover:text-[#D4AF37] transition-colors relative rounded-full hover:bg-white/5"
                title="View Bag"
              >
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-[#D4AF37] text-[#0B1330] text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Account Dropdown */}
              <div className="relative">
                {isLoggedIn ? (
                  <button
                    onClick={() => setAccountDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121F4D] border border-[#D4AF37]/30 text-xs font-bold text-[#F5E7A3]"
                  >
                    <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{user?.first_name || 'Account'}</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenAuth}
                    className="btn-gold-luxury px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" /> Client Sign In
                  </button>
                )}

                {accountDropdownOpen && isLoggedIn && (
                  <div className="absolute right-0 top-full pt-2 w-52 z-50">
                    <div className="bg-[#09112B] border border-[#D4AF37]/30 rounded-2xl shadow-2xl p-2 space-y-1 backdrop-blur-xl">
                      <button
                        onClick={() => {
                          onNavigate('account');
                          setAccountDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-[#FAF8F3] hover:bg-[#121F4D] rounded-xl"
                      >
                        Client Dashboard
                      </button>

                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            onNavigate('admin');
                            setAccountDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-[#D4AF37] hover:bg-[#121F4D] rounded-xl"
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
                          className="w-full text-left px-3 py-2 text-xs font-bold text-[#5B8DEF] hover:bg-[#121F4D] rounded-xl"
                        >
                          Staff Workspace
                        </button>
                      )}

                      <button
                        onClick={() => {
                          logout();
                          setAccountDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-900/30 rounded-xl border-t border-white/10 mt-1"
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
                className="lg:hidden p-2 text-[#FAF8F3] hover:text-[#D4AF37]"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE COLLAPSIBLE ACCORDION NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#060B1E]/95 backdrop-blur-2xl flex flex-col p-6 overflow-y-auto">
          <div className="flex justify-between items-center pb-4 border-b border-[#D4AF37]/30">
            <BrandLogo variant="horizontal" size="sm" onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }} />
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-[#FAF8F3]/60 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4 py-6">
            <button onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }} className="w-full text-left font-serif text-lg font-bold text-[#FAF8F3]">
              Home
            </button>

            <button onClick={() => { onNavigate('cad-service'); setMobileMenuOpen(false); }} className="w-full text-left font-serif text-lg font-bold text-[#FAF8F3]">
              CAD Services
            </button>

            <button onClick={() => { onNavigate('custom-design'); setMobileMenuOpen(false); }} className="w-full text-left font-serif text-lg font-bold text-[#FAF8F3]">
              Custom Design
            </button>

            <button onClick={() => { onNavigate('file-editing'); setMobileMenuOpen(false); }} className="w-full text-left font-serif text-lg font-bold text-[#FAF8F3]">
              File Editing
            </button>

            <button onClick={() => { onNavigate('ai-jewellery'); setMobileMenuOpen(false); }} className="w-full text-left font-serif text-lg font-bold text-[#FAF8F3] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" /> AI + Jewellery
            </button>

            <button onClick={() => { onNavigate('collections'); setMobileMenuOpen(false); }} className="w-full text-left font-serif text-lg font-bold text-[#FAF8F3]">
              CAD Files Catalog
            </button>

            <button onClick={() => { onNavigate('portfolio'); setMobileMenuOpen(false); }} className="w-full text-left font-serif text-lg font-bold text-[#FAF8F3]">
              Portfolio Showcase
            </button>

            <button onClick={() => { onNavigate('pricing'); setMobileMenuOpen(false); }} className="w-full text-left font-serif text-lg font-bold text-[#FAF8F3]">
              Pricing & Plans
            </button>

            <button onClick={() => { onNavigate('about'); setMobileMenuOpen(false); }} className="w-full text-left font-serif text-lg font-bold text-[#FAF8F3]">
              About Us
            </button>

            <button onClick={() => { onNavigate('contact'); setMobileMenuOpen(false); }} className="w-full text-left font-serif text-lg font-bold text-[#FAF8F3]">
              Contact Us
            </button>
          </div>
        </div>
      )}

      {/* SEARCH OVERLAY MODAL */}
      {searchOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-[#060B1E]/90 backdrop-blur-xl flex items-start justify-center pt-24 px-4">
          <div className="bg-[#09112B] border border-[#D4AF37]/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-3">
              <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest flex items-center gap-2">
                <Search className="w-4 h-4" /> Quick Search CAD Files
              </span>
              <button onClick={() => setSearchOverlayOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by ring, solitaire, SKU, or gemstone..."
              className="w-full text-sm rounded-xl border border-[#D4AF37]/30 bg-[#121F4D] text-[#FAF8F3] p-3 focus:border-[#D4AF37]"
            />
            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2">
                {searchResults.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onNavigate('product-detail', p.id);
                      setSearchOverlayOpen(false);
                    }}
                    className="p-3 bg-[#121F4D]/60 rounded-2xl border border-white/10 hover:border-[#D4AF37] cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img src={p.primaryImage} alt={p.title} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-bold text-xs text-[#FAF8F3]">{p.title}</p>
                        <span className="text-[10px] text-[#D4AF37]">{p.category}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
