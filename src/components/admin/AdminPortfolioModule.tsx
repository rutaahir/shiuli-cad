import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PortfolioItemData } from '../../types';
import { 
  Diamond, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  Eye, 
  Sparkles, 
  Layers,
  Upload,
  Link
} from 'lucide-react';

export const AdminPortfolioModule: React.FC = () => {
  const [items, setItems] = useState<PortfolioItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  // Modal State for Edit/Create Portfolio Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PortfolioItemData> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');

  const loadPortfolio = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [data, cats] = await Promise.all([
        api.getPortfolioItems(),
        api.getCategories(true),
      ]);
      setItems(data || []);
      setCategories(cats || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load portfolio items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const handleOpenEdit = (item?: PortfolioItemData) => {
    if (item) {
      setEditingItem({ ...item });
      setImageInputMode(item.primary_image && !item.primary_image.startsWith('data:image') ? 'url' : 'upload');
    } else {
      setEditingItem({
        title: 'New Masterpiece Showcase',
        description: 'Detailed description of completed custom CAD design or AI concept.',
        category_slug: categories[0]?.slug || 'rings',
        is_custom_project: true,
        is_ai_project: false,
        is_featured: true,
        is_published: true,
        display_order: items.length + 1,
      });
      setImageInputMode('upload');
    }
    setIsModalOpen(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (editingItem && typeof reader.result === 'string') {
        setEditingItem({ ...editingItem, primary_image: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title) return;
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editingItem.id) {
        await api.request(`/portfolio/items/${editingItem.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(editingItem),
        });
        setSuccessMsg(`Portfolio item "${editingItem.title}" updated successfully.`);
      } else {
        await api.request('/portfolio/items/', {
          method: 'POST',
          body: JSON.stringify(editingItem),
        });
        setSuccessMsg(`New portfolio item "${editingItem.title}" created successfully.`);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await loadPortfolio();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save portfolio item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1330]/5 text-[#0B1330] text-xs font-semibold uppercase tracking-wider mb-2">
            <Diamond className="w-3.5 h-3.5 text-[#D4AF37]" />
            Portfolio & Showcase Manager
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Portfolio Masterpiece Gallery</h2>
          <p className="text-slate-500 text-xs mt-1">
            SuperAdmin module to manage completed CAD showcases, primary renders, project descriptions, and custom vs AI tags.
          </p>
        </div>

        <button
          onClick={() => handleOpenEdit()}
          className="px-4 py-2.5 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" /> Add Portfolio Showcase
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid of Portfolio Items */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /> Loading portfolio items...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#D4AF37]/50 transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="relative h-48 bg-slate-900 overflow-hidden">
                {item.primary_image ? (
                  <img src={item.primary_image} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Diamond className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  {item.is_custom_project && (
                    <span className="px-2 py-0.5 rounded-full bg-[#0B1330] text-[#F5E7A3] text-[9px] font-bold">
                      Custom CAD
                    </span>
                  )}
                  {item.is_ai_project && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 text-[9px] font-bold">
                      AI Concept
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-2 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {item.category_name || item.category_slug || 'General'}
                </span>
                <h3 className="font-bold text-slate-900 text-base">{item.title}</h3>
                <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{item.description}</p>
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.is_published ? 'Published' : 'Hidden'}
                </span>
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit Showcase
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                {editingItem.id ? `Edit Showcase: ${editingItem.title}` : 'Create Portfolio Showcase'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Slug</label>
                <select
                  value={editingItem.category_slug || (categories[0]?.slug || 'rings')}
                  onChange={(e) => setEditingItem({ ...editingItem, category_slug: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                >
                  {categories.length > 0 ? (
                    categories.map((c: any) => (
                      <option key={c.id || c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="rings">Rings</option>
                      <option value="earrings">Earrings</option>
                      <option value="pendants">Pendants</option>
                      <option value="necklaces">Necklaces</option>
                      <option value="bracelets">Bracelets</option>
                      <option value="bangles">Bangles</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Primary Render Image</label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                        imageInputMode === 'upload'
                          ? 'bg-[#0B1330] text-[#F5E7A3] shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3 h-3" /> Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                        imageInputMode === 'url'
                          ? 'bg-[#0B1330] text-[#F5E7A3] shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Link className="w-3 h-3" /> Paste Image URL
                    </button>
                  </div>
                </div>

                {imageInputMode === 'upload' ? (
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-[#0B1330] rounded-2xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <div className="text-xs font-bold text-slate-700">Click or drag image file here to upload</div>
                      <p className="text-[10px] text-slate-400">Supports PNG, JPG, WEBP formats</p>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="https://..."
                    value={editingItem.primary_image || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, primary_image: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                )}

                {editingItem.primary_image && (
                  <div className="mt-3 relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 h-28 group flex items-center justify-center">
                    <img
                      src={editingItem.primary_image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#0B1330]/90 text-[#F5E7A3] text-[9px] font-bold backdrop-blur-sm">
                      {editingItem.primary_image.startsWith('data:image') ? 'Uploaded File' : 'Image URL'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, primary_image: '' })}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md"
                      title="Remove Image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_custom_project"
                    checked={editingItem.is_custom_project ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, is_custom_project: e.target.checked })}
                    className="rounded border-slate-300 text-[#0B1330] focus:ring-0"
                  />
                  <label htmlFor="is_custom_project" className="text-xs font-semibold text-slate-700">
                    Custom Client CAD
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_ai_project"
                    checked={editingItem.is_ai_project ?? false}
                    onChange={(e) => setEditingItem({ ...editingItem, is_ai_project: e.target.checked })}
                    className="rounded border-slate-300 text-[#0B1330] focus:ring-0"
                  />
                  <label htmlFor="is_ai_project" className="text-xs font-semibold text-slate-700">
                    AI Concept Project
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="portfolio_published"
                  checked={editingItem.is_published ?? true}
                  onChange={(e) => setEditingItem({ ...editingItem, is_published: e.target.checked })}
                  className="rounded border-slate-300 text-[#0B1330] focus:ring-0"
                />
                <label htmlFor="portfolio_published" className="text-xs font-semibold text-slate-700">
                  Publish to public portfolio gallery
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> : 'Save Showcase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortfolioModule;
