import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  MessageSquare,
  CheckCircle2,
  Send,
  User,
  Clock,
  Gem,
  Layers,
  FileText,
  Loader2,
  Sparkles,
  Search,
  RefreshCw,
  Phone,
  Eye,
  X,
  ArrowLeft,
  Zap,
  Mail,
  Calendar,
  Award,
  Ruler,
  Tag,
  Download,
  Check,
  Box,
  Info,
  Sliders,
  CheckSquare,
  ShieldCheck
} from 'lucide-react';

interface CustomRequestItem {
  id: number;
  client_name: string;
  category?: number;
  category_name?: string;
  aesthetic_style_name?: string;
  metal_alloy_name?: string;
  metal_swatch_color?: string;
  gemstone_preference_open?: boolean;
  estimated_price_shown?: string | number;
  timeline?: string;
  description: string;
  special_instructions?: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  status: string;
  submission_intent?: 'quote_only' | 'place_order' | string;
  agreed_price?: string | number;
  created_at: string;
  
  // Specifications
  ring_size?: string;
  ring_size_standard?: string;
  target_weight_grams?: string | number;
  budget_range?: string;
  needed_by_date?: string;
  is_metal_only?: boolean;
  engraving_text?: string;
  engraving_font?: string;
  engraving_placement?: string;
  has_logo?: boolean;
  logo_file?: string;
  delivery_speed_name?: string;
  client_consent_to_feature?: boolean;

  // Rich relations
  gemstones?: Array<{ stone_type: string; cut_type: string; carat_size?: string; quantity: number }>;
  stones?: Array<{
    id?: number;
    stone_type: string;
    shape?: string;
    setting_style?: string;
    quantity: number;
    size_value?: string;
    size_unit?: string;
    color?: string;
    clarity?: string;
    is_center_stone?: boolean;
  }>;
  selections?: Array<{
    id?: number;
    group: number;
    group_key: string;
    group_label: string;
    value?: number;
    value_label?: string;
    swatch_color?: string;
    price_modifier?: string | number;
    modifier_type?: string;
    other_text?: string;
  }>;
  reference_image?: string;
  catalog_references?: Array<{ id: number | string; title: string; sku?: string; image?: string; price?: number }>;
  sketches?: Array<{ id: number; image_url: string; image: string }>;
  messages?: Array<{ id: number; sender_type: string; message: string; offered_price?: number; created_at: string }>;
}

