import React, { useState, useEffect, useRef } from 'react';
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
  Sliders,
  Download,
  Eye,
  Search,
  RefreshCw,
  User,
  Mail,
  Phone,
  Clock,
  DollarSign,
  Tag,
  FileText,
  Trash2,
  Volume2,
  Mic,
  Play,
  Cloud,
  ExternalLink,
  Send,
  MessageSquare,
  BellRing,
  XCircle,
  Sparkles,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { 
  playNegotiationRing, 
  triggerNegotiationAlert, 
  requestDesktopNotificationPermission 
} from '../../utils/negotiationNotificationHelper';

export const USD_TO_INR_RATE = 86.85;

export const formatDualCurrency = (amount: number | string | null | undefined, currency: string = 'USD') => {
  if (amount == null || amount === '') return '—';
  const val = Number(amount);
  if (isNaN(val)) return String(amount);
  if (currency.toUpperCase() === 'INR') {
    const inr = Math.round(val);
    const usd = (val / USD_TO_INR_RATE).toFixed(2);
    return `₹${inr.toLocaleString('en-IN')} (≈ $${usd} USD)`;
  } else {
    const usd = val.toFixed(2);
    const inr = Math.round(val * USD_TO_INR_RATE);
    return `$${usd} USD (≈ ₹${inr.toLocaleString('en-IN')})`;
  }
};

export interface FileEditNegotiationMsg {
  id: number;
  sender?: 'client' | 'admin';
  sender_type?: 'client' | 'admin';
  sender_name?: string;
  message: string;
  price_offer?: number | null;
  offered_price?: number | null;
  currency?: string;
  offered_price_usd?: number | null;
  offered_price_inr?: number | null;
  created_at: string;
}

export interface FileEditRequestItem {
  id: number;
  client: number;
  client_name: string;
  client_email?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  original_file: string;
  original_file_format: string;
  original_file_name?: string;
  storage_provider?: 'local' | 'gdrive' | string;
  drive_file_id?: string;
  drive_web_view_link?: string;
  download_url?: string;
  file_size_bytes?: number;
  modification_types: number[];
  modification_type_labels: string[];
  target_weight_grams?: number | null;
  target_stone_size?: string | null;
  description: string;
  reference_image?: string | null;
  voice_note?: string | null;
  status: 'new' | 'quoted' | 'negotiating' | 'agreed' | 'rejected';
  submission_intent: 'quote_only' | 'place_order';
  currency?: string;
  estimated_price_shown?: string | number | null;
  estimated_price_shown_usd?: number | null;
  estimated_price_shown_inr?: number | null;
  agreed_price?: string | number | null;
  agreed_price_usd?: number | null;
  agreed_price_inr?: number | null;
  quoted_price?: number | null;
  quoted_price_usd?: number | null;
  quoted_price_inr?: number | null;
  admin_notes?: string;
  rejection_reason?: string;
  messages?: FileEditNegotiationMsg[];
  created_at: string;
}

