import React, { useState, useEffect } from 'react';
import { PageId, Product } from '../types';
import { useCatalog, toProductShape } from '../hooks/useCatalog';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PaymentGatewayModal } from '../components/payment/PaymentGatewayModal';
import { 
  User, 
  ShoppingBag, 
  Download, 
  Heart, 
  Clock, 
  CheckCircle2, 
  FileCode2, 
  Sparkles, 
  ArrowRight, 
  ExternalLink,
  ShieldCheck,
  Building,
  Gem,
  Send,
  MessageSquare,
  Loader2,
  FileText,
  Phone,
  Eye,
  X,
  PlusCircle,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Award,
  Star,
  Lock,
  CreditCard,
  Sliders,
  Calendar,
  Tag,
  Layers,
  Ruler,
  Printer,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Package
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';

import { appStore } from '../services/store';

import { OTPVerificationModal } from '../components/delivery/OTPVerificationModal';
import { OrderOTPVerificationModal } from '../components/delivery/OrderOTPVerificationModal';
import { UserProfileModule } from '../components/profile/UserProfileModule';

const formatINR = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '₹0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

interface ClientDashboardPageProps {
  onNavigate: (page: PageId, extraId?: string) => void;
  userEmail: string;
  wishlistIds: string[];
  onRemoveWishlist: (product: Product) => void;
  onAddToCart: (product: Product, license: 'standard' | 'commercial') => void;
}

export const ClientDashboardPage: React.FC<ClientDashboardPageProps> = ({
  onNavigate,
  userEmail,
  wishlistIds,
  onRemoveWishlist,
  onAddToCart,
}) => {
  const { isLoggedIn, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'custom' | 'downloads' | 'orders' | 'wishlist' | 'profile'>('custom');

  // Live State
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [loadingCustom, setLoadingCustom] = useState<boolean>(false);
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [counterPriceInput, setCounterPriceInput] = useState<{ [key: number]: string }>({});
  const [counterMessageInput, setCounterMessageInput] = useState<{ [key: number]: string }>({});
  const [showCounterForm, setShowCounterForm] = useState<{ [key: number]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState<{ [key: number]: boolean }>({});
  
  // Purchases & Secure Downloads State
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState<boolean>(false);
  const [resendingPurchaseId, setResendingPurchaseId] = useState<number | null>(null);

  const [reDeliveryOtpModalState, setReDeliveryOtpModalState] = useState<{
    isOpen: boolean;
    purchaseId: number;
    productTitle: string;
    maskedEmail: string;
  }>({
    isOpen: false,
    purchaseId: 0,
    productTitle: '',
    maskedEmail: '',
  });

  const [orderOtpModalState, setOrderOtpModalState] = useState<{
    isOpen: boolean;
    orderId: number;
    orderTitle: string;
    maskedEmail: string;
    debugOtp?: string;
  }>({
    isOpen: false,
    orderId: 0,
    orderTitle: '',
    maskedEmail: '',
  });

  
  // UI Expansion States
  const [expandedSpecs, setExpandedSpecs] = useState<{ [key: number]: boolean }>({});
  const [selectedSketchUrl, setSelectedSketchUrl] = useState<string | null>(null);
  const [specsModalRequest, setSpecsModalRequest] = useState<any | null>(null);
  const [previewLightboxOrder, setPreviewLightboxOrder] = useState<any | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);

  const fetchCustomRequests = async () => {
    setLoadingCustom(true);
    try {
      let dbRequests: any[] = [];
      try {
        const res = await api.request<any>('/custom-requests/');
        const ensureArray = (r: any) => {
          if (Array.isArray(r)) return r;
          if (r && Array.isArray(r.results)) return r.results;
          if (r && Array.isArray(r.data)) return r.data;
          return [];
        };
        dbRequests = ensureArray(res);
      } catch (err) {
        console.warn('Backend custom requests fetch error:', err);
      }

      // Strictly filter to ensure requests belong to the current authenticated user
      const currentUserEmail = (user?.email || userEmail || '').toLowerCase().trim();
      const currentUserId = user?.id;

      const userDbRequests = dbRequests.filter((req: any) => {
        if (!currentUserEmail && !currentUserId) return true;
        const matchesId = currentUserId && (String(req.client) === String(currentUserId) || String(req.client?.id) === String(currentUserId));
        const contactEmail = (req.contact_email || '').toLowerCase().trim();
        const clientEmailVal = (req.client_email || req.client?.email || '').toLowerCase().trim();
        const matchesEmail = currentUserEmail && (
          contactEmail === currentUserEmail ||
          clientEmailVal === currentUserEmail ||
          (contactEmail && currentUserEmail.startsWith(contactEmail.split('@')[0])) ||
          (clientEmailVal && currentUserEmail.startsWith(clientEmailVal.split('@')[0]))
        );
        const matchesUsername = user?.username && (
          req.client_name === user.username || 
          req.client?.username === user.username ||
          (req.client_name && user.username.includes(req.client_name))
        );
        return matchesId || matchesEmail || matchesUsername;
      });

      // Strictly filter local requests so user requests are accurately retrieved
      const localRequests = (appStore.getCustomRequests() || []).filter((loc: any) => {
        if (!currentUserEmail && !currentUserId) return true;
        const locEmail = (loc.clientEmail || loc.client_email || loc.contact_email || loc.email || '').toLowerCase().trim();
        const matchesEmail = currentUserEmail && (
          !locEmail ||
          locEmail === currentUserEmail ||
          (locEmail && currentUserEmail.startsWith(locEmail.split('@')[0]))
        );
        const matchesId = currentUserId && String(loc.clientId) === String(currentUserId);
        return matchesEmail || matchesId || !locEmail;
      });

      const combined = [...userDbRequests];

      localRequests.forEach((loc: any) => {
        if (!combined.some((c: any) => String(c.id) === String(loc.id))) {
          combined.push({
            id: loc.id,
            category_name: loc.jewelleryType || 'Custom Jewellery',
            aesthetic_style_name: loc.metalPreference || 'Luxury Style',
            metal_alloy_name: loc.metalPreference || 'Custom Gold',
            estimated_price_shown: parseFloat(String(loc.currentQuote || loc.targetBudget || '0').replace(/[^0-9.]/g, '')),
            status: loc.status || 'new',
            description: loc.description || 'Bespoke CAD Design Brief',
            reference_image: loc.referenceImage,
            created_at: loc.createdAt || 'Just now',
            messages: loc.messages || [],
            order: loc.order || null,
          });
        }
      });

      setCustomRequests(combined);
    } catch (e) {
      console.warn('Failed to fetch client custom requests:', e);
    } finally {
      setLoadingCustom(false);
    }
  };

  const fetchPurchases = async () => {
    setLoadingPurchases(true);
    try {
      const res = await api.request<any>('/payments/purchases/mine/');
      setPurchases(Array.isArray(res) ? res : []);
    } catch (e) {
      console.warn('Failed to fetch purchases:', e);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const fetchClientOrders = async () => {
    setLoadingOrders(true);
    const currentUserEmail = (user?.email || userEmail || '').toLowerCase().trim();
    const currentUserId = user?.id;

    try {
      const res = await api.request<any>('/orders/');
      const ensureArray = (r: any) => {
        if (Array.isArray(r)) return r;
        if (r && Array.isArray(r.results)) return r.results;
        if (r && Array.isArray(r.data)) return r.data;
        return [];
      };
      const rawOrders = ensureArray(res);
      const filtered = rawOrders.filter((ord: any) => {
        if (!currentUserEmail && !currentUserId) return true;
        const matchesId = currentUserId && (String(ord.client) === String(currentUserId) || String(ord.client?.id) === String(currentUserId));
        const ordEmail = (ord.client_email || ord.client?.email || ord.contact_email || '').toLowerCase().trim();
        const matchesEmail = currentUserEmail && (
          !ordEmail ||
          ordEmail === currentUserEmail ||
          (ordEmail && currentUserEmail.startsWith(ordEmail.split('@')[0]))
        );
        return matchesId || matchesEmail || !ordEmail;
      });
      setClientOrders(filtered);
    } catch (err) {
      console.warn('Failed to fetch client orders:', err);
      setClientOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchCustomRequests();
    fetchClientOrders();
    if (activeTab === 'downloads') {
      fetchPurchases();
    }
  }, [isLoggedIn, user, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewLightboxOrder(null);
        setSelectedSketchUrl(null);
        setSpecsModalRequest(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRequestRedelivery = async (purchaseId: number, productTitle: string) => {
    setResendingPurchaseId(purchaseId);
    try {
      const res = await api.post<any>(`/payments/purchases/${purchaseId}/resend-download-link/`);
      setReDeliveryOtpModalState({
        isOpen: true,
        purchaseId: purchaseId,
        productTitle: productTitle,
        maskedEmail: res.masked_email,
      });
      fetchPurchases();
    } catch (err: any) {
      alert(err.message || err.response?.data?.error || 'Failed to request re-delivery.');
    } finally {
      setResendingPurchaseId(null);
    }
  };

  const handleRequestOrderDownload = async (orderId: number, orderTitle: string) => {
    try {
      const res = await api.request<any>(`/orders/${orderId}/request-otp/`, {
        method: 'POST',
      });
      setOrderOtpModalState({
        isOpen: true,
        orderId,
        orderTitle,
        maskedEmail: res.masked_email || (user?.email ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 'your email'),
        debugOtp: res.debug_otp,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to request CAD download verification OTP.');
    }
  };

  const handleAcceptQuote = async (reqId: number) => {
    setIsSubmitting((prev) => ({ ...prev, [reqId]: true }));
    try {
      await api.request(`/custom-requests/${reqId}/accept-quote/`, {
        method: 'POST',
      });
      await fetchCustomRequests();
      await fetchClientOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to accept quote. Please try again.');
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [reqId]: false }));
    }
  };

  const handleSendCounterOffer = async (e: React.FormEvent, reqId: number) => {
    e.preventDefault();
    const priceStr = counterPriceInput[reqId];
    const message = counterMessageInput[reqId];
    if (!priceStr && !message) return;

    setIsSubmitting((prev) => ({ ...prev, [reqId]: true }));
    try {
      await api.request(`/custom-requests/${reqId}/negotiate/`, {
        method: 'POST',
        body: JSON.stringify({
          price: priceStr ? parseFloat(priceStr) : undefined,
          message: message || '',
        }),
      });
      setCounterPriceInput((prev) => ({ ...prev, [reqId]: '' }));
      setCounterMessageInput((prev) => ({ ...prev, [reqId]: '' }));
      fetchCustomRequests();
    } catch (err: any) {
      alert(err?.message || 'Failed to send counter-offer.');
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [reqId]: false }));
    }
  };

  const [stagePaymentModalState, setStagePaymentModalState] = useState<{
    isOpen: boolean;
    stageId: number;
    title: string;
    amount: number;
    percentage: number;
  }>({
    isOpen: false,
    stageId: 0,
    title: '',
    amount: 0,
    percentage: 0,
  });

  const handlePayStage = (stage: any) => {
    const isObj = typeof stage === 'object' && stage !== null;
    setStagePaymentModalState({
      isOpen: true,
      stageId: isObj ? stage.id : stage,
      title: (isObj ? (stage.stage_name || stage.label) : null) || 'Milestone CAD Stage Payment',
      amount: isObj ? (Number(stage.amount) || 0) : 0,
      percentage: isObj ? (Number(stage.percentage) || 0) : 0,
    });
  };

  const handleStagePaymentSuccess = async (result: any) => {
    try {
      await api.request('/payments/pay-stage/', {
        method: 'POST',
        body: JSON.stringify({
          stage_id: stagePaymentModalState.stageId,
          transaction_id: result.transactionId,
          payment_method: result.method,
        }),
      });
      setStagePaymentModalState((prev) => ({ ...prev, isOpen: false }));
      alert('Milestone stage payment confirmed & recorded!');
      fetchCustomRequests();
    } catch (err: any) {
      alert(err?.message || 'Stage payment recording failed.');
    }
  };

  const handleApproveDesignPreview = async (orderId: number) => {
    try {
      await api.request(`/orders/${orderId}/approve-design-preview/`, {
        method: 'POST',
      });
      alert('3D Design Preview Approved! Next milestone payment stage unlocked.');
      fetchCustomRequests();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve design preview.');
    }
  };

  const { products: catalogProducts } = useCatalog();
  const wishlistedProducts = React.useMemo(() => {
    return catalogProducts
      .map(toProductShape)
      .filter((p) => wishlistIds.includes(p.id));
  }, [catalogProducts, wishlistIds]);

  const handleSimulateDownload = (productTitle: string, fileType: string) => {
    const text = `SHIULI CAD STUDIO — MASTER DELIVERABLE
Product: ${productTitle}
File Format: ${fileType}
Tolerance: 0.02mm
Mesh Integrity: 100% Watertight Solid (Zero Non-Manifold Edges)
Shrinkage Allowance: 1.25% Gold/Platinum pre-scaled
License: Atelier Studio Production
Client Account: ${userEmail}
Support Contact: hello@shiulicadstudio.com | Phone: +91 95747 87098`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productTitle.replace(/\s+/g, '_')}_${fileType}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#070D22] text-[#F5F1E8] pt-24 pb-24 px-4 sm:px-8 lg:px-12">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* HEADER PROFILE BANNER */}
        <RevealOnScroll className="relative rounded-3xl bg-gradient-to-r from-[#0A1230] via-[#12204D] to-[#080E26] border-2 border-[#D4AF37]/40 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#1E4FA3] via-[#D4AF37] to-[#F5E7A3] p-[2.5px] shadow-[0_0_20px_rgba(212,175,55,0.4)] overflow-hidden">
                {user?.profile_photo ? (
                  <img src={user.profile_photo} alt={user.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#070D22] flex items-center justify-center text-[#F5E7A3]">
                    <User className="w-9 h-9 text-[#F5E7A3]" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-2xl font-extrabold text-[#FAF8F3]">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Client Atelier Workspace'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[10px] text-[#F5E7A3] font-mono uppercase tracking-widest font-bold">
                    {user?.role?.toUpperCase() || 'VERIFIED CLIENT'}
                  </span>
                </div>
                <p className="text-xs text-[#C9C2A6] font-mono">{user?.email || userEmail || 'rutasahir855@gmail.com'}</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('custom-design')}
              className="btn-gold-luxury px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            >
              <Sparkles className="w-4 h-4 text-[#0B1330]" />
              <span>+ Start Custom Brief</span>
            </button>
          </div>
        </RevealOnScroll>

        {/* LUXURY NAVIGATION TABS */}
        <div className="flex border-b-2 border-[#D4AF37]/25 overflow-x-auto gap-2 sm:gap-4 text-xs sm:text-sm font-serif">
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-5 py-3.5 rounded-t-2xl flex items-center gap-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'custom'
                ? 'bg-[#12204D] text-[#F5E7A3] border-t-2 border-x-2 border-[#D4AF37] shadow-lg'
                : 'text-[#C9C2A6] hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-[#D4AF37]" />
            <span>Custom Requests &amp; Journey ({customRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('downloads')}
            className={`px-5 py-3.5 rounded-t-2xl flex items-center gap-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'downloads'
                ? 'bg-[#12204D] text-[#F5E7A3] border-t-2 border-x-2 border-[#D4AF37] shadow-lg'
                : 'text-[#C9C2A6] hover:text-white'
            }`}
          >
            <Download className="w-4 h-4 text-[#7EACFC]" />
            <span>My CAD Vault ({purchases.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-3.5 rounded-t-2xl flex items-center gap-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-[#12204D] text-[#F5E7A3] border-t-2 border-x-2 border-[#D4AF37] shadow-lg'
                : 'text-[#C9C2A6] hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
            <span>Order History ({clientOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`px-5 py-3.5 rounded-t-2xl flex items-center gap-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'wishlist'
                ? 'bg-[#12204D] text-[#F5E7A3] border-t-2 border-x-2 border-[#D4AF37] shadow-lg'
                : 'text-[#C9C2A6] hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-400" />
            <span>Wishlist ({wishlistIds.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-3.5 rounded-t-2xl flex items-center gap-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-[#12204D] text-[#F5E7A3] border-t-2 border-x-2 border-[#D4AF37] shadow-lg'
                : 'text-[#C9C2A6] hover:text-white'
            }`}
          >
            <User className="w-4 h-4 text-[#D4AF37]" />
            <span>My Profile &amp; Security</span>
          </button>
        </div>

        {/* TAB 1: CONTINUOUS VERTICAL JOURNEY TIMELINE */}
        {activeTab === 'custom' && (
          <div className="space-y-12">
            {loadingCustom ? (
              <div className="py-24 rounded-3xl bg-[#09112B] border border-[#D4AF37]/30 flex flex-col items-center justify-center gap-4 text-xs text-[#C9C2A6] shadow-2xl">
                <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
                <span className="font-serif text-base text-[#F5E7A3]">Loading Custom Atelier Orders...</span>
              </div>
            ) : customRequests.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-[#09112B] border-2 border-dashed border-[#D4AF37]/30 space-y-6 shadow-2xl">
                <Sparkles className="w-12 h-12 text-[#D4AF37] mx-auto" />
                <h4 className="font-serif text-2xl text-[#FAF8F3]">No Custom CAD Orders Active</h4>
                <p className="text-xs text-[#C9C2A6] max-w-md mx-auto">
                  Submit a custom design brief with reference sketches and metal choices to collaborate directly with our senior CAD artisans.
                </p>
                <button
                  onClick={() => onNavigate('custom-design')}
                  className="btn-gold-luxury px-8 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-widest inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4 text-[#0B1330]" />
                  <span>Start Bespoke CAD Order</span>
                </button>
              </div>
            ) : (
              customRequests.map((req) => {
                const order = req.order || clientOrders.find((o: any) => o.custom_request?.id === req.id || String(o.id) === String(req.order?.id));
                const assignedStaff = order?.assigned_staff;
                const hasOfficialQuote = Boolean(req.agreed_price || req.status === 'quoted' || req.status === 'agreed' || order?.total_price);
                const totalVal = hasOfficialQuote ? parseFloat(req.agreed_price || order?.total_price || req.estimated_price_shown || '0') : 0;
                
                // Calculate paid amount
                let paidVal = 0;
                if (order?.payment_stages && order.payment_stages.length > 0) {
                  paidVal = order.payment_stages
                    .filter((st: any) => st.status === 'paid')
                    .reduce((acc: number, st: any) => acc + parseFloat(st.amount || '0'), 0);
                }

                const isFullyPaid = Boolean(order?.payment_stages && order.payment_stages.length > 0 && order.payment_stages.every((st: any) => st.status === 'paid'));
                const paidPct = totalVal > 0 ? Math.min(100, Math.round((paidVal / totalVal) * 100)) : 0;

                return (
                  <div key={req.id} className="space-y-8 border-b border-[#D4AF37]/20 pb-16">
                    {/* 1. TOP ORDER SUMMARY BAND */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-mono font-bold text-[#D4AF37]">
                            REQ #{req.id} {order ? `• ORDER #${order.id}` : ''}
                          </span>
                          
                          {/* Elegant Single Status Pill */}
                          <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#12204D] border border-[#D4AF37]/50 text-[#F5E7A3] flex items-center gap-2 shadow-md">
                            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                            {assignedStaff
                              ? `In Design • With ${assignedStaff.first_name || assignedStaff.username || 'Assigned Artisan'}`
                              : req.status === 'agreed' || order
                              ? 'Awaiting Booking Payment (10%)'
                              : req.status === 'quoted'
                              ? 'Official Quote Received'
                              : 'Submitted • In Review'}
                          </span>
                        </div>

                        {(() => {
                          const selMetal = req.selections?.find((s: any) => s.group_key === 'metal' || s.group_label?.toLowerCase().includes('metal'));
                          const metalName = selMetal?.value_label || req.metal_alloy_name;
                          const selPurity = req.selections?.find((s: any) => s.group_key === 'purity' || s.group_label?.toLowerCase().includes('purity') || s.group_label?.toLowerCase().includes('karat'));
                          return (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <h2 className="font-serif text-3xl font-extrabold text-[#FAF8F3]">
                                  {req.category_name || 'Bespoke Custom Jewellery'} {metalName ? `(${metalName})` : ''}
                                </h2>
                                <button
                                  type="button"
                                  onClick={() => setSpecsModalRequest(req)}
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] hover:brightness-110 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(212,175,55,0.35)] transition-all cursor-pointer"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-[#070D22]" />
                                  <span>View All My Selections &amp; Form Entries</span>
                                </button>
                              </div>

                              {/* Quick Specs Chips */}
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                                {selMetal && (
                                  <span className="px-2.5 py-0.5 rounded-lg bg-[#060B1E] border border-white/10 text-slate-200">
                                    Metal: <strong className="text-white">{selMetal.value_label}</strong>
                                  </span>
                                )}
                                {selPurity && (
                                  <span className="px-2.5 py-0.5 rounded-lg bg-[#060B1E] border border-white/10 text-slate-200">
                                    Purity: <strong className="text-amber-300">{selPurity.value_label}</strong>
                                  </span>
                                )}
                                {req.ring_size && (
                                  <span className="px-2.5 py-0.5 rounded-lg bg-[#060B1E] border border-white/10 text-slate-200">
                                    Size: <strong className="text-white">{req.ring_size} ({req.ring_size_standard?.toUpperCase() || 'IN/HK'})</strong>
                                  </span>
                                )}
                                {req.target_weight_grams && (
                                  <span className="px-2.5 py-0.5 rounded-lg bg-[#060B1E] border border-white/10 text-slate-200">
                                    Weight: <strong className="text-white">{req.target_weight_grams}g</strong>
                                  </span>
                                )}
                                {req.budget_range && (
                                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-200">
                                    {req.budget_range}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* COMPACT PAYMENT PROGRESS BAR / QUOTE STATUS */}
                      <div className="p-4 rounded-2xl bg-[#09112B] border border-[#D4AF37]/30 sm:w-80 space-y-2 shadow-lg">
                        {hasOfficialQuote ? (
                          <>
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-[#C9C2A6]">Payment Progress</span>
                              <span className="text-[#F5E7A3] font-bold">{formatINR(paidVal)} of {formatINR(totalVal)} ({paidPct}%)</span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-[#060B1E] overflow-hidden p-0.5 border border-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#1E4FA3] via-[#D4AF37] to-[#F5E7A3] transition-all duration-500"
                                style={{ width: `${paidPct}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-[#C9C2A6]">Quote Status</span>
                              <span className="text-[#F5E7A3] font-bold">Under Review</span>
                            </div>
                            <p className="text-[11px] text-[#C9C2A6]/80 leading-relaxed font-sans">
                              Official CAD valuation will be issued by Senior Engineer after spec review.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 2. THE ASSIGNED DESIGNER CARD (100% DYNAMIC) */}
                    {assignedStaff ? (
                      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#09112B] via-[#0E1B42] to-[#09112B] border-2 border-[#D4AF37]/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-lg shrink-0 bg-[#070D22] flex items-center justify-center">
                            {assignedStaff.profile_photo ? (
                              <img
                                src={assignedStaff.profile_photo}
                                alt="CAD Designer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-8 h-8 text-[#D4AF37]" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif text-xl font-bold text-[#FAF8F3]">
                                {assignedStaff.first_name
                                  ? `${assignedStaff.first_name} ${assignedStaff.last_name || ''}`.trim()
                                  : assignedStaff.username || 'Assigned Senior Craftsman'}
                              </h4>
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                                Assigned Craftsman
                              </span>
                            </div>
                            <p className="text-xs text-[#D4AF37] font-medium">
                              {assignedStaff.role || 'Senior CAD Artisan'} &bull; Specializes in {req.category_name || 'Bespoke Jewelry'}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-[#C9C2A6] font-mono pt-1">
                              <span className="flex items-center gap-1 text-amber-300">
                                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                                {assignedStaff.rating || '4.95'} / 5.0
                              </span>
                              <span>&bull;</span>
                              <span>{assignedStaff.jobs_completed || 140}+ Completed CAD Jobs</span>
                            </div>
                          </div>
                        </div>

                        <a
                          href={`https://wa.me/919574787098?text=Hello%20Shiuli%20CAD%20Studio%2C%20I%20am%20in%20touch%20regarding%20REQ%20%23${req.id}.`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-900/60 transition-all shrink-0 shadow-lg"
                        >
                          <Phone className="w-4 h-4 text-emerald-400" />
                          <span>Direct Artisan Chat</span>
                        </a>
                      </div>
                    ) : (
                      <div className="p-6 rounded-3xl bg-[#09112B] border-2 border-dashed border-[#D4AF37]/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#12204D] border-2 border-[#D4AF37]/50 flex items-center justify-center text-[#F5E7A3] shrink-0 shadow-lg">
                            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif text-xl font-bold text-[#FAF8F3]">
                                Matching Senior CAD Artisan...
                              </h4>
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                                Assignment In Progress
                              </span>
                            </div>
                            <p className="text-xs text-[#C9C2A6] max-w-xl">
                              Our Master Atelier Goldsmiths are currently assigning a dedicated Senior CAD Specialist tailored to your {req.category_name || 'Bespoke Jewelry'} design requirements.
                            </p>
                          </div>
                        </div>

                        <a
                          href={`https://wa.me/919574787098?text=Hello%20Shiuli%20CAD%20Studio%2C%20I%20am%20in%20touch%20regarding%20REQ%20%23${req.id}.`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-3 rounded-2xl bg-[#12204D] border border-[#D4AF37]/40 text-[#F5E7A3] text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#1A2E60] transition-all shrink-0 shadow-md"
                        >
                          <Phone className="w-4 h-4 text-[#D4AF37]" />
                          <span>Support Desk Chat</span>
                        </a>
                      </div>
                    )}

                    {/* 3. CONTINUOUS VERTICAL JOURNEY TIMELINE */}
                    <div className="relative pl-6 sm:pl-10 space-y-10 border-l-2 border-[#D4AF37]/30 ml-4 sm:ml-8 pt-2">
                      
                      {/* NODE 1: REQUEST SUBMITTED */}
                      <div className="relative group">
                        <div className="absolute -left-[31px] sm:-left-[47px] top-0 w-6 h-6 rounded-full bg-[#D4AF37] border-4 border-[#070D22] shadow-[0_0_10px_rgba(212,175,55,0.8)] flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#070D22]" />
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h3 className="font-serif text-xl font-bold text-[#FAF8F3]">
                              1. Bespoke Custom Request Submitted
                            </h3>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setSpecsModalRequest(req)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] hover:brightness-110 font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all cursor-pointer"
                              >
                                <Sliders className="w-4 h-4 text-[#070D22]" />
                                <span>View All My Submitted Details &amp; Brief</span>
                              </button>
                              <span className="text-xs font-mono text-[#C9C2A6]">
                                {new Date(req.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* EXPANDABLE SPECIFICATIONS ACCORDION (OPEN BY DEFAULT) */}
                          <div className="rounded-2xl bg-[#09112B] border border-[#D4AF37]/30 p-5 space-y-4 shadow-xl">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setExpandedSpecs((prev) => ({ ...prev, [req.id]: prev[req.id] === false ? true : false }))}
                                className="flex items-center gap-2 text-sm text-[#F5E7A3] font-bold hover:underline cursor-pointer"
                              >
                                <Gem className="w-4 h-4 text-[#D4AF37]" />
                                {(() => {
                                  const totalVisuals = (req.catalog_references?.length || 0) + (req.sketches?.length || 0);
                                  return (
                                    <span>
                                      Your Configured Specifications &amp; Design Selections ({totalVisuals} Reference{totalVisuals === 1 ? '' : 's'}/Sketches)
                                    </span>
                                  );
                                })()}
                                {expandedSpecs[req.id] === false ? <ChevronDown className="w-4 h-4 ml-1 text-[#D4AF37]" /> : <ChevronUp className="w-4 h-4 ml-1 text-[#D4AF37]" />}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => setSpecsModalRequest(req)}
                                className="px-3 py-1 rounded-lg bg-[#12204D] border border-[#D4AF37]/50 text-[#F5E7A3] hover:bg-[#1A2E60] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                              >
                                <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" /> Open Full Modal Spec Sheet
                              </button>
                            </div>

                            {expandedSpecs[req.id] !== false && (
                              <div className="pt-3 border-t border-white/10 space-y-4 text-xs">
                                {/* Parameters Matrix */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                  <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-0.5">
                                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Category</span>
                                    <p className="font-bold text-white">{req.category_name || 'Bespoke Piece'}</p>
                                  </div>

                                  {/* Metal Alloy */}
                                  {(() => {
                                    const selMetal = req.selections?.find((s: any) => s.group_key === 'metal' || s.group_label?.toLowerCase().includes('metal'));
                                    const metalName = selMetal?.value_label || req.metal_alloy_name;
                                    return metalName ? (
                                      <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-0.5">
                                        <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Metal Alloy</span>
                                        <p className="font-bold text-white">{metalName}</p>
                                      </div>
                                    ) : null;
                                  })()}

                                  {/* Ring Sizing */}
                                  {req.ring_size && (
                                    <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-0.5">
                                      <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Ring Sizing</span>
                                      <p className="font-bold text-white">
                                        Size {req.ring_size} ({(req.ring_size_standard || '').toLowerCase() === 'in_hk' ? 'IN_HK' : (req.ring_size_standard?.toUpperCase() || 'IN_HK')})
                                      </p>
                                    </div>
                                  )}

                                  {/* Target Metal Weight */}
                                  {req.target_weight_grams && (
                                    <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-0.5">
                                      <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Target Weight</span>
                                      <p className="font-bold text-white">{req.target_weight_grams} grams</p>
                                    </div>
                                  )}

                                  {/* Complexity Tier */}
                                  {req.budget_range && (
                                    <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-0.5">
                                      <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Production Tier</span>
                                      <p className="font-bold text-[#F5E7A3]">{req.budget_range}</p>
                                    </div>
                                  )}

                                  {/* Target Completion Date */}
                                  {req.needed_by_date && (
                                    <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-0.5">
                                      <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Target Completion</span>
                                      <p className="font-bold text-[#F5E7A3]">
                                        {new Date(req.needed_by_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </p>
                                    </div>
                                  )}

                                  {/* Aesthetic Style */}
                                  {req.aesthetic_style_name && (
                                    <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-0.5">
                                      <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Aesthetic Style</span>
                                      <p className="font-bold text-white">{req.aesthetic_style_name}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Dynamic Option Selections from Configurator */}
                                {req.selections && req.selections.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold flex items-center gap-1">
                                      <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> Configured Options &amp; Selections
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {req.selections.map((sel: any, idx: number) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-[#060B1E] border border-white/5 flex items-center justify-between">
                                          <span className="text-[#C9C2A6] text-[11px] truncate">{sel.group_label}:</span>
                                          <div className="flex items-center gap-1 font-bold text-white text-xs">
                                            {sel.swatch_color && (
                                              <span className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: sel.swatch_color }} />
                                            )}
                                            <span className="truncate">{sel.value_label || sel.other_text}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Stones Breakdown */}
                                <div className="space-y-2">
                                  <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold flex items-center gap-1.5">
                                    <Gem className="w-3.5 h-3.5 text-[#D4AF37]" /> Gemstone &amp; Diamond Specifications
                                  </span>
                                  {req.is_metal_only ? (
                                    <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 text-slate-300">
                                      Solid Metal Design &mdash; No diamonds or gemstones specified.
                                    </div>
                                  ) : req.stones && req.stones.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {req.stones.map((st: any, idx: number) => (
                                        <div key={idx} className="p-3 rounded-xl bg-[#060B1E] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-[#FAF8F3]">{st.stone_type} ({st.shape || 'Standard'})</span>
                                            {st.is_center_stone && (
                                              <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono text-[9px] font-bold uppercase">
                                                Center Stone
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 text-[#C9C2A6] font-mono text-[11px] flex-wrap">
                                            <span>Count: <strong className="text-white">{st.quantity || 1}x</strong></span>
                                            <span>•</span>
                                            <span>Size: <strong className="text-[#F5E7A3]">{st.size_value ? `${st.size_value} ${st.size_unit || 'ct'}` : '--'}</strong></span>
                                            <span>•</span>
                                            <span>Setting: <strong className="text-white">{st.setting_style || 'Prong'}</strong></span>
                                            {[st.clarity, st.color].filter(Boolean).length > 0 && (
                                              <>
                                                <span>•</span>
                                                <span>Grade: <strong className="text-white">{[st.clarity, st.color].filter(Boolean).join(' • ')}</strong></span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : req.gemstones && req.gemstones.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {req.gemstones.map((g: any, idx: number) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-[#060B1E] border border-white/5 flex justify-between">
                                          <span className="font-bold text-white">{g.quantity}x {g.stone_type} ({g.cut_type})</span>
                                          <span className="font-mono text-[#F5E7A3]">{g.carat_size || 'Spec'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 text-slate-300">
                                      {req.gemstone_preference_open ? 'Client selected: Let Designer Decide optimal stone layout' : 'Plain metal piece &mdash; No gemstone specifications added.'}
                                    </div>
                                  )}
                                </div>

                                {/* Custom Engraving & Logo */}
                                {(req.engraving_text || req.has_logo) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {req.engraving_text && (
                                      <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-1">
                                        <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Laser Engraving</span>
                                        <p className="font-serif italic text-[#F5E7A3] text-sm">"{req.engraving_text}"</p>
                                        <p className="text-[10px] text-[#C9C2A6] font-mono">Font: {req.engraving_font || 'Script'} • Placement: {req.engraving_placement || 'Inside Shank'}</p>
                                      </div>
                                    )}
                                    {req.has_logo && (
                                      <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-1">
                                        <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Brand Logo Hallmark</span>
                                        <p className="text-emerald-400 font-bold">✓ Custom Hallmark Vector Stamping Requested</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Written Brief & Special Notes */}
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Client Design Brief &amp; Special Instructions</span>
                                  <div className="p-3.5 rounded-xl bg-[#060B1E] border border-white/5 text-xs text-slate-300 leading-relaxed space-y-2">
                                    <p>{req.description || 'No additional written brief entered.'}</p>
                                    {req.special_instructions && req.special_instructions !== req.description && (
                                      <p className="pt-2 border-t border-white/5 text-amber-300/90 font-mono text-[11px]">
                                        {req.special_instructions}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Studio Catalog References */}
                                {req.catalog_references && req.catalog_references.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-[#D4AF37]" /> Selected Studio Catalog References ({req.catalog_references.length})
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {req.catalog_references.map((cRef: any, cIdx: number) => (
                                        <div
                                          key={cIdx}
                                          onClick={() => cRef.image && setSelectedSketchUrl(cRef.image)}
                                          className="p-2.5 rounded-xl bg-[#060B1E] border border-[#D4AF37]/30 hover:border-[#D4AF37] flex items-center gap-3 cursor-pointer transition-all hover:bg-[#09112B]"
                                        >
                                          {cRef.image ? (
                                            <img src={cRef.image} alt={cRef.title} className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" />
                                          ) : (
                                            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-[10px] text-[#C9C2A6] shrink-0 font-mono">CAD</div>
                                          )}
                                          <div className="min-w-0 flex-1">
                                            <span className="text-[10px] font-mono text-[#D4AF37] block font-bold">{cRef.sku || `SKU-${cRef.id}`}</span>
                                            <p className="text-xs font-semibold text-[#FAF8F3] truncate">{cRef.title}</p>
                                            <span className="text-[9px] text-[#C9C2A6] block">Click to enlarge image</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Sketches */}
                                {req.sketches && req.sketches.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Uploaded Reference Sketches ({req.sketches.length})</span>
                                    <div className="flex flex-wrap gap-2">
                                      {req.sketches.map((sk: any) => (
                                        <img
                                          key={sk.id}
                                          src={sk.image_url || sk.image}
                                          alt="Sketch"
                                          onClick={() => setSelectedSketchUrl(sk.image_url || sk.image)}
                                          className="w-16 h-16 rounded-xl object-cover border border-white/20 hover:border-[#D4AF37] cursor-pointer"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* NODE 2: OFFICIAL QUOTE & NEGOTIATION */}
                      <div className="relative group">
                        <div className={`absolute -left-[31px] sm:-left-[47px] top-0 w-6 h-6 rounded-full border-4 border-[#070D22] flex items-center justify-center ${
                          req.status === 'quoted' || req.status === 'negotiating' || req.status === 'agreed' || order
                            ? 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]'
                            : 'bg-[#060B1E] border-slate-700'
                        }`}>
                          <Sparkles className="w-3.5 h-3.5 text-[#070D22]" />
                        </div>

                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-serif text-xl font-bold text-[#FAF8F3]">
                                2. Official Senior Engineer Quote &amp; Negotiation
                              </h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                                req.status === 'agreed' || req.status === 'in_progress' || order
                                  ? 'bg-[#1F9D66] text-white shadow-[0_0_8px_rgba(31,157,102,0.6)]'
                                  : req.status === 'quoted'
                                  ? 'bg-[#D4AF37] text-[#070D22]'
                                  : req.status === 'negotiating'
                                  ? 'bg-[#E8A93B] text-[#070D22]'
                                  : 'bg-[#6B7280] text-white'
                              }`}>
                                {req.status === 'agreed' || req.status === 'in_progress' || order ? 'ACCEPTED & AGREED' : req.status}
                              </span>
                            </div>
                            <span className="font-serif text-2xl font-bold text-[#F5E7A3]">
                              {formatINR(req.agreed_price || req.estimated_price_shown)}
                            </span>
                          </div>

                          {/* REAL CHAT BUBBLES THREAD LOG */}
                          {req.messages && req.messages.length > 0 && (
                            <div className="space-y-3 p-4 rounded-2xl bg-[#09112B] border border-white/10 max-h-72 overflow-y-auto custom-scrollbar">
                              {req.messages.map((msg: any) => {
                                const isAdmin = msg.sender_type === 'admin';
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex gap-3 ${isAdmin ? 'justify-start' : 'justify-end'}`}
                                  >
                                    {isAdmin && (
                                      <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#F5E7A3] text-xs font-serif font-bold shrink-0">
                                        CAD
                                      </div>
                                    )}

                                    <div
                                      className={`p-4 rounded-2xl max-w-md text-xs space-y-1.5 shadow-md ${
                                        isAdmin
                                          ? 'bg-[#12204D] border border-[#D4AF37]/40 text-[#FAF8F3] rounded-tl-none'
                                          : 'bg-[#1A2E60] border border-white/20 text-[#FAF8F3] rounded-tr-none'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center text-[10px] text-[#C9C2A6] pb-1 border-b border-white/10">
                                        <span className="font-bold">{isAdmin ? 'Senior CAD Engineer (Admin)' : 'You'}</span>
                                        <span className="font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                      <p>{msg.message}</p>
                                      {msg.offered_price && (
                                        <div className="mt-2 p-2 rounded-xl bg-[#070D22] border border-[#D4AF37]/50 flex items-center justify-between text-xs">
                                          <span className="text-[10px] text-[#C9C2A6] uppercase">Official Price Offer:</span>
                                          <span className="font-mono font-bold text-[#F5E7A3]">{formatINR(msg.offered_price)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* STATUS AGREED BANNER */}
                          {(req.status === 'agreed' || req.status === 'in_progress' || order) && (
                            <div className="p-4 rounded-2xl bg-[#09261A] border border-[#1F9D66]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg text-xs mt-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#1F9D66]/20 border border-[#1F9D66] flex items-center justify-center text-[#26D07C] shrink-0">
                                  <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="font-bold text-[#FAF8F3] text-sm block">Quote Accepted &amp; Status AGREED!</span>
                                  <span className="text-[#A2E8C4] text-[11px]">
                                    Agreed Final Price: <strong>{formatINR(req.agreed_price || req.estimated_price_shown)}</strong>. Payment schedule is active below.
                                  </span>
                                </div>
                              </div>
                              <div className="px-3.5 py-1.5 rounded-xl bg-[#1F9D66] text-white text-[10px] font-extrabold uppercase tracking-wider font-mono flex items-center gap-1.5 shadow shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ACCEPTED</span>
                              </div>
                            </div>
                          )}

                          {/* ACTION BUTTONS & TWO-WAY NEGOTIATION FORM */}
                          {(req.status === 'quoted' || req.status === 'negotiating') && (
                            <div className="space-y-4 pt-2">
                              <div className="flex flex-wrap items-center gap-4">
                                {/* Option 1: Accept current quote */}
                                <button
                                  onClick={() => handleAcceptQuote(req.id)}
                                  disabled={isSubmitting[req.id]}
                                  className="btn-gold-luxury px-8 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-xl"
                                >
                                  {isSubmitting[req.id] ? (
                                    <Loader2 className="w-4 h-4 text-[#0B1330] animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 text-[#0B1330]" />
                                  )}
                                  <span>Accept Quote ({formatINR(req.agreed_price || req.estimated_price_shown)}) &amp; Activate Payment</span>
                                </button>

                                {/* Option 2: Propose Counter Price / Send Price Request */}
                                <button
                                  type="button"
                                  onClick={() => setShowCounterForm((prev) => ({ ...prev, [req.id]: !prev[req.id] }))}
                                  className="px-6 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 border border-[#D4AF37]/50 text-[#F5E7A3] hover:bg-[#D4AF37]/10 transition-all shadow-md"
                                >
                                  <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                                  <span>{showCounterForm[req.id] ? 'Hide Counter Form' : 'Not Satisfied? Propose Counter Price'}</span>
                                </button>
                              </div>

                              {/* Counter Offer Form (visible when toggled or if status is negotiating) */}
                              {(showCounterForm[req.id] || req.status === 'negotiating') && (
                                <form
                                  onSubmit={(e) => handleSendCounterOffer(e, req.id)}
                                  className="p-4 rounded-2xl bg-[#081233] border border-[#D4AF37]/30 space-y-3"
                                >
                                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <span className="text-xs font-bold font-serif text-[#FAF8F3] uppercase tracking-wider flex items-center gap-2">
                                      <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                                      Send Price Request / Counter-Offer to SuperAdmin
                                    </span>
                                    <span className="text-[10px] text-[#C9C2A6] font-mono">Multi-Round Negotiation Active</span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-1">
                                      <label className="block text-[10px] font-mono text-[#C9C2A6] uppercase mb-1">
                                        Your Target Price (₹)
                                      </label>
                                      <input
                                        type="number"
                                        value={counterPriceInput[req.id] || ''}
                                        onChange={(e) => setCounterPriceInput({ ...counterPriceInput, [req.id]: e.target.value })}
                                        placeholder="e.g. 18000"
                                        className="w-full px-3 py-2 rounded-xl bg-[#060B1E] border border-white/10 text-xs font-mono font-bold text-[#FAF8F3] focus:outline-none focus:border-[#D4AF37]"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-[10px] font-mono text-[#C9C2A6] uppercase mb-1">
                                        Note for SuperAdmin (Optional)
                                      </label>
                                      <input
                                        type="text"
                                        value={counterMessageInput[req.id] || ''}
                                        onChange={(e) => setCounterMessageInput({ ...counterMessageInput, [req.id]: e.target.value })}
                                        placeholder="e.g. Can we adjust within this budget for 18K Yellow Gold?"
                                        className="w-full px-3 py-2 rounded-xl bg-[#060B1E] border border-white/10 text-xs text-[#FAF8F3] focus:outline-none focus:border-[#D4AF37]"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex justify-end gap-2 pt-1">
                                    <button
                                      type="submit"
                                      disabled={isSubmitting[req.id]}
                                      className="btn-gold-luxury px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                                    >
                                      {isSubmitting[req.id] ? (
                                        <Loader2 className="w-4 h-4 text-[#0B1330] animate-spin" />
                                      ) : (
                                        <>
                                          <Send className="w-3.5 h-3.5 text-[#0B1330]" />
                                          <span>Submit Price Request to SuperAdmin</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </form>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* NODE 3: MULTI-STAGE PAYMENT SCHEDULE TABLE */}
                      <div className="relative group">
                        <div className={`absolute -left-[31px] sm:-left-[47px] top-0 w-6 h-6 rounded-full border-4 border-[#070D22] flex items-center justify-center ${
                          paidVal > 0
                            ? 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]'
                            : 'bg-[#060B1E] border-slate-700'
                        }`}>
                          <CreditCard className="w-3.5 h-3.5 text-[#070D22]" />
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-serif text-xl font-bold text-[#FAF8F3]">
                            3. Multi-Stage Payment Schedule (Transparent 10/30/60 Split)
                          </h3>

                          <div className="rounded-2xl bg-[#09112B] border border-[#D4AF37]/30 overflow-hidden shadow-xl">
                            <table className="w-full text-left text-xs text-[#C9C2A6]">
                              <thead className="bg-[#070D22] text-[#FAF8F3] font-serif border-b border-[#D4AF37]/20 uppercase text-[10px] tracking-wider">
                                <tr>
                                  <th className="p-4">Stage Name</th>
                                  <th className="p-4">% Split</th>
                                  <th className="p-4">Amount (INR)</th>
                                  <th className="p-4">Trigger Condition</th>
                                  <th className="p-4 text-right">Payment Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {order?.payment_stages && order.payment_stages.length > 0 ? (
                                  order.payment_stages.map((st: any) => (
                                    <tr key={st.id} className="hover:bg-white/5 transition-colors">
                                      <td className="p-4 font-bold text-[#FAF8F3]">{st.label}</td>
                                      <td className="p-4 font-mono">{st.percentage}%</td>
                                      <td className="p-4 font-serif text-sm font-bold text-[#F5E7A3]">{formatINR(st.amount)}</td>
                                      <td className="p-4 text-[11px] text-[#C9C2A6]">
                                        {st.trigger_type === 'immediate'
                                          ? 'Due Immediately to Start CAD'
                                          : st.trigger_type === 'on_design_approval'
                                          ? 'Due on Client 3D Preview Approval'
                                          : 'Due Before Final File Release'}
                                      </td>
                                      <td className="p-4 text-right">
                                        {st.status === 'paid' ? (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            PAID
                                          </span>
                                        ) : st.status === 'due' ? (
                                          <button
                                            onClick={() => handlePayStage(st)}
                                            className="btn-gold-luxury px-4 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider shadow-md"
                                          >
                                            Pay Now ({formatINR(st.amount)})
                                          </button>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-700 text-[10px] font-mono">
                                            <Lock className="w-3 h-3" />
                                            LOCKED
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <>
                                    <tr className="hover:bg-white/5 transition-colors">
                                      <td className="p-4 font-bold text-[#FAF8F3]">Stage 1: Booking Confirmation</td>
                                      <td className="p-4 font-mono">10.00%</td>
                                      <td className="p-4 font-serif text-sm font-bold text-[#F5E7A3]">{formatINR(totalVal * 0.1)}</td>
                                      <td className="p-4 text-[11px] text-[#C9C2A6]">Due Immediately to Start CAD</td>
                                      <td className="p-4 text-right">
                                        <button
                                          onClick={() => handlePayStage({ id: 1, stage_name: 'Stage 1: Booking Confirmation', amount: totalVal * 0.1, percentage: 10 })}
                                          className="btn-gold-luxury px-4 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider shadow-md"
                                        >
                                          Pay Stage 1
                                        </button>
                                      </td>
                                    </tr>
                                    <tr className="hover:bg-white/5 transition-colors">
                                      <td className="p-4 font-bold text-[#FAF8F3]">Stage 2: Design Approval Milestone</td>
                                      <td className="p-4 font-mono">30.00%</td>
                                      <td className="p-4 font-serif text-sm font-bold text-[#F5E7A3]">{formatINR(totalVal * 0.3)}</td>
                                      <td className="p-4 text-[11px] text-[#C9C2A6]">Due on Client 3D Preview Approval</td>
                                      <td className="p-4 text-right">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-700 text-[10px] font-mono">
                                          <Lock className="w-3 h-3" />
                                          LOCKED
                                        </span>
                                      </td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* NODE 4: DESIGN PREVIEW & APPROVAL */}
                      <div className="relative group">
                        <div className={`absolute -left-[31px] sm:-left-[47px] top-0 w-6 h-6 rounded-full border-4 border-[#070D22] flex items-center justify-center ${
                          order?.preview_image || order?.milestones?.some((m: any) => m.stage.includes('Approved'))
                            ? 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]'
                            : 'bg-[#060B1E] border-slate-700'
                        }`}>
                          <Eye className="w-3.5 h-3.5 text-[#070D22]" />
                        </div>

                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h3 className="font-serif text-xl font-bold text-[#FAF8F3]">
                              4. In-Progress 3D CAD Preview Review
                            </h3>
                            {order?.milestones?.some((m: any) => m.stage.includes('Approved')) && (
                              <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                3D PREVIEW APPROVED BY YOU
                              </span>
                            )}
                          </div>

                          {order?.preview_image ? (
                            <div className="rounded-2xl bg-[#09112B] border border-[#D4AF37]/30 p-5 space-y-4 shadow-xl">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-serif font-bold text-[#F5E7A3] block">
                                      Protected 360° Raytraced Master Preview
                                    </span>
                                    {order?.status === 'preview_ready' || order?.quality_approved ? (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold">
                                        QC Verified &amp; Ready
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold">
                                        QC Inspection Underway
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[#C9C2A6]">
                                    Inspect proportion, prong layout &amp; stone seats before approving for final file generation.
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setLightboxZoom(1);
                                      setPreviewLightboxOrder(order);
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-[#12204D] hover:bg-[#1A2E60] text-[#F5E7A3] border border-[#D4AF37]/50 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                                    <span>Open Full Screen</span>
                                  </button>
                                  <span className="px-2.5 py-0.5 rounded bg-[#12204D] text-[#F5E7A3] border border-[#D4AF37]/40 text-[10px] font-mono">
                                    PROTECTED PREVIEW
                                  </span>
                                </div>
                              </div>

                              {/* CLEAN, ELEGANT PROPORTIONED CAD PREVIEW CONTAINER (NO CROPPING) */}
                              <div
                                onClick={() => {
                                  setLightboxZoom(1);
                                  setPreviewLightboxOrder(order);
                                }}
                                onContextMenu={(e) => e.preventDefault()}
                                onDragStart={(e) => e.preventDefault()}
                                className="relative w-full h-[340px] sm:h-[420px] rounded-2xl overflow-hidden border-2 border-[#D4AF37]/40 bg-gradient-to-b from-[#070D22] via-[#040816] to-[#02050e] select-none group cursor-pointer shadow-2xl flex items-center justify-center transition-all hover:border-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]"
                                title="Click to Open Full View"
                              >
                                {/* CAD Viewport Subtle Grid Pattern */}
                                <div 
                                  className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                  style={{
                                    backgroundImage: 'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)',
                                    backgroundSize: '24px 24px'
                                  }}
                                />

                                {/* Subtle Luxury Radial Vignette */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_75%)] pointer-events-none" />

                                {/* The Render Image - PERFECTLY CONTAINED, NEVER CROPPED */}
                                <img
                                  src={order.preview_image}
                                  alt="3D CAD Preview"
                                  className="max-w-full max-h-full p-4 object-contain group-hover:scale-[1.03] transition-transform duration-300 filter drop-shadow-[0_12px_32px_rgba(0,0,0,0.85)] pointer-events-none"
                                />

                                {/* Elegant Hover Overlay */}
                                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                  <div className="px-6 py-3 rounded-2xl bg-[#09112B]/95 border-2 border-[#D4AF37] text-[#FAF8F3] text-sm font-bold font-serif flex items-center gap-2.5 shadow-2xl transform group-hover:scale-105 transition-transform">
                                    <Maximize2 className="w-4 h-4 text-[#D4AF37]" />
                                    <span>Click to Open Full Screen View</span>
                                  </div>
                                </div>

                                {/* Corner Badges */}
                                <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/75 backdrop-blur border border-white/15 text-[10px] font-mono text-slate-300 pointer-events-none flex items-center gap-1.5">
                                  <span>🔍</span>
                                  <span>360° Inspection Render</span>
                                </div>

                                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/85 backdrop-blur border border-white/20 text-[10px] font-mono text-[#F5E7A3] pointer-events-none">
                                  🔒 Protected Atelier Render &bull; Click anywhere to enlarge
                                </div>

                                <div className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-xl bg-[#12204D]/95 backdrop-blur border border-[#D4AF37]/60 text-[11px] font-mono font-bold text-[#F5E7A3] flex items-center gap-1.5 shadow-lg group-hover:bg-[#1A2E60] transition-colors">
                                  <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  <span>Click to Open Full</span>
                                </div>
                              </div>

                              {/* ACTIONS FOR PREVIEW */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <div className="text-xs text-[#C9C2A6]">
                                  Satisfied with this 3D preview? Approve below to unlock the final delivery payment stage.
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setPreviewLightboxOrder(order)}
                                    className="px-4 py-2.5 rounded-xl bg-[#09112B] hover:bg-[#12204D] border border-white/20 text-[#FAF8F3] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4 text-[#D4AF37]" />
                                    <span>Inspect 3D Preview</span>
                                  </button>

                                  <a
                                    href={`https://wa.me/919574787098?text=Hello%20Shiuli%20Studio%2C%20I%20have%20feedback%20regarding%20my%20Order%20%23${order.id}%20CAD%20preview.`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2.5 rounded-xl bg-[#12204D] border border-white/20 text-[#FAF8F3] hover:bg-[#1A2E60] text-xs font-bold flex items-center gap-1.5 transition-colors"
                                  >
                                    <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                                    <span>Comment / Request Changes</span>
                                  </a>

                                  {!order?.milestones?.some((m: any) => m.stage?.includes('Approved')) && (
                                    <button
                                      onClick={() => handleApproveDesignPreview(order.id)}
                                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-white" />
                                      <span>Approve 3D Preview</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-5 rounded-2xl bg-[#09112B] border border-white/10 text-xs text-[#C9C2A6] space-y-1">
                              <span className="font-semibold text-[#F5E7A3] block">
                                {assignedStaff
                                  ? `Artisan ${assignedStaff.first_name || assignedStaff.username} is actively sculpting your CAD model in Rhino 8.`
                                  : 'Matching artisan craftsman...'}
                              </span>
                              <p>
                                360° raytraced previews and dimensional inspection views will unlock here as soon as our Quality Control team verifies the tolerances.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* NODE 5: DELIVERABLES & FINAL SOURCE FILES */}
                      <div className="relative group">
                        <div className={`absolute -left-[31px] sm:-left-[47px] top-0 w-6 h-6 rounded-full border-4 border-[#070D22] flex items-center justify-center ${
                          isFullyPaid && (order?.download_enabled_by_admin || order?.can_download)
                            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                            : 'bg-[#060B1E] border-slate-700'
                        }`}>
                          <Download className="w-3.5 h-3.5 text-[#070D22]" />
                        </div>

                        <div className="space-y-3">
                          <h3 className="font-serif text-xl font-bold text-[#FAF8F3]">
                            5. Final Watertight Deliverables (.3DM, .STL &amp; Master Production Pack)
                          </h3>

                          {order ? (
                            isFullyPaid && (order.download_enabled_by_admin || order.can_download) ? (
                              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#09261A] via-[#0E3827] to-[#09261A] border-2 border-emerald-500/60 space-y-4 shadow-2xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-[#070D22] text-[10px] font-mono font-bold uppercase tracking-wider">
                                        DOWNLOAD AUTHORIZED BY ADMIN
                                      </span>
                                      <span className="text-emerald-300 text-xs font-mono font-bold">100% Paid</span>
                                    </div>
                                    <h4 className="font-serif text-lg font-bold text-[#FAF8F3] mt-1">
                                      Your Watertight CAD Package is Ready for Download
                                    </h4>
                                    <p className="text-xs text-[#A2E8C4] max-w-xl">
                                      Click below to receive a secure 6-digit verification code on your registered email. Once verified, a single-use download link will be dispatched directly to your inbox.
                                    </p>
                                  </div>

                                  <button
                                    onClick={() => handleRequestOrderDownload(order.id, req.category_name || 'Bespoke CAD Package')}
                                    className="btn-gold-luxury px-8 py-4 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shrink-0"
                                  >
                                    <Download className="w-4 h-4 text-[#0B1330]" />
                                    <span>Download CAD Package</span>
                                  </button>
                                </div>

                                {/* Packaged Deliverables Showcase */}
                                {order.deliverables && order.deliverables.length > 0 && (
                                  <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/30 space-y-2.5">
                                    <div className="text-[11px] font-mono text-emerald-300 font-bold flex items-center gap-1.5">
                                      <Package className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Packaged Production Deliverables Ready in this Order ({order.deliverables.length}):</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      {order.deliverables.map((del: any) => (
                                        <div key={del.id} className="p-2.5 rounded-lg bg-[#070D22] border border-emerald-500/20 flex items-center justify-between gap-2 shadow-inner">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="px-2 py-0.5 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[10px] font-mono font-bold text-[#F5E7A3] uppercase">
                                              {del.file_type}
                                            </span>
                                            <span className="text-xs text-white font-medium truncate">
                                              {del.filename}
                                            </span>
                                          </div>
                                          {del.file_size && (
                                            <span className="text-[10px] font-mono text-emerald-300 shrink-0 font-bold">
                                              {del.file_size}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="text-[10px] font-mono text-emerald-200/70 border-t border-emerald-500/20 pt-2">
                                  🛡️ Single-Use Security Protocol: After entering OTP, download link will be sent to your email and this button will self-lock.
                                </div>
                              </div>
                            ) : isFullyPaid && !order.download_enabled_by_admin ? (
                              <div className="p-5 rounded-2xl bg-[#09112B] border border-emerald-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>100% Milestone Payments Complete</span>
                                  </div>
                                  <p className="text-[#C9C2A6] text-xs">
                                    Your single-use download link has already been dispatched, or download authorization is currently awaiting Studio Admin toggle. If you need to re-download your files, please click below.
                                  </p>

                                  {/* Packaged Deliverables Preview */}
                                  {order.deliverables && order.deliverables.length > 0 && (
                                    <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2 mt-2">
                                      <div className="text-[11px] font-mono text-[#F5E7A3] font-bold flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5 text-[#D4AF37]" />
                                        <span>Master Deliverable Files Uploaded by Atelier Modeller ({order.deliverables.length}):</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {order.deliverables.map((del: any) => (
                                          <div key={del.id} className="px-3 py-1.5 rounded-lg bg-[#070D22] border border-white/10 flex items-center gap-2 text-xs font-mono">
                                            <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold text-[10px] uppercase">
                                              {del.file_type}
                                            </span>
                                            <span className="text-white/90">{del.filename}</span>
                                            {del.file_size && <span className="text-emerald-400 text-[10px]">({del.file_size})</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <a
                                  href={`https://wa.me/919574787098?text=Hello%20Admin%2C%20my%20Order%20%23${order.id}%20payment%20is%20100%25%20complete.%20Kindly%20authorize%20my%20CAD%20download%20button.`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-5 py-2.5 rounded-xl bg-[#12204D] border border-[#D4AF37]/40 text-[#F5E7A3] text-xs font-bold uppercase tracking-wider hover:bg-[#1A2E60] transition-colors shrink-0 shadow"
                                >
                                  Request Download Access
                                </a>
                              </div>
                            ) : (
                              <div className="p-4 rounded-2xl bg-[#09112B] border border-white/10 text-xs text-[#C9C2A6] flex items-center gap-2">
                                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>
                                  Final source deliverables (.3DM Native &amp; .STL Mesh) unlock automatically once all 3 payment milestone stages are 100% complete and authorized by Studio Administration.
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="p-4 rounded-2xl bg-[#09112B] border border-white/10 text-xs text-[#C9C2A6] flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Deliverables unlock upon order confirmation and payment completion.</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: MY CAD VAULT / MY DOWNLOADS */}
        {activeTab === 'downloads' && (
          <div className="space-y-6">
            {loadingPurchases ? (
              <div className="py-20 text-center rounded-3xl bg-[#09112B] border border-[#D4AF37]/30 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                <span className="text-sm font-serif text-[#F5E7A3]">Loading Purchases &amp; Vault...</span>
              </div>
            ) : purchases.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-[#09112B] border-2 border-dashed border-[#D4AF37]/30 space-y-4">
                <ShieldCheck className="w-12 h-12 text-[#D4AF37] mx-auto" />
                <h4 className="font-serif text-xl font-bold text-[#FAF8F3]">No Ready-Made CAD Purchases Yet</h4>
                <p className="text-xs text-[#C9C2A6] max-w-md mx-auto">
                  Browse our ready-made jewellery CAD collections to purchase high-precision 3DM &amp; STL master models.
                </p>
                <button
                  onClick={() => onNavigate('collections')}
                  className="btn-gold-luxury px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-[#0B1330]" />
                  <span>Browse CAD Collections</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {purchases.map((p) => {
                  const isCapReached = p.redelivery_count >= 3;
                  return (
                    <div key={p.id} className="p-6 rounded-3xl bg-[#09112B] border border-[#D4AF37]/30 space-y-5 shadow-xl relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-[#D4AF37] block">PURCHASE #{p.id}</span>
                          <h4 className="font-serif text-lg font-bold text-[#FAF8F3]">{p.product_title}</h4>
                          <span className="text-xs text-[#F5E7A3] font-semibold">{p.license_type_display}</span>
                        </div>
                        <span className="font-serif text-lg font-bold text-[#F5E7A3]">
                          {formatINR(p.price_paid)}
                        </span>
                      </div>

                      {/* Step Indicator Bar: Paid -> Verified -> Downloaded */}
                      <div className="p-3 rounded-2xl bg-[#070D22] border border-white/10 space-y-2">
                        <div className="text-[11px] font-mono text-[#C9C2A6] flex justify-between">
                          <span>Delivery Trail</span>
                          <span className="text-amber-300 font-bold">
                            {p.is_downloaded ? 'Downloaded' : p.is_otp_verified ? 'OTP Verified' : 'Paid'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                          <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>1. Paid</span>
                          </div>
                          <div className={`p-1.5 rounded-lg border flex items-center justify-center gap-1 font-semibold ${
                            p.is_otp_verified || p.is_downloaded
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          }`}>
                            <ShieldCheck className="w-3 h-3" />
                            <span>2. Verified</span>
                          </div>
                          <div className={`p-1.5 rounded-lg border flex items-center justify-center gap-1 font-semibold ${
                            p.is_downloaded
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                          }`}>
                            <Download className="w-3 h-3" />
                            <span>3. Downloaded</span>
                          </div>
                        </div>

                        {p.downloaded_at && (
                          <div className="text-[10px] text-zinc-400 font-mono text-right pt-1">
                            Downloaded on {new Date(p.downloaded_at).toLocaleDateString()} at {new Date(p.downloaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>

                      {/* Re-Delivery Section */}
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <button
                          onClick={() => handleRequestRedelivery(p.id, p.product_title)}
                          disabled={isCapReached || resendingPurchaseId === p.id}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <Send className={`w-4 h-4 ${resendingPurchaseId === p.id ? 'animate-spin' : ''}`} />
                          <span>
                            {resendingPurchaseId === p.id ? 'Sending New OTP...' : 'Resend Secure Download Link'}
                          </span>
                        </button>

                        <div className="text-[11px] text-[#C9C2A6] text-center font-mono">
                          {isCapReached ? (
                            <span className="text-rose-400 font-bold block bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                              Maximum limit of 3 download re-deliveries reached for this purchase. Need help? Contact Support.
                            </span>
                          ) : (
                            <span>
                              Re-delivery used: <strong className="text-amber-300">{p.redelivery_count}</strong> of 3 max allowed.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* TAB 3: ORDER HISTORY */}
        {activeTab === 'orders' && (
          <div>
            {loadingOrders ? (
              <div className="py-20 text-center rounded-3xl bg-[#09112B] border border-[#D4AF37]/30 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                <span className="text-sm font-serif text-[#F5E7A3]">Loading Orders...</span>
              </div>
            ) : clientOrders.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-[#09112B] border-2 border-dashed border-[#D4AF37]/30 space-y-4 shadow-2xl">
                <ShoppingBag className="w-12 h-12 text-[#D4AF37] mx-auto" />
                <h4 className="font-serif text-xl font-bold text-[#FAF8F3]">No Orders Placed Yet</h4>
                <p className="text-xs text-[#C9C2A6] max-w-md mx-auto">
                  You currently have no active or completed orders. Commission a custom CAD piece or browse our ready-to-cast collections.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => onNavigate('custom-design')}
                    className="btn-gold-luxury px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-[#0B1330]" />
                    <span>Start Custom Brief</span>
                  </button>
                  <button
                    onClick={() => onNavigate('collections')}
                    className="px-6 py-2.5 rounded-xl border border-[#D4AF37]/40 text-[#F5E7A3] text-xs font-bold uppercase hover:bg-[#D4AF37]/10 transition-all inline-flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                    <span>Browse Collections</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-[#09112B] border border-[#D4AF37]/30 overflow-hidden shadow-2xl">
                <table className="w-full text-left text-xs text-[#C9C2A6]">
                  <thead className="bg-[#070D22] text-[#FAF8F3] font-serif border-b border-[#D4AF37]/20 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Order Type</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {clientOrders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#F5E7A3]">
                          ORD #{ord.id}
                        </td>
                        <td className="p-4 capitalize text-[#FAF8F3]">
                          {ord.order_type === 'custom' ? 'Bespoke Custom CAD' : ord.order_type || 'CAD Model'}
                        </td>
                        <td className="p-4 font-mono">
                          {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent'}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-[#12204D] border border-[#D4AF37]/40 text-[#F5E7A3]">
                            {ord.status?.replace(/_/g, ' ') || 'In Progress'}
                          </span>
                        </td>
                        <td className="p-4 font-serif text-sm font-bold text-[#FAF8F3]">
                          {formatINR(ord.total_price)}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setActiveTab('custom')}
                            className="px-3 py-1.5 rounded-xl border border-[#D4AF37]/40 text-[#F5E7A3] text-xs hover:bg-[#D4AF37]/20 transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>View Custom Journey</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: WISHLIST */}
        {activeTab === 'wishlist' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistedProducts.map((prod) => (
              <div key={prod.id} className="p-4 rounded-3xl bg-[#09112B] border border-[#D4AF37]/30 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <img src={prod.primaryImage} alt={prod.title} className="w-full aspect-square rounded-2xl object-cover" />
                  <h4 className="font-serif font-bold text-[#FAF8F3] text-sm leading-snug">{prod.title}</h4>
                  <div className="font-serif text-base text-[#F5E7A3] font-bold">
                    ₹{Math.round(prod.price * 84).toLocaleString('en-IN')} INR <span className="text-xs text-[#C9C2A6] font-normal font-sans">(${prod.price} USD)</span>
                  </div>
                </div>
                <button onClick={() => onAddToCart(prod, 'standard')} className="btn-gold-luxury w-full py-2.5 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-1.5 shadow-md">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#0B1330]" />
                  <span>Add to Bag</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: MY PROFILE & SECURITY */}
        {activeTab === 'profile' && <UserProfileModule />}

      </div>

      {/* SKETCH PREVIEW LIGHTBOX MODAL */}
      {selectedSketchUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedSketchUrl(null)}>
          <div className="relative max-w-3xl w-full bg-[#09112B] border-2 border-[#D4AF37] rounded-3xl p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-serif font-bold text-lg text-[#F5E7A3]">Reference Sketch Preview</span>
              <button onClick={() => setSelectedSketchUrl(null)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <img src={selectedSketchUrl} alt="Enlarged" className="max-h-[70vh] w-auto mx-auto object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* 3D CAD PREVIEW ENLARGED LIGHTBOX MODAL */}
      {previewLightboxOrder && (
        <div 
          className="fixed inset-0 z-[9999] bg-[#02050e]/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPreviewLightboxOrder(null);
              setLightboxZoom(1);
            }
          }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 text-white gap-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-md bg-[#D4AF37] text-[#070D22] font-mono font-bold text-xs uppercase">
                ORDER #{previewLightboxOrder.id} • 3D CAD INSPECTION
              </span>
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#FAF8F3]">
                  Protected 360° Master CAD Render
                </h2>
                <span className="text-xs text-[#C9C2A6]">
                  Inspect every prong, surface contour, and setting seat before final approval.
                </span>
              </div>
            </div>

            {/* Header Right: Zoom Controls & Close Button */}
            <div className="flex items-center gap-3">
              {/* Interactive Zoom Controls */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.max(0.75, Math.round((prev - 0.25) * 100) / 100))}
                  disabled={lightboxZoom <= 0.75}
                  className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="min-w-[45px] text-center text-[#F5E7A3] font-bold">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.min(3, Math.round((prev + 0.25) * 100) / 100))}
                  disabled={lightboxZoom >= 3}
                  className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxZoom(1)}
                  className="p-1 ml-1 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                  title="Reset Zoom (100%)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => {
                  setPreviewLightboxOrder(null);
                  setLightboxZoom(1);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Container — Uncropped Full Display */}
          <div 
            className="flex-1 flex items-center justify-center py-4 overflow-auto relative"
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="w-full h-full flex items-center justify-center relative p-2 select-none">
              <img
                src={previewLightboxOrder.preview_image}
                alt="3D CAD Preview Enlarged"
                onClick={() => setLightboxZoom((prev) => (prev > 1 ? 1 : 1.75))}
                style={{
                  transform: `scale(${lightboxZoom})`,
                  transition: 'transform 0.2s ease-out',
                  transformOrigin: 'center center'
                }}
                className={`max-w-[92vw] max-h-[74vh] object-contain rounded-xl filter drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] transition-transform duration-200 select-none ${
                  lightboxZoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                title={lightboxZoom > 1 ? 'Click to zoom out (100%)' : 'Click image to zoom in (175%)'}
              />

              <div className="absolute bottom-3 left-3 px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-[11px] font-mono text-[#F5E7A3] flex items-center gap-2 pointer-events-none">
                <span>🔒 Protected Atelier Render</span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-300">Confidential Studio Preview</span>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
            <div className="text-xs text-[#C9C2A6]">
              Use zoom buttons above to inspect micro-tolerances. Press <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">Esc</kbd> to exit.
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`https://wa.me/919574787098?text=Hello%20Shiuli%20Studio%2C%20I%20have%20feedback%20regarding%20my%20Order%20%23${previewLightboxOrder.id}%20CAD%20preview.`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-[#12204D] border border-white/20 text-[#FAF8F3] hover:bg-[#1A2E60] text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                <span>Request Revision</span>
              </a>

              {!previewLightboxOrder?.milestones?.some((m: any) => m.stage?.includes('Approved')) && (
                <button
                  onClick={() => {
                    const id = previewLightboxOrder.id;
                    setPreviewLightboxOrder(null);
                    setLightboxZoom(1);
                    handleApproveDesignPreview(id);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Approve 3D Preview</span>
                </button>
              )}

              <button
                onClick={() => {
                  setPreviewLightboxOrder(null);
                  setLightboxZoom(1);
                }}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RE-DELIVERY OTP VERIFICATION MODAL (READY-MADE PURCHASES) */}
      <OTPVerificationModal
        isOpen={reDeliveryOtpModalState.isOpen}
        onClose={() => setReDeliveryOtpModalState(prev => ({ ...prev, isOpen: false }))}
        purchaseId={reDeliveryOtpModalState.purchaseId}
        productTitle={reDeliveryOtpModalState.productTitle}
        maskedEmail={reDeliveryOtpModalState.maskedEmail}
        onVerifiedSuccess={() => {
          setReDeliveryOtpModalState(prev => ({ ...prev, isOpen: false }));
          fetchPurchases();
        }}
      />

      {/* CUSTOM ORDER SECURE CAD DOWNLOAD OTP MODAL */}
      <OrderOTPVerificationModal
        isOpen={orderOtpModalState.isOpen}
        onClose={() => setOrderOtpModalState(prev => ({ ...prev, isOpen: false }))}
        orderId={orderOtpModalState.orderId}
        orderTitle={orderOtpModalState.orderTitle}
        maskedEmail={orderOtpModalState.maskedEmail}
        debugOtp={orderOtpModalState.debugOtp}
        onVerifiedSuccess={() => {
          setOrderOtpModalState(prev => ({ ...prev, isOpen: false }));
          fetchCustomRequests();
          fetchClientOrders();
        }}
      />

      {/* BESPOKE CAD SPECIFICATION RECORD MODAL */}
      {specsModalRequest && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setSpecsModalRequest(null)}
        >
          <div 
            className="relative w-full max-w-4xl bg-[#09112B] border-2 border-[#D4AF37]/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_25px_80px_rgba(0,0,0,0.9)] max-h-[92vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D4AF37]/30 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-[#0B1330] font-mono font-extrabold text-xs">
                    REQ #{specsModalRequest.id}
                  </span>
                  <span className="text-xs font-mono text-[#C9C2A6]">
                    Submitted on {new Date(specsModalRequest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {specsModalRequest.submission_intent === 'place_order' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                      Direct CAD Order
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                      Free Quote Request
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#FAF8F3]">
                  Bespoke CAD Specification Sheet &amp; Artisan Brief
                </h3>
                <p className="text-xs text-[#C9C2A6]">
                  Complete technical configuration entered by client for 3D modeling and castability engineering.
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#FAF8F3] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSpecsModalRequest(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Client Identity Details */}
            <div className="p-4 rounded-2xl bg-[#121F4D]/50 border border-[#D4AF37]/25 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-[#C9C2A6] uppercase block">Client Name</span>
                <strong className="text-[#FAF8F3]">{specsModalRequest.contact_name || specsModalRequest.client_name || 'Client'}</strong>
              </div>
              {specsModalRequest.contact_email && (
                <div>
                  <span className="text-[10px] font-mono text-[#C9C2A6] uppercase block">Email Address</span>
                  <strong className="text-[#FAF8F3]">{specsModalRequest.contact_email}</strong>
                </div>
              )}
              {specsModalRequest.contact_phone && (
                <div>
                  <span className="text-[10px] font-mono text-[#C9C2A6] uppercase block">Contact Phone</span>
                  <strong className="text-[#FAF8F3]">{specsModalRequest.contact_phone}</strong>
                </div>
              )}
            </div>

            {/* Core Jewellery Parameters Grid */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] font-bold flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> Core Jewellery Architecture
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Category</span>
                  <p className="font-bold text-[#FAF8F3] capitalize">{specsModalRequest.category_name || 'Bespoke'}</p>
                </div>

                {/* Metal Alloy */}
                {(() => {
                  const selMetal = specsModalRequest.selections?.find((s: any) => s.group_key === 'metal' || s.group_label?.toLowerCase().includes('metal'));
                  const metalName = selMetal?.value_label || specsModalRequest.metal_alloy_name;
                  return metalName ? (
                    <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                      <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Metal Alloy</span>
                      <p className="font-bold text-[#FAF8F3]">{metalName}</p>
                    </div>
                  ) : null;
                })()}

                {/* Ring Sizing */}
                {specsModalRequest.ring_size && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Ring Sizing</span>
                    <p className="font-bold text-[#FAF8F3]">
                      Size {specsModalRequest.ring_size} ({(specsModalRequest.ring_size_standard || '').toLowerCase() === 'in_hk' ? 'IN_HK' : (specsModalRequest.ring_size_standard?.toUpperCase() || 'IN_HK')})
                    </p>
                  </div>
                )}

                {/* Target Weight */}
                {specsModalRequest.target_weight_grams && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Target Weight</span>
                    <p className="font-bold text-[#FAF8F3]">{specsModalRequest.target_weight_grams} grams</p>
                  </div>
                )}

                {/* Production Complexity Tier */}
                {specsModalRequest.budget_range && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Complexity Tier</span>
                    <p className="font-bold text-[#F5E7A3]">{specsModalRequest.budget_range}</p>
                  </div>
                )}

                {/* Target Completion Date */}
                {specsModalRequest.needed_by_date && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Target Completion</span>
                    <p className="font-bold text-[#F5E7A3]">
                      {new Date(specsModalRequest.needed_by_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}

                {/* Aesthetic Style */}
                {specsModalRequest.aesthetic_style_name && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Design Style</span>
                    <p className="font-bold text-[#FAF8F3]">{specsModalRequest.aesthetic_style_name}</p>
                  </div>
                )}

                {/* Dimensions */}
                {(specsModalRequest.height_mm || specsModalRequest.width_mm) && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Target Dimensions</span>
                    <p className="font-bold text-[#FAF8F3]">
                      {specsModalRequest.height_mm ? `H: ${specsModalRequest.height_mm}mm ` : ''}
                      {specsModalRequest.width_mm ? `W: ${specsModalRequest.width_mm}mm` : ''}
                    </p>
                  </div>
                )}

                {/* Chain / Backing / Bracelet */}
                {specsModalRequest.chain_length && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Chain Preference</span>
                    <p className="font-bold text-[#FAF8F3]">{specsModalRequest.chain_length}</p>
                  </div>
                )}
                {specsModalRequest.earring_backing && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Earring Backing</span>
                    <p className="font-bold text-[#FAF8F3]">{specsModalRequest.earring_backing}</p>
                  </div>
                )}
                {specsModalRequest.bracelet_style && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase">Bracelet Style</span>
                    <p className="font-bold text-[#FAF8F3]">{specsModalRequest.bracelet_style}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Atelier Component Selections */}
            {specsModalRequest.selections && specsModalRequest.selections.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> Atelier Component Selections
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  {specsModalRequest.selections.map((sel: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-2xl bg-[#070D22] border border-white/5 flex items-center justify-between">
                      <span className="text-[#C9C2A6] text-[11px]">{sel.group_label}:</span>
                      <div className="flex items-center gap-1.5 font-bold text-[#FAF8F3]">
                        {sel.swatch_color && (
                          <span className="w-3 h-3 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: sel.swatch_color }} />
                        )}
                        <span>{sel.value_label || sel.other_text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gemstone & Diamond Architecture Table */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] font-bold flex items-center gap-1.5">
                <Gem className="w-4 h-4" /> Gemstones &amp; Diamond Setting Plan
              </span>
              {specsModalRequest.is_metal_only ? (
                <div className="p-4 rounded-2xl bg-[#070D22] border border-white/5 text-xs text-slate-300">
                  Solid Metal Design &mdash; No diamond seats, prongs, or stone settings required.
                </div>
              ) : specsModalRequest.stones && specsModalRequest.stones.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#070D22]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-[10px] uppercase font-mono text-[#C9C2A6] border-b border-white/10">
                      <tr>
                        <th className="p-3">Stone Type</th>
                        <th className="p-3">Shape</th>
                        <th className="p-3">Setting Style</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3">Size / Carat</th>
                        <th className="p-3">Clarity / Color</th>
                        <th className="p-3">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {specsModalRequest.stones.map((st: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="p-3 font-bold text-white">{st.stone_type}</td>
                          <td className="p-3 text-[#FAF8F3]">{st.shape || 'Standard'}</td>
                          <td className="p-3 text-[#FAF8F3]">{st.setting_style || 'Prong'}</td>
                          <td className="p-3 font-bold text-[#F5E7A3]">{st.quantity || 1}x</td>
                          <td className="p-3 text-[#F5E7A3]">{st.size_value ? `${st.size_value} ${st.size_unit || 'ct'}` : '--'}</td>
                          <td className="p-3 text-[#C9C2A6]">{[st.clarity, st.color].filter(Boolean).join(' • ') || 'Standard'}</td>
                          <td className="p-3">
                            {st.is_center_stone ? (
                              <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-bold uppercase">
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
              ) : specsModalRequest.gemstones && specsModalRequest.gemstones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {specsModalRequest.gemstones.map((gem: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-2xl bg-[#070D22] border border-white/5 flex justify-between">
                      <span className="font-bold text-white">{gem.quantity}x {gem.stone_type} ({gem.cut_type})</span>
                      <span className="font-mono text-[#F5E7A3]">{gem.carat_size || 'Spec'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#070D22] border border-white/5 text-xs text-slate-300">
                  {specsModalRequest.gemstone_preference_open ? 'Client selected: Let Designer Decide optimal stone layout' : 'Plain metal piece &mdash; No gemstone specifications declared.'}
                </div>
              )}
            </div>

            {/* Personalization, Engraving & Branding */}
            {(specsModalRequest.engraving_text || specsModalRequest.has_logo || specsModalRequest.client_consent_to_feature) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {specsModalRequest.engraving_text && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Laser Engraving</span>
                    <p className="font-serif italic text-[#F5E7A3] text-sm">"{specsModalRequest.engraving_text}"</p>
                    <p className="text-[10px] text-[#C9C2A6] font-mono">Font: {specsModalRequest.engraving_font || 'Script'} • Placement: {specsModalRequest.engraving_placement || 'Inside Shank'}</p>
                  </div>
                )}
                {specsModalRequest.has_logo && (
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Brand Logo Hallmark</span>
                    <p className="text-emerald-400 font-bold">✓ Vector Hallmark Stamping Requested</p>
                  </div>
                )}
                <div className="p-3.5 rounded-2xl bg-[#070D22] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Portfolio Showcase</span>
                  <p className={specsModalRequest.client_consent_to_feature ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {specsModalRequest.client_consent_to_feature ? '✓ Consent Granted for Portfolio' : 'Private Model — Do Not Feature'}
                  </p>
                </div>
              </div>
            )}

            {/* Artisan Brief & Special Notes */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Client Design Brief &amp; Special Instructions
              </span>
              <div className="p-4 rounded-2xl bg-[#070D22] border border-white/5 text-xs text-slate-300 leading-relaxed space-y-2">
                <p>{specsModalRequest.description || 'Watertight 3D CAD design request.'}</p>
                {specsModalRequest.special_instructions && specsModalRequest.special_instructions !== specsModalRequest.description && (
                  <div className="pt-2 border-t border-white/10 text-amber-300/90 font-mono text-xs">
                    <strong className="text-amber-200">Special Instructions / Catalog Ref:</strong> {specsModalRequest.special_instructions}
                  </div>
                )}
              </div>
            </div>

            {/* Studio Catalog References */}
            {specsModalRequest.catalog_references && specsModalRequest.catalog_references.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Selected Studio Catalog References ({specsModalRequest.catalog_references.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {specsModalRequest.catalog_references.map((cRef: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      onClick={() => cRef.image && setSelectedSketchUrl(cRef.image)}
                      className="p-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 hover:border-[#D4AF37] flex items-center gap-3 cursor-pointer transition-all hover:bg-[#0c1436]"
                    >
                      {cRef.image ? (
                        <img src={cRef.image} alt={cRef.title} className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-[10px] text-[#C9C2A6] shrink-0 font-mono">CAD</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-[#D4AF37] block font-bold">{cRef.sku || `SKU-${cRef.id}`}</span>
                        <p className="text-xs font-semibold text-[#FAF8F3] truncate">{cRef.title}</p>
                        <span className="text-[9px] text-[#C9C2A6] block">Click to enlarge image</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sketches */}
            {specsModalRequest.sketches && specsModalRequest.sketches.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] font-bold">
                  Attached Reference Sketches ({specsModalRequest.sketches.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {specsModalRequest.sketches.map((sk: any) => (
                    <img
                      key={sk.id}
                      src={sk.image_url || sk.image}
                      alt="Sketch"
                      onClick={() => setSelectedSketchUrl(sk.image_url || sk.image)}
                      className="w-20 h-20 rounded-2xl object-cover border border-white/20 hover:border-[#D4AF37] cursor-pointer"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSpecsModalRequest(null)}
                className="px-6 py-2.5 bg-[#121F4D] hover:bg-[#1A2D6D] border border-[#D4AF37]/50 text-[#FAF8F3] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Specification Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal for Milestone Stages */}
      <PaymentGatewayModal
        isOpen={stagePaymentModalState.isOpen}
        onClose={() => setStagePaymentModalState((prev) => ({ ...prev, isOpen: false }))}
        title={stagePaymentModalState.title}
        subtitle={`Milestone ${stagePaymentModalState.percentage ? `${stagePaymentModalState.percentage}% ` : ''}Stage Settlement`}
        amount={stagePaymentModalState.amount}
        currency="INR"
        itemType="milestone_stage"
        orderDetails={{
          id: stagePaymentModalState.stageId,
        }}
        onPaymentSuccess={handleStagePaymentSuccess}
      />
    </div>
  );
};


