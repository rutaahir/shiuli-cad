import React, { useState, useEffect, useRef } from 'react';
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
  Mail,
  Clock, 
  CheckCircle2, 
  FileCode2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
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
  Package,
  Zap,
  Mic,
  Volume2,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Bell,
  BellRing,
  CheckCheck,
  XCircle,
  Wrench,
  Cloud,
  Menu,
  Wallet
} from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { BrandLogo } from '../components/BrandLogo';

import { appStore } from '../services/store';

import { OTPVerificationModal } from '../components/delivery/OTPVerificationModal';
import { OrderOTPVerificationModal } from '../components/delivery/OrderOTPVerificationModal';
import { UserProfileModule } from '../components/profile/UserProfileModule';
import { ClientWalletCreditTab } from '../components/client/ClientWalletCreditTab';
import { RevisionRequestModal } from '../components/common/RevisionRequestModal';
import { 
  playNegotiationRing, 
  requestDesktopNotificationPermission, 
  triggerNegotiationAlert 
} from '../utils/negotiationNotificationHelper';

const USD_TO_INR_RATE = 86.85;

const formatINR = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '₹0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || num <= 0) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

interface ClientDashboardPageProps {
  onNavigate: (page: PageId, extraId?: string) => void;
  userEmail: string;
  wishlistIds: string[];
  onRemoveWishlist: (product: Product) => void;
  onAddToCart: (product: Product, license: 'standard' | 'commercial') => void;
  initialTab?: 'custom' | 'downloads' | 'orders' | 'wishlist' | 'profile' | 'wallet_credits';
}

