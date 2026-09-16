import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ServicePageData } from '../../types';
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
  Layers
} from 'lucide-react';

export const AdminServicesModule: React.FC = () => {
  const [pages, setPages] = useState<ServicePageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeSectionFilter, setActiveSectionFilter] = useState<'all' | 'cad_service' | 'about'>('all');

  // Modal State for Edit/Create Page
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Partial<ServicePageData> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadServices = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getServicePages();
      setPages(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load CMS service pages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleOpenEdit = (page?: ServicePageData) => {
    if (page) {
      setEditingPage({ ...page });
    } else {
      setEditingPage({
        slug: 'new-service-page',
        section: 'cad_service',
        title: 'New Service Page',
        subtitle: 'Professional 3D CAD Specialization',
        intro_text: 'Detailed intro text describing this service.',
        cta_label: 'Start Your Design',
        cta_target: 'custom_design',
        is_published: true,
        display_order: pages.length + 1,
      });
    }
    setIsModalOpen(true);
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage || !editingPage.slug) return;
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editingPage.id) {
        // Update existing service page
        await api.request(`/services/pages/${editingPage.slug}/`, {
          method: 'PATCH',
          body: JSON.stringify(editingPage),
        });
        setSuccessMsg(`Service page "${editingPage.title}" updated successfully.`);
      } else {
        // Create new service page
        await api.request('/services/pages/', {
          method: 'POST',
          body: JSON.stringify(editingPage),
        });
        setSuccessMsg(`New service page "${editingPage.title}" created successfully.`);
      }
      setIsModalOpen(false);
      setEditingPage(null);
      await loadServices();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save service page.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPages = pages.filter((p) => {
    if (activeSectionFilter === 'all') return true;
    return p.section === activeSectionFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1330]/5 text-[#0B1330] text-xs font-semibold uppercase tracking-wider mb-2">
            <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
            CMS Page Manager
          </div>
          <h2 className="text-2xl font-bold text-slate-900">CAD Services & About Us CMS Pages</h2>
          <p className="text-slate-500 text-xs mt-1">
            SuperAdmin CMS dashboard to manage 100% of website service landing pages, titles, hero graphics & features.
          </p>
        </div>

        <button
          onClick={() => handleOpenEdit()}
          className="px-4 py-2.5 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" /> Create New CMS Page
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSectionFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSectionFilter === 'all'
              ? 'bg-[#0B1330] text-[#F5E7A3]'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All CMS Pages ({pages.length})
        </button>
        <button
          onClick={() => setActiveSectionFilter('cad_service')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSectionFilter === 'cad_service'
              ? 'bg-[#0B1330] text-[#F5E7A3]'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          CAD Services ({pages.filter((p) => p.section === 'cad_service').length})
        </button>
        <button
          onClick={() => setActiveSectionFilter('about')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSectionFilter === 'about'
              ? 'bg-[#0B1330] text-[#F5E7A3]'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          About Us ({pages.filter((p) => p.section === 'about').length})
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

      {/* Pages Table / Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /> Loading CMS pages from database...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Page Title & Slug</th>
                <th className="p-4">Section</th>
                <th className="p-4">Subtitle & Intro</th>
                <th className="p-4">CTA Target</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPages.map((page) => (
                <tr key={page.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-900">
                    <div>{page.title}</div>
                    <span className="text-[10px] text-slate-400 font-mono">/service/{page.slug}</span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        page.section === 'cad_service'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {page.section === 'cad_service' ? 'CAD Service' : 'About Section'}
                    </span>
                  </td>
                  <td className="p-4 max-w-xs truncate">
                    <p className="font-medium text-slate-800 truncate">{page.subtitle}</p>
                    <p className="text-slate-400 text-[10px] truncate">{page.intro_text}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700">
                      {page.cta_target}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        page.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {page.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(page)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                      title="Edit Page"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingPage && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPage.id ? `Edit CMS Page: ${editingPage.title}` : 'Create New CMS Page'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePage} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Page Title *</label>
                  <input
                    type="text"
                    required
                    value={editingPage.title || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={editingPage.slug || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">CTA Target</label>
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editingPage.subtitle || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, subtitle: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Intro Text</label>
                <textarea
                  rows={4}
                  value={editingPage.intro_text || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, intro_text: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CTA Button Label</label>
                <input
                  type="text"
                  value={editingPage.cta_label || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, cta_label: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={editingPage.is_published ?? true}
                  onChange={(e) => setEditingPage({ ...editingPage, is_published: e.target.checked })}
                  className="rounded border-slate-300 text-[#0B1330] focus:ring-0"
                />
                <label htmlFor="is_published" className="text-xs font-semibold text-slate-700">
                  Publish this page to public site
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