export const AdminFileEditsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'mod_types'>('requests');
  
  // Data States
  const [requests, setRequests] = useState<FileEditRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [modTypes, setModTypes] = useState<ModificationTypeData[]>([]);
  const [loadingModTypes, setLoadingModTypes] = useState(true);

  // Status & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'quoted' | 'negotiating' | 'agreed' | 'rejected'>('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected Request Modal State
  const [selectedReq, setSelectedReq] = useState<FileEditRequestItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Action Form Inputs
  const [quoteCurrency, setQuoteCurrency] = useState<'USD' | 'INR'>('USD');
  const [negotiateCurrency, setNegotiateCurrency] = useState<'USD' | 'INR'>('USD');
  const [quotePriceInput, setQuotePriceInput] = useState<string>('');
  const [quoteMessageInput, setQuoteMessageInput] = useState<string>('');
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');
  const [adminNotesInput, setAdminNotesInput] = useState<string>('');
  const [negotiatePriceInput, setNegotiatePriceInput] = useState<string>('');
  const [negotiateMessageInput, setNegotiateMessageInput] = useState<string>('');

  // Real-Time Alerts & Sound State
  const [liveAlertBanner, setLiveAlertBanner] = useState<{
    reqId: number;
    title: string;
    message: string;
  } | null>(null);
  const knownReqIdsRef = useRef<Set<number>>(new Set());
  const lastClientMsgIdsRef = useRef<{ [reqId: number]: number }>({});
  const isFirstFetchRef = useRef<boolean>(true);
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  // Modal State for Edit/Create Modification Type
  const [isModModalOpen, setIsModModalOpen] = useState(false);
  const [editingMod, setEditingMod] = useState<Partial<ModificationTypeData> | null>(null);
  const [isSubmittingMod, setIsSubmittingMod] = useState(false);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fetchRequests = async (isBackground = false) => {
    if (!isBackground) setLoadingRequests(true);
    try {
      await api.ensureAdminToken();
      const data: FileEditRequestItem[] = await api.getFileEditRequests();
      const safeData = data || [];
      setRequests(safeData);

      // Keep open request synchronized with fresh live data
      setSelectedReq((current) => {
        if (!current) return null;
        const fresh = safeData.find((r) => r.id === current.id);
        return fresh || current;
      });

      // Realtime Notification Detection
      if (!isFirstFetchRef.current) {
        // 1. Detect new requests
        const newOnes = safeData.filter((r) => !knownReqIdsRef.current.has(r.id));
        if (newOnes.length > 0) {
          playNegotiationRing();
          const newest = newOnes[0];
          triggerNegotiationAlert({
            title: `Shiuli CAD: New CAD File Edit Order #${newest.id}`,
            body: `Customer ${newest.contact_name || newest.client_name || 'Client'} submitted a new CAD edit order.`,
            onClick: () => handleOpenRequestDetail(newest),
          });
          setLiveAlertBanner({
            reqId: newest.id,
            title: `New CAD File Edit Order #${newest.id} Received!`,
            message: `Customer ${newest.contact_name || newest.client_name} requested: ${newest.modification_type_labels?.join(', ') || 'Modifications'}`,
          });
        }

        // 2. Detect incoming customer negotiation messages
        safeData.forEach((r) => {
          const clientMsgs = (r.messages || []).filter((m) => m.sender === 'client');
          const latestClientMsg = clientMsgs[clientMsgs.length - 1];
          if (latestClientMsg && latestClientMsg.id) {
            const prevId = lastClientMsgIdsRef.current[r.id] || 0;
            if (latestClientMsg.id > prevId) {
              lastClientMsgIdsRef.current[r.id] = latestClientMsg.id;
              playNegotiationRing();
              triggerNegotiationAlert({
                title: `Shiuli CAD: Customer Counter-Offer on #FED-${r.id}`,
                body: `${latestClientMsg.message || 'Customer responded with a counter-offer'}${latestClientMsg.price_offer ? ` ($${latestClientMsg.price_offer})` : ''}`,
                onClick: () => handleOpenRequestDetail(r),
              });
              setLiveAlertBanner({
                reqId: r.id,
                title: `Customer Response on #FED-${r.id}`,
                message: `${latestClientMsg.message || 'Counter offer sent'}${latestClientMsg.price_offer ? ` (Offered $${latestClientMsg.price_offer})` : ''}`,
              });
            }
          }
        });
      }

      // Update refs
      safeData.forEach((r) => {
        knownReqIdsRef.current.add(r.id);
        const clientMsgs = (r.messages || []).filter((m) => m.sender === 'client');
        const latestClientMsg = clientMsgs[clientMsgs.length - 1];
        if (latestClientMsg?.id) {
          if (!lastClientMsgIdsRef.current[r.id]) {
            lastClientMsgIdsRef.current[r.id] = latestClientMsg.id;
          }
        }
      });
      isFirstFetchRef.current = false;
    } catch (err: any) {
      if (!isBackground) {
        console.error('Failed to load file edit requests:', err);
        setErrorMsg(err.message || 'Failed to load submitted file edit requests.');
      }
    } finally {
      if (!isBackground) setLoadingRequests(false);
    }
  };

  const loadModTypes = async () => {
    setLoadingModTypes(true);
    try {
      const data = await api.getModificationTypes();
      setModTypes(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load modification types.');
    } finally {
      setLoadingModTypes(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    loadModTypes();

    // Live polling every 7 seconds for real-time customer submissions & negotiation updates
    const interval = setInterval(() => {
      fetchRequests(true);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleEnableDesktopAlerts = async () => {
    const granted = await requestDesktopNotificationPermission();
    setDesktopAlertsEnabled(granted);
    if (granted) {
      playNegotiationRing();
    }
  };

  const handleOpenRequestDetail = (req: FileEditRequestItem) => {
    setSelectedReq(req);
    const cur = (req.currency || 'USD').toUpperCase() as 'USD' | 'INR';
    setQuoteCurrency(cur === 'INR' ? 'INR' : 'USD');
    setNegotiateCurrency(cur === 'INR' ? 'INR' : 'USD');
    setQuotePriceInput(req.agreed_price ? String(req.agreed_price) : (req.quoted_price ? String(req.quoted_price) : ''));
    setQuoteMessageInput('');
    setRejectReasonInput(req.rejection_reason || '');
    setAdminNotesInput(req.admin_notes || '');
    setNegotiatePriceInput('');
    setNegotiateMessageInput('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  // ACTION 1: SEND OFFICIAL QUOTE
  const handleSendOfficialQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    const priceNum = parseFloat(quotePriceInput);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Please enter a valid quotation price amount.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updated = await api.quoteFileEditRequest(selectedReq.id, priceNum, quoteMessageInput, quoteCurrency);
      const disp = formatDualCurrency(priceNum, quoteCurrency);
      setSuccessMsg(`Official Quotation of ${disp} sent to customer (${selectedReq.contact_name || selectedReq.client_name}). Customer has been notified.`);
      setSelectedReq(updated);
      setQuoteMessageInput('');
      await fetchRequests(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send official quote.');
    } finally {
      setActionLoading(false);
    }
  };

  // ACTION 2: ACCEPT CLIENT COUNTER-OFFER & CONFIRM ORDER
  const handleAcceptClientOffer = async (targetPrice?: number | null, offerCurrency?: string) => {
    if (!selectedReq) return;
    const cur = offerCurrency || selectedReq.currency || 'USD';
    const priceText = targetPrice ? ` at ${formatDualCurrency(targetPrice, cur)}` : '';
    if (!window.confirm(`Accept customer's counter-offer${priceText} for CAD File Edit Order #FED-${selectedReq.id}? This will lock the agreed price and confirm the order.`)) {
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updated = await api.acceptFileEditQuote(selectedReq.id);
      setSuccessMsg(`Customer counter-offer${priceText} ACCEPTED! Order #FED-${selectedReq.id} confirmed.`);
      setSelectedReq(updated);
      await fetchRequests(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept client counter-offer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveOrder = async () => {
    await handleAcceptClientOffer();
  };

  // ACTION 3: REJECT / DECLINE ORDER
  const handleRejectOrder = async () => {
    if (!selectedReq) return;
    if (!rejectReasonInput.trim()) {
      setErrorMsg('Please specify a rejection reason for the client before declining.');
      return;
    }
    if (!window.confirm(`Decline CAD File Edit Order #FED-${selectedReq.id}? Customer will be notified with your stated reason.`)) {
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updated = await api.rejectFileEditRequest(selectedReq.id, rejectReasonInput.trim());
      setSuccessMsg(`Order #FED-${selectedReq.id} declined. Rejection notification sent to client.`);
      setSelectedReq(updated);
      await fetchRequests(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject request.');
    } finally {
      setActionLoading(false);
    }
  };

  // ACTION 4: NEGOTIATE / QUICK COUNTER-OFFER
  const handleSendAdminNegotiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    const priceNum = negotiatePriceInput ? parseFloat(negotiatePriceInput) : undefined;
    if (!negotiateMessageInput.trim() && priceNum === undefined) {
      setErrorMsg('Please enter either a message or a counter-price offer.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updated = await api.negotiateFileEditRequest(selectedReq.id, {
        price: priceNum,
        message: negotiateMessageInput.trim(),
        currency: negotiateCurrency,
      });
      const disp = priceNum ? ` (${formatDualCurrency(priceNum, negotiateCurrency)})` : '';
      setSuccessMsg(`Negotiation reply & counter-offer${disp} sent to customer.`);
      setSelectedReq(updated);
      setNegotiateMessageInput('');
      setNegotiatePriceInput('');
      await fetchRequests(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send negotiation reply.');
    } finally {
      setActionLoading(false);
    }
  };

  // ACTION 5: SAVE INTERNAL ADMIN NOTES
  const handleSaveAdminNotes = async () => {
    if (!selectedReq) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updated = await api.updateFileEditNotes(selectedReq.id, adminNotesInput);
      setSuccessMsg('Internal studio notes saved successfully.');
      setSelectedReq(updated);
      await fetchRequests(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save admin notes.');
    } finally {
      setActionLoading(false);
    }
  };

  const [deletingModId, setDeletingModId] = useState<number | null>(null);

  // Modification Type Handlers
  const handleOpenEditMod = (mod?: ModificationTypeData) => {
    if (mod) {
      setEditingMod({ ...mod });
    } else {
      setEditingMod({
        key: '',
        label: '',
        description: '',
        base_price: 75.0,
        icon: 'Wrench',
        is_active: true,
        display_order: modTypes.length + 1,
      });
    }
    setIsModModalOpen(true);
  };

  const handleSaveMod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMod || !editingMod.label?.trim()) return;
    setIsSubmittingMod(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const generatedKey = editingMod.key?.trim() || editingMod.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const payload = {
        ...editingMod,
        key: generatedKey,
      };

      if (editingMod.id) {
        await api.updateModificationType(editingMod.id, payload);
        setSuccessMsg(`Modification type "${editingMod.label}" updated successfully.`);
      } else {
        await api.createModificationType(payload);
        setSuccessMsg(`New modification type "${editingMod.label}" created successfully.`);
      }
      setIsModModalOpen(false);
      setEditingMod(null);
      await loadModTypes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save modification type.');
    } finally {
      setIsSubmittingMod(false);
    }
  };

  const handleDeleteMod = async (mod: ModificationTypeData) => {
    if (!window.confirm(`Are you sure you want to delete modification type "${mod.label}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingModId(mod.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.deleteModificationType(mod.id);
      setSuccessMsg(`Modification type "${mod.label}" deleted successfully.`);
      if (isModModalOpen && editingMod?.id === mod.id) {
        setIsModModalOpen(false);
        setEditingMod(null);
      }
      await loadModTypes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete modification type.');
    } finally {
      setDeletingModId(null);
    }
  };

  // Filtered Requests
  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' ? true : r.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const nameMatch = (r.contact_name || r.client_name || '').toLowerCase().includes(q);
    const emailMatch = (r.contact_email || r.client_email || '').toLowerCase().includes(q);
    const formatMatch = (r.original_file_format || '').toLowerCase().includes(q);
    const idMatch = `fed-${r.id}`.includes(q) || `#${r.id}`.includes(q);
    return matchesStatus && (nameMatch || emailMatch || formatMatch || idMatch || q === '');
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'quoted':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'negotiating':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'agreed':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'rejected':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const mb = bytes / (1024 * 1024);
    return `(${mb.toFixed(1)} MB)`;
  };

  return (
    <div className="space-y-6">
      {/* Real-time Notification Banner */}
      {liveAlertBanner && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FFFDF7] via-[#FFF8EC] to-[#FFF4DE] border-2 border-[#D4AF37] shadow-[0_8px_25px_rgba(212,175,55,0.18)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B1330] border border-[#D4AF37] flex items-center justify-center text-[#F5E7A3] shrink-0 shadow-sm">
              <BellRing className="w-5 h-5 text-[#F5E7A3] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#0B1330] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-wider">
                  REAL-TIME ALERT
                </span>
                <span className="text-xs font-mono font-bold text-[#0B1330]">
                  {liveAlertBanner.title}
                </span>
              </div>
              <p className="text-xs text-[#2A3547] mt-1 font-medium">
                {liveAlertBanner.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const req = requests.find((r) => r.id === liveAlertBanner.reqId);
                if (req) handleOpenRequestDetail(req);
                setLiveAlertBanner(null);
              }}
              className="px-4 py-2 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
            >
              Review Order →
            </button>
            <button
              type="button"
              onClick={() => setLiveAlertBanner(null)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1330]/5 text-[#0B1330] text-xs font-semibold uppercase tracking-wider mb-2">
            <Wrench className="w-3.5 h-3.5 text-[#D4AF37]" />
            SuperAdmin CAD File Studio
          </div>
          <h2 className="text-2xl font-bold text-slate-900">CAD File Edit Requests & Studio CMS</h2>
          <p className="text-slate-500 text-xs mt-1">
            Real-time management for client 3D modification orders (.3dm, .stl, .obj, .step), Google Drive cloud vault (&gt;50MB), price quoting, and two-way negotiation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleEnableDesktopAlerts}
            className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              desktopAlertsEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-200 text-slate-600 hover:border-[#D4AF37]'
            }`}
          >
            {desktopAlertsEnabled ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Audio Alert Active</span>
              </>
            ) : (
              <>
                <BellRing className="w-3.5 h-3.5 text-[#B88732]" />
                <span>Enable Order Audio Alerts</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              fetchRequests();
              loadModTypes();
            }}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRequests || loadingModTypes ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>

          {activeTab === 'mod_types' && (
            <button
              onClick={() => handleOpenEditMod()}
              className="px-4 py-2.5 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" /> Add Modification Type
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            activeTab === 'requests'
              ? 'bg-[#0B1330] text-[#F5E7A3] shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4 text-[#D4AF37]" />
          Submitted CAD Edit Requests
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'requests' ? 'bg-[#D4AF37]/20 text-[#F5E7A3]' : 'bg-slate-200 text-slate-700'
          }`}>
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('mod_types')}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            activeTab === 'mod_types'
              ? 'bg-[#0B1330] text-[#F5E7A3] shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#D4AF37]" />
          Modification Options & Pricing Rules
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'mod_types' ? 'bg-[#D4AF37]/20 text-[#F5E7A3]' : 'bg-slate-200 text-slate-700'
          }`}>
            {modTypes.length}
          </span>
        </button>
      </div>

      {/* System Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* TAB 1: SUBMITTED CAD REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by client name, email, ID, format..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {(['all', 'new', 'quoted', 'negotiating', 'agreed', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-[#0B1330] text-[#F5E7A3]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table of Requests */}
          {loadingRequests ? (
            <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /> Loading submitted CAD file edit requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200 space-y-2">
              <FileCode className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold">No CAD File Edit Requests found.</p>
              <p className="text-xs text-slate-400">When clients submit CAD files on the File Editing page, they will appear here in real time.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Req ID</th>
                      <th className="px-5 py-3.5">Client Contact</th>
                      <th className="px-5 py-3.5">3D File & Storage</th>
                      <th className="px-5 py-3.5">Modifications</th>
                      <th className="px-5 py-3.5">Target Specs</th>
                      <th className="px-5 py-3.5">Intent</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Quote / Price</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">
                          #FED-{req.id}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 text-xs">
                            {req.contact_name || req.client_name || 'Client'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {req.contact_email || req.client_email}
                          </div>
                          {req.contact_phone && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {req.contact_phone}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[#0B1330] text-[#F5E7A3] font-mono text-[10px] font-bold uppercase">
                              .{req.original_file_format || 'cad'}
                            </span>
                            {req.storage_provider === 'gdrive' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold inline-flex items-center gap-1">
                                <Cloud className="w-3 h-3 text-emerald-600" /> Google Drive
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">Local Vault</span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <a
                              href={req.download_url || req.original_file || req.drive_web_view_link}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="inline-flex items-center gap-1 text-[#0B1330] hover:underline font-semibold text-[11px]"
                            >
                              <Download className="w-3 h-3 text-[#D4AF37]" /> Download CAD {formatFileSize(req.file_size_bytes)}
                            </a>
                          </div>
                        </td>
                        <td className="px-5 py-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {req.modification_type_labels?.length > 0 ? (
                              req.modification_type_labels.map((lbl, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                                  {lbl}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">Custom edits</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[11px] font-mono">
                          {req.target_weight_grams && (
                            <div>Weight: <strong className="text-slate-900">{req.target_weight_grams}g</strong></div>
                          )}
                          {req.target_stone_size && (
                            <div className="truncate max-w-[140px]" title={req.target_stone_size}>
                              Stone: <span className="text-slate-700">{req.target_stone_size}</span>
                            </div>
                          )}
                          {!req.target_weight_grams && !req.target_stone_size && (
                            <span className="text-slate-400">Standard</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.submission_intent === 'place_order'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {req.submission_intent === 'place_order' ? 'Direct Order' : 'Quote Request'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {req.agreed_price ? (
                            <div className="space-y-0.5">
                              <span className="text-emerald-700 font-bold block text-xs">
                                {formatDualCurrency(req.agreed_price, req.currency || 'USD')}
                              </span>
                              <span className="text-[10px] font-mono text-emerald-600 block">Agreed</span>
                            </div>
                          ) : req.quoted_price ? (
                            <div className="space-y-0.5">
                              <span className="text-blue-700 font-bold block text-xs">
                                {formatDualCurrency(req.quoted_price, req.currency || 'USD')}
                              </span>
                              <span className="text-[10px] font-mono text-blue-600 block">Quoted</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">Pending</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleOpenRequestDetail(req)}
                            className="px-3 py-1.5 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-[11px] rounded-lg flex items-center gap-1.5 ml-auto shadow-sm transition-all"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" /> Review &amp; Actions
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MODIFICATION OPTIONS & PRICING RULES */}
      {activeTab === 'mod_types' && (
        <div className="space-y-4">
          {loadingModTypes ? (
            <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditMod(mod)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Edit Modification Type"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMod(mod)}
                        disabled={deletingModId === mod.id}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="Delete Modification Type"
                      >
                        {deletingModId === mod.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REQUEST DETAIL & ACTION MODAL */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 sticky top-0 bg-white z-10">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold font-mono text-[#0B1330]">
                  <FileCode className="w-4 h-4 text-[#D4AF37]" /> #FED-{selectedReq.id}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(selectedReq.status)}`}>
                    {selectedReq.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  CAD File Modification Request Review &amp; Actions
                </h3>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Client Contact</span>
                <p className="font-bold text-slate-900 mt-1">{selectedReq.contact_name || selectedReq.client_name}</p>
                <p className="text-slate-600">{selectedReq.contact_email || selectedReq.client_email}</p>
                {selectedReq.contact_phone && <p className="text-slate-500 font-mono mt-0.5">{selectedReq.contact_phone}</p>}
              </div>

              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Order Parameters</span>
                <span className="font-bold text-[#0B1330] inline-block mt-1">
                  {selectedReq.submission_intent === 'place_order' ? 'Direct Order Assessment' : 'Quote Request Only'}
                </span>
                <div className="text-slate-500 text-[11px] mt-1 space-y-0.5 font-mono">
                  {selectedReq.target_weight_grams && <div>Target Metal Weight: <strong>{selectedReq.target_weight_grams}g</strong></div>}
                  {selectedReq.target_stone_size && <div>Target Stone Specs: <strong>{selectedReq.target_stone_size}</strong></div>}
                  <div className="text-slate-400 text-[10px]">Submitted: {new Date(selectedReq.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Source CAD File Card & Google Drive Status */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                <span>Source CAD File &amp; Storage Vault</span>
                {selectedReq.storage_provider === 'gdrive' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono inline-flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" /> Google Drive Cloud Storage (&gt;50MB)
                  </span>
                )}
              </h4>

              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl">
                <div className="flex items-center gap-2.5 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded bg-[#D4AF37] text-slate-950 font-bold uppercase">
                    .{selectedReq.original_file_format || 'cad'}
                  </span>
                  <div>
                    <span className="font-bold text-white block truncate max-w-xs">
                      {selectedReq.original_file_name || selectedReq.original_file?.split('/').pop() || 'Customer CAD Model'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedReq.storage_provider === 'gdrive' ? 'Uploaded directly to Google Drive' : 'Stored in Studio Vault'} {formatFileSize(selectedReq.file_size_bytes)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedReq.drive_web_view_link && (
                    <a
                      href={selectedReq.drive_web_view_link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[#F5E7A3] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View on Drive
                    </a>
                  )}
                  <a
                    href={selectedReq.download_url || selectedReq.original_file || selectedReq.drive_web_view_link}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="px-4 py-2 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download File {formatFileSize(selectedReq.file_size_bytes)}
                  </a>
                </div>
              </div>

              {selectedReq.modification_type_labels?.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-700">Requested Modification Types:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedReq.modification_type_labels.map((lbl, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold">
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description / Client Brief */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Client Detailed Instructions</h4>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-mono">
                {selectedReq.description || 'No additional instructions provided.'}
              </div>
            </div>

            {/* Reference Image */}
            {selectedReq.reference_image && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Reference Image / Mark-up</h4>
                <div className="relative group w-32 h-32 rounded-xl overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setLightboxImage(selectedReq.reference_image || null)}>
                  <img src={selectedReq.reference_image} alt="Reference" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}

            {/* Voice Note & Audio Instructions */}
            {selectedReq.voice_note && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#D4AF37]" /> Client Voice Note / Audio Instructions
                </h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <audio controls src={selectedReq.voice_note} className="w-full sm:w-80 h-9" />
                  <a
                    href={selectedReq.voice_note}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1330] text-[#F5E7A3] text-xs font-bold rounded-lg shrink-0 shadow-sm hover:bg-[#121F4D] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4AF37]" /> Download Audio
                  </a>
                </div>
              </div>
            )}

            {/* LIVE NEGOTIATION THREAD LOG */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#D4AF37]" /> Negotiation &amp; Message History
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedReq.messages?.length || 0} message(s)
                </span>
              </div>

              {selectedReq.messages && selectedReq.messages.length > 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 max-h-60 overflow-y-auto">
                  {selectedReq.messages.map((msg) => {
                    const isAdmin = msg.sender === 'admin' || msg.sender_type === 'admin';
                    const price = msg.price_offer != null ? msg.price_offer : msg.offered_price;
                    return (
                      <div key={msg.id} className={`flex gap-2.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-2xl max-w-sm text-xs space-y-1 shadow-xs ${
                          isAdmin 
                            ? 'bg-[#0B1330] text-white rounded-tr-none' 
                            : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                        }`}>
                          <div className={`flex items-center justify-between gap-4 text-[10px] pb-1 border-b ${
                            isAdmin ? 'border-white/10 text-slate-300' : 'border-slate-100 text-slate-500'
                          }`}>
                            <span className="font-bold">{isAdmin ? 'SuperAdmin (You)' : (msg.sender_name || 'Customer')}</span>
                            <span className="font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="leading-relaxed">{msg.message}</p>
                          {price != null && (
                            <div className={`mt-1.5 p-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-between ${
                              isAdmin ? 'bg-white/10 text-[#F5E7A3]' : 'bg-amber-50 text-amber-900 border border-amber-200'
                            }`}>
                              <span>Price Offer:</span>
                              <span>{formatDualCurrency(price, msg.currency || (isAdmin ? 'USD' : (selectedReq.currency || 'INR')))}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                  No previous negotiation messages. Send an official quote below to start the quotation flow.
                </p>
              )}

              {/* Two-Way Negotiation Reply Form */}
              <form onSubmit={handleSendAdminNegotiate} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#D4AF37]" /> Send Reply / Counter-Offer to Client
                  </span>
                  <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setNegotiateCurrency('USD')}
                      className={`px-2 py-0.5 rounded ${negotiateCurrency === 'USD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      $ USD
                    </button>
                    <button
                      type="button"
                      onClick={() => setNegotiateCurrency('INR')}
                      className={`px-2 py-0.5 rounded ${negotiateCurrency === 'INR' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      ₹ INR
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Message for customer..."
                      value={negotiateMessageInput}
                      onChange={(e) => setNegotiateMessageInput(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 font-mono">
                        {negotiateCurrency === 'USD' ? '$' : '₹'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={`Counter (${negotiateCurrency === 'USD' ? '$' : '₹'})`}
                        value={negotiatePriceInput}
                        onChange={(e) => setNegotiatePriceInput(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0B1330]"
                      />
                    </div>
                  </div>
                </div>
                {negotiatePriceInput && !isNaN(parseFloat(negotiatePriceInput)) && parseFloat(negotiatePriceInput) > 0 && (
                  <div className="text-[11px] font-mono text-slate-600 flex items-center justify-between px-1">
                    <span>Preview: <strong>{formatDualCurrency(parseFloat(negotiatePriceInput), negotiateCurrency)}</strong></span>
                    <span className="text-[10px] text-slate-400">1 USD = ₹86.85</span>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send Message &amp; Counter</span>
                  </button>
                </div>
              </form>
            </div>

            {/* SUPERADMIN DECISION & QUOTATION ACTIONS */}
            <div className="space-y-4 border-t border-slate-200 pt-5 bg-slate-50/80 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-3xl">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" /> SuperAdmin Actions: Quotation, Approval &amp; Decline
              </h4>

              {(() => {
                if (selectedReq.status === 'agreed') {
                  return (
                    <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-bold text-emerald-950 text-base block">CAD File Modification Order Agreed &amp; Confirmed!</span>
                          <span className="text-emerald-800 text-xs">
                            Agreed Final Price: <strong>{formatDualCurrency(selectedReq.agreed_price || selectedReq.quoted_price || 0, selectedReq.currency || 'USD')}</strong>. Client and studio agreement is locked. Proceeding with CAD modifications.
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-sm shrink-0">
                        <Check className="w-4 h-4" />
                        <span>ORDER AGREED</span>
                      </div>
                    </div>
                  );
                }

                if (selectedReq.status === 'rejected') {
                  return (
                    <div className="p-5 bg-rose-50 rounded-2xl border-2 border-rose-300 shadow-sm flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-bold text-rose-950 text-base block">Request Declined / Cancelled</span>
                        <span className="text-rose-800 text-xs block mt-0.5">
                          <strong>Reason:</strong> {selectedReq.rejection_reason || 'Specifications cannot be accommodated at this time.'}
                        </span>
                      </div>
                    </div>
                  );
                }

                const latestOfferMsg = selectedReq.messages && selectedReq.messages.length > 0
                  ? [...selectedReq.messages].reverse().find((m: any) => (m.offered_price != null || m.price_offer != null))
                  : null;
                const isLatestOfferFromAdmin = Boolean(
                  (latestOfferMsg && (latestOfferMsg.sender === 'admin' || latestOfferMsg.sender_type === 'admin')) ||
                  (!latestOfferMsg && selectedReq.status === 'quoted')
                );
                const isLatestOfferFromClient = Boolean(
                  latestOfferMsg && (latestOfferMsg.sender === 'client' || latestOfferMsg.sender_type === 'client')
                );
                const currentQuotedPrice = selectedReq.quoted_price != null
                  ? Number(selectedReq.quoted_price)
                  : (isLatestOfferFromAdmin ? Number(latestOfferMsg?.offered_price ?? latestOfferMsg?.price_offer ?? 0) : null);
                const clientCounterPrice = isLatestOfferFromClient
                  ? Number(latestOfferMsg?.offered_price ?? latestOfferMsg?.price_offer ?? 0)
                  : null;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* ACTION 1: SEND OFFICIAL QUOTE OR REVISED COUNTER */}
                    <form onSubmit={handleSendOfficialQuote} className="p-4 bg-white rounded-2xl border border-blue-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          {selectedReq.status === 'quoted' || selectedReq.status === 'negotiating'
                            ? 'Send Revised Studio Quote / Counter'
                            : 'Send Official Studio Quote'}
                        </span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded">
                          Notifies Customer
                        </span>
                      </div>

                      {/* Currency Selector Tabs */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Quotation Currency
                        </label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setQuoteCurrency('USD')}
                            className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              quoteCurrency === 'USD'
                                ? 'bg-white text-blue-900 shadow-xs border border-blue-200'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>$ USD (US Dollar)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuoteCurrency('INR')}
                            className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              quoteCurrency === 'INR'
                                ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>₹ INR (Indian Rupee)</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Quote Price ({quoteCurrency === 'USD' ? '$ USD' : '₹ INR'}) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 font-mono">
                              {quoteCurrency === 'USD' ? '$' : '₹'}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder={quoteCurrency === 'USD' ? (currentQuotedPrice ? currentQuotedPrice.toFixed(2) : 'e.g. 50.00') : 'e.g. 4350'}
                              value={quotePriceInput}
                              onChange={(e) => setQuotePriceInput(e.target.value)}
                              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                              required
                            />
                          </div>

                          {/* Real-Time Currency Conversion Preview */}
                          {quotePriceInput && !isNaN(parseFloat(quotePriceInput)) && parseFloat(quotePriceInput) > 0 && (
                            <div className="mt-1.5 p-2 rounded-lg bg-blue-50/80 border border-blue-200 text-[11px] text-blue-900 flex items-center justify-between font-mono">
                              <span className="text-slate-600 font-sans text-[10px] font-bold uppercase">Converted:</span>
                              <span className="font-bold text-blue-950">
                                {quoteCurrency === 'USD'
                                  ? `≈ ₹${Math.round(parseFloat(quotePriceInput) * USD_TO_INR_RATE).toLocaleString('en-IN')} INR`
                                  : `≈ $${(parseFloat(quotePriceInput) / USD_TO_INR_RATE).toFixed(2)} USD`}
                              </span>
                              <span className="text-[10px] text-slate-400 font-sans">(1 USD = ₹86.85)</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Quotation Notes / Terms</label>
                          <input
                            type="text"
                            placeholder="e.g. Delivery in 24 hours. Includes 2 revision cycles."
                            value={quoteMessageInput}
                            onChange={(e) => setQuoteMessageInput(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                        <span>
                          {selectedReq.status === 'quoted' || selectedReq.status === 'negotiating'
                            ? `Send Revised Quote (${quoteCurrency === 'USD' ? '$' : '₹'}${quotePriceInput || '0'})`
                            : `Send Official Quote (${quoteCurrency === 'USD' ? '$' : '₹'}${quotePriceInput || '0'})`}
                        </span>
                      </button>
                    </form>

                    {/* ACTION 2: STATUS-AWARE CUSTOMER DECISION / APPROVAL / REJECTION */}
                    <div className="space-y-4">
                      {/* Scenario A: Customer Counter-Offer is Waiting for Studio Admin Decision */}
                      {isLatestOfferFromClient && clientCounterPrice != null ? (
                        <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-400 shadow-sm space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                              <BellRing className="w-4 h-4 text-emerald-700 animate-pulse" /> Customer Counter-Offer Received
                            </span>
                            <span className="text-[10px] bg-emerald-200 text-emerald-900 font-mono font-black px-2 py-0.5 rounded">
                              ACTION REQUIRED
                            </span>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-600 font-semibold">Customer Offered Price:</span>
                              <span className="text-base font-extrabold font-mono text-emerald-700">
                                {formatDualCurrency(clientCounterPrice, latestOfferMsg?.currency || selectedReq.currency || 'INR')}
                              </span>
                            </div>
                            {latestOfferMsg?.message && (
                              <p className="text-[11px] text-slate-700 italic border-t border-slate-100 pt-1 mt-1">
                                "{latestOfferMsg.message}"
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAcceptClientOffer(clientCounterPrice, latestOfferMsg?.currency || selectedReq.currency || 'INR')}
                            disabled={actionLoading}
                            className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>
                              Accept Counter-Offer ({formatDualCurrency(clientCounterPrice, latestOfferMsg?.currency || selectedReq.currency || 'INR')}) &amp; Confirm Order
                            </span>
                          </button>
                          <p className="text-[10px] text-emerald-800 text-center">
                            Or use the form on the left to send a revised counter-offer.
                          </p>
                        </div>
                      ) : isLatestOfferFromAdmin ? (
                        /* Scenario B: Admin Sent Quote, Awaiting Customer Decision */
                        <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} /> Awaiting Customer Decision
                            </span>
                            <span className="text-[10px] bg-amber-200 text-amber-900 font-mono font-bold px-2 py-0.5 rounded">
                              AWAITING CLIENT
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-900 leading-relaxed">
                            Studio sent an official quote of <strong>{formatDualCurrency(currentQuotedPrice, selectedReq.currency || 'USD')}</strong>. The customer must review and either <strong>Accept</strong>, <strong>Decline</strong>, or send back a <strong>Counter-Offer</strong>.
                          </p>
                          <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Only the customer can accept this quote. Once the customer responds or counters, you can accept their offer here.</span>
                          </div>
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 bg-slate-200 text-slate-500 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                            title="Awaiting customer acceptance or counter-offer"
                          >
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>Awaiting Customer Acceptance ({formatDualCurrency(currentQuotedPrice, selectedReq.currency || 'USD')})</span>
                          </button>
                        </div>
                      ) : (
                        /* Scenario C: New request, quote has not yet been sent */
                        <div className="p-4 bg-slate-100 rounded-2xl border border-slate-300 shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <DollarSign className="w-4 h-4 text-slate-500" /> Step 1: Quote Required
                            </span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded">
                              NEW REQUEST
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Please assess the CAD file specifications and submit an official studio quote using the form on the left. The customer will review your quotation before order confirmation.
                          </p>
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 bg-slate-200 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                          >
                            <DollarSign className="w-4 h-4 text-slate-400" />
                            <span>Send Quote First to Start Flow</span>
                          </button>
                        </div>
                      )}

                      {/* Decline / Reject Option */}
                      <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-rose-600" /> Decline / Reject Request
                          </span>
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-mono font-bold px-2 py-0.5 rounded">
                            Sets REJECTED
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Reason for declining (e.g. Non-manifold mesh, cannot be repaired)..."
                          value={rejectReasonInput}
                          onChange={(e) => setRejectReasonInput(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-600"
                        />
                        <button
                          type="button"
                          onClick={handleRejectOrder}
                          disabled={actionLoading}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          <span>Decline Request &amp; Send Reason</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ACTION 4: INTERNAL ADMIN CONSULTATION NOTES */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#D4AF37]" /> Internal Studio Consultation Notes
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Private - Not seen by client</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="Private notes for studio team (e.g. Needs Rhino 7 SubD repair, assign to senior modeller)..."
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAdminNotes}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Internal Notes</span>
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Close Review Modal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODIFICATION TYPE MODAL */}
      {isModModalOpen && editingMod && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingMod.id ? `Edit Modification: ${editingMod.label}` : 'Create Modification Type'}
              </h3>
              <button
                onClick={() => setIsModModalOpen(false)}
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

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                {editingMod.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteMod(editingMod as ModificationTypeData)}
                    disabled={isSubmittingMod || deletingModId === editingMod.id}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Option
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMod}
                    className="px-6 py-2 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {isSubmittingMod ? <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> : 'Save Modification'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxImage} alt="Reference Full View" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
            <button className="absolute -top-4 -right-4 p-2 bg-white text-slate-900 rounded-full shadow-lg font-bold">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFileEditsModule;
