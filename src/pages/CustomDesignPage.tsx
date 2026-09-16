import React, { useState, useEffect, useMemo } from 'react';
import { PageId } from '../types';
import {
  api,
  OptionGroupData,
  OptionValueData,
  CustomRequestStonePayload
} from '../services/api';
import { useCatalog, BackendProduct } from '../hooks/useCatalog';
import { PRODUCTS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Gem,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  HelpCircle,
  X,
  Ruler,
  ShieldCheck,
  Clock,
  Calendar,
  Layers,
  Feather,
  Box,
  Sliders,
  CheckCircle,
  Award,
  Search,
  Grid,
  CheckSquare,
  Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CustomDesignPageProps {
  initialProductId?: string;
  onNavigate: (page: PageId) => void;
}

interface SelectedCatalogRef {
  id: string | number;
  title: string;
  category: string;
  image: string;
}

// Ring Size Conversion Matrix
const RING_SIZE_CONVERSION_TABLE = [
  { us: '4', uk: 'H 1/2', in_hk: '7', eu: '47', inside_mm: '14.9 mm' },
  { us: '4.5', uk: 'I 1/2', in_hk: '8', eu: '48', inside_mm: '15.3 mm' },
  { us: '5', uk: 'J 1/2', in_hk: '9', eu: '49.5', inside_mm: '15.7 mm' },
  { us: '5.5', uk: 'K 1/2', in_hk: '10', eu: '50.5', inside_mm: '16.1 mm' },
  { us: '6', uk: 'L 1/2', in_hk: '12', eu: '52', inside_mm: '16.5 mm' },
  { us: '6.5', uk: 'M 1/2', in_hk: '13', eu: '53', inside_mm: '16.9 mm' },
  { us: '7', uk: 'N 1/2', in_hk: '14', eu: '54.5', inside_mm: '17.3 mm' },
  { us: '7.5', uk: 'O 1/2', in_hk: '15', eu: '55.5', inside_mm: '17.7 mm' },
  { us: '8', uk: 'P 1/2', in_hk: '16', eu: '57', inside_mm: '18.1 mm' },
  { us: '8.5', uk: 'Q 1/2', in_hk: '17', eu: '58', inside_mm: '18.5 mm' },
  { us: '9', uk: 'R 1/2', in_hk: '18', eu: '59.5', inside_mm: '18.9 mm' },
  { us: '9.5', uk: 'S 1/2', in_hk: '19', eu: '60.5', inside_mm: '19.3 mm' },
  { us: '10', uk: 'T 1/2', in_hk: '20', eu: '62', inside_mm: '19.8 mm' },
  { us: '10.5', uk: 'U 1/2', in_hk: '22', eu: '63', inside_mm: '20.2 mm' },
  { us: '11', uk: 'V 1/2', in_hk: '23', eu: '64.5', inside_mm: '20.6 mm' },
  { us: '12', uk: 'Y', in_hk: '25', eu: '67.5', inside_mm: '21.4 mm' },
];

export const CustomDesignPage: React.FC<CustomDesignPageProps> = ({
  initialProductId,
  onNavigate,
}) => {
  const { user } = useAuth();
  const catalogState = useCatalog();

  // Navigation & Step Control
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [showRingSizeModal, setShowRingSizeModal] = useState(false);

  // Dynamic Option Groups from Backend API
  const [optionGroups, setOptionGroups] = useState<OptionGroupData[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Category Selection
  const [selectedCategory, setSelectedCategory] = useState<string>('rings');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Category-Specific Specs
  const [ringSizeStandard, setRingSizeStandard] = useState('US');
  const [ringSize, setRingSize] = useState('6.5');
  const [targetWeightGrams, setTargetWeightGrams] = useState('4.5');
  const [heightMm, setHeightMm] = useState('');
  const [widthMm, setWidthMm] = useState('');
  const [chainLength, setChainLength] = useState('18 inches (Standard)');
  const [earringBacking, setEarringBacking] = useState('Push Back');
  const [wristCircumference, setWristCircumference] = useState('');
  const [braceletStyle, setBraceletStyle] = useState('Kada');
  const [customSpecsText, setCustomSpecsText] = useState('');

  // Selections Map for Dynamic Option Groups (group.key -> option_value.id)
  const [selections, setSelections] = useState<Record<string, number>>({});

  // Stones Specification
  const [isMetalOnly, setIsMetalOnly] = useState(false);
  const [stonesList, setStonesList] = useState<CustomRequestStonePayload[]>([
    {
      stone_type: 'Natural Diamond',
      shape: 'Round Brilliant',
      setting_style: 'Prong',
      size_value: '1.0',
      size_unit: 'carat',
      clarity: 'VS1',
      quantity: 1,
      is_center_stone: true
    }
  ]);

  // Personalization & Branding
  const [engravingText, setEngravingText] = useState('');
  const [engravingFont, setEngravingFont] = useState('Script');
  const [engravingPlacement, setEngravingPlacement] = useState('Inside Shank');
  const [hasLogo, setHasLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>('');
  const [logoError, setLogoError] = useState('');

  // Step 4 Reference Images - 2 Mode Options: Existing Products vs Upload Files
  const [activeReferenceTab, setActiveReferenceTab] = useState<'catalog' | 'upload'>('catalog');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('all');
  const [selectedCatalogProducts, setSelectedCatalogProducts] = useState<SelectedCatalogRef[]>([]);

  // Files & Attachments
  const [sketchFiles, setSketchFiles] = useState<File[]>([]);
  const [sketchPreviews, setSketchPreviews] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState(
    initialProductId ? `Referencing SKU #${initialProductId} modifications.` : ''
  );

  // Project Complexity Tier & Needed By Date
  const [projectTier, setProjectTier] = useState('High Precision Fine Jewelry');
  const [neededByDate, setNeededByDate] = useState('');
  const [selectedDeliverySpeedId, setSelectedDeliverySpeedId] = useState<number | null>(null);

  // Contact Info
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Prefill Auth User Info
  useEffect(() => {
    if (user) {
      if (user.first_name) setClientName(`${user.first_name} ${user.last_name || ''}`.trim());
      if (user.email) setClientEmail(user.email);
      if (user.phone_number) setClientPhone(user.phone_number);
    }
  }, [user]);

  // Merge Catalog Products for Reference Selection (Backend + Mock fallback)
  const availableCatalogProducts = useMemo<SelectedCatalogRef[]>(() => {
    const list: SelectedCatalogRef[] = [];

    // Add backend products
    if (catalogState.products && catalogState.products.length > 0) {
      catalogState.products.forEach(bp => {
        list.push({
          id: bp.id || bp.slug,
          title: bp.title,
          category: bp.category_name || 'Jewelry',
          image: bp.primary_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80'
        });
      });
    }

    // Add static products if empty or to augment
    PRODUCTS.forEach(p => {
      if (!list.some(item => String(item.id) === String(p.id))) {
        list.push({
          id: p.id,
          title: p.title,
          category: p.category,
          image: p.primaryImage
        });
      }
    });

    return list;
  }, [catalogState.products]);

  // Filtered Catalog Items for Reference Picker
  const filteredCatalogItems = useMemo(() => {
    return availableCatalogProducts.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
                            String(item.id).toLowerCase().includes(catalogSearchQuery.toLowerCase());
      const matchesCategory = catalogCategoryFilter === 'all' ||
                              item.category.toLowerCase().includes(catalogCategoryFilter.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [availableCatalogProducts, catalogSearchQuery, catalogCategoryFilter]);

  // Auto-select initialProductId if passed
  useEffect(() => {
    if (initialProductId && availableCatalogProducts.length > 0) {
      const match = availableCatalogProducts.find(p => String(p.id) === String(initialProductId));
      if (match && !selectedCatalogProducts.some(p => String(p.id) === String(match.id))) {
        setSelectedCatalogProducts(prev => [...prev, match]);
      }
    }
  }, [initialProductId, availableCatalogProducts]);

  // Load Option Groups & Categories from Backend
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setOptionsLoading(true);
      try {
        const [groupsData, catsData] = await Promise.all([
          api.getOptionGroups().catch(() => []),
          api.getCategories(true).catch(() => [])
        ]);

        if (!isMounted) return;

        setOptionGroups(Array.isArray(groupsData) ? groupsData : []);
        setCategories(Array.isArray(catsData) ? catsData : []);

        if (Array.isArray(catsData) && catsData.length > 0) {
          setSelectedCategoryId(catsData[0].id);
        }

        // Set default selections for each group
        if (Array.isArray(groupsData)) {
          const defaults: Record<string, number> = {};
          groupsData.forEach(group => {
            const activeOptions = (group.options || []).filter(o => o.is_active);
            if (activeOptions.length > 0) {
              defaults[group.key] = activeOptions[0].id;
            }
          });
          setSelections(defaults);

          // Find default delivery speed id
          const deliveryGroup = groupsData.find(g => g.key === 'delivery_speed');
          if (deliveryGroup && deliveryGroup.options && deliveryGroup.options.length > 0) {
            const std = deliveryGroup.options.find(o => o.key === 'standard' || o.label.toLowerCase().includes('standard')) || deliveryGroup.options[0];
            setSelectedDeliverySpeedId(std.id);
          }
        }
      } catch (err) {
        console.error('Failed to load custom design option groups:', err);
      } finally {
        if (isMounted) setOptionsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Helper maps for option groups
  const groupMap = useMemo(() => {
    const map: Record<string, OptionGroupData> = {};
    optionGroups.forEach(g => {
      map[g.key] = g;
    });
    return map;
  }, [optionGroups]);

  // Selected Metal object to check if Gold Purity should be shown
  const selectedMetalObj = useMemo(() => {
    const metalGroupId = selections['metal'];
    if (!metalGroupId || !groupMap['metal']) return null;
    return groupMap['metal'].options.find(o => o.id === metalGroupId);
  }, [selections, groupMap]);

  const isGoldSelected = useMemo(() => {
    if (!selectedMetalObj) return true;
    const label = selectedMetalObj.label.toLowerCase();
    const key = selectedMetalObj.key.toLowerCase();
    return label.includes('gold') || key.includes('gold');
  }, [selectedMetalObj]);

  // Selected Option Values summary helper
  const selectedValuesSummary = useMemo(() => {
    const summary: { group: string; value: string; color?: string }[] = [];
    Object.entries(selections).forEach(([groupKey, valueId]) => {
      const g = groupMap[groupKey];
      if (g) {
        const val = (g.options || []).find(o => o.id === valueId);
        if (val) {
          summary.push({ group: g.label, value: val.label, color: val.swatch_color });
        }
      }
    });
    return summary;
  }, [selections, groupMap]);

  // Toggle Selection of a Catalog Product
  const toggleCatalogProductRef = (item: SelectedCatalogRef) => {
    setSelectedCatalogProducts(prev => {
      const exists = prev.some(p => String(p.id) === String(item.id));
      if (exists) {
        return prev.filter(p => String(p.id) !== String(item.id));
      } else {
        return [...prev, item];
      }
    });
  };

  // Handle Logo Upload with Format Validation
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['.svg', '.ai', '.eps', '.pdf', '.png', '.jpg', '.jpeg'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        setLogoError(`Invalid logo format (${ext}). Allowed formats: SVG, AI, EPS, PDF, PNG, JPG`);
        return;
      }
      setLogoFile(file);
      setLogoPreviewUrl(URL.createObjectURL(file as Blob));
      setHasLogo(true);
    }
  };

  // Handle Sketches Upload
  const handleSketchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setSketchFiles(prev => [...prev, ...filesArr]);
      const newPreviews = filesArr.map(f => URL.createObjectURL(f as Blob));
      setSketchPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeSketch = (index: number) => {
    setSketchFiles(prev => prev.filter((_, i) => i !== index));
    setSketchPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Stone Add/Remove
  const addStoneRow = () => {
    setStonesList(prev => [
      ...prev,
      {
        stone_type: 'Natural Diamond',
        shape: 'Round Brilliant',
        setting_style: 'Prong',
        size_value: '0.50',
        size_unit: 'carat',
        clarity: 'VS1',
        quantity: 1,
        is_center_stone: false
      }
    ]);
  };

  const removeStoneRow = (index: number) => {
    setStonesList(prev => prev.filter((_, i) => i !== index));
  };

  const updateStoneRow = (index: number, field: keyof CustomRequestStonePayload, val: any) => {
    setStonesList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Handle Form Submission (Quote Only vs Place Order)
  const handleSubmit = async (submissionIntent: 'quote_only' | 'place_order') => {
    setSubmissionError('');
    setIsSubmitting(true);

    try {
      const selectedValueIds: number[] = Object.values(selections).filter((id): id is number => typeof id === 'number' && Boolean(id));
      const selectedOptionsPayload = selectedValueIds.map(valId => {
        let groupObj = optionGroups.find(g => (g.options || []).some(o => o.id === valId));
        return {
          option_group: groupObj ? groupObj.id : 1,
          option_value: valId
        };
      });

      // Format catalog references into instructions text
      let fullNotes = specialInstructions;
      if (selectedCatalogProducts.length > 0) {
        const catRefsText = selectedCatalogProducts.map(p => `[Ref SKU: ${p.id} - ${p.title}]`).join(', ');
        fullNotes = `${fullNotes ? fullNotes + '\n' : ''}Catalog References: ${catRefsText}`;
      }

      const bodyData = {
        category: selectedCategoryId,
        category_group: selectedCategory,
        ring_size_standard: selectedCategory === 'rings' ? ringSizeStandard : '',
        ring_size: selectedCategory === 'rings' ? ringSize : '',
        target_weight_grams: selectedCategory === 'rings' ? targetWeightGrams : '',
        height_mm: heightMm,
        width_mm: widthMm,
        chain_length: chainLength,
        earring_backing: earringBacking,
        wrist_circumference: wristCircumference,
        bracelet_style: braceletStyle,
        custom_specs_text: customSpecsText,
        is_metal_only: isMetalOnly,
        engraving_text: engravingText,
        engraving_font: engravingFont,
        engraving_placement: engravingPlacement,
        has_logo: hasLogo,
        budget_range: projectTier,
        needed_by_date: neededByDate || null,
        special_instructions: fullNotes,
        submission_intent: submissionIntent,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        selected_options: selectedOptionsPayload,
        stones: isMetalOnly ? [] : stonesList
      };

      const res = await api.createCustomRequest(bodyData);
      setSubmittedTicket(res);
      setIsSubmitted(true);
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 } });
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmissionError(err.message || 'Failed to submit design specification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category Selector Config
  const categoryGroups = [
    { id: 'rings', name: 'Rings', icon: Sparkles, desc: 'Engagement, Solitaire, Eternity, Wedding & Fashion Rings' },
    { id: 'pendants', name: 'Pendants & Necklaces', icon: Layers, desc: 'Pendants, Solitaire Drops, Statement Chokers & Chains' },
    { id: 'earrings', name: 'Earrings', icon: Gem, desc: 'Studs, Drop Earrings, Dangles, Hoops & Huggies' },
    { id: 'bracelets', name: 'Bracelets & Bangles', icon: Ruler, desc: 'Kadas, Tennis Bracelets, Stackable Bangles & Cuffs' },
    { id: 'other', name: 'Custom / Other', icon: Feather, desc: 'Brooches, Cufflinks, Sculptures & Specialty Concepts' },
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#060B1E] text-[#F5F1E8] pt-24 pb-24 px-4 sm:px-8 lg:px-12 relative overflow-hidden">
        <div className="max-w-3xl mx-auto bg-[#09112B]/90 backdrop-blur-xl rounded-3xl border border-[#D4AF37]/40 shadow-2xl p-8 sm:p-12 text-center my-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#F5E7A3] via-[#D4AF37] to-[#B8860B] rounded-full flex items-center justify-center mx-auto mb-6 text-[#0B1330] shadow-[0_0_30px_rgba(212,175,55,0.4)]">
            <CheckCircle2 className="w-10 h-10 animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif gold-gradient-text font-bold mb-3 tracking-wide">
            {submittedTicket?.submission_intent === 'quote_only'
              ? 'Specification Quote Requested'
              : 'Custom 3D CAD Request Submitted!'}
          </h1>
          <p className="text-[#FAF8F3]/80 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Your custom specification ticket <span className="font-mono font-bold text-[#F5E7A3] bg-[#D4AF37]/20 px-3 py-1 rounded-full border border-[#D4AF37]/30">#{submittedTicket?.ticket_id || 'CR-SUCCESS'}</span> has been assigned to our master CAD engineering team.
          </p>

          {/* Specification Summary Card */}
          <div className="bg-[#121F4D]/80 border border-[#D4AF37]/30 rounded-2xl p-6 text-left mb-8 max-w-md mx-auto space-y-3">
            <h3 className="font-serif gold-gradient-text text-sm font-bold uppercase tracking-widest pb-2 border-b border-[#D4AF37]/20">
              Specification Details
            </h3>
            <div className="space-y-2 text-xs text-[#FAF8F3]/80">
              <div className="flex justify-between">
                <span className="text-[#FAF8F3]/60">Design Category:</span>
                <span className="font-bold text-[#FAF8F3] capitalize">{selectedCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#FAF8F3]/60">Client Contact:</span>
                <span className="font-bold text-[#F5E7A3]">{clientName || user?.first_name || 'Valued Client'}</span>
              </div>
              {selectedCatalogProducts.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#FAF8F3]/60">Catalog Reference:</span>
                  <span className="font-bold text-[#D4AF37]">{selectedCatalogProducts.length} Product(s) Selected</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#FAF8F3]/60">Included Assets:</span>
                <span className="font-bold text-[#D4AF37]">3DM + Printable STL + 4K Renders</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('my-submissions')}
              className="px-8 py-3.5 btn-gold-luxury font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              View My CAD Submissions <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setCurrentStep(1);
              }}
              className="px-8 py-3.5 bg-transparent border border-[#D4AF37]/40 text-[#F5E7A3] font-bold rounded-xl hover:bg-[#D4AF37]/10 transition-all"
            >
              Start Another Custom Specification
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B1E] text-[#F5F1E8] pt-24 sm:pt-28 pb-24 px-4 sm:px-8 lg:px-12 relative overflow-hidden">
      {/* Container aligned with site width */}
      <div className="max-w-[1536px] mx-auto space-y-6 relative z-10">

        {/* STREAMLINED COMPACT HEADER */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h1 className="text-3xl sm:text-4xl font-serif gold-gradient-text font-bold tracking-tight">
            Custom Design & 3D CAD Studio
          </h1>
          <p className="text-[#FAF8F3]/70 text-xs sm:text-sm">
            Configure your exact jewelry specifications for 100% 3D printability and precision casting.
          </p>
        </div>

        {/* Stepper Header (Compact Bar) */}
        <div className="max-w-4xl mx-auto bg-[#09112B]/80 backdrop-blur-md p-3.5 rounded-2xl border border-[#D4AF37]/30 shadow-xl">
          <div className="flex justify-between items-center relative">
            {[
              { step: 1, title: 'Category & Specs' },
              { step: 2, title: 'Metal & Style' },
              { step: 3, title: 'Stones & Gemstones' },
              { step: 4, title: 'Branding & References' },
              { step: 5, title: 'Review & Dispatch' },
            ].map((s) => (
              <div key={s.step} className="flex-1 flex flex-col items-center relative z-10">
                <button
                  onClick={() => currentStep > s.step && setCurrentStep(s.step)}
                  disabled={currentStep < s.step}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    currentStep === s.step
                      ? 'bg-gradient-to-r from-[#F5E7A3] via-[#D4AF37] to-[#B8860B] text-[#0B1330] shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-110 font-extrabold'
                      : currentStep > s.step
                      ? 'bg-[#1E4FA3] text-white border border-[#5B8DEF]/40 cursor-pointer'
                      : 'bg-[#121F4D]/60 text-[#FAF8F3]/40 border border-white/10 cursor-not-allowed'
                  }`}
                >
                  {currentStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                </button>
                <span className={`text-[11px] font-semibold mt-1.5 hidden sm:block ${currentStep === s.step ? 'text-[#F5E7A3]' : 'text-[#FAF8F3]/50'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Form Grid & Specification Summary Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-8 bg-[#09112B]/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-2xl">
            {optionsLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin mx-auto mb-4" />
                <p className="text-[#FAF8F3]/60 font-medium text-sm">Loading studio design parameters from database...</p>
              </div>
            ) : (
              <>
                {/* STEP 1: CATEGORY & CATEGORY-SPECIFIC SPECS */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-serif gold-gradient-text font-bold mb-1">Step 1: Select Jewelry Type</h2>
                      <p className="text-xs text-[#FAF8F3]/60">Choose your base design category to reveal tailored dimension controls.</p>
                    </div>

                    {/* Category Selector Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {categoryGroups.map(cat => {
                        const IconComp = cat.icon;
                        const isSel = selectedCategory === cat.id;
                        return (
                          <div
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              const matched = categories.find(c => c.slug?.toLowerCase() === cat.id || c.name?.toLowerCase().includes(cat.id.slice(0, 4)));
                              if (matched) setSelectedCategoryId(matched.id);
                            }}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                              isSel
                                ? 'border-[#D4AF37] bg-[#121F4D]/90 shadow-[0_0_20px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]/50'
                                : 'border-white/10 hover:border-[#D4AF37]/40 bg-[#09112B]/60'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-2 rounded-xl ${isSel ? 'bg-[#D4AF37] text-[#0B1330]' : 'bg-[#121F4D] text-[#D4AF37]'}`}>
                                <IconComp className="w-5 h-5" />
                              </div>
                              <span className="font-bold text-[#FAF8F3] text-sm">{cat.name}</span>
                            </div>
                            <p className="text-xs text-[#FAF8F3]/60 line-clamp-2">{cat.desc}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Ring Specific Dimension Options */}
                    {selectedCategory === 'rings' && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/25 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                            <Ruler className="w-4 h-4 text-[#D4AF37]" /> Ring Sizing & Metal Weight Specs
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowRingSizeModal(true)}
                            className="text-xs font-semibold text-[#F5E7A3] hover:text-white flex items-center gap-1 underline"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" /> Size Chart & Conversion
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Sizing Standard</label>
                            <select
                              value={ringSizeStandard}
                              onChange={e => setRingSizeStandard(e.target.value)}
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                            >
                              <option value="US">US / Canada</option>
                              <option value="UK">UK / Australia</option>
                              <option value="IN_HK">Indian / Hong Kong</option>
                              <option value="EU">European (ISO)</option>
                              <option value="MM">Inside Diameter (mm)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Target Ring Size</label>
                            <input
                              type="text"
                              value={ringSize}
                              onChange={e => setRingSize(e.target.value)}
                              placeholder="e.g. 6.5 or 16.9mm"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Target Metal Weight (g)</label>
                            <input
                              type="text"
                              value={targetWeightGrams}
                              onChange={e => setTargetWeightGrams(e.target.value)}
                              placeholder="e.g. 4.5g"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pendants Specific Specs */}
                    {selectedCategory === 'pendants' && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/25 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-[#D4AF37]" /> Pendant & Necklace Dimensions
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Height (mm)</label>
                            <input
                              type="text"
                              value={heightMm}
                              onChange={e => setHeightMm(e.target.value)}
                              placeholder="e.g. 24 mm"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Width (mm)</label>
                            <input
                              type="text"
                              value={widthMm}
                              onChange={e => setWidthMm(e.target.value)}
                              placeholder="e.g. 16 mm"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Chain Preference</label>
                            <select
                              value={chainLength}
                              onChange={e => setChainLength(e.target.value)}
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                            >
                              <option value="No Chain / Pendant Only">No Chain / Pendant Only</option>
                              <option value="16 inches (Choker)">16 inches (Choker)</option>
                              <option value="18 inches (Standard)">18 inches (Standard)</option>
                              <option value="20 inches (Matinee)">20 inches (Matinee)</option>
                              <option value="24 inches (Opera)">24 inches (Opera)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Earrings Specific Specs */}
                    {selectedCategory === 'earrings' && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/25 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-[#D4AF37]" /> Earring Architecture
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Drop Length / Stud Diameter (mm)</label>
                            <input
                              type="text"
                              value={heightMm}
                              onChange={e => setHeightMm(e.target.value)}
                              placeholder="e.g. 12mm stud or 45mm drop"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Backing Mechanism</label>
                            <select
                              value={earringBacking}
                              onChange={e => setEarringBacking(e.target.value)}
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                            >
                              <option value="Push Back">Push Back (Friction Post)</option>
                              <option value="Screw Back">Screw Back (Security Post)</option>
                              <option value="Lever Back">Lever Back</option>
                              <option value="French Hook">French Wire / Fish Hook</option>
                              <option value="Hoop Catch">Hinged Hoop Catch</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bracelets Specific Specs */}
                    {selectedCategory === 'bracelets' && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/25 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-[#D4AF37]" /> Wrist & Bangle Dimensions
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Wrist Circumference / Inner Diameter</label>
                            <input
                              type="text"
                              value={wristCircumference}
                              onChange={e => setWristCircumference(e.target.value)}
                              placeholder="e.g. 7.0 inches or 2.4 Kada size"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Bracelet Type</label>
                            <select
                              value={braceletStyle}
                              onChange={e => setBraceletStyle(e.target.value)}
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                            >
                              <option value="Kada">Traditional Kada</option>
                              <option value="Tennis Bracelet">Tennis Bracelet (Continuous Stones)</option>
                              <option value="Link / Chain">Link / Charm Chain</option>
                              <option value="Rigid Cuff">Rigid Cuff</option>
                              <option value="Flexible Bangle">Flexible Stackable Bangle</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Specs for Other */}
                    {selectedCategory === 'other' && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/25 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                          <Feather className="w-4 h-4 text-[#D4AF37]" /> Custom Concept Requirements
                        </h3>
                        <div>
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Dimensional & Structural Requirements</label>
                          <textarea
                            rows={3}
                            value={customSpecsText}
                            onChange={e => setCustomSpecsText(e.target.value)}
                            placeholder="Describe target dimensions, pin backings, hinges, or special structural mechanisms..."
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] p-3"
                          />
                        </div>
                      </div>
                    )}

                    {/* CAD Deliverable Format Dropdown */}
                    {groupMap['cad_file_format'] && (
                      <div>
                        <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Required CAD Output Format</label>
                        <select
                          value={selections['cad_file_format'] || ''}
                          onChange={e => setSelections(prev => ({ ...prev, cad_file_format: Number(e.target.value) }))}
                          className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                        >
                          {(groupMap['cad_file_format'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label} {opt.description ? `(${opt.description})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: METAL & DESIGN STYLE */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-serif gold-gradient-text font-bold mb-1">Step 2: Metal Alloy & Design Style</h2>
                      <p className="text-xs text-[#FAF8F3]/60">Select your target metal alloy, gold purity, and structural aesthetic profile.</p>
                    </div>

                    {/* Metal Alloy Selector */}
                    {groupMap['metal'] && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider">Metal Alloy Selection</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {(groupMap['metal'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => {
                              const isSel = selections['metal'] === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => setSelections(prev => ({ ...prev, metal: opt.id }))}
                                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all duration-300 ${
                                    isSel
                                      ? 'border-[#D4AF37] bg-[#121F4D] shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]/50'
                                      : 'border-white/10 hover:border-[#D4AF37]/30 bg-[#09112B]/60'
                                  }`}
                                >
                                  <span
                                    className="w-7 h-7 rounded-full border border-white/20 shadow-inner flex-shrink-0"
                                    style={{ backgroundColor: opt.swatch_color || '#E5E4E2' }}
                                  />
                                  <div>
                                    <p className="font-bold text-[#FAF8F3] text-xs">{opt.label}</p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Gold Purity Selector - Only shown if Gold is selected */}
                    {isGoldSelected && groupMap['gold_purity'] && (
                      <div className="space-y-3 bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-4">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Gold Purity Standard
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {(groupMap['gold_purity'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => {
                              const isSel = selections['gold_purity'] === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setSelections(prev => ({ ...prev, gold_purity: opt.id }))}
                                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                                    isSel
                                      ? 'bg-[#D4AF37] text-[#0B1330] border-[#F5E7A3] shadow-md font-extrabold'
                                      : 'bg-[#09112B] text-[#FAF8F3]/80 border-white/10 hover:border-[#D4AF37]/40'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Design Style Selector */}
                    {groupMap['design_style'] && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider">Aesthetic & Setting Architecture</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(groupMap['design_style'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => {
                              const isSel = selections['design_style'] === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => setSelections(prev => ({ ...prev, design_style: opt.id }))}
                                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                    isSel
                                      ? 'border-[#D4AF37] bg-[#121F4D] shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]/50'
                                      : 'border-white/10 hover:border-[#D4AF37]/30 bg-[#09112B]/60'
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-[#FAF8F3] text-sm">{opt.label}</span>
                                  </div>
                                  {opt.description && (
                                    <p className="text-xs text-[#FAF8F3]/60">{opt.description}</p>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Ring Type Selector (if category is rings) */}
                    {selectedCategory === 'rings' && groupMap['ring_type'] && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider">Ring Style Profile</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {(groupMap['ring_type'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => {
                              const isSel = selections['ring_type'] === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setSelections(prev => ({ ...prev, ring_type: opt.id }))}
                                  className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition-all ${
                                    isSel
                                      ? 'bg-[#1E4FA3] text-white border-[#5B8DEF]/60 font-bold shadow-md'
                                      : 'bg-[#09112B] text-[#FAF8F3]/70 border-white/10 hover:border-[#D4AF37]/30'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: STONES & GEMSTONES */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-serif gold-gradient-text font-bold mb-1">Step 3: Gemstones & Setting Architecture</h2>
                      <p className="text-xs text-[#FAF8F3]/60">Configure multi-stone arrangements, stone shapes, and precise seat clearances.</p>
                    </div>

                    {/* Metal-only Toggle */}
                    <div className="bg-[#121F4D]/60 border border-[#D4AF37]/30 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-[#FAF8F3] text-sm">Solid Metal Design (No Stones)</h4>
                        <p className="text-xs text-[#FAF8F3]/60">Enable if your design is plain gold/silver band or engraving-only piece.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isMetalOnly}
                          onChange={e => setIsMetalOnly(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                      </label>
                    </div>

                    {!isMetalOnly && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1.5">
                            <Gem className="w-4 h-4 text-[#D4AF37]" /> Stone Layout Breakdown ({stonesList.length})
                          </h3>
                          <button
                            type="button"
                            onClick={addStoneRow}
                            className="px-3 py-1.5 bg-[#D4AF37]/15 text-[#F5E7A3] hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Another Stone Row
                          </button>
                        </div>

                        {stonesList.map((stone, idx) => (
                          <div key={idx} className="p-4 bg-[#121F4D]/40 border border-white/10 rounded-2xl relative space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-white/10">
                              <span className="text-xs font-bold text-[#F5E7A3] uppercase">
                                Stone #{idx + 1} {stone.is_center_stone ? '(Main Centerpiece)' : '(Accent Stone)'}
                              </span>
                              {stonesList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeStoneRow(idx)}
                                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Stone Type</label>
                                <select
                                  value={stone.stone_type}
                                  onChange={e => updateStoneRow(idx, 'stone_type', e.target.value)}
                                  className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2.5"
                                >
                                  <option value="Natural Diamond">Natural Diamond</option>
                                  <option value="Lab Diamond">Lab-Grown Diamond</option>
                                  <option value="Moissanite">Moissanite</option>
                                  <option value="Blue Sapphire">Blue Sapphire</option>
                                  <option value="Emerald">Colombian Emerald</option>
                                  <option value="Ruby">Burmese Ruby</option>
                                  <option value="Cubic Zirconia">Cubic Zirconia (CZ)</option>
                                  <option value="Other Gemstone">Other Precious Gemstone</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Stone Shape</label>
                                <select
                                  value={stone.shape}
                                  onChange={e => updateStoneRow(idx, 'shape', e.target.value)}
                                  className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2.5"
                                >
                                  {(groupMap['stone_shape']?.options || [])
                                    .filter(o => o.is_active)
                                    .map(o => (
                                      <option key={o.id} value={o.label}>{o.label}</option>
                                    ))}
                                  {(!groupMap['stone_shape'] || groupMap['stone_shape'].options.length === 0) && (
                                    <>
                                      <option value="Round Brilliant">Round Brilliant</option>
                                      <option value="Oval">Oval</option>
                                      <option value="Emerald Cut">Emerald Cut</option>
                                      <option value="Princess">Princess</option>
                                      <option value="Cushion">Cushion</option>
                                      <option value="Pear">Pear</option>
                                    </>
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Setting Style</label>
                                <select
                                  value={stone.setting_style}
                                  onChange={e => updateStoneRow(idx, 'setting_style', e.target.value)}
                                  className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2.5"
                                >
                                  {(groupMap['stone_setting']?.options || [])
                                    .filter(o => o.is_active)
                                    .map(o => (
                                      <option key={o.id} value={o.label}>{o.label}</option>
                                    ))}
                                  {(!groupMap['stone_setting'] || groupMap['stone_setting'].options.length === 0) && (
                                    <>
                                      <option value="Prong">Prong</option>
                                      <option value="Bezel">Bezel</option>
                                      <option value="Channel">Channel</option>
                                      <option value="Pave">Pave</option>
                                      <option value="Flush">Flush</option>
                                    </>
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Size Value & Unit</label>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={stone.size_value}
                                    onChange={e => updateStoneRow(idx, 'size_value', e.target.value)}
                                    placeholder="1.0"
                                    className="w-1/2 text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2"
                                  />
                                  <select
                                    value={stone.size_unit}
                                    onChange={e => updateStoneRow(idx, 'size_unit', e.target.value)}
                                    className="w-1/2 text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-1"
                                  >
                                    <option value="carat">carat (ct)</option>
                                    <option value="mm">mm size</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Stone Clarity Grade</label>
                                <select
                                  value={stone.clarity}
                                  onChange={e => updateStoneRow(idx, 'clarity', e.target.value)}
                                  className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2.5"
                                >
                                  <option value="VVS1">VVS1 (Very Very Slight)</option>
                                  <option value="VVS2">VVS2</option>
                                  <option value="VS1">VS1 (Very Slight)</option>
                                  <option value="VS2">VS2</option>
                                  <option value="SI1">SI1 (Slight Inclusion)</option>
                                  <option value="SI2">SI2</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Stone Count (Qty)</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={stone.quantity}
                                  onChange={e => updateStoneRow(idx, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2.5"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="checkbox"
                                id={`center_stone_${idx}`}
                                checked={stone.is_center_stone || false}
                                onChange={e => updateStoneRow(idx, 'is_center_stone', e.target.checked)}
                                className="rounded border-white/20 text-[#D4AF37] focus:ring-[#D4AF37]"
                              />
                              <label htmlFor={`center_stone_${idx}`} className="text-xs font-medium text-[#FAF8F3]/80 cursor-pointer">
                                Mark as Main Centerpiece Stone
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: BRANDING & REFERENCES */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-serif gold-gradient-text font-bold mb-1">Step 4: Branding & Reference Attachments</h2>
                      <p className="text-xs text-[#FAF8F3]/60">Select catalog designs or upload custom reference sketches & hallmark vector logos.</p>
                    </div>

                    {/* Engraving Specs */}
                    <div className="bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4">
                      <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#D4AF37]" /> Custom Engraving Personalization
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Engraving Text</label>
                          <input
                            type="text"
                            value={engravingText}
                            onChange={e => setEngravingText(e.target.value)}
                            placeholder="e.g. Forever & Always"
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Font Style</label>
                          <select
                            value={engravingFont}
                            onChange={e => setEngravingFont(e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                          >
                            <option value="Script">Calligraphy Script</option>
                            <option value="Block">Modern Block Sans</option>
                            <option value="Roman">Classic Roman Serif</option>
                            <option value="Gothic">Vintage Gothic</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Placement</label>
                          <select
                            value={engravingPlacement}
                            onChange={e => setEngravingPlacement(e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                          >
                            <option value="Inside Shank">Inside Shank / Band</option>
                            <option value="Outside Shank">Outside Shank</option>
                            <option value="Pendant Backing">Pendant Backplate</option>
                            <option value="Bail">Bail Accent</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Studio / Brand Logo Upload */}
                    <div className="bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" /> Studio Hallmark & Vector Logo Stamp
                          </h3>
                          <p className="text-xs text-[#FAF8F3]/60">Stamp your studio hallmark directly onto 3D model geometry.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasLogo}
                            onChange={e => setHasLogo(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                        </label>
                      </div>

                      {hasLogo && (
                        <div className="pt-2">
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">
                            Upload Vector Logo (.svg, .ai, .eps, .pdf, .png, .jpg)
                          </label>
                          <input
                            type="file"
                            accept=".svg,.ai,.eps,.pdf,.png,.jpg,.jpeg"
                            onChange={handleLogoUpload}
                            className="block w-full text-xs text-[#FAF8F3]/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#D4AF37] file:text-[#0B1330] hover:file:bg-[#F5E7A3]"
                          />
                          {logoError && (
                            <p className="text-xs text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> {logoError}
                            </p>
                          )}
                          {logoFile && !logoError && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Selected: {logoFile.name}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* REFERENCE IMAGES / HAND SKETCHES SECTION - DUAL OPTION (CATALOG vs UPLOAD) */}
                    <div className="bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div>
                          <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                            <Grid className="w-4 h-4 text-[#D4AF37]" /> Reference Designs & Hand Sketches
                          </h3>
                          <p className="text-xs text-[#FAF8F3]/60">Choose from existing studio CAD catalog products or upload custom hand sketches.</p>
                        </div>

                        {/* Dual Option Mode Tabs */}
                        <div className="inline-flex bg-[#09112B] p-1 rounded-xl border border-[#D4AF37]/30">
                          <button
                            type="button"
                            onClick={() => setActiveReferenceTab('catalog')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              activeReferenceTab === 'catalog'
                                ? 'bg-gradient-to-r from-[#F5E7A3] via-[#D4AF37] to-[#B8860B] text-[#0B1330] shadow-md'
                                : 'text-[#FAF8F3]/70 hover:text-white'
                            }`}
                          >
                            <Grid className="w-3.5 h-3.5" /> Option 1: Existing Studio Products
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveReferenceTab('upload')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              activeReferenceTab === 'upload'
                                ? 'bg-gradient-to-r from-[#F5E7A3] via-[#D4AF37] to-[#B8860B] text-[#0B1330] shadow-md'
                                : 'text-[#FAF8F3]/70 hover:text-white'
                            }`}
                          >
                            <Upload className="w-3.5 h-3.5" /> Option 2: Upload Custom File
                          </button>
                        </div>
                      </div>

                      {/* Selected Catalog References summary bar */}
                      {selectedCatalogProducts.length > 0 && (
                        <div className="p-3 bg-[#09112B]/90 border border-[#D4AF37]/40 rounded-xl space-y-2">
                          <span className="text-[11px] font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5 text-[#D4AF37]" /> Selected Studio Catalog References ({selectedCatalogProducts.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {selectedCatalogProducts.map(p => (
                              <div key={p.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#121F4D] border border-[#D4AF37]/30 text-xs text-[#FAF8F3]">
                                <img src={p.image} alt={p.title} className="w-5 h-5 rounded object-cover" />
                                <span className="truncate max-w-[150px] font-semibold">{p.title}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleCatalogProductRef(p)}
                                  className="text-rose-400 hover:text-rose-200"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TAB 1: EXISTING CATALOG PRODUCTS */}
                      {activeReferenceTab === 'catalog' && (
                        <div className="space-y-3">
                          {/* Search & Category Filter Controls */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                              <Search className="w-4 h-4 text-[#D4AF37] absolute left-3 top-2.5" />
                              <input
                                type="text"
                                value={catalogSearchQuery}
                                onChange={e => setCatalogSearchQuery(e.target.value)}
                                placeholder="Search studio catalog products by title or SKU..."
                                className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 pl-9 pr-3"
                              />
                            </div>
                            <select
                              value={catalogCategoryFilter}
                              onChange={e => setCatalogCategoryFilter(e.target.value)}
                              className="text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3 sm:w-44"
                            >
                              <option value="all">All Categories</option>
                              <option value="ring">Rings</option>
                              <option value="pendant">Pendants & Necklaces</option>
                              <option value="earring">Earrings</option>
                              <option value="bangle">Bracelets & Bangles</option>
                            </select>
                          </div>

                          {/* Product Grid Picker */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                            {filteredCatalogItems.map(item => {
                              const isSel = selectedCatalogProducts.some(p => String(p.id) === String(item.id));
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => toggleCatalogProductRef(item)}
                                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative group ${
                                    isSel
                                      ? 'border-[#D4AF37] bg-[#121F4D] shadow-[0_0_12px_rgba(212,175,55,0.4)] ring-1 ring-[#D4AF37]'
                                      : 'border-white/10 hover:border-[#D4AF37]/40 bg-[#09112B]/70'
                                  }`}
                                >
                                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-900 mb-2 relative">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    {isSel && (
                                      <div className="absolute top-1.5 right-1.5 p-1 bg-[#D4AF37] text-[#0B1330] rounded-full shadow-md">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#FAF8F3] text-xs line-clamp-1">{item.title}</p>
                                    <span className="text-[10px] text-[#D4AF37] block">Ref SKU #{item.id}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {filteredCatalogItems.length === 0 && (
                              <div className="col-span-full py-8 text-center text-xs text-[#FAF8F3]/50">
                                No matching studio catalog products found. Try changing your search query or upload a custom sketch file.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* TAB 2: UPLOAD CUSTOM SKETCHES & FILES */}
                      {activeReferenceTab === 'upload' && (
                        <div className="space-y-3">
                          <div className="border-2 border-dashed border-[#D4AF37]/40 rounded-2xl p-6 text-center hover:border-[#D4AF37] bg-[#09112B]/60 transition-all cursor-pointer relative">
                            <input
                              type="file"
                              multiple
                              accept="image/*,.pdf"
                              onChange={handleSketchUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                            <p className="text-xs font-bold text-[#FAF8F3]">Click or drag custom reference sketches here</p>
                            <p className="text-[11px] text-[#FAF8F3]/50">PNG, JPG, PDF up to 10MB each</p>
                          </div>

                          {sketchPreviews.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
                              {sketchPreviews.map((url, i) => (
                                <div key={i} className="relative group rounded-xl overflow-hidden border border-white/20 aspect-square bg-slate-900">
                                  <img src={url} alt={`Sketch ${i}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => removeSketch(i)}
                                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Notes & Instructions */}
                    <div>
                      <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider mb-1.5">Special Design Notes</label>
                      <textarea
                        rows={3}
                        value={specialInstructions}
                        onChange={e => setSpecialInstructions(e.target.value)}
                        placeholder="Add specific instructions regarding prong thickness, metal relief, hollow interior, or stone clearance..."
                        className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                      />
                    </div>

                    {/* Complexity Tier & Timeline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-[#D4AF37]" /> Production Complexity Tier
                        </label>
                        <select
                          value={projectTier}
                          onChange={e => setProjectTier(e.target.value)}
                          className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                        >
                          <option value="Standard Commercial CAD">Standard Commercial CAD</option>
                          <option value="High Precision Fine Jewelry">High Precision Fine Jewelry</option>
                          <option value="Exquisite Masterpiece">Exquisite Masterpiece</option>
                          <option value="Haute Joaillerie Atelier">Haute Joaillerie Atelier</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" /> Target Completion Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={neededByDate}
                          onChange={e => setNeededByDate(e.target.value)}
                          className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: REVIEW & DISPATCH */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-serif gold-gradient-text font-bold mb-1">Step 5: Final Review & Dispatch</h2>
                      <p className="text-xs text-[#FAF8F3]/60">Verify your details before choosing whether to Request a Free Quote or Submit Custom CAD Order directly.</p>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3">
                      <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                        Client & Studio Contact Info
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            placeholder="Client Name"
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={clientEmail}
                            onChange={e => setClientEmail(e.target.value)}
                            placeholder="email@studio.com"
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={clientPhone}
                            onChange={e => setClientPhone(e.target.value)}
                            placeholder="+1 / +91 phone"
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Selected References Review */}
                    {selectedCatalogProducts.length > 0 && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-4 space-y-2">
                        <span className="text-xs font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Selected Studio Catalog References ({selectedCatalogProducts.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedCatalogProducts.map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-2 bg-[#09112B] rounded-xl border border-white/10">
                              <img src={p.image} alt={p.title} className="w-10 h-10 rounded-lg object-cover" />
                              <div className="overflow-hidden">
                                <p className="font-bold text-xs text-[#FAF8F3] truncate">{p.title}</p>
                                <span className="text-[10px] text-[#D4AF37]">SKU #{p.id}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delivery Turnaround Option */}
                    {groupMap['delivery_speed'] && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#D4AF37]" /> Turnaround Speed
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {(groupMap['delivery_speed'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => {
                              const isSel = selectedDeliverySpeedId === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => setSelectedDeliverySpeedId(opt.id)}
                                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                    isSel
                                      ? 'border-[#D4AF37] bg-[#121F4D] shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]/50'
                                      : 'border-white/10 hover:border-[#D4AF37]/30 bg-[#09112B]/60'
                                  }`}
                                >
                                  <p className="font-bold text-[#FAF8F3] text-xs">{opt.label}</p>
                                  <p className="text-[11px] text-[#FAF8F3]/60">{opt.description}</p>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {submissionError && (
                      <div className="p-4 bg-rose-900/40 border border-rose-500/50 rounded-2xl text-rose-200 text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                        <span>{submissionError}</span>
                      </div>
                    )}

                    {/* Dual Action CTAs */}
                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSubmit('quote_only')}
                        className="w-full py-4 px-6 bg-[#121F4D] border-2 border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#FAF8F3] font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
                        ) : (
                          <>
                            <FileText className="w-5 h-5 text-[#D4AF37]" /> Request Free Quote Only
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSubmit('place_order')}
                        className="w-full py-4 px-6 btn-gold-luxury font-bold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#0B1330]" />
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" /> Submit & Start Custom 3D CAD
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Navigation Controls */}
                <div className="flex justify-between items-center pt-8 border-t border-white/10 mt-8">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
                    disabled={currentStep === 1}
                    className={`px-5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      currentStep === 1
                        ? 'border-white/10 text-white/20 cursor-not-allowed'
                        : 'border-white/20 text-[#FAF8F3] hover:bg-white/5'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous Step
                  </button>

                  {currentStep < 5 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => Math.min(prev + 1, 5))}
                      className="px-6 py-2.5 bg-[#1E4FA3] hover:bg-[#2A66D6] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all"
                    >
                      Next Step <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Specification Summary Sidebar (NO COST/PRICING SHOWN) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#09112B]/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-[#D4AF37]/30 sticky top-28 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
                <h3 className="font-serif gold-gradient-text font-bold text-base flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#D4AF37]" /> Specification Summary
                </h3>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F5E7A3] border border-[#D4AF37]/30 font-bold uppercase">
                  {selectedCategory}
                </span>
              </div>

              {/* Selected Options Summary List */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> Configured Parameters
                </h4>
                
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {/* Selected Category */}
                  <div className="p-2.5 rounded-xl bg-[#121F4D]/60 border border-white/10 text-xs flex justify-between items-center">
                    <span className="text-[#FAF8F3]/60">Design Type:</span>
                    <span className="font-bold text-[#FAF8F3] capitalize">{selectedCategory}</span>
                  </div>

                  {/* Ring Sizing info */}
                  {selectedCategory === 'rings' && (
                    <div className="p-2.5 rounded-xl bg-[#121F4D]/60 border border-white/10 text-xs flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60">Target Ring Size:</span>
                      <span className="font-bold text-[#F5E7A3]">{ringSize} ({ringSizeStandard})</span>
                    </div>
                  )}

                  {/* Selected Catalog References */}
                  {selectedCatalogProducts.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#121F4D]/60 border border-[#D4AF37]/30 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[#FAF8F3]/60">Catalog References:</span>
                        <span className="font-bold text-[#D4AF37]">{selectedCatalogProducts.length} Selected</span>
                      </div>
                      <div className="text-[11px] text-[#FAF8F3]/80 font-medium truncate">
                        {selectedCatalogProducts.map(p => p.title).join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Option Selections */}
                  {selectedValuesSummary.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#121F4D]/60 border border-white/10 text-xs flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 truncate max-w-[120px]">{item.group}:</span>
                      <span className="font-bold text-[#FAF8F3] flex items-center gap-1.5">
                        {item.color && (
                          <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: item.color }} />
                        )}
                        {item.value}
                      </span>
                    </div>
                  ))}

                  {/* Gemstone Count */}
                  <div className="p-2.5 rounded-xl bg-[#121F4D]/60 border border-white/10 text-xs flex justify-between items-center">
                    <span className="text-[#FAF8F3]/60">Gemstone Setup:</span>
                    <span className="font-bold text-[#FAF8F3]">
                      {isMetalOnly ? 'Solid Metal Only' : `${stonesList.length} Stone Row(s)`}
                    </span>
                  </div>

                  {/* Engraving */}
                  {engravingText && (
                    <div className="p-2.5 rounded-xl bg-[#121F4D]/60 border border-white/10 text-xs flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60">Custom Engraving:</span>
                      <span className="font-bold text-[#F5E7A3] italic">"{engravingText}"</span>
                    </div>
                  )}

                  {/* Vector Logo */}
                  {hasLogo && (
                    <div className="p-2.5 rounded-xl bg-[#121F4D]/60 border border-white/10 text-xs flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60">Hallmark Logo:</span>
                      <span className="font-bold text-[#D4AF37]">Vector Stamp Included</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Included Deliverables Badge */}
              <div className="p-4 bg-[#121F4D]/80 border border-[#D4AF37]/30 rounded-2xl text-xs space-y-2">
                <h4 className="font-bold text-[#F5E7A3] flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-[#D4AF37]" /> Included CAD Assets
                </h4>
                <ul className="space-y-1 text-[#FAF8F3]/70 text-[11px]">
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-[#D4AF37]" /> Native 3DM Rhino / Matrix File</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-[#D4AF37]" /> Printable High-Density STL Mesh</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-[#D4AF37]" /> 4K Ultra-HD Photorealistic Renders</li>
                </ul>
              </div>

              {/* 100% CAD Guarantee Card */}
              <div className="p-4 bg-[#09112B] rounded-2xl border border-[#D4AF37]/30 text-[#FAF8F3]/75 text-[11px] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#F5E7A3]">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" /> 100% Production Guarantee
                </div>
                <p className="leading-relaxed">All CAD models undergo stringent stone seat clearance and casting shrink allowance checks by master goldsmiths.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RING SIZE CONVERSION MODAL */}
      {showRingSizeModal && (
        <div className="fixed inset-0 z-50 bg-[#0B1330]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#09112B] rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-[#D4AF37]/40 flex flex-col">
            <div className="p-6 bg-[#121F4D] text-[#FAF8F3] flex justify-between items-center border-b border-[#D4AF37]/30">
              <div>
                <h3 className="text-lg font-serif gold-gradient-text font-bold flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-[#D4AF37]" /> International Ring Size Conversion Chart
                </h3>
                <p className="text-xs text-[#FAF8F3]/60">Match inside diameter in millimeters across global sizing standards.</p>
              </div>
              <button
                onClick={() => setShowRingSizeModal(false)}
                className="p-1 rounded-full text-[#FAF8F3]/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#121F4D] text-[#F5E7A3] font-bold uppercase tracking-wider border-b border-white/10">
                    <th className="p-2.5 rounded-l-xl">US / Canada</th>
                    <th className="p-2.5">UK / Aus</th>
                    <th className="p-2.5">IN / HK</th>
                    <th className="p-2.5">EU (ISO)</th>
                    <th className="p-2.5 rounded-r-xl">Inside Dia (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {RING_SIZE_CONVERSION_TABLE.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#121F4D]/50 transition-colors">
                      <td className="p-2.5 font-bold text-[#FAF8F3]">{row.us}</td>
                      <td className="p-2.5 text-[#FAF8F3]/70">{row.uk}</td>
                      <td className="p-2.5 text-[#FAF8F3]/70">{row.in_hk}</td>
                      <td className="p-2.5 text-[#FAF8F3]/70">{row.eu}</td>
                      <td className="p-2.5 font-mono text-[#F5E7A3] font-semibold">{row.inside_mm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#121F4D]/60 border-t border-white/10 text-right">
              <button
                onClick={() => setShowRingSizeModal(false)}
                className="px-6 py-2 btn-gold-luxury font-bold text-xs rounded-xl"
              >
                Close Conversion Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
