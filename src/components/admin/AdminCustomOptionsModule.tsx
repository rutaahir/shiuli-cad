import React, { useState, useEffect, useCallback } from 'react';
import {
  api,
  OptionGroupData,
  OptionValueData
} from '../../services/api';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Loader2,
  Settings2,
  Layers,
  Tag,
  DollarSign,
  Palette,
  Power
} from 'lucide-react';

export const AdminCustomOptionsModule: React.FC = () => {
  const [groups, setGroups] = useState<OptionGroupData[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('metal');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal / Form state for Option Value creation or editing
  const [editingValue, setEditingValue] = useState<Partial<OptionValueData> | null>(null);
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [isSubmittingValue, setIsSubmittingValue] = useState(false);

  // Group creation modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupKey, setNewGroupKey] = useState('');
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getOptionGroups();
      setGroups(data || []);
      if (data && data.length > 0 && !selectedGroupKey) {
        setSelectedGroupKey(data[0].key);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load option groups.');
    } finally {
      setLoading(false);
    }
  }, [selectedGroupKey]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const activeGroup = groups.find(g => g.key === selectedGroupKey) || groups[0];

  const handleSaveValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingValue || !activeGroup) return;
    setIsSubmittingValue(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editingValue.id) {
        // Update existing option value
        await api.updateOptionValue(editingValue.id, {
          label: editingValue.label,
          description: editingValue.description,
          swatch_color: editingValue.swatch_color || '',
          price_modifier: editingValue.price_modifier || 0,
          modifier_type: editingValue.modifier_type || 'FLAT',
          display_order: editingValue.display_order || 0,
          is_active: editingValue.is_active ?? true,
        });
        setSuccessMsg(`Option value "${editingValue.label}" updated successfully.`);
      } else {
        // Create new option value
        await api.createOptionValue({
          group: activeGroup.id,
          key: editingValue.label?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'opt',
          label: editingValue.label,
          description: editingValue.description || '',
          swatch_color: editingValue.swatch_color || '',
          price_modifier: editingValue.price_modifier || 0,
          modifier_type: editingValue.modifier_type || 'FLAT',
          display_order: editingValue.display_order || 0,
          is_active: true,
        });
        setSuccessMsg(`New option value "${editingValue.label}" added to ${activeGroup.label}.`);
      }
      setIsValueModalOpen(false);
      setEditingValue(null);
      await loadGroups();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save option value.');
    } finally {
      setIsSubmittingValue(false);
    }
  };

  const handleToggleActive = async (val: OptionValueData) => {
    try {
      await api.updateOptionValue(val.id, { is_active: !val.is_active });
      setSuccessMsg(`Option "${val.label}" ${!val.is_active ? 'activated' : 'deactivated'}.`);
      await loadGroups();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteValue = async (val: OptionValueData) => {
    if (!window.confirm(`Are you sure you want to delete "${val.label}"?`)) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.deleteOptionValue(val.id);
      setSuccessMsg(`Option "${val.label}" deleted.`);
      await loadGroups();
    } catch (err: any) {
      // Catch protected error
      setErrorMsg(err.message || `Cannot delete "${val.label}" as it is referenced by past orders. Soft-deactivate it instead.`);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupKey || !newGroupLabel) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.createOptionGroup({
        key: newGroupKey.toLowerCase().replace(/\s+/g, '_'),
        label: newGroupLabel,
        description: newGroupDesc,
        display_order: groups.length + 1,
        is_required: true,
      });
      setSuccessMsg(`Option Group "${newGroupLabel}" created.`);
      setIsGroupModalOpen(false);
      setNewGroupKey('');
      setNewGroupLabel('');
      setNewGroupDesc('');
      await loadGroups();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create option group.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <Settings2 className="w-3.5 h-3.5 text-amber-600" /> Dynamic Studio Parameters
          </div>
          <h2 className="text-xl font-bold text-slate-900">Custom Design Options & Pricing Modifiers</h2>
          <p className="text-xs text-slate-500">Manage all dropdown options, color swatches, and live price modifiers across the Custom Design Wizard.</p>
        </div>
        <button
          onClick={() => setIsGroupModalOpen(true)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add New Option Group
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Option Groups Tabs + Values List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Option Group Tabs */}
        <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-1">
            Option Groups ({groups.length})
          </h3>

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
              <span className="text-xs text-slate-400">Loading groups...</span>
            </div>
          ) : (
            <div className="space-y-1">
              {groups.map(g => {
                const isSel = g.key === activeGroup?.key;
                const activeCount = (g.options || []).filter(o => o.is_active).length;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupKey(g.key)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
                      isSel
                        ? 'bg-amber-500 text-white font-bold shadow-md'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <div>
                      <span className="text-xs block font-bold">{g.label}</span>
                      <span className={`text-[10px] ${isSel ? 'text-amber-100' : 'text-slate-400'}`}>
                        {g.key}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isSel ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {activeCount} active
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Values Table for Active Group */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {activeGroup ? (
            <>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{activeGroup.label}</h3>
                  <p className="text-xs text-slate-500">{activeGroup.description || `Key: ${activeGroup.key}`}</p>
                </div>
                <button
                  onClick={() => {
                    setEditingValue({
                      group: activeGroup.id,
                      label: '',
                      description: '',
                      price_modifier: 0,
                      modifier_type: 'FLAT',
                      swatch_color: '',
                      display_order: (activeGroup.options?.length || 0) + 1,
                      is_active: true
                    });
                    setIsValueModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Option Value
                </button>
              </div>

              {/* Options Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3">Display Label</th>
                      <th className="p-3">Swatch Color</th>
                      <th className="p-3">Price Modifier</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(activeGroup.options || []).map(val => (
                      <tr key={val.id} className={`hover:bg-slate-50/80 transition-colors ${!val.is_active ? 'opacity-50 bg-slate-50/40' : ''}`}>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{val.label}</div>
                          {val.description && <div className="text-[11px] text-slate-400">{val.description}</div>}
                        </td>
                        <td className="p-3">
                          {val.swatch_color ? (
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full border border-slate-300 shadow-inner" style={{ backgroundColor: val.swatch_color }} />
                              <span className="font-mono text-[11px] text-slate-500">{val.swatch_color}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-3 font-semibold">
                          {Number(val.price_modifier) !== 0 ? (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                              {val.modifier_type === 'PERCENT' ? `+${val.price_modifier}%` : `+₹${val.price_modifier}`}
                            </span>
                          ) : (
                            <span className="text-slate-400">Standard (₹0)</span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleActive(val)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 transition-all ${
                              val.is_active
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-200 text-slate-600 border border-slate-300'
                            }`}
                          >
                            <Power className="w-3 h-3" /> {val.is_active ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingValue(val);
                                setIsValueModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                              title="Edit Value"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteValue(val)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="Delete Value"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(activeGroup.options || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          No option values configured for this group yet. Click "Add Option Value" above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">Select an option group from the left panel.</div>
          )}
        </div>
      </div>

      {/* VALUE CREATE/EDIT MODAL */}
      {isValueModalOpen && editingValue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingValue.id ? 'Edit Option Value' : `Add Option to ${activeGroup?.label}`}
              </h3>
              <button onClick={() => setIsValueModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveValue} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Option Display Label *</label>
                <input
                  type="text"
                  required
                  value={editingValue.label || ''}
                  onChange={e => setEditingValue(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g. 18K Rose Gold, Micro-Pave, Marquise"
                  className="w-full text-xs rounded-xl border-slate-300 py-2 px-3 focus:border-amber-500 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={editingValue.description || ''}
                  onChange={e => setEditingValue(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Short subtext or tooltip description"
                  className="w-full text-xs rounded-xl border-slate-300 py-2 px-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price Modifier Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingValue.price_modifier ?? 0}
                    onChange={e => setEditingValue(prev => ({ ...prev, price_modifier: parseFloat(e.target.value) || 0 }))}
                    className="w-full text-xs rounded-xl border-slate-300 py-2 px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Modifier Type</label>
                  <select
                    value={editingValue.modifier_type || 'FLAT'}
                    onChange={e => setEditingValue(prev => ({ ...prev, modifier_type: e.target.value as any }))}
                    className="w-full text-xs rounded-xl border-slate-300 py-2 px-3"
                  >
                    <option value="FLAT">Flat Amount (₹)</option>
                    <option value="PERCENT">Percentage (+%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Swatch Color (Hex Code e.g. #E8C468)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingValue.swatch_color || ''}
                    onChange={e => setEditingValue(prev => ({ ...prev, swatch_color: e.target.value }))}
                    placeholder="#E5E4E2"
                    className="w-full text-xs rounded-xl border-slate-300 py-2 px-3 font-mono"
                  />
                  {editingValue.swatch_color && (
                    <span
                      className="w-8 h-8 rounded-xl border border-slate-300 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: editingValue.swatch_color }}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="opt_active"
                  checked={editingValue.is_active ?? true}
                  onChange={e => setEditingValue(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="opt_active" className="font-semibold text-slate-700 cursor-pointer">
                  Is Active (Visible to Clients in Configurator)
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsValueModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingValue}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {isSubmittingValue && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Option Value
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GROUP CREATE MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Option Group</h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Group Label *</label>
                <input
                  type="text"
                  required
                  value={newGroupLabel}
                  onChange={e => {
                    setNewGroupLabel(e.target.value);
                    setNewGroupKey(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
                  }}
                  placeholder="e.g. Band Width, Prongs Count"
                  className="w-full text-xs rounded-xl border-slate-300 py-2 px-3"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Group Key (Slug) *</label>
                <input
                  type="text"
                  required
                  value={newGroupKey}
                  onChange={e => setNewGroupKey(e.target.value)}
                  placeholder="band_width"
                  className="w-full text-xs rounded-xl border-slate-300 py-2 px-3 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="Short description for admin reference"
                  className="w-full text-xs rounded-xl border-slate-300 py-2 px-3"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm"
                >
                  Create Option Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
