import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  FileCode,
  Box,
  Eye,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  ChevronRight,
  Search,
  Filter,
  Tag,
  Lock,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  parent_name?: string;
  display_order: number;
  subcategories: CategoryItem[];
  product_count: number;
}

interface DesignStyleItem {
  id: number;
  name: string;
}

interface BackendProduct {
  id: number;
  title: string;
  slug: string;
  category: number;
  category_name?: string;
  price: string | number;
  compare_at_price?: string | number;
  metal_weight_grams?: string | number;
  stone_count?: number;
  status: 'approved' | 'pending' | 'rejected';
  is_bestseller: boolean;
  is_new: boolean;
  primary_image?: string;
  created_at: string;
}

export const AdminCatalogModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [designStyles, setDesignStyles] = useState<DesignStyleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Stepper Modal State
  const [showProductStepper, setShowProductStepper] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // STEP 2 Form
  const [prodPrice, setProdPrice] = useState<string>('');
  const [prodComparePrice, setProdComparePrice] = useState<string>('');
  const [prodMetalWeight, setProdMetalWeight] = useState<string>('');
  const [prodStoneCount, setProdStoneCount] = useState<string>('0');
  const [prodDimensions, setProdDimensions] = useState<string>('');
  const [prodTolerance, setProdTolerance] = useState<string>('±0.01 mm');

  // STEP 3 Media & CAD Files
  const [imageFiles, setImageFiles] = useState<{ file: File; isPrimary: boolean; previewUrl: string }[]>([]);
  const [file3dm, setFile3dm] = useState<File | null>(null);
  const [fileStl, setFileStl] = useState<File | null>(null);
  const [fileRender, setFileRender] = useState<File | null>(null);
  const [fileVideo, setFileVideo] = useState<File | null>(null);

  // Category Drawers/Modals
  const [showAddCategoryDrawer, setShowAddCategoryDrawer] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDisplayOrder, setNewCatDisplayOrder] = useState<number>(0);
  const [catSubmitError, setCatSubmitError] = useState<string | null>(null);

  const [addingSubCatParentId, setAddingSubCatParentId] = useState<number | null>(null);
  const [newSubCatName, setNewSubCatName] = useState('');
  const [newSubCatSlug, setNewSubCatSlug] = useState('');

  // Category Delete Warning State
  const [catDeleteWarning, setCatDeleteWarning] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load Catalog Data from Backend
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [catsRes, stylesRes, prodsRes] = await Promise.all([
        api.getCategories(false),
        api.getDesignStyles(),
        api.getProducts(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ]);
      setCategories(Array.isArray(catsRes) ? catsRes : (catsRes as any)?.results || []);
      setDesignStyles(Array.isArray(stylesRes) ? stylesRes : (stylesRes as any)?.results || []);
      
      const prodData = prodsRes?.results ? prodsRes.results : Array.isArray(prodsRes) ? prodsRes : [];
      setProducts(prodData);
    } catch (err: any) {
      console.error('Failed to load catalog data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Helper: Flatten subcategories for cascading dropdown
  const parentCategories = categories.filter((c) => !c.parent);
  const activeSubcategories = parentCategories.find((c) => c.id === selectedParentCatId)?.subcategories || [];

  // Auto-slugify helpers
  const handleCatNameChange = (val: string) => {
    setNewCatName(val);
    setNewCatSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const handleSubCatNameChange = (val: string) => {
    setNewSubCatName(val);
    setNewSubCatSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  // Handle Creating Top Category
  const handleCreateTopCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatSubmitError(null);
    try {
      const created = await api.createCategory({
        name: newCatName,
        slug: newCatSlug || undefined,
        parent: null,
        display_order: Number(newCatDisplayOrder),
      });
      showToast(`Category "${created.name}" created successfully!`);
      setShowAddCategoryDrawer(false);
      setNewCatName('');
      setNewCatSlug('');
      setNewCatDisplayOrder(0);
      loadData();
    } catch (err: any) {
      setCatSubmitError(err.message || 'Failed to create category.');
    }
  };

  // Handle Creating Sub-category
  const handleCreateSubCategory = async (parentId: number) => {
    if (!newSubCatName) return;
    try {
      const created = await api.createCategory({
        name: newSubCatName,
        slug: newSubCatSlug || undefined,
        parent: parentId,
      });
      showToast(`Sub-category "${created.name}" added!`);
      setAddingSubCatParentId(null);
      setNewSubCatName('');
      setNewSubCatSlug('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create subcategory.');
    }
  };

  // Handle Category Deletion with Product Count Check
  const handleDeleteCategory = async (cat: CategoryItem) => {
    let force = false;
    if (cat.product_count > 0) {
      const confirmForce = window.confirm(
        `Category "${cat.name}" has ${cat.product_count} assigned product(s).\n\nDo you want to automatically remove all assigned products and delete category "${cat.name}"?`
      );
      if (!confirmForce) return;
      force = true;
    } else {
      if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    }

    try {
      await api.deleteCategory(cat.id, force);
      showToast(`Category "${cat.name}" deleted.`);
      setCatDeleteWarning(null);
      loadData();
    } catch (err: any) {
      setCatDeleteWarning(err.message || 'Failed to delete category.');
    }
  };

  // Handle Sub-category Deletion with Product Reassign Option
  const handleDeleteSubCategory = async (sub: CategoryItem, parentCat: CategoryItem) => {
    let force = false;
    let reassign = false;
    if (sub.product_count > 0) {
      const confirmForce = window.confirm(
        `Sub-category "${sub.name}" has ${sub.product_count} assigned product(s).\n\nDo you want to automatically remove all assigned products and delete sub-category "${sub.name}"?`
      );
      if (!confirmForce) return;
      force = true;
    } else {
      if (!window.confirm(`Are you sure you want to delete sub-category "${sub.name}"?`)) {
        return;
      }
    }

    try {
      await api.deleteCategory(sub.id, force, reassign);
      showToast(`Sub-category "${sub.name}" deleted successfully.`);
      setCatDeleteWarning(null);
      loadData();
    } catch (err: any) {
      setCatDeleteWarning(err.message || `Failed to delete sub-category "${sub.name}".`);
    }
  };

  // Create Design Style tag on the fly
  const handleInlineCreateStyle = async () => {
    if (!newStyleName.trim()) return;
    try {
      const created = await api.createDesignStyle(newStyleName.trim());
      setDesignStyles([...designStyles, created]);
      setSelectedStyleIds([...selectedStyleIds, created.id]);
      setNewStyleName('');
      setShowAddStyleInput(false);
      showToast(`Style tag "${created.name}" added!`);
    } catch (err: any) {
      alert(err.message || 'Failed to add design style.');
    }
  };

  // Multi-image selection helper
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      const newItems = filesArr.map((f: File, idx: number) => ({
        file: f,
        isPrimary: imageFiles.length === 0 && idx === 0,
        previewUrl: URL.createObjectURL(f),
      }));
      setImageFiles([...imageFiles, ...newItems]);
    }
  };

  const setPrimaryImage = (index: number) => {
    setImageFiles(
      imageFiles.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  };

  const removeImageFile = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  // Final Publish Stepper Submission (Create-Then-Attach Pattern)
  const handleFinalPublish = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    // Validation
    const targetCatId = selectedSubCatId || selectedParentCatId;
    if (!targetCatId) {
      setSubmitError('Please select a Category before publishing.');
      setIsSubmitting(false);
      return;
    }

    if (prodComparePrice && Number(prodComparePrice) <= Number(prodPrice)) {
      setSubmitError('Compare-at price must be greater than standard Price.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Step A: Create Product Record (Status = PENDING)
      setUploadProgressText('Creating Product Record in Database...');
      const createdProduct = await api.createProduct({
        title: prodTitle,
        category: Number(targetCatId),
        style_tags: selectedStyleIds,
        price: Number(prodPrice),
        compare_at_price: prodComparePrice ? Number(prodComparePrice) : undefined,
        description: prodDescription || 'Parametric luxury jewellery CAD model pre-tested for casting.',
        metal_weight_grams: prodMetalWeight ? Number(prodMetalWeight) : undefined,
        stone_count: Number(prodStoneCount) || 0,
        is_bestseller: isBestseller,
        is_new: isNew,
      });

      const productSlug = createdProduct.slug;

      // Step B: Upload Product Images
      if (imageFiles.length > 0) {
        setUploadProgressText(`Uploading ${imageFiles.length} Product Images...`);
        for (let i = 0; i < imageFiles.length; i++) {
          const imgItem = imageFiles[i];
          await api.uploadProductImage(productSlug, imgItem.file, imgItem.isPrimary, i);
        }
      }

      // Step C: Upload CAD Files
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

      // Final Step: Transition to APPROVED status for Admin
      setUploadProgressText('Finalizing & Publishing Live...');
      await api.approveProduct(productSlug);

      setIsSubmitting(false);
      setShowProductStepper(false);
      showToast(`"${prodTitle}" is now live on the store!`);

      // Reset form
      setProdTitle('');
      setSelectedParentCatId('');
      setSelectedSubCatId('');
      setSelectedStyleIds([]);
      setProdDescription('');
      setProdPrice('');
      setProdComparePrice('');
      setProdMetalWeight('');
      setProdStoneCount('0');
      setImageFiles([]);
      setFile3dm(null);
      setFileStl(null);
      setFileRender(null);
      setFileVideo(null);
      setCurrentStep(1);

      loadData();
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err.message || 'Product creation failed midway. Check entered values and retry.');
    }
  };

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#09112B] border border-[#D4AF37] text-white text-xs shadow-2xl animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-widest">
              Live Database Integration
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• Catalog Admin</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight mt-1">
            Categories & Published Catalog
          </h1>
          <p className="text-xs text-[#6B7280]">
            Manage ready-to-download CAD models, 3DM/STL attachments, and category taxonomies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#F6F7FB] p-1 rounded-xl border border-[#E5E7EF] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'products' ? 'bg-[#09112B] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#1E2230]'
              }`}
            >
              Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'categories' ? 'bg-[#09112B] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#1E2230]'
              }`}
            >
              Category Tree
            </button>
          </div>

          <button
            onClick={() => {
              setShowProductStepper(true);
              setCurrentStep(1);
            }}
            className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4 text-[#0B1330]" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Main Tab View */}
      {activeTab === 'products' ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-sm overflow-hidden space-y-4">
          {/* Filter Bar */}
          <div className="p-4 border-b border-[#E5E7EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF9F5]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Search products by title or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E5E7EF] text-xs text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="text-[#6B7280] font-mono">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EF] text-xs text-[#1E2230] focus:outline-none"
              >
                <option value="all">All Products</option>
                <option value="approved">Live / Approved</option>
                <option value="pending">Draft / Pending</option>
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#09112B] text-[#F5E7A3] text-[11px] font-mono uppercase tracking-wider">
                  <th className="p-4 font-medium">Design & Title</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Badges</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EF] text-xs">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {prod.primary_image ? (
                          <img
                            src={prod.primary_image}
                            alt={prod.title}
                            className="w-11 h-11 rounded-xl object-cover border border-[#E5E7EF] shadow-sm"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-mono text-[10px]">
                            NO IMG
                          </div>
                        )}
                        <div>
                          <div className="font-serif font-bold text-[#1E2230] text-sm">{prod.title}</div>
                          <div className="text-[10px] text-[#6B7280] font-mono">SKU: {prod.slug}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-medium text-[#1E2230]">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono">
                        {prod.category_name || 'Uncategorized'}
                      </span>
                    </td>

                    <td className="p-4 font-mono font-bold text-[#1E2230]">
                      ${prod.price}
                      {prod.compare_at_price && (
                        <span className="text-[10px] text-[#9CA3AF] line-through ml-1.5">
                          ${prod.compare_at_price}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {prod.is_bestseller && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
                            BESTSELLER
                          </span>
                        )}
                        {prod.is_new && (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                            NEW
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                          prod.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prod.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {prod.status === 'approved' ? 'Published Live' : 'Draft / Uploading'}
                      </span>
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={async () => {
                          if (window.confirm(`Delete "${prod.title}"?`)) {
                            await api.deleteProduct(prod.slug);
                            showToast(`Product deleted.`);
                            loadData();
                          }
                        }}
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#6B7280] font-mono">
                      No products found in live database matching your query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Categories Taxonomy & Tree View */
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-6 shadow-sm space-y-6">
          {catDeleteWarning && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{catDeleteWarning}</span>
              </div>
              <button
                onClick={() => setCatDeleteWarning(null)}
                className="text-rose-700 hover:text-rose-950 font-bold underline text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1E2230]">Category Taxonomy Hierarchy</h3>
              <p className="text-xs text-[#6B7280]">Live product counts auto-calculated from database.</p>
            </div>
            <button
              onClick={() => setShowAddCategoryDrawer(true)}
              className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5 text-[#0B1330]" />
              <span>+ New Category</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {parentCategories.map((cat) => (
              <div key={cat.id} className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E5E7EF] space-y-3 shadow-sm">
                <div className="flex items-center justify-between font-bold text-sm text-[#09112B]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4.5 h-4.5 text-[#C9A227]" />
                    <span className="font-serif text-base font-bold">{cat.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono">
                      {cat.product_count} Products
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setAddingSubCatParentId(addingSubCatParentId === cat.id ? null : cat.id);
                        setNewSubCatName('');
                        setNewSubCatSlug('');
                      }}
                      className="text-xs text-[#2856C7] font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Sub-category
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-100"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Sub-category Creator */}
                {addingSubCatParentId === cat.id && (
                  <div className="p-3 bg-white rounded-xl border border-[#C9A227]/40 flex items-center gap-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Sub-category name (e.g. Solitaires)"
                      value={newSubCatName}
                      onChange={(e) => handleSubCatNameChange(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                    />
                    <button
                      onClick={() => handleCreateSubCategory(cat.id)}
                      className="btn-gold-luxury px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
                    >
                      Save Sub-category
                    </button>
                    <button
                      onClick={() => setAddingSubCatParentId(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Subcategory Chips */}
                <div className="pl-6 pt-1 flex flex-wrap gap-2">
                  {cat.subcategories.length === 0 ? (
                    <span className="text-[11px] text-[#9CA3AF] italic">No subcategories created yet.</span>
                  ) : (
                    cat.subcategories.map((sub) => (
                      <span
                        key={sub.id}
                        className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E5E7EF] text-[#1E2230] text-xs shadow-sm flex items-center gap-2 group hover:border-[#C9A227] transition-all"
                      >
                        <span className="font-medium">{sub.name}</span>
                        <span className="text-[10px] font-mono text-[#6B7280]">({sub.product_count})</span>
                        <button
                          onClick={() => handleDeleteSubCategory(sub, cat)}
                          className="p-1 rounded text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 font-bold transition-all cursor-pointer"
                          title={`Delete Sub-category "${sub.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top-Level New Category Drawer */}
      {showAddCategoryDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
              <h3 className="font-serif text-lg font-bold text-[#1E2230]">Create Top-Level Category</h3>
              <button onClick={() => setShowAddCategoryDrawer(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {catSubmitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {catSubmitError}
              </div>
            )}

            <form onSubmit={handleCreateTopCategory} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => handleCatNameChange(e.target.value)}
                  placeholder="e.g. Nose Pins"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Slug (URL Keyword)</label>
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="nose-pins"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Display Order</label>
                <input
                  type="number"
                  value={newCatDisplayOrder}
                  onChange={(e) => setNewCatDisplayOrder(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#E5E7EF]">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryDrawer(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E7EF] text-[#1E2230]"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-gold-luxury px-5 py-2 rounded-xl text-xs font-bold uppercase">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4-STEP ADD PRODUCT STEPPER MODAL */}
      {showProductStepper && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EF] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-[#1E2230] max-h-[90vh] overflow-y-auto relative animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-wider">
                  Create-Then-Attach Stepper
                </span>
                <h2 className="font-serif text-xl font-bold text-[#1E2230] tracking-tight mt-1">
                  Publish New Jewellery CAD Product
                </h2>
              </div>
              <button
                disabled={isSubmitting}
                onClick={() => setShowProductStepper(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
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
                { num: 4, label: '4. Review & Publish' },
              ].map((step) => (
                <div
                  key={step.num}
                  className={`py-2 rounded-xl border transition-all ${
                    currentStep === step.num
                      ? 'bg-[#09112B] text-[#F5E7A3] border-[#D4AF37] font-bold shadow-md'
                      : currentStep > step.num
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {step.label}
                </div>
              ))}
            </div>

            {/* Submit Error Banner */}
            {submitError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
                <button onClick={() => setSubmitError(null)} className="text-rose-700 underline font-bold">
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#1E2230] block mb-1">Top Category *</label>
                    <select
                      value={selectedParentCatId}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSelectedParentCatId(val);
                        setSelectedSubCatId('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                    >
                      <option value="">Select Top Category...</option>
                      {parentCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-[#1E2230] block mb-1">Sub-category</label>
                    <select
                      disabled={!selectedParentCatId}
                      value={selectedSubCatId}
                      onChange={(e) => setSelectedSubCatId(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none disabled:opacity-50"
                    >
                      <option value="">Select Sub-category (Optional)...</option>
                      {activeSubcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Design Style Tags */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-[#1E2230]">Design Style Tags</label>
                    <button
                      type="button"
                      onClick={() => setShowAddStyleInput(!showAddStyleInput)}
                      className="text-[#2856C7] font-semibold text-[11px] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> + New Style
                    </button>
                  </div>

                  {showAddStyleInput && (
                    <div className="p-2 mb-2 bg-[#FAF9F5] rounded-xl border border-[#C9A227]/40 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Filigree Art"
                        value={newStyleName}
                        onChange={(e) => setNewStyleName(e.target.value)}
                        className="flex-1 px-3 py-1 rounded-lg bg-white border border-[#E5E7EF] text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleInlineCreateStyle}
                        className="btn-gold-luxury px-3 py-1 rounded-lg text-xs font-bold uppercase"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {designStyles.map((style) => {
                      const isSelected = selectedStyleIds.includes(style.id);
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedStyleIds(selectedStyleIds.filter((id) => id !== style.id));
                            } else {
                              setSelectedStyleIds([...selectedStyleIds, style.id]);
                            }
                          }}
                          className={`px-3 py-1 rounded-xl text-xs border transition-all ${
                            isSelected
                              ? 'bg-[#09112B] text-[#F5E7A3] border-[#D4AF37] font-bold shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {style.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[#1E2230] block mb-1">Short Description *</label>
                  <textarea
                    rows={3}
                    required
                    value={prodDescription}
                    onChange={(e) => setProdDescription(e.target.value)}
                    placeholder="Technical description of CAD model, stone settings, azures, metal tolerances..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={isBestseller}
                      onChange={(e) => setIsBestseller(e.target.checked)}
                      className="rounded border-[#E5E7EF] text-[#C9A227] focus:ring-0"
                    />
                    <span>Mark as Bestseller</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={isNew}
                      onChange={(e) => setIsNew(e.target.checked)}
                      className="rounded border-[#E5E7EF] text-[#C9A227] focus:ring-0"
                    />
                    <span>Mark with "NEW" Badge</span>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: Specs & Pricing */}
            {currentStep === 2 && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#1E2230] block mb-1">Standard Price ($) *</label>
                    <input
                      type="number"
                      required
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="79"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1E2230] block mb-1">Compare-at Price ($)</label>
                    <input
                      type="number"
                      value={prodComparePrice}
                      onChange={(e) => setProdComparePrice(e.target.value)}
                      placeholder="99 (Must be greater than Price)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#1E2230] block mb-1">Metal Weight (Grams)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={prodMetalWeight}
                      onChange={(e) => setProdMetalWeight(e.target.value)}
                      placeholder="e.g. 14.50"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1E2230] block mb-1">Stone Count</label>
                    <input
                      type="number"
                      value={prodStoneCount}
                      onChange={(e) => setProdStoneCount(e.target.value)}
                      placeholder="24"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
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
              </div>
            )}

            {/* STEP 3: Media & CAD Files Upload */}
            {currentStep === 3 && (
              <div className="space-y-5 text-xs">
                {/* Images Upload Section */}
                <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E5E7EF] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#09112B]">Product Photos & Render Gallery</label>
                    <span className="text-[10px] font-mono text-slate-500">Select primary image</span>
                  </div>

                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageFileSelect}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#09112B] file:text-[#F5E7A3] hover:file:bg-[#122254]"
                  />

                  <div className="grid grid-cols-4 gap-3 pt-2">
                    {imageFiles.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-xl overflow-hidden border-2 aspect-square group ${
                          img.isPrimary ? 'border-[#C9A227] shadow-md' : 'border-slate-200'
                        }`}
                      >
                        <img src={img.previewUrl} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(idx)}
                          className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            img.isPrimary ? 'bg-[#C9A227] text-black' : 'bg-black/60 text-white hover:bg-black'
                          }`}
                        >
                          {img.isPrimary ? 'PRIMARY' : 'Set Primary'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImageFile(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CAD Deliverable Files Section */}
                <div className="p-4 rounded-2xl bg-[#09112B] text-white space-y-3 border border-[#D4AF37]/30">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#D4AF37]" />
                    <span className="font-serif font-bold text-sm text-[#F5E7A3]">
                      Production CAD Deliverable Attachments
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C9C2A6]">
                    These files are served via authenticated, purchase-verified endpoints. They are never publicly accessible.
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
                        className="w-full text-[11px] text-slate-300"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                        <Box className="w-4 h-4 text-emerald-400" /> .STL Print File
                      </div>
                      <input
                        type="file"
                        accept=".stl"
                        onChange={(e) => setFileStl(e.target.files?.[0] || null)}
                        className="w-full text-[11px] text-slate-300"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                        <Sparkles className="w-4 h-4 text-amber-400" /> Render Image File
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFileRender(e.target.files?.[0] || null)}
                        className="w-full text-[11px] text-slate-300"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#F5E7A3]">
                        <Eye className="w-4 h-4 text-blue-400" /> 360° Video File
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setFileVideo(e.target.files?.[0] || null)}
                        className="w-full text-[11px] text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Review & Publish */}
            {currentStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E5E7EF] space-y-3">
                  <h4 className="font-serif font-bold text-base text-[#09112B]">Product Card Summary Preview</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">TITLE</span>
                      <strong className="text-sm font-serif">{prodTitle || 'Untitled Product'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">PRICE</span>
                      <strong className="text-sm text-emerald-700">${prodPrice}</strong>
                      {prodComparePrice && <span className="line-through text-slate-400 ml-2">${prodComparePrice}</span>}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">IMAGES ATTACHED</span>
                      {imageFiles.length} file(s)
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">CAD FILES ATTACHED</span>
                      {[file3dm && '3DM', fileStl && 'STL', fileRender && 'Render', fileVideo && 'Video'].filter(Boolean).join(', ') || 'None'}
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
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 flex items-center gap-1 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : <div />}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && (!prodTitle || (!selectedParentCatId && !selectedSubCatId))) {
                      alert('Please fill out Product Title and select a Category.');
                      return;
                    }
                    if (currentStep === 2 && !prodPrice) {
                      alert('Please enter a valid Price.');
                      return;
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
                  onClick={handleFinalPublish}
                  className="btn-gold-luxury px-6 py-3 rounded-xl font-extrabold uppercase text-xs tracking-wider shadow-lg flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 fill-[#0B1330]" />
                  <span>Publish Product Live</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
