import React, { useState, useEffect } from 'react';
import { StaffSubmission } from '../../types';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  CheckCircle2,
  Layers,
  ExternalLink,
  Loader2,
  Eye,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { ProductModal, CategoryItem, DesignStyleItem } from '../common/ProductModal';

interface StaffMyDesignsTabProps {
  submissions?: StaffSubmission[];
  onUploadDesign?: (newSub: StaffSubmission) => void;
}

export const StaffMyDesignsTab: React.FC<StaffMyDesignsTabProps> = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [designStyles, setDesignStyles] = useState<DesignStyleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch categories
      const catRes = await api.getCategories();
      if (Array.isArray(catRes)) {
        setCategories(catRes);
      }

      // 2. Fetch design styles
      const stylesRes = await api.getDesignStyles();
      if (Array.isArray(stylesRes)) {
        setDesignStyles(stylesRes);
      }

      // 3. Fetch staff's own products isolated
      const prodRes = await api.getMyProducts();
      const resultsArray = Array.isArray(prodRes) ? prodRes : prodRes?.results || [];
      setProducts(resultsArray);
    } catch (err: any) {
      console.warn('Failed to fetch catalog data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (prod: any) => {
    try {
      const res = await api.toggleProductActive(prod.slug);
      showToast(
        res.is_active
          ? `Product "${prod.title}" is now ACTIVE & visible on store.`
          : `Product "${prod.title}" is now DISABLED & hidden from store.`
      );
      setProducts((prev) =>
        prev.map((p) => (p.slug === prod.slug ? { ...p, is_active: res.is_active } : p))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle product status.');
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (prod: any) => {
    try {
      // Fetch full details if needed
      const fullProd = await api.getProductBySlug(prod.slug).catch(() => prod);
      setEditingProduct(fullProd || prod);
      setIsModalOpen(true);
    } catch {
      setEditingProduct(prod);
      setIsModalOpen(true);
    }
  };

  const handleDeleteProduct = async (prod: any) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${prod.title}"?`)) return;
    try {
      await api.deleteProduct(prod.slug);
      showToast(`Product "${prod.title}" deleted.`);
      loadData();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message || 'Failed to delete product.');
    }
  };

  const handleModalSuccess = (savedProduct: any, mode: 'create' | 'edit') => {
    showToast(
      mode === 'create'
        ? `Product "${savedProduct?.title || 'Design'}" published live to public store!`
        : `Product "${savedProduct?.title || 'Design'}" updated successfully!`
    );
    loadData();
  };

  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      prod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.category_name && prod.category_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      prod.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'approved'
        ? prod.status === 'approved'
        : prod.status !== 'approved';

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full space-y-6">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#09112B] border border-[#D4AF37] text-white text-xs shadow-2xl animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-widest">
              Designer Workspace
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• My Uploaded CAD Designs</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            My Designs & Storefront Catalog
          </h1>
          <p className="text-xs text-[#6B7280] max-w-2xl font-light">
            Upload and manage your personal jewellery CAD models. Check real-time dynamic category commissions, monitor net earnings, and toggle designs active or disabled on the live storefront.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-gold-luxury px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-sm overflow-hidden space-y-4">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-[#E5E7EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF9F5]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search products by title, SKU, or category..."
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
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EF] text-xs text-[#1E2230] focus:outline-none font-medium"
            >
              <option value="all">All Products ({products.length})</option>
              <option value="approved">Live / Published ({products.filter((p) => p.status === 'approved').length})</option>
              <option value="pending">Draft / Pending ({products.filter((p) => p.status !== 'approved').length})</option>
            </select>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
            <span className="text-xs font-mono text-[#6B7280]">Loading live store catalog...</span>
          </div>
        ) : (
          /* Products Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#09112B] text-[#F5E7A3] text-[11px] font-mono uppercase tracking-wider">
                  <th className="p-4 font-medium">Design & Title</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Pricing & Payout</th>
                  <th className="p-4 font-medium">Store Visibility</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EF] text-xs">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id || prod.slug} className="hover:bg-slate-50 transition-colors">
                    {/* Thumbnail & Title */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {prod.primary_image ? (
                          <img
                            src={prod.primary_image}
                            alt={prod.title}
                            className="w-12 h-12 rounded-xl object-cover border border-[#E5E7EF] shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-mono text-[10px]">
                            NO IMG
                          </div>
                        )}
                        <div>
                          <div className="font-serif font-bold text-[#1E2230] text-sm">{prod.title}</div>
                          <div className="text-[10px] text-[#6B7280] font-mono">SKU: {prod.slug}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-4 font-medium text-[#1E2230]">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono">
                        {prod.category_name || (typeof prod.category === 'object' ? prod.category?.name : 'Jewellery')}
                      </span>
                    </td>

                    {/* Pricing & Net Payout */}
                    <td className="p-4 font-mono text-xs">
                      <div className="font-bold text-[#1E2230] flex items-center gap-1">
                        <span>${prod.price}</span>
                        {prod.compare_at_price && (
                          <span className="text-[10px] text-[#9CA3AF] line-through">
                            ${prod.compare_at_price}
                          </span>
                        )}
                      </div>
                      {prod.staff_price != null ? (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Net: ${prod.staff_price} ({100 - (Number(prod.commission_rate) || 20)}%)
                        </div>
                      ) : prod.commission_rate != null ? (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Fee: {prod.commission_rate}%
                        </div>
                      ) : null}
                    </td>

                    {/* Store Visibility Toggle */}
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(prod)}
                        className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          prod.is_active !== false
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                        }`}
                        title={prod.is_active !== false ? 'Click to Disable / Hide from store' : 'Click to Enable / Show on store'}
                      >
                        <span className={`w-2 h-2 rounded-full ${prod.is_active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{prod.is_active !== false ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>

                    {/* Status */}
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
                        {prod.status === 'approved' ? 'Approved' : 'Draft / Review'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-2 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                        title="Edit Product Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(prod)}
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors inline-flex items-center text-[11px] cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-[#6B7280]">
                      <Sparkles className="w-8 h-8 text-[#C9A227] mx-auto opacity-50 mb-2" />
                      <div className="font-serif font-bold text-base text-[#1E2230]">No Products Found</div>
                      <p className="text-xs text-slate-500 mt-1">
                        Try searching for another term or click "+ Add New Product" to publish a new jewellery CAD design.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unified Add / Edit Product Stepper Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        product={editingProduct}
        categories={categories}
        designStyles={designStyles}
        onNewStyleCreated={(newStyle) => setDesignStyles((prev) => [...prev, newStyle])}
      />
    </div>
  );
};
