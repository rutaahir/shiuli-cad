import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ServicePageData, ServicePageFeatureData, ServicePageGalleryImageData } from '../../types';
import { 
  Sparkles, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Globe, 
  Eye, 
  Layers,
  Tag,
  Upload,
  Link,
  ImageIcon,
  ListPlus
} from 'lucide-react';

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const AdminServicesModule: React.FC = () => {
  const [pages, setPages] = useState<ServicePageData[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalErrorMsg, setModalErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeSectionFilter, setActiveSectionFilter] = useState<'all' | 'cad_service' | 'about'>('all');

  // Modal State for Edit/Create Page
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Partial<ServicePageData> | null>(null);
  const [originalSlug, setOriginalSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image Upload / URL Mode
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [pagesRes, catsRes] = await Promise.all([
        api.getServicePages(),
        api.getCategories(true),
      ]);

      if (Array.isArray(pagesRes)) {
        setPages(pagesRes);
      } else if (pagesRes && Array.isArray((pagesRes as any).results)) {
        setPages((pagesRes as any).results);
      } else {
        setPages([]);
      }

      setCategories(Array.isArray(catsRes) ? catsRes : []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load CMS service pages.');
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const safePages = Array.isArray(pages) ? pages : [];

  const handleOpenEdit = (page?: ServicePageData) => {
    setModalErrorMsg('');
    if (page) {
      setOriginalSlug(page.slug);
      setIsSlugManuallyEdited(true);
      setEditingPage({
        ...page,
        features: page.features ? [...page.features] : [],
        gallery: page.gallery ? [...page.gallery] : [],
      });
      setImageInputMode(page.hero_image && !page.hero_image.startsWith('data:image') ? 'url' : 'upload');
    } else {
      setOriginalSlug('');
      setIsSlugManuallyEdited(false);
      setImageInputMode('upload');
      setEditingPage({
        slug: '',
        section: 'cad_service',
        title: '',
        subtitle: 'Professional 3D CAD Specialization',
        intro_text: 'Detailed 3D CAD engineering calibrated for exact specs and foundry shrinkage factors.',
        hero_image: '',
        starting_price_usd: '$25 - $45',
        starting_price_inr: '₹2,000 - ₹3,500',
        cta_label: 'Start Your Design',
        cta_target: 'custom_design',
        is_published: true,
        display_order: safePages.length + 1,
        linked_category: undefined,
        features: [
          { title: '±0.02mm Micron Tolerances', description: 'Calibrated prong heights and wall thickness.', icon: 'Sparkles', display_order: 1 },
          { title: 'Watertight Solid Mesh', description: 'Tested across Formlabs & EnvisionTEC wax printers.', icon: 'ShieldCheck', display_order: 2 },
          { title: '48-Hour Rapid Delivery', description: 'Rapid turnaround with layered .3DM and .STL files.', icon: 'Clock', display_order: 3 },
        ],
        gallery: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleTitleChange = (newTitle: string) => {
    if (!editingPage) return;
    if (!isSlugManuallyEdited) {
      setEditingPage({
        ...editingPage,
        title: newTitle,
        slug: slugify(newTitle),
      });
    } else {
      setEditingPage({
        ...editingPage,
        title: newTitle,
      });
    }
  };

  const handleSlugChange = (newSlug: string) => {
    if (!editingPage) return;
    setIsSlugManuallyEdited(true);
    setEditingPage({
      ...editingPage,
      slug: newSlug,
    });
  };

  const handleHeroFileSelect = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (editingPage && e.target?.result) {
        setEditingPage({
          ...editingPage,
          hero_image: e.target.result as string,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Feature handling
  const handleAddFeature = () => {
    if (!editingPage) return;
    const currentFeatures = editingPage.features || [];
    setEditingPage({
      ...editingPage,
      features: [
        ...currentFeatures,
        {
          title: '',
          description: '',
          icon: 'Sparkles',
          display_order: currentFeatures.length + 1,
        },
      ],
    });
  };

  const handleUpdateFeature = (index: number, field: keyof ServicePageFeatureData, value: any) => {
    if (!editingPage || !editingPage.features) return;
    const updated = [...editingPage.features];
    updated[index] = { ...updated[index], [field]: value };
    setEditingPage({ ...editingPage, features: updated });
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingPage || !editingPage.features) return;
    const updated = editingPage.features.filter((_, i) => i !== index);
    setEditingPage({ ...editingPage, features: updated });
  };

  // Gallery image handling
  const handleAddGalleryImage = () => {
    if (!editingPage) return;
    const currentGallery = editingPage.gallery || [];
    setEditingPage({
      ...editingPage,
      gallery: [
        ...currentGallery,
        {
          id: Date.now(),
          image: '',
          caption: '',
          display_order: currentGallery.length + 1,
        },
      ],
    });
  };

  const handleUpdateGalleryImage = (index: number, field: keyof ServicePageGalleryImageData, value: any) => {
    if (!editingPage || !editingPage.gallery) return;
    const updated = [...editingPage.gallery];
    updated[index] = { ...updated[index], [field]: value };
    setEditingPage({ ...editingPage, gallery: updated });
  };

  const handleGalleryFileSelect = (index: number, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        handleUpdateGalleryImage(index, 'image', e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveGalleryImage = (index: number) => {
    if (!editingPage || !editingPage.gallery) return;
    const updated = editingPage.gallery.filter((_, i) => i !== index);
    setEditingPage({ ...editingPage, gallery: updated });
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage || !editingPage.title || !editingPage.slug) {
      setModalErrorMsg('Page Title and URL Slug are required.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    setModalErrorMsg('');

    try {
      await api.ensureAdminToken();
      if (editingPage.id) {
        const targetSlug = originalSlug || editingPage.slug;
        await api.request(`/services/pages/${targetSlug}/`, {
          method: 'PATCH',
          body: JSON.stringify(editingPage),
        });
        setSuccessMsg(`Service page "${editingPage.title}" updated successfully.`);
      } else {
        await api.request('/services/pages/', {
          method: 'POST',
          body: JSON.stringify(editingPage),
        });
        setSuccessMsg(`New service page "${editingPage.title}" created successfully.`);
      }
      setIsModalOpen(false);
      setEditingPage(null);
      await loadData();
    } catch (err: any) {
      console.error('Error saving CMS page:', err);
      setModalErrorMsg(err.message || 'Failed to save service page.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePage = async (slug: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.ensureAdminToken();
      await api.request(`/services/pages/${slug}/`, { method: 'DELETE' });
      setSuccessMsg(`Deleted CMS page "${title}".`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete service page.');
    }
  };

  const filteredPages = safePages.filter((p) => {
    if (activeSectionFilter === 'all') return true;
    return p.section === activeSectionFilter;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1330]/5 text-[#0B1330] text-xs font-semibold uppercase tracking-wider mb-2">
            <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
            CMS Page Manager
          </div>
          <h2 className="text-2xl font-bold text-slate-900">CAD Services & About Us CMS Pages</h2>
          <p className="text-slate-500 text-xs mt-1">
            SuperAdmin CMS dashboard to manage 100% of website service landing pages, photos, pricing, category links & features.
          </p>
        </div>

        <button
          onClick={() => handleOpenEdit()}
          className="px-4 py-2.5 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" /> Create New CMS Page
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSectionFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSectionFilter === 'all'
              ? 'bg-[#0B1330] text-[#F5E7A3]'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All CMS Pages ({safePages.length})
        </button>
        <button
          onClick={() => setActiveSectionFilter('cad_service')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSectionFilter === 'cad_service'
              ? 'bg-[#0B1330] text-[#F5E7A3]'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          CAD Services ({safePages.filter((p) => p.section === 'cad_service').length})
        </button>
        <button
          onClick={() => setActiveSectionFilter('about')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSectionFilter === 'about'
              ? 'bg-[#0B1330] text-[#F5E7A3]'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          About Us Sections ({safePages.filter((p) => p.section === 'about').length})
        </button>
      </div>

      {/* Pages Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">
          <Loader2 className="w-6 h-6 animate-spin text-[#0B1330] mx-auto mb-2" />
          Fetching CMS pages from database...
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          No CMS service pages found for this section.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Order</th>
                <th className="p-4">Photo</th>
                <th className="p-4">Page Title & Slug</th>
                <th className="p-4">Section / Category</th>
                <th className="p-4">Prices (USD / INR)</th>
                <th className="p-4">CTA Label</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPages.map((page) => (
                <tr key={page.id || page.slug} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-400">#{page.display_order}</td>
                  <td className="p-4">
                    {(() => {
                      let rawUrl = page.hero_image || '';
                      if (rawUrl.startsWith('/media/unsplash-img/')) {
                        rawUrl = '/unsplash-img/' + rawUrl.split('/media/unsplash-img/')[1];
                      }
                      const fallback = '/unsplash-img/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop';
                      const finalUrl = rawUrl || fallback;
                      return (
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm shrink-0 group relative">
                          <img 
                            src={finalUrl} 
                            alt={page.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = fallback;
                            }}
                          />
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{page.title}</div>
                    <div className="text-[11px] font-mono text-slate-400">/cad-services/{page.slug}</div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold block w-max">
                        {page.section === 'cad_service' ? 'CAD Service' : 'About Section'}
                      </span>
                      {page.linked_category_name && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#0B1330]/5 text-[#0B1330] text-[10px] font-semibold block w-max">
                          Category: {page.linked_category_name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-700 font-semibold">
                    {page.starting_price_usd || '$25 - $45'} / {page.starting_price_inr || '₹2,000 - ₹3,500'}
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{page.cta_label || 'Start Design'}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        page.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {page.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(page)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#0B1330] hover:text-[#F5E7A3] text-slate-700 transition-colors cursor-pointer"
                      title="Edit CMS Page"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePage(page.slug, page.title)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 transition-colors cursor-pointer"
                      title="Delete CMS Page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && editingPage && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                {editingPage.id ? `Edit CMS Page: ${editingPage.title}` : 'Create New CMS Page'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalErrorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePage} className="space-y-5">
              {/* Basic Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Page Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ring CAD Design"
                    value={editingPage.title || ''}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug * (Auto-filled)</label>
                  <input
                    type="text"
                    required
                    placeholder="ring-cad-design"
                    value={editingPage.slug || ''}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
              </div>

              {/* Section, Linked Category, Display Order */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Section *</label>
                  <select
                    value={editingPage.section || 'cad_service'}
                    onChange={(e) => setEditingPage({ ...editingPage, section: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  >
                    <option value="cad_service">CAD Service</option>
                    <option value="about">About Us Section</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Linked Category</label>
                  <select
                    value={editingPage.linked_category || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, linked_category: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  >
                    <option value="">-- None (General Service) --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.slug})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={editingPage.display_order || 1}
                    onChange={(e) => setEditingPage({ ...editingPage, display_order: parseInt(e.target.value) || 1 })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
              </div>

              {/* HERO PHOTO UPLOAD / URL SECTION */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                    Service Hero Image / Photo *
                  </label>
                  <div className="flex bg-slate-200 p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-3 py-1 rounded-md transition-all ${
                        imageInputMode === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      <Upload className="w-3 h-3 inline mr-1" /> File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-3 py-1 rounded-md transition-all ${
                        imageInputMode === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      <Link className="w-3 h-3 inline mr-1" /> Image URL
                    </button>
                  </div>
                </div>

                {imageInputMode === 'upload' ? (
                  <div className="border-2 border-dashed border-slate-300 hover:border-[#0B1330] rounded-xl p-4 text-center bg-white transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleHeroFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="hero-image-file-input"
                    />
                    <label htmlFor="hero-image-file-input" className="cursor-pointer block">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs font-semibold text-slate-700">
                        Click to upload hero image file from computer
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Supports PNG, JPG, WEBP or Base64 (max 5MB)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="e.g. /unsplash-img/photo-1605100804763-247f67b3557e... or https://..."
                      value={editingPage.hero_image || ''}
                      onChange={(e) => setEditingPage({ ...editingPage, hero_image: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#0B1330]"
                    />
                  </div>
                )}

                {/* Hero Preview Thumbnail */}
                {editingPage.hero_image && (
                  <div className="relative w-full h-36 bg-slate-900 rounded-xl overflow-hidden border border-slate-300">
                    <img
                      src={editingPage.hero_image}
                      alt="Hero Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingPage({ ...editingPage, hero_image: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md cursor-pointer"
                      title="Remove Image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-950/70 text-[#F5E7A3] text-[10px] font-mono rounded">
                      Live Hero Photo Preview
                    </span>
                  </div>
                )}
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Solitaires, Halos, Eternity Bands & Cocktail Ring 3D Models"
                  value={editingPage.subtitle || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, subtitle: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              {/* Intro Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Intro Description Text</label>
                <textarea
                  rows={3}
                  placeholder="Detailed 3D CAD engineering calibrated for exact finger sizes, stone seats, and foundry shrinkage factors..."
                  value={editingPage.intro_text || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, intro_text: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              {/* Starting Prices */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Starting Price (USD)</label>
                  <input
                    type="text"
                    placeholder="$25 - $45"
                    value={editingPage.starting_price_usd || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, starting_price_usd: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Starting Price (INR)</label>
                  <input
                    type="text"
                    placeholder="₹2,000 - ₹3,500"
                    value={editingPage.starting_price_inr || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, starting_price_inr: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
              </div>

              {/* CTA Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CTA Button Label</label>
                  <input
                    type="text"
                    placeholder="Start Your Design"
                    value={editingPage.cta_label || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, cta_label: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CTA Action Target</label>
                  <select
                    value={editingPage.cta_target || 'custom_design'}
                    onChange={(e) => setEditingPage({ ...editingPage, cta_target: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  >
                    <option value="custom_design">Custom Design Wizard</option>
                    <option value="collections">CAD Files Catalog</option>
                    <option value="file_editing">File Editing Studio</option>
                    <option value="contact">Contact Atelier</option>
                  </select>
                </div>
              </div>

              {/* SERVICE KEY HIGHLIGHTS / FEATURES EDITOR */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ListPlus className="w-4 h-4 text-[#D4AF37]" />
                    Key Highlights & Features
                  </span>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Highlight
                  </button>
                </div>

                {(!editingPage.features || editingPage.features.length === 0) ? (
                  <p className="text-[11px] text-slate-400 italic">No key highlights added yet. Click "+ Add Highlight" to add service specifications.</p>
                ) : (
                  <div className="space-y-3">
                    {editingPage.features.map((feat, fIdx) => (
                      <div key={fIdx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            Highlight #{fIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(fIdx)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Highlight Title (e.g. ±0.02mm Tolerances)"
                            value={feat.title || ''}
                            onChange={(e) => handleUpdateFeature(fIdx, 'title', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                          />
                          <input
                            type="text"
                            placeholder="Icon Name (e.g. Sparkles, ShieldCheck, Gem, Clock)"
                            value={feat.icon || ''}
                            onChange={(e) => handleUpdateFeature(fIdx, 'icon', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0B1330]"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Short description..."
                          value={feat.description || ''}
                          onChange={(e) => handleUpdateFeature(fIdx, 'description', e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* GALLERY SHOWCASE EDITOR */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                    Gallery Showcase Images
                  </span>
                  <button
                    type="button"
                    onClick={handleAddGalleryImage}
                    className="px-3 py-1 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Gallery Photo
                  </button>
                </div>

                {(!editingPage.gallery || editingPage.gallery.length === 0) ? (
                  <p className="text-[11px] text-slate-400 italic">No extra gallery images added. Click "+ Add Gallery Photo" to add showcase images.</p>
                ) : (
                  <div className="space-y-3">
                    {editingPage.gallery.map((gImg, gIdx) => (
                      <div key={gIdx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            Gallery Image #{gIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(gIdx)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          {gImg.image ? (
                            <img src={gImg.image} alt="Gallery" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 space-y-1.5">
                            <input
                              type="text"
                              placeholder="Image URL or upload file..."
                              value={gImg.image || ''}
                              onChange={(e) => handleUpdateGalleryImage(gIdx, 'image', e.target.value)}
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                placeholder="Caption (e.g. 3D Wireframe View)"
                                value={gImg.caption || ''}
                                onChange={(e) => handleUpdateGalleryImage(gIdx, 'caption', e.target.value)}
                                className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                              />
                              <label className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer shrink-0">
                                Browse File
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleGalleryFileSelect(gIdx, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={editingPage.is_published ?? true}
                  onChange={(e) => setEditingPage({ ...editingPage, is_published: e.target.checked })}
                  className="rounded border-slate-300 text-[#0B1330] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="is_published" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Publish this page to public site
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
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
                  className="px-6 py-2 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> : 'Save CMS Page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServicesModule;