export const AdminCustomRequestsModule: React.FC = () => {
  const [requests, setRequests] = useState<CustomRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReqId, setSelectedReqId] = useState<number | null>(null);
  const [quoteInput, setQuoteInput] = useState<number | ''>('');
  const [textMessageInput, setTextMessageInput] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'negotiating' | 'agreed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [mobileViewDetail, setMobileViewDetail] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      await api.ensureAdminToken();
      const res = await api.request<any>('/custom-requests/');
      const ensureArray = <T,>(r: any): T[] => {
        if (Array.isArray(r)) return r;
        if (r && Array.isArray(r.results)) return r.results;
        if (r && Array.isArray(r.data)) return r.data;
        return [];
      };
      const list = ensureArray<CustomRequestItem>(res);
      setRequests(list);
      if (list.length > 0 && (!selectedReqId || !list.some((r) => r.id === selectedReqId))) {
        setSelectedReqId(list[0].id);
      }
    } catch (err) {
      console.warn('Error fetching custom requests from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const activeReq = requests.find((r) => r.id === selectedReqId) || requests[0];

  // Filtering requests
  const filteredRequests = requests.filter((req) => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'new'
        ? req.status === 'new'
        : activeTab === 'negotiating'
        ? req.status === 'negotiating' || req.status === 'quoted'
        : req.status === 'agreed' || req.status === 'in_progress';

    const query = searchQuery.toLowerCase();
    const nameMatch = (req.contact_name || req.client_name || '').toLowerCase().includes(query);
    const catMatch = (req.category_name || '').toLowerCase().includes(query);
    const idMatch = `req-${req.id}`.includes(query) || `#${req.id}`.includes(query);

    return matchesTab && (nameMatch || catMatch || idMatch);
  });

  // Executive Stats
  const totalCount = requests.length;
  const newCount = requests.filter((r) => r.status === 'new').length;
  const negotiatingCount = requests.filter((r) => r.status === 'negotiating' || r.status === 'quoted').length;
  const agreedCount = requests.filter((r) => r.status === 'agreed' || r.status === 'in_progress').length;
  const totalAgreedValue = requests
    .filter((r) => r.status === 'agreed' || r.status === 'in_progress')
    .reduce((sum, r) => sum + Number(r.agreed_price || r.estimated_price_shown || 0), 0);

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq || (!quoteInput && !textMessageInput)) return;

    setIsSending(true);
    try {
      await api.ensureAdminToken();
      const updated = await api.request<CustomRequestItem>(`/custom-requests/${activeReq.id}/quote/`, {
        method: 'POST',
        body: JSON.stringify({
          price: quoteInput ? Number(quoteInput) : undefined,
          message: textMessageInput,
        }),
      });

      setRequests((prev) => prev.map((r) => (r.id === activeReq.id ? updated : r)));
      setQuoteInput('');
      setTextMessageInput('');
    } catch (err: any) {
      alert(err?.message || 'Failed to send quote');
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptClientOffer = async (reqId: number) => {
    setIsSending(true);
    try {
      await api.ensureAdminToken();
      await api.request(`/custom-requests/${reqId}/accept-quote/`, {
        method: 'POST',
      });
      fetchRequests();
    } catch (err: any) {
      alert(err?.message || 'Failed to accept client counter offer');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return {
          label: 'New',
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
          dot: 'bg-blue-500 animate-pulse',
        };
      case 'negotiating':
      case 'quoted':
        return {
          label: 'Negotiating',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'agreed':
      case 'in_progress':
        return {
          label: 'Agreed & Accepted',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-500',
        };
      default:
        return {
          label: status.toUpperCase(),
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* COMPACT SAAS HEADER & TOOLBAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7EF] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Title + Stats Strip */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-serif text-lg font-bold text-[#1E2230] tracking-tight">
            Custom Requests Pipeline
          </h1>

          {/* Quick Metrics Chips */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-[#1E2230] font-bold border border-slate-200">
              Total: {totalCount}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200">
              New: {newCount}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
              Active: {negotiatingCount}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              Agreed: {agreedCount} (₹{totalAgreedValue.toLocaleString('en-IN')})
            </span>
          </div>
        </div>

        {/* Action controls: Filter tabs + Search + Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
            {(['all', 'new', 'negotiating', 'agreed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                  activeTab === tab ? 'bg-white text-[#09112B] shadow-xs font-bold' : 'text-[#6B7280] hover:text-[#1E2230]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-36 sm:w-44 pl-7 pr-6 py-1 text-xs rounded-xl bg-slate-50 border border-[#E5E7EF] text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={fetchRequests}
            title="Refresh List"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1E2230] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#C9A227] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* MAIN WORKSTATION GRID */}
      {loading ? (
        <div className="py-16 bg-white rounded-2xl border border-[#E5E7EF] flex flex-col items-center justify-center gap-2 text-xs text-[#6B7280]">
          <Loader2 className="w-6 h-6 text-[#C9A227] animate-spin" />
          <span className="font-mono">Syncing Pipeline...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-10 bg-white rounded-2xl border border-[#E5E7EF] text-center space-y-2 text-xs text-[#6B7280]">
          <Sparkles className="w-6 h-6 text-[#C9A227] mx-auto opacity-60" />
          <p className="font-semibold text-[#1E2230]">No Custom Requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT COLUMN: QUEUE LIST (Compact Fixed Height) */}
          <div
            className={`lg:col-span-4 bg-white rounded-2xl border border-[#E5E7EF] p-3 shadow-sm space-y-2 ${
              mobileViewDetail ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="text-[10px] font-mono font-bold text-[#6B7280] uppercase tracking-wider flex justify-between items-center px-1 pb-1.5 border-b border-[#E5E7EF]">
              <span>Requests ({filteredRequests.length})</span>
              <span>Select to view</span>
            </div>

            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-0.5">
              {filteredRequests.map((req) => {
                const isSelected = req.id === activeReq?.id;
                const statusInfo = getStatusBadge(req.status);
                const hasCounterOffer =
                  req.messages &&
                  req.messages.length > 0 &&
                  req.messages[req.messages.length - 1].sender_type === 'client';

                return (
                  <div
                    key={req.id}
                    onClick={() => {
                      setSelectedReqId(req.id);
                      setMobileViewDetail(true);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#FFFDF5] text-[#1E2230] border-[#D4AF37] shadow-sm border-l-4 border-l-[#C9A227]'
                        : 'bg-slate-50 hover:bg-white border-[#E5E7EF] hover:border-[#C9A227]/50 text-[#1E2230]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-[10px]">
                        <span className="text-[#09112B]">REQ #{req.id}</span>
                        {req.metal_swatch_color && (
                          <div
                            className="w-2 h-2 rounded-full border border-black/20"
                            style={{ backgroundColor: req.metal_swatch_color }}
                          />
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border flex items-center gap-1 ${statusInfo.bg}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="font-serif font-bold text-xs truncate">
                      {req.contact_name || req.client_name}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono mt-1 pt-1 border-t border-slate-200/40 opacity-90">
                      <span className="truncate max-w-[130px] text-[#6B7280]">
                        {req.category_name || (req.ring_size ? `Ring (${req.ring_size})` : 'Bespoke CAD')}
                      </span>
                      <span className="font-bold text-[#1E2230]">
                        {req.submission_intent === 'place_order' ? (
                          <span className="text-[#C9A227]">Direct Order</span>
                        ) : (
                          `Est: ₹${req.estimated_price_shown ? Number(req.estimated_price_shown).toLocaleString('en-IN') : '--'}`
                        )}
                      </span>
                    </div>

                    {hasCounterOffer && (
                      <span className="mt-1.5 px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9px] flex items-center gap-1 w-fit">
                        <MessageSquare className="w-2.5 h-2.5" /> Counter Offer Received
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: SAAS ACTIVE WORKSPACE (Light & Space-Efficient) */}
          {activeReq && (
            <div
              className={`lg:col-span-8 bg-white rounded-2xl border border-[#E5E7EF] p-4.5 shadow-sm space-y-4 ${
                mobileViewDetail ? 'block' : 'hidden lg:block'
              }`}
            >
              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileViewDetail(false)}
                className="lg:hidden flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-[#1E2230] font-bold text-xs mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#C9A227]" /> Back to Queue
              </button>

              {/* 1. COMPACT LIGHT SPEC HEADER BANNER */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/90 via-white to-amber-50/50 border border-amber-200/80 shadow-xs border-l-4 border-l-[#C9A227] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[#1E2230]">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-[#C9A227] text-white font-mono font-extrabold text-[10px]">
                      REQ #{activeReq.id}
                    </span>
                    <h2 className="font-serif text-lg font-bold text-[#1E2230]">
                      {activeReq.category_name || 'Bespoke CAD Request'}
                    </h2>
                    {activeReq.submission_intent === 'place_order' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#C9A227]" /> Custom 3D CAD Order
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-600" /> Free Quote Request
                      </span>
                    )}
                    {activeReq.budget_range && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono">
                        {activeReq.budget_range}
                      </span>
                    )}
                  </div>

                  {/* Client Contact Details */}
                  <div className="flex items-center gap-3 text-xs text-[#6B7280] flex-wrap">
                    <span className="flex items-center gap-1 text-[#1E2230] font-semibold">
                      <User className="w-3.5 h-3.5 text-[#C9A227]" /> {activeReq.contact_name || activeReq.client_name}
                    </span>
                    {activeReq.contact_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {activeReq.contact_phone}
                      </span>
                    )}
                    {activeReq.contact_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> {activeReq.contact_email}
                      </span>
                    )}
                    <span className="text-slate-400">
                      • {new Date(activeReq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                  {activeReq.needed_by_date && (
                    <div className="text-right px-3 py-1 bg-white rounded-lg border border-amber-200">
                      <span className="text-[9px] uppercase text-[#6B7280] block font-mono flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-[#C9A227]" /> Needed By
                      </span>
                      <span className="font-mono text-xs font-bold text-[#1E2230]">
                        {activeReq.needed_by_date}
                      </span>
                    </div>
                  )}
                  <span
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                      getStatusBadge(activeReq.status).bg
                    }`}
                  >
                    {getStatusBadge(activeReq.status).label}
                  </span>
                </div>
              </div>

              {/* 2. SPECIFICATION MATRIX & CONFIGURED PARAMETERS */}
              <div className="bg-slate-50 border border-[#E5E7EF] p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-2">
                  <div className="flex items-center gap-2 font-bold text-[#1E2230] uppercase text-xs tracking-wider">
                    <Sliders className="w-4 h-4 text-[#C9A227]" />
                    <span>Configured Jewelry Specifications</span>
                  </div>
                  {activeReq.ring_size && (
                    <span className="px-2 py-0.5 rounded bg-white text-[#1E2230] border border-[#E5E7EF] text-[11px] font-mono font-bold">
                      Ring Size: {activeReq.ring_size} ({activeReq.ring_size_standard?.toUpperCase() || 'IN/HK'})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-[#E5E7EF] space-y-0.5">
                    <span className="text-[10px] text-[#6B7280] uppercase block font-mono">Category</span>
                    <span className="font-bold text-[#1E2230]">{activeReq.category_name || 'Bespoke Design'}</span>
                  </div>

                  {activeReq.ring_size && (
                    <div className="bg-white p-2.5 rounded-lg border border-[#E5E7EF] space-y-0.5">
                      <span className="text-[10px] text-[#6B7280] uppercase block font-mono">Ring Size</span>
                      <span className="font-bold text-[#1E2230]">
                        {activeReq.ring_size} <span className="text-[10px] text-[#6B7280]">({activeReq.ring_size_standard?.toUpperCase() || 'IN/HK'})</span>
                      </span>
                    </div>
                  )}

                  {activeReq.target_weight_grams && (
                    <div className="bg-white p-2.5 rounded-lg border border-[#E5E7EF] space-y-0.5">
                      <span className="text-[10px] text-[#6B7280] uppercase block font-mono">Target Metal Weight</span>
                      <span className="font-bold text-[#1E2230]">{activeReq.target_weight_grams} grams</span>
                    </div>
                  )}

                  {/* Render dynamic option selections */}
                  {activeReq.selections && activeReq.selections.length > 0 ? (
                    activeReq.selections.map((sel) => (
                      <div key={sel.id || sel.group_key} className="bg-white p-2.5 rounded-lg border border-[#E5E7EF] space-y-0.5">
                        <span className="text-[10px] text-[#6B7280] uppercase block font-mono truncate">{sel.group_label}</span>
                        <div className="flex items-center gap-1.5">
                          {sel.swatch_color && (
                            <div className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: sel.swatch_color }} />
                          )}
                          <span className="font-bold text-[#1E2230] truncate">{sel.value_label || sel.other_text || 'Standard'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {activeReq.metal_alloy_name && (
                        <div className="bg-white p-2.5 rounded-lg border border-[#E5E7EF] space-y-0.5">
                          <span className="text-[10px] text-[#6B7280] uppercase block font-mono">Metal Alloy</span>
                          <span className="font-bold text-[#1E2230]">{activeReq.metal_alloy_name}</span>
                        </div>
                      )}
                      {activeReq.aesthetic_style_name && (
                        <div className="bg-white p-2.5 rounded-lg border border-[#E5E7EF] space-y-0.5">
                          <span className="text-[10px] text-[#6B7280] uppercase block font-mono">Design Style</span>
                          <span className="font-bold text-[#1E2230]">{activeReq.aesthetic_style_name}</span>
                        </div>
                      )}
                    </>
                  )}

                  {activeReq.delivery_speed_name && (
                    <div className="bg-white p-2.5 rounded-lg border border-[#E5E7EF] space-y-0.5">
                      <span className="text-[10px] text-[#6B7280] uppercase block font-mono">Turnaround Speed</span>
                      <span className="font-bold text-[#1E2230]">{activeReq.delivery_speed_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. GEMSTONES & DIAMOND LAYOUT */}
              <div className="bg-slate-50 border border-[#E5E7EF] p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-2">
                  <div className="flex items-center gap-2 font-bold text-[#1E2230] uppercase text-xs tracking-wider">
                    <Gem className="w-4 h-4 text-[#C9A227]" />
                    <span>Gemstone &amp; Diamond Setting Architecture</span>
                  </div>
                  {activeReq.is_metal_only ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold">
                      Metal Only Piece
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-[10px]">
                      {(activeReq.stones?.length || activeReq.gemstones?.length || 0)} Stone Row(s) Configured
                    </span>
                  )}
                </div>

                {activeReq.is_metal_only ? (
                  <div className="p-3 rounded-lg bg-white border border-[#E5E7EF] text-slate-700 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span><strong>Metal Only Model</strong> — No gemstone seats, prongs, or diamond micro-pavé required for this CAD file.</span>
                  </div>
                ) : activeReq.stones && activeReq.stones.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs bg-white rounded-lg border border-[#E5E7EF] overflow-hidden">
                      <thead className="bg-slate-100/80 text-[10px] uppercase font-mono text-[#6B7280] border-b border-[#E5E7EF]">
                        <tr>
                          <th className="p-2.5">Stone Type</th>
                          <th className="p-2.5">Shape</th>
                          <th className="p-2.5">Setting Style</th>
                          <th className="p-2.5">Quantity</th>
                          <th className="p-2.5">Size / Carat</th>
                          <th className="p-2.5">Clarity / Color</th>
                          <th className="p-2.5">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeReq.stones.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="p-2.5 font-bold text-[#1E2230]">{s.stone_type}</td>
                            <td className="p-2.5 text-slate-700">{s.shape || 'Standard'}</td>
                            <td className="p-2.5 text-slate-700">{s.setting_style || 'Prong'}</td>
                            <td className="p-2.5 font-mono font-bold text-[#1E2230]">{s.quantity}x</td>
                            <td className="p-2.5 font-mono text-slate-700">{s.size_value ? `${s.size_value} ${s.size_unit || 'ct'}` : '--'}</td>
                            <td className="p-2.5 font-mono text-slate-700">{[s.clarity, s.color].filter(Boolean).join(' • ') || 'Standard'}</td>
                            <td className="p-2.5">
                              {s.is_center_stone ? (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9px] uppercase">
                                  Center Stone
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Accent / Pavé</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : activeReq.gemstones && activeReq.gemstones.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeReq.gemstones.map((g, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#E5E7EF] flex justify-between items-center text-xs">
                        <span className="font-bold text-[#1E2230]">{g.quantity}x {g.stone_type} ({g.cut_type})</span>
                        <span className="font-mono text-slate-500 text-[11px]">{g.carat_size || 'Spec'}</span>
                      </div>
                    ))}
                  </div>
                ) : activeReq.gemstone_preference_open ? (
                  <div className="p-3 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs">
                    ✓ Client specified "Let Modeller Decide" (Open Preference for optimum aesthetics).
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-2 bg-white rounded-lg border border-[#E5E7EF]">
                    No specific gemstone rows declared in configurator.
                  </p>
                )}
              </div>

              {/* 4. PERSONALIZATION, BRANDING & SHOWCASE PERMISSION */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Engraving */}
                <div className="bg-slate-50 border border-[#E5E7EF] p-3 rounded-xl space-y-1.5">
                  <span className="text-[10px] text-[#6B7280] uppercase block font-mono font-bold flex items-center gap-1 border-b border-[#E5E7EF] pb-1">
                    <FileText className="w-3 h-3 text-[#C9A227]" /> Custom Engraving
                  </span>
                  {activeReq.engraving_text ? (
                    <div className="bg-white p-2 rounded-lg border border-[#E5E7EF] space-y-0.5">
                      <p className="font-bold text-[#1E2230]">"{activeReq.engraving_text}"</p>
                      <p className="text-[10px] text-[#6B7280] font-mono">
                        Font: {activeReq.engraving_font || 'Script'} • {activeReq.engraving_placement || 'Inside Shank'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px] pt-1">No custom engraving requested.</p>
                  )}
                </div>

                {/* Brand Logo */}
                <div className="bg-slate-50 border border-[#E5E7EF] p-3 rounded-xl space-y-1.5">
                  <span className="text-[10px] text-[#6B7280] uppercase block font-mono font-bold flex items-center gap-1 border-b border-[#E5E7EF] pb-1">
                    <Tag className="w-3 h-3 text-[#C9A227]" /> Brand Logo Stamping
                  </span>
                  {activeReq.has_logo ? (
                    <div className="bg-white p-2 rounded-lg border border-[#E5E7EF] space-y-1">
                      <span className="text-emerald-700 font-bold text-[11px] block">✓ Logo Stamping Required</span>
                      {activeReq.logo_file ? (
                        <a
                          href={activeReq.logo_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#C9A227] hover:underline text-[10px] font-mono flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Download Vector Logo
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Vector file provided with order</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px] pt-1">No brand logo stamping requested.</p>
                  )}
                </div>

                {/* Portfolio Showcase Consent */}
                <div className="bg-slate-50 border border-[#E5E7EF] p-3 rounded-xl space-y-1.5">
                  <span className="text-[10px] text-[#6B7280] uppercase block font-mono font-bold flex items-center gap-1 border-b border-[#E5E7EF] pb-1">
                    <ShieldCheck className="w-3 h-3 text-[#C9A227]" /> Portfolio Showcase
                  </span>
                  <div className="bg-white p-2 rounded-lg border border-[#E5E7EF]">
                    {activeReq.client_consent_to_feature ? (
                      <span className="text-emerald-700 font-bold text-[11px] block">
                        ✓ Consent Granted for Portfolio Showcase
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium text-[11px] block">
                        Private Model — Do Not Feature
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. CLIENT WRITTEN BRIEF, REFERENCES & SKETCHES */}
              <div className="bg-slate-50 border border-[#E5E7EF] p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-2">
                  <div className="flex items-center gap-2 font-bold text-[#1E2230] uppercase text-xs tracking-wider">
                    <FileText className="w-4 h-4 text-[#C9A227]" />
                    <span>Client Design Brief, References &amp; Uploaded Artwork</span>
                  </div>
                  {activeReq.sketches && activeReq.sketches.length > 0 && (
                    <span className="text-slate-400 font-mono text-[10px]">{activeReq.sketches.length} Artwork Attachment(s)</span>
                  )}
                </div>

                {/* Written Notes */}
                <div className="bg-white p-3 rounded-lg border border-[#E5E7EF] space-y-2 text-xs">
                  <p className="text-[#1E2230] whitespace-pre-line leading-relaxed">
                    {activeReq.special_instructions || activeReq.description || 'No special written instructions provided.'}
                  </p>
                </div>

                {/* Studio Catalog References Gallery */}
                {activeReq.catalog_references && activeReq.catalog_references.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-[#6B7280] uppercase block font-bold flex items-center gap-1">
                      <CheckSquare className="w-3 h-3 text-[#C9A227]" />
                      Studio Catalog References ({activeReq.catalog_references.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeReq.catalog_references.map((cRef, cIdx) => (
                        <div
                          key={cIdx}
                          onClick={() => cRef.image && setLightboxImage(cRef.image)}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-[#E5E7EF] hover:border-[#C9A227] cursor-pointer transition-all hover:shadow-sm"
                        >
                          {cRef.image ? (
                            <img src={cRef.image} alt={cRef.title} className="w-12 h-12 rounded-lg object-cover border border-slate-100 shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-mono text-slate-500 shrink-0">CAD</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono text-[#C9A227] font-bold block">{cRef.sku || `SKU-${cRef.id}`}</span>
                            <p className="font-bold text-[#1E2230] text-xs truncate">{cRef.title}</p>
                            <span className="text-[9px] text-[#6B7280] block">Click to enlarge image</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sketches & Attachments Gallery */}
                {activeReq.sketches && activeReq.sketches.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-[#6B7280] uppercase block font-bold">
                      Attached Reference Sketches ({activeReq.sketches.length}) — Click to enlarge
                    </span>
                    <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                      {activeReq.sketches.map((sk) => {
                        const imgUrl = sk.image_url || sk.image;
                        return (
                          <div
                            key={sk.id}
                            onClick={() => setLightboxImage(imgUrl)}
                            className="w-16 h-16 rounded-xl overflow-hidden border border-[#E5E7EF] cursor-pointer shrink-0 hover:border-[#C9A227] hover:shadow-md transition-all relative group"
                          >
                            <img src={imgUrl} alt="Sketch" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. NEGOTIATION LOG */}
              {activeReq.messages && activeReq.messages.length > 0 && (
                <div className="bg-slate-50 border border-[#E5E7EF] p-3 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1E2230] uppercase tracking-wider border-b border-[#E5E7EF] pb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span>Negotiation Log</span>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {activeReq.messages.map((m) => {
                      const isAdmin = m.sender_type === 'admin';
                      return (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded-xl text-[11px] space-y-1 max-w-[88%] ${
                            isAdmin
                              ? 'bg-amber-50/90 text-[#1E2230] border border-amber-200 ml-auto'
                              : 'bg-white text-[#1E2230] border border-[#E5E7EF]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[9px] text-[#6B7280] font-mono font-bold">
                            <span>{isAdmin ? 'Super Admin' : activeReq.contact_name || 'Client'}</span>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p>{m.message}</p>
                          {m.offered_price && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                                isAdmin ? 'bg-[#C9A227] text-white' : 'bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              Offer: ₹{Number(m.offered_price).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. COMPACT ACTION DOCK (Send Quote or Accept Offer) */}
              {(() => {
                if (activeReq.status === 'agreed' || activeReq.status === 'in_progress') {
                  return (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="font-bold">Agreed &amp; Contract Locked</span>
                      </div>
                      <div className="font-mono font-bold text-xs bg-white px-3 py-1 rounded-lg border border-emerald-300">
                        Final Price: ₹{Number(activeReq.agreed_price || activeReq.estimated_price_shown).toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                }

                const latestMsg =
                  activeReq.messages && activeReq.messages.length > 0
                    ? activeReq.messages[activeReq.messages.length - 1]
                    : null;
                const isClientOffer = latestMsg && latestMsg.sender_type === 'client';

                return (
                  <div className="bg-slate-50 border border-[#E5E7EF] p-3 rounded-xl space-y-2.5">
                    {/* Client Counter Offer Banner */}
                    {isClientOffer && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-950">
                          <MessageSquare className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Client Counter: <strong>₹{Number(latestMsg.offered_price).toLocaleString('en-IN')}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAcceptClientOffer(activeReq.id)}
                          disabled={isSending}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>Accept Offer</span>
                        </button>
                      </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSendQuote} className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative w-full sm:w-36 shrink-0">
                        <span className="absolute left-2.5 top-2 text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          value={quoteInput}
                          onChange={(e) => setQuoteInput(e.target.value ? Number(e.target.value) : '')}
                          placeholder={String(activeReq.estimated_price_shown || 25000)}
                          className="w-full pl-6 pr-2 py-1.5 text-xs rounded-xl bg-white border border-[#E5E7EF] font-mono font-bold text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
                        />
                      </div>

                      <input
                        type="text"
                        value={textMessageInput}
                        onChange={(e) => setTextMessageInput(e.target.value)}
                        placeholder="Add turnaround notes or terms..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E5E7EF] text-[#1E2230] focus:outline-none focus:border-[#C9A227]"
                      />

                      <button
                        type="submit"
                        disabled={isSending}
                        className="btn-gold-luxury px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer shrink-0 w-full sm:w-auto justify-center"
                      >
                        {isSending ? (
                          <Loader2 className="w-3.5 h-3.5 text-[#09112B] animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3 h-3 text-[#09112B]" />
                            <span>{isClientOffer ? 'Send Counter' : 'Send Quote'}</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-3xl max-h-[80vh] rounded-2xl overflow-hidden border-2 border-[#D4AF37] bg-black">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={lightboxImage} alt="Sketch" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};

