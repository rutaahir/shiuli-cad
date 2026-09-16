import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ModificationTypeData } from '../../types';
import { 
  Wrench, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  FileCode, 
  CheckCircle2, 
  Sliders
} from 'lucide-react';

export const AdminFileEditsModule: React.FC = () => {
  const [modTypes, setModTypes] = useState<ModificationTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State for Edit/Create Modification Type
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMod, setEditingMod] = useState<Partial<ModificationTypeData> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadModTypes = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getModificationTypes();
      setModTypes(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load modification types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModTypes();
  }, []);

  const handleOpenEdit = (mod?: ModificationTypeData) => {
    if (mod) {
      setEditingMod({ ...mod });
    } else {
      setEditingMod({
        key: 'custom-modification',
        label: 'New Modification Type',
        description: 'Description of CAD file modification',
        base_price: 75.0,
        icon: 'Wrench',
        is_active: true,
        display_order: modTypes.length + 1,
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveMod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMod || !editingMod.key) return;
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editingMod.id) {
        await api.request(`/file-edits/modification-types/${editingMod.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(editingMod),
        });
        setSuccessMsg(`Modification type "${editingMod.label}" updated successfully.`);
      } else {
        await api.request('/file-edits/modification-types/', {
          method: 'POST',
          body: JSON.stringify(editingMod),
        });
        setSuccessMsg(`New modification type "${editingMod.label}" created successfully.`);
      }
      setIsModalOpen(false);
      setEditingMod(null);
      await loadModTypes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save modification type.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1330]/5 text-[#0B1330] text-xs font-semibold uppercase tracking-wider mb-2">
            <Wrench className="w-3.5 h-3.5 text-[#D4AF37]" />
            CAD File Modification Manager
          </div>
          <h2 className="text-2xl font-bold text-slate-900">CAD File Modifications & Pricing</h2>
          <p className="text-slate-500 text-xs mt-1">
            SuperAdmin module to add, edit, or adjust base parameters for CAD file modification types (.3dm, .stl, .obj, .step).
          </p>
        </div>

        <button
          onClick={() => handleOpenEdit()}
          className="px-4 py-2.5 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" /> Add Modification Type
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

      {/* Grid of Modification Types */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /> Loading modification types...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modTypes.map((mod) => (
            <div
              key={mod.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#D4AF37]/50 transition-all shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono text-slate-700 font-semibold">
                    {mod.key}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      mod.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {mod.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{mod.label}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{mod.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Base Price</span>
                  <span className="text-sm font-bold text-[#0B1330]">
                    ${typeof mod.base_price === 'number' ? mod.base_price.toFixed(2) : mod.base_price}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenEdit(mod)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingMod && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingMod.id ? `Edit Modification: ${editingMod.label}` : 'Create Modification Type'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Label *</label>
                <input
                  type="text"
                  required
                  value={editingMod.label || ''}
                  onChange={(e) => setEditingMod({ ...editingMod, label: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Key (Slug) *</label>
                <input
                  type="text"
                  required
                  value={editingMod.key || ''}
                  onChange={(e) => setEditingMod({ ...editingMod, key: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingMod.description || ''}
                  onChange={(e) => setEditingMod({ ...editingMod, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingMod.base_price || 0}
                    onChange={(e) => setEditingMod({ ...editingMod, base_price: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Icon Name</label>
                  <input
                    type="text"
                    value={editingMod.icon || 'Wrench'}
                    onChange={(e) => setEditingMod({ ...editingMod, icon: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="mod_is_active"
                  checked={editingMod.is_active ?? true}
                  onChange={(e) => setEditingMod({ ...editingMod, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-[#0B1330] focus:ring-0"
                />
                <label htmlFor="mod_is_active" className="text-xs font-semibold text-slate-700">
                  Enable this modification option in client wizard
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
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> : 'Save Modification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFileEditsModule;
