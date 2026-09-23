import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
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
  Image as ImageIcon
} from 'lucide-react';

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

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      const newItems = filesArr.map((f: File, idx: number) => ({
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
      if (filesArr.length > 0) {
        const newItems = filesArr.map((f: File, idx: number) => ({
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

    if (prodComparePrice && Number(prodComparePrice) <= Number(prodPrice)) {
      setSubmitError('Compare-at price must be greater than standard Price.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        title: prodTitle,
        category: Number(targetCatId),
        style_tags: selectedStyleIds,
        price: Number(prodPrice),
        compare_at_price: prodComparePrice ? Number(prodComparePrice) : null,
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
          dimensions: prodDimensions || 'Standard',
          tolerance: prodTolerance || '±0.01 mm',
        },
      };

      let productSlug = product?.slug;
      let finalProduct: any = null;

      if (isEditMode && productSlug) {
        setUploadProgressText('Updating product details in database...');
        finalProduct = await api.updateProduct(productSlug, payload);
      } else {
        setUploadProgressText('Creating Product Record in Database...');
        finalProduct = await api.createProduct(payload);
        productSlug = finalProduct.slug;
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
      if (file3dm) {
        setUploadProgressText('Uploading .3DM Rhino File...');
        await api.uploadProductFile(productSlug, file3dm, '3dm');
      }

      if (fileStl) {
        setUploadProgressText('Uploading .STL Print File...');
        await api.uploadProductFile(productSlug, fileStl, 'stl');
      }

      if (fileRender) {
        setUploadProgressText('Uploading High-Res Render File...');
        await api.uploadProductFile(productSlug, fileRender, 'render');
      }

      if (fileVideo) {
        setUploadProgressText('Uploading 360° Video File...');
        await api.uploadProductFile(productSlug, fileVideo, 'video');
      }

      setIsSubmitting(false);
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
      <div className="bg-white border border-[#E5E7EF] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-[#1E2230] max-h-[92vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-wider">
              {isEditMode ? 'Edit CAD Product' : 'Publish New Jewellery CAD'}
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E2230] tracking-tight mt-1">
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
              <label className="font-semibold text-[#1E2230] block mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={prodTitle}
                onChange={(e) => setProdTitle(e.target.value)}
                placeholder="e.g. Royal Nizam Solitaire Emerald Ring"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
              />
            </div>

            {/* Category Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Parent Category *</label>
                <select
                  value={selectedParentCatId}
                  onChange={(e) => {
                    setSelectedParentCatId(e.target.value ? Number(e.target.value) : '');
                    setSelectedSubCatId('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
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
                <label className="font-semibold text-[#1E2230] block mb-1">Subcategory (Optional)</label>
                <select
                  disabled={!selectedParentCatId || subCategoriesList.length === 0}
                  value={selectedSubCatId}
                  onChange={(e) => setSelectedSubCatId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs text-[#1E2230] focus:outline-none focus:border-[#C9A227] disabled:opacity-50"
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
                <label className="font-semibold text-[#1E2230]">Design Styles & Aesthetics</label>
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
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EF] text-xs focus:outline-none"
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
              <label className="font-semibold text-[#1E2230] block mb-1">Detailed Description</label>
              <textarea
                rows={3}
                value={prodDescription}
                onChange={(e) => setProdDescription(e.target.value)}
                placeholder="Describe prong layout, casting notes, aesthetic inspiration..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
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

              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-[#C9A227] focus:ring-0 w-4 h-4"
                />
                <span>Featured on Homepage</span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: Specs & Pricing */}
        {currentStep === 2 && (
          <div className="space-y-4 text-xs">
            {/* Dynamic Two-Box Pricing & Category Commission */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">
                  Listing Price (Customer Pays) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$ / ₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="250.00"
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-sm font-mono font-bold text-[#1E2230] focus:outline-none focus:border-[#C9A227] shadow-sm"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Public customer storefront purchase price.
                </span>
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1 flex items-center justify-between">
                  <span>Admin Commission ({categoryCommissionRate}%)</span>
                  <span className="text-[10px] font-mono text-[#F5E7A3] bg-[#09112B] px-1.5 py-0.5 rounded">
                    {activeCategory?.name || 'Category'}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$ / ₹</span>
                  <input
                    type="text"
                    readOnly
                    value={calculatedCommissionAmount > 0 ? calculatedCommissionAmount.toFixed(2) : '0.00'}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-mono font-bold text-rose-700 cursor-not-allowed select-none"
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

            {/* Compare-at Strike-Through */}
            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Compare-at Price (Optional Strike-through)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$ / ₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={prodComparePrice}
                  onChange={(e) => setProdComparePrice(e.target.value)}
                  placeholder="350.00"
                  className="w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs font-mono text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Metal Weight 18K (grams)</label>
                <input
                  type="number"
                  step="0.01"
                  value={prodMetalWeight}
                  onChange={(e) => setProdMetalWeight(e.target.value)}
                  placeholder="e.g. 14.5"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs font-mono focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Total Stone / Diamond Count</label>
                <input
                  type="number"
                  value={prodStoneCount}
                  onChange={(e) => setProdStoneCount(e.target.value)}
                  placeholder="e.g. 36"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs font-mono focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Ring Size / Dimensions</label>
                <input
                  type="text"
                  value={prodDimensions}
                  onChange={(e) => setProdDimensions(e.target.value)}
                  placeholder="US 7 (17.3mm) / 22 x 18 mm"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Tolerance Spec</label>
                <input
                  type="text"
                  value={prodTolerance}
                  onChange={(e) => setProdTolerance(e.target.value)}
                  placeholder="±0.01 mm"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Casting Tips & Recommendations</label>
              <textarea
                rows={2}
                value={prodCastingTips}
                onChange={(e) => setProdCastingTips(e.target.value)}
                placeholder="e.g. Spruing at bottom shank recommended; pre-cure resin under 405nm light..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
              />
            </div>

            {/* Mandatory Terms & Conditions Agreement Checkbox */}
            <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-[#1E2230] select-none">
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
              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E5E7EF] space-y-3">
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
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E5E7EF] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EF] pb-3">
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
                  <div className="font-serif font-bold text-[#1E2230] text-sm">
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
            <div className="p-4 rounded-2xl bg-[#09112B] text-white space-y-3 border border-[#D4AF37]/30">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-serif font-bold text-sm text-[#F5E7A3]">
                  {isEditMode ? 'Upload / Replace CAD Deliverables' : 'Production CAD Deliverable Attachments'}
                </span>
              </div>
              <p className="text-[11px] text-[#C9C2A6]">
                These files are served via authenticated, purchase-verified endpoints. They are never publicly accessible without purchase.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                    <FileCode className="w-4 h-4 text-[#D4AF37]" /> .3DM (Rhino) File
                  </div>
                  <input
                    type="file"
                    accept=".3dm"
                    onChange={(e) => setFile3dm(e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-300 cursor-pointer"
                  />
                  {file3dm && <span className="text-[10px] text-emerald-400 font-mono block">Selected: {file3dm.name}</span>}
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                    <Box className="w-4 h-4 text-emerald-400" /> .STL Print File
                  </div>
                  <input
                    type="file"
                    accept=".stl"
                    onChange={(e) => setFileStl(e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-300 cursor-pointer"
                  />
                  {fileStl && <span className="text-[10px] text-emerald-400 font-mono block">Selected: {fileStl.name}</span>}
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Render Image File
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFileRender(e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-300 cursor-pointer"
                  />
                  {fileRender && <span className="text-[10px] text-emerald-400 font-mono block">Selected: {fileRender.name}</span>}
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                    <Eye className="w-4 h-4 text-blue-400" /> 360° Video File
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setFileVideo(e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-300 cursor-pointer"
                  />
                  {fileVideo && <span className="text-[10px] text-emerald-400 font-mono block">Selected: {fileVideo.name}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Save */}
        {currentStep === 4 && (
          <div className="space-y-4 text-xs">
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E5E7EF] space-y-3">
              <h4 className="font-serif font-bold text-base text-[#09112B]">
                {isEditMode ? 'Confirm Product Updates' : 'Product Card Summary Preview'}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">PRODUCT TITLE</span>
                  <strong className="text-sm font-serif text-[#1E2230]">{prodTitle || 'Untitled Product'}</strong>
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
                  <span className="font-medium text-[#1E2230]">
                    {categories.find((c) => c.id === Number(selectedParentCatId))?.name || 'Uncategorized'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">METAL / STONES</span>
                  <span className="font-medium text-[#1E2230]">
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

            {isSubmitting && (
              <div className="p-4 rounded-xl bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37] flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs">{uploadProgressText}</span>
              </div>
            )}
          </div>
        )}

        {/* Stepper Footer Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EF]">
          {currentStep > 1 ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 flex items-center gap-1 font-semibold hover:bg-slate-50 transition-colors"
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
                if (currentStep === 1 && (!prodTitle.trim() || (!selectedParentCatId && !selectedSubCatId))) {
                  alert('Please enter a Product Title and select a Category.');
                  return;
                }
                if (currentStep === 2) {
                  if (!prodPrice || Number(prodPrice) <= 0) {
                    alert('Please enter a valid standard Price.');
                    return;
                  }
                  if (!agreedTerms) {
                    alert('Please agree to the Commission Policy and production quality terms before proceeding.');
                    return;
                  }
                }
                setCurrentStep(currentStep + 1);
              }}
              className="btn-gold-luxury px-5 py-2.5 rounded-xl font-bold uppercase text-xs flex items-center gap-1.5"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveProduct}
              className="btn-gold-luxury px-6 py-3 rounded-xl font-extrabold uppercase text-xs tracking-wider shadow-lg flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 fill-[#0B1330]" />
              <span>{isEditMode ? 'Save Product Changes' : 'Publish Product Live'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
