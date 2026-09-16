import React, { useState, useEffect } from 'react';
import {
  api,
  MetalAlloyOption,
  AestheticStyleOption,
  GemstoneOption,
  PricingRuleOption
} from '../../services/api';
import { Settings, Plus, Trash2, Edit3, Loader2, Sparkles, Layers, Gem, IndianRupee, Check, X } from 'lucide-react';

export const AdminSettingsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'configurator'>('configurator');

  // General Preferences State (PlatformSettings)
  const [studioName, setStudioName] = useState('Shiuli CAD Studio');
  const [timezone, setTimezone] = useState('IST (UTC+5:30)');
  const [maxJobLimit, setMaxJobLimit] = useState(2);
  const [assignmentMode, setAssignmentMode] = useState('first_accept_wins');
  const [escalationMinutes, setEscalationMinutes] = useState(30);
  const [advancePaymentPct, setAdvancePaymentPct] = useState(50);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalToast, setGeneralToast] = useState<string | null>(null);

  // Configurator Options State
  const [metals, setMetals] = useState<MetalAlloyOption[]>([]);
  const [styles, setStyles] = useState<AestheticStyleOption[]>([]);
  const [gemstones, setGemstones] = useState<GemstoneOption[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRuleOption[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Editing state IDs
  const [editingMetalId, setEditingMetalId] = useState<number | null>(null);
  const [editMetalName, setEditMetalName] = useState('');
  const [editMetalColor, setEditMetalColor] = useState('#D4AF37');
  const [editMetalMultiplier, setEditMetalMultiplier] = useState('1.00');

  const [editingStyleId, setEditingStyleId] = useState<number | null>(null);
  const [editStyleName, setEditStyleName] = useState('');
  const [editStyleAddon, setEditStyleAddon] = useState('0.00');

  const [editingGemId, setEditingGemId] = useState<number | null>(null);
  const [editGemStone, setEditGemStone] = useState('');
  const [editGemCut, setEditGemCut] = useState('');
  const [editGemPrice, setEditGemPrice] = useState('0.00');

  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editRulePrice, setEditRulePrice] = useState('0.00');

  // New item form state
  const [newMetalName, setNewMetalName] = useState('');
  const [newMetalColor, setNewMetalColor] = useState('#D4AF37');
  const [newMetalMultiplier, setNewMetalMultiplier] = useState('1.00');

  const [newStyleName, setNewStyleName] = useState('');
  const [newStyleAddon, setNewStyleAddon] = useState('0.00');

  const [newStoneType, setNewStoneType] = useState('');
  const [newCutType, setNewCutType] = useState('');
  const [newGemPrice, setNewGemPrice] = useState('0.00');

  const [newRuleCategoryId, setNewRuleCategoryId] = useState<string>('');
  const [newRuleBasePrice, setNewRuleBasePrice] = useState('100.00');

  const fetchOptions = async () => {
    setLoading(true);
    try {
      await api.ensureAdminToken();
      const [m, s, g, p, c, plat] = await Promise.all([
        api.getMetalAlloys().catch(() => []),
        api.getAestheticStyles().catch(() => []),
        api.getGemstoneOptions().catch(() => []),
        api.getPricingRules().catch(() => []),
        api.getCategories(true).catch(() => []),
        api.getPlatformSettings().catch(() => null),
      ]);

      const ensureArray = <T,>(res: any): T[] => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.results)) return res.results;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      };

      setMetals(ensureArray<MetalAlloyOption>(m));
      setStyles(ensureArray<AestheticStyleOption>(s));
      setGemstones(ensureArray<GemstoneOption>(g));
      setPricingRules(ensureArray<PricingRuleOption>(p));
      const catArray = ensureArray<any>(c);
      setCategories(catArray);
      if (catArray.length > 0 && !newRuleCategoryId) {
        setNewRuleCategoryId(String(catArray[0].id));
      }

      if (plat) {
        if (plat.studio_name) setStudioName(plat.studio_name);
        if (plat.timezone) setTimezone(plat.timezone);
        if (plat.default_max_job_limit) setMaxJobLimit(plat.default_max_job_limit);
        if (plat.assignment_mode) setAssignmentMode(plat.assignment_mode);
        if (plat.auto_escalation_minutes) setEscalationMinutes(plat.auto_escalation_minutes);
        if (plat.advance_payment_percentage) setAdvancePaymentPct(Number(plat.advance_payment_percentage));
      }
    } catch (err) {
      console.warn('Error fetching admin configurator options:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [activeTab]);

  // General Settings save
  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    setGeneralToast(null);
    try {
      await api.updatePlatformSettings({
        studio_name: studioName,
        timezone: timezone,
        default_max_job_limit: Number(maxJobLimit),
        assignment_mode: assignmentMode,
        auto_escalation_minutes: Number(escalationMinutes),
        advance_payment_percentage: Number(advancePaymentPct),
      });
      setGeneralToast('General Studio Preferences saved to database successfully!');
      setTimeout(() => setGeneralToast(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to save studio preferences');
    } finally {
      setSavingGeneral(false);
    }
  };

  // 1. Metal CRUD
  const handleAddMetal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetalName) return;
    try {
      await api.createMetalAlloy({
        name: newMetalName,
        swatch_color: newMetalColor,
        price_multiplier: parseFloat(newMetalMultiplier) || 1.0,
      });
      setNewMetalName('');
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to create metal alloy');
    }
  };

  const handleUpdateMetal = async (id: number) => {
    try {
      await api.updateMetalAlloy(id, {
        name: editMetalName,
        swatch_color: editMetalColor,
        price_multiplier: parseFloat(editMetalMultiplier) || 1.0,
      });
      setEditingMetalId(null);
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to update metal alloy');
    }
  };

  const handleDeleteMetal = async (id: number) => {
    if (!confirm('Are you sure you want to delete this metal alloy?')) return;
    try {
      await api.deleteMetalAlloy(id);
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete metal alloy');
    }
  };

  // 2. Style CRUD
  const handleAddStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStyleName) return;
    try {
      await api.createAestheticStyle({
        name: newStyleName,
        price_addon: parseFloat(newStyleAddon) || 0.0,
      });
      setNewStyleName('');
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to create aesthetic style');
    }
  };

  const handleUpdateStyle = async (id: number) => {
    try {
      await api.updateAestheticStyle(id, {
        name: editStyleName,
        price_addon: parseFloat(editStyleAddon) || 0.0,
      });
      setEditingStyleId(null);
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to update aesthetic style');
    }
  };

  const handleDeleteStyle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this aesthetic style?')) return;
    try {
      await api.deleteAestheticStyle(id);
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete style');
    }
  };

  // 3. Gemstone CRUD
  const handleAddGemstone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoneType || !newCutType) return;
    try {
      await api.createGemstoneOption({
        stone_type: newStoneType,
        cut_type: newCutType,
        price_per_unit: parseFloat(newGemPrice) || 0.0,
      });
      setNewStoneType('');
      setNewCutType('');
      setNewGemPrice('0.00');
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to create gemstone option');
    }
  };

  const handleUpdateGemstone = async (id: number) => {
    try {
      await api.updateGemstoneOption(id, {
        stone_type: editGemStone,
        cut_type: editGemCut,
        price_per_unit: parseFloat(editGemPrice) || 0.0,
      });
      setEditingGemId(null);
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to update gemstone option');
    }
  };

  const handleDeleteGemstone = async (id: number) => {
    if (!confirm('Are you sure you want to delete this gemstone option?')) return;
    try {
      await api.deleteGemstoneOption(id);
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete gemstone option');
    }
  };

  // 4. Category Base Pricing Rules CRUD
  const handleAddPricingRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleCategoryId) return;
    try {
      await api.createPricingRule({
        category: parseInt(newRuleCategoryId, 10),
        base_price: parseFloat(newRuleBasePrice) || 100.0,
      });
      setNewRuleBasePrice('100.00');
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to create pricing rule');
    }
  };

  const handleUpdatePricingRule = async (id: number) => {
    try {
      await api.updatePricingRule(id, {
        base_price: parseFloat(editRulePrice) || 100.0,
      });
      setEditingRuleId(null);
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to update pricing rule');
    }
  };

  const handleDeletePricingRule = async (id: number) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
      await api.deletePricingRule(id);
      fetchOptions();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete pricing rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Studio System Settings
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage live configurator metal alloys, aesthetic styles, gemstones, and base category pricing rules.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('configurator')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'configurator'
                ? 'bg-[#0D1B4C] text-white shadow-sm'
                : 'bg-[#F6F7FB] text-[#6B7280] hover:text-[#1E2230]'
            }`}
          >
            Configurator Options
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'general'
                ? 'bg-[#0D1B4C] text-white shadow-sm'
                : 'bg-[#F6F7FB] text-[#6B7280] hover:text-[#1E2230]'
            }`}
          >
            General Preferences
          </button>
        </div>
      </div>

      {activeTab === 'general' ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-6 shadow-sm max-w-2xl space-y-6 text-xs">
          {generalToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 font-semibold">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{generalToast}</span>
            </div>
          )}

          <div className="space-y-4 border-b border-[#E5E7EF] pb-5">
            <h3 className="font-bold text-sm text-[#1E2230] flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#C9A227]" /> General Studio Preferences
            </h3>

            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Studio Brand Name</label>
              <input
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] font-semibold text-[#1E2230]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Studio Operating Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] font-mono text-[#1E2230]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Default Max Concurrent Job Limit</label>
                <input
                  type="number"
                  value={maxJobLimit}
                  onChange={(e) => setMaxJobLimit(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Auto Escalation Timer (Minutes)</label>
                <input
                  type="number"
                  value={escalationMinutes}
                  onChange={(e) => setEscalationMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Job Assignment Mode</label>
                <select
                  value={assignmentMode}
                  onChange={(e) => setAssignmentMode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs"
                >
                  <option value="first_accept_wins">First Accept Wins (Race Pool)</option>
                  <option value="priority_least_loaded">Priority (Least Loaded Artisan)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Advance Payment Requirement (%)</label>
                <input
                  type="number"
                  value={advancePaymentPct}
                  onChange={(e) => setAdvancePaymentPct(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveGeneral}
            disabled={savingGeneral}
            className="btn-gold-luxury px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
          >
            {savingGeneral ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-[#0B1330]" />
                <span>Save Studio Preferences</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {loading ? (
            <div className="py-12 bg-white rounded-2xl border border-[#E5E7EF] flex flex-col items-center justify-center gap-2 text-xs text-[#6B7280]">
              <Loader2 className="w-6 h-6 text-[#C9A227] animate-spin" />
              <span>Fetching Live Configurator Options from Database...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* 1. Metal Alloys Management */}
              <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C9A227]" />
                    <h3 className="font-bold text-sm text-[#1E2230]">Precious Metal Alloys ({metals.length})</h3>
                  </div>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                  {metals.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] flex items-center justify-between text-xs gap-2"
                    >
                      {editingMetalId === m.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editMetalName}
                            onChange={(e) => setEditMetalName(e.target.value)}
                            className="px-2 py-1 rounded border border-[#E5E7EF] text-xs flex-1"
                          />
                          <input
                            type="color"
                            value={editMetalColor}
                            onChange={(e) => setEditMetalColor(e.target.value)}
                            className="w-7 h-7 rounded cursor-pointer shrink-0"
                          />
                          <input
                            type="number"
                            step="0.05"
                            value={editMetalMultiplier}
                            onChange={(e) => setEditMetalMultiplier(e.target.value)}
                            className="w-16 px-1.5 py-1 rounded border border-[#E5E7EF] text-xs"
                          />
                          <button
                            onClick={() => handleUpdateMetal(m.id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingMetalId(null)}
                            className="p-1 rounded bg-slate-300 text-slate-700 hover:bg-slate-400"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: m.swatch_color || '#D4AF37' }}
                            />
                            <span className="font-semibold text-[#1E2230]">{m.name}</span>
                            <span className="text-[10px] text-[#6B7280] font-mono">({m.price_multiplier}x mult)</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingMetalId(m.id);
                                setEditMetalName(m.name);
                                setEditMetalColor(m.swatch_color || '#D4AF37');
                                setEditMetalMultiplier(String(m.price_multiplier || '1.00'));
                              }}
                              className="p-1.5 rounded text-slate-600 hover:bg-slate-200 transition-colors"
                              title="Edit Metal Alloy"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMetal(m.id)}
                              className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Metal Alloy"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Metal Form */}
                <form onSubmit={handleAddMetal} className="pt-3 border-t border-[#E5E7EF] space-y-2 text-xs">
                  <span className="font-semibold text-[#1E2230] text-[11px] uppercase block">Add Metal Alloy</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Name (e.g. 22K Yellow Gold)"
                      value={newMetalName}
                      onChange={(e) => setNewMetalName(e.target.value)}
                      className="col-span-2 px-3 py-1.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF]"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={newMetalColor}
                        onChange={(e) => setNewMetalColor(e.target.value)}
                        className="w-8 h-8 rounded border border-[#E5E7EF] cursor-pointer shrink-0"
                        title="Swatch Color"
                      />
                      <input
                        type="number"
                        step="0.05"
                        placeholder="Multiplier"
                        value={newMetalMultiplier}
                        onChange={(e) => setNewMetalMultiplier(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] text-[11px]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-[#0D1B4C] text-white font-semibold text-xs hover:bg-[#122466] flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Metal Alloy</span>
                  </button>
                </form>
              </div>

              {/* 2. Aesthetic Styles Management */}
              <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C9A227]" />
                    <h3 className="font-bold text-sm text-[#1E2230]">Aesthetic Styles ({styles.length})</h3>
                  </div>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                  {styles.map((st) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] flex items-center justify-between text-xs gap-2"
                    >
                      {editingStyleId === st.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editStyleName}
                            onChange={(e) => setEditStyleName(e.target.value)}
                            className="px-2 py-1 rounded border border-[#E5E7EF] text-xs flex-1"
                          />
                          <input
                            type="number"
                            step="5.00"
                            value={editStyleAddon}
                            onChange={(e) => setEditStyleAddon(e.target.value)}
                            className="w-20 px-1.5 py-1 rounded border border-[#E5E7EF] text-xs font-mono"
                          />
                          <button
                            onClick={() => handleUpdateStyle(st.id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingStyleId(null)}
                            className="p-1 rounded bg-slate-300 text-slate-700 hover:bg-slate-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="font-semibold text-[#1E2230]">{st.name}</span>
                            {Number(st.price_addon) > 0 && (
                              <span className="text-[10px] text-emerald-600 ml-2 font-mono">+${st.price_addon}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingStyleId(st.id);
                                setEditStyleName(st.name);
                                setEditStyleAddon(String(st.price_addon || '0.00'));
                              }}
                              className="p-1.5 rounded text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStyle(st.id)}
                              className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Style Form */}
                <form onSubmit={handleAddStyle} className="pt-3 border-t border-[#E5E7EF] space-y-2 text-xs">
                  <span className="font-semibold text-[#1E2230] text-[11px] uppercase block">Add Aesthetic Style</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Style Name"
                      value={newStyleName}
                      onChange={(e) => setNewStyleName(e.target.value)}
                      className="col-span-2 px-3 py-1.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF]"
                    />
                    <input
                      type="number"
                      placeholder="Addon ($)"
                      value={newStyleAddon}
                      onChange={(e) => setNewStyleAddon(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] text-[11px]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-[#0D1B4C] text-white font-semibold text-xs hover:bg-[#122466] flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Aesthetic Style</span>
                  </button>
                </form>
              </div>

              {/* 3. Gemstone Options Management */}
              <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
                  <div className="flex items-center gap-2">
                    <Gem className="w-4 h-4 text-[#C9A227]" />
                    <h3 className="font-bold text-sm text-[#1E2230]">Gemstone Catalog ({gemstones.length})</h3>
                  </div>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                  {gemstones.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] flex items-center justify-between text-xs gap-2"
                    >
                      {editingGemId === g.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editGemStone}
                            onChange={(e) => setEditGemStone(e.target.value)}
                            className="px-2 py-1 rounded border border-[#E5E7EF] text-xs flex-1"
                          />
                          <input
                            type="text"
                            value={editGemCut}
                            onChange={(e) => setEditGemCut(e.target.value)}
                            className="px-2 py-1 rounded border border-[#E5E7EF] text-xs flex-1"
                          />
                          <button
                            onClick={() => handleUpdateGemstone(g.id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingGemId(null)}
                            className="p-1 rounded bg-slate-300 text-slate-700 hover:bg-slate-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="font-semibold text-[#1E2230]">{g.stone_type}</span>
                            <span className="text-[#6B7280] ml-2">({g.cut_type})</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingGemId(g.id);
                                setEditGemStone(g.stone_type);
                                setEditGemCut(g.cut_type);
                                setEditGemPrice(String(g.price_per_unit || '0.00'));
                              }}
                              className="p-1.5 rounded text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteGemstone(g.id)}
                              className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Gemstone Form */}
                <form onSubmit={handleAddGemstone} className="pt-3 border-t border-[#E5E7EF] space-y-2 text-xs">
                  <span className="font-semibold text-[#1E2230] text-[11px] uppercase block">Add Gemstone Option</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Stone (e.g. Alexandrite)"
                      value={newStoneType}
                      onChange={(e) => setNewStoneType(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Cut (e.g. Cushion Cut)"
                      value={newCutType}
                      onChange={(e) => setNewCutType(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-[#0D1B4C] text-white font-semibold text-xs hover:bg-[#122466] flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Gemstone Option</span>
                  </button>
                </form>
              </div>

              {/* 4. Category Base Pricing Rules */}
              <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-[#C9A227]" />
                    <h3 className="font-bold text-sm text-[#1E2230]">Category Base Pricing Rules ({pricingRules.length})</h3>
                  </div>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                  {pricingRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] flex items-center justify-between text-xs gap-2"
                    >
                      {editingRuleId === rule.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-semibold text-[#1E2230] flex-1">{rule.category_name || `Category #${rule.category}`}</span>
                          <input
                            type="number"
                            step="10.00"
                            value={editRulePrice}
                            onChange={(e) => setEditRulePrice(e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-[#E5E7EF] text-xs font-mono"
                          />
                          <button
                            onClick={() => handleUpdatePricingRule(rule.id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingRuleId(null)}
                            className="p-1 rounded bg-slate-300 text-slate-700 hover:bg-slate-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold text-[#1E2230]">{rule.category_name || `Category #${rule.category}`}</span>

                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#0D1B4C] bg-white px-2 py-1 rounded border border-[#E5E7EF]">
                              ₹{Number(rule.base_price).toLocaleString('en-IN')} Base
                            </span>
                            <button
                              onClick={() => {
                                setEditingRuleId(rule.id);
                                setEditRulePrice(String(rule.base_price || '100.00'));
                              }}
                              className="p-1.5 rounded text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePricingRule(rule.id)}
                              className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Category Pricing Rule Form */}
                <form onSubmit={handleAddPricingRule} className="pt-3 border-t border-[#E5E7EF] space-y-2 text-xs">
                  <span className="font-semibold text-[#1E2230] text-[11px] uppercase block">Add Category Pricing Rule</span>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={newRuleCategoryId}
                      onChange={(e) => setNewRuleCategoryId(e.target.value)}
                      className="col-span-2 px-3 py-1.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] text-xs"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Base Price"
                      value={newRuleBasePrice}
                      onChange={(e) => setNewRuleBasePrice(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] text-[11px] font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-[#0D1B4C] text-white font-semibold text-xs hover:bg-[#122466] flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Pricing Rule</span>
                  </button>
                </form>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
