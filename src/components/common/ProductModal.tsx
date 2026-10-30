import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { invalidateCatalog } from '../../services/catalogStore';
import {
  X,
  Plus,
  Trash2,
  Lock,
  FileCode,
  Box,
  Eye,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  Check,
  Tag,
  Layers,
  Globe,
  Search,
  MapPin,
  AlertTriangle,
  Image as ImageIcon,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { FALLBACK_COUNTRIES, CountryInfo } from '../../utils/countryContext';


export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  parent_name?: string;
  display_order: number;
  subcategories: CategoryItem[];
  product_count: number;
  commission_percentage?: number | string;
}

export interface DesignStyleItem {
  id: number;
  name: string;
}

export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: any, mode: 'create' | 'edit') => void;
  product?: any | null; // If provided, mode is 'edit'
  categories: CategoryItem[];
  designStyles: DesignStyleItem[];
  onNewStyleCreated?: (style: DesignStyleItem) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
  categories,
  designStyles,
  onNewStyleCreated,
}) => {
  const { user } = useAuth();
  const isStaff = user?.role?.toLowerCase() === 'staff';
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isEditMode = Boolean(product && product.slug);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // File Input Ref & Drag State for Multi-Image Upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingImages, setIsDraggingImages] = useState<boolean>(false);

  // STEP 1 Form
  const [prodTitle, setProdTitle] = useState('');
  const [selectedParentCatId, setSelectedParentCatId] = useState<number | ''>('');
  const [selectedSubCatId, setSelectedSubCatId] = useState<number | ''>('');
  const [selectedStyleIds, setSelectedStyleIds] = useState<number[]>([]);
  const [newStyleName, setNewStyleName] = useState('');
  const [showAddStyleInput, setShowAddStyleInput] = useState(false);
  const [prodDescription, setProdDescription] = useState('');
  const [isBestseller, setIsBestseller] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // STEP 2 Form (Specs & Pricing)
  const [prodPrice, setProdPrice] = useState<string>('');
  const [prodComparePrice, setProdComparePrice] = useState<string>('');
  const [prodMetalWeight, setProdMetalWeight] = useState<string>('');
  const [prodStoneCount, setProdStoneCount] = useState<string>('0');
  const [prodDimensions, setProdDimensions] = useState<string>('');
  const [prodTolerance, setProdTolerance] = useState<string>('±0.01 mm');
  const [prodCastingTips, setProdCastingTips] = useState<string>('');
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);

  // Regional Pricing & Country Assignment State
  const [pricingMode, setPricingMode] = useState<'global' | 'regional'>('global');
  const [baseTierCountries, setBaseTierCountries] = useState<string[]>(['IN']);
  const [baseTierPrice, setBaseTierPrice] = useState<string>('10.00');

  const [tier1Countries, setTier1Countries] = useState<string[]>(['BD', 'NP', 'LK']);
  const [tier1Price, setTier1Price] = useState<string>('20.00');

  const [tier2Countries, setTier2Countries] = useState<string[]>(['US', 'CA', 'GB']);
  const [tier2Price, setTier2Price] = useState<string>('15.00');

  const [tier3Countries, setTier3Countries] = useState<string[]>(['AU', 'NZ', 'SG']);
  const [tier3Price, setTier3Price] = useState<string>('10.00');

  const [rowPrice, setRowPrice] = useState<string>('15.00');

  // Automatic Multipliers: Base = 1x, Tier 1 = 2.0x, Tier 2 = 1.5x, Tier 3 = 1.0x (matches base), Rest of World = 1.5x
  const calculateTierPricesFromBase = (baseVal: string) => {
    const num = parseFloat(baseVal);
    if (!isNaN(num) && num >= 0) {
      setTier1Price((num * 2.0).toFixed(2));
      setTier2Price((num * 1.5).toFixed(2));
      setTier3Price((num * 1.0).toFixed(2));
      setRowPrice((num * 1.5).toFixed(2));
    }
  };

  const handleBaseTierPriceChange = (val: string) => {
    setBaseTierPrice(val);
    calculateTierPricesFromBase(val);
  };

  const [activeTierDropdown, setActiveTierDropdown] = useState<'base' | 'tier1' | 'tier2' | 'tier3' | null>(null);
  const [countrySearchText, setCountrySearchText] = useState<string>('');
  const [allCountriesList, setAllCountriesList] = useState<CountryInfo[]>(FALLBACK_COUNTRIES);
  const [tierConflictAlert, setTierConflictAlert] = useState<{
    countryCode: string;
    countryName: string;
    existingTierKey: 'base' | 'tier1' | 'tier2' | 'tier3';
    existingTierName: string;
    targetTierKey: 'base' | 'tier1' | 'tier2' | 'tier3';
    targetTierName: string;
  } | null>(null);

  // Load supported countries dynamically
  useEffect(() => {
    fetch('/api/catalog/country-context/')
      .then((r) => r.json())
      .then((data) => {
        if (data.supported_countries && Array.isArray(data.supported_countries) && data.supported_countries.length > 0) {
          setAllCountriesList(data.supported_countries);
        }
      })
      .catch(() => {});
  }, []);

  const getTierForCountry = (code: string): { key: 'base' | 'tier1' | 'tier2' | 'tier3'; name: string } | null => {
    if (baseTierCountries.includes(code)) return { key: 'base', name: 'Base Country' };
    if (tier1Countries.includes(code)) return { key: 'tier1', name: 'Tier 1' };
    if (tier2Countries.includes(code)) return { key: 'tier2', name: 'Tier 2' };
    if (tier3Countries.includes(code)) return { key: 'tier3', name: 'Tier 3' };
    return null;
  };

  const handleAddCountryToTier = (targetTier: 'base' | 'tier1' | 'tier2' | 'tier3', code: string) => {
    if (!isAdmin) return;
    const existing = getTierForCountry(code);
    const tierLabels = {
      base: 'Base Country',
      tier1: 'Tier 1',
      tier2: 'Tier 2',
      tier3: 'Tier 3',
    };

    if (existing) {
      if (existing.key === targetTier) return;
      const foundCountry = allCountriesList.find((c) => c.code === code);
      setTierConflictAlert({
        countryCode: code,
        countryName: foundCountry ? `${foundCountry.flag} ${foundCountry.name} (${code})` : code,
        existingTierKey: existing.key,
        existingTierName: existing.name,
        targetTierKey: targetTier,
        targetTierName: tierLabels[targetTier],
      });
      return;
    }

    if (targetTier === 'base') setBaseTierCountries((prev) => [...prev, code]);
    if (targetTier === 'tier1') setTier1Countries((prev) => [...prev, code]);
    if (targetTier === 'tier2') setTier2Countries((prev) => [...prev, code]);
    if (targetTier === 'tier3') setTier3Countries((prev) => [...prev, code]);
    setCountrySearchText('');
    setActiveTierDropdown(null);
  };

  const handleResolveMoveConflict = () => {
    if (!isAdmin || !tierConflictAlert) return;
    const { countryCode, existingTierKey, targetTierKey } = tierConflictAlert;

    if (existingTierKey === 'base') setBaseTierCountries((prev) => prev.filter((c) => c !== countryCode));
    if (existingTierKey === 'tier1') setTier1Countries((prev) => prev.filter((c) => c !== countryCode));
    if (existingTierKey === 'tier2') setTier2Countries((prev) => prev.filter((c) => c !== countryCode));
    if (existingTierKey === 'tier3') setTier3Countries((prev) => prev.filter((c) => c !== countryCode));

    if (targetTierKey === 'base') setBaseTierCountries((prev) => [...prev, countryCode]);
    if (targetTierKey === 'tier1') setTier1Countries((prev) => [...prev, countryCode]);
    if (targetTierKey === 'tier2') setTier2Countries((prev) => [...prev, countryCode]);
    if (targetTierKey === 'tier3') setTier3Countries((prev) => [...prev, countryCode]);

    setTierConflictAlert(null);
    setCountrySearchText('');
    setActiveTierDropdown(null);
  };

  const handleRemoveCountryFromTier = (tier: 'base' | 'tier1' | 'tier2' | 'tier3', code: string) => {
    if (!isAdmin) return;
    if (tier === 'base') setBaseTierCountries((prev) => prev.filter((c) => c !== code));
    if (tier === 'tier1') setTier1Countries((prev) => prev.filter((c) => c !== code));
    if (tier === 'tier2') setTier2Countries((prev) => prev.filter((c) => c !== code));
    if (tier === 'tier3') setTier3Countries((prev) => prev.filter((c) => c !== code));
  };


  // STEP 3 Media & CAD Files
  // Existing files/images in Edit Mode
  const [existingImages, setExistingImages] = useState<Array<{ id: number; image_url: string; is_primary: boolean }>>([]);
  const [existingFiles, setExistingFiles] = useState<Array<{ id: number; file_type: string; file_url?: string }>>([]);
  // Newly selected files
  const [newImageFiles, setNewImageFiles] = useState<Array<{ file: File; isPrimary: boolean; previewUrl: string }>>([]);
  const [file3dm, setFile3dm] = useState<File | null>(null);
  const [fileStl, setFileStl] = useState<File | null>(null);
  const [fileRender, setFileRender] = useState<File | null>(null);
  const [fileVideo, setFileVideo] = useState<File | null>(null);
  const [fileZip, setFileZip] = useState<File | null>(null);

  // Per-file upload progress (0-100)
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, number>>({});
  // Per-file upload status ('idle' | 'uploading' | 'success' | 'error')
  const [fileUploadStatus, setFileUploadStatus] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({});
  // Per-file error messages
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  // Persisted product slug once created
  const [savedProductSlug, setSavedProductSlug] = useState<string | null>(null);

  // Native input refs for resetting input value on remove/replace
  const input3dmRef = useRef<HTMLInputElement | null>(null);
  const inputStlRef = useRef<HTMLInputElement | null>(null);
  const inputRenderRef = useRef<HTMLInputElement | null>(null);
  const inputVideoRef = useRef<HTMLInputElement | null>(null);
  const inputZipRef = useRef<HTMLInputElement | null>(null);

  const handleRemoveFile = (typeKey: '3dm' | 'stl' | 'render' | 'video' | 'zip') => {
    if (typeKey === '3dm') {
      setFile3dm(null);
      if (input3dmRef.current) input3dmRef.current.value = '';
    } else if (typeKey === 'stl') {
      setFileStl(null);
      if (inputStlRef.current) inputStlRef.current.value = '';
    } else if (typeKey === 'render') {
      setFileRender(null);
      if (inputRenderRef.current) inputRenderRef.current.value = '';
    } else if (typeKey === 'video') {
      setFileVideo(null);
      if (inputVideoRef.current) inputVideoRef.current.value = '';
    } else if (typeKey === 'zip') {
      setFileZip(null);
      if (inputZipRef.current) inputZipRef.current.value = '';
    }
    setUploadProgressMap((prev) => ({ ...prev, [typeKey]: 0 }));
    setFileUploadStatus((prev) => ({ ...prev, [typeKey]: 'idle' }));
    setFileErrors((prev) => {
      const copy = { ...prev };
      delete copy[typeKey];
      return copy;
    });
    setSubmitError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Pre-fill fields when entering edit mode or reset on new create
  useEffect(() => {
    if (!isOpen) return;

    if (product && product.slug) {
      setProdTitle(product.title || '');
      const catId = typeof product.category === 'object' ? product.category?.id : product.category;
      
      // Determine parent vs subcategory
      let foundParent: number | '' = '';
      let foundSub: number | '' = '';
      if (catId) {
        for (const parent of categories) {
          if (parent.id === Number(catId)) {
            foundParent = parent.id;
            break;
          }
          const sub = parent.subcategories?.find((s) => s.id === Number(catId));
          if (sub) {
            foundParent = parent.id;
            foundSub = sub.id;
            break;
          }
        }
      }
      setSelectedParentCatId(foundParent || (catId ? Number(catId) : ''));
      setSelectedSubCatId(foundSub);

      const styleIds = Array.isArray(product.style_tags)
        ? product.style_tags.map((s: any) => (typeof s === 'object' ? s.id : s))
        : [];
      setSelectedStyleIds(styleIds);

      setProdDescription(product.description || '');
      setIsBestseller(Boolean(product.is_bestseller));
      setIsNew(Boolean(product.is_new));
      setIsFeatured(Boolean(product.is_featured));

      setProdPrice(product.price ? String(product.price) : '');
      setProdComparePrice(product.compare_at_price ? String(product.compare_at_price) : '');
      setProdMetalWeight(product.metal_weight_grams ? String(product.metal_weight_grams) : '');
      setProdStoneCount(product.stone_count !== undefined ? String(product.stone_count) : '0');
      setProdDimensions(product.specs?.dimensions || '');
      setProdTolerance(product.specs?.tolerance || '±0.01 mm');
      setProdCastingTips(product.casting_tips || '');
      setAgreedTerms(product.agreed_terms !== undefined ? Boolean(product.agreed_terms) : true);

      // Populate Regional Pricing Mode & Tiers
      const pMode = product.pricing_mode === 'regional' ? 'regional' : 'global';
      setPricingMode(pMode);
      if (product.regional_pricing && typeof product.regional_pricing === 'object') {
        const rp = product.regional_pricing;
        if (rp.base_tier) {
          setBaseTierCountries(Array.isArray(rp.base_tier.countries) ? rp.base_tier.countries : ['IN']);
          setBaseTierPrice(String(rp.base_tier.price_usd || '20.00'));
        }
        if (rp.tier_1) {
          setTier1Countries(Array.isArray(rp.tier_1.countries) ? rp.tier_1.countries : ['BD', 'NP', 'LK']);
          setTier1Price(String(rp.tier_1.price_usd || '10.00'));
        }
        if (rp.tier_2) {
          setTier2Countries(Array.isArray(rp.tier_2.countries) ? rp.tier_2.countries : ['US', 'CA', 'GB']);
          setTier2Price(String(rp.tier_2.price_usd || '25.00'));
        }
        if (rp.tier_3) {
          setTier3Countries(Array.isArray(rp.tier_3.countries) ? rp.tier_3.countries : ['AU', 'NZ', 'SG']);
          setTier3Price(String(rp.tier_3.price_usd || '30.00'));
        }
        if (rp.rest_of_world) {
          setRowPrice(String(rp.rest_of_world.price_usd || '15.00'));
        }
      }

      // Load existing images and files
      if (Array.isArray(product.images)) {
        setExistingImages(
          product.images.map((img: any) => ({
            id: img.id,
            image_url: img.image_url || img.image,
            is_primary: Boolean(img.is_primary),
          }))
        );
      } else {
        setExistingImages([]);
      }

      if (Array.isArray(product.files)) {
        setExistingFiles(
          product.files.map((f: any) => ({
            id: f.id,
            file_type: f.file_type,
            file_url: f.file_url,
          }))
        );
      } else {
        setExistingFiles([]);
      }

      // Reset new file uploads
      setNewImageFiles([]);
      setFile3dm(null);
      setFileStl(null);
      setFileRender(null);
      setFileVideo(null);
      setFileZip(null);
    } else {
      // Reset for Create Mode
      setProdTitle('');
      setSelectedParentCatId(categories.length > 0 ? categories[0].id : '');
      setSelectedSubCatId('');
      setSelectedStyleIds([]);
      setProdDescription('');
      setIsBestseller(false);
      setIsNew(true);
      setIsFeatured(false);
      setProdPrice('');
      setProdComparePrice('');
      setPricingMode('global');
      setBaseTierCountries(['IN']);
      setBaseTierPrice('10.00');
      setTier1Countries(['BD', 'NP', 'LK']);
      setTier1Price('20.00');
      setTier2Countries(['US', 'CA', 'GB']);
      setTier2Price('15.00');
      setTier3Countries(['AU', 'NZ', 'SG']);
      setTier3Price('10.00');
      setRowPrice('15.00');
      setTierConflictAlert(null);
      setActiveTierDropdown(null);
      setProdMetalWeight('');
      setProdStoneCount('0');
      setProdDimensions('');
      setProdTolerance('±0.01 mm');
      setProdCastingTips('');
      setAgreedTerms(false);
      setExistingImages([]);
      setExistingFiles([]);
      setNewImageFiles([]);
      setFile3dm(null);
      setFileStl(null);
      setFileRender(null);
      setFileVideo(null);
      setFileZip(null);
      setUploadProgressMap({});
    }
    setCurrentStep(1);
    setSubmitError(null);
  }, [isOpen, product, categories]);

  if (!isOpen) return null;

  // Selected parent category object to derive subcategories
  const currentParentCat = categories.find((c) => c.id === Number(selectedParentCatId));
  const subCategoriesList = currentParentCat?.subcategories || [];

  // Derive active selected category and dynamic commission percentage
  const targetCatId = selectedSubCatId || selectedParentCatId;
  let activeCategory: CategoryItem | undefined;
  if (targetCatId) {
    for (const parent of categories) {
      if (parent.id === Number(targetCatId)) {
        activeCategory = parent;
        break;
      }
      const sub = parent.subcategories?.find((s) => s.id === Number(targetCatId));
      if (sub) {
        activeCategory = sub;
        break;
      }
    }
  }

  const categoryCommissionRate = activeCategory?.commission_percentage != null
    ? Number(activeCategory.commission_percentage)
    : 20;

  const numericPrice = Number(prodPrice) || 0;
  const calculatedCommissionAmount = Number(((numericPrice * categoryCommissionRate) / 100).toFixed(2));
  const calculatedNetPayout = Number(Math.max(0, numericPrice - calculatedCommissionAmount).toFixed(2));

  const handleInlineCreateStyle = async () => {
    if (!newStyleName.trim()) return;
    try {
      const created = await api.createDesignStyle(newStyleName.trim());
      if (onNewStyleCreated) onNewStyleCreated(created);
      setSelectedStyleIds([...selectedStyleIds, created.id]);
      setNewStyleName('');
      setShowAddStyleInput(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add design style.');
    }
  };

  const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB
  const MAX_CAD_FILE_BYTES = 250 * 1024 * 1024; // 250 MB

  const handleCadFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void,
    typeKey: '3dm' | 'stl' | 'render' | 'video' | 'zip'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_CAD_FILE_BYTES) {
        setSubmitError(`File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). The maximum allowed size is 250 MB.`);
        e.target.value = '';
        setter(null);
        return;
      }
      setSubmitError(null);
      setter(file);
      setFileUploadStatus((p) => ({ ...p, [typeKey]: 'idle' }));
      setUploadProgressMap((p) => ({ ...p, [typeKey]: 0 }));
      setFileErrors((prev) => {
        const copy = { ...prev };
        delete copy[typeKey];
        return copy;
      });
    } else {
      setter(null);
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files) as File[];
      const validFiles: File[] = [];
      for (const f of filesArr) {
        if (f.size > MAX_IMAGE_BYTES) {
          setSubmitError(`Image "${f.name}" is too large (${(f.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size for product images is 25 MB.`);
          continue;
        }
        validFiles.push(f);
      }
      const newItems = validFiles.map((f: File, idx: number) => ({
        file: f,
        isPrimary: existingImages.length === 0 && newImageFiles.length === 0 && idx === 0,
        previewUrl: URL.createObjectURL(f),
      }));
      setNewImageFiles((prev) => [...prev, ...newItems]);
      e.target.value = ''; // Reset input to allow selecting more files immediately
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImages(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = (Array.from(e.dataTransfer.files) as File[]).filter((f) => f.type.startsWith('image/'));
      const validFiles: File[] = [];
      for (const f of filesArr) {
        if (f.size > MAX_IMAGE_BYTES) {
          setSubmitError(`Image "${f.name}" is too large (${(f.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`);
          continue;
        }
        validFiles.push(f);
      }
      if (validFiles.length > 0) {
        const newItems = validFiles.map((f: File, idx: number) => ({
          file: f,
          isPrimary: existingImages.length === 0 && newImageFiles.length === 0 && idx === 0,
          previewUrl: URL.createObjectURL(f),
        }));
        setNewImageFiles((prev) => [...prev, ...newItems]);
      }
    }
  };

  const setNewImageAsPrimary = (index: number) => {
    setExistingImages((prev) => prev.map((img) => ({ ...img, is_primary: false })));
    setNewImageFiles((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  };

  const removeNewImageFile = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingImage = async (imgId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      if (product?.slug) {
        await api.deleteProductImage(product.slug, imgId);
        setExistingImages((prev) => prev.filter((img) => img.id !== imgId));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete image');
    }
  };

  const handleDeleteExistingFile = async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this CAD attachment?')) return;
    try {
      if (product?.slug) {
        await api.deleteProductFile(product.slug, fileId);
        setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleSaveProduct = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    const targetCatId = selectedSubCatId || selectedParentCatId;
    if (!targetCatId) {
      setSubmitError('Please select a Category before publishing.');
      setIsSubmitting(false);
      return;
    }

    if (!agreedTerms) {
      setSubmitError('Please agree to the Commission Policy and production quality terms before proceeding.');
      setIsSubmitting(false);
      return;
    }

    if (pricingMode === 'global') {
      if (!prodPrice || Number(prodPrice) <= 0) {
        setSubmitError('Please enter a valid listing price.');
        setIsSubmitting(false);
        return;
      }
      if (prodComparePrice && Number(prodComparePrice) <= Number(prodPrice)) {
        setSubmitError('Compare-at price must be greater than standard Price.');
        setIsSubmitting(false);
        return;
      }
    } else {
      const bPrice = Number(baseTierPrice);
      const t1Price = Number(tier1Price);
      const t2Price = Number(tier2Price);
      const t3Price = Number(tier3Price);
      const rPrice = Number(rowPrice);

      if (isNaN(bPrice) || bPrice < 0 || isNaN(t1Price) || t1Price < 0 || isNaN(t2Price) || t2Price < 0 || isNaN(t3Price) || t3Price < 0 || isNaN(rPrice) || rPrice < 0) {
        setSubmitError('All 5 regional tier prices must be valid non-negative numbers.');
        setIsSubmitting(false);
        return;
      }

      const seen = new Set<string>();
      for (const c of [...baseTierCountries, ...tier1Countries, ...tier2Countries, ...tier3Countries]) {
        if (seen.has(c)) {
          setSubmitError(`Country code '${c}' is assigned to multiple tiers. Each country must belong to only one tier.`);
          setIsSubmitting(false);
          return;
        }
        seen.add(c);
      }
    }

    try {
      const payload: any = {
        title: prodTitle,
        category: Number(targetCatId),
        style_tags: selectedStyleIds,
        price: pricingMode === 'regional' ? (Number(baseTierPrice) || Number(rowPrice) || 20.0) : Number(prodPrice),
        compare_at_price: prodComparePrice ? Number(prodComparePrice) : null,
        pricing_mode: pricingMode,
        regional_pricing: pricingMode === 'regional' ? {
          base_tier: {
            name: 'Base Country',
            countries: baseTierCountries,
            price_usd: Number(baseTierPrice) || 0,
          },
          tier_1: {
            name: 'Tier 1',
            countries: tier1Countries,
            price_usd: Number(tier1Price) || 0,
          },
          tier_2: {
            name: 'Tier 2',
            countries: tier2Countries,
            price_usd: Number(tier2Price) || 0,
          },
          tier_3: {
            name: 'Tier 3',
            countries: tier3Countries,
            price_usd: Number(tier3Price) || 0,
          },
          rest_of_world: {
            name: 'Rest of the World',
            price_usd: Number(rowPrice) || 0,
          },
        } : {},
        staff_price: calculatedNetPayout,
        commission_rate: categoryCommissionRate,
        commission_amount: calculatedCommissionAmount,
        agreed_terms: agreedTerms,
        description: prodDescription || 'Parametric luxury jewellery CAD model pre-tested for casting.',
        metal_weight_grams: prodMetalWeight ? Number(prodMetalWeight) : null,
        stone_count: Number(prodStoneCount) || 0,
        is_bestseller: isBestseller,
        is_new: isNew,
        is_featured: isFeatured,
        casting_tips: prodCastingTips || '',
        specs: {
          dimensions: prodDimensions || '',
          tolerance: prodTolerance || '±0.01 mm',
          metalWeight18k: prodMetalWeight ? `${Number(prodMetalWeight).toFixed(2)} gm` : '',
          metalWeight14k: prodMetalWeight ? `${(Number(prodMetalWeight) * 0.84).toFixed(2)} gm` : '',
          metalWeightPlatinum: prodMetalWeight ? `${(Number(prodMetalWeight) * 1.32).toFixed(2)} gm` : '',
          metalWeightSilver: prodMetalWeight ? `${(Number(prodMetalWeight) * 0.66).toFixed(2)} gm` : '',
          diamondCount: Number(prodStoneCount) || 0,
          fingerSize: prodDimensions || '',
        },
      };

      let productSlug = product?.slug || savedProductSlug;
      let finalProduct: any = null;

      if (productSlug) {
        setUploadProgressText('Updating product details in database...');
        finalProduct = await api.updateProduct(productSlug, payload);
      } else {
        setUploadProgressText('Creating Product Record in Database...');
        finalProduct = await api.createProduct(payload);
        productSlug = finalProduct.slug;
        setSavedProductSlug(productSlug);
      }

      // Step B: Upload New Images (if any)
      if (newImageFiles.length > 0) {
        setUploadProgressText(`Uploading ${newImageFiles.length} Product Images...`);
        for (let i = 0; i < newImageFiles.length; i++) {
          const imgItem = newImageFiles[i];
          await api.uploadProductImage(productSlug, imgItem.file, imgItem.isPrimary, existingImages.length + i);
        }
      }

      // Step C: Upload CAD Deliverables (if selected)
      const cadUploads: { file: File; type: '3dm' | 'stl' | 'render' | 'video' | 'zip'; label: string }[] = [];
      if (file3dm) cadUploads.push({ file: file3dm, type: '3dm', label: '.3DM Rhino File' });
      if (fileStl) cadUploads.push({ file: fileStl, type: 'stl', label: '.STL Print File' });
      if (fileRender) cadUploads.push({ file: fileRender, type: 'render', label: 'Render Image' });
      if (fileVideo) cadUploads.push({ file: fileVideo, type: 'video', label: '360° Video' });
      if (fileZip) cadUploads.push({ file: fileZip, type: 'zip', label: 'ZIP Archive' });

      for (let ci = 0; ci < cadUploads.length; ci++) {
        const { file, type, label } = cadUploads[ci];
        // If file was already successfully uploaded, skip
        if (fileUploadStatus[type] === 'success') {
          continue;
        }

        setUploadProgressText(`Uploading ${label} (${ci + 1}/${cadUploads.length})...`);
        setFileUploadStatus((prev) => ({ ...prev, [type]: 'uploading' }));
        setUploadProgressMap((prev) => ({ ...prev, [type]: 0 }));

        try {
          await api.uploadProductFile(productSlug, file, type, (pct) => {
            setUploadProgressMap((prev) => ({ ...prev, [type]: pct }));
            setUploadProgressText(`Uploading ${label}: ${pct}% (${ci + 1}/${cadUploads.length})`);
          });
          setFileUploadStatus((prev) => ({ ...prev, [type]: 'success' }));
          setFileErrors((prev) => {
            const copy = { ...prev };
            delete copy[type];
            return copy;
          });
        } catch (fileErr: any) {
          console.error(`Error uploading ${label}:`, fileErr);
          setFileUploadStatus((prev) => ({ ...prev, [type]: 'error' }));
          setFileErrors((prev) => ({
            ...prev,
            [type]: fileErr.message || `Failed to upload ${label}`,
          }));

          // Direct user back to Step 3 where they can view the failure, remove or replace the file
          setCurrentStep(3);
          setSubmitError(
            `Upload failed for ${label}: ${fileErr.message || 'File upload failed'}. You can remove or replace this file on this page without losing any entered details.`
          );
          setIsSubmitting(false);
          return;
        }
      }

      setIsSubmitting(false);
      invalidateCatalog();
      onSuccess(finalProduct, isEditMode ? 'edit' : 'create');
      onClose();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setIsSubmitting(false);
      setSubmitError(err.message || 'Operation failed. Please check your inputs and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-[#E8D7B7] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-[#17243B] max-h-[92vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-wider">
              {isEditMode ? 'Edit CAD Product' : 'Publish New Jewellery CAD'}
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17243B] tracking-tight mt-1">
              {isEditMode ? `Modify "${product?.title || 'Product'}"` : 'Add Product to Live Catalog'}
            </h2>
          </div>
          <button
            disabled={isSubmitting}
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
          {[
            { num: 1, label: '1. Basic Details' },
            { num: 2, label: '2. Specs & Pricing' },
            { num: 3, label: '3. Media & CAD Files' },
            { num: 4, label: '4. Review & Save' },
          ].map((step) => (
            <div
              key={step.num}
              onClick={() => {
                if (!isSubmitting) setCurrentStep(step.num);
              }}
              className={`py-2 px-1 rounded-xl border transition-all cursor-pointer select-none ${
                currentStep === step.num
                  ? 'bg-[#09112B] text-[#F5E7A3] border-[#D4AF37] font-bold shadow-md'
                  : currentStep > step.num
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {step.label}
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
            <button onClick={() => setSubmitError(null)} className="text-rose-700 underline font-bold text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        {/* STEP 1: Basic Details */}
        {currentStep === 1 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-[#17243B] block mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={prodTitle}
                onChange={(e) => setProdTitle(e.target.value)}
                placeholder="e.g. Royal Nizam Solitaire Emerald Ring"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-xs text-[#17243B] focus:outline-none focus:border-[#C9A227]"
              />
            </div>

            {/* Category Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#17243B] block mb-1">Parent Category *</label>
                <select
                  value={selectedParentCatId}
                  onChange={(e) => {
                    setSelectedParentCatId(e.target.value ? Number(e.target.value) : '');
                    setSelectedSubCatId('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-xs text-[#17243B] focus:outline-none focus:border-[#C9A227]"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#17243B] block mb-1">Subcategory (Optional)</label>
                <select
                  disabled={!selectedParentCatId || subCategoriesList.length === 0}
                  value={selectedSubCatId}
                  onChange={(e) => setSelectedSubCatId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-xs text-[#17243B] focus:outline-none focus:border-[#C9A227] disabled:opacity-50"
                >
                  <option value="">-- Subcategory --</option>
                  {subCategoriesList.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Design Style Multi-Tags */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-[#17243B]">Design Styles & Aesthetics</label>
                <button
                  type="button"
                  onClick={() => setShowAddStyleInput(!showAddStyleInput)}
                  className="text-[11px] font-bold text-[#C9A227] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Style Tag
                </button>
              </div>

              {showAddStyleInput && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <input
                    type="text"
                    placeholder="e.g. Art Deco, Floral, Solitaire..."
                    value={newStyleName}
                    onChange={(e) => setNewStyleName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#E8D7B7] text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleInlineCreateStyle}
                    className="px-3 py-1.5 rounded-lg bg-[#09112B] text-[#F5E7A3] font-bold text-xs"
                  >
                    Save
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {designStyles.map((style) => {
                  const isSelected = selectedStyleIds.includes(style.id);
                  return (
                    <button
                      type="button"
                      key={style.id}
                      onClick={() => {
                        setSelectedStyleIds(
                          isSelected
                            ? selectedStyleIds.filter((id) => id !== style.id)
                            : [...selectedStyleIds, style.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37] font-bold shadow-sm'
                          : 'bg-slate-100 text-[#6B7280] border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{style.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="font-semibold text-[#17243B] block mb-1">Detailed Description</label>
              <textarea
                rows={3}
                value={prodDescription}
                onChange={(e) => setProdDescription(e.target.value)}
                placeholder="Describe prong layout, casting notes, aesthetic inspiration..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-xs focus:outline-none focus:border-[#C9A227]"
              />
            </div>

            {/* Badges Toggles */}
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                  className="rounded text-[#C9A227] focus:ring-0 w-4 h-4"
                />
                <span>Mark as Bestseller</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                <input
                  type="checkbox"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                  className="rounded text-[#C9A227] focus:ring-0 w-4 h-4"
                />
                <span>Mark as New Release</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs px-2.5 py-1 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-[#C9A227] focus:ring-0 w-4 h-4"
                />
                <span className="font-semibold">Show in Home (Category Marquee)</span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: Specs & Pricing */}
        {currentStep === 2 && (
          <div className="space-y-4 text-xs">
            {/* Pricing Mode Selector */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#09112B] to-[#040817] border border-[#D4AF37]/30 text-[#FAF8F3]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-semibold text-xs tracking-wide">Pricing Architecture</span>
                </div>
                <span className="text-[10px] text-[#C9C2A6]/70 uppercase tracking-widest font-mono">
                  {pricingMode === 'regional' ? '5 Regional Tiers Active' : 'Single Global Price Active'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPricingMode('global')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    pricingMode === 'global'
                      ? 'bg-[#121F4D]/80 border-[#D4AF37] shadow-lg ring-1 ring-[#D4AF37]/40'
                      : 'bg-[#060D24]/60 border-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#FAF8F3]">Global Pricing</span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${pricingMode === 'global' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/30'}`}>
                      {pricingMode === 'global' && <Check className="w-2.5 h-2.5 text-[#09112B]" />}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#C9C2A6] leading-relaxed">
                    Single uniform price for all customers worldwide. Backward-compatible catalog standard.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPricingMode('regional')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    pricingMode === 'regional'
                      ? 'bg-[#121F4D]/80 border-[#D4AF37] shadow-lg ring-1 ring-[#D4AF37]/40'
                      : 'bg-[#060D24]/60 border-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#FAF8F3]">Country-Based Tier Pricing</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#D4AF37] text-[#09112B] uppercase">
                        5 Tiers
                      </span>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${pricingMode === 'regional' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/30'}`}>
                      {pricingMode === 'regional' && <Check className="w-2.5 h-2.5 text-[#09112B]" />}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#C9C2A6] leading-relaxed">
                    5 configurable country pricing groups. Admins set USD; customers see auto-converted local currencies.
                  </p>
                </button>
              </div>
            </div>

            {/* MODE 1: GLOBAL PRICING UI */}
            {pricingMode === 'global' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#17243B] block mb-1">
                      Listing Price (Customer Pays) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        required={pricingMode === 'global'}
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        placeholder="250.00"
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-sm font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#C9A227] shadow-sm"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Public customer storefront purchase price in USD.
                    </span>
                    {numericPrice > 0 && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 mt-2 space-y-1">
                        <span className="font-bold flex items-center gap-1 text-[10.5px]">
                          <Globe className="w-3 h-3 text-[#B88732]" /> Live Customer Storefront Preview:
                        </span>
                        <div className="font-mono text-[10px] text-slate-700 flex flex-wrap gap-x-2">
                          <span>🇮🇳 India: <strong>₹{Math.round(numericPrice * 86.85).toLocaleString('en-IN')}</strong></span>
                          <span>•</span>
                          <span>🇬🇧 UK: <strong>£{(numericPrice * 0.79).toFixed(2)}</strong></span>
                          <span>•</span>
                          <span>🇪🇺 Europe: <strong>€{(numericPrice * 0.93).toFixed(2)}</strong></span>
                          <span>•</span>
                          <span>🇦🇺 Australia: <strong>A${(numericPrice * 1.55).toFixed(2)}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-[#17243B] block mb-1 flex items-center justify-between">
                      <span>Admin Commission ({categoryCommissionRate}%)</span>
                      <span className="text-[10px] font-mono text-[#F5E7A3] bg-[#09112B] px-1.5 py-0.5 rounded">
                        {activeCategory?.name || 'Category'}
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">$</span>
                      <input
                        type="text"
                        readOnly
                        value={calculatedCommissionAmount > 0 ? calculatedCommissionAmount.toFixed(2) : '0.00'}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-mono font-bold text-rose-700 cursor-not-allowed select-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Category dynamic commission ({categoryCommissionRate}%) retained by admin.
                    </span>
                  </div>
                </div>

                {/* Live Net Designer Payout Breakdown Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Your Net Designer Earnings (Estimated Payout)
                    </span>
                    <p className="text-[10px] text-emerald-800">
                      {numericPrice > 0 ? (
                        <>
                          Price (${numericPrice.toFixed(2)}) - Admin Fee {categoryCommissionRate}% (${calculatedCommissionAmount.toFixed(2)})
                        </>
                      ) : (
                        'Enter a listing price above to calculate your net payout.'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-mono font-bold text-sm shadow-sm">
                      ${calculatedNetPayout.toFixed(2)}
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-emerald-700">
                      ({Math.max(0, 100 - categoryCommissionRate)}%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: REGIONAL PRICING & COUNTRY ASSIGNMENT */}
            {pricingMode === 'regional' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-[#09112B]">Regional Pricing & Auto-Multiplier Engine</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Enter price in <strong>Base Country</strong>: Tier 1 (2.0x), Tier 2 (1.5x), Tier 3 (1.0x), and Rest of World (1.5x) calculate automatically.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {isAdmin ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10.5px] font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Admin Access (Country Edit Enabled)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 text-[10.5px] font-semibold">
                        <Lock className="w-3.5 h-3.5 text-slate-500" /> Country Config Managed by Admin
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => calculateTierPricesFromBase(baseTierPrice)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#D4AF37]/50 hover:bg-[#FAF9F5] text-[#09112B] text-[10.5px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      title="Recalculate multipliers from Base Country price"
                    >
                      <RefreshCw className="w-3 h-3 text-[#D4AF37]" />
                      <span>Recalculate Multipliers</span>
                    </button>
                  </div>
                </div>

                {/* Conflict Resolution Alert (Admin only) */}
                {isAdmin && tierConflictAlert && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-xs">
                        <strong>{tierConflictAlert.countryName}</strong> is already assigned to <strong>{tierConflictAlert.existingTierName}</strong>.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleResolveMoveConflict}
                        className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-sm"
                      >
                        Move to {tierConflictAlert.targetTierName}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTierConflictAlert(null)}
                        className="px-2.5 py-1 rounded-lg border border-rose-300 text-rose-800 hover:bg-rose-100 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* 5 PRICING CARDS */}
                <div className="space-y-3.5">
                  {/* CARD A: Base Country */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm hover:border-[#D4AF37]/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <h5 className="font-bold text-xs text-[#09112B]">A. Base Country</h5>
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                            Primary Studio Base
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold">
                            1.0x Base
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Primary home market countries (e.g. India). Entering price here auto-calculates other tiers.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#17243B]">Tier USD Price *</span>
                        <div className="relative w-32">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required={pricingMode === 'regional'}
                            value={baseTierPrice}
                            onChange={(e) => handleBaseTierPriceChange(e.target.value)}
                            placeholder="10.00"
                            className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E8D7B7] text-xs font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#C9A227]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Assigned Countries Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
                      {baseTierCountries.map((cCode) => {
                        const cInfo = allCountriesList.find((c) => c.code === cCode);
                        return (
                          <span
                            key={cCode}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-[11px] font-medium"
                          >
                            <span>{cInfo?.flag || '🌐'}</span>
                            <span>{cInfo?.name || cCode} ({cCode})</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCountryFromTier('base', cCode)}
                                className="text-amber-700 hover:text-amber-950 hover:bg-amber-100 rounded-full p-0.5 transition-colors"
                                title="Remove country (Admin only)"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        );
                      })}

                      {/* Add Country Dropdown Trigger - Admin Only */}
                      {isAdmin ? (
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTierDropdown(activeTierDropdown === 'base' ? null : 'base');
                              setCountrySearchText('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-medium transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Country
                          </button>

                          {activeTierDropdown === 'base' && (
                            <div className="absolute left-0 top-full mt-1.5 w-64 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-1">
                              <div className="relative mb-2">
                                <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search country or code..."
                                  value={countrySearchText}
                                  onChange={(e) => setCountrySearchText(e.target.value)}
                                  className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#C9A227]"
                                  autoFocus
                                />
                              </div>
                              {allCountriesList
                                .filter((c) =>
                                  c.name.toLowerCase().includes(countrySearchText.toLowerCase()) ||
                                  c.code.toLowerCase().includes(countrySearchText.toLowerCase())
                                )
                                .map((c) => {
                                  const isAssignedHere = baseTierCountries.includes(c.code);
                                  const otherTier = getTierForCountry(c.code);
                                  return (
                                    <button
                                      type="button"
                                      key={c.code}
                                      onClick={() => handleAddCountryToTier('base', c.code)}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                        isAssignedHere ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                                      }`}
                                    >
                                      <span className="flex items-center gap-1.5 truncate">
                                        <span>{c.flag}</span>
                                        <span className="truncate">{c.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">({c.code})</span>
                                      </span>
                                      {isAssignedHere ? (
                                        <Check className="w-3 h-3 text-amber-600 shrink-0" />
                                      ) : otherTier ? (
                                        <span className="text-[9px] text-rose-600 font-mono shrink-0">In {otherTier.name}</span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 font-mono py-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Admin Managed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CARD B: Tier 1 */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm hover:border-[#D4AF37]/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <h5 className="font-bold text-xs text-[#09112B]">B. Tier 1</h5>
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold">
                            Subcontinental & Regional
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-mono font-bold">
                            Auto 2.0x
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Countries sharing Tier 1 pricing (e.g. Bangladesh, Nepal, Sri Lanka). Automatically 2x of Base Price.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#17243B]">Tier USD Price *</span>
                        <div className="relative w-32">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required={pricingMode === 'regional'}
                            value={tier1Price}
                            onChange={(e) => setTier1Price(e.target.value)}
                            placeholder="20.00"
                            className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E8D7B7] text-xs font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#C9A227]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
                      {tier1Countries.map((cCode) => {
                        const cInfo = allCountriesList.find((c) => c.code === cCode);
                        return (
                          <span
                            key={cCode}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 text-[11px] font-medium"
                          >
                            <span>{cInfo?.flag || '🌐'}</span>
                            <span>{cInfo?.name || cCode} ({cCode})</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCountryFromTier('tier1', cCode)}
                                className="text-blue-700 hover:text-blue-950 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                                title="Remove country (Admin only)"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        );
                      })}

                      {isAdmin ? (
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTierDropdown(activeTierDropdown === 'tier1' ? null : 'tier1');
                              setCountrySearchText('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-medium transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Country
                          </button>

                          {activeTierDropdown === 'tier1' && (
                            <div className="absolute left-0 top-full mt-1.5 w-64 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-1">
                              <div className="relative mb-2">
                                <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search country or code..."
                                  value={countrySearchText}
                                  onChange={(e) => setCountrySearchText(e.target.value)}
                                  className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#C9A227]"
                                  autoFocus
                                />
                              </div>
                              {allCountriesList
                                .filter((c) =>
                                  c.name.toLowerCase().includes(countrySearchText.toLowerCase()) ||
                                  c.code.toLowerCase().includes(countrySearchText.toLowerCase())
                                )
                                .map((c) => {
                                  const isAssignedHere = tier1Countries.includes(c.code);
                                  const otherTier = getTierForCountry(c.code);
                                  return (
                                    <button
                                      type="button"
                                      key={c.code}
                                      onClick={() => handleAddCountryToTier('tier1', c.code)}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                        isAssignedHere ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                                      }`}
                                    >
                                      <span className="flex items-center gap-1.5 truncate">
                                        <span>{c.flag}</span>
                                        <span className="truncate">{c.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">({c.code})</span>
                                      </span>
                                      {isAssignedHere ? (
                                        <Check className="w-3 h-3 text-blue-600 shrink-0" />
                                      ) : otherTier ? (
                                        <span className="text-[9px] text-rose-600 font-mono shrink-0">In {otherTier.name}</span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 font-mono py-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Admin Managed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CARD C: Tier 2 */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm hover:border-[#D4AF37]/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <h5 className="font-bold text-xs text-[#09112B]">C. Tier 2</h5>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                            Western Markets
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                            Auto 1.5x
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Countries sharing Tier 2 pricing (e.g. United States, Canada, United Kingdom). Automatically 1.5x of Base Price.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#17243B]">Tier USD Price *</span>
                        <div className="relative w-32">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required={pricingMode === 'regional'}
                            value={tier2Price}
                            onChange={(e) => setTier2Price(e.target.value)}
                            placeholder="15.00"
                            className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E8D7B7] text-xs font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#C9A227]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
                      {tier2Countries.map((cCode) => {
                        const cInfo = allCountriesList.find((c) => c.code === cCode);
                        return (
                          <span
                            key={cCode}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] font-medium"
                          >
                            <span>{cInfo?.flag || '🌐'}</span>
                            <span>{cInfo?.name || cCode} ({cCode})</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCountryFromTier('tier2', cCode)}
                                className="text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-full p-0.5 transition-colors"
                                title="Remove country (Admin only)"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        );
                      })}

                      {isAdmin ? (
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTierDropdown(activeTierDropdown === 'tier2' ? null : 'tier2');
                              setCountrySearchText('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-medium transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Country
                          </button>

                          {activeTierDropdown === 'tier2' && (
                            <div className="absolute left-0 top-full mt-1.5 w-64 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-1">
                              <div className="relative mb-2">
                                <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search country or code..."
                                  value={countrySearchText}
                                  onChange={(e) => setCountrySearchText(e.target.value)}
                                  className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#C9A227]"
                                  autoFocus
                                />
                              </div>
                              {allCountriesList
                                .filter((c) =>
                                  c.name.toLowerCase().includes(countrySearchText.toLowerCase()) ||
                                  c.code.toLowerCase().includes(countrySearchText.toLowerCase())
                                )
                                .map((c) => {
                                  const isAssignedHere = tier2Countries.includes(c.code);
                                  const otherTier = getTierForCountry(c.code);
                                  return (
                                    <button
                                      type="button"
                                      key={c.code}
                                      onClick={() => handleAddCountryToTier('tier2', c.code)}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                        isAssignedHere ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                                      }`}
                                    >
                                      <span className="flex items-center gap-1.5 truncate">
                                        <span>{c.flag}</span>
                                        <span className="truncate">{c.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">({c.code})</span>
                                      </span>
                                      {isAssignedHere ? (
                                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                      ) : otherTier ? (
                                        <span className="text-[9px] text-rose-600 font-mono shrink-0">In {otherTier.name}</span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 font-mono py-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Admin Managed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CARD D: Tier 3 */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm hover:border-[#D4AF37]/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                          <h5 className="font-bold text-xs text-[#09112B]">D. Tier 3</h5>
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-semibold">
                            Asia-Pacific & Oceania
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-mono font-bold">
                            Auto 1.0x (Matches Base)
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Countries sharing Tier 3 pricing (e.g. Australia, New Zealand, Singapore). Stays identical to Base Price.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#17243B]">Tier USD Price *</span>
                        <div className="relative w-32">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required={pricingMode === 'regional'}
                            value={tier3Price}
                            onChange={(e) => setTier3Price(e.target.value)}
                            placeholder="10.00"
                            className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E8D7B7] text-xs font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#C9A227]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
                      {tier3Countries.map((cCode) => {
                        const cInfo = allCountriesList.find((c) => c.code === cCode);
                        return (
                          <span
                            key={cCode}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-950 text-[11px] font-medium"
                          >
                            <span>{cInfo?.flag || '🌐'}</span>
                            <span>{cInfo?.name || cCode} ({cCode})</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCountryFromTier('tier3', cCode)}
                                className="text-purple-700 hover:text-purple-950 hover:bg-purple-100 rounded-full p-0.5 transition-colors"
                                title="Remove country (Admin only)"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        );
                      })}

                      {isAdmin ? (
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTierDropdown(activeTierDropdown === 'tier3' ? null : 'tier3');
                              setCountrySearchText('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-medium transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Country
                          </button>

                          {activeTierDropdown === 'tier3' && (
                            <div className="absolute left-0 top-full mt-1.5 w-64 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-1">
                              <div className="relative mb-2">
                                <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search country or code..."
                                  value={countrySearchText}
                                  onChange={(e) => setCountrySearchText(e.target.value)}
                                  className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#C9A227]"
                                  autoFocus
                                />
                              </div>
                              {allCountriesList
                                .filter((c) =>
                                  c.name.toLowerCase().includes(countrySearchText.toLowerCase()) ||
                                  c.code.toLowerCase().includes(countrySearchText.toLowerCase())
                                )
                                .map((c) => {
                                  const isAssignedHere = tier3Countries.includes(c.code);
                                  const otherTier = getTierForCountry(c.code);
                                  return (
                                    <button
                                      type="button"
                                      key={c.code}
                                      onClick={() => handleAddCountryToTier('tier3', c.code)}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                        isAssignedHere ? 'bg-purple-50 text-purple-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                                      }`}
                                    >
                                      <span className="flex items-center gap-1.5 truncate">
                                        <span>{c.flag}</span>
                                        <span className="truncate">{c.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">({c.code})</span>
                                      </span>
                                      {isAssignedHere ? (
                                        <Check className="w-3 h-3 text-purple-600 shrink-0" />
                                      ) : otherTier ? (
                                        <span className="text-[9px] text-rose-600 font-mono shrink-0">In {otherTier.name}</span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 font-mono py-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Admin Managed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CARD E: Rest of the World (Fallback Group) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-slate-100/70 to-slate-50 border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-slate-700" />
                          <h5 className="font-bold text-xs text-[#09112B]">E. Rest of the World</h5>
                          <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 text-[10px] font-semibold border border-slate-300">
                            Automatic Catch-All Fallback
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-900 border border-slate-300 text-[10px] font-mono font-bold">
                            Auto 1.5x
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 max-w-md leading-relaxed">
                          This fallback USD price applies automatically to all remaining countries worldwide that are not explicitly assigned to Base Country, Tier 1, Tier 2, or Tier 3. Automatically 1.5x of Base Price.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-[#17243B]">Fallback USD Price *</span>
                        <div className="relative w-32">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required={pricingMode === 'regional'}
                            value={rowPrice}
                            onChange={(e) => setRowPrice(e.target.value)}
                            placeholder="15.00"
                            className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white border border-[#E8D7B7] text-xs font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#C9A227] shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Compare-at Strike-Through */}
            <div>
              <label className="font-semibold text-[#17243B] block mb-1">Compare-at Price (Optional Strike-through)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={prodComparePrice}
                  onChange={(e) => setProdComparePrice(e.target.value)}
                  placeholder="350.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-xs font-mono text-[#17243B] focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#17243B] block mb-1">Metal Weight 18K (grams)</label>
                <input
                  type="number"
                  step="0.01"
                  value={prodMetalWeight}
                  onChange={(e) => setProdMetalWeight(e.target.value)}
                  placeholder="e.g. 14.5"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-xs font-mono focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#17243B] block mb-1">Total Stone / Diamond Count</label>
                <input
                  type="number"
                  value={prodStoneCount}
                  onChange={(e) => setProdStoneCount(e.target.value)}
                  placeholder="e.g. 36"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-xs font-mono focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#17243B] block mb-1">Ring Size / Dimensions</label>
                <input
                  type="text"
                  value={prodDimensions}
                  onChange={(e) => setProdDimensions(e.target.value)}
                  placeholder="US 7 (17.3mm) / 22 x 18 mm"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#17243B] block mb-1">Tolerance Spec</label>
                <input
                  type="text"
                  value={prodTolerance}
                  onChange={(e) => setProdTolerance(e.target.value)}
                  placeholder="±0.01 mm"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#17243B] block mb-1">Casting Tips & Recommendations</label>
              <textarea
                rows={2}
                value={prodCastingTips}
                onChange={(e) => setProdCastingTips(e.target.value)}
                placeholder="e.g. Spruing at bottom shank recommended; pre-cure resin under 405nm light..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8D7B7] text-xs focus:outline-none focus:border-[#C9A227]"
              />
            </div>

            {/* Mandatory Terms & Conditions Agreement Checkbox */}
            <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-[#17243B] select-none">
                <input
                  type="checkbox"
                  required
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded text-[#C9A227] focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-[#09112B] flex items-center gap-1.5">
                    <CheckCircle2 className={`w-4 h-4 ${agreedTerms ? 'text-emerald-600' : 'text-amber-600'}`} />
                    I agree to the Platform Commission Policy & Watertight Quality Terms *
                  </span>
                  <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                    I agree that Shiuli CAD will retain <strong>{categoryCommissionRate}%</strong> of the sale price as platform commission for <strong>{activeCategory?.name || 'this category'}</strong>. I certify that all uploaded 3DM & STL files are production-ready, watertight meshes, and pre-checked for direct casting.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STEP 3: Media & CAD Deliverables */}
        {currentStep === 3 && (
          <div className="space-y-5 text-xs">
            {/* Existing Images Gallery (if Edit Mode) */}
            {isEditMode && existingImages.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8D7B7] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#09112B]">Current Published Images ({existingImages.length})</label>
                  <span className="text-[10px] text-slate-500 font-mono">Live on store</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {existingImages.map((img) => (
                    <div
                      key={img.id}
                      className={`relative rounded-xl overflow-hidden border-2 aspect-square group shadow-sm ${
                        img.is_primary ? 'border-[#C9A227]' : 'border-slate-200'
                      }`}
                    >
                      <img src={img.image_url} alt="product" className="w-full h-full object-cover" />
                      {img.is_primary && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-[#C9A227] text-black">
                          PRIMARY
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingImage(img.id)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow"
                        title="Delete this image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Photos Section (Multi-Image Support) */}
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E8D7B7] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8D7B7] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-[#09112B] text-sm">
                      Product Photos & Multi-Angle Renders
                    </label>
                    <span className="px-2 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold">
                      {existingImages.length + newImageFiles.length} Selected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select multiple angles (Front, Perspective, Top, Detail, Model Wear). PNG, JPG, WebP supported.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-gold-luxury px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Images (Multiple)</span>
                </button>
              </div>

              {/* Hidden Multi-file Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageFileSelect}
                className="hidden"
              />

              {/* Interactive Drag & Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingImages(true);
                }}
                onDragLeave={() => setIsDraggingImages(false)}
                onDrop={handleImageDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-2 ${
                  isDraggingImages
                    ? 'border-[#C9A227] bg-[#FBF6E2]/50 scale-[1.01]'
                    : 'border-slate-300 hover:border-[#C9A227] bg-white/70 hover:bg-white'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#09112B] flex items-center justify-center shadow-md">
                  <UploadCloud className="w-6 h-6 text-[#F5E7A3]" />
                </div>
                <div>
                  <div className="font-serif font-bold text-[#17243B] text-sm">
                    Drag & drop multiple product images here, or <span className="text-[#C9A227] underline">browse</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hold <strong>Ctrl</strong> or <strong>Shift</strong> in the file dialog to select multiple images at once.
                  </p>
                </div>
              </div>

              {/* Selected Images Grid with Inline Add-More Button */}
              {newImageFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>New Photos Ready to Upload ({newImageFiles.length}):</span>
                    <span>Click "Set Primary" on any card to choose catalog cover</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {newImageFiles.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-xl overflow-hidden border-2 aspect-square group bg-slate-900 shadow-sm transition-all ${
                          img.isPrimary ? 'border-[#C9A227] ring-2 ring-[#C9A227]/40 shadow-md' : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img src={img.previewUrl} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                        
                        {/* Number Index */}
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono">
                          #{idx + 1}
                        </span>

                        {/* Primary Badge or Set Primary Button */}
                        <button
                          type="button"
                          onClick={() => setNewImageAsPrimary(idx)}
                          className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                            img.isPrimary
                              ? 'bg-[#C9A227] text-black shadow-md'
                              : 'bg-black/60 text-white hover:bg-black'
                          }`}
                        >
                          {img.isPrimary ? 'PRIMARY' : 'Set Primary'}
                        </button>

                        {/* Remove Image Button */}
                        <button
                          type="button"
                          onClick={() => removeNewImageFile(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
                          title="Remove this photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* Inline "+ Add Another" Card */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-slate-300 hover:border-[#C9A227] aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer bg-white/60 hover:bg-white text-slate-500 hover:text-[#09112B] transition-all group select-none shadow-xs"
                    >
                      <Plus className="w-6 h-6 text-[#C9A227] group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Add More</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Existing CAD Files (if Edit Mode) */}
            {isEditMode && existingFiles.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5 border border-slate-700">
                <span className="font-mono text-xs font-bold text-[#F5E7A3]">
                  Attached CAD Deliverables ({existingFiles.length})
                </span>
                <div className="space-y-1.5">
                  {existingFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-xs"
                    >
                      <span className="font-mono uppercase font-bold text-slate-300">
                        .{f.file_type} File
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingFile(f.id)}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] underline"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CAD Deliverable Files Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#09112B] text-white space-y-4 border border-[#D4AF37]/30 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-serif font-bold text-sm text-[#F5E7A3]">
                    {isEditMode ? 'Upload / Replace CAD Deliverables' : 'Production CAD Deliverable Attachments'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  Max size: 250 MB / file
                </span>
              </div>

              {/* Informational Guidance Notice */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-[#C9C2A6] space-y-1">
                <p>
                  Files are securely protected and provided exclusively to verified buyers. You can select individual file types or bundle them into a single ZIP.
                </p>
                <p className="text-[10px] text-amber-300/80">
                  💡 Note: If an upload fails due to server proxy limit (HTTP 413), you can remove or replace that specific file here without losing any entered product details.
                </p>
              </div>

              {/* Step 3 Top Failure Notice if any CAD file failed */}
              {Object.keys(fileErrors).length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold text-rose-100">
                      File Upload Alert ({Object.keys(fileErrors).length} failed file)
                    </p>
                    <p className="text-[11px] text-rose-300 leading-relaxed">
                      One or more CAD files could not be uploaded. Check the highlighted red box below to <strong>"Remove"</strong> or <strong>"Replace"</strong> the failed file with a smaller or compressed version. Your product data has been saved!
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-xs">
                {/* 1. .3DM Rhino File */}
                <div className={`p-3.5 rounded-xl transition-all border ${
                  fileErrors['3dm']
                    ? 'bg-rose-950/40 border-rose-500/80 ring-1 ring-rose-500/30'
                    : fileUploadStatus['3dm'] === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                      <FileCode className="w-4 h-4 text-[#D4AF37]" /> .3DM (Rhino) File
                    </div>
                    {fileUploadStatus['3dm'] === 'uploading' ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded-full">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Uploading {uploadProgressMap['3dm'] || 0}%
                      </span>
                    ) : fileUploadStatus['3dm'] === 'success' ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Uploaded
                      </span>
                    ) : fileUploadStatus['3dm'] === 'error' ? (
                      <span className="flex items-center gap-1 text-[10px] text-rose-300 font-mono bg-rose-500/20 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-2.5 h-2.5" /> Failed
                      </span>
                    ) : file3dm ? (
                      <span className="text-[10px] text-slate-300 font-mono bg-white/10 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    ) : null}
                  </div>

                  <input
                    ref={input3dmRef}
                    type="file"
                    accept=".3dm"
                    onChange={(e) => handleCadFileChange(e, setFile3dm, '3dm')}
                    className="hidden"
                  />

                  {!file3dm ? (
                    <button
                      type="button"
                      onClick={() => input3dmRef.current?.click()}
                      className="w-full py-3 px-3 rounded-lg border border-dashed border-white/20 hover:border-[#D4AF37] hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-[11px] text-slate-300 group"
                    >
                      <UploadCloud className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                      <span>Select .3DM File (up to 250MB)</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <div className="min-w-0 pr-2">
                          <p className="text-[11px] font-mono text-emerald-300 truncate font-semibold" title={file3dm.name}>
                            ✓ {file3dm.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Size: <span className="text-[#F5E7A3] font-bold">{formatFileSize(file3dm.size)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => input3dmRef.current?.click()}
                            disabled={fileUploadStatus['3dm'] === 'uploading'}
                            title="Replace with another file"
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[#F5E7A3] hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile('3dm')}
                            disabled={fileUploadStatus['3dm'] === 'uploading'}
                            title="Remove file"
                            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" /> Remove
                          </button>
                        </div>
                      </div>

                      {fileUploadStatus['3dm'] === 'uploading' && (
                        <div className="space-y-1">
                          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-[#D4AF37] transition-all duration-300"
                              style={{ width: `${uploadProgressMap['3dm'] || 0}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono block text-right">
                            {uploadProgressMap['3dm'] || 0}% uploaded
                          </span>
                        </div>
                      )}

                      {fileErrors['3dm'] && (
                        <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/60 text-rose-200 text-[11px] space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <div className="leading-snug">
                              <span className="font-semibold text-rose-200">Upload Rejected: </span>
                              {fileErrors['3dm']}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
                            <button
                              type="button"
                              onClick={() => handleRemoveFile('3dm')}
                              className="text-[10px] text-rose-300 hover:text-white underline font-semibold flex items-center gap-1"
                            >
                              <X className="w-2.5 h-2.5" /> Remove this file
                            </button>
                            <span className="text-white/20">|</span>
                            <button
                              type="button"
                              onClick={() => input3dmRef.current?.click()}
                              className="text-[10px] text-[#F5E7A3] hover:text-white underline font-semibold flex items-center gap-1"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Choose smaller file
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. .STL Print File */}
                <div className={`p-3.5 rounded-xl transition-all border ${
                  fileErrors['stl']
                    ? 'bg-rose-950/40 border-rose-500/80 ring-1 ring-rose-500/30'
                    : fileUploadStatus['stl'] === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                      <Box className="w-4 h-4 text-emerald-400" /> .STL Print File
                    </div>
                    {fileUploadStatus['stl'] === 'uploading' ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded-full">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Uploading {uploadProgressMap['stl'] || 0}%
                      </span>
                    ) : fileUploadStatus['stl'] === 'success' ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Uploaded
                      </span>
                    ) : fileUploadStatus['stl'] === 'error' ? (
                      <span className="flex items-center gap-1 text-[10px] text-rose-300 font-mono bg-rose-500/20 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-2.5 h-2.5" /> Failed
                      </span>
                    ) : fileStl ? (
                      <span className="text-[10px] text-slate-300 font-mono bg-white/10 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    ) : null}
                  </div>

                  <input
                    ref={inputStlRef}
                    type="file"
                    accept=".stl"
                    onChange={(e) => handleCadFileChange(e, setFileStl, 'stl')}
                    className="hidden"
                  />

                  {!fileStl ? (
                    <button
                      type="button"
                      onClick={() => inputStlRef.current?.click()}
                      className="w-full py-3 px-3 rounded-lg border border-dashed border-white/20 hover:border-emerald-400 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-[11px] text-slate-300 group"
                    >
                      <UploadCloud className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Select .STL File (up to 250MB)</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <div className="min-w-0 pr-2">
                          <p className="text-[11px] font-mono text-emerald-300 truncate font-semibold" title={fileStl.name}>
                            ✓ {fileStl.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Size: <span className="text-emerald-300 font-bold">{formatFileSize(fileStl.size)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => inputStlRef.current?.click()}
                            disabled={fileUploadStatus['stl'] === 'uploading'}
                            title="Replace with another file"
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[#F5E7A3] hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile('stl')}
                            disabled={fileUploadStatus['stl'] === 'uploading'}
                            title="Remove file"
                            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" /> Remove
                          </button>
                        </div>
                      </div>

                      {fileUploadStatus['stl'] === 'uploading' && (
                        <div className="space-y-1">
                          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-emerald-400 transition-all duration-300"
                              style={{ width: `${uploadProgressMap['stl'] || 0}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono block text-right">
                            {uploadProgressMap['stl'] || 0}% uploaded
                          </span>
                        </div>
                      )}

                      {fileErrors['stl'] && (
                        <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/60 text-rose-200 text-[11px] space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <div className="leading-snug">
                              <span className="font-semibold text-rose-200">Upload Rejected: </span>
                              {fileErrors['stl']}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
                            <button
                              type="button"
                              onClick={() => handleRemoveFile('stl')}
                              className="text-[10px] text-rose-300 hover:text-white underline font-semibold flex items-center gap-1"
                            >
                              <X className="w-2.5 h-2.5" /> Remove this file
                            </button>
                            <span className="text-white/20">|</span>
                            <button
                              type="button"
                              onClick={() => inputStlRef.current?.click()}
                              className="text-[10px] text-[#F5E7A3] hover:text-white underline font-semibold flex items-center gap-1"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Choose smaller file
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Render Image */}
                <div className={`p-3.5 rounded-xl transition-all border ${
                  fileErrors['render']
                    ? 'bg-rose-950/40 border-rose-500/80 ring-1 ring-rose-500/30'
                    : fileUploadStatus['render'] === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Render Image
                    </div>
                    {fileUploadStatus['render'] === 'uploading' ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded-full">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Uploading {uploadProgressMap['render'] || 0}%
                      </span>
                    ) : fileUploadStatus['render'] === 'success' ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Uploaded
                      </span>
                    ) : fileUploadStatus['render'] === 'error' ? (
                      <span className="flex items-center gap-1 text-[10px] text-rose-300 font-mono bg-rose-500/20 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-2.5 h-2.5" /> Failed
                      </span>
                    ) : fileRender ? (
                      <span className="text-[10px] text-slate-300 font-mono bg-white/10 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    ) : null}
                  </div>

                  <input
                    ref={inputRenderRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleCadFileChange(e, setFileRender, 'render')}
                    className="hidden"
                  />

                  {!fileRender ? (
                    <button
                      type="button"
                      onClick={() => inputRenderRef.current?.click()}
                      className="w-full py-3 px-3 rounded-lg border border-dashed border-white/20 hover:border-amber-400 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-[11px] text-slate-300 group"
                    >
                      <UploadCloud className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span>Select High-Res Render (PNG, JPG)</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <div className="min-w-0 pr-2">
                          <p className="text-[11px] font-mono text-emerald-300 truncate font-semibold" title={fileRender.name}>
                            ✓ {fileRender.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Size: <span className="text-amber-300 font-bold">{formatFileSize(fileRender.size)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => inputRenderRef.current?.click()}
                            disabled={fileUploadStatus['render'] === 'uploading'}
                            title="Replace with another file"
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[#F5E7A3] hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile('render')}
                            disabled={fileUploadStatus['render'] === 'uploading'}
                            title="Remove file"
                            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" /> Remove
                          </button>
                        </div>
                      </div>

                      {fileUploadStatus['render'] === 'uploading' && (
                        <div className="space-y-1">
                          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-amber-400 transition-all duration-300"
                              style={{ width: `${uploadProgressMap['render'] || 0}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono block text-right">
                            {uploadProgressMap['render'] || 0}% uploaded
                          </span>
                        </div>
                      )}

                      {fileErrors['render'] && (
                        <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/60 text-rose-200 text-[11px] space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <div className="leading-snug">
                              <span className="font-semibold text-rose-200">Upload Rejected: </span>
                              {fileErrors['render']}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
                            <button
                              type="button"
                              onClick={() => handleRemoveFile('render')}
                              className="text-[10px] text-rose-300 hover:text-white underline font-semibold flex items-center gap-1"
                            >
                              <X className="w-2.5 h-2.5" /> Remove this file
                            </button>
                            <span className="text-white/20">|</span>
                            <button
                              type="button"
                              onClick={() => inputRenderRef.current?.click()}
                              className="text-[10px] text-[#F5E7A3] hover:text-white underline font-semibold flex items-center gap-1"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Choose smaller file
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. 360° Video File */}
                <div className={`p-3.5 rounded-xl transition-all border ${
                  fileErrors['video']
                    ? 'bg-rose-950/40 border-rose-500/80 ring-1 ring-rose-500/30'
                    : fileUploadStatus['video'] === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                      <Eye className="w-4 h-4 text-blue-400" /> 360° Video File
                    </div>
                    {fileUploadStatus['video'] === 'uploading' ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded-full">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Uploading {uploadProgressMap['video'] || 0}%
                      </span>
                    ) : fileUploadStatus['video'] === 'success' ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Uploaded
                      </span>
                    ) : fileUploadStatus['video'] === 'error' ? (
                      <span className="flex items-center gap-1 text-[10px] text-rose-300 font-mono bg-rose-500/20 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-2.5 h-2.5" /> Failed
                      </span>
                    ) : fileVideo ? (
                      <span className="text-[10px] text-slate-300 font-mono bg-white/10 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    ) : null}
                  </div>

                  <input
                    ref={inputVideoRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleCadFileChange(e, setFileVideo, 'video')}
                    className="hidden"
                  />

                  {!fileVideo ? (
                    <button
                      type="button"
                      onClick={() => inputVideoRef.current?.click()}
                      className="w-full py-3 px-3 rounded-lg border border-dashed border-white/20 hover:border-blue-400 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-[11px] text-slate-300 group"
                    >
                      <UploadCloud className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span>Select 360° Video (MP4, WebM)</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <div className="min-w-0 pr-2">
                          <p className="text-[11px] font-mono text-emerald-300 truncate font-semibold" title={fileVideo.name}>
                            ✓ {fileVideo.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Size: <span className="text-blue-300 font-bold">{formatFileSize(fileVideo.size)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => inputVideoRef.current?.click()}
                            disabled={fileUploadStatus['video'] === 'uploading'}
                            title="Replace with another file"
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[#F5E7A3] hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile('video')}
                            disabled={fileUploadStatus['video'] === 'uploading'}
                            title="Remove file"
                            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" /> Remove
                          </button>
                        </div>
                      </div>

                      {fileUploadStatus['video'] === 'uploading' && (
                        <div className="space-y-1">
                          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-blue-400 transition-all duration-300"
                              style={{ width: `${uploadProgressMap['video'] || 0}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono block text-right">
                            {uploadProgressMap['video'] || 0}% uploaded
                          </span>
                        </div>
                      )}

                      {fileErrors['video'] && (
                        <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/60 text-rose-200 text-[11px] space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <div className="leading-snug">
                              <span className="font-semibold text-rose-200">Upload Rejected: </span>
                              {fileErrors['video']}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
                            <button
                              type="button"
                              onClick={() => handleRemoveFile('video')}
                              className="text-[10px] text-rose-300 hover:text-white underline font-semibold flex items-center gap-1"
                            >
                              <X className="w-2.5 h-2.5" /> Remove this file
                            </button>
                            <span className="text-white/20">|</span>
                            <button
                              type="button"
                              onClick={() => inputVideoRef.current?.click()}
                              className="text-[10px] text-[#F5E7A3] hover:text-white underline font-semibold flex items-center gap-1"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Choose smaller file
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. ZIP Archive (Full Width) */}
                <div className={`sm:col-span-2 p-3.5 rounded-xl transition-all border ${
                  fileErrors['zip']
                    ? 'bg-rose-950/40 border-rose-500/80 ring-1 ring-rose-500/30'
                    : fileUploadStatus['zip'] === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-gradient-to-r from-[#D4AF37]/10 to-white/5 border-[#D4AF37]/30 hover:border-[#D4AF37]/50'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                        <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                        ZIP Archive (all CAD files bundled)
                      </div>
                      <span className="text-[10px] text-[#D4AF37] font-mono bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/20">
                        Optional
                      </span>
                    </div>
                    {fileUploadStatus['zip'] === 'uploading' ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded-full">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Uploading {uploadProgressMap['zip'] || 0}%
                      </span>
                    ) : fileUploadStatus['zip'] === 'success' ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Uploaded
                      </span>
                    ) : fileUploadStatus['zip'] === 'error' ? (
                      <span className="flex items-center gap-1 text-[10px] text-rose-300 font-mono bg-rose-500/20 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-2.5 h-2.5" /> Failed
                      </span>
                    ) : fileZip ? (
                      <span className="text-[10px] text-slate-300 font-mono bg-white/10 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    ) : null}
                  </div>

                  <p className="text-[11px] text-slate-300 pb-2">
                    Upload a single .zip, .7z, or .rar containing your 3DM + STL files together. Accepts large archives up to 250 MB.
                  </p>

                  <input
                    ref={inputZipRef}
                    type="file"
                    accept=".zip,.7z,.tar,.gz,.rar"
                    onChange={(e) => handleCadFileChange(e, setFileZip, 'zip')}
                    className="hidden"
                  />

                  {!fileZip ? (
                    <button
                      type="button"
                      onClick={() => inputZipRef.current?.click()}
                      className="w-full py-3 px-3 rounded-lg border border-dashed border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-colors flex items-center justify-center gap-2 text-[11px] text-[#F5E7A3] group"
                    >
                      <UploadCloud className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                      <span>Select All-in-One CAD ZIP Archive</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <div className="min-w-0 pr-2">
                          <p className="text-[11px] font-mono text-emerald-300 truncate font-semibold" title={fileZip.name}>
                            ✓ {fileZip.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Archive Size: <span className="text-[#F5E7A3] font-bold">{formatFileSize(fileZip.size)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => inputZipRef.current?.click()}
                            disabled={fileUploadStatus['zip'] === 'uploading'}
                            title="Replace with another file"
                            className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[#F5E7A3] hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile('zip')}
                            disabled={fileUploadStatus['zip'] === 'uploading'}
                            title="Remove file"
                            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" /> Remove
                          </button>
                        </div>
                      </div>

                      {fileUploadStatus['zip'] === 'uploading' && (
                        <div className="space-y-1">
                          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-[#D4AF37] transition-all duration-300"
                              style={{ width: `${uploadProgressMap['zip'] || 0}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono block text-right">
                            {uploadProgressMap['zip'] || 0}% uploaded
                          </span>
                        </div>
                      )}

                      {fileErrors['zip'] && (
                        <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/60 text-rose-200 text-[11px] space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <div className="leading-snug">
                              <span className="font-semibold text-rose-200">Upload Rejected: </span>
                              {fileErrors['zip']}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
                            <button
                              type="button"
                              onClick={() => handleRemoveFile('zip')}
                              className="text-[10px] text-rose-300 hover:text-white underline font-semibold flex items-center gap-1"
                            >
                              <X className="w-2.5 h-2.5" /> Remove this file
                            </button>
                            <span className="text-white/20">|</span>
                            <button
                              type="button"
                              onClick={() => inputZipRef.current?.click()}
                              className="text-[10px] text-[#F5E7A3] hover:text-white underline font-semibold flex items-center gap-1"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Choose smaller file
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Save */}
        {currentStep === 4 && (
          <div className="space-y-4 text-xs">
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E8D7B7] space-y-3">
              <h4 className="font-serif font-bold text-base text-[#09112B]">
                {isEditMode ? 'Confirm Product Updates' : 'Product Card Summary Preview'}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">PRODUCT TITLE</span>
                  <strong className="text-sm font-serif text-[#17243B]">{prodTitle || 'Untitled Product'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">PRICE</span>
                  <strong className="text-sm text-emerald-700 font-bold">${prodPrice || '0.00'}</strong>
                  {prodComparePrice && (
                    <span className="line-through text-slate-400 ml-2">${prodComparePrice}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CATEGORY</span>
                  <span className="font-medium text-[#17243B]">
                    {categories.find((c) => c.id === Number(selectedParentCatId))?.name || 'Uncategorized'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">METAL / STONES</span>
                  <span className="font-medium text-[#17243B]">
                    {prodMetalWeight ? `${prodMetalWeight}g 18K` : 'Custom wt'} • {prodStoneCount} stone(s)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">COMMISSION DEDUCTION</span>
                  <span className="font-medium text-rose-700 font-mono">
                    {categoryCommissionRate}% Platform Fee (${calculatedCommissionAmount.toFixed(2)})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">YOUR NET PAYOUT</span>
                  <strong className="text-sm text-emerald-700 font-bold font-mono">
                    ${calculatedNetPayout.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">QUALITY & TERMS</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Agreed & Certified
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">IMAGES ATTACHED</span>
                  <span>
                    {existingImages.length} published + {newImageFiles.length} new
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CAD FILES TO UPLOAD</span>
                  <span>
                    {[file3dm && '3DM', fileStl && 'STL', fileRender && 'Render', fileVideo && 'Video']
                      .filter(Boolean)
                      .join(', ') || 'No new files'}
                  </span>
                </div>
              </div>
            </div>

            {/* Staff Verification Notice */}
            {isStaff && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="block font-bold text-amber-950 text-xs">
                    Admin Verification &amp; QC Review Required
                  </strong>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    When you submit this product, it will be placed in the <strong>Admin Verification Queue</strong> with status <em>Pending Approval</em>. Once the Super Admin reviews and verifies your CAD specifications, it will automatically go live on the public storefront.
                  </p>
                </div>
              </div>
            )}

            {isSubmitting && (
              <div className="p-4 rounded-xl bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37] flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs">{uploadProgressText}</span>
              </div>
            )}
          </div>
        )}

        {/* Stepper Footer Action Buttons */}
        <div className="space-y-3 pt-4 border-t border-[#E8D7B7]">
          {/* Inline step error message */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{submitError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="text-rose-700 underline font-bold text-[11px] hover:text-rose-900 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setSubmitError(null);
                  setCurrentStep(currentStep - 1);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 flex items-center gap-1 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  if (currentStep === 1) {
                    if (!prodTitle.trim()) {
                      setSubmitError('Please enter a Product Title.');
                      return;
                    }
                    if (!selectedParentCatId && !selectedSubCatId) {
                      setSubmitError('Please select a Category before proceeding.');
                      return;
                    }
                  }
                  if (currentStep === 2) {
                    if (pricingMode === 'global') {
                      if (!prodPrice || Number(prodPrice) <= 0) {
                        setSubmitError('Please enter a valid standard Listing Price in USD.');
                        return;
                      }
                      if (prodComparePrice && Number(prodComparePrice) <= Number(prodPrice)) {
                        setSubmitError('Compare-at price must be greater than standard Price.');
                        return;
                      }
                    } else {
                      // Regional Mode
                      const bPrice = Number(baseTierPrice);
                      const t1Price = Number(tier1Price);
                      const t2Price = Number(tier2Price);
                      const t3Price = Number(tier3Price);
                      const rPrice = Number(rowPrice);

                      if (
                        (!baseTierPrice && !rowPrice) ||
                        isNaN(bPrice) || bPrice < 0 ||
                        isNaN(t1Price) || t1Price < 0 ||
                        isNaN(t2Price) || t2Price < 0 ||
                        isNaN(t3Price) || t3Price < 0 ||
                        isNaN(rPrice) || rPrice < 0
                      ) {
                        setSubmitError('Please enter valid USD prices for the regional tiers (Base Country or Rest of the World).');
                        return;
                      }

                      // Ensure prodPrice is synchronized with the base tier or fallback price
                      if (!prodPrice || Number(prodPrice) <= 0) {
                        setProdPrice(baseTierPrice || rowPrice || '20.00');
                      }
                    }

                    if (!agreedTerms) {
                      setSubmitError('Please agree to the Commission Policy and production quality terms before proceeding.');
                      return;
                    }
                  }
                  setSubmitError(null);
                  setCurrentStep(currentStep + 1);
                }}
                className="btn-gold-luxury px-5 py-2.5 rounded-xl font-bold uppercase text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveProduct}
                className="btn-gold-luxury px-6 py-3 rounded-xl font-extrabold uppercase text-xs tracking-wider shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-[#0B1330]" />
                <span>
                  {isStaff
                    ? (isEditMode ? 'Submit Changes for Admin Review' : 'Submit for Admin Verification')
                    : (isEditMode ? 'Save Product Changes' : 'Publish Product Live')}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
