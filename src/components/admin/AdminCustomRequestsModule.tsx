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
  ShieldCheck
} from 'lucide-react';

interface CustomRequestItem {
  id: number;
  client_name: string;
  category_name?: string;
  aesthetic_style_name?: string;
  metal_alloy_name?: string;
  metal_swatch_color?: string;
  gemstone_preference_open?: boolean;
  estimated_price_shown?: string | number;
  timeline?: string;
  description: string;
  contact_name: string;
  contact_phone: string;
  status: string;
  agreed_price?: string | number;
  created_at: string;
  gemstones?: Array<{ stone_type: string; cut_type: string; carat_size?: string; quantity: number }>;
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
                      <span className="truncate max-w-[130px] text-[#6B7280]">{req.category_name || 'Bespoke Item'}</span>
                      <span className="font-bold text-[#1E2230]">
                        Est: ₹{req.estimated_price_shown ? Number(req.estimated_price_shown).toLocaleString('en-IN') : '--'}
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
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/90 via-white to-amber-50/50 border border-amber-200/80 shadow-xs border-l-4 border-l-[#C9A227] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[#1E2230]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-[#C9A227] text-white font-mono font-extrabold text-[10px]">
                      REQ #{activeReq.id}
                    </span>
                    <h2 className="font-serif text-base font-bold text-[#1E2230]">
                      {activeReq.category_name || 'Bespoke Request'}
                    </h2>
                    <span className="px-2 py-0.5 rounded bg-amber-100/80 text-amber-950 border border-amber-300 text-[10px] font-mono font-bold">
                      {activeReq.metal_alloy_name || '18K Gold'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#6B7280] font-mono">
                    <span>Client: <strong className="text-[#1E2230]">{activeReq.contact_name || activeReq.client_name}</strong></span>
                    {activeReq.contact_phone && <span>• {activeReq.contact_phone}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[9px] uppercase text-[#6B7280] block font-mono">Target Est</span>
                    <span className="font-serif text-base font-bold text-[#1E2230]">
                      ₹{activeReq.estimated_price_shown ? Number(activeReq.estimated_price_shown).toLocaleString('en-IN') : '--'}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                      getStatusBadge(activeReq.status).bg
                    }`}
                  >
                    {getStatusBadge(activeReq.status).label}
                  </span>
                </div>
              </div>

              {/* 2. DENSE 2-COLUMN BRIEF & ARTWORK GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Gemstones & Specs */}
                <div className="bg-slate-50 border border-[#E5E7EF] p-3 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E2230] uppercase text-[10px] tracking-wider border-b border-[#E5E7EF] pb-1">
                    <Gem className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span>Gemstone &amp; Metal Specs</span>
                  </div>

                  {activeReq.gemstone_preference_open ? (
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] border border-emerald-200">
                      ✓ Client specified "Let Modeller Decide" (Open Preference).
                    </div>
                  ) : activeReq.gemstones && activeReq.gemstones.length > 0 ? (
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {activeReq.gemstones.map((g, idx) => (
                        <div key={idx} className="p-1.5 rounded-lg bg-white border border-[#E5E7EF] flex justify-between items-center text-[11px]">
                          <span className="font-bold text-[#1E2230]">{g.quantity}x {g.stone_type} ({g.cut_type})</span>
                          <span className="text-[10px] font-mono text-slate-500">{g.carat_size || 'Spec'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No specific gemstone details provided.</p>
                  )}
                </div>

                {/* Client Instruction & Reference Sketches */}
                <div className="bg-slate-50 border border-[#E5E7EF] p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-1 text-[10px] font-bold text-[#1E2230] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#C9A227]" />
                      <span>Brief &amp; Artwork</span>
                    </div>
                    {activeReq.sketches && activeReq.sketches.length > 0 && (
                      <span className="text-slate-400 font-mono text-[9px]">{activeReq.sketches.length} Sketches</span>
                    )}
                  </div>

                  {/* Written Brief */}
                  <p className="text-[11px] text-[#1E2230] italic bg-white p-2 rounded-lg border border-[#E5E7EF] line-clamp-2">
                    "{activeReq.description || 'No specific written notes.'}"
                  </p>

                  {/* Sketches Strip */}
                  {activeReq.sketches && activeReq.sketches.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                      {activeReq.sketches.map((sk) => {
                        const imgUrl = sk.image_url || sk.image;
                        return (
                          <div
                            key={sk.id}
                            onClick={() => setLightboxImage(imgUrl)}
                            className="w-12 h-12 rounded-lg overflow-hidden border border-[#E5E7EF] cursor-pointer shrink-0 hover:border-[#C9A227]"
                          >
                            <img src={imgUrl} alt="Sketch" className="w-full h-full object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. LIGHT NEGOTIATION LOG */}
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

