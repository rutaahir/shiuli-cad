import React, { useState, useEffect, useMemo } from 'react';
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
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { ProductModal, CategoryItem, DesignStyleItem } from '../common/ProductModal';

interface StaffMyDesignsTabProps {
  submissions?: StaffSubmission[];
  onUploadDesign?: (newSub: StaffSubmission) => void;
}

const getPageNumbers = (current: number, total: number): (number | '...')[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
};

export const StaffMyDesignsTab: React.FC<StaffMyDesignsTabProps> = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [designStyles, setDesignStyles] = useState<DesignStyleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

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

      // 3. Fetch ALL staff's products across all backend pages
      const BATCH_SIZE = 200;
      const firstPage = await api.getMyProducts({ page_size: String(BATCH_SIZE) });
      const totalCount: number = firstPage?.count ?? 0;
      const firstBatch = firstPage?.results ?? (Array.isArray(firstPage) ? firstPage : []);

      let allProducts = [...firstBatch];
      if (totalCount > firstBatch.length) {
        const totalPages = Math.ceil(totalCount / BATCH_SIZE);
        const pagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
          pagePromises.push(api.getMyProducts({ page: String(page), page_size: String(BATCH_SIZE) }));
        }
        const otherPages = await Promise.all(pagePromises);
        for (const pg of otherPages) {
          const pgData = pg?.results ?? (Array.isArray(pg) ? pg : []);
          allProducts = [...allProducts, ...pgData];
        }
      }
      setProducts(allProducts);
    } catch (err: any) {
      console.warn('Failed to fetch catalog data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

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
        ? `Design "${savedProduct?.title || 'Product'}" submitted! It is now pending admin verification before appearing on the public store.`
        : `Design "${savedProduct?.title || 'Product'}" updated! It has been submitted for admin re-verification.`
    );
    loadData();
  };

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesSearch =
        (prod.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.category_name && prod.category_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (prod.slug && prod.slug.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'approved'
          ? prod.status === 'approved'
          : statusFilter === 'rejected'
          ? prod.status === 'rejected'
          : prod.status === 'pending';

      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, statusFilter]);

  const totalItems = filteredProducts.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    if (pageSize === -1) return filteredProducts;
    const start = (activePage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, activePage, pageSize]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8D7B7] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-widest">
              Designer Workspace
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• My Uploaded CAD Designs</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#17243B] tracking-tight">
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
      <div className="bg-white rounded-2xl border border-[#E8D7B7] shadow-sm overflow-hidden space-y-4">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-[#E8D7B7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF9F5]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search products by title, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E8D7B7] text-xs text-[#17243B] focus:outline-none focus:border-[#C9A227]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[#6B7280] font-mono">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#E8D7B7] text-xs text-[#17243B] focus:outline-none font-medium"
            >
              <option value="all">All Designs ({products.length})</option>
              <option value="approved">Approved &amp; Live ({products.filter((p) => p.status === 'approved').length})</option>
              <option value="pending">Pending Admin Verification ({products.filter((p) => p.status === 'pending').length})</option>
              <option value="rejected">Rejected ({products.filter((p) => p.status === 'rejected').length})</option>
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
          <>
            {/* Products Table */}
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
              <tbody className="divide-y divide-[#E8D7B7] text-xs">
                {paginatedProducts.map((prod) => (
                  <tr key={prod.id || prod.slug} className="hover:bg-slate-50 transition-colors">
                    {/* Thumbnail & Title */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {prod.primary_image ? (
                          <img
                            src={prod.primary_image}
                            alt={prod.title}
                            className="w-12 h-12 rounded-xl object-cover border border-[#E8D7B7] shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-mono text-[10px]">
                            NO IMG
                          </div>
                        )}
                        <div>
                          <div className="font-serif font-bold text-[#17243B] text-sm">{prod.title}</div>
                          <div className="text-[10px] text-[#6B7280] font-mono">SKU: {prod.slug}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-4 font-medium text-[#17243B]">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono">
                        {prod.category_name || (typeof prod.category === 'object' ? prod.category?.name : 'Jewellery')}
                      </span>
                    </td>

                    {/* Pricing & Net Payout */}
                    <td className="p-4 font-mono text-xs">
                      <div className="font-bold text-[#17243B] flex items-center gap-1">
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
                      {prod.status !== 'approved' ? (
                        <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" title="Requires Admin Verification before going live">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" /> Awaiting Approval
                        </span>
                      ) : (
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
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                          prod.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : prod.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prod.status === 'approved'
                              ? 'bg-emerald-500'
                              : prod.status === 'rejected'
                              ? 'bg-rose-500'
                              : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        {prod.status === 'approved'
                          ? 'Approved & Live'
                          : prod.status === 'rejected'
                          ? 'Rejected'
                          : 'Pending Admin Verification'}
                      </span>
                      {prod.status === 'rejected' && prod.rejection_reason && (
                        <div className="text-[10px] text-rose-600 font-mono mt-1 max-w-[200px] truncate" title={prod.rejection_reason}>
                          Reason: {prod.rejection_reason}
                        </div>
                      )}
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
                      <div className="font-serif font-bold text-base text-[#17243B]">No Products Found</div>
                      <p className="text-xs text-slate-500 mt-1">
                        Try searching for another term or click "+ Add New Product" to publish a new jewellery CAD design.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredProducts.length > 0 && (
            <div className="p-4 border-t border-[#E8D7B7] bg-[#FAF9F5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#17243B]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[#6B7280]">
                  Showing <strong className="text-[#17243B] font-bold">{totalItems === 0 ? 0 : (activePage - 1) * (pageSize === -1 ? totalItems : pageSize) + 1}</strong> to{' '}
                  <strong className="text-[#17243B] font-bold">{pageSize === -1 ? totalItems : Math.min(activePage * pageSize, totalItems)}</strong> of{' '}
                  <strong className="text-[#17243B] font-bold">{totalItems}</strong> designs
                </span>
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-[#6B7280] font-mono text-[11px]">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#E8D7B7] text-xs font-mono font-medium focus:outline-none focus:border-[#C9A227] cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={-1}>All ({totalItems})</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={activePage === 1}
                    className="p-1.5 rounded-lg border border-[#E8D7B7] bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4 text-[#17243B]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={activePage === 1}
                    className="p-1.5 rounded-lg border border-[#E8D7B7] bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#17243B]" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {getPageNumbers(activePage, totalPages).map((pageNum, idx) =>
                      pageNum === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 font-mono text-xs">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${pageNum}`}
                          type="button"
                          onClick={() => setCurrentPage(pageNum as number)}
                          className={`min-w-7 h-7 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            activePage === pageNum
                              ? 'bg-[#09112B] text-[#F5E7A3] shadow-xs'
                              : 'bg-white text-[#17243B] border border-[#E8D7B7] hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={activePage === totalPages}
                    className="p-1.5 rounded-lg border border-[#E8D7B7] bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4 text-[#17243B]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={activePage === totalPages}
                    className="p-1.5 rounded-lg border border-[#E8D7B7] bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4 text-[#17243B]" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
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
