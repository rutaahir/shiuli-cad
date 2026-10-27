import React, { useState, useEffect, useMemo } from 'react';
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
  EyeOff,
  Sparkles, 
  Star,
  Layers,
  Upload,
  Link as LinkIcon,
  Search,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import { getOptimizedImageUrl, handleImgError } from '../../utils/imageHelper';

export const AdminPortfolioModule: React.FC = () => {
  const [items, setItems] = useState<PortfolioItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'published' | 'hidden'>('all');

  // Modal State for Edit/Create Portfolio Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PortfolioItemData> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
        is_featured: false,
        is_published: true,
        display_order: items.length + 1,
        primary_image: '',
      });
      setImageInputMode('upload');
    }
    setErrorMsg('');
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
        setEditingItem({ 
          ...editingItem, 
          primary_image: reader.result,
          primary_image_url: '' 
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title?.trim()) {
      setErrorMsg('Please enter a valid showcase title.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isBase64 = editingItem.primary_image?.startsWith('data:image');
      const payload: any = {
        title: editingItem.title.trim(),
        category_slug: editingItem.category_slug || (categories[0]?.slug || 'rings'),
        description: editingItem.description || '',
        is_custom_project: Boolean(editingItem.is_custom_project),
        is_ai_project: Boolean(editingItem.is_ai_project),
        is_featured: Boolean(editingItem.is_featured),
        is_published: Boolean(editingItem.is_published),
        display_order: Number(editingItem.display_order) || 0,
        primary_image: editingItem.primary_image || '',
        primary_image_url: isBase64 ? '' : (editingItem.primary_image || ''),
      };

      if (editingItem.id) {
        await api.updatePortfolioItem(editingItem.id, payload);
        setSuccessMsg(`Portfolio item "${editingItem.title}" updated successfully.`);
      } else {
        await api.createPortfolioItem(payload);
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

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this portfolio showcase item?')) {
      return;
    }
    setDeletingId(id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.deletePortfolioItem(id);
      setSuccessMsg('Portfolio showcase item deleted successfully.');
      if (isModalOpen && editingItem?.id === id) {
        setIsModalOpen(false);
        setEditingItem(null);
      }
      await loadPortfolio();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete portfolio item.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (item: PortfolioItemData) => {
    try {
      const updatedStatus = !item.is_published;
      await api.updatePortfolioItem(item.id, { is_published: updatedStatus });
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, is_published: updatedStatus } : p));
      setSuccessMsg(`Item "${item.title}" is now ${updatedStatus ? 'Published' : 'Hidden'}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update item status.');
    }
  };

  const handleToggleFeatured = async (item: PortfolioItemData) => {
    try {
      const updatedFeatured = !item.is_featured;
      await api.updatePortfolioItem(item.id, { is_featured: updatedFeatured });
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, is_featured: updatedFeatured } : p));
      setSuccessMsg(`Item "${item.title}" ${updatedFeatured ? 'marked as Featured Spotlight' : 'removed from Featured'}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update featured status.');
    }
  };

  // Filter items based on search and selected filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category_slug?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !selectedCategoryFilter || 
        item.category_slug === selectedCategoryFilter;

      const matchesStatus = 
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'published' && item.is_published) ||
        (selectedStatusFilter === 'hidden' && !item.is_published);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, selectedCategoryFilter, selectedStatusFilter]);

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1330]/5 text-[#0B1330] text-xs font-semibold uppercase tracking-wider mb-2">
            <Diamond className="w-3.5 h-3.5 text-[#D4AF37]" />
            Portfolio & Showcase Manager
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Portfolio Masterpiece Gallery</h2>
          <p className="text-slate-500 text-xs mt-1">
            SuperAdmin module to manage completed CAD showcases, primary renders, project descriptions, spotlight features, and custom vs AI tags.
          </p>
        </div>

        <button
          onClick={() => handleOpenEdit()}
          className="px-4 py-2.5 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" /> Add Portfolio Showcase
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search showcases by title or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0B1330]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-[#0B1330]"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id || c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-[#0B1330]"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </select>

          <span className="text-[11px] font-bold text-slate-400 px-2 py-1 bg-slate-100 rounded-lg">
            {filteredItems.length} {filteredItems.length === 1 ? 'Showcase' : 'Showcases'}
          </span>
        </div>
      </div>

      {/* Grid of Portfolio Items */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /> Loading portfolio showcases...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
          <Diamond className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">No showcases found</h4>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            {searchQuery || selectedCategoryFilter || selectedStatusFilter !== 'all'
              ? 'Try adjusting your filters or search keywords.'
              : 'Add your first bespoke CAD masterpiece or AI concept to the portfolio gallery.'}
          </p>
          <button
            onClick={() => handleOpenEdit()}
            className="mt-2 px-4 py-2 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Showcase
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#D4AF37]/60 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="relative h-48 bg-slate-900 overflow-hidden">
                <img 
                  src={getOptimizedImageUrl(item.primary_image, item.category_slug)} 
                  alt={item.title} 
                  onError={(e) => handleImgError(e, item.category_slug)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {item.is_custom_project && (
                    <span className="px-2 py-0.5 rounded-full bg-[#0B1330]/90 text-[#F5E7A3] text-[9px] font-bold backdrop-blur-sm shadow-sm">
                      Custom CAD
                    </span>
                  )}
                  {item.is_ai_project && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-900/90 text-purple-200 text-[9px] font-bold backdrop-blur-sm shadow-sm">
                      AI Concept
                    </span>
                  )}
                  {item.is_featured && (
                    <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/90 text-[#0B1330] text-[9px] font-extrabold flex items-center gap-1 backdrop-blur-sm shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-current" /> Spotlight
                    </span>
                  )}
                </div>

                {/* Quick Action Overlay Buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <button
                    onClick={() => handleToggleFeatured(item)}
                    title={item.is_featured ? 'Remove from Featured Spotlight' : 'Add to Featured Spotlight'}
                    className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                      item.is_featured 
                        ? 'bg-[#D4AF37] text-[#0B1330]' 
                        : 'bg-black/40 text-white/70 hover:text-white hover:bg-black/60'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${item.is_featured ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleTogglePublish(item)}
                    title={item.is_published ? 'Hide from public storefront' : 'Publish to storefront'}
                    className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                      item.is_published 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {item.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {item.category_name || item.category_slug || 'General'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID #{item.id}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base line-clamp-1">{item.title}</h3>
                <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                  {item.description || 'No description provided.'}
                </p>
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <button
                  onClick={() => handleTogglePublish(item)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors ${
                    item.is_published 
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                  title="Click to toggle publish status"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${item.is_published ? 'bg-emerald-600' : 'bg-slate-500'}`} />
                  {item.is_published ? 'Published' : 'Hidden'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={deletingId === item.id}
                    className="p-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    title="Delete Showcase"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-serif">
                  {editingItem.id ? `Edit Showcase: ${editingItem.title}` : 'Create Portfolio Showcase'}
                </h3>
                <p className="text-slate-400 text-xs">
                  {editingItem.id ? 'Modify image, descriptions, and tags.' : 'Publish a new CAD render or AI study.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
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
                  placeholder="e.g. Royal Filigree Emerald Solitaire Ring"
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
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

              {/* Primary Image Upload / URL Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Primary Render Image *</label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
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
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                        imageInputMode === 'url'
                          ? 'bg-[#0B1330] text-[#F5E7A3] shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" /> Paste URL
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
                      <p className="text-[10px] text-slate-400">Supports PNG, JPG, WEBP formats (Max 10MB)</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="https://... or /unsplash-img/... or /media/..."
                      value={editingItem.primary_image?.startsWith('data:image') ? '' : (editingItem.primary_image || '')}
                      onChange={(e) => setEditingItem({ 
                        ...editingItem, 
                        primary_image: e.target.value,
                        primary_image_url: e.target.value
                      })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                    />
                    <p className="text-[10px] text-slate-400">
                      Enter a direct image link or internal media path.
                    </p>
                  </div>
                )}

                {editingItem.primary_image && (
                  <div className="mt-3 relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 h-32 group flex items-center justify-center">
                    <img
                      src={getOptimizedImageUrl(editingItem.primary_image, editingItem.category_slug)}
                      alt="Preview"
                      onError={(e) => handleImgError(e, editingItem.category_slug)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#0B1330]/90 text-[#F5E7A3] text-[9px] font-bold backdrop-blur-sm">
                      {editingItem.primary_image.startsWith('data:image') ? 'Uploaded Local File' : 'External / CDN URL'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, primary_image: '', primary_image_url: '' })}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md cursor-pointer"
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
                  rows={3}
                  placeholder="Describe stone settings, pavilion angles, metal specifications, or generative parameters..."
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_custom_project"
                    checked={editingItem.is_custom_project ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, is_custom_project: e.target.checked })}
                    className="rounded border-slate-300 text-[#0B1330] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="is_custom_project" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Custom Client CAD
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_ai_project"
                    checked={editingItem.is_ai_project ?? false}
                    onChange={(e) => setEditingItem({ ...editingItem, is_ai_project: e.target.checked })}
                    className="rounded border-slate-300 text-[#0B1330] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="is_ai_project" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    AI Concept Study
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="portfolio_featured"
                    checked={editingItem.is_featured ?? false}
                    onChange={(e) => setEditingItem({ ...editingItem, is_featured: e.target.checked })}
                    className="rounded border-slate-300 text-[#0B1330] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="portfolio_featured" className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#D4AF37] fill-current" /> Spotlight Featured
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="portfolio_published"
                    checked={editingItem.is_published ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, is_published: e.target.checked })}
                    className="rounded border-slate-300 text-[#0B1330] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="portfolio_published" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Published to Public Gallery
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                {editingItem.id ? (
                  <button
                    type="button"
                    onClick={() => editingItem.id && handleDeleteItem(editingItem.id)}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Item
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> : 'Save Showcase'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortfolioModule;