export const ClientDashboardPage: React.FC<ClientDashboardPageProps> = ({
  onNavigate,
  userEmail,
  wishlistIds,
  onRemoveWishlist,
  onAddToCart,
  initialTab,
}) => {
  const { isLoggedIn, user } = useAuth();
  type ClientTabKey = 'custom' | 'downloads' | 'orders' | 'wishlist' | 'profile' | 'wallet_credits';

  // Read initial tab and order from URL search params or localStorage/sessionStorage
  const getInitialTab = (): ClientTabKey => {
    if (initialTab && ['custom', 'downloads', 'orders', 'wishlist', 'profile', 'wallet_credits'].includes(initialTab)) {
      return initialTab;
    }
    if (typeof window === 'undefined') return 'custom';
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['custom', 'downloads', 'orders', 'wishlist', 'profile', 'wallet_credits'].includes(tabParam)) {
      return tabParam as ClientTabKey;
    }
    const saved = localStorage.getItem('shiuli_client_active_tab') as ClientTabKey;
    if (saved && ['custom', 'downloads', 'orders', 'wishlist', 'profile', 'wallet_credits'].includes(saved)) {
      return saved;
    }
    return 'custom';
  };

  const getInitialOrderSelection = (): { openedId: number | null; reqKey: string | null } => {
    if (typeof window === 'undefined') return { openedId: null, reqKey: null };
    const params = new URLSearchParams(window.location.search);
    const ord = params.get('order') || localStorage.getItem('shiuli_client_opened_order') || sessionStorage.getItem('shiuli_client_opened_order');
    if (!ord) return { openedId: null, reqKey: null };
    if (ord.startsWith('fe-') || ord.startsWith('cr-')) {
      const num = parseInt(ord.replace(/^[a-z]+-/, ''), 10);
      return { openedId: isNaN(num) ? null : num, reqKey: ord };
    }
    const num = parseInt(ord, 10);
    return { openedId: isNaN(num) ? null : num, reqKey: isNaN(num) ? null : `cr-${num}` };
  };

  const initialOrderState = getInitialOrderSelection();

  const [activeTab, setActiveTabState] = useState<ClientTabKey>(getInitialTab);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Sync tab & order with browser URL, localStorage, and sessionStorage without page reload
  const updateUrlParams = (tab?: string, orderKey?: string | number | null) => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (tab) {
        url.searchParams.set('tab', tab);
        localStorage.setItem('shiuli_client_active_tab', tab);
      }
      if (orderKey !== undefined) {
        if (orderKey === null || orderKey === '') {
          url.searchParams.delete('order');
          localStorage.removeItem('shiuli_client_opened_order');
          sessionStorage.removeItem('shiuli_client_opened_order');
        } else {
          url.searchParams.set('order', String(orderKey));
          localStorage.setItem('shiuli_client_opened_order', String(orderKey));
          sessionStorage.setItem('shiuli_client_opened_order', String(orderKey));
        }
      }
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const setActiveTab = (tab: ClientTabKey) => {
    setActiveTabState(tab);
    updateUrlParams(tab);
  };

  const handleTabChange = (tab: ClientTabKey) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
  };

  // Lock body scroll while mobile drawer is open (Step 8A Rule 2)
  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileNavOpen]);

  // Live State
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [selectedCustomReqId, setSelectedCustomReqId] = useState<number | null>(initialOrderState.openedId);
  const [openedOrderId, setOpenedOrderId] = useState<number | null>(initialOrderState.openedId);
  const [activeStageTab, setActiveStageTab] = useState<'all' | 'specs' | 'negotiation' | 'payments' | 'preview' | 'deliverables'>('all');
  const [mobileAccordionStage, setMobileAccordionStage] = useState<string | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState<string>('');
  const [loadingCustom, setLoadingCustom] = useState<boolean>(false);
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  // Step 8C: Local UI state for mobile card expansion/collapse (not reset by 7-second background refresh)
  const [mobileExpandedCards, setMobileExpandedCards] = useState<{ [key: string]: boolean }>({});

  // Step 8C: Status taxonomy check: Active vs. Non-Active (completed, cancelled, rejected)
  const isOrderActiveStatus = (item: any, ord: any): boolean => {
    if (ord && ord.status) {
      return ord.status !== 'completed' && ord.status !== 'cancelled';
    }
    return item.status !== 'rejected';
  };

  const toggleMobileCardExpand = (itemKey: string, defaultExpanded: boolean) => {
    setMobileExpandedCards((prev) => ({
      ...prev,
      [itemKey]: prev[itemKey] !== undefined ? !prev[itemKey] : !defaultExpanded,
    }));
  };

  const handleOpenCustomOrder = (item: any, initialStageTab?: 'all' | 'specs' | 'negotiation' | 'payments' | 'preview' | 'deliverables') => {
    const itemKey = item.is_file_edit ? `fe-${item.id}` : `cr-${item.id}`;
    setSelectedCustomReqId(item.id);
    setSelectedReqKey(itemKey);
    setOpenedOrderId(item.id);
    updateUrlParams('custom', itemKey);
    if (initialStageTab) {
      setActiveStageTab(initialStageTab);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToGrid = () => {
    setOpenedOrderId(null);
    setSelectedReqKey(null);
    setMobileAccordionStage(null);
    localStorage.removeItem('shiuli_client_opened_order');
    sessionStorage.removeItem('shiuli_client_opened_order');
    updateUrlParams(activeTab, null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Real-Time Negotiation Notification & Audio Alert
  const [negotiationAlertBanner, setNegotiationAlertBanner] = useState<{
    reqId: number;
    orderId?: number;
    title: string;
    message: string;
    offeredPrice?: number;
  } | null>(null);
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });
  const lastAdminMsgIdRef = useRef<{ [reqId: string]: number }>({});
  const lastStatusRef = useRef<{ [key: string]: string }>({});
  const [selectedReqKey, setSelectedReqKey] = useState<string | null>(initialOrderState.reqKey);
  const initialFetchDoneRef = useRef<boolean>(false);
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
  const [revisionModalOrder, setRevisionModalOrder] = useState<any | null>(null);
  const [revisionToastMsg, setRevisionToastMsg] = useState<string | null>(null);

  // Re-submit Payment Proof State
  const [resubmitModalPurchase, setResubmitModalPurchase] = useState<any | null>(null);
  const [resubmitUtr, setResubmitUtr] = useState('');
  const [resubmitMethod, setResubmitMethod] = useState<'upi' | 'cash_check'>('upi');
  const [resubmitDetails, setResubmitDetails] = useState('');
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [resubmitFilePreview, setResubmitFilePreview] = useState<string | null>(null);
  const [isSubmittingResubmit, setIsSubmittingResubmit] = useState(false);

  const openResubmitModal = (purchase: any) => {
    setResubmitModalPurchase(purchase);
    setResubmitUtr(purchase.payment_transaction_id || '');
    setResubmitMethod(purchase.payment_method === 'cash_check' ? 'cash_check' : 'upi');
    setResubmitDetails(purchase.payment_details || '');
    setResubmitFile(null);
    setResubmitFilePreview(null);
  };

  const handleConfirmResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitModalPurchase) return;
    if (!resubmitUtr.trim()) {
      alert('Please enter your updated 12-digit UPI reference number or transaction reference.');
      return;
    }

    setIsSubmittingResubmit(true);
    try {
      let screenshotBase64: string | undefined = undefined;
      if (resubmitFile) {
        screenshotBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(resubmitFile);
        });
      }

      await api.resubmitPurchaseProof(resubmitModalPurchase.id, {
        payment_transaction_id: resubmitUtr.trim(),
        utr_number: resubmitUtr.trim(),
        payment_method: resubmitMethod,
        payment_details: resubmitDetails.trim(),
        payment_screenshot: screenshotBase64,
      });

      alert('Payment proof re-submitted successfully! Atelier accounts will review and verify your submission.');
      setResubmitModalPurchase(null);
      await fetchPurchases();
    } catch (err: any) {
      alert(err?.message || 'Failed to re-submit payment proof.');
    } finally {
      setIsSubmittingResubmit(false);
    }
  };

  const getOrderForRequest = (r: any) => {
    if (!r) return null;
    if (r.order) return r.order;
    if (r.converted_order_details) return r.converted_order_details;
    if (r.is_file_edit) {
      return (
        clientOrders.find((o: any) =>
          o.order_type === 'file_edit' && (
            o.file_edit_request?.id === r.id ||
            o.file_edit_request === r.id ||
            String(o.id) === String(r.converted_order)
          )
        ) || null
      );
    }
    return (
      clientOrders.find((o: any) =>
        o.custom_request?.id === r.id || String(o.id) === String(r.order?.id)
      ) || null
    );
  };

  const fetchCustomRequests = async (isBackgroundPoll: boolean = false) => {
    if (!isBackgroundPoll && !initialFetchDoneRef.current && customRequests.length === 0) {
      setLoadingCustom(true);
    }
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

      // Strictly filter to ensure requests belong to the current authenticated user or last submitted brief
      const storedLastReqId = localStorage.getItem('shiuli_last_submitted_req_id');
      const storedContactEmail = (localStorage.getItem('shiuli_contact_email') || '').toLowerCase().trim();
      const currentUserEmail = (user?.email || userEmail || storedContactEmail || '').toLowerCase().trim();
      const currentUserId = user?.id;
      const isStaffOrAdmin = Boolean(user?.is_staff || user?.role === 'admin' || user?.role === 'staff');

      // For authenticated non-staff clients, backend /custom-requests/ is ALREADY strictly scoped to the user
      const userDbRequests = (isLoggedIn && !isStaffOrAdmin)
        ? dbRequests
        : dbRequests.filter((req: any) => {
            if (storedLastReqId && String(req.id) === String(storedLastReqId)) return true;
            if (!currentUserEmail && !currentUserId) return true;
            const matchesId = currentUserId && (String(req.client) === String(currentUserId) || String(req.client?.id) === String(currentUserId));
            const contactEmail = (req.contact_email || '').toLowerCase().trim();
            const clientEmailVal = (req.client_email || req.client?.email || '').toLowerCase().trim();
            const matchesEmail = currentUserEmail && (
              contactEmail === currentUserEmail ||
              clientEmailVal === currentUserEmail ||
              (contactEmail && currentUserEmail.startsWith(contactEmail.split('@')[0])) ||
              (clientEmailVal && currentUserEmail.startsWith(clientEmailVal.split('@')[0])) ||
              (contactEmail && contactEmail.startsWith(currentUserEmail.split('@')[0]))
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
        if (!loc || !loc.id) return false;
        if (storedLastReqId && String(loc.id) === String(storedLastReqId)) return true;
        if (!currentUserEmail && !currentUserId) return true;
        const locEmail = (loc.clientEmail || loc.client_email || loc.contact_email || loc.email || '').toLowerCase().trim();
        if (!locEmail) return true;
        const matchesEmail = currentUserEmail && (
          locEmail === currentUserEmail ||
          (locEmail && currentUserEmail.startsWith(locEmail.split('@')[0])) ||
          (currentUserEmail && locEmail.startsWith(currentUserEmail.split('@')[0]))
        );
        const matchesId = currentUserId && String(loc.clientId) === String(currentUserId);
        return matchesEmail || matchesId;
      });

      const combined: any[] = [...userDbRequests];

      localRequests.forEach((loc: any) => {
        if (!combined.some((c: any) => !c.is_file_edit && String(c.id) === String(loc.id))) {
          combined.push({
            id: loc.id,
            request_mode: loc.request_mode || 'quick',
            category_name: loc.jewelleryType || loc.title || 'Custom Jewellery',
            aesthetic_style_name: loc.metalPreference || loc.metal_alloy_name || 'Luxury Style',
            metal_alloy_name: loc.metalPreference || loc.metal_alloy_name || 'Custom Gold',
            estimated_price_shown: parseFloat(String(loc.currentQuote || loc.targetBudget || '0').replace(/[^0-9.]/g, '')),
            status: loc.status || 'new',
            description: loc.description || 'Bespoke CAD Design Brief',
            reference_image: loc.referenceImage || loc.reference_image,
            voice_recording_url: loc.voice_recording_url || '',
            created_at: loc.createdAt || loc.created_at || new Date().toISOString(),
            messages: loc.messages || [],
            order: loc.order || null,
          });
        }
      });

      // Fetch CAD File Editing & Modification Orders
      let fileEditRequests: any[] = [];
      try {
        const feData: any = await api.getFileEditRequests();
        fileEditRequests = Array.isArray(feData) ? feData : (feData?.results || feData?.data || []);
      } catch (err) {
        console.warn('Backend file edit requests fetch error:', err);
      }

      // Filter and append file edit requests for this user
      fileEditRequests.forEach((fe: any) => {
        const matchesId = currentUserId && (String(fe.client) === String(currentUserId) || String(fe.client?.id) === String(currentUserId));
        const contactEmail = (fe.contact_email || '').toLowerCase().trim();
        const clientEmailVal = (fe.client_email || fe.client?.email || '').toLowerCase().trim();
        const matchesEmail = currentUserEmail && (
          contactEmail === currentUserEmail ||
          clientEmailVal === currentUserEmail ||
          (contactEmail && currentUserEmail.startsWith(contactEmail.split('@')[0])) ||
          (clientEmailVal && currentUserEmail.startsWith(clientEmailVal.split('@')[0])) ||
          (contactEmail && contactEmail.startsWith(currentUserEmail.split('@')[0]))
        );
        const matchesUsername = user?.username && (
          fe.client_name === user.username ||
          (fe.client_name && user.username.includes(fe.client_name))
        );

        if (!isLoggedIn || isStaffOrAdmin || matchesId || matchesEmail || matchesUsername) {
          const feCurrency = (fe.currency || 'USD').toUpperCase();
          const USD_RATE = 86.85;

          const toBothCurrencies = (raw: any) => {
            if (raw === undefined || raw === null || raw === '') return { inr: null, usd: null };
            const num = typeof raw === 'number' ? raw : parseFloat(raw);
            if (isNaN(num) || num <= 0) return { inr: null, usd: null };
            if (feCurrency === 'INR') {
              return {
                inr: Math.round(num),
                usd: Number((num / USD_RATE).toFixed(2))
              };
            } else {
              return {
                inr: Math.round(num * USD_RATE),
                usd: Number(num.toFixed(2))
              };
            }
          };

          const agreedConv = toBothCurrencies(fe.agreed_price);
          const quotedConv = toBothCurrencies(fe.quoted_price);
          const estConv = toBothCurrencies(fe.estimated_price_shown);

          // Normalize messages so sender_type is admin / client consistently
          const normalizedMsgs = (fe.messages || []).map((m: any) => {
            const senderType = m.sender_type || m.sender;
            const msgCur = (m.currency || feCurrency).toUpperCase();
            const rawPrice = m.offered_price != null ? m.offered_price : m.price_offer;
            let pInr: number | null = null;
            let pUsd: number | null = null;
            if (rawPrice != null && rawPrice !== '') {
              const pNum = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
              if (!isNaN(pNum) && pNum > 0) {
                if (msgCur === 'INR') {
                  pInr = Math.round(pNum);
                  pUsd = Number((pNum / USD_RATE).toFixed(2));
                } else {
                  pInr = Math.round(pNum * USD_RATE);
                  pUsd = Number(pNum.toFixed(2));
                }
              }
            }

            return {
              id: m.id,
              sender_type: senderType,
              sender: senderType,
              sender_name: m.sender_name || (senderType === 'admin' ? 'Senior CAD Engineer' : 'You'),
              message: m.message,
              offered_price: pInr,
              price_offer: pInr,
              offered_price_usd: pUsd,
              offered_price_inr: pInr,
              currency: msgCur,
              created_at: m.created_at,
            };
          });

          combined.push({
            id: fe.id,
            is_file_edit: true,
            request_mode: 'file_edit',
            category_name: 'CAD File Modification Studio',
            aesthetic_style_name: fe.original_file_format ? `.${fe.original_file_format.toUpperCase()} 3D Model` : 'CAD Repair',
            metal_alloy_name: fe.modification_type_labels?.join(', ') || '3D Modifications',
            estimated_price_shown: agreedConv.inr || quotedConv.inr || estConv.inr || 0,
            agreed_price: agreedConv.inr,
            quoted_price: quotedConv.inr,
            agreed_price_usd: agreedConv.usd,
            quoted_price_usd: quotedConv.usd,
            estimated_price_shown_usd: estConv.usd,
            currency: 'INR',
            original_currency: feCurrency,
            status: fe.status,
            description: fe.description,
            reference_image: fe.reference_image,
            voice_recording_url: fe.voice_note,
            voice_note: fe.voice_note,
            created_at: fe.created_at,
            messages: normalizedMsgs,
            order: fe.converted_order_details || null,
            converted_order: fe.converted_order,
            // File Edit Specific Properties:
            original_file: fe.original_file,
            original_file_format: fe.original_file_format,
            original_file_name: fe.original_file_name,
            storage_provider: fe.storage_provider,
            drive_file_id: fe.drive_file_id,
            drive_web_view_link: fe.drive_web_view_link,
            download_url: fe.download_url,
            file_size_bytes: fe.file_size_bytes,
            target_weight_grams: fe.target_weight_grams,
            target_stone_size: fe.target_stone_size,
            modification_type_labels: fe.modification_type_labels,
            admin_notes: fe.admin_notes,
            rejection_reason: fe.rejection_reason,
          });
        }
      });

      // Sort by creation date descending
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setCustomRequests(combined);

      // Check for incoming negotiation notifications and status changes from Studio Admin
      combined.forEach((r: any) => {
        const itemKey = r.is_file_edit ? `fe-${r.id}` : `cr-${r.id}`;
        const ord = getOrderForRequest(r);
        const ordNum = r.is_file_edit ? `File Edit #${r.id}` : (ord ? `Order #${ord.id}` : `Request #${r.id}`);

        // 1. Negotiation Message Alerts from Admin
        const adminMsgs = (r.messages || []).filter((m: any) => m.sender_type === 'admin' || m.sender === 'admin');
        const latestAdminMsg = adminMsgs[adminMsgs.length - 1];
        if (latestAdminMsg && latestAdminMsg.id) {
          if (initialFetchDoneRef.current) {
            const prevMsgId = lastAdminMsgIdRef.current[itemKey] || 0;
            if (latestAdminMsg.id > prevMsgId) {
              lastAdminMsgIdRef.current[itemKey] = latestAdminMsg.id;
              const offerTxt = latestAdminMsg.offered_price ? ` (Quote Offer: ${formatINR(latestAdminMsg.offered_price)})` : '';

              playNegotiationRing();
              triggerNegotiationAlert({
                title: `Shiuli CAD Studio: ${ordNum} Quotation & Negotiation`,
                body: `${latestAdminMsg.message || 'Studio Admin sent an updated quote/message'}${offerTxt}`,
                onClick: () => {
                  setSelectedCustomReqId(r.id);
                  setSelectedReqKey(itemKey);
                  setOpenedOrderId(r.id);
                  setActiveStageTab('negotiation');
                }
              });

              setNegotiationAlertBanner({
                reqId: r.id,
                orderId: ord?.id,
                title: `New Negotiation Offer on ${ordNum}`,
                message: latestAdminMsg.message || 'Studio Admin sent an updated negotiation offer.',
                offeredPrice: latestAdminMsg.offered_price ? Number(latestAdminMsg.offered_price) : undefined,
              });
            }
          } else {
            lastAdminMsgIdRef.current[itemKey] = latestAdminMsg.id;
          }
        }

        // 2. Status Transition Alerts (Approved / Agreed or Rejected / Declined)
        if (initialFetchDoneRef.current) {
          const prevStatus = lastStatusRef.current[itemKey];
          if (prevStatus && prevStatus !== r.status) {
            if (r.status === 'agreed') {
              playNegotiationRing();
              triggerNegotiationAlert({
                title: `Shiuli CAD Studio: ${ordNum} APPROVED!`,
                body: `Your ${r.is_file_edit ? 'CAD file edit order' : 'custom order'} #${r.id} has been APPROVED by Studio Admin.`,
                onClick: () => {
                  setSelectedCustomReqId(r.id);
                  setSelectedReqKey(itemKey);
                  setOpenedOrderId(r.id);
                }
              });
              setNegotiationAlertBanner({
                reqId: r.id,
                orderId: ord?.id,
                title: `${ordNum} APPROVED!`,
                message: `Studio Admin approved your order. Final agreed price: ${formatINR(r.agreed_price || r.estimated_price_shown)}.`,
                offeredPrice: r.agreed_price ? Number(r.agreed_price) : undefined,
              });
            } else if (r.status === 'rejected') {
              playNegotiationRing();
              triggerNegotiationAlert({
                title: `Shiuli CAD Studio: ${ordNum} Declined`,
                body: `Studio Admin was unable to proceed: ${r.rejection_reason || 'Please check order notes.'}`,
                onClick: () => {
                  setSelectedCustomReqId(r.id);
                  setSelectedReqKey(itemKey);
                  setOpenedOrderId(r.id);
                }
              });
              setNegotiationAlertBanner({
                reqId: r.id,
                orderId: ord?.id,
                title: `${ordNum} Declined`,
                message: r.rejection_reason || 'Studio Admin was unable to proceed with this order.',
              });
            }
          }
        }
        lastStatusRef.current[itemKey] = r.status;
      });

      if (combined.length > 0) {
        // Step 8D: Keep selected order across reload and background refetch by ID, never by array index
        const currentSavedOrder = typeof window !== 'undefined'
          ? (new URLSearchParams(window.location.search).get('order') || localStorage.getItem('shiuli_client_opened_order') || sessionStorage.getItem('shiuli_client_opened_order'))
          : null;

        let matched = null;
        if (currentSavedOrder) {
          matched = combined.find((c: any) =>
            (c.is_file_edit ? `fe-${c.id}` : `cr-${c.id}`) === currentSavedOrder ||
            String(c.id) === currentSavedOrder ||
            (c.order && String(c.order.id) === currentSavedOrder)
          );
        }

        // If not matched via URL/localStorage, match by active state selectedReqKey
        if (!matched && selectedReqKey) {
          matched = combined.find((c: any) => (c.is_file_edit ? `fe-${c.id}` : `cr-${c.id}`) === selectedReqKey);
        }

        // If still not matched, match by selectedCustomReqId
        if (!matched && selectedCustomReqId) {
          matched = combined.find((c: any) => c.id === selectedCustomReqId);
        }

        // Fall back to first ACTIVE order if previous selection not found, never random index 0
        if (!matched) {
          const activeOrder = combined.find((c: any) => {
            const ord = getOrderForRequest(c);
            return isOrderActiveStatus(c, ord);
          });
          matched = activeOrder || combined[0];
        }

        if (matched) {
          const targetKey = matched.is_file_edit ? `fe-${matched.id}` : `cr-${matched.id}`;
          setSelectedCustomReqId(matched.id);
          setSelectedReqKey(targetKey);
          if (currentSavedOrder) {
            setOpenedOrderId(matched.id);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch client custom requests:', e);
    } finally {
      if (!isBackgroundPoll) {
        setLoadingCustom(false);
      }
      initialFetchDoneRef.current = true;
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
      const isStaffOrAdmin = Boolean(user?.is_staff || user?.role === 'admin' || user?.role === 'staff');
      const filtered = (isLoggedIn && !isStaffOrAdmin)
        ? rawOrders
        : rawOrders.filter((ord: any) => {
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

  // Live polling for negotiation updates & quotes every 7 seconds (silent background refresh)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCustomRequests(true);
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
      const active = customRequests.find((r) => r.id === reqId);
      if (active?.is_file_edit) {
        await api.acceptFileEditQuote(reqId);
      } else {
        await api.request(`/custom-requests/${reqId}/accept-quote/`, {
          method: 'POST',
        });
      }
      await fetchCustomRequests();
      await fetchClientOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to accept quote. Please try again.');
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [reqId]: false }));
    }
  };

  const handleRejectQuote = async (reqId: number) => {
    const reason = window.prompt(
      'Are you sure you want to decline this quote? Please state your reason (optional):',
      'Price exceeds budget / Requirements changed'
    );
    if (reason === null) return;

    setIsSubmitting((prev) => ({ ...prev, [reqId]: true }));
    try {
      const active = customRequests.find((r) => r.id === reqId);
      if (active?.is_file_edit) {
        await api.rejectFileEditRequest(reqId, reason.trim() || 'Declined by customer');
      } else {
        await api.request(`/custom-requests/${reqId}/cancel/`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() || 'Declined by customer' }),
        });
      }
      await fetchCustomRequests();
    } catch (err: any) {
      alert(err?.message || 'Failed to decline quote. Please try again.');
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
      const active = customRequests.find((r) => r.id === reqId);
      if (active?.is_file_edit) {
        await api.negotiateFileEditRequest(reqId, {
          price: priceStr ? parseFloat(priceStr) : undefined,
          message: message || '',
          currency: 'INR',
        });
      } else {
        await api.request(`/custom-requests/${reqId}/negotiate/`, {
          method: 'POST',
          body: JSON.stringify({
            price: priceStr ? parseFloat(priceStr) : undefined,
            message: message || '',
          }),
        });
      }
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
    orderId?: number;
    isFullPayment?: boolean;
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

  const handlePayStage = (stage: any, orderId?: number) => {
    const isObj = typeof stage === 'object' && stage !== null;
    setStagePaymentModalState({
      isOpen: true,
      stageId: isObj ? stage.id : stage,
      orderId: orderId,
      isFullPayment: false,
      title: (isObj ? (stage.stage_name || stage.label) : null) || 'Milestone CAD Stage Payment',
      amount: isObj ? (Number(stage.amount) || 0) : 0,
      percentage: isObj ? (Number(stage.percentage) || 0) : 0,
    });
  };

  const handlePayFullOrder = (targetOrder: any, unpaidAmount: number) => {
    setStagePaymentModalState({
      isOpen: true,
      stageId: 0,
      orderId: targetOrder?.id,
      isFullPayment: true,
      title: `Order #${targetOrder?.id || ''} — Settle Complete Balance in Full`,
      amount: unpaidAmount,
      percentage: 100,
    });
  };

  const handleStagePaymentSuccess = async (result: any) => {
    try {
      if (stagePaymentModalState.isFullPayment && stagePaymentModalState.orderId) {
        await api.request('/payments/pay-full-order/', {
          method: 'POST',
          body: JSON.stringify({
            order_id: stagePaymentModalState.orderId,
            transaction_id: result.transactionId,
            payment_method: result.method,
            payment_details: result.paymentDetails || '',
          }),
        });
        setStagePaymentModalState((prev) => ({ ...prev, isOpen: false }));
        alert('Congratulations! Your entire order has been settled in full. All milestone stages are now unlocked.');
      } else {
        await api.request('/payments/pay-stage/', {
          method: 'POST',
          body: JSON.stringify({
            stage_id: stagePaymentModalState.stageId,
            transaction_id: result.transactionId,
            payment_method: result.method,
            payment_details: result.paymentDetails || '',
          }),
        });
        setStagePaymentModalState((prev) => ({ ...prev, isOpen: false }));
        alert('Milestone stage payment confirmed & recorded!');
      }
      fetchCustomRequests();
      fetchClientOrders();
    } catch (err: any) {
      alert(err?.message || 'Payment recording failed.');
    }
  };

  const handleApproveDesignPreview = async (orderId: number) => {
    try {
      await api.request(`/orders/${orderId}/approve-design-preview/`, {
        method: 'POST',
      });
      alert('3D Design Preview Approved! Next milestone payment stage unlocked.');
      await fetchCustomRequests();
      await fetchClientOrders();
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

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0B1330] pt-20 sm:pt-24 pb-20 sm:pb-24 px-3 sm:px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8">
        
        {/* LUXURY ATELIER HEADER PROFILE BANNER - Displayed ONLY on main dashboard, hidden inside order workspace */}
        {openedOrderId === null && (
          <RevealOnScroll className="relative rounded-3xl bg-gradient-to-r from-white via-[#FCFAF7] to-white border border-[#E8D7B7] p-4 sm:p-6 lg:p-7 shadow-[0_10px_35px_rgba(184,135,50,0.07)] overflow-hidden">
          {/* Subtle gold decorative glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#D4AF37]/10 via-transparent to-transparent rounded-full pointer-events-none -mr-20 -mt-20 blur-2xl" />

          {/* MOBILE COMPACT PROFILE CARD (Below sm) */}
          <div className="flex sm:hidden flex-col gap-2.5 relative z-10">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1E4FA3] via-[#D4AF37] to-[#F5E7A3] p-[2px] shadow-xs overflow-hidden">
                    {user?.profile_photo ? (
                      <img src={user.profile_photo} alt={user.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#FFFDF9] flex items-center justify-center text-[#B88732]">
                        <User className="w-5 h-5 text-[#B88732]" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border border-white flex items-center justify-center" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="font-serif text-sm font-bold text-[#0B1330] truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.username || 'Client Atelier')}
                    </h1>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#FFF8EC] border border-[#D4AF37]/60 text-[8px] text-[#9A6A1A] font-mono uppercase font-black">
                      {user?.role === 'admin' ? 'ADMIN' : user?.role === 'staff' ? 'ARTISAN' : 'CLIENT'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#5A6679] font-mono truncate">
                    {user?.email || userEmail || 'client@shiulicadstudio.com'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('custom-design')}
                className="btn-gold-luxury px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#0B1330]" />
                <span>+ Brief</span>
              </button>
            </div>

            {/* Quick Stat Counters (4-column compact bar on mobile) */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#E8D7B7]/50 text-center">
              <div
                onClick={() => handleTabChange('custom')}
                className="p-1.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 hover:border-[#D4AF37] transition-all cursor-pointer shadow-xs"
              >
                <span className="block text-[8px] font-mono uppercase text-[#687386] font-semibold truncate">Briefs</span>
                <span className="font-serif text-xs font-bold text-[#0B1330]">{customRequests.length}</span>
              </div>
              <div
                onClick={() => handleTabChange('custom')}
                className="p-1.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 hover:border-[#D4AF37] transition-all cursor-pointer shadow-xs"
              >
                <span className="block text-[8px] font-mono uppercase text-[#687386] font-semibold truncate">In Prod</span>
                <span className="font-serif text-xs font-bold text-emerald-700">
                  {customRequests.filter(r => r.order?.assigned_staff || r.status === 'in_progress').length}
                </span>
              </div>
              <div
                onClick={() => handleTabChange('downloads')}
                className="p-1.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 hover:border-[#D4AF37] transition-all cursor-pointer shadow-xs"
              >
                <span className="block text-[8px] font-mono uppercase text-[#687386] font-semibold truncate">Vault</span>
                <span className="font-serif text-xs font-bold text-[#0B1330]">{purchases.length}</span>
              </div>
              <div
                onClick={() => handleTabChange('wishlist')}
                className="p-1.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 hover:border-[#D4AF37] transition-all cursor-pointer shadow-xs"
              >
                <span className="block text-[8px] font-mono uppercase text-[#687386] font-semibold truncate">Wishlist</span>
                <span className="font-serif text-xs font-bold text-rose-600">{wishlistIds.length}</span>
              </div>
            </div>
          </div>

          {/* DESKTOP / TABLET SPACIOUS PROFILE CARD (hidden on mobile, flex on sm+) */}
          <div className="hidden sm:flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-6 relative z-10">
            {/* User Info */}
            <div className="flex items-center gap-3.5 sm:gap-5">
              <div className="relative">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#1E4FA3] via-[#D4AF37] to-[#F5E7A3] p-[2.5px] shadow-[0_4px_20px_rgba(212,175,55,0.35)] overflow-hidden">
                  {user?.profile_photo ? (
                    <img src={user.profile_photo} alt={user.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#FFFDF9] flex items-center justify-center text-[#B88732]">
                      <User className="w-7 h-7 sm:w-9 sm:h-9 text-[#B88732]" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow" title="Online Client Session">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                  <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0B1330] tracking-tight truncate">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.username || 'Client Atelier')}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFF8EC] border border-[#D4AF37]/60 text-[9px] sm:text-[10px] text-[#9A6A1A] font-mono uppercase tracking-widest font-black shadow-xs">
                    {user?.role === 'admin' ? 'ATELIER ADMIN' : user?.role === 'staff' ? 'CAD ARTISAN' : 'VERIFIED CLIENT'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#5A6679] font-mono flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-[#B88732] shrink-0" />
                  <span className="truncate">{user?.email || userEmail || 'client@shiulicadstudio.com'}</span>
                </p>
              </div>
            </div>

            {/* Quick Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full lg:w-auto">
              <div
                onClick={() => handleTabChange('custom')}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7]/80 hover:border-[#D4AF37] transition-all cursor-pointer text-center group shadow-xs"
              >
                <span className="block text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#687386] font-semibold">Active Briefs</span>
                <span className="font-serif text-base sm:text-xl font-bold text-[#0B1330] group-hover:text-[#B88732]">{customRequests.length}</span>
              </div>
              <div
                onClick={() => handleTabChange('custom')}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7]/80 hover:border-[#D4AF37] transition-all cursor-pointer text-center group shadow-xs"
              >
                <span className="block text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#687386] font-semibold">In Production</span>
                <span className="font-serif text-base sm:text-xl font-bold text-emerald-700 group-hover:text-emerald-800">
                  {customRequests.filter(r => r.order?.assigned_staff || r.status === 'in_progress').length}
                </span>
              </div>
              <div
                onClick={() => handleTabChange('downloads')}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7]/80 hover:border-[#D4AF37] transition-all cursor-pointer text-center group shadow-xs"
              >
                <span className="block text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#687386] font-semibold">CAD Vault</span>
                <span className="font-serif text-base sm:text-xl font-bold text-[#0B1330] group-hover:text-[#B88732]">{purchases.length}</span>
              </div>
              <div
                onClick={() => handleTabChange('wishlist')}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7]/80 hover:border-[#D4AF37] transition-all cursor-pointer text-center group shadow-xs"
              >
                <span className="block text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#687386] font-semibold">Saved Wishlist</span>
                <span className="font-serif text-base sm:text-xl font-bold text-[#0B1330] group-hover:text-rose-600">{wishlistIds.length}</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => onNavigate('custom-design')}
              className="btn-gold-luxury px-6 py-3 min-h-[44px] rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.35)] shrink-0 w-full sm:w-auto hover:brightness-105 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#0B1330]" />
              <span>+ Start Custom Brief</span>
            </button>
          </div>
        </RevealOnScroll>
        )}

        {/* STEP 8A: MOBILE SLIDE-OVER DRAWER BACKDROP & PANEL */}
        {isMobileNavOpen && (
          <div
            onClick={() => setIsMobileNavOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 lg:hidden animate-in fade-in duration-200"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 w-[290px] sm:w-[320px] bg-gradient-to-b from-[#09112B] via-[#0B1536] to-[#060B1E] text-[#F5F1E8] z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:hidden shadow-2xl border-r border-[#D4AF37]/30 ${
            isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex-1 flex flex-col min-h-0">
            {/* Drawer Header */}
            <div className="p-4 flex items-center justify-between border-b border-[#D4AF37]/20 bg-[#070D22]">
              <BrandLogo variant="horizontal" size="sm" />
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer"
                aria-label="Close Navigation Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client Mini Summary */}
            <div className="p-4 border-b border-[#D4AF37]/15 bg-[#0A1435]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1E4FA3] via-[#D4AF37] to-[#F5E7A3] p-[2px] overflow-hidden shrink-0">
                  {user?.profile_photo ? (
                    <img src={user.profile_photo} alt={user.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#0B1330] flex items-center justify-center text-[#B88732]">
                      <User className="w-5 h-5 text-[#B88732]" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-xs font-bold text-white truncate">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.username || 'Client Atelier')}
                  </p>
                  <p className="text-[10px] text-[#A5B2C9] font-mono truncate">
                    {user?.email || userEmail || 'client@shiulicadstudio.com'}
                  </p>
                </div>
              </div>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="p-3 space-y-1.5 overflow-y-auto flex-1">
              {[
                {
                  id: 'custom' as const,
                  label: 'Custom Requests & Journey',
                  icon: <Clock className="w-4 h-4" />,
                  badge: customRequests.length,
                },
                {
                  id: 'downloads' as const,
                  label: 'My CAD Vault',
                  icon: <Download className="w-4 h-4" />,
                  badge: purchases.length,
                },
                {
                  id: 'orders' as const,
                  label: 'Order History',
                  icon: <ShoppingBag className="w-4 h-4" />,
                  badge: clientOrders.length,
                },
                {
                  id: 'wishlist' as const,
                  label: 'Saved Wishlist',
                  icon: <Heart className="w-4 h-4" />,
                  badge: wishlistIds.length,
                },
                {
                  id: 'wallet_credits' as const,
                  label: 'Wallet & Credit Line',
                  icon: <Wallet className="w-4 h-4" />,
                },
                {
                  id: 'profile' as const,
                  label: 'My Profile & Security',
                  icon: <User className="w-4 h-4" />,
                },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#D4AF37]/30 to-[#D4AF37]/5 text-[#F5E7A3] font-bold border-l-4 border-[#D4AF37] shadow-sm'
                        : 'text-[#C9C2A6]/80 hover:bg-[#122254]/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={isActive ? 'text-[#D4AF37]' : 'text-[#8A9BC7]'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                        isActive
                          ? 'bg-[#D4AF37] text-[#070D22]'
                          : 'bg-white/10 text-[#C9C2A6]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Drawer Footer */}
          <div className="p-3.5 border-t border-[#D4AF37]/20 bg-[#070D22] flex items-center justify-between text-[11px] font-mono text-[#8C97A7]">
            <span className="truncate">Shiuli CAD Studio</span>
            <span className="text-[#D4AF37] font-bold">Client Portal</span>
          </div>
        </aside>

        {/* DIRECT SEGMENTED NAVIGATION BAR (Visible and scrollable on all screen sizes) */}
        <div className="flex p-1 sm:p-1.5 rounded-2xl bg-[#F4EFE6]/90 backdrop-blur-md border border-[#E8D7B7] gap-1.5 sm:gap-2 shadow-sm text-xs font-serif overflow-x-auto no-scrollbar scroll-smooth">
          {[
            {
              id: 'custom' as const,
              label: 'Custom Requests & Journey',
              icon: <Clock className="w-4 h-4" />,
              badge: customRequests.length,
            },
            {
              id: 'downloads' as const,
              label: 'My CAD Vault',
              icon: <Download className="w-4 h-4" />,
              badge: purchases.length,
            },
            {
              id: 'orders' as const,
              label: 'Order History',
              icon: <ShoppingBag className="w-4 h-4" />,
              badge: clientOrders.length,
            },
            {
              id: 'wishlist' as const,
              label: 'Saved Wishlist',
              icon: <Heart className="w-4 h-4" />,
              badge: wishlistIds.length,
            },
            {
              id: 'wallet_credits' as const,
              label: 'Wallet & Credits',
              icon: <Wallet className="w-4 h-4" />,
            },
            {
              id: 'profile' as const,
              label: 'My Profile & Security',
              icon: <User className="w-4 h-4" />,
            },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`flex-1 px-4 py-3 min-h-[44px] rounded-xl flex items-center justify-center gap-2.5 font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0B1330] text-[#F5E7A3] shadow-md border border-[#D4AF37]/50'
                    : 'text-[#5A6679] hover:text-[#0B1330] hover:bg-white/70'
                }`}
              >
                <span className={isActive ? 'text-[#D4AF37]' : 'text-[#8C97A7]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-[#D4AF37]/20 text-[#F5E7A3] border border-[#D4AF37]/50'
                      : 'bg-[#EAE2D2] text-[#5A6679]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: CONTINUOUS VERTICAL JOURNEY TIMELINE */}
        {activeTab === 'custom' && (
          <div className="space-y-12">
            {loadingCustom ? (
              <div className="py-24 rounded-3xl bg-white border border-[#E8D7B7] flex flex-col items-center justify-center gap-4 text-xs text-[#687386] shadow-[0_10px_35px_rgba(184,135,50,0.06)]">
                <Loader2 className="w-10 h-10 text-[#B88732] animate-spin" />
                <span className="font-serif text-base text-[#0B1330] font-bold">Loading Custom Atelier Orders...</span>
              </div>
            ) : customRequests.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-white border-2 border-dashed border-[#E8D7B7] space-y-6 shadow-[0_10px_35px_rgba(184,135,50,0.06)]">
                <Sparkles className="w-12 h-12 text-[#B88732] mx-auto" />
                <h4 className="font-serif text-2xl font-bold text-[#0B1330]">No Custom CAD Orders Active</h4>
                <p className="text-xs text-[#5A6679] max-w-md mx-auto">
                  Submit a custom design brief with reference sketches and metal choices to collaborate directly with our senior CAD artisans.
                </p>
                <button
                  onClick={() => onNavigate('custom-design')}
                  className="btn-gold-luxury px-8 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-widest inline-flex items-center gap-2 shadow-lg"
                >
                  <PlusCircle className="w-4 h-4 text-[#0B1330]" />
                  <span>Start Bespoke CAD Order</span>
                </button>
              </div>
            ) : (() => {
                // 1. Filter custom requests if user entered a search query
                const filteredRequests = customRequests.filter((r) => {
                  if (!orderSearchTerm.trim()) return true;
                  const term = orderSearchTerm.toLowerCase().trim();
                  const ord = getOrderForRequest(r);
                  const ordNum = ord ? `ord #${ord.id} order #${ord.id} ${ord.id}` : '';
                  const reqNum = `req #${r.id} ${r.id}`;
                  const cat = (r.category_name || '').toLowerCase();
                  const metal = (r.metal_alloy_name || '').toLowerCase();
                  return ordNum.toLowerCase().includes(term) || reqNum.toLowerCase().includes(term) || cat.includes(term) || metal.includes(term);
                });

                // 2. Determine active selected request
                const activeReq = (selectedReqKey ? customRequests.find((r) => (r.is_file_edit ? `fe-${r.id}` : `cr-${r.id}`) === selectedReqKey) : null)
                  || customRequests.find((r) => r.id === selectedCustomReqId)
                  || (filteredRequests.length > 0 ? filteredRequests[0] : customRequests[0]);
                const req = activeReq;
                if (!req) {
                  return (
                    <div className="p-12 text-center rounded-3xl bg-white border border-[#E8D7B7] text-xs text-[#5A6679]">
                      <Loader2 className="w-8 h-8 text-[#B88732] animate-spin mx-auto mb-3" />
                      <span className="font-serif text-sm font-bold text-[#0B1330] block">Loading Atelier Order Workspace...</span>
                    </div>
                  );
                }
                const order = getOrderForRequest(req);
                const assignedStaff = order?.assigned_staff;
                const isOrderConfirmed = Boolean(
                  req.status === 'agreed' ||
                  req.status === 'in_progress' ||
                  req.status === 'completed' ||
                  (order && order.status && order.status !== 'cancelled')
                );
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
                const unpaidVal = Math.max(0, totalVal - paidVal);

                return (
                  <div className="space-y-6">
                    {/* LIVE NEGOTIATION ALERT BANNER */}
                    {negotiationAlertBanner && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FFFDF7] via-[#FFF8EC] to-[#FFF4DE] border-2 border-[#D4AF37] shadow-[0_8px_25px_rgba(212,175,55,0.18)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-[#0B1330] border border-[#D4AF37] flex items-center justify-center text-[#F5E7A3] shrink-0 shadow-sm">
                            <BellRing className="w-5 h-5 text-[#F5E7A3] animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#0B1330] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-wider">
                                LIVE NEGOTIATION UPDATE
                              </span>
                              <span className="text-xs font-mono font-bold text-[#0B1330]">
                                {negotiationAlertBanner.title}
                              </span>
                            </div>
                            <p className="text-xs text-[#2A3547] mt-1 font-medium">
                              {negotiationAlertBanner.message}
                              {negotiationAlertBanner.offeredPrice && (
                                <span className="text-[#B88732] font-black ml-1.5 font-mono text-sm">
                                  (Offered Price: {formatINR(negotiationAlertBanner.offeredPrice)})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomReqId(negotiationAlertBanner.reqId);
                              setOpenedOrderId(negotiationAlertBanner.reqId);
                              setActiveStageTab('negotiation');
                              setNegotiationAlertBanner(null);
                            }}
                            className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow cursor-pointer hover:brightness-105"
                          >
                            Open Negotiation →
                          </button>
                          <button
                            type="button"
                            onClick={() => setNegotiationAlertBanner(null)}
                            className="p-2 rounded-xl bg-white/80 border border-[#E8D7B7] text-[#687386] hover:text-[#0B1330] transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {openedOrderId === null ? (
                      /* VIEW 1: ONLY ORDER BOXES GRID (No deep vertical scrolling) */
                      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8D7B7] shadow-[0_15px_45px_rgba(184,135,50,0.06)] space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8D7B7]/70 pb-5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF8EC] border border-[#D4AF37]/50 text-[10px] font-mono font-bold text-[#9A6A1A] uppercase tracking-wider">
                                ATELIER ORDER SELECTOR
                              </span>
                              <span className="text-xs font-mono text-[#5A6679]">
                                Total Orders: <strong className="text-[#0B1330] font-bold">{customRequests.length}</strong>
                              </span>
                            </div>
                            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0B1330] mt-1">
                              My Custom CAD Orders
                            </h3>
                            <p className="text-xs text-[#5A6679]">
                              Click on any order box below to open its dedicated workspace, manage payments, chat with 3D modelers, and download master CAD packages.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={handleEnableDesktopAlerts}
                              className={`px-3.5 py-2 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                desktopAlertsEnabled
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                                  : 'bg-[#FCFAF7] border-[#E8D7B7] text-[#5A6679] hover:text-[#0B1330] hover:border-[#D4AF37]'
                              }`}
                            >
                              {desktopAlertsEnabled ? (
                                <>
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Ring &amp; Push Alerts Active</span>
                                </>
                              ) : (
                                <>
                                  <Bell className="w-3.5 h-3.5 text-[#B88732]" />
                                  <span>Enable Audio Ring &amp; Push</span>
                                </>
                              )}
                            </button>

                            {customRequests.length > 2 && (
                              <div className="relative min-w-[220px]">
                                <Search className="w-3.5 h-3.5 text-[#8C97A7] absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={orderSearchTerm}
                                  onChange={(e) => setOrderSearchTerm(e.target.value)}
                                  placeholder="Search Order # or Keyword..."
                                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] text-xs text-[#0B1330] placeholder:text-[#8C97A7] focus:outline-none focus:border-[#D4AF37] focus:bg-white"
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => onNavigate('custom-design')}
                              className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow cursor-pointer hover:brightness-105"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-[#0B1330]" />
                              <span>New Order Brief</span>
                            </button>
                          </div>
                        </div>

                        {/* THE LITTLE BOXES (CARDS GRID) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
                          {filteredRequests.map((item) => {
                            const itemKey = item.is_file_edit ? `fe-${item.id}` : `cr-${item.id}`;
                            const itemOrder = getOrderForRequest(item);
                            const itemAssigned = itemOrder?.assigned_staff;
                            const itemHasQuote = Boolean(item.agreed_price || item.status === 'quoted' || item.status === 'agreed' || itemOrder?.total_price);
                            const itemTotal = itemHasQuote ? parseFloat(item.agreed_price || itemOrder?.total_price || item.estimated_price_shown || '0') : 0;
                            let itemPaid = 0;
                            if (itemOrder?.payment_stages && itemOrder.payment_stages.length > 0) {
                              itemPaid = itemOrder.payment_stages
                                .filter((st: any) => st.status === 'paid')
                                .reduce((acc: number, st: any) => acc + parseFloat(st.amount || '0'), 0);
                            }
                            const itemPaidPct = itemTotal > 0 ? Math.min(100, Math.round((itemPaid / itemTotal) * 100)) : 0;
                            const itemFullyPaid = Boolean(itemOrder?.payment_stages && itemOrder.payment_stages.length > 0 && itemOrder.payment_stages.every((st: any) => st.status === 'paid'));

                            const selMetal = item.selections?.find((s: any) => s.group_key === 'metal' || s.group_label?.toLowerCase().includes('metal'));
                            const metalLabel = selMetal?.value_label || item.metal_alloy_name || 'Custom Metal';

                            const hasNegotiationPending = item.status === 'quoted' || item.status === 'negotiating';

                            // Step 8C: Status classification: Active vs. Non-Active (completed, cancelled, rejected)
                            const isItemActive = isOrderActiveStatus(item, itemOrder);
                            const isCardExpanded = mobileExpandedCards[itemKey] !== undefined ? mobileExpandedCards[itemKey] : isItemActive;

                            const orderBadgeTitle = item.is_file_edit ? `FILE EDIT #${item.id}` : (itemOrder ? `ORDER #${itemOrder.id}` : `REQ #${item.id || 'NEW'}`);
                            const statusText = item.is_file_edit ? (
                              item.status === 'agreed'
                                ? 'Approved & Agreed'
                                : item.status === 'rejected'
                                ? 'Order Declined'
                                : item.status === 'quoted'
                                ? 'Official Quote Ready'
                                : item.status === 'negotiating'
                                ? 'Negotiating Price'
                                : 'Under Assessment'
                            ) : (
                              itemAssigned
                                ? 'In CAD Production'
                                : itemOrder
                                ? 'Order Confirmed'
                                : item.status === 'quoted'
                                ? 'Official Quote Ready'
                                : 'Brief In Review'
                            );

                            return (
                              <React.Fragment key={itemKey}>
                                {/* STEP 8C: MOBILE COMPACT COLLAPSED ROW (sm:hidden, shown only when collapsed on mobile) */}
                                {!isCardExpanded && (
                                  <div
                                    className="sm:hidden p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] shadow-xs flex items-center justify-between gap-3 text-left transition-all"
                                  >
                                    <div
                                      className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                                      onClick={() => handleOpenCustomOrder(item, hasNegotiationPending ? 'negotiation' : (itemOrder && !itemFullyPaid ? 'payments' : 'all'))}
                                    >
                                      <span className="px-2 py-1 rounded-lg bg-[#0B1330] text-[#F5E7A3] text-xs font-mono font-black tracking-wider shrink-0">
                                        {item.is_file_edit ? `EDIT #${item.id}` : (itemOrder ? `ORD #${itemOrder.id}` : `REQ #${item.id}`)}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <h4 className="font-serif text-xs font-bold text-[#0B1330] truncate">
                                          {item.category_name || item.title || 'Bespoke CAD'}
                                        </h4>
                                        <span className="text-[10px] font-mono text-[#5A6679] block truncate">
                                          {statusText}
                                        </span>
                                      </div>
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 bg-slate-100 text-slate-700 border border-slate-300">
                                        {itemOrder?.status?.replace(/_/g, ' ') || item.status}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleMobileCardExpand(itemKey, false);
                                        }}
                                        className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-white border border-[#E8D7B7] text-[#0B1330] hover:border-[#D4AF37] flex items-center justify-center cursor-pointer shadow-2xs"
                                        title="Expand Order Card"
                                        aria-label="Expand Order Card"
                                      >
                                        <ChevronDown className="w-4 h-4 text-[#B88732]" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenCustomOrder(item, hasNegotiationPending ? 'negotiation' : (itemOrder && !itemFullyPaid ? 'payments' : 'all'));
                                        }}
                                        className="px-3 py-2 min-h-[44px] rounded-xl btn-gold-luxury text-[11px] font-bold uppercase tracking-wider flex items-center justify-center cursor-pointer shadow-xs"
                                      >
                                        Open →
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* FULL CARD VIEW (Always on desktop; on mobile shown only when expanded) */}
                                <div
                                  onClick={() => handleOpenCustomOrder(item, hasNegotiationPending ? 'negotiation' : (itemOrder && !itemFullyPaid ? 'payments' : 'all'))}
                                  className={`relative p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-300 flex-col justify-between gap-3.5 text-left group bg-[#FCFAF7] hover:bg-white border-2 border-[#E8D7B7]/80 hover:border-[#D4AF37] shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(212,175,55,0.18)] hover:-translate-y-1 ${
                                    isCardExpanded ? 'flex' : 'hidden sm:flex'
                                  }`}
                                >
                                  <div>
                                    {/* Header Row: ORDER # & STATUS */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="px-2.5 py-1 rounded-lg bg-[#0B1330] text-[#F5E7A3] text-xs font-mono font-black tracking-wider shadow-sm flex items-center gap-1.5">
                                          {item.is_file_edit && <Wrench className="w-3 h-3 text-[#D4AF37]" />}
                                          {orderBadgeTitle}
                                        </span>
                                        {item.is_file_edit ? (
                                          <span className="px-2 py-0.5 rounded bg-[#FFF8EC] border border-[#E8D7B7] text-[10px] font-mono text-[#9A6A1A] font-bold uppercase">
                                            .{item.original_file_format || 'cad'}
                                          </span>
                                        ) : itemOrder ? (
                                          <span className="text-[11px] font-mono text-[#5A6679] font-semibold">
                                            (REQ #{item.id || 'NEW'})
                                          </span>
                                        ) : null}
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Mobile Collapse Chevron */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleMobileCardExpand(itemKey, true);
                                          }}
                                          className="sm:hidden p-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-white border border-[#E8D7B7] text-[#5A6679] hover:text-[#0B1330] flex items-center justify-center cursor-pointer shadow-2xs"
                                          title="Collapse Order Card"
                                          aria-label="Collapse Order Card"
                                        >
                                          <ChevronUp className="w-4 h-4 text-[#B88732]" />
                                        </button>

                                        <span className="text-[11px] font-mono text-[#B88732] group-hover:text-[#0B1330] font-bold shrink-0 flex items-center gap-0.5 transition-colors">
                                          Open →
                                        </span>
                                      </div>
                                    </div>

                                    {/* Thumbnail & Title */}
                                    <div className="flex items-center gap-3 my-2.5">
                                      {item.reference_image ? (
                                        <img
                                          src={item.reference_image}
                                          alt={item.category_name}
                                          className="w-13 h-13 rounded-xl object-cover border border-[#E8D7B7] bg-white shadow-xs shrink-0"
                                        />
                                      ) : item.is_file_edit ? (
                                        <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-[#0B1330] to-[#162145] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5E7A3] shadow-xs shrink-0">
                                          <FileCode2 className="w-6 h-6 text-[#D4AF37]" />
                                        </div>
                                      ) : (
                                        <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-[#FFF9EE] to-[#FFF3DC] border border-[#E8D7B7] flex items-center justify-center text-[#B88732] shadow-xs shrink-0">
                                          <Gem className="w-6 h-6 text-[#B88732]" />
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <h4 className="font-serif text-sm font-bold text-[#0B1330] truncate group-hover:text-[#B88732] transition-colors">
                                          {item.category_name || item.title || 'Bespoke Custom Jewellery'}
                                        </h4>
                                        <p className="text-[11px] font-mono text-[#5A6679] truncate font-medium">
                                          {item.is_file_edit ? (item.modification_type_labels?.join(', ') || 'CAD Modification') : metalLabel}
                                        </p>
                                        <span className="text-[10px] font-mono text-[#8C97A7] block">
                                          {item.created_at && !isNaN(new Date(item.created_at).getTime())
                                            ? new Date(item.created_at).toLocaleDateString()
                                            : 'Recent'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Status Pill */}
                                    <div className="mt-1">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5 w-full justify-start ${
                                        item.status === 'agreed' || (itemOrder && itemOrder.status)
                                          ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                                          : item.status === 'rejected'
                                          ? 'bg-rose-50 border border-rose-300 text-rose-800'
                                          : item.status === 'quoted'
                                          ? 'bg-blue-50 border border-blue-300 text-blue-800'
                                          : item.status === 'negotiating'
                                          ? 'bg-purple-50 border border-purple-300 text-purple-800'
                                          : 'bg-slate-100 border border-slate-300 text-slate-700'
                                      }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                          item.status === 'agreed' ? 'bg-emerald-600' : (item.status === 'rejected' ? 'bg-rose-600' : 'bg-[#D4AF37]')
                                        }`} />
                                        <span className="truncate">
                                          {statusText}
                                        </span>
                                      </span>
                                    </div>

                                    {/* Active Negotiation Callout Pill if pending */}
                                    {hasNegotiationPending && (
                                      <div className="mt-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-mono flex items-center gap-1.5 font-bold">
                                        <BellRing className="w-3 h-3 text-amber-600 animate-pulse shrink-0" />
                                        <span className="truncate">Active Price Negotiation</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Financial & Action Row */}
                                  <div className="pt-3 border-t border-[#E8D7B7]/70 space-y-2.5">
                                    <div className="flex items-center justify-between text-xs font-mono">
                                      <div>
                                        <span className="text-[10px] text-[#687386] block leading-none font-semibold">ORDER TOTAL</span>
                                        <span className="text-xs font-extrabold text-[#0B1330]">
                                          {itemTotal > 0 ? formatINR(itemTotal) : 'Estimating'}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[10px] text-[#687386] block leading-none font-semibold">PAYMENT</span>
                                        <span className={`text-[11px] font-extrabold ${itemFullyPaid ? 'text-emerald-700' : itemPaid > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                                          {itemFullyPaid ? '100% Paid' : itemPaid > 0 ? `${itemPaidPct}% Paid` : 'Pending'}
                                        </span>
                                      </div>
                                    </div>

                                    {itemTotal > 0 && (
                                      <div className="w-full bg-[#EAE2D2] rounded-full h-1.5 overflow-hidden border border-[#E8D7B7]/50">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${
                                            itemFullyPaid ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-[#D4AF37]'
                                          }`}
                                          style={{ width: `${itemPaidPct}%` }}
                                        />
                                      </div>
                                    )}

                                    {/* Open & Manage Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenCustomOrder(item, hasNegotiationPending ? 'negotiation' : (itemOrder && !itemFullyPaid ? 'payments' : 'all'));
                                      }}
                                      className="w-full mt-1 py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_2px_10px_rgba(212,175,55,0.25)] hover:brightness-105 transition-all cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-[#070D22]" />
                                      <span>Open &amp; Manage Order</span>
                                    </button>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* VIEW 2: DEDICATED OPENED ORDER WORKSPACE (Zero Endless Scrolling) */
                      <div className="space-y-6">
                        {/* STICKY TOP ORDER BAR */}
                        <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0B1330] via-[#12204D] to-[#0B1330] border-2 border-[#D4AF37]/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center justify-between sm:justify-start gap-2">
                              <button
                                type="button"
                                onClick={handleBackToGrid}
                                className="px-3 sm:px-4 py-2 sm:py-2.5 min-h-[40px] sm:min-h-[44px] rounded-xl bg-[#0B1330]/80 hover:bg-[#1A2E68] border border-[#D4AF37]/70 text-[#F5E7A3] font-bold text-xs flex items-center gap-1.5 sm:gap-2 shadow transition-all cursor-pointer shrink-0"
                              >
                                <ArrowLeft className="w-4 h-4 text-[#F5E7A3]" />
                                <span>← Back to Orders</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleBackToGrid}
                                className="sm:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Close this order view"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="border-t sm:border-t-0 sm:border-l border-white/20 pt-2 sm:pt-0 sm:pl-3">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="px-2 sm:px-2.5 py-0.5 rounded-lg bg-[#D4AF37] text-[#070D22] text-[11px] sm:text-xs font-mono font-black shadow">
                                  {req.is_file_edit ? `FILE EDIT #${req.id}` : (order ? `ORDER #${order.id}` : `REQ #${req.id}`)}
                                </span>
                                {req.is_file_edit && req.original_file_format && (
                                  <span className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-white/20 text-[#F5E7A3] text-[10px] sm:text-xs font-mono font-bold uppercase">
                                    .{req.original_file_format}
                                  </span>
                                )}
                                {req.is_file_edit && req.storage_provider === 'gdrive' && (
                                  <span className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-mono font-bold flex items-center gap-1">
                                    <Cloud className="w-3 h-3 text-blue-300" />
                                    Drive (&gt;50MB)
                                  </span>
                                )}
                                {!req.is_file_edit && order && (
                                  <span className="text-[10px] sm:text-xs font-mono font-bold text-[#F5E7A3]">
                                    (REQ #{req.id})
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                  req.status === 'rejected'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                                    : req.status === 'agreed' || isOrderConfirmed
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                    : req.status === 'quoted'
                                    ? 'bg-blue-500/20 text-blue-200 border border-blue-400/40'
                                    : 'bg-white/15 text-slate-200'
                                }`}>
                                  {req.status === 'rejected'
                                    ? 'Order Declined'
                                    : assignedStaff
                                    ? 'CAD Production Active'
                                    : isOrderConfirmed
                                    ? 'Order Approved & Confirmed'
                                    : req.status === 'quoted'
                                    ? 'Official Quote Received'
                                    : req.status === 'negotiating'
                                    ? 'Negotiation Active'
                                    : 'Under Assessment'}
                                </span>
                              </div>
                              <h3 className="font-serif text-base sm:text-xl font-bold text-white mt-1 truncate max-w-sm sm:max-w-md">
                                {req.is_file_edit ? (req.original_file_name || `CAD File Modification #${req.id}`) : (req.category_name || 'Bespoke Custom Jewellery')}
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
                            <div className="text-left md:text-right font-mono">
                              <span className="text-[10px] text-slate-300 block uppercase leading-none">Order Balance</span>
                              <span className="text-xs sm:text-sm font-bold text-[#F5E7A3]">
                                {totalVal > 0 ? formatINR(totalVal) : 'Est'} • <span className={isFullyPaid ? 'text-emerald-300' : 'text-amber-300'}>{paidPct}% Paid</span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleBackToGrid}
                              className="hidden sm:block p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Close this order view"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* STAGE NAVIGATION BAR (Zero Scrolling) */}
                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 text-xs font-mono no-scrollbar">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStageTab('all');
                              setMobileAccordionStage(null);
                            }}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer text-[11px] sm:text-xs ${
                              activeStageTab === 'all'
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] shadow-[0_2px_10px_rgba(212,175,55,0.35)] font-black'
                                : 'bg-white border border-[#E8D7B7] text-[#0B1330] hover:border-[#D4AF37] hover:text-[#B88732] shadow-xs'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>All Steps</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveStageTab('specs');
                              setMobileAccordionStage('specs');
                            }}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer text-[11px] sm:text-xs ${
                              activeStageTab === 'specs' || (activeStageTab === 'all' && (mobileAccordionStage === 'specs' || (!mobileAccordionStage && !isOrderConfirmed && req.status !== 'quoted' && req.status !== 'negotiating' && req.status !== 'rejected')))
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] shadow-[0_2px_10px_rgba(212,175,55,0.35)] font-black'
                                : 'bg-white border border-[#E8D7B7] text-[#0B1330] hover:border-[#D4AF37] hover:text-[#B88732] shadow-xs'
                            }`}
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>1. Brief</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveStageTab('negotiation');
                              setMobileAccordionStage('negotiation');
                            }}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer text-[11px] sm:text-xs relative ${
                              activeStageTab === 'negotiation' || (activeStageTab === 'all' && (mobileAccordionStage === 'negotiation' || (!mobileAccordionStage && (req.status === 'quoted' || req.status === 'negotiating' || req.status === 'rejected') && !isOrderConfirmed)))
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] shadow-[0_2px_10px_rgba(212,175,55,0.35)] font-black'
                                : 'bg-white border border-[#E8D7B7] text-[#0B1330] hover:border-[#D4AF37] hover:text-[#B88732] shadow-xs'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>2. Quote</span>
                            {(req.status === 'quoted' || req.status === 'negotiating') && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveStageTab('payments');
                              setMobileAccordionStage('payments');
                            }}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer text-[11px] sm:text-xs ${
                              activeStageTab === 'payments' || (activeStageTab === 'all' && (mobileAccordionStage === 'payments' || (!mobileAccordionStage && isOrderConfirmed && !isFullyPaid && !order?.preview_image)))
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] shadow-[0_2px_10px_rgba(212,175,55,0.35)] font-black'
                                : 'bg-white border border-[#E8D7B7] text-[#0B1330] hover:border-[#D4AF37] hover:text-[#B88732] shadow-xs'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>3. Payments</span>
                            {isOrderConfirmed && !isFullyPaid && (
                              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveStageTab('preview');
                              setMobileAccordionStage('preview');
                            }}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer text-[11px] sm:text-xs ${
                              activeStageTab === 'preview' || (activeStageTab === 'all' && (mobileAccordionStage === 'preview' || (!mobileAccordionStage && isOrderConfirmed && (order?.preview_image || order?.status === 'in_design' || order?.status === 'preview_ready' || order?.status === 'revision_requested') && (!isFullyPaid || (!order?.download_enabled_by_admin && !order?.can_download)))))
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] shadow-[0_2px_10px_rgba(212,175,55,0.35)] font-black'
                                : 'bg-white border border-[#E8D7B7] text-[#0B1330] hover:border-[#D4AF37] hover:text-[#B88732] shadow-xs'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>4. 3D Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveStageTab('deliverables');
                              setMobileAccordionStage('deliverables');
                            }}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer text-[11px] sm:text-xs ${
                              activeStageTab === 'deliverables' || (activeStageTab === 'all' && (mobileAccordionStage === 'deliverables' || (!mobileAccordionStage && isFullyPaid && (order?.download_enabled_by_admin || order?.can_download))))
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] shadow-[0_2px_10px_rgba(212,175,55,0.35)] font-black'
                                : 'bg-white border border-[#E8D7B7] text-[#0B1330] hover:border-[#D4AF37] hover:text-[#B88732] shadow-xs'
                            }`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>5. Files</span>
                            {isFullyPaid && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            )}
                          </button>
                        </div>

                        {/* SELECTED ORDER WORKFLOW CONTAINER */}
                        <div key={req.id} className="space-y-8 border-b border-[#E8D7B7] pb-16">
                    {/* 1. TOP ORDER SUMMARY BAND */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#E8D7B7] pb-6">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-mono font-bold text-[#B88732]">
                            {req.is_file_edit ? `FILE EDIT #${req.id}` : `REQ #${req.id}`} {order ? `• ORDER #${order.id}` : ''}
                          </span>
                          
                          {/* Elegant Single Status Pill */}
                          <span className={`px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border flex items-center gap-2 shadow-xs ${
                            req.status === 'rejected'
                              ? 'bg-rose-50 border-rose-300 text-rose-800'
                              : req.status === 'agreed' || isOrderConfirmed
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : req.status === 'quoted'
                              ? 'bg-blue-50 border-blue-300 text-blue-800'
                              : req.status === 'negotiating'
                              ? 'bg-purple-50 border-purple-300 text-purple-800'
                              : 'bg-white border-[#D9B66F]/50 text-[#B88732]'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              req.status === 'rejected'
                                ? 'bg-rose-600'
                                : req.status === 'agreed' || isOrderConfirmed
                                ? 'bg-emerald-600'
                                : req.status === 'quoted'
                                ? 'bg-blue-600'
                                : 'bg-[#D4AF37] animate-pulse'
                            }`} />
                            {req.is_file_edit ? (
                              req.status === 'rejected'
                                ? 'Order Declined by CAD Atelier'
                                : req.status === 'agreed'
                                ? 'Order Approved & Agreed'
                                : req.status === 'quoted'
                                ? 'Official Quote Received'
                                : req.status === 'negotiating'
                                ? 'Price Negotiation in Progress'
                                : 'Submitted • In Assessment'
                            ) : (
                              assignedStaff
                                ? 'In Design • CAD Production Active'
                                : isOrderConfirmed
                                ? 'Order Confirmed • Awaiting Booking Payment (10%)'
                                : req.status === 'quoted'
                                ? 'Official Quote Received'
                                : req.status === 'negotiating'
                                ? 'Price Negotiation in Progress'
                                : 'Submitted • In Review'
                            )}
                          </span>

                          {!req.is_file_edit && req.request_mode === 'quick' && (
                            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-400/40 text-amber-700 flex items-center gap-1.5 shadow-xs">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              Quick Request
                            </span>
                          )}
                        </div>

                        {req.is_file_edit ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="font-serif text-3xl font-extrabold text-[#0B1330]">
                                CAD File Modification: {req.original_file_name || `File Edit #${req.id}`}
                              </h2>
                              {req.download_url && (
                                <a
                                  href={req.download_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] hover:brightness-110 font-bold text-xs flex items-center gap-1.5 shadow-[0_2px_10px_rgba(212,175,55,0.25)] transition-all cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 text-[#070D22]" />
                                  <span>Download Uploaded CAD</span>
                                </a>
                              )}
                            </div>

                            {/* Quick Specs Chips for File Edit */}
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                              {req.original_file_format && (
                                <span className="px-2.5 py-0.5 rounded-lg bg-[#0B1330] text-[#F5E7A3] font-bold uppercase shadow-xs">
                                  .{req.original_file_format} Format
                                </span>
                              )}
                              {req.storage_provider === 'gdrive' ? (
                                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-300 text-blue-800 shadow-xs font-bold flex items-center gap-1">
                                  <Cloud className="w-3 h-3 text-blue-600" />
                                  Google Drive (&gt;50MB)
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 shadow-xs font-bold">
                                  Direct Upload (≤50MB)
                                </span>
                              )}
                              {req.file_size_bytes && (
                                <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E8D7B7] text-[#0B1330] shadow-xs">
                                  Size: <strong className="text-[#0B1330] font-bold">{(req.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</strong>
                                </span>
                              )}
                              {req.target_weight_grams && (
                                <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E8D7B7] text-[#0B1330] shadow-xs">
                                  Target Weight: <strong className="text-[#0B1330] font-bold">{req.target_weight_grams}g</strong>
                                </span>
                              )}
                              {req.target_stone_size && (
                                <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E8D7B7] text-[#0B1330] shadow-xs">
                                  Target Stone: <strong className="text-[#0B1330] font-bold">{req.target_stone_size}</strong>
                                </span>
                              )}
                              {req.modification_type_labels?.map((label: string, idx: number) => (
                                <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-[#FFF9EE] border border-[#E8D7B7] text-[#9A6A1A] font-bold shadow-xs">
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const selMetal = req.selections?.find((s: any) => s.group_key === 'metal' || s.group_label?.toLowerCase().includes('metal'));
                            const metalName = selMetal?.value_label || req.metal_alloy_name;
                            const selPurity = req.selections?.find((s: any) => s.group_key === 'purity' || s.group_label?.toLowerCase().includes('purity') || s.group_label?.toLowerCase().includes('karat'));
                            return (
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h2 className="font-serif text-3xl font-extrabold text-[#0B1330]">
                                    {req.category_name || 'Bespoke Custom Jewellery'} {metalName ? `(${metalName})` : ''}
                                  </h2>
                                  <button
                                    type="button"
                                    onClick={() => setSpecsModalRequest(req)}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] hover:brightness-110 font-bold text-xs flex items-center gap-1.5 shadow-[0_2px_10px_rgba(212,175,55,0.25)] transition-all cursor-pointer"
                                  >
                                    <Sliders className="w-3.5 h-3.5 text-[#070D22]" />
                                    <span>View All My Selections &amp; Form Entries</span>
                                  </button>
                                </div>

                                {/* Quick Specs Chips */}
                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                                  {selMetal && (
                                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E8D7B7] text-[#0B1330] shadow-xs">
                                      Metal: <strong className="text-[#0B1330] font-bold">{selMetal.value_label}</strong>
                                    </span>
                                  )}
                                  {selPurity && (
                                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E8D7B7] text-[#0B1330] shadow-xs">
                                      Purity: <strong className="text-[#9A6A1A] font-bold">{selPurity.value_label}</strong>
                                    </span>
                                  )}
                                  {req.ring_size && (
                                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E8D7B7] text-[#0B1330] shadow-xs">
                                      Size: <strong className="text-[#0B1330] font-bold">{req.ring_size} ({req.ring_size_standard?.toUpperCase() || 'IN/HK'})</strong>
                                    </span>
                                  )}
                                  {req.target_weight_grams && (
                                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E8D7B7] text-[#0B1330] shadow-xs">
                                      Weight: <strong className="text-[#0B1330] font-bold">{req.target_weight_grams}g</strong>
                                    </span>
                                  )}
                                  {req.budget_range && (
                                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 shadow-xs font-semibold">
                                      {req.budget_range}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>

                      {/* COMPACT PAYMENT PROGRESS BAR / QUOTE STATUS */}
                      <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] sm:w-80 space-y-2 shadow-sm">
                        {isOrderConfirmed && totalVal > 0 ? (
                          <>
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-[#5A6679]">Payment Progress</span>
                              <span className="text-[#B88732] font-bold">{formatINR(paidVal)} of {formatINR(totalVal)} ({paidPct}%)</span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-[#EAE2D2] overflow-hidden p-0.5 border border-[#E8D7B7]/60">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#1E4FA3] via-[#D4AF37] to-[#F5E7A3] transition-all duration-500"
                                style={{ width: `${paidPct}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-[#5A6679]">Quote &amp; Order Status</span>
                              <span className="text-[#B88732] font-bold">
                                {req.status === 'rejected'
                                  ? 'Order Declined'
                                  : req.status === 'agreed'
                                  ? 'Approved & Agreed'
                                  : req.status === 'quoted'
                                  ? 'Official Quote Ready'
                                  : req.status === 'negotiating'
                                  ? 'Negotiating Price'
                                  : 'Under Review'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#5A6679] leading-relaxed font-sans">
                              {req.status === 'rejected'
                                ? (req.rejection_reason || 'File could not be modified according to specifications.')
                                : req.status === 'agreed'
                                ? `Agreed at ${formatINR(req.agreed_price || req.quoted_price || req.estimated_price_shown)}${req.agreed_price_usd ? ` ($${Number(req.agreed_price_usd).toFixed(2)} USD)` : ''}. Production scheduled.`
                                : req.status === 'quoted'
                                ? `Official price of ${formatINR(req.quoted_price || req.agreed_price || req.estimated_price_shown)}${req.quoted_price_usd ? ` ($${Number(req.quoted_price_usd).toFixed(2)} USD)` : ''} quoted. Order confirms upon agreement.`
                                : req.status === 'negotiating'
                                ? 'Price counter-offer is being negotiated with Studio SuperAdmin.'
                                : req.is_file_edit
                                ? 'Official CAD valuation will be issued by Senior Engineer after mesh and geometry check.'
                                : 'Official CAD valuation will be issued by Senior Engineer after spec review.'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 2. THE ASSIGNED ATELIER PRODUCTION CARD */}
                    {assignedStaff ? (
                      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#0B1330] via-[#12204D] to-[#0B1330] border-2 border-[#D4AF37]/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 text-white">
                        <div className="flex items-center gap-3.5 sm:gap-5">
                          <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full border-2 border-[#D9B66F] shadow-lg shrink-0 bg-gradient-to-br from-[#12204D] via-[#0D1B4C] to-[#070D22] flex items-center justify-center text-[#F5E7A3]">
                            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-[#F5E7A3]" />
                          </div>
                          <div className="space-y-0.5 sm:space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-serif text-base sm:text-xl font-bold text-white">
                                Shiuli Master CAD Atelier
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider">
                                CAD Production Active
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-[#F5E7A3] font-medium">
                              Dedicated Senior CAD Team &bull; {req.category_name || 'Bespoke Jewelry'}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-300 font-mono pt-0.5">
                              <span className="flex items-center gap-1 text-white">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Assigned &amp; In Sculpting
                              </span>
                              <span>&bull;</span>
                              <span className="text-emerald-300">Watertight STL Guaranteed</span>
                            </div>
                          </div>
                        </div>

                        <a
                          href={`https://wa.me/919574787098?text=Hello%20Shiuli%20CAD%20Studio%2C%20I%20am%20in%20touch%20regarding%20REQ%20%23${req.id}.`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-900/60 transition-all shrink-0 shadow-lg"
                        >
                          <Phone className="w-4 h-4 text-emerald-400" />
                          <span>Studio Support Desk</span>
                        </a>
                      </div>
                    ) : (
                      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border-2 border-dashed border-[#E8D7B7] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                        <div className="flex items-center gap-3.5 sm:gap-5">
                          <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-[#FFF9EE] border-2 border-[#D9B66F]/50 flex items-center justify-center text-[#B88732] shrink-0 shadow-sm">
                            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-[#B88732] animate-spin" />
                          </div>
                          <div className="space-y-0.5 sm:space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-serif text-base sm:text-xl font-bold text-[#0B1330]">
                                Matching Senior CAD Artisan...
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider">
                                In Progress
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-[#5A6679] max-w-xl">
                              Assigning dedicated CAD Specialist tailored to your {req.category_name || 'Bespoke Jewelry'} requirements.
                            </p>
                          </div>
                        </div>

                        <a
                          href={`https://wa.me/919574787098?text=Hello%20Shiuli%20CAD%20Studio%2C%20I%20am%20in%20touch%20regarding%20REQ%20%23${req.id}.`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] text-[#0B1330] text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:border-[#D4AF37] hover:text-[#B88732] transition-all shrink-0 shadow-xs"
                        >
                          <Phone className="w-4 h-4 text-[#B88732]" />
                          <span>Support Desk Chat</span>
                        </a>
                      </div>
                    )}

                    {/* 3. CONTINUOUS VERTICAL JOURNEY TIMELINE (WITH SMART MOBILE ACCORDION) */}
                    {(() => {
                      const getComputedActiveStage = () => {
                        if (req.status === 'completed' || (isFullyPaid && (order?.download_enabled_by_admin || order?.can_download))) return 'deliverables';
                        if (order?.preview_image || order?.status === 'in_design' || order?.status === 'preview_ready' || order?.status === 'revision_requested') return 'preview';
                        if (isOrderConfirmed && !isFullyPaid) return 'payments';
                        if (req.status === 'quoted' || req.status === 'negotiating' || req.status === 'rejected') return 'negotiation';
                        return 'specs';
                      };
                      const computedActive = getComputedActiveStage();
                      const currentActiveStage = mobileAccordionStage || (activeStageTab !== 'all' ? activeStageTab : computedActive);

                      return (
                    <div className="relative pl-0 sm:pl-10 space-y-4 sm:space-y-10 sm:border-l-2 sm:border-[#E8D7B7] sm:ml-8 pt-2">
                      
                      {/* NODE 1: REQUEST SUBMITTED */}
                      {(activeStageTab === 'all' || activeStageTab === 'specs') && (
                      <div className="relative group">
                        <div className="hidden sm:flex absolute -left-[47px] top-0 w-6 h-6 rounded-full bg-[#D4AF37] border-4 border-[#FAF8F5] shadow-[0_0_10px_rgba(212,175,55,0.8)] items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0B1330]" />
                        </div>

                        {/* MOBILE ACCORDION HEADER (1. BRIEF) */}
                        <button
                          type="button"
                          onClick={() => setMobileAccordionStage(currentActiveStage === 'specs' ? null : 'specs')}
                          className="sm:hidden w-full p-3.5 rounded-2xl bg-white border border-[#E8D7B7] shadow-xs flex items-center justify-between gap-3 text-left transition-all cursor-pointer mb-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              currentActiveStage === 'specs' ? 'bg-[#0B1330] text-[#F5E7A3]' : 'bg-[#FFF9EE] text-[#B88732] border border-[#E8D7B7]'
                            }`}>
                              <Wrench className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-serif font-bold text-xs text-[#0B1330] block truncate">
                                1. {req.is_file_edit ? 'CAD Modification Brief' : 'Custom CAD Brief'}
                              </span>
                              <span className="text-[10px] font-mono text-[#5A6679]">
                                Submitted &bull; {new Date(req.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[9px] font-mono font-bold uppercase">
                              Verified
                            </span>
                            {currentActiveStage === 'specs' ? (
                              <ChevronUp className="w-4 h-4 text-[#B88732]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#5A6679]" />
                            )}
                          </div>
                        </button>

                        {/* NODE 1 CONTENT WRAPPER */}
                        <div className={activeStageTab === 'all' && currentActiveStage !== 'specs' ? 'hidden sm:block' : 'block'}>
                        {req.is_file_edit ? (
                          <div className="space-y-4">
                            <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B1330] to-[#12204D] border border-[#D4AF37]/50 flex items-center justify-center text-[#F5E7A3]">
                                  <Wrench className="w-4 h-4 text-[#F5E7A3]" />
                                </div>
                                <h3 className="font-serif text-xl font-bold text-[#0B1330]">
                                  1. CAD File Modification Request Brief
                                </h3>
                              </div>
                              <span className="text-xs font-mono text-[#5A6679]">
                                {new Date(req.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            {/* CAD File Requisition Card */}
                            <div className="rounded-2xl bg-white border border-[#E8D7B7] p-5 space-y-5 shadow-sm">
                              {/* File Download Banner */}
                              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0B1330] via-[#12204D] to-[#0B1330] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#D4AF37]/50 shadow-md">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-white/10 border border-[#D4AF37]/60 flex items-center justify-center text-[#F5E7A3] shrink-0">
                                    <FileCode2 className="w-6 h-6 text-[#F5E7A3]" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm text-white truncate">
                                        {req.original_file_name || 'Uploaded Source 3D CAD File'}
                                      </span>
                                      {req.original_file_format && (
                                        <span className="px-2 py-0.5 rounded bg-[#D4AF37] text-[#070D22] text-[10px] font-mono font-black uppercase">
                                          .{req.original_file_format}
                                        </span>
                                      )}
                                      {req.storage_provider === 'gdrive' ? (
                                        <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[10px] font-mono font-bold flex items-center gap-1">
                                          <Cloud className="w-3 h-3 text-blue-300" />
                                          Google Drive (&gt;50MB)
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded bg-white/15 text-slate-200 text-[10px] font-mono font-bold">
                                          Direct Upload (≤50MB)
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-300 font-mono mt-0.5">
                                      {req.file_size_bytes ? `${(req.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : '3D Geometry File'}
                                    </p>
                                  </div>
                                </div>

                                {req.download_url && (
                                  <a
                                    href={req.download_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow hover:brightness-110 transition-all shrink-0 cursor-pointer"
                                  >
                                    <Download className="w-4 h-4 text-[#070D22]" />
                                    <span>Download CAD Model</span>
                                  </a>
                                )}
                              </div>

                              {/* Target Parameters Matrix */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div className="p-3.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 space-y-1 shadow-xs">
                                  <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Target Metal Weight</span>
                                  <p className="font-bold text-[#0B1330] text-sm">
                                    {req.target_weight_grams ? `${req.target_weight_grams} grams` : 'Not specified (Preserve original)'}
                                  </p>
                                </div>

                                <div className="p-3.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 space-y-1 shadow-xs">
                                  <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Target Stone Size / Mount</span>
                                  <p className="font-bold text-[#0B1330] text-sm">
                                    {req.target_stone_size || 'Not specified (Preserve original)'}
                                  </p>
                                </div>

                                <div className="p-3.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 space-y-1 shadow-xs">
                                  <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">CAD Storage Archive</span>
                                  <p className="font-bold text-[#0B1330] text-sm flex items-center gap-1.5">
                                    {req.storage_provider === 'gdrive' ? (
                                      <>
                                        <Cloud className="w-4 h-4 text-blue-600" />
                                        <span>Google Drive Cloud Storage</span>
                                      </>
                                    ) : (
                                      <span>Shiuli CAD Local Vault</span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Required Modifications */}
                              {req.modification_type_labels && req.modification_type_labels.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold flex items-center gap-1.5">
                                    <Wrench className="w-3.5 h-3.5 text-[#B88732]" />
                                    Requested Modifications ({req.modification_type_labels.length})
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {req.modification_type_labels.map((modLabel: string, idx: number) => (
                                      <span
                                        key={idx}
                                        className="px-3 py-1.5 rounded-xl bg-[#FFF9EE] border border-[#D4AF37]/50 text-[#0B1330] text-xs font-bold flex items-center gap-1.5 shadow-xs"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" />
                                        <span>{modLabel}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Client Instructions */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Detailed Modification Instructions</span>
                                <div className="p-4 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 text-xs text-[#2A3547] leading-relaxed shadow-xs">
                                  <p>{req.description || 'No detailed instructions entered.'}</p>
                                </div>
                              </div>

                              {/* Attached Reference / Inspiration Photo */}
                              {req.reference_image && (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold flex items-center gap-1.5">
                                    <ImageIcon className="w-3.5 h-3.5 text-[#B88732]" /> Reference Markup / Sketch Attached
                                  </span>
                                  <div>
                                    <img
                                      src={req.reference_image}
                                      alt="Reference"
                                      onClick={() => setSelectedSketchUrl(req.reference_image)}
                                      className="w-24 h-24 rounded-xl object-cover border-2 border-[#E8D7B7] hover:border-[#D4AF37] cursor-pointer shadow-md transition-all hover:scale-105"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Voice Note Player */}
                              {(req.voice_recording_url || req.voice_recording || req.voice_note) && (
                                <div className="p-3.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-2 shadow-xs">
                                  <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold flex items-center gap-1.5">
                                    <Mic className="w-3.5 h-3.5 text-[#B88732]" /> Voice Instruction Note Attached
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#FFF8EC] border border-[#E8D7B7] flex items-center justify-center shrink-0">
                                      <Volume2 className="w-4 h-4 text-[#B88732]" />
                                    </div>
                                    <audio
                                      controls
                                      src={req.voice_recording_url || req.voice_recording || req.voice_note}
                                      className="w-full h-8 rounded-lg accent-[#D4AF37]"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <h3 className="font-serif text-xl font-bold text-[#0B1330]">
                                1. Bespoke Custom Request Submitted
                              </h3>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setSpecsModalRequest(req)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#070D22] hover:brightness-110 font-bold text-xs flex items-center gap-2 shadow-[0_2px_10px_rgba(212,175,55,0.3)] transition-all cursor-pointer"
                              >
                                <Sliders className="w-4 h-4 text-[#070D22]" />
                                <span>View All My Submitted Details &amp; Brief</span>
                              </button>
                              <span className="text-xs font-mono text-[#5A6679]">
                                {new Date(req.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* EXPANDABLE SPECIFICATIONS ACCORDION (OPEN BY DEFAULT) */}
                          <div className="rounded-2xl bg-white border border-[#E8D7B7] p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setExpandedSpecs((prev) => ({ ...prev, [req.id]: prev[req.id] === false ? true : false }))}
                                className="flex items-center gap-2 text-sm text-[#0B1330] font-bold hover:text-[#B88732] cursor-pointer"
                              >
                                <Gem className="w-4 h-4 text-[#B88732]" />
                                {(() => {
                                  const totalVisuals = (req.catalog_references?.length || 0) + (req.sketches?.length || 0);
                                  return (
                                    <span>
                                      Your Configured Specifications &amp; Design Selections ({totalVisuals} Reference{totalVisuals === 1 ? '' : 's'}/Sketches)
                                    </span>
                                  );
                                })()}
                                {expandedSpecs[req.id] === false ? <ChevronDown className="w-4 h-4 ml-1 text-[#B88732]" /> : <ChevronUp className="w-4 h-4 ml-1 text-[#B88732]" />}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => setSpecsModalRequest(req)}
                                className="px-3.5 py-1.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] text-[#0B1330] hover:border-[#D4AF37] hover:text-[#B88732] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                              >
                                <Sliders className="w-3.5 h-3.5 text-[#B88732]" /> Open Full Modal Spec Sheet
                              </button>
                            </div>

                            {expandedSpecs[req.id] !== false && (
                              <div className="pt-3 border-t border-[#E8D7B7]/70 space-y-4 text-xs">
                                {/* Parameters Matrix */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                  <div className="p-3 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 space-y-0.5 shadow-xs">
                                    <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Category</span>
                                    <p className="font-bold text-[#0B1330]">{req.category_name || 'Bespoke Piece'}</p>
                                  </div>

                                  {/* Metal Alloy */}
                                  {(() => {
                                    const selMetal = req.selections?.find((s: any) => s.group_key === 'metal' || s.group_label?.toLowerCase().includes('metal'));
                                    const metalName = selMetal?.value_label || req.metal_alloy_name;
                                    return metalName ? (
                                      <div className="p-3 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 space-y-0.5 shadow-xs">
                                        <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Metal Alloy</span>
                                        <p className="font-bold text-[#0B1330]">{metalName}</p>
                                      </div>
                                    ) : null;
                                  })()}

                                  {/* Ring Sizing */}
                                  {req.ring_size && (
                                    <div className="p-3 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 space-y-0.5 shadow-xs">
                                      <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Ring Sizing</span>
                                      <p className="font-bold text-[#0B1330]">
                                        Size {req.ring_size} ({(req.ring_size_standard || '').toLowerCase() === 'in_hk' ? 'IN_HK' : (req.ring_size_standard?.toUpperCase() || 'IN_HK')})
                                      </p>
                                    </div>
                                  )}

                                  {/* Target Metal Weight */}
                                  {req.target_weight_grams && (
                                    <div className="p-3 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 space-y-0.5 shadow-xs">
                                      <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Target Weight</span>
                                      <p className="font-bold text-[#0B1330]">{req.target_weight_grams} grams</p>
                                    </div>
                                  )}

                                  {/* Complexity Tier */}
                                  {req.budget_range && (
                                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 space-y-0.5 shadow-xs">
                                      <span className="text-[10px] font-mono text-amber-800 uppercase font-bold">Production Tier</span>
                                      <p className="font-bold text-amber-950">{req.budget_range}</p>
                                    </div>
                                  )}

                                  {/* Target Completion Date */}
                                  {req.needed_by_date && (
                                    <div className="p-3 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 space-y-0.5 shadow-xs">
                                      <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Target Completion</span>
                                      <p className="font-bold text-[#0B1330]">
                                        {new Date(req.needed_by_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </p>
                                    </div>
                                  )}

                                  {/* Aesthetic Style */}
                                  {req.aesthetic_style_name && (
                                    <div className="p-3 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 space-y-0.5 shadow-xs">
                                      <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Aesthetic Style</span>
                                      <p className="font-bold text-[#0B1330]">{req.aesthetic_style_name}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Dynamic Option Selections from Configurator */}
                                {req.selections && req.selections.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold flex items-center gap-1">
                                      <Layers className="w-3.5 h-3.5 text-[#B88732]" /> Configured Options &amp; Selections
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {req.selections.map((sel: any, idx: number) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 flex items-center justify-between shadow-xs">
                                          <span className="text-[#5A6679] text-[11px] truncate">{sel.group_label}:</span>
                                          <div className="flex items-center gap-1 font-bold text-[#0B1330] text-xs">
                                            {sel.swatch_color && (
                                              <span className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: sel.swatch_color }} />
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
                                  <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold flex items-center gap-1.5">
                                    <Gem className="w-3.5 h-3.5 text-[#B88732]" /> Gemstone &amp; Diamond Specifications
                                  </span>
                                  {req.is_metal_only ? (
                                    <div className="p-3 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] text-[#5A6679]">
                                      Solid Metal Design &mdash; No diamonds or gemstones specified.
                                    </div>
                                  ) : req.stones && req.stones.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {req.stones.map((st: any, idx: number) => (
                                        <div key={idx} className="p-3 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-xs">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-[#0B1330]">{st.stone_type} ({st.shape || 'Standard'})</span>
                                            {st.is_center_stone && (
                                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[9px] font-bold uppercase">
                                                Center Stone
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 text-[#5A6679] font-mono text-[11px] flex-wrap">
                                            <span>Count: <strong className="text-[#0B1330] font-bold">{st.quantity || 1}x</strong></span>
                                            <span>•</span>
                                            <span>Size: <strong className="text-[#B88732] font-bold">{st.size_value ? `${st.size_value} ${st.size_unit || 'ct'}` : '--'}</strong></span>
                                            <span>•</span>
                                            <span>Setting: <strong className="text-[#0B1330] font-bold">{st.setting_style || 'Prong'}</strong></span>
                                            {[st.clarity, st.color].filter(Boolean).length > 0 && (
                                              <>
                                                <span>•</span>
                                                <span>Grade: <strong className="text-[#0B1330] font-bold">{[st.clarity, st.color].filter(Boolean).join(' • ')}</strong></span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : req.gemstones && req.gemstones.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {req.gemstones.map((g: any, idx: number) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 flex justify-between shadow-xs">
                                          <span className="font-bold text-[#0B1330]">{g.quantity}x {g.stone_type} ({g.cut_type})</span>
                                          <span className="font-mono text-[#B88732] font-bold">{g.carat_size || 'Spec'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-3 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] text-[#5A6679]">
                                      {req.gemstone_preference_open ? 'Client selected: Let Designer Decide optimal stone layout' : 'Plain metal piece &mdash; No gemstone specifications added.'}
                                    </div>
                                  )}
                                </div>

                                {/* Custom Engraving & Logo */}
                                {(req.engraving_text || req.has_logo) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {req.engraving_text && (
                                      <div className="p-3 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 space-y-1 shadow-xs">
                                        <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Laser Engraving</span>
                                        <p className="font-serif italic text-[#B88732] font-bold text-sm">"{req.engraving_text}"</p>
                                        <p className="text-[10px] text-[#5A6679] font-mono">Font: {req.engraving_font || 'Script'} • Placement: {req.engraving_placement || 'Inside Shank'}</p>
                                      </div>
                                    )}
                                    {req.has_logo && (
                                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1 shadow-xs">
                                        <span className="text-[10px] font-mono text-emerald-800 uppercase font-bold">Brand Logo Hallmark</span>
                                        <p className="text-emerald-900 font-bold">✓ Custom Hallmark Vector Stamping Requested</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Written Brief & Special Notes */}
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Client Design Brief &amp; Special Instructions</span>
                                  <div className="p-3.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7]/80 text-xs text-[#2A3547] leading-relaxed space-y-2 shadow-xs">
                                    <p>{req.description || 'No additional written brief entered.'}</p>
                                    {req.special_instructions && req.special_instructions !== req.description && (
                                      <p className="pt-2 border-t border-[#E8D7B7]/60 text-amber-800 font-mono text-[11px] font-semibold">
                                        {req.special_instructions}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Studio Catalog References */}
                                {req.catalog_references && req.catalog_references.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-[#B88732]" /> Selected Studio Catalog References ({req.catalog_references.length})
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {req.catalog_references.map((cRef: any, cIdx: number) => (
                                        <div
                                          key={cIdx}
                                          onClick={() => cRef.image && setSelectedSketchUrl(cRef.image)}
                                          className="p-2.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] hover:border-[#D4AF37] flex items-center gap-3 cursor-pointer transition-all hover:bg-white shadow-xs"
                                        >
                                          {cRef.image ? (
                                            <img src={cRef.image} alt={cRef.title} className="w-12 h-12 rounded-lg object-cover border border-[#E8D7B7] shrink-0" />
                                          ) : (
                                            <div className="w-12 h-12 rounded-lg bg-[#EAE2D2] flex items-center justify-center text-[10px] text-[#5A6679] shrink-0 font-mono">CAD</div>
                                          )}
                                          <div className="min-w-0 flex-1">
                                            <span className="text-[10px] font-mono text-[#B88732] block font-bold">{cRef.sku || `SKU-${cRef.id}`}</span>
                                            <p className="text-xs font-bold text-[#0B1330] truncate">{cRef.title}</p>
                                            <span className="text-[9px] text-[#8C97A7] block">Click to enlarge image</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Sketches */}
                                {req.sketches && req.sketches.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold">Uploaded Reference Sketches ({req.sketches.length})</span>
                                    <div className="flex flex-wrap gap-2">
                                      {req.sketches.map((sk: any) => (
                                        <img
                                          key={sk.id}
                                          src={sk.image_url || sk.image}
                                          alt="Sketch"
                                          onClick={() => setSelectedSketchUrl(sk.image_url || sk.image)}
                                          className="w-16 h-16 rounded-xl object-cover border border-[#E8D7B7] hover:border-[#D4AF37] cursor-pointer shadow-xs transition-all hover:scale-105"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Uploaded Reference Photo (from Quick Request or direct upload) */}
                                {req.reference_image && (!req.sketches || !req.sketches.some((s: any) => (s.image_url || s.image) === req.reference_image)) && (
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold flex items-center gap-1.5">
                                      <ImageIcon className="w-3.5 h-3.5 text-[#B88732]" /> Uploaded Reference / Inspiration Photo
                                    </span>
                                    <div className="flex gap-2">
                                      <img
                                        src={req.reference_image}
                                        alt="Reference Photo"
                                        onClick={() => setSelectedSketchUrl(req.reference_image)}
                                        className="w-20 h-20 rounded-xl object-cover border-2 border-[#E8D7B7] hover:border-[#D4AF37] cursor-pointer shadow-md transition-all hover:scale-105"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Voice Note Requisition Player */}
                                {(req.voice_recording_url || req.voice_recording) && (
                                  <div className="p-3.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-2 shadow-xs">
                                    <span className="text-[10px] font-mono text-[#9A6A1A] uppercase font-bold flex items-center gap-1.5">
                                      <Mic className="w-3.5 h-3.5 text-[#B88732]" /> Voice Note Requisition Attached
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-[#FFF8EC] border border-[#E8D7B7] flex items-center justify-center shrink-0">
                                        <Volume2 className="w-4 h-4 text-[#B88732]" />
                                      </div>
                                      <audio
                                        controls
                                        src={req.voice_recording_url || req.voice_recording}
                                        className="w-full h-8 rounded-lg accent-[#D4AF37]"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        )}
                        </div>
                      </div>
                      )}

                      {/* NODE 2: OFFICIAL QUOTE & NEGOTIATION */}
                      {(activeStageTab === 'all' || activeStageTab === 'negotiation') && (
                      <div className="relative group">
                        <div className={`hidden sm:flex absolute -left-[47px] top-0 w-6 h-6 rounded-full border-4 border-[#070D22] items-center justify-center ${
                          req.status === 'quoted' || req.status === 'negotiating' || req.status === 'agreed' || order
                            ? 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]'
                            : 'bg-white border-slate-300'
                        }`}>
                          <Sparkles className="w-3.5 h-3.5 text-[#070D22]" />
                        </div>

                        {/* MOBILE ACCORDION HEADER (2. QUOTE & NEGOTIATION) */}
                        <button
                          type="button"
                          onClick={() => setMobileAccordionStage(currentActiveStage === 'negotiation' ? null : 'negotiation')}
                          className="sm:hidden w-full p-3.5 rounded-2xl bg-white border border-[#E8D7B7] shadow-xs flex items-center justify-between gap-3 text-left transition-all cursor-pointer mb-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              currentActiveStage === 'negotiation' ? 'bg-[#0B1330] text-[#F5E7A3]' : 'bg-[#FFF9EE] text-[#B88732] border border-[#E8D7B7]'
                            }`}>
                              <MessageSquare className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-serif font-bold text-xs text-[#0B1330] block truncate">
                                2. Senior Engineer Quote &amp; Negotiation
                              </span>
                              <span className="text-[10px] font-mono text-[#5A6679]">
                                {req.status === 'agreed' || order ? 'Agreed & Confirmed' : req.status === 'quoted' ? 'Official Quote Ready' : req.status === 'negotiating' ? 'Counter-Offer Active' : 'Under Assessment'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                              req.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-300'
                                : req.status === 'agreed' || order
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                : req.status === 'quoted'
                                ? 'bg-blue-50 text-blue-700 border border-blue-300'
                                : req.status === 'negotiating'
                                ? 'bg-purple-50 text-purple-700 border border-purple-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}>
                              {req.status === 'rejected' ? 'Declined' : req.status === 'agreed' || order ? 'Agreed' : req.status === 'quoted' ? 'Quote' : req.status === 'negotiating' ? 'Counter' : 'Pending'}
                            </span>
                            {currentActiveStage === 'negotiation' ? (
                              <ChevronUp className="w-4 h-4 text-[#B88732]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#5A6679]" />
                            )}
                          </div>
                        </button>

                        {/* NODE 2 CONTENT WRAPPER */}
                        <div className={activeStageTab === 'all' && currentActiveStage !== 'negotiation' ? 'hidden sm:block' : 'block'}>
                        {/* Negotiation message analysis */}
                        {(() => {
                          const latestOfferMsg = req.messages && req.messages.length > 0
                            ? [...req.messages].reverse().find((m: any) => m.offered_price !== undefined && m.offered_price !== null && m.offered_price !== '')
                            : null;
                          const isLatestOfferFromClient = Boolean(latestOfferMsg && latestOfferMsg.sender_type === 'client');
                          const isLatestOfferFromAdmin = Boolean(
                            (latestOfferMsg && latestOfferMsg.sender_type === 'admin') ||
                            (!latestOfferMsg && req.status === 'quoted')
                          );
                          const currentOfferedPrice = latestOfferMsg?.offered_price != null
                            ? Number(latestOfferMsg.offered_price)
                            : Number(req.agreed_price || req.estimated_price_shown || 0);

                          return (
                            <div className="space-y-4">
                              <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-serif text-xl font-bold text-[#0B1330]">
                                    2. Official Senior Engineer Quote &amp; Negotiation
                                  </h3>
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                                    req.status === 'agreed' || req.status === 'in_progress' || order
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                      : isLatestOfferFromClient
                                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                      : req.status === 'quoted' || isLatestOfferFromAdmin
                                      ? 'bg-blue-50 text-blue-800 border border-blue-300'
                                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                                  }`}>
                                    {req.status === 'agreed' || req.status === 'in_progress' || order
                                      ? 'ACCEPTED & AGREED'
                                      : isLatestOfferFromClient
                                      ? 'COUNTER SENT • AWAITING ADMIN'
                                      : req.status === 'quoted' || isLatestOfferFromAdmin
                                      ? 'STUDIO QUOTE RECEIVED'
                                      : req.status}
                                  </span>
                                </div>
                                <div className="text-left sm:text-right">
                                  <span className="font-serif text-2xl font-bold text-[#B88732] block">
                                    {formatINR(currentOfferedPrice)}
                                  </span>
                                  {req.is_file_edit && (req.agreed_price_usd || req.quoted_price_usd) && (
                                    <span className="text-xs font-mono font-semibold text-[#5A6679] block">
                                      ≈ ${Number(req.agreed_price_usd || req.quoted_price_usd).toFixed(2)} USD (1 USD = ₹86.85)
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-[#5A6679]">
                                    {isOrderConfirmed
                                      ? 'Agreed Contract Price'
                                      : isLatestOfferFromClient
                                      ? 'Your Proposed Price (Waiting for Admin)'
                                      : 'Studio Quoted Price'}
                                  </span>
                                </div>
                              </div>

                              {/* REAL CHAT BUBBLES THREAD LOG */}
                              {req.messages && req.messages.length > 0 && (
                                <div className="space-y-3 p-4 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] max-h-72 overflow-y-auto custom-scrollbar shadow-inner">
                                  {req.messages.map((msg: any) => {
                                    const isAdmin = msg.sender_type === 'admin';
                                    return (
                                      <div
                                        key={msg.id}
                                        className={`flex gap-3 ${isAdmin ? 'justify-start' : 'justify-end'}`}
                                      >
                                        {isAdmin && (
                                          <div className="w-8 h-8 rounded-full bg-[#FFF8EC] border border-[#D4AF37] flex items-center justify-center text-[#9A6A1A] text-xs font-serif font-bold shrink-0 shadow-xs">
                                            CAD
                                          </div>
                                        )}

                                        <div
                                          className={`p-4 rounded-2xl max-w-md text-xs space-y-1.5 shadow-sm ${
                                            isAdmin
                                              ? 'bg-white border border-[#E8D7B7] text-[#0B1330] rounded-tl-none'
                                              : 'bg-[#0B1330] border border-[#D4AF37]/50 text-white rounded-tr-none'
                                          }`}
                                        >
                                          <div className={`flex justify-between items-center text-[10px] pb-1 border-b ${isAdmin ? 'text-[#687386] border-[#E8D7B7]/60' : 'text-slate-300 border-white/10'}`}>
                                            <span className="font-bold">{isAdmin ? 'Senior CAD Engineer (Admin)' : 'You'}</span>
                                            <span className="font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          </div>
                                          <p className={isAdmin ? 'text-[#2A3547]' : 'text-slate-100'}>{msg.message}</p>
                                          {msg.offered_price && (
                                            <div className={`mt-2 p-2 rounded-xl border flex items-center justify-between text-xs ${isAdmin ? 'bg-[#FFF9EE] border-[#E8D7B7] text-[#0B1330]' : 'bg-white/10 border-[#D4AF37]/40 text-[#F5E7A3]'}`}>
                                              <span className="text-[10px] uppercase font-mono">Official Price Offer:</span>
                                              <span className="font-mono font-bold text-[#B88732]">
                                                {formatINR(msg.offered_price)}
                                                {msg.offered_price_usd ? (
                                                  <span className="text-[10px] font-normal text-[#5A6679] ml-1">
                                                    (${Number(msg.offered_price_usd).toFixed(2)} USD)
                                                  </span>
                                                ) : null}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* STATUS REJECTED / DECLINED BANNER */}
                              {req.status === 'rejected' && (
                                <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm text-xs mt-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                                      <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="font-bold text-rose-950 text-sm block">Order Declined by CAD Atelier</span>
                                      <span className="text-rose-800 text-xs block leading-relaxed">
                                        <strong>Reason:</strong> {req.rejection_reason || 'File geometry could not be modified to specified requirements.'}
                                      </span>
                                    </div>
                                  </div>
                                  <a
                                    href="https://wa.me/919574787098"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-rose-100 transition-colors shrink-0 shadow-xs"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>Contact Support Desk</span>
                                  </a>
                                </div>
                              )}

                              {/* STATUS AGREED BANNER */}
                              {(req.status === 'agreed' || req.status === 'in_progress' || order) && (
                                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs text-xs mt-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                                      <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <span className="font-bold text-emerald-950 text-sm block">Quote Accepted &amp; Status AGREED!</span>
                                      <span className="text-emerald-800 text-[11px]">
                                        Agreed Final Price: <strong>{formatINR(req.agreed_price || req.estimated_price_shown)}</strong>
                                        {req.agreed_price_usd ? <span className="text-emerald-900 font-mono font-normal ml-1">(${Number(req.agreed_price_usd).toFixed(2)} USD)</span> : null}. Payment schedule is active below.
                                      </span>
                                    </div>
                                  </div>
                                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider font-mono flex items-center gap-1.5 shadow shrink-0">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>ACCEPTED</span>
                                  </div>
                                </div>
                              )}

                              {/* ACTION BUTTONS & TWO-WAY NEGOTIATION FORM */}
                              {(req.status === 'quoted' || req.status === 'negotiating') && !isOrderConfirmed && (
                                <div className="space-y-4 pt-2">
                                  {/* If client made the latest counter-offer: Client is waiting for Admin. Client CANNOT accept their own offer! */}
                                  {isLatestOfferFromClient ? (
                                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xs">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                                          <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-amber-950 text-sm">
                                              Your Counter-Offer of {formatINR(currentOfferedPrice)} is with SuperAdmin
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300 text-[9px] font-mono font-bold uppercase">
                                              Pending Admin Decision
                                            </span>
                                          </div>
                                          <p className="text-amber-800 text-[11px] leading-relaxed">
                                            You offered {formatINR(currentOfferedPrice)}. Waiting for the Studio Admin to review and accept your offer or reply with revised terms. You cannot accept your own counter-offer.
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setShowCounterForm((prev) => ({ ...prev, [req.id]: !prev[req.id] }))}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-[#E8D7B7] bg-white text-[#0B1330] hover:border-[#D4AF37] hover:text-[#B88732] transition-all shrink-0 cursor-pointer shadow-xs"
                                      >
                                        {showCounterForm[req.id] ? 'Hide Form' : 'Adjust Counter Price'}
                                      </button>
                                    </div>
                                  ) : (
                                    /* If admin made the latest offer: Client can accept it, counter it, or decline it! */
                                    <div className="flex flex-wrap items-center gap-3">
                                      {/* Option 1: Accept current admin quote */}
                                      <button
                                        onClick={() => handleAcceptQuote(req.id)}
                                        disabled={isSubmitting[req.id]}
                                        className="btn-gold-luxury px-8 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-lg cursor-pointer hover:brightness-105"
                                      >
                                        {isSubmitting[req.id] ? (
                                          <Loader2 className="w-4 h-4 text-[#0B1330] animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="w-4 h-4 text-[#0B1330]" />
                                        )}
                                        <span>Accept Quote ({formatINR(currentOfferedPrice)}{req.is_file_edit && (req.agreed_price_usd || req.quoted_price_usd) ? ` / $${Number(req.agreed_price_usd || req.quoted_price_usd).toFixed(2)} USD` : ''}) &amp; Confirm Order</span>
                                      </button>

                                      {/* Option 2: Propose Counter Price / Send Price Request */}
                                      <button
                                        type="button"
                                        onClick={() => setShowCounterForm((prev) => ({ ...prev, [req.id]: !prev[req.id] }))}
                                        className="px-5 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 border border-[#E8D7B7] bg-white text-[#0B1330] hover:border-[#D4AF37] hover:text-[#B88732] transition-all shadow-xs cursor-pointer"
                                      >
                                        <MessageSquare className="w-4 h-4 text-[#B88732]" />
                                        <span>{showCounterForm[req.id] ? 'Hide Counter Form' : 'Not Satisfied? Propose Counter Price'}</span>
                                      </button>

                                      {/* Option 3: Decline / Reject Offer */}
                                      <button
                                        type="button"
                                        onClick={() => handleRejectQuote(req.id)}
                                        disabled={isSubmitting[req.id]}
                                        className="px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-xs cursor-pointer"
                                      >
                                        {isSubmitting[req.id] ? (
                                          <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-rose-600" />
                                        )}
                                        <span>Decline Offer</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Counter Offer Form */}
                                  {(showCounterForm[req.id] || (req.status === 'negotiating' && !isLatestOfferFromClient && !isLatestOfferFromAdmin)) && (
                                    <form
                                      onSubmit={(e) => handleSendCounterOffer(e, req.id)}
                                      className="p-5 rounded-2xl bg-white border border-[#E8D7B7] space-y-4 shadow-sm"
                                    >
                                      <div className="flex items-center justify-between border-b border-[#E8D7B7]/70 pb-2.5">
                                        <span className="text-xs font-bold font-serif text-[#0B1330] uppercase tracking-wider flex items-center gap-2">
                                          <Send className="w-3.5 h-3.5 text-[#B88732]" />
                                          Send Price Request / Counter-Offer to SuperAdmin
                                        </span>
                                        <span className="text-[10px] text-[#5A6679] font-mono">Multi-Round Negotiation Active</span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                        <div className="sm:col-span-1">
                                          <label className="block text-[10px] font-mono text-[#5A6679] uppercase font-bold mb-1">
                                            Your Target Price (USD $)
                                          </label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-[#9A6A1A]">$</span>
                                            <input
                                              type="number"
                                              value={counterPriceInput[req.id] || ''}
                                              onChange={(e) => setCounterPriceInput({ ...counterPriceInput, [req.id]: e.target.value })}
                                              placeholder={req.is_file_edit ? "e.g. 15" : "e.g. 200"}
                                              className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] text-xs font-mono font-bold text-[#0B1330] focus:outline-none focus:border-[#D4AF37] focus:bg-white"
                                            />
                                          </div>
                                          {counterPriceInput[req.id] && !isNaN(parseFloat(counterPriceInput[req.id])) && parseFloat(counterPriceInput[req.id]) > 0 && (
                                            <span className="text-[10px] font-mono text-[#5A6679] block mt-1">
                                              ≈ ${(parseFloat(counterPriceInput[req.id]) / 86.85).toFixed(2)} USD (1 USD = ₹86.85)
                                            </span>
                                          )}
                                        </div>
                                        <div className="sm:col-span-2">
                                          <label className="block text-[10px] font-mono text-[#5A6679] uppercase font-bold mb-1">
                                            Note for SuperAdmin (Optional)
                                          </label>
                                          <input
                                            type="text"
                                            value={counterMessageInput[req.id] || ''}
                                            onChange={(e) => setCounterMessageInput({ ...counterMessageInput, [req.id]: e.target.value })}
                                            placeholder="e.g. Can we adjust within this budget for 18K Yellow Gold?"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] text-xs text-[#0B1330] focus:outline-none focus:border-[#D4AF37] focus:bg-white"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex justify-end gap-2 pt-1">
                                        <button
                                          type="submit"
                                          disabled={isSubmitting[req.id]}
                                          className="btn-gold-luxury px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer hover:brightness-105"
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
                          );
                        })()}
                        </div>
                      </div>
                      )}

                      {/* NODE 3: MULTI-STAGE PAYMENT SCHEDULE TABLE */}
                      {(activeStageTab === 'all' || activeStageTab === 'payments') && (
                      <div className="relative group">
                        <div className={`hidden sm:flex absolute -left-[47px] top-0 w-6 h-6 rounded-full border-4 border-[#FAF8F5] items-center justify-center ${
                          paidVal > 0
                            ? 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]'
                            : isOrderConfirmed
                            ? 'bg-[#0B1330] text-[#F5E7A3]'
                            : 'bg-white border-2 border-[#E8D7B7] text-[#5A6679]'
                        }`}>
                          <CreditCard className="w-3.5 h-3.5" />
                        </div>

                        {/* MOBILE ACCORDION HEADER (3. PAYMENTS) */}
                        <button
                          type="button"
                          onClick={() => setMobileAccordionStage(currentActiveStage === 'payments' ? null : 'payments')}
                          className="sm:hidden w-full p-3.5 rounded-2xl bg-white border border-[#E8D7B7] shadow-xs flex items-center justify-between gap-3 text-left transition-all cursor-pointer mb-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              currentActiveStage === 'payments' ? 'bg-[#0B1330] text-[#F5E7A3]' : 'bg-[#FFF9EE] text-[#B88732] border border-[#E8D7B7]'
                            }`}>
                              <CreditCard className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-serif font-bold text-xs text-[#0B1330] block truncate">
                                3. Order Payment Options
                              </span>
                              <span className="text-[10px] font-mono text-[#5A6679]">
                                {isFullyPaid ? '100% Fully Settled' : isOrderConfirmed ? `Balance: ${formatINR(unpaidVal)}` : 'Awaiting Order Approval'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                              isFullyPaid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                : isOrderConfirmed
                                ? 'bg-amber-50 text-[#B88732] border border-[#E8D7B7]'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}>
                              {isFullyPaid ? '100% Paid' : isOrderConfirmed ? `${paidPct}% Paid` : 'Locked'}
                            </span>
                            {currentActiveStage === 'payments' ? (
                              <ChevronUp className="w-4 h-4 text-[#B88732]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#5A6679]" />
                            )}
                          </div>
                        </button>

                        {/* NODE 3 CONTENT WRAPPER */}
                        <div className={activeStageTab === 'all' && currentActiveStage !== 'payments' ? 'hidden sm:block' : 'block'}>
                        <div className="space-y-4">
                          <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h3 className="font-serif text-xl font-bold text-[#0B1330] flex items-center gap-2.5 flex-wrap">
                              <span>3. Order Payment Options</span>
                              <span className="text-xs font-mono font-medium text-[#B88732] px-3 py-1 rounded-full bg-white border border-[#E8D7B7] shadow-sm">
                                Part Payment (10/30/60 Split) OR Pay Full Amount
                              </span>
                            </h3>
                            {!isOrderConfirmed ? (
                              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-600 text-[11px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5 w-fit">
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                                Locked &bull; Awaiting Order Confirmation
                              </span>
                            ) : isFullyPaid ? (
                              <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[11px] font-mono font-bold inline-flex items-center gap-1.5 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ORDER 100% PAID IN FULL
                              </span>
                            ) : (
                              <span className="px-3.5 py-1 rounded-full bg-amber-50 text-[#B88732] border border-[#E8D7B7] text-[11px] font-mono font-bold inline-flex items-center gap-1.5 shadow-sm">
                                <CreditCard className="w-3.5 h-3.5 text-[#B88732]" />
                                Balance Due: {formatINR(unpaidVal)}
                              </span>
                            )}
                          </div>

                          {/* Locked Notice if Order Not Confirmed Yet */}
                          {!isOrderConfirmed && (
                            <div className="p-5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-sm">
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8D7B7] flex items-center justify-center text-[#B88732] shrink-0 shadow-sm">
                                  <Lock className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <span className="font-serif font-bold text-[#0B1330] text-sm block">Payment Option Locked</span>
                                  <span className="text-[#5A6679] text-xs block leading-relaxed">
                                    {(() => {
                                      const latestOfferMsg = req.messages && req.messages.length > 0
                                        ? [...req.messages].reverse().find((m: any) => m.offered_price !== undefined && m.offered_price !== null && m.offered_price !== '')
                                        : null;
                                      const isLatestOfferFromClient = Boolean(latestOfferMsg && latestOfferMsg.sender_type === 'client');
                                      const currentOfferedPrice = latestOfferMsg?.offered_price != null
                                        ? Number(latestOfferMsg.offered_price)
                                        : Number(req.agreed_price || req.estimated_price_shown || 0);

                                      if (isLatestOfferFromClient) {
                                        return `Your counter-offer of ${formatINR(currentOfferedPrice)} is waiting for SuperAdmin review. Stage payment unlocks once admin accepts your offer.`;
                                      }
                                      if (req.status === 'quoted') {
                                        return `Studio has quoted ${formatINR(currentOfferedPrice)}. Accept the quote above to confirm the order and unlock Stage 1 payment.`;
                                      }
                                      if (req.status === 'negotiating') {
                                        return 'Negotiation is in progress. Stage payment will unlock once an offer is accepted by either you or the atelier administrator.';
                                      }
                                      return 'Our Senior Engineers are reviewing your design brief. Stage payment unlocks once price is finalized and the order is confirmed.';
                                    })()}
                                  </span>
                                </div>
                              </div>
                              {(() => {
                                const latestOfferMsg = req.messages && req.messages.length > 0
                                  ? [...req.messages].reverse().find((m: any) => m.offered_price !== undefined && m.offered_price !== null && m.offered_price !== '')
                                  : null;
                                const isLatestOfferFromAdmin = Boolean(
                                  (latestOfferMsg && latestOfferMsg.sender_type === 'admin') ||
                                  (!latestOfferMsg && req.status === 'quoted')
                                );
                                const currentOfferedPrice = latestOfferMsg?.offered_price != null
                                  ? Number(latestOfferMsg.offered_price)
                                  : Number(req.agreed_price || req.estimated_price_shown || 0);

                                if (isLatestOfferFromAdmin && (req.status === 'quoted' || req.status === 'negotiating')) {
                                  return (
                                    <button
                                      onClick={() => handleAcceptQuote(req.id)}
                                      disabled={isSubmitting[req.id]}
                                      className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 shadow-md cursor-pointer flex items-center gap-1.5"
                                    >
                                      {isSubmitting[req.id] ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B1330]" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0B1330]" />
                                      )}
                                      <span>Accept Admin Quote ({formatINR(currentOfferedPrice)})</span>
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}

                          {/* 100% PAID SUCCESS BANNER */}
                          {isFullyPaid && (
                            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-2 border-emerald-400/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_8px_25px_rgba(16,185,129,0.12)]">
                              <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                                  <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="font-serif font-bold text-emerald-900 text-base flex items-center gap-2">
                                    <span>Order Completely Paid in Full ({formatINR(paidVal)})</span>
                                  </h4>
                                  <p className="text-xs text-emerald-700">
                                    All payment stages are cleared. 3D inspection preview and final CAD deliverables are unlocked.
                                  </p>
                                </div>
                              </div>
                              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-mono font-bold shrink-0">
                                Zero Balance Remaining
                              </span>
                            </div>
                          )}

                          {/* DUAL PAYMENT CHOICE CARDS (PAY FULL VS PART-PAYMENT) */}
                          {isOrderConfirmed && !isFullyPaid && unpaidVal > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {/* CARD A: PAY FULL AMOUNT */}
                              <div className="relative p-6 rounded-3xl bg-gradient-to-br from-[#0B1330] via-[#111C44] to-[#0B1330] border-2 border-[#D4AF37] shadow-[0_12px_35px_rgba(212,175,55,0.22)] flex flex-col justify-between gap-4 text-white overflow-hidden">
                                <div className="absolute top-0 right-0 px-3.5 py-1.5 rounded-bl-2xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#0B1330] text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-[#0B1330] fill-current" />
                                  <span>Fast-Track &bull; Recommended</span>
                                </div>

                                <div className="space-y-2 pr-12">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-white/10 border border-[#D4AF37]/50 flex items-center justify-center text-[#F5E7A3]">
                                      <Sparkles className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-mono font-bold text-[#F5E7A3] uppercase tracking-wide">
                                      Option A: Pay Full Amount
                                    </span>
                                  </div>
                                  <h4 className="font-serif text-xl font-bold text-white">
                                    {paidVal > 0 ? 'Clear Remaining Balance in Full' : 'Pay 100% Upfront in One Transaction'}
                                  </h4>
                                  <p className="text-xs text-slate-300 leading-relaxed">
                                    {paidVal > 0
                                      ? `You have paid ${formatINR(paidVal)} so far. Settle the remaining balance (${formatINR(unpaidVal)}) now to complete your order without stage interruptions.`
                                      : `Settle the full ${formatINR(unpaidVal)} upfront. Automatically unlocks all 3D inspection previews and final CAD file deliverables upon completion.`}
                                  </p>
                                </div>

                                <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <span className="text-[10px] font-mono text-slate-300 uppercase block">
                                      {paidVal > 0 ? 'Remaining Balance' : 'Total Order Valuation'}
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                      <span className="font-serif text-2xl font-extrabold text-[#F5E7A3]">
                                        {formatINR(unpaidVal)}
                                      </span>
                                      {req.is_file_edit && (req.agreed_price_usd || req.quoted_price_usd) && (
                                        <span className="text-xs font-mono text-slate-300 font-normal">
                                          (${((unpaidVal / (totalVal || 1)) * Number(req.agreed_price_usd || req.quoted_price_usd)).toFixed(2)} USD)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handlePayFullOrder(order || { id: req.id, is_file_edit: req.is_file_edit }, unpaidVal)}
                                    className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.4)] cursor-pointer hover:scale-[1.02] transition-all"
                                  >
                                    <CreditCard className="w-4 h-4 text-[#0B1330]" />
                                    <span>Pay Full Amount ({formatINR(unpaidVal)})</span>
                                  </button>
                                </div>
                              </div>

                              {/* CARD B: PART PAYMENT MILESTONE SPLIT */}
                              <div className="p-6 rounded-3xl bg-white border-2 border-[#E8D7B7] hover:border-[#D4AF37]/70 shadow-[0_8px_25px_rgba(184,135,50,0.05)] flex flex-col justify-between gap-4 transition-all">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-[#FCFAF7] border border-[#E8D7B7] flex items-center justify-center text-[#B88732]">
                                      <Layers className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-mono font-bold text-[#B88732] uppercase tracking-wide">
                                      Option B: Part-Payment Milestones
                                    </span>
                                  </div>
                                  <h4 className="font-serif text-xl font-bold text-[#0B1330]">
                                    Pay Step-by-Step Across CAD Milestones
                                  </h4>
                                  <p className="text-xs text-[#5A6679] leading-relaxed">
                                    Split payments across 3 transparent stages: <strong className="text-[#0B1330]">10%</strong> Booking Confirmation to start CAD, <strong className="text-[#0B1330]">30%</strong> after 3D Preview approval, and <strong className="text-[#0B1330]">60%</strong> prior to final CAD delivery.
                                  </p>
                                </div>

                                <div className="pt-4 border-t border-[#E8D7B7] flex items-center justify-between text-xs font-mono text-[#5A6679]">
                                  <span>Schedule: 10% &bull; 30% &bull; 60%</span>
                                  <span className="text-[#B88732] font-semibold flex items-center gap-1">
                                    Use Stage Table Below &darr;
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* MOBILE PAYMENT CARDS (Zero Horizontal Overflow / Clean Mobile UX) */}
                          <div className="block sm:hidden space-y-3">
                            {!isOrderConfirmed ? (
                              <>
                                <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] space-y-2.5 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-serif font-bold text-xs text-[#0B1330]">Stage 1: Booking Confirmation</span>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">10% Split</span>
                                  </div>
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-sm font-serif font-bold text-[#B88732]">{hasOfficialQuote ? formatINR(totalVal * 0.1) : 'Quote Pending'}</span>
                                    <span className="text-[10px] text-[#5A6679]">Due Immediately to Start CAD</span>
                                  </div>
                                  <div className="pt-2 border-t border-[#E8D7B7]/50 flex items-center justify-center">
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                                      <Lock className="w-3.5 h-3.5" /> LOCKED (Pending Confirmation)
                                    </span>
                                  </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] space-y-2.5 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-serif font-bold text-xs text-[#0B1330]">Stage 2: Design Approval</span>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">30% Split</span>
                                  </div>
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-sm font-serif font-bold text-[#B88732]">{hasOfficialQuote ? formatINR(totalVal * 0.3) : 'Quote Pending'}</span>
                                    <span className="text-[10px] text-[#5A6679]">Due on 3D Preview Approval</span>
                                  </div>
                                  <div className="pt-2 border-t border-[#E8D7B7]/50 flex items-center justify-center">
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                                      <Lock className="w-3.5 h-3.5" /> LOCKED
                                    </span>
                                  </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] space-y-2.5 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-serif font-bold text-xs text-[#0B1330]">Stage 3: Final CAD Delivery</span>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">60% Split</span>
                                  </div>
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-sm font-serif font-bold text-[#B88732]">{hasOfficialQuote ? formatINR(totalVal * 0.6) : 'Quote Pending'}</span>
                                    <span className="text-[10px] text-[#5A6679]">Due Before Final File Release</span>
                                  </div>
                                  <div className="pt-2 border-t border-[#E8D7B7]/50 flex items-center justify-center">
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                                      <Lock className="w-3.5 h-3.5" /> LOCKED
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : order?.payment_stages && order.payment_stages.length > 0 ? (
                              order.payment_stages.map((st: any) => (
                                <div key={st.id} className="p-4 rounded-2xl bg-white border border-[#E8D7B7] space-y-2.5 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-serif font-bold text-xs text-[#0B1330]">{st.label}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-[#FFF9EE] text-[#B88732] border border-[#E8D7B7] text-[10px] font-mono font-bold">{st.percentage}% Split</span>
                                  </div>
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-base font-serif font-bold text-[#B88732]">{formatINR(st.amount)}</span>
                                    <span className="text-[10px] text-[#5A6679]">
                                      {st.trigger_type === 'immediate'
                                        ? 'Due Immediately to Start CAD'
                                        : st.trigger_type === 'on_design_approval'
                                        ? 'Due on 3D Preview Approval'
                                        : 'Due Before Final File Release'}
                                    </span>
                                  </div>
                                  <div className="pt-2 border-t border-[#E8D7B7]/50">
                                    {st.status === 'paid' ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-mono font-bold w-full justify-center">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        PAID &amp; CLEARED
                                      </span>
                                    ) : st.status === 'due' ? (
                                      <button
                                        onClick={() => handlePayStage(st, order?.id)}
                                        className="w-full btn-gold-luxury py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2"
                                      >
                                        <CreditCard className="w-3.5 h-3.5 text-[#0B1330]" />
                                        <span>Pay Stage ({formatINR(st.amount)})</span>
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 border border-slate-300 text-xs font-mono w-full justify-center">
                                        <Lock className="w-3.5 h-3.5" />
                                        LOCKED (Complete Prior Stage)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <>
                                <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] space-y-2.5 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-serif font-bold text-xs text-[#0B1330]">Stage 1: Booking Confirmation</span>
                                    <span className="px-2 py-0.5 rounded-full bg-[#FFF9EE] text-[#B88732] border border-[#E8D7B7] text-[10px] font-mono font-bold">10.00%</span>
                                  </div>
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-base font-serif font-bold text-[#B88732]">{formatINR(totalVal * 0.1)}</span>
                                    <span className="text-[10px] text-[#5A6679]">Due Immediately to Start CAD</span>
                                  </div>
                                  <div className="pt-2 border-t border-[#E8D7B7]/50">
                                    <button
                                      onClick={() => handlePayStage({ id: 1, stage_name: 'Stage 1: Booking Confirmation', amount: totalVal * 0.1, percentage: 10 }, order?.id)}
                                      className="w-full btn-gold-luxury py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2"
                                    >
                                      <CreditCard className="w-3.5 h-3.5 text-[#0B1330]" />
                                      <span>Pay Stage 1 ({formatINR(totalVal * 0.1)})</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] space-y-2.5 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-serif font-bold text-xs text-[#0B1330]">Stage 2: Design Approval</span>
                                    <span className="px-2 py-0.5 rounded-full bg-[#FFF9EE] text-[#B88732] border border-[#E8D7B7] text-[10px] font-mono font-bold">30.00%</span>
                                  </div>
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-base font-serif font-bold text-[#B88732]">{formatINR(totalVal * 0.3)}</span>
                                    <span className="text-[10px] text-[#5A6679]">Due on 3D Preview Approval</span>
                                  </div>
                                  <div className="pt-2 border-t border-[#E8D7B7]/50">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 border border-slate-300 text-xs font-mono w-full justify-center">
                                      <Lock className="w-3.5 h-3.5" />
                                      LOCKED
                                    </span>
                                  </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] space-y-2.5 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-serif font-bold text-xs text-[#0B1330]">Stage 3: Final CAD Delivery</span>
                                    <span className="px-2 py-0.5 rounded-full bg-[#FFF9EE] text-[#B88732] border border-[#E8D7B7] text-[10px] font-mono font-bold">60.00%</span>
                                  </div>
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-base font-serif font-bold text-[#B88732]">{formatINR(totalVal * 0.6)}</span>
                                    <span className="text-[10px] text-[#5A6679]">Due Before File Release</span>
                                  </div>
                                  <div className="pt-2 border-t border-[#E8D7B7]/50">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 border border-slate-300 text-xs font-mono w-full justify-center">
                                      <Lock className="w-3.5 h-3.5" />
                                      LOCKED
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Mobile Balance Summary & Pay Full */}
                            {isOrderConfirmed && totalVal > 0 && (
                              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <span className="text-[#5A6679]">Total Order Valuation:</span>
                                  <span className="font-serif font-bold text-[#0B1330]">{formatINR(totalVal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <span className="text-[#5A6679]">Paid Amount:</span>
                                  <span className="font-bold text-emerald-600">{formatINR(paidVal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <span className="text-[#5A6679]">Remaining Balance:</span>
                                  <span className="font-bold text-[#B88732]">{formatINR(unpaidVal)}</span>
                                </div>
                                {isFullyPaid ? (
                                  <span className="text-xs font-mono font-bold text-emerald-600 flex items-center justify-center gap-1 pt-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Fully Settled
                                  </span>
                                ) : unpaidVal > 0 ? (
                                  <button
                                    onClick={() => handlePayFullOrder(order || { id: req.id, is_file_edit: req.is_file_edit }, unpaidVal)}
                                    className="w-full mt-2 btn-gold-luxury py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow flex items-center justify-center gap-2"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-[#0B1330]" />
                                    <span>Pay Full Balance ({formatINR(unpaidVal)})</span>
                                  </button>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {/* DESKTOP PAYMENT STAGES TABLE */}
                          <div className="hidden sm:block overflow-x-auto rounded-3xl bg-white border border-[#E8D7B7] shadow-[0_12px_35px_rgba(184,135,50,0.06)]">
                            <table className="w-full text-left text-xs text-[#5A6679]">
                              <thead className="bg-[#FCFAF7] text-[#0B1330] font-serif border-b border-[#E8D7B7] uppercase text-[10px] tracking-wider">
                                <tr>
                                  <th className="p-4 font-bold">Stage Name</th>
                                  <th className="p-4 font-bold">% Split</th>
                                  <th className="p-4 font-bold">Amount (INR)</th>
                                  <th className="p-4 font-bold">Trigger Condition</th>
                                  <th className="p-4 text-right font-bold">Payment Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E8D7B7]/40">
                                {!isOrderConfirmed ? (
                                  <>
                                    <tr className="hover:bg-[#FFFDF9] transition-colors">
                                      <td className="p-4 font-bold text-[#0B1330]">Stage 1: Booking Confirmation</td>
                                      <td className="p-4 font-mono font-medium text-[#0B1330]">10.00%</td>
                                      <td className="p-4 font-serif text-sm font-bold text-[#B88732]">
                                        {hasOfficialQuote ? formatINR(totalVal * 0.1) : 'Quote Pending'}
                                        {hasOfficialQuote && req.is_file_edit && (req.agreed_price_usd || req.quoted_price_usd) && (
                                          <span className="text-[11px] font-mono font-normal text-[#5A6679] block">
                                            (${((totalVal * 0.1) / 86.85).toFixed(2)} USD)
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-4 text-xs text-[#5A6679]">Due Immediately upon Order Confirmation</td>
                                      <td className="p-4 text-right">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-300 text-[10px] font-mono font-semibold">
                                          <Lock className="w-3 h-3 text-slate-400" />
                                          LOCKED (Pending Confirmation)
                                        </span>
                                      </td>
                                    </tr>
                                    <tr className="hover:bg-[#FFFDF9] transition-colors">
                                      <td className="p-4 font-bold text-[#0B1330]">Stage 2: Design Approval Milestone</td>
                                      <td className="p-4 font-mono font-medium text-[#0B1330]">30.00%</td>
                                      <td className="p-4 font-serif text-sm font-bold text-[#B88732]">
                                        {hasOfficialQuote ? formatINR(totalVal * 0.3) : 'Quote Pending'}
                                        {hasOfficialQuote && req.is_file_edit && (req.agreed_price_usd || req.quoted_price_usd) && (
                                          <span className="text-[11px] font-mono font-normal text-[#5A6679] block">
                                            (${((totalVal * 0.3) / 86.85).toFixed(2)} USD)
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-4 text-xs text-[#5A6679]">Due on Client 3D Preview Approval</td>
                                      <td className="p-4 text-right">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-300 text-[10px] font-mono">
                                          <Lock className="w-3 h-3" />
                                          LOCKED
                                        </span>
                                      </td>
                                    </tr>
                                    <tr className="hover:bg-[#FFFDF9] transition-colors">
                                      <td className="p-4 font-bold text-[#0B1330]">Stage 3: Final CAD Delivery</td>
                                      <td className="p-4 font-mono font-medium text-[#0B1330]">60.00%</td>
                                      <td className="p-4 font-serif text-sm font-bold text-[#B88732]">
                                        {hasOfficialQuote ? formatINR(totalVal * 0.6) : 'Quote Pending'}
                                        {hasOfficialQuote && req.is_file_edit && (req.agreed_price_usd || req.quoted_price_usd) && (
                                          <span className="text-[11px] font-mono font-normal text-[#5A6679] block">
                                            (${((totalVal * 0.6) / 86.85).toFixed(2)} USD)
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-4 text-xs text-[#5A6679]">Due Before Final File Release</td>
                                      <td className="p-4 text-right">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-300 text-[10px] font-mono">
                                          <Lock className="w-3 h-3" />
                                          LOCKED
                                        </span>
                                      </td>
                                    </tr>
                                  </>
                                ) : order?.payment_stages && order.payment_stages.length > 0 ? (
                                  order.payment_stages.map((st: any) => (
                                    <tr key={st.id} className="hover:bg-[#FFFDF9] transition-colors">
                                      <td className="p-4 font-bold text-[#0B1330]">{st.label}</td>
                                      <td className="p-4 font-mono font-medium text-[#0B1330]">{st.percentage}%</td>
                                      <td className="p-4 font-serif text-sm font-bold text-[#B88732]">{formatINR(st.amount)}</td>
                                      <td className="p-4 text-xs text-[#5A6679]">
                                        {st.trigger_type === 'immediate'
                                          ? 'Due Immediately to Start CAD'
                                          : st.trigger_type === 'on_design_approval'
                                          ? 'Due on Client 3D Preview Approval'
                                          : 'Due Before Final File Release'}
                                      </td>
                                      <td className="p-4 text-right">
                                        {st.status === 'paid' ? (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-mono font-bold">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            PAID
                                          </span>
                                        ) : st.status === 'due' ? (
                                          <button
                                            onClick={() => handlePayStage(st, order?.id)}
                                            className="btn-gold-luxury px-4 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider shadow-md cursor-pointer"
                                          >
                                            Pay Stage ({formatINR(st.amount)})
                                          </button>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-300 text-[10px] font-mono">
                                            <Lock className="w-3 h-3" />
                                            LOCKED
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <>
                                    <tr className="hover:bg-[#FFFDF9] transition-colors">
                                      <td className="p-4 font-bold text-[#0B1330]">Stage 1: Booking Confirmation</td>
                                      <td className="p-4 font-mono font-medium text-[#0B1330]">10.00%</td>
                                      <td className="p-4 font-serif text-sm font-bold text-[#B88732]">
                                        {formatINR(totalVal * 0.1)}
                                        {req.is_file_edit && (req.agreed_price_usd || req.quoted_price_usd) && (
                                          <span className="text-[11px] font-mono font-normal text-[#5A6679] block">
                                            (${((totalVal * 0.1) / 86.85).toFixed(2)} USD)
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-4 text-xs text-[#5A6679]">Due Immediately to Start CAD</td>
                                      <td className="p-4 text-right">
                                        <button
                                          onClick={() => handlePayStage({ id: 1, stage_name: 'Stage 1: Booking Confirmation', amount: totalVal * 0.1, percentage: 10 }, order?.id)}
                                          className="btn-gold-luxury px-4 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider shadow-md cursor-pointer"
                                        >
                                          Pay Stage 1
                                        </button>
                                      </td>
                                    </tr>
                                    <tr className="hover:bg-[#FFFDF9] transition-colors">
                                      <td className="p-4 font-bold text-[#0B1330]">Stage 2: Design Approval Milestone</td>
                                      <td className="p-4 font-mono font-medium text-[#0B1330]">30.00%</td>
                                      <td className="p-4 font-serif text-sm font-bold text-[#B88732]">
                                        {formatINR(totalVal * 0.3)}
                                        {req.is_file_edit && (req.agreed_price_usd || req.quoted_price_usd) && (
                                          <span className="text-[11px] font-mono font-normal text-[#5A6679] block">
                                            (${((totalVal * 0.3) / 86.85).toFixed(2)} USD)
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-4 text-xs text-[#5A6679]">Due on Client 3D Preview Approval</td>
                                      <td className="p-4 text-right">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-300 text-[10px] font-mono">
                                          <Lock className="w-3 h-3" />
                                          LOCKED
                                        </span>
                                      </td>
                                    </tr>
                                    <tr className="hover:bg-[#FFFDF9] transition-colors">
                                      <td className="p-4 font-bold text-[#0B1330]">Stage 3: Final CAD Delivery</td>
                                      <td className="p-4 font-mono font-medium text-[#0B1330]">60.00%</td>
                                      <td className="p-4 font-serif text-sm font-bold text-[#B88732]">
                                        {formatINR(totalVal * 0.6)}
                                        {req.is_file_edit && (req.agreed_price_usd || req.quoted_price_usd) && (
                                          <span className="text-[11px] font-mono font-normal text-[#5A6679] block">
                                            (${((totalVal * 0.6) / 86.85).toFixed(2)} USD)
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-4 text-xs text-[#5A6679]">Due Before Final File Release</td>
                                      <td className="p-4 text-right">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-300 text-[10px] font-mono">
                                          <Lock className="w-3 h-3" />
                                          LOCKED
                                        </span>
                                      </td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                              {isOrderConfirmed && totalVal > 0 && (
                                <tfoot className="bg-[#FCFAF7] border-t border-[#E8D7B7]">
                                  <tr>
                                    <td colSpan={2} className="p-4 font-serif font-bold text-[#0B1330] text-xs">
                                      Total Order Summary:
                                    </td>
                                    <td className="p-4 font-serif font-bold text-[#B88732] text-sm">
                                      {formatINR(totalVal)}
                                      {req.is_file_edit && (req.agreed_price_usd || req.quoted_price_usd) && (
                                        <span className="text-[11px] font-mono font-normal text-[#5A6679] block">
                                          (${Number(req.agreed_price_usd || req.quoted_price_usd).toFixed(2)} USD)
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-4 text-xs font-mono text-[#5A6679]">
                                      Paid: <strong className="text-emerald-600">{formatINR(paidVal)}</strong> | Remaining: <strong className="text-[#B88732]">{formatINR(unpaidVal)}</strong>
                                    </td>
                                    <td className="p-4 text-right">
                                      {isFullyPaid ? (
                                        <span className="text-xs font-mono font-bold text-emerald-600 flex items-center justify-end gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Fully Settled
                                        </span>
                                      ) : unpaidVal > 0 ? (
                                        <button
                                          onClick={() => handlePayFullOrder(order || { id: req.id, is_file_edit: req.is_file_edit }, unpaidVal)}
                                          className="btn-gold-luxury px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider cursor-pointer shadow transition-all"
                                        >
                                          Pay Full Balance ({formatINR(unpaidVal)})
                                        </button>
                                      ) : null}
                                    </td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>
                        </div>
                        </div>
                      </div>
                      )}

                      {/* NODE 4: DESIGN PREVIEW & APPROVAL */}
                      {(activeStageTab === 'all' || activeStageTab === 'preview') && (
                      <div className="relative group">
                        <div className={`hidden sm:flex absolute -left-[47px] top-0 w-6 h-6 rounded-full border-4 border-[#FAF8F5] items-center justify-center ${
                          order?.preview_image || order?.milestones?.some((m: any) => m.stage.includes('Approved'))
                            ? 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]'
                            : 'bg-white border-2 border-[#E8D7B7] text-[#5A6679]'
                        }`}>
                          <Eye className="w-3.5 h-3.5" />
                        </div>

                        {/* MOBILE ACCORDION HEADER (4. 3D PREVIEW) */}
                        <button
                          type="button"
                          onClick={() => setMobileAccordionStage(currentActiveStage === 'preview' ? null : 'preview')}
                          className="sm:hidden w-full p-3.5 rounded-2xl bg-white border border-[#E8D7B7] shadow-xs flex items-center justify-between gap-3 text-left transition-all cursor-pointer mb-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              currentActiveStage === 'preview' ? 'bg-[#0B1330] text-[#F5E7A3]' : 'bg-[#FFF9EE] text-[#B88732] border border-[#E8D7B7]'
                            }`}>
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-serif font-bold text-xs text-[#0B1330] block truncate">
                                4. In-Progress 3D CAD Preview Review
                              </span>
                              <span className="text-[10px] font-mono text-[#5A6679]">
                                {order?.preview_image ? (order?.status === 'preview_ready' ? 'QC Verified & Ready' : order?.status === 'revision_requested' ? `Revision v${order.current_version || 1} Active` : 'Under QC Review') : assignedStaff ? 'Active 3D Sculpting in Rhino' : 'Awaiting Assignment'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                              order?.milestones?.some((m: any) => m.stage.includes('Approved'))
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                : order?.preview_image
                                ? 'bg-blue-50 text-blue-700 border border-blue-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}>
                              {order?.milestones?.some((m: any) => m.stage.includes('Approved')) ? 'Approved' : order?.preview_image ? 'Ready' : 'In Progress'}
                            </span>
                            {currentActiveStage === 'preview' ? (
                              <ChevronUp className="w-4 h-4 text-[#B88732]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#5A6679]" />
                            )}
                          </div>
                        </button>

                        {/* NODE 4 CONTENT WRAPPER */}
                        <div className={activeStageTab === 'all' && currentActiveStage !== 'preview' ? 'hidden sm:block' : 'block'}>
                        <div className="space-y-4">
                          <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h3 className="font-serif text-xl font-bold text-[#0B1330]">
                              4. In-Progress 3D CAD Preview Review
                            </h3>
                            {order?.milestones?.some((m: any) => m.stage.includes('Approved')) && (
                              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                3D PREVIEW APPROVED BY YOU
                              </span>
                            )}
                          </div>

                          {order?.preview_image ? (
                            <div className="rounded-3xl bg-white border border-[#E8D7B7] p-6 space-y-5 shadow-[0_12px_35px_rgba(184,135,50,0.06)]">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-serif font-bold text-[#0B1330] block">
                                      Protected 360° Raytraced Master Preview
                                    </span>
                                    {order?.status === 'revision_requested' ? (
                                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
                                        <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-600" />
                                        Revision v{order.current_version || 1} In Progress
                                      </span>
                                    ) : order?.status === 'preview_ready' || order?.quality_approved ? (
                                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold">
                                        QC Verified &amp; Ready
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-mono font-bold">
                                        QC Inspection Underway
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-[#5A6679]">
                                    Inspect proportion, prong layout &amp; stone seats before approving for final file generation.
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setLightboxZoom(1);
                                      setPreviewLightboxOrder(order);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-white hover:bg-[#FCFAF7] text-[#0B1330] border border-[#E8D7B7] hover:border-[#D4AF37] text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5 text-[#B88732]" />
                                    <span>Open Full Screen</span>
                                  </button>
                                  <span className="px-2.5 py-1 rounded-xl bg-[#FCFAF7] text-[#B88732] border border-[#E8D7B7] text-[10px] font-mono font-bold">
                                    PROTECTED PREVIEW
                                  </span>
                                </div>
                              </div>

                              {/* Active Revision Requested Alert Banner */}
                              {order?.status === 'revision_requested' && (
                                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 flex items-start gap-3.5 text-amber-900 text-xs shadow-sm">
                                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <RefreshCw className="w-4 h-4 text-amber-700 animate-spin" />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="font-bold text-amber-900 font-serif flex items-center gap-2">
                                      <span>Changes Requested — Studio Reviewing</span>
                                      <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300 text-[10px] font-mono">
                                        Iterating deliverable v{order.current_version || 1}
                                      </span>
                                    </div>
                                    <p className="text-amber-800 leading-relaxed text-[11px]">
                                      Our CAD artisans are actively applying your requested revisions. Once the updated tolerances pass our internal Quality Control, your refreshed 3D preview will be available here automatically.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* CLEAN, ELEGANT PROPORTIONED CAD PREVIEW CONTAINER (NO CROPPING) */}
                              <div
                                onClick={() => {
                                  setLightboxZoom(1);
                                  setPreviewLightboxOrder(order);
                                }}
                                onContextMenu={(e) => e.preventDefault()}
                                onDragStart={(e) => e.preventDefault()}
                                className="relative w-full h-[340px] sm:h-[420px] rounded-2xl overflow-hidden border-2 border-[#E8D7B7] bg-gradient-to-b from-[#070D22] via-[#040816] to-[#02050e] select-none group cursor-pointer shadow-xl flex items-center justify-center transition-all hover:border-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]"
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
                                  <div className="px-6 py-3 rounded-2xl bg-[#0B1330]/95 border-2 border-[#D4AF37] text-[#F5E7A3] text-sm font-bold font-serif flex items-center gap-2.5 shadow-2xl transform group-hover:scale-105 transition-transform">
                                    <Maximize2 className="w-4 h-4 text-[#D4AF37]" />
                                    <span>Click to Open Full Screen View</span>
                                  </div>
                                </div>

                                {/* Corner Badges */}
                                <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/75 backdrop-blur border border-white/15 text-[10px] font-mono text-slate-300 pointer-events-none flex items-center gap-1.5">
                                  <span>🔍</span>
                                  <span>360° Inspection Render</span>
                                </div>

                                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/85 backdrop-blur border border-[#E8D7B7] text-[10px] font-mono text-[#F5E7A3] pointer-events-none">
                                  🔒 Protected Atelier Render &bull; Click anywhere to enlarge
                                </div>

                                <div className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-xl bg-[#0B1330]/90 backdrop-blur border border-[#D4AF37]/60 text-[11px] font-mono font-bold text-[#F5E7A3] flex items-center gap-1.5 shadow-lg group-hover:bg-[#111C44] transition-colors">
                                  <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  <span>Click to Open Full</span>
                                </div>
                              </div>

                              {/* ACTIONS FOR PREVIEW */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <div className="text-xs text-[#5A6679]">
                                  Satisfied with this 3D preview? Approve below to unlock the final delivery payment stage.
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setPreviewLightboxOrder(order)}
                                    className="px-4 py-2.5 rounded-xl bg-[#FCFAF7] hover:bg-white border border-[#E8D7B7] text-[#0B1330] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm hover:border-[#D4AF37]"
                                  >
                                    <Eye className="w-4 h-4 text-[#B88732]" />
                                    <span>Inspect 3D Preview</span>
                                  </button>

                                  <button
                                    onClick={() => setRevisionModalOrder(order)}
                                    className="px-4 py-2.5 rounded-xl bg-white border border-[#E8D7B7] text-[#0B1330] hover:bg-[#FCFAF7] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:border-[#D4AF37]"
                                  >
                                    <MessageSquare className="w-4 h-4 text-[#B88732]" />
                                    <span>Comment / Request Changes</span>
                                  </button>

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

                              {/* REVISION HISTORY LOG */}
                              {order?.revision_requests && order.revision_requests.length > 0 && (
                                <div className="mt-4 p-5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-3">
                                  <div className="flex items-center justify-between text-xs font-semibold text-[#0B1330]">
                                    <span className="flex items-center gap-2">
                                      <Clock className="w-3.5 h-3.5 text-[#B88732]" />
                                      Revision Feedback History ({order.revision_requests.length})
                                    </span>
                                    <span className="text-[10px] font-mono text-[#5A6679]">
                                      Current deliverable v{order.current_version || 1}
                                    </span>
                                  </div>
                                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                                    {order.revision_requests.map((rev: any, idx: number) => (
                                      <div key={rev.id || idx} className="p-3.5 rounded-xl bg-white border border-[#E8D7B7] text-xs space-y-2 shadow-sm">
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="font-bold text-[#0B1330]">
                                            Revision #{rev.revision_number} &bull; deliverable v{rev.deliverable_version}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                                            rev.status === 'addressed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                                            rev.status === 'in_progress' ? 'bg-blue-50 text-blue-800 border border-blue-300' :
                                            'bg-amber-50 text-amber-800 border border-amber-300'
                                          }`}>
                                            {rev.status === 'addressed' ? 'Resolved in new preview' : rev.status === 'in_progress' ? 'Sculpting in CAD' : 'Under Review'}
                                          </span>
                                        </div>
                                        <p className="text-[#5A6679] text-[11px] leading-relaxed italic">
                                          "{rev.comment}"
                                        </p>
                                        {(rev.voice_note || rev.reference_image) && (
                                          <div className="flex flex-wrap items-center gap-3 pt-1">
                                            {rev.voice_note && (
                                              <div className="flex items-center gap-1.5 text-[10px] text-[#B88732]">
                                                <Volume2 className="w-3.5 h-3.5 text-[#B88732]" />
                                                <audio controls src={rev.voice_note} className="h-6 w-44" />
                                              </div>
                                            )}
                                            {rev.reference_image && (
                                              <a
                                                href={rev.reference_image}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1 text-[10px] text-[#B88732] hover:underline"
                                              >
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                <span>View Attached Reference</span>
                                              </a>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-6 rounded-3xl bg-white border border-[#E8D7B7] text-xs text-[#5A6679] space-y-1.5 shadow-[0_10px_30px_rgba(184,135,50,0.05)]">
                              <span className="font-serif font-bold text-[#0B1330] text-sm block">
                                {assignedStaff
                                  ? 'Our Master CAD team is actively sculpting your CAD model in Rhino 8.'
                                  : 'Matching senior CAD team...'}
                              </span>
                              <p className="leading-relaxed">
                                360° raytraced previews and dimensional inspection views will unlock here as soon as our Quality Control team verifies the tolerances.
                              </p>
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                      )}

                      {/* NODE 5: DELIVERABLES & FINAL SOURCE FILES */}
                      {(activeStageTab === 'all' || activeStageTab === 'deliverables') && (
                      <div className="relative group">
                        <div className={`hidden sm:flex absolute -left-[47px] top-0 w-6 h-6 rounded-full border-4 border-[#FAF8F5] items-center justify-center ${
                          isFullyPaid && (order?.download_enabled_by_admin || order?.can_download)
                            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] text-white'
                            : 'bg-white border-2 border-[#E8D7B7] text-[#5A6679]'
                        }`}>
                          <Download className="w-3.5 h-3.5" />
                        </div>

                        {/* MOBILE ACCORDION HEADER (5. DELIVERABLES) */}
                        <button
                          type="button"
                          onClick={() => setMobileAccordionStage(currentActiveStage === 'deliverables' ? null : 'deliverables')}
                          className="sm:hidden w-full p-3.5 rounded-2xl bg-white border border-[#E8D7B7] shadow-xs flex items-center justify-between gap-3 text-left transition-all cursor-pointer mb-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              currentActiveStage === 'deliverables' ? 'bg-[#0B1330] text-[#F5E7A3]' : 'bg-[#FFF9EE] text-[#B88732] border border-[#E8D7B7]'
                            }`}>
                              <Download className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-serif font-bold text-xs text-[#0B1330] block truncate">
                                5. Final Watertight Deliverables
                              </span>
                              <span className="text-[10px] font-mono text-[#5A6679]">
                                {req.is_file_edit && (req.status === 'completed' || req.download_url)
                                  ? 'Modification Completed & Ready'
                                  : isFullyPaid && (order?.download_enabled_by_admin || order?.can_download)
                                  ? 'Authorized & Ready for Download'
                                  : isFullyPaid
                                  ? '100% Paid • Awaiting Admin Toggle'
                                  : 'Locked Until Milestone Payments Complete'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                              (req.is_file_edit && (req.status === 'completed' || req.download_url)) || (isFullyPaid && (order?.download_enabled_by_admin || order?.can_download))
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}>
                              {(req.is_file_edit && (req.status === 'completed' || req.download_url)) || (isFullyPaid && (order?.download_enabled_by_admin || order?.can_download)) ? 'Unlocked' : 'Locked'}
                            </span>
                            {currentActiveStage === 'deliverables' ? (
                              <ChevronUp className="w-4 h-4 text-[#B88732]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#5A6679]" />
                            )}
                          </div>
                        </button>

                        {/* NODE 5 CONTENT WRAPPER */}
                        <div className={activeStageTab === 'all' && currentActiveStage !== 'deliverables' ? 'hidden sm:block' : 'block'}>
                        <div className="space-y-3">
                          <h3 className="hidden sm:block font-serif text-xl font-bold text-[#0B1330]">
                            5. Final Watertight Deliverables (.3DM, .STL &amp; Master Production Pack)
                          </h3>

                          {req.is_file_edit && (req.status === 'completed' || req.download_url) ? (
                            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#09261A] via-[#0E3827] to-[#09261A] border-2 border-emerald-500/80 space-y-4 shadow-xl text-white">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-[#0B1330] text-[10px] font-mono font-bold uppercase tracking-wider">
                                      MODIFIED CAD DELIVERABLE
                                    </span>
                                    <span className="text-emerald-300 text-xs font-mono font-bold">Ready</span>
                                  </div>
                                  <h4 className="font-serif text-lg font-bold text-white mt-1">
                                    {req.original_file_name || `CAD Modification #${req.id}`}
                                  </h4>
                                  <p className="text-xs text-emerald-200/90 max-w-xl">
                                    Your CAD file modification has been finalized and validated watertight by our Senior Engineers.
                                  </p>
                                </div>

                                {req.download_url && (
                                  <a
                                    href={req.download_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    className="btn-gold-luxury px-6 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-widest inline-flex items-center gap-2 shadow-xl shrink-0 cursor-pointer"
                                  >
                                    <Download className="w-4 h-4 text-[#0B1330]" />
                                    <span>Download Modified CAD</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : order ? (
                            isFullyPaid && (order.download_enabled_by_admin || order.can_download) ? (
                              <div className="p-6 rounded-3xl bg-gradient-to-r from-[#09261A] via-[#0E3827] to-[#09261A] border-2 border-emerald-500/80 space-y-4 shadow-xl text-white">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-3 py-1 rounded-full bg-emerald-500 text-[#0B1330] text-[10px] font-mono font-bold uppercase tracking-wider">
                                        DOWNLOAD AUTHORIZED BY ADMIN
                                      </span>
                                      <span className="text-emerald-300 text-xs font-mono font-bold">100% Paid</span>
                                    </div>
                                    <h4 className="font-serif text-lg font-bold text-white mt-1">
                                      Your Watertight CAD Package is Ready for Download
                                    </h4>
                                    <p className="text-xs text-emerald-200/90 max-w-xl">
                                      Click below to receive a secure 6-digit verification code on your registered email. Once verified, a single-use download link will be dispatched directly to your inbox.
                                    </p>
                                  </div>

                                  <button
                                    onClick={() => handleRequestOrderDownload(
                                      order.id,
                                      req.is_file_edit
                                        ? (req.original_file_name ? `CAD Modification: ${req.original_file_name}` : `File Edit #${req.id}`)
                                        : (req.category_name || 'Bespoke CAD Package')
                                    )}
                                    className="btn-gold-luxury px-8 py-4 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shrink-0 cursor-pointer"
                                  >
                                    <Download className="w-4 h-4 text-[#0B1330]" />
                                    <span>Download CAD Package</span>
                                  </button>
                                </div>

                                {/* Packaged Deliverables Showcase */}
                                {order.deliverables && order.deliverables.length > 0 && (
                                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/40 space-y-2.5">
                                    <div className="text-[11px] font-mono text-emerald-300 font-bold flex items-center gap-1.5">
                                      <Package className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Packaged Production Deliverables Ready in this Order ({order.deliverables.length}):</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      {order.deliverables.map((del: any) => (
                                        <div key={del.id} className="p-3 rounded-xl bg-white/10 border border-emerald-500/30 flex items-center justify-between gap-2 shadow-inner">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="px-2 py-0.5 rounded bg-[#D4AF37] text-[#0B1330] text-[10px] font-mono font-bold uppercase">
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

                                <div className="text-[10px] font-mono text-emerald-200/80 border-t border-emerald-500/30 pt-2">
                                  🛡️ Single-Use Security Protocol: After entering OTP, download link will be sent to your email and this button will self-lock.
                                </div>
                              </div>
                            ) : isFullyPaid && !order.download_enabled_by_admin ? (
                              <div className="p-6 rounded-3xl bg-white border border-[#E8D7B7] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>100% Milestone Payments Complete</span>
                                  </div>
                                  <p className="text-[#5A6679] text-xs leading-relaxed max-w-xl">
                                    Your single-use download link has already been dispatched, or download authorization is currently awaiting Studio Admin toggle. If you need to re-download your files, please click below.
                                  </p>

                                  {/* Packaged Deliverables Preview */}
                                  {order.deliverables && order.deliverables.length > 0 && (
                                    <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-2 mt-2">
                                      <div className="text-[11px] font-mono text-[#B88732] font-bold flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5 text-[#B88732]" />
                                        <span>Master Deliverable Files Uploaded by Atelier Modeller ({order.deliverables.length}):</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {order.deliverables.map((del: any) => (
                                          <div key={del.id} className="px-3 py-1.5 rounded-xl bg-white border border-[#E8D7B7] flex items-center gap-2 text-xs font-mono text-[#0B1330] shadow-sm">
                                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                                              {del.file_type}
                                            </span>
                                            <span>{del.filename}</span>
                                            {del.file_size && <span className="text-emerald-600 text-[10px] font-bold">({del.file_size})</span>}
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
                                  className="px-5 py-2.5 rounded-xl bg-white border border-[#E8D7B7] hover:border-[#D4AF37] text-[#B88732] text-xs font-bold uppercase tracking-wider hover:bg-[#FCFAF7] transition-colors shrink-0 shadow-sm"
                                >
                                  Request Download Access
                                </a>
                              </div>
                            ) : (
                              <div className="p-5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] text-xs text-[#5A6679] flex items-center gap-2.5 shadow-sm">
                                <Lock className="w-4 h-4 text-[#B88732] shrink-0" />
                                <span>
                                  Final source deliverables (.3DM Native &amp; .STL Mesh) unlock automatically once all 3 payment milestone stages are 100% complete and authorized by Studio Administration.
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="p-5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] text-xs text-[#5A6679] flex items-center gap-2.5 shadow-sm">
                              <Lock className="w-4 h-4 text-[#B88732] shrink-0" />
                              <span>Deliverables unlock upon order confirmation and payment completion.</span>
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                      )}

                    </div>
                  );
                })()}

                    {/* Bottom Navigation within Workspace */}
                    <div className="pt-6 border-t border-[#E8D7B7] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleBackToGrid}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FCFAF7] border border-[#E8D7B7] hover:border-[#D4AF37] text-[#0B1330] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                      >
                        <ArrowLeft className="w-4 h-4 text-[#B88732]" />
                        <span>← Back to All Orders Grid</span>
                      </button>
                      <span className="text-xs font-mono text-[#5A6679]">
                        {order ? `ORDER #${order.id}` : `REQ #${req.id}`} • {req.category_name}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
          </div>
        )}

        {/* TAB 2: MY CAD VAULT / MY DOWNLOADS */}
        {activeTab === 'downloads' && (
          <div className="space-y-6">
            {loadingPurchases ? (
              <div className="py-20 text-center rounded-3xl bg-white border border-[#E8D7B7] flex flex-col items-center justify-center gap-3 shadow-[0_10px_35px_rgba(184,135,50,0.06)]">
                <Loader2 className="w-8 h-8 text-[#B88732] animate-spin" />
                <span className="text-sm font-serif font-bold text-[#0B1330]">Loading Purchases &amp; Vault...</span>
              </div>
            ) : purchases.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-white border-2 border-dashed border-[#E8D7B7] space-y-4 shadow-[0_10px_35px_rgba(184,135,50,0.06)]">
                <ShieldCheck className="w-12 h-12 text-[#B88732] mx-auto" />
                <h4 className="font-serif text-xl font-bold text-[#0B1330]">No Ready-Made CAD Purchases Yet</h4>
                <p className="text-xs text-[#5A6679] max-w-md mx-auto leading-relaxed">
                  Browse our ready-made jewellery CAD collections to purchase high-precision 3DM &amp; STL master models.
                </p>
                <button
                  onClick={() => onNavigate('collections')}
                  className="btn-gold-luxury px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-md"
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
                    <div key={p.id} className="p-6 rounded-3xl bg-white border border-[#E8D7B7] hover:border-[#D4AF37] space-y-5 shadow-[0_10px_35px_rgba(184,135,50,0.06)] hover:shadow-[0_12px_35px_rgba(212,175,55,0.15)] relative overflow-hidden transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-[#B88732] font-bold">PURCHASE #{p.id}</span>
                            {p.status === 'pending' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 animate-pulse text-amber-600" />
                                Awaiting Admin Verification
                              </span>
                            ) : p.status === 'declined' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                                <XCircle className="w-2.5 h-2.5 text-rose-600" />
                                Payment Proof Declined
                              </span>
                            ) : p.status === 'paid' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                Payment Verified &amp; Enabled
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                                {p.status}
                              </span>
                            )}
                          </div>
                          <h4 className="font-serif text-lg font-bold text-[#0B1330]">{p.product_title}</h4>
                          <span className="text-xs text-[#B88732] font-semibold">{p.license_type_display}</span>
                        </div>
                        <span className="font-serif text-xl font-bold text-[#B88732]">
                          {formatINR(p.price_paid)}
                        </span>
                      </div>

                      {p.payment_method && (
                        <div className="p-2.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] text-[11px] font-mono flex items-center justify-between text-[#5A6679]">
                          <span>Method: <strong className="text-[#0B1330] uppercase">{p.payment_method === 'cash_check' ? 'Cash / Check' : 'UPI / QR'}</strong></span>
                          {p.created_at && <span>{new Date(p.created_at).toLocaleDateString()}</span>}
                        </div>
                      )}

                      {p.status === 'declined' ? (
                        <>
                          {/* Step Indicator Bar for Declined Payment */}
                          <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-2">
                            <div className="text-[11px] font-mono text-[#5A6679] flex justify-between">
                              <span>Verification Trail</span>
                              <span className="text-rose-700 font-bold">
                                Proof Declined by Accounts
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                              <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>1. Proof Sent</span>
                              </div>
                              <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 font-semibold flex items-center justify-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>2. Declined</span>
                              </div>
                              <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center gap-1 font-semibold">
                                <Lock className="w-3 h-3" />
                                <span>3. Download Locked</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                            <div className="flex items-center gap-1.5 font-bold text-rose-800">
                              <XCircle className="w-4 h-4 text-rose-600" />
                              <span>Payment Proof Not Verified</span>
                            </div>
                            <p className="text-[11px] text-[#5A6679] leading-relaxed">
                              Our Atelier accounts desk could not confirm this transaction in the bank ledger.
                            </p>
                            {p.decline_reason && (
                              <div className="p-2.5 rounded-xl bg-white border border-rose-200 text-[11px]">
                                <span className="text-[10px] uppercase font-bold text-rose-700 font-mono block">Reason from Accounts:</span>
                                <span className="text-slate-800 font-medium">{p.decline_reason}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[#E8D7B7]">
                            <button
                              type="button"
                              onClick={() => openResubmitModal(p)}
                              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-[#D4AF37] hover:from-amber-500 hover:to-[#E5C158] text-[#0B1330] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span>Re-submit Corrected Payment Proof</span>
                            </button>
                          </div>
                        </>
                      ) : p.status === 'pending' ? (
                        <>
                          {/* Step Indicator Bar for Pending Payment */}
                          <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-2">
                            <div className="text-[11px] font-mono text-[#5A6679] flex justify-between">
                              <span>Verification Trail</span>
                              <span className="text-amber-700 font-bold">
                                Awaiting Atelier Approval
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                              <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>1. Proof Sent</span>
                              </div>
                              <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 font-semibold flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3 animate-spin text-amber-600" />
                                <span>2. Verifying</span>
                              </div>
                              <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center gap-1 font-semibold">
                                <Lock className="w-3 h-3" />
                                <span>3. Download</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-800">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>Atelier Payment Verification in Progress</span>
                            </div>
                            <p className="text-[11px] text-[#5A6679] leading-relaxed">
                              Your payment receipt and verification details have been received by Studio Administration. Once verified, download access will be unlocked immediately.
                            </p>
                          </div>

                          <div className="pt-2 border-t border-[#E8D7B7]">
                            <button
                              disabled
                              className="w-full py-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                              <Lock className="w-4 h-4 text-slate-400" />
                              <span>Download Locked — Awaiting Admin Approval</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Step Indicator Bar: Paid -> Verified -> Downloaded */}
                          <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-2">
                            <div className="text-[11px] font-mono text-[#5A6679] flex justify-between">
                              <span>Delivery Trail</span>
                              <span className="text-emerald-700 font-bold">
                                {p.is_downloaded ? 'Downloaded' : p.is_otp_verified ? 'OTP Verified' : 'Download Enabled'}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                              <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>1. Approved</span>
                              </div>
                              <div className={`p-1.5 rounded-lg border flex items-center justify-center gap-1 font-semibold ${
                                p.is_otp_verified || p.is_downloaded
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : 'bg-amber-50 border-amber-300 text-amber-800'
                              }`}>
                                <ShieldCheck className="w-3 h-3" />
                                <span>2. Verified</span>
                              </div>
                              <div className={`p-1.5 rounded-lg border flex items-center justify-center gap-1 font-semibold ${
                                p.is_downloaded
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : 'bg-slate-100 border-slate-300 text-slate-400'
                              }`}>
                                <Download className="w-3 h-3" />
                                <span>3. Downloaded</span>
                              </div>
                            </div>

                            {p.downloaded_at && (
                              <div className="text-[10px] text-slate-500 font-mono text-right pt-1">
                                Downloaded on {new Date(p.downloaded_at).toLocaleDateString()} at {new Date(p.downloaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>

                          {/* Re-Delivery / Download Action Section */}
                          <div className="pt-2 border-t border-[#E8D7B7] space-y-2">
                            <button
                              onClick={() => handleRequestRedelivery(p.id, p.product_title)}
                              disabled={isCapReached || resendingPurchaseId === p.id}
                              className="btn-gold-luxury w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                            >
                              <Send className={`w-4 h-4 text-[#0B1330] ${resendingPurchaseId === p.id ? 'animate-spin' : ''}`} />
                              <span>
                                {resendingPurchaseId === p.id
                                  ? 'Sending Secure OTP...'
                                  : !p.is_otp_verified && !p.is_downloaded
                                  ? 'Verify Email & Download CAD'
                                  : 'Resend Secure Download Link'}
                              </span>
                            </button>

                            <div className="text-[11px] text-[#5A6679] text-center font-mono">
                              {isCapReached ? (
                                <span className="text-rose-700 font-bold block bg-rose-50 p-2 rounded-lg border border-rose-300">
                                  Maximum limit of 3 download re-deliveries reached for this purchase. Need help? Contact Support.
                                </span>
                              ) : (
                                <span>
                                  Re-delivery used: <strong className="text-[#B88732]">{p.redelivery_count}</strong> of 3 max allowed.
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      )}
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
              <div className="py-20 text-center rounded-3xl bg-white border border-[#E8D7B7] flex flex-col items-center justify-center gap-3 shadow-[0_10px_35px_rgba(184,135,50,0.06)]">
                <Loader2 className="w-8 h-8 text-[#B88732] animate-spin" />
                <span className="text-sm font-serif font-bold text-[#0B1330]">Loading Orders...</span>
              </div>
            ) : clientOrders.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-white border-2 border-dashed border-[#E8D7B7] space-y-4 shadow-[0_10px_35px_rgba(184,135,50,0.06)]">
                <ShoppingBag className="w-12 h-12 text-[#B88732] mx-auto" />
                <h4 className="font-serif text-xl font-bold text-[#0B1330]">No Orders Placed Yet</h4>
                <p className="text-xs text-[#5A6679] max-w-md mx-auto leading-relaxed">
                  You currently have no active or completed orders. Commission a custom CAD piece or browse our ready-to-cast collections.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => onNavigate('custom-design')}
                    className="btn-gold-luxury px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-4 h-4 text-[#0B1330]" />
                    <span>Start Custom Brief</span>
                  </button>
                  <button
                    onClick={() => onNavigate('collections')}
                    className="px-6 py-2.5 rounded-xl border border-[#E8D7B7] text-[#0B1330] hover:border-[#D4AF37] hover:bg-[#FCFAF7] text-xs font-bold uppercase transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#B88732]" />
                    <span>Browse Collections</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-3xl bg-white border border-[#E8D7B7] shadow-[0_12px_35px_rgba(184,135,50,0.06)]">
                <table className="w-full text-left text-xs text-[#5A6679] min-w-[620px]">
                  <thead className="bg-[#FCFAF7] text-[#0B1330] font-serif border-b border-[#E8D7B7] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4 font-bold">Order ID</th>
                      <th className="p-4 font-bold">Order Type</th>
                      <th className="p-4 font-bold">Created Date</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Total Amount</th>
                      <th className="p-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D7B7]/40">
                    {clientOrders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-[#FFFDF9] transition-colors">
                        <td className="p-4 font-mono font-bold text-[#B88732]">
                          ORD #{ord.id}
                        </td>
                        <td className="p-4 capitalize text-[#0B1330] font-medium">
                          {ord.order_type === 'file_edit' || ord.is_file_edit ? 'CAD File Modification' : ord.order_type === 'custom' ? 'Bespoke Custom CAD' : ord.order_type || 'CAD Model'}
                        </td>
                        <td className="p-4 font-mono">
                          {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent'}
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-[#FCFAF7] border border-[#E8D7B7] text-[#0B1330]">
                            {ord.status?.replace(/_/g, ' ') || 'In Progress'}
                          </span>
                        </td>
                        <td className="p-4 font-serif text-sm font-bold text-[#0B1330]">
                          {formatINR(ord.total_price)}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              let targetId = ord.id;
                              let targetKey = `cr-${ord.id}`;
                              if (ord.order_type === 'file_edit' || ord.is_file_edit || ord.file_edit_request) {
                                const feId = ord.file_edit_request?.id || ord.file_edit_request || (customRequests.find((r: any) => r.is_file_edit && (r.converted_order === ord.id || r.order?.id === ord.id))?.id);
                                if (feId) {
                                  targetId = feId;
                                  targetKey = `fe-${feId}`;
                                }
                              } else if (ord.custom_request?.id) {
                                targetId = ord.custom_request.id;
                                targetKey = `cr-${ord.custom_request.id}`;
                              } else if (ord.custom_request && typeof ord.custom_request === 'number') {
                                targetId = ord.custom_request;
                                targetKey = `cr-${ord.custom_request}`;
                              } else {
                                const matched = customRequests.find((r: any) => r.order?.id === ord.id || String(r.id) === String(ord.custom_request));
                                if (matched) {
                                  targetId = matched.id;
                                  targetKey = matched.is_file_edit ? `fe-${matched.id}` : `cr-${matched.id}`;
                                }
                              }
                              setSelectedCustomReqId(targetId);
                              setSelectedReqKey(targetKey);
                              setOpenedOrderId(targetId);
                              updateUrlParams('custom', targetKey);
                              setActiveTab('custom');
                            }}
                            className="px-3 py-2 min-h-[44px] rounded-xl border border-[#E8D7B7] hover:border-[#D4AF37] text-[#0B1330] hover:bg-[#0B1330] hover:text-[#F5E7A3] text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#B88732]" />
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
              <div key={prod.id} className="p-5 rounded-3xl bg-white border border-[#E8D7B7] hover:border-[#D4AF37] hover:shadow-[0_12px_35px_rgba(212,175,55,0.14)] space-y-3.5 flex flex-col justify-between shadow-[0_10px_35px_rgba(184,135,50,0.06)] transition-all">
                <div className="space-y-2.5">
                  <div className="w-full aspect-square rounded-2xl p-3 bg-[#FCFAF7] border border-[#E8D7B7]/60 flex items-center justify-center">
                    <img src={prod.primaryImage} alt={prod.title} className="max-w-full max-h-full object-contain filter drop-shadow-md" />
                  </div>
                  <h4 className="font-serif font-bold text-[#0B1330] text-sm leading-snug">{prod.title}</h4>
                  <div className="font-serif text-lg text-[#B88732] font-bold">
                    ${Number(prod.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <button onClick={() => onAddToCart(prod, 'standard')} className="btn-gold-luxury w-full py-2.5 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-1.5 shadow-md cursor-pointer">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#0B1330]" />
                  <span>Add to Bag</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: MY PROFILE & SECURITY */}
        {activeTab === 'profile' && <UserProfileModule />}

        {/* TAB 6: PREPAID WALLET & CORPORATE CREDIT LINE */}
        {activeTab === 'wallet_credits' && (
          <ClientWalletCreditTab onNavigateCustom={() => handleTabChange('custom')} />
        )}

      </div>

      {/* SKETCH PREVIEW LIGHTBOX MODAL */}
      {selectedSketchUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedSketchUrl(null)}>
          <div className="relative max-w-3xl w-full bg-white border border-[#E8D7B7] rounded-3xl p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E8D7B7]/60 pb-3">
              <span className="font-serif font-bold text-lg text-[#0B1330]">Reference Sketch Preview</span>
              <button onClick={() => setSelectedSketchUrl(null)} className="p-2 text-slate-400 hover:text-[#0B1330] hover:bg-[#FAF8F5] rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={selectedSketchUrl} alt="Enlarged" className="max-h-[70vh] w-auto mx-auto object-contain rounded-2xl bg-[#FCFAF7] p-2 border border-[#E8D7B7]/50" />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8D7B7] pb-4 text-white gap-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-md bg-[#D4AF37] text-[#0B1330] font-mono font-bold text-xs uppercase">
                ORDER #{previewLightboxOrder.id} • 3D CAD INSPECTION
              </span>
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-white">
                  Protected 360° Master CAD Render
                </h2>
                <span className="text-xs text-slate-300">
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

              <div className="absolute bottom-3 left-3 px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-[#E8D7B7] text-[11px] font-mono text-[#F5E7A3] flex items-center gap-2 pointer-events-none">
                <span>🔒 Protected Atelier Render</span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-300">Confidential Studio Preview</span>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="border-t border-white/15 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
            <div className="text-xs text-slate-300">
              Use zoom buttons above to inspect micro-tolerances. Press <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">Esc</kbd> to exit.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const targetOrder = previewLightboxOrder;
                  setPreviewLightboxOrder(null);
                  setLightboxZoom(1);
                  setRevisionModalOrder(targetOrder);
                }}
                className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <MessageSquare className="w-4 h-4 text-[#F5E7A3]" />
                <span>Request Revision</span>
              </button>

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
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setSpecsModalRequest(null)}
        >
          <div 
            className="relative w-full max-w-4xl bg-white border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_25px_80px_rgba(0,0,0,0.5)] max-h-[92vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E8D7B7] gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-[#0B1330] text-[#F5E7A3] font-mono font-bold text-xs border border-[#D4AF37]/40 shadow-sm">
                    REQ #{specsModalRequest.id}
                  </span>
                  <span className="text-xs font-mono text-[#5A6679]">
                    Submitted on {new Date(specsModalRequest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {specsModalRequest.submission_intent === 'place_order' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                      Direct CAD Order
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-bold">
                      Free Quote Request
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#0B1330]">
                  Bespoke CAD Specification Sheet &amp; Artisan Brief
                </h3>
                <p className="text-xs text-[#5A6679]">
                  Complete technical configuration entered by client for 3D modeling and castability engineering.
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FCFAF7] hover:bg-white text-[#0B1330] border border-[#E8D7B7] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-[#B88732]" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSpecsModalRequest(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#0B1330] hover:bg-[#FCFAF7] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Client Identity Details */}
            <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-[#5A6679] uppercase block font-semibold">Client Name</span>
                <strong className="text-[#0B1330] text-sm">{specsModalRequest.contact_name || specsModalRequest.client_name || 'Client'}</strong>
              </div>
              {specsModalRequest.contact_email && (
                <div>
                  <span className="text-[10px] font-mono text-[#5A6679] uppercase block font-semibold">Email Address</span>
                  <strong className="text-[#0B1330]">{specsModalRequest.contact_email}</strong>
                </div>
              )}
              {specsModalRequest.contact_phone && (
                <div>
                  <span className="text-[10px] font-mono text-[#5A6679] uppercase block font-semibold">Contact Phone</span>
                  <strong className="text-[#0B1330]">{specsModalRequest.contact_phone}</strong>
                </div>
              )}
            </div>

            {/* Core Jewellery Parameters Grid */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#B88732] font-bold flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> Core Jewellery Architecture
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                  <span className="text-[10px] font-mono text-[#5A6679] uppercase">Category</span>
                  <p className="font-bold text-[#0B1330] capitalize">{specsModalRequest.category_name || 'Bespoke'}</p>
                </div>

                {/* Metal Alloy */}
                {(() => {
                  const selMetal = specsModalRequest.selections?.find((s: any) => s.group_key === 'metal' || s.group_label?.toLowerCase().includes('metal'));
                  const metalName = selMetal?.value_label || specsModalRequest.metal_alloy_name;
                  return metalName ? (
                    <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                      <span className="text-[10px] font-mono text-[#5A6679] uppercase">Metal Alloy</span>
                      <p className="font-bold text-[#0B1330]">{metalName}</p>
                    </div>
                  ) : null;
                })()}

                {/* Ring Sizing */}
                {specsModalRequest.ring_size && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#5A6679] uppercase">Ring Sizing</span>
                    <p className="font-bold text-[#0B1330]">
                      Size {specsModalRequest.ring_size} ({(specsModalRequest.ring_size_standard || '').toLowerCase() === 'in_hk' ? 'IN_HK' : (specsModalRequest.ring_size_standard?.toUpperCase() || 'IN_HK')})
                    </p>
                  </div>
                )}

                {/* Target Weight */}
                {specsModalRequest.target_weight_grams && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#5A6679] uppercase">Target Weight</span>
                    <p className="font-bold text-[#0B1330]">{specsModalRequest.target_weight_grams} grams</p>
                  </div>
                )}

                {/* Production Complexity Tier */}
                {specsModalRequest.budget_range && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#5A6679] uppercase">Complexity Tier</span>
                    <p className="font-bold text-[#B88732]">{specsModalRequest.budget_range}</p>
                  </div>
                )}

                {/* Target Completion Date */}
                {specsModalRequest.needed_by_date && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#5A6679] uppercase">Target Completion</span>
                    <p className="font-bold text-[#B88732]">
                      {new Date(specsModalRequest.needed_by_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}

                {/* Aesthetic Style */}
                {specsModalRequest.aesthetic_style_name && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#5A6679] uppercase">Design Style</span>
                    <p className="font-bold text-[#0B1330]">{specsModalRequest.aesthetic_style_name}</p>
                  </div>
                )}

                {/* Dimensions */}
                {(specsModalRequest.height_mm || specsModalRequest.width_mm) && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#5A6679] uppercase">Target Dimensions</span>
                    <p className="font-bold text-[#0B1330]">
                      {specsModalRequest.height_mm ? `H: ${specsModalRequest.height_mm}mm ` : ''}
                      {specsModalRequest.width_mm ? `W: ${specsModalRequest.width_mm}mm` : ''}
                    </p>
                  </div>
                )}

                {/* Chain / Backing / Bracelet */}
                {specsModalRequest.chain_length && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#5A6679] uppercase">Chain Preference</span>
                    <p className="font-bold text-[#0B1330]">{specsModalRequest.chain_length}</p>
                  </div>
                )}
                {specsModalRequest.earring_backing && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#5A6679] uppercase">Earring Backing</span>
                    <p className="font-bold text-[#0B1330]">{specsModalRequest.earring_backing}</p>
                  </div>
                )}
                {specsModalRequest.bracelet_style && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#5A6679] uppercase">Bracelet Style</span>
                    <p className="font-bold text-[#0B1330]">{specsModalRequest.bracelet_style}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Atelier Component Selections */}
            {specsModalRequest.selections && specsModalRequest.selections.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#B88732] font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> Atelier Component Selections
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {specsModalRequest.selections.map((sel: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] flex items-center justify-between shadow-sm">
                      <span className="text-[#5A6679] text-[11px]">{sel.group_label}:</span>
                      <div className="flex items-center gap-1.5 font-bold text-[#0B1330]">
                        {sel.swatch_color && (
                          <span className="w-3.5 h-3.5 rounded-full border border-[#E8D7B7] shrink-0 shadow-sm" style={{ backgroundColor: sel.swatch_color }} />
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
              <span className="text-xs font-mono uppercase tracking-wider text-[#B88732] font-bold flex items-center gap-1.5">
                <Gem className="w-4 h-4" /> Gemstones &amp; Diamond Setting Plan
              </span>
              {specsModalRequest.is_metal_only ? (
                <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] text-xs text-[#5A6679]">
                  Solid Metal Design &mdash; No diamond seats, prongs, or stone settings required.
                </div>
              ) : specsModalRequest.stones && specsModalRequest.stones.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-[#E8D7B7] bg-white shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FCFAF7] text-[10px] uppercase font-mono text-[#5A6679] border-b border-[#E8D7B7]">
                      <tr>
                        <th className="p-3 font-bold">Stone Type</th>
                        <th className="p-3 font-bold">Shape</th>
                        <th className="p-3 font-bold">Setting Style</th>
                        <th className="p-3 font-bold">Quantity</th>
                        <th className="p-3 font-bold">Size / Carat</th>
                        <th className="p-3 font-bold">Clarity / Color</th>
                        <th className="p-3 font-bold">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8D7B7]/40 font-mono">
                      {specsModalRequest.stones.map((st: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#FCFAF7]">
                          <td className="p-3 font-bold text-[#0B1330]">{st.stone_type}</td>
                          <td className="p-3 text-[#5A6679]">{st.shape || 'Standard'}</td>
                          <td className="p-3 text-[#5A6679]">{st.setting_style || 'Prong'}</td>
                          <td className="p-3 font-bold text-[#B88732]">{st.quantity || 1}x</td>
                          <td className="p-3 text-[#B88732]">{st.size_value ? `${st.size_value} ${st.size_unit || 'ct'}` : '--'}</td>
                          <td className="p-3 text-[#5A6679]">{[st.clarity, st.color].filter(Boolean).join(' • ') || 'Standard'}</td>
                          <td className="p-3">
                            {st.is_center_stone ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold uppercase">
                                Center Stone
                              </span>
                            ) : (
                              <span className="text-[#5A6679] text-[10px]">Accent / Pavé</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : specsModalRequest.gemstones && specsModalRequest.gemstones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {specsModalRequest.gemstones.map((gem: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] flex justify-between shadow-sm">
                      <span className="font-bold text-[#0B1330]">{gem.quantity}x {gem.stone_type} ({gem.cut_type})</span>
                      <span className="font-mono text-[#B88732] font-bold">{gem.carat_size || 'Spec'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] text-xs text-[#5A6679]">
                  {specsModalRequest.gemstone_preference_open ? 'Client selected: Let Designer Decide optimal stone layout' : 'Plain metal piece &mdash; No gemstone specifications declared.'}
                </div>
              )}
            </div>

            {/* Personalization, Engraving & Branding */}
            {(specsModalRequest.engraving_text || specsModalRequest.has_logo || specsModalRequest.client_consent_to_feature) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {specsModalRequest.engraving_text && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#B88732] uppercase font-bold">Laser Engraving</span>
                    <p className="font-serif italic text-[#B88732] text-sm">"{specsModalRequest.engraving_text}"</p>
                    <p className="text-[10px] text-[#5A6679] font-mono">Font: {specsModalRequest.engraving_font || 'Script'} • Placement: {specsModalRequest.engraving_placement || 'Inside Shank'}</p>
                  </div>
                )}
                {specsModalRequest.has_logo && (
                  <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                    <span className="text-[10px] font-mono text-[#B88732] uppercase font-bold">Brand Logo Hallmark</span>
                    <p className="text-emerald-700 font-bold">✓ Vector Hallmark Stamping Requested</p>
                  </div>
                )}
                <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-1 shadow-sm">
                  <span className="text-[10px] font-mono text-[#B88732] uppercase font-bold">Portfolio Showcase</span>
                  <p className={specsModalRequest.client_consent_to_feature ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                    {specsModalRequest.client_consent_to_feature ? '✓ Consent Granted for Portfolio' : 'Private Model — Do Not Feature'}
                  </p>
                </div>
              </div>
            )}

            {/* Artisan Brief & Special Notes */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase tracking-wider text-[#B88732] font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Client Design Brief &amp; Special Instructions
              </span>
              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] text-xs text-[#0B1330] leading-relaxed space-y-2 shadow-sm">
                <p>{specsModalRequest.description || 'Watertight 3D CAD design request.'}</p>
                {specsModalRequest.special_instructions && specsModalRequest.special_instructions !== specsModalRequest.description && (
                  <div className="pt-2 border-t border-[#E8D7B7] text-[#B88732] font-mono text-xs">
                    <strong>Special Instructions / Catalog Ref:</strong> {specsModalRequest.special_instructions}
                  </div>
                )}
              </div>
            </div>

            {/* Studio Catalog References */}
            {specsModalRequest.catalog_references && specsModalRequest.catalog_references.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#B88732] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#B88732]" /> Selected Studio Catalog References ({specsModalRequest.catalog_references.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {specsModalRequest.catalog_references.map((cRef: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      onClick={() => cRef.image && setSelectedSketchUrl(cRef.image)}
                      className="p-3.5 rounded-2xl bg-white border border-[#E8D7B7] hover:border-[#D4AF37] flex items-center gap-3 cursor-pointer transition-all hover:bg-[#FCFAF7] shadow-sm"
                    >
                      {cRef.image ? (
                        <img src={cRef.image} alt={cRef.title} className="w-12 h-12 rounded-xl object-cover border border-[#E8D7B7] shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] flex items-center justify-center text-[10px] text-[#5A6679] shrink-0 font-mono">CAD</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-[#B88732] block font-bold">{cRef.sku || `SKU-${cRef.id}`}</span>
                        <p className="text-xs font-semibold text-[#0B1330] truncate">{cRef.title}</p>
                        <span className="text-[10px] text-[#5A6679] block">Click to enlarge image</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sketches */}
            {specsModalRequest.sketches && specsModalRequest.sketches.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-[#B88732] font-bold">
                  Attached Reference Sketches ({specsModalRequest.sketches.length})
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {specsModalRequest.sketches.map((sk: any) => (
                    <img
                      key={sk.id}
                      src={sk.image_url || sk.image}
                      alt="Sketch"
                      onClick={() => setSelectedSketchUrl(sk.image_url || sk.image)}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E8D7B7] hover:border-[#D4AF37] cursor-pointer shadow-sm transition-all hover:scale-105"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Uploaded Reference Photo (e.g. from Quick Request or single file) */}
            {specsModalRequest.reference_image && (!specsModalRequest.sketches || !specsModalRequest.sketches.some((s: any) => (s.image_url || s.image) === specsModalRequest.reference_image)) && (
              <div className="space-y-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-[#B88732] font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#B88732]" /> Uploaded Reference / Inspiration Photo
                </span>
                <div className="flex gap-2">
                  <img
                    src={specsModalRequest.reference_image}
                    alt="Reference Photo"
                    onClick={() => setSelectedSketchUrl(specsModalRequest.reference_image)}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-[#E8D7B7] hover:border-[#D4AF37] cursor-pointer shadow-sm transition-all hover:scale-105"
                  />
                </div>
              </div>
            )}

            {/* Voice Note Requisition Player */}
            {(specsModalRequest.voice_recording_url || specsModalRequest.voice_recording) && (
              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7] space-y-2 shadow-sm">
                <span className="text-xs font-mono uppercase tracking-wider text-[#B88732] font-bold flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#B88732]" /> Voice Note Requisition Attached
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-white border border-[#E8D7B7] flex items-center justify-center shrink-0 text-[#B88732] shadow-sm">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <audio
                    controls
                    src={specsModalRequest.voice_recording_url || specsModalRequest.voice_recording}
                    className="w-full h-8 rounded-lg accent-[#D4AF37]"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E8D7B7] flex justify-end">
              <button
                type="button"
                onClick={() => setSpecsModalRequest(null)}
                className="btn-gold-luxury px-6 py-2.5 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all uppercase tracking-wider"
              >
                Close Specification Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal for Milestone Stages & Full Payment */}
      <PaymentGatewayModal
        isOpen={stagePaymentModalState.isOpen}
        onClose={() => setStagePaymentModalState((prev) => ({ ...prev, isOpen: false }))}
        title={stagePaymentModalState.title}
        subtitle={
          stagePaymentModalState.isFullPayment
            ? 'Complete 100% Full Order Settlement'
            : `Milestone ${stagePaymentModalState.percentage ? `${stagePaymentModalState.percentage}% ` : ''}Stage Settlement`
        }
        amount={stagePaymentModalState.amount}
        currency="INR"
        itemType={stagePaymentModalState.isFullPayment ? 'order_full_payment' : 'milestone_stage'}
        orderDetails={{
          id: stagePaymentModalState.isFullPayment ? stagePaymentModalState.orderId : stagePaymentModalState.stageId,
        }}
        onPaymentSuccess={handleStagePaymentSuccess}
      />

      {/* Revision Request Modal */}
      {revisionModalOrder && (
        <RevisionRequestModal
          order={revisionModalOrder}
          isOpen={Boolean(revisionModalOrder)}
          onClose={() => setRevisionModalOrder(null)}
          onSuccess={() => {
            fetchClientOrders();
            setRevisionToastMsg('Your revision request has been logged. Our CAD team and QC desk have been notified.');
            setTimeout(() => setRevisionToastMsg(null), 6000);
          }}
        />
      )}

      {/* Floating Revision Toast Notification */}
      {revisionToastMsg && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-md p-4 rounded-2xl bg-[#09112B] border-2 border-[#D9B66F] text-white shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-serif font-bold text-[#B88732]">Revision Feedback Dispatched</div>
            <div className="text-[11px] text-slate-300 leading-relaxed">{revisionToastMsg}</div>
          </div>
          <button
            onClick={() => setRevisionToastMsg(null)}
            className="p-1 text-slate-400 hover:text-[#17345C] ml-auto cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Re-submit Payment Proof Modal */}
      {resubmitModalPurchase && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setResubmitModalPurchase(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl border border-[#D4AF37]/50 shadow-2xl p-6 sm:p-7 space-y-5 animate-scale-in text-[#1E2230]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#0B1330]">Re-submit Payment Proof</h3>
                  <p className="text-xs text-[#5A6679]">Purchase #{resubmitModalPurchase.id} — {resubmitModalPurchase.product_title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResubmitModalPurchase(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Previous Decline Reason Display */}
            {resubmitModalPurchase.decline_reason && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Accounts Decline Reason:</span>
                </div>
                <p className="text-[11px] font-mono leading-relaxed pl-5">
                  {resubmitModalPurchase.decline_reason}
                </p>
              </div>
            )}

            <form onSubmit={handleConfirmResubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  12-Digit UPI Reference Number (UTR) / Transaction ID *
                </label>
                <input
                  type="text"
                  required
                  value={resubmitUtr}
                  onChange={(e) => setResubmitUtr(e.target.value)}
                  placeholder="e.g. 428719283749 or UPI Ref / Bank IMPS No."
                  className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={resubmitMethod}
                  onChange={(e) => setResubmitMethod(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#D4AF37] outline-none"
                >
                  <option value="upi">UPI / QR Code Transfer</option>
                  <option value="cash_check">Cash / Cheque Deposit</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Updated Payment Screenshot / Receipt (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setResubmitFile(f);
                    if (f) {
                      setResubmitFilePreview(URL.createObjectURL(f));
                    } else {
                      setResubmitFilePreview(null);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-[#E8D7B7] file:text-xs file:font-bold file:bg-[#FFF9F0] file:text-[#17345C] hover:file:bg-[#D4AF37]/20 cursor-pointer"
                />
                {resubmitFilePreview && (
                  <div className="mt-2 p-1.5 border border-slate-200 rounded-xl bg-slate-50 max-w-[200px]">
                    <img src={resubmitFilePreview} alt="Receipt preview" className="rounded-lg max-h-32 object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Additional Notes for Accounts Team (Optional)
                </label>
                <textarea
                  rows={2}
                  value={resubmitDetails}
                  onChange={(e) => setResubmitDetails(e.target.value)}
                  placeholder="e.g. Paid from HDFC account of Rajesh Shah..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#D4AF37] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResubmitModalPurchase(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResubmit}
                  className="btn-gold-luxury px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingResubmit ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-[#0B1330]" />
                  )}
                  <span>Re-submit for Verification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


