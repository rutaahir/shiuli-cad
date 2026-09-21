import React, { useState, useEffect } from 'react';
import { StaffSubmission } from '../../types';
import { Upload, Sparkles, Clock, Plus, Award, Loader2, AlertCircle, ImageIcon, Check, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

interface StaffMyDesignsTabProps {
  submissions: StaffSubmission[];
  onUploadDesign: (newSub: StaffSubmission) => void;
}

export const StaffMyDesignsTab: React.FC<StaffMyDesignsTabProps> = ({
  submissions,
  onUploadDesign,
}) => {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiSubmissions, setApiSubmissions] = useState<(StaffSubmission & { slug?: string })[]>([]);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: number; name: string }>>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(1);
  const [suggestedPrice, setSuggestedPrice] = useState('25000');
  const [metalWeight, setMetalWeight] = useState('14.5');
  const [diamondCount, setDiamondCount] = useState('36');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Fetch Categories and Catalog Submissions from API
  const fetchCatalogSubmissions = async () => {
    setLoading(true);
    try {
      // 1. Fetch categories
      const catRes = await api.getCategories(true);
      if (Array.isArray(catRes) && catRes.length > 0) {
        setCategoriesList(catRes);
        setSelectedCategoryId(catRes[0].id);
      }

      const combinedSubmissions: (StaffSubmission & { slug?: string; isBespoke?: boolean })[] = [];

      // 2. Fetch catalog store products (original CAD submissions)
      try {
        const res = await api.getProducts();
        const resultsArray = Array.isArray(res) ? res : res?.results || [];
        resultsArray.forEach((p: any) => {
          combinedSubmissions.push({
            id: p.slug || `SUB-${p.id}`,
            slug: p.slug,
            title: p.title,
            category: p.category_name || p.category?.name || 'Jewellery Design',
            submittedAt: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : 'Recently',
            thumbnail: p.primary_image || p.images?.[0]?.image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
            suggestedPrice: parseFloat(p.price || '0'),
            status: p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending',
            fileFormats: ['3DM', 'STL', 'Render'],
            specs: {
              metalWeight18k: p.metal_weight_grams ? `${p.metal_weight_grams}g` : (p.specs?.metal_weight_18k || '14.5g'),
              diamondCount: p.stone_count || p.specs?.diamond_count || 36,
              dimensions: p.specs?.dimensions || 'Standard',
            },
            isBespoke: false,
          });
        });
      } catch (prodErr) {
        console.warn('Could not fetch catalog products from API:', prodErr);
      }

      // Always update state (even if empty, so 0 items shows 0 items with NO dummy fallback)
      setApiSubmissions(combinedSubmissions);
    } catch (e) {
      console.warn('Could not fetch submissions from API:', e);
      setApiSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear any stale local storage mock data on mount
    try {
      localStorage.removeItem('shiuli_staff_submissions');
    } catch {}
    fetchCatalogSubmissions();
  }, []);

  const displayList = apiSubmissions;

  const handleDeleteSubmission = async (slugOrId: string) => {
    if (!confirm('Are you sure you want to permanently delete this CAD submission?')) return;
    try {
      await api.deleteProduct(slugOrId);
      setToastMsg('Submission deleted successfully');
      fetchCatalogSubmissions();
    } catch (err: any) {
      console.error('Failed to delete submission:', err);
      alert(err?.message || 'Failed to delete submission');
    }
  };

  const handleClearAllSubmissions = async () => {
    if (!confirm('Are you sure you want to remove ALL submissions and start completely fresh?')) return;
    setLoading(true);
    try {
      for (const item of apiSubmissions) {
        const slug = item.slug || item.id;
        try {
          await api.deleteProduct(slug);
        } catch (e) {
          console.warn('Delete item notice:', e);
        }
      }
      setToastMsg('All submissions removed successfully. You can now start fresh.');
      fetchCatalogSubmissions();
    } catch (err: any) {
      console.error('Clear all error:', err);
      alert(err?.message || 'Failed to clear all submissions');
    } finally {
      setLoading(false);
    }
  };

  const filtered = displayList.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setUploading(true);
    setToastMsg(null);
    try {
      // 1. Create product row in Django DB
      const newProd = await api.createProduct({
        title,
        category: selectedCategoryId,
        price: parseFloat(suggestedPrice) || 25000,
        description: `Original CAD design submission by craftsman. Metal Weight: ${metalWeight}g, Diamonds: ${diamondCount} Pcs.`,
        metal_weight_grams: parseFloat(metalWeight) || 14.5,
        stone_count: parseInt(diamondCount) || 36,
      });

      // 2. Upload primary image thumbnail if selected
      if (imageFile && newProd?.slug) {
        try {
          await api.uploadProductImage(newProd.slug, imageFile, true);
        } catch (imgErr) {
          console.warn('Image upload error:', imgErr);
        }
      }

      setToastMsg(`Design "${title}" successfully submitted to Super Admin review queue!`);
      setTimeout(() => setToastMsg(null), 4000);
      await fetchCatalogSubmissions();
    } catch (err: any) {
      console.warn('Product submission API fallback:', err);
      const categoryObj = categoriesList.find((c) => c.id === selectedCategoryId);
      const fallbackSub: StaffSubmission = {
        id: `SUB-${Date.now().toString().slice(-4)}`,
        title,
        category: categoryObj?.name || 'Jewellery Design',
        submittedAt: new Date().toISOString().split('T')[0],
        thumbnail: imagePreviewUrl || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
        suggestedPrice: parseFloat(suggestedPrice) || 25000,
        status: 'pending',
        fileFormats: ['3DM', 'STL', 'Render'],
        specs: {
          metalWeight18k: `${metalWeight}g`,
          diamondCount: parseInt(diamondCount) || 36,
          dimensions: 'Standard',
        },
      };
      onUploadDesign(fallbackSub);
    } finally {
      setUploading(false);
      setShowModal(false);
      setTitle('');
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-widest">
              Ready Designs Catalog
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• Craftsman Portfolio</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            My Independent CAD Submissions
          </h1>
          <p className="text-xs text-[#6B7280] max-w-2xl font-light">
            Upload original CAD models for inclusion in the public <strong className="text-[#1E2230] font-semibold">Ready Designs Store</strong>. Once approved by Super Admin, you earn royalties on every license download.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {displayList.length > 0 && (
            <button
              onClick={handleClearAllSubmissions}
              className="px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Submissions</span>
            </button>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="btn-gold-luxury px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Upload Original CAD Design</span>
          </button>
        </div>
      </div>

      {/* Distinction Tip Banner */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-xs flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
        <div>
          <span className="font-bold">Catalog vs. Bespoke Orders:</span> This page hosts your original independent CAD models for the public store catalog. Client bespoke commissions (e.g., ORD orders) are managed in <strong className="text-indigo-900 font-semibold">My Workbench</strong> and archived under <strong className="text-indigo-900 font-semibold">Commissions Log</strong> once approved.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EF] pb-3">
        {(['all', 'approved', 'pending', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              filter === tab
                ? 'bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37] shadow-sm'
                : 'text-[#6B7280] hover:bg-white hover:text-[#1E2230]'
            }`}
          >
            {tab} Submissions ({tab === 'all' ? displayList.length : displayList.filter((s) => s.status === tab).length})
          </button>
        ))}
      </div>

      {/* Submissions Grid */}
      {loading ? (
        <div className="w-full py-16 bg-white rounded-2xl border border-[#E5E7EF] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
          <span className="text-xs font-mono text-[#6B7280]">Loading catalog submissions from backend database...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#E5E7EF] space-y-3">
          <Sparkles className="w-8 h-8 text-[#C9A227] mx-auto opacity-50" />
          <h3 className="font-serif text-lg font-bold text-[#1E2230]">No Submissions Found</h3>
          <p className="text-xs text-[#6B7280]">Upload your original CAD designs to earn royalties upon store approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border-l-4 border-l-[#C9A227] border border-[#E5E7EF] hover:border-[#C9A227] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E5E7EF] bg-slate-900">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  <div className="absolute top-2 left-2">
                    {item.status === 'approved' && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-900/90 text-emerald-200 border border-emerald-400/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md">
                        <Award className="w-3 h-3 text-emerald-300" /> Approved
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#09112B]/90 text-[#F5E7A3] border border-[#D4AF37]/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md">
                        <Clock className="w-3 h-3 text-[#D4AF37]" /> Admin Review
                      </span>
                    )}
                    {item.status === 'rejected' && (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-900/90 text-rose-200 border border-rose-400/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md">
                        <AlertCircle className="w-3 h-3 text-rose-300" /> Rejected
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-[#D4AF37]/40 text-[#F5E7A3] font-mono font-bold text-xs">
                    {item.suggestedPrice > 0 ? `₹${item.suggestedPrice.toLocaleString('en-IN')}` : 'Bespoke Order'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-mono">
                    <span>{item.category}</span>
                    <span>Submitted {item.submittedAt}</span>
                  </div>
                  <h3 className="font-serif font-bold text-[#1E2230] text-lg mt-1">
                    {item.title}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EF] font-mono text-[#1E2230]">
                  <div>
                    <span className="text-[#6B7280] block text-[9px] uppercase font-semibold">18K Weight</span>
                    {item.specs.metalWeight18k}
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[9px] uppercase font-semibold">Diamonds</span>
                    {item.specs.diamondCount} Pcs
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5E7EF] flex items-center justify-between text-[10px] text-[#6B7280]">
                <div className="flex items-center gap-1.5 font-mono">
                  <span>Formats:</span>
                  <div className="flex items-center gap-1 font-bold">
                    {item.fileFormats.map((f) => (
                      <span key={f} className="px-1.5 py-0.5 rounded bg-slate-100 text-[#1E2230] border border-slate-200">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSubmission((item as any).slug || item.id);
                  }}
                  className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 font-semibold flex items-center gap-1 text-[11px] transition-all cursor-pointer shadow-xs"
                  title="Permanently delete this submission"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-[#E5E7EF] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#C9A227]" />
                <h3 className="text-lg font-serif font-bold text-[#1E2230]">
                  Upload CAD Design to Store
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#1E2230] mb-1 font-semibold">Design Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Victorian Emerald Filigree Pendant"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-[#E5E7EF] text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              {/* Render Preview Image Upload Field */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] space-y-2">
                <label className="block text-[#1E2230] font-semibold">Primary Render Preview Image</label>
                <div className="flex items-center gap-3">
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-[#C9A227] shadow-sm shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#09112B] text-[#F5E7A3] font-bold text-[11px]">
                      <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                      <span>Select Render Image</span>
                      <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-500">JPG, PNG, WebP up to 10MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#1E2230] mb-1 font-semibold">Category</label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-[#E5E7EF] text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#1E2230] mb-1 font-semibold">Suggested Price (₹)</label>
                  <input
                    type="number"
                    value={suggestedPrice}
                    onChange={(e) => setSuggestedPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-[#E5E7EF] text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#1E2230] mb-1 font-semibold">18K Metal Weight (grams)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={metalWeight}
                    onChange={(e) => setMetalWeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-[#E5E7EF] text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
                  />
                </div>
                <div>
                  <label className="block text-[#1E2230] mb-1 font-semibold">Diamond Count (Pcs)</label>
                  <input
                    type="number"
                    value={diamondCount}
                    onChange={(e) => setDiamondCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-[#E5E7EF] text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EF]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-[#1E2230] font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-gold-luxury px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                      <span>Saving DB...</span>
                    </>
                  ) : (
                    <span>Submit for Admin Review</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
