import React, { useState, useEffect } from 'react';
import { PageId, Product } from '../types';
import { PRODUCTS, SAMPLE_ORDERS } from '../data/mockData';
import { CURRENT_STAFF_MEMBER } from '../data/staffMockData';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  CreditCard
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';

import { appStore } from '../services/store';

import { OTPVerificationModal } from '../components/delivery/OTPVerificationModal';
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

  
  // UI Expansion States
  const [expandedSpecs, setExpandedSpecs] = useState<{ [key: number]: boolean }>({});
  const [selectedSketchUrl, setSelectedSketchUrl] = useState<string | null>(null);

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

      // Combine DB requests with local appStore requests as fallback
      const localRequests = appStore.getCustomRequests() || [];
      const combined = [...dbRequests];

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

  useEffect(() => {
    fetchCustomRequests();
    if (activeTab === 'downloads') {
      fetchPurchases();
    }
  }, [isLoggedIn, user, activeTab]);

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




  const handleAcceptQuote = async (reqId: number) => {
    setIsSubmitting((prev) => ({ ...prev, [reqId]: true }));
    try {
      await api.request(`/custom-requests/${reqId}/accept-quote/`, {
        method: 'POST',
      });
      fetchCustomRequests();
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

  const handlePayStage = async (stageId: number) => {
    try {
      await api.request('/payments/pay-stage/', {
        method: 'POST',
        body: JSON.stringify({ stage_id: stageId }),
      });
      alert('Milestone stage payment confirmed!');
      fetchCustomRequests();
    } catch (err: any) {
      alert(err?.message || 'Stage payment failed.');
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

  const wishlistedProducts = PRODUCTS.filter((p) => wishlistIds.includes(p.id));

  const handleSimulateDownload = (productTitle: string, fileType: string) => {
    const text = `SHIULI CAD STUDIO — MASTER DELIVERABLE
Product: ${productTitle}
File Format: ${fileType}
Tolerance: 0.02mm
Mesh Integrity: 100% Watertight Solid (Zero Non-Manifold Edges)
Shrinkage Allowance: 1.25% Gold/Platinum pre-scaled
License: Atelier Studio Production
Client Account: ${userEmail}
Support Contact: info@shiulicadstudio.com | Phone: +91 9662159084`;

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
            <span>My CAD Vault ({purchases.length || SAMPLE_ORDERS.length})</span>
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
            <span>Order History</span>
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
                const order = req.order;
                const assignedStaff = order?.assigned_staff;
                const totalVal = parseFloat(req.agreed_price || req.estimated_price_shown || '200');
                
                // Calculate paid amount
                let paidVal = 0;
                if (order?.payment_stages && order.payment_stages.length > 0) {
                  paidVal = order.payment_stages
                    .filter((st: any) => st.status === 'paid')
                    .reduce((acc: number, st: any) => acc + parseFloat(st.amount || '0'), 0);
                } else if (req.status === 'agreed' || order) {
                  paidVal = totalVal * 0.1; // booking 10%
                }

                const paidPct = Math.min(100, roundVal((paidVal / totalVal) * 100));

                function roundVal(v: number) {
                  return Math.round(v);
                }

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

                        <h2 className="font-serif text-3xl font-extrabold text-[#FAF8F3]">
                          {req.category_name || 'Bespoke Custom Jewellery'} ({req.metal_alloy_name || '18K Yellow Gold'})
                        </h2>
                      </div>

                      {/* COMPACT PAYMENT PROGRESS BAR */}
                      <div className="p-4 rounded-2xl bg-[#09112B] border border-[#D4AF37]/30 sm:w-80 space-y-2 shadow-lg">
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
                          href={`https://wa.me/919662159084?text=Hello%20Shiuli%20CAD%20Studio%2C%20I%20am%20in%20touch%20regarding%20REQ%20%23${req.id}.`}
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
                          href={`https://wa.me/919662159084?text=Hello%20Shiuli%20CAD%20Studio%2C%20I%20am%20in%20touch%20regarding%20REQ%20%23${req.id}.`}
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
                          <div className="flex items-center justify-between">
                            <h3 className="font-serif text-xl font-bold text-[#FAF8F3]">
                              1. Bespoke Custom Request Submitted
                            </h3>
                            <span className="text-xs font-mono text-[#C9C2A6]">
                              {new Date(req.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {/* EXPANDABLE SPECIFICATIONS ACCORDION */}
                          <div className="rounded-2xl bg-[#09112B] border border-white/10 p-4 space-y-3">
                            <button
                              onClick={() => setExpandedSpecs((prev) => ({ ...prev, [req.id]: !prev[req.id] }))}
                              className="w-full flex items-center justify-between text-xs text-[#F5E7A3] font-semibold hover:underline"
                            >
                              <span className="flex items-center gap-2">
                                <Gem className="w-4 h-4 text-[#D4AF37]" />
                                View Full Submitted Brief &amp; Reference Sketches ({req.sketches?.length || 0})
                              </span>
                              {expandedSpecs[req.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {expandedSpecs[req.id] && (
                              <div className="pt-3 border-t border-white/10 space-y-4 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-1">
                                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Metal &amp; Style:</span>
                                    <p>{req.metal_alloy_name || '18K Gold'} &bull; {req.aesthetic_style_name || 'Bespoke'}</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-[#060B1E] border border-white/5 space-y-1">
                                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Gemstones:</span>
                                    <p>{req.gemstone_preference_open ? 'Let Designer Decide' : 'Custom Configured'}</p>
                                  </div>
                                </div>

                                {req.sketches && req.sketches.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Uploaded Sketches:</span>
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
                                            onClick={() => handlePayStage(st.id)}
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
                                          onClick={() => alert('Please click "Accept Quote" above to activate live order payment schedule.')}
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
                          order?.milestones?.some((m: any) => m.stage.includes('Approved'))
                            ? 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]'
                            : 'bg-[#060B1E] border-slate-700'
                        }`}>
                          <Eye className="w-3.5 h-3.5 text-[#070D22]" />
                        </div>

                        <div className="space-y-3">
                          <h3 className="font-serif text-xl font-bold text-[#FAF8F3]">
                            4. In-Progress 3D CAD Preview Review
                          </h3>

                          {order ? (
                            <div className="p-5 rounded-2xl bg-[#09112B] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-[#F5E7A3]">
                                  {order.milestones?.some((m: any) => m.stage.includes('Approved'))
                                    ? '3D Design Preview Approved'
                                    : 'Artisan Modeling Complete'}
                                </span>
                                <p className="text-xs text-[#C9C2A6]">
                                  Review 360 raytraced render previews before unlocking Stage 2 payment.
                                </p>
                              </div>

                              <button
                                onClick={() => handleApproveDesignPreview(order.id)}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-500 flex items-center justify-center gap-2 shadow-md shrink-0"
                              >
                                <CheckCircle2 className="w-4 h-4 text-white" />
                                <span>Approve 3D Preview</span>
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-[#C9C2A6] italic">Preview review unlocks once CAD artisan starts modeling.</p>
                          )}
                        </div>
                      </div>

                      {/* NODE 5: DELIVERABLES & FINAL SOURCE FILES */}
                      <div className="relative group">
                        <div className={`absolute -left-[31px] sm:-left-[47px] top-0 w-6 h-6 rounded-full border-4 border-[#070D22] flex items-center justify-center ${
                          order?.status === 'completed'
                            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                            : 'bg-[#060B1E] border-slate-700'
                        }`}>
                          <Download className="w-3.5 h-3.5 text-[#070D22]" />
                        </div>

                        <div className="space-y-3">
                          <h3 className="font-serif text-xl font-bold text-[#FAF8F3]">
                            5. Final Watertight Deliverables (.3DM, .STL &amp; Renders)
                          </h3>

                          {order?.status === 'completed' ? (
                            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-wrap gap-3">
                              <button
                                onClick={() => handleSimulateDownload(`Order_${order.id}`, 'Rhino_7_8_Native.3DM')}
                                className="py-2.5 px-4 rounded-xl bg-[#070D22] border border-[#D4AF37]/50 text-xs font-mono font-bold text-[#F5E7A3] hover:bg-[#D4AF37]/20 flex items-center gap-2"
                              >
                                <Download className="w-4 h-4 text-[#D4AF37]" />
                                <span>Download .3DM Source File</span>
                              </button>
                              <button
                                onClick={() => handleSimulateDownload(`Order_${order.id}`, 'Castable_Watertight.STL')}
                                className="py-2.5 px-4 rounded-xl bg-[#070D22] border border-[#1E4FA3]/50 text-xs font-mono font-bold text-[#7EACFC] hover:bg-[#1E4FA3]/20 flex items-center gap-2"
                              >
                                <Download className="w-4 h-4 text-[#7EACFC]" />
                                <span>Download .STL Mesh</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl bg-[#09112B] border border-white/10 text-xs text-[#C9C2A6] flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-400" />
                              <span>Final source deliverables unlock automatically upon full project completion.</span>
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
          <div className="rounded-3xl bg-[#09112B] border border-[#D4AF37]/30 overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs text-[#C9C2A6]">
              <thead className="bg-[#070D22] text-[#FAF8F3] font-serif border-b border-[#D4AF37]/20 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Total</th>
                  <th className="p-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {SAMPLE_ORDERS.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-bold text-[#F5E7A3]">{order.id}</td>
                    <td className="p-4">{order.date}</td>
                    <td className="p-4 font-medium text-[#FAF8F3]">{order.items.map((it) => it.productTitle).join(', ')}</td>
                    <td className="p-4 font-serif text-sm font-bold text-[#FAF8F3]">{formatINR(order.total)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleSimulateDownload(order.id, 'Invoice.PDF')} className="px-3 py-1.5 rounded-xl border border-[#D4AF37]/40 text-[#F5E7A3] text-xs">
                        Invoice PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: WISHLIST */}
        {activeTab === 'wishlist' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistedProducts.map((prod) => (
              <div key={prod.id} className="p-4 rounded-3xl bg-[#09112B] border border-[#D4AF37]/30 space-y-3">
                <img src={prod.primaryImage} alt={prod.title} className="w-full aspect-square rounded-2xl object-cover" />
                <h4 className="font-serif font-bold text-[#FAF8F3] text-sm">{prod.title}</h4>
                <div className="font-serif text-base text-[#F5E7A3] font-bold">{formatINR(prod.price)}</div>
                <button onClick={() => onAddToCart(prod, 'standard')} className="btn-gold-luxury w-full py-2.5 rounded-xl text-xs font-bold uppercase">
                  Add to Bag
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

      {/* RE-DELIVERY OTP VERIFICATION MODAL */}
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
    </div>
  );
};


