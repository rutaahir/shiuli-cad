import React, { useState, useEffect } from 'react';
import { SettlementRecord } from '../../types';
import { api } from '../../services/api';
import {
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ArrowDownLeft,
  Banknote,
  Smartphone,
  Building2,
  FileText,
  Printer,
  X,
  Plus,
  AlertCircle,
  HelpCircle,
  Eye,
  Wallet,
  ArrowRight,
  Receipt,
  Lock,
  Unlock,
  XCircle,
  Search,
  Filter,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
  UserCheck,
  PieChart,
  Users
} from 'lucide-react';

export interface OrderStageItem {
  id: number;
  order_index: number;
  step_number: number;
  label: string;
  percentage: number;
  amount: number;
  amount_disp: string;
  status: 'paid' | 'due' | 'locked' | string;
  paid_at?: string | null;
}

export interface OrderTransactionItem {
  id: string;
  payment_id: number;
  order_id?: number;
  order_number?: string;
  item_title?: string;
  client?: string;
  client_email?: string;
  amount: string;
  amount_raw: number;
  payment_type?: string;
  type: string;
  ref: string;
  payment_method?: string;
  payment_details?: string;
  screenshot?: string | null;
  status: string;
  raw_status?: string;
  decline_reason?: string;
  declined_at?: string | null;
  can_approve?: boolean;
  can_decline?: boolean;
  is_stage_payment?: boolean;
  stage_name?: string;
  stage_percentage?: number;
  stage_order_index?: number;
  is_order_fully_paid?: boolean;
  date: string;
  created_at_iso?: string;
}

interface GatewayLogRecord {
  id: string;
  entry_type?: 'order' | 'purchase' | 'file_edit' | string;
  purchase_id?: number;
  payment_id?: number;
  order_id?: number;
  order_number?: string;
  client: string;
  client_email?: string;
  buyer_email?: string;
  item_title?: string;
  amount: string;
  amount_raw: number;
  type: string;
  ref: string;
  status: string;
  raw_status?: string;
  can_approve?: boolean;
  can_decline?: boolean;
  decline_reason?: string;
  declined_at?: string | null;
  download_enabled_by_admin?: boolean;
  payment_method?: string;
  payment_details?: string;
  screenshot?: string | null;
  date: string;
  created_at_iso?: string;
  is_stage_payment?: boolean;
  stage_name?: string;
  stage_percentage?: number;
  stage_order_index?: number;
  paid_stages_count?: number;
  total_stages_count?: number;
  order_total_val?: number;
  order_total_amount?: string;
  order_paid_val?: number;
  order_paid_amount?: string;
  order_remaining_val?: number;
  order_remaining_amount?: string;
  is_order_fully_paid?: boolean;
  can_send_download?: boolean;
  has_pending_transactions?: boolean;
  pending_transactions_count?: number;
  assigned_staff_name?: string;
  assigned_staff_role?: string;
  assigned_staff_id?: number | null;
  staff_payout_val?: number;
  staff_payout_amount?: string;
  staff_payout_paid?: number;
  staff_payout_status?: string;
  admin_margin_val?: number;
  admin_margin_amount?: string;
  staff_percent?: number;
  admin_percent?: number;
  stages?: OrderStageItem[];
  transactions?: OrderTransactionItem[];
}

export const AdminPaymentsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settlements' | 'client-payments'>(() => {
    const params = new URLSearchParams(window.location.search);
    const sub = params.get('subtab');
    if (sub === 'settlements' || sub === 'staff') {
      return 'settlements';
    }
    return 'client-payments';
  });
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState<boolean>(true);
  const [clientPayments, setClientPayments] = useState<GatewayLogRecord[]>([]);
  const [loadingGatewayLogs, setLoadingGatewayLogs] = useState<boolean>(false);
  const [analyticsSummary, setAnalyticsSummary] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'purchases' | 'custom' | 'file-edits' | 'pending'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Payment Verification Approval & Lightbox State
  const [approvingPaymentId, setApprovingPaymentId] = useState<string | null>(null);
  const [togglingDownloadId, setTogglingDownloadId] = useState<number | null>(null);
  const [togglingOrderDownloadId, setTogglingOrderDownloadId] = useState<number | null>(null);
  const [lightboxScreenshotUrl, setLightboxScreenshotUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  // Expandable Master Order Cards State
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const toggleExpandOrder = (id: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Payment Decline State
  const [declineModalItem, setDeclineModalItem] = useState<any | null>(null);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState<string>('UTR / Reference not found in bank statement');
  const [customDeclineReason, setCustomDeclineReason] = useState<string>('');
  const [decliningPaymentId, setDecliningPaymentId] = useState<string | null>(null);

  // Settlement Payout Modal State
  const [settleModalItem, setSettleModalItem] = useState<SettlementRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleMethod, setSettleMethod] = useState<'bank_transfer' | 'cash' | 'upi' | 'online' | 'cheque'>('bank_transfer');
  const [settleTxnRef, setSettleTxnRef] = useState<string>('');
  const [settleDate, setSettleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  // Voucher / Receipt Slip Modal State
  const [viewSlipItem, setViewSlipItem] = useState<SettlementRecord | null>(null);

  // Client Manual Collection Modal State
  const [isClientPaymentModalOpen, setIsClientPaymentModalOpen] = useState(false);
  const [clientPayClientName, setClientPayClientName] = useState('');
  const [clientPayOrderRef, setClientPayOrderRef] = useState('');
  const [clientPayAmount, setClientPayAmount] = useState<number | ''>('');
  const [clientPayMethod, setClientPayMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque'>('cash');
  const [clientPayTxnRef, setClientPayTxnRef] = useState('');
  const [clientPayType, setClientPayType] = useState('Custom CAD Booking (10%)');
  const [clientPayNotes, setClientPayNotes] = useState('');
  const [isSubmittingClientPay, setIsSubmittingClientPay] = useState(false);

  const fetchSettlements = async () => {
    setLoadingSettlements(true);
    setError(null);
    try {
      await api.ensureAdminToken();
      const res = await api.request<any>('/settlements/');
      const ensureArray = (r: any) => {
        if (Array.isArray(r)) return r;
        if (r && Array.isArray(r.results)) return r.results;
        return [];
      };
      const list = ensureArray(res);
      const mapped: SettlementRecord[] = list.map((st: any) => {
        const totalAmt = parseFloat(st.amount || '0');
        const paidAmt = parseFloat(st.amount_paid || '0');
        const bal = typeof st.balance_due === 'number' ? st.balance_due : Math.max(0, totalAmt - paidAmt);
        
        let stat: 'unpaid' | 'partial' | 'settled' = 'unpaid';
        if (st.status === 'processed' || (paidAmt >= totalAmt && totalAmt > 0)) {
          stat = 'settled';
        } else if (st.status === 'partial' || paidAmt > 0) {
          stat = 'partial';
        }

        return {
          id: `SET-${st.id}`,
          staffId: st.staff?.id ? String(st.staff.id) : undefined,
          staffName: st.staff_name || (st.staff ? `${st.staff.first_name} ${st.staff.last_name}`.trim() || st.staff.username : 'CAD Designer'),
          staffRole: st.staff?.role || 'Senior CAD Specialist',
          orderNumber: st.order_number || (st.order ? `ORD-${st.order}` : `ORD-${st.id}`),
          orderId: st.order ? String(st.order) : undefined,
          designTitle: st.design_title || 'Bespoke Custom CAD Design',
          payoutAmount: totalAmt,
          amountPaid: paidAmt,
          balanceDue: bal,
          paymentMethod: st.payment_method || 'bank_transfer',
          transactionRef: st.transaction_ref || undefined,
          notes: st.notes || '',
          completedDate: st.created_at || 'Recent',
          completedAt: st.created_at || 'Recent',
          status: stat,
          settledAt: st.processed_at ? new Date(st.processed_at).toLocaleDateString() : undefined,
        };
      });
      setSettlements(mapped);
    } catch (e: any) {
      console.warn('Failed to fetch settlements from API:', e);
      setError(e?.message || 'Failed to fetch settlements.');
    } finally {
      setLoadingSettlements(false);
    }
  };

  const fetchGatewayLogs = async () => {
    setLoadingGatewayLogs(true);
    try {
      const logs = await api.getGatewayLogs();
      setClientPayments(logs);
    } catch (err: any) {
      console.warn('Failed to fetch incoming gateway logs:', err);
    } finally {
      setLoadingGatewayLogs(false);
    }
  };

  const handleApproveIncomingPayment = async (p: any) => {
    const buyerEmail = p.client_email || p.buyer_email || p.client || 'Client';
    const isStageOnly = Boolean(p.is_stage_payment && !p.is_order_fully_paid);

    const confirmMsg = isStageOnly
      ? `Confirm collection of ${p.amount} from ${p.client || 'Client'} for ${p.stage_name || p.type}?\n\n⚠️ NOTE: This is a MILESTONE PART PAYMENT. CAD file deliverables will remain securely LOCKED for the customer until 100% full payment across all milestone stages is completed.`
      : `Confirm collection of ${p.amount} from ${p.client || 'Client'}? This will mark payment as VERIFIED and authorize CAD download access once 100% full order balance is settled.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }
    setApprovingPaymentId(p.id);
    try {
      if (p.purchase_id) {
        await api.adminApprovePurchase(p.purchase_id);
      } else if (p.payment_id) {
        await api.adminApprovePayment(p.payment_id);
      }
      if (isStageOnly) {
        alert(`Success! Milestone stage payment of ${p.amount} verified for ${p.client || 'Client'}. CAD file download access remains safely locked until all remaining stages are paid in full.`);
      } else {
        alert(`Success! Payment ${p.id} confirmed as collected.`);
      }
      await fetchGatewayLogs();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve payment.');
    } finally {
      setApprovingPaymentId(null);
    }
  };

  const openDeclineModal = (p: any) => {
    setDeclineModalItem(p);
    setSelectedDeclineReason('UTR / Reference not found in bank statement');
    setCustomDeclineReason('');
  };

  const handleConfirmDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineModalItem) return;

    const finalReason = selectedDeclineReason === 'custom'
      ? customDeclineReason.trim()
      : selectedDeclineReason;

    if (!finalReason) {
      alert('Please enter or select a reason for declining this payment proof.');
      return;
    }

    setDecliningPaymentId(declineModalItem.id);
    try {
      if (declineModalItem.purchase_id) {
        await api.adminDeclinePurchase(declineModalItem.purchase_id, finalReason);
      } else if (declineModalItem.payment_id) {
        await api.adminDeclinePayment(declineModalItem.payment_id, finalReason);
      }
      alert(`Payment ${declineModalItem.id} has been declined. The client has been notified via email and in-app alert.`);
      setDeclineModalItem(null);
      await fetchGatewayLogs();
    } catch (err: any) {
      alert(err?.message || 'Failed to decline payment.');
    } finally {
      setDecliningPaymentId(null);
    }
  };

  const handleTogglePurchaseDownload = async (p: GatewayLogRecord) => {
    if (!p.purchase_id) return;
    const currentEnabled = p.download_enabled_by_admin !== false;
    const newEnabled = !currentEnabled;
    const confirmMsg = newEnabled
      ? `Unlock CAD downloads for Purchase #${p.purchase_id}? The customer will be able to request OTP and download the CAD package.`
      : `Lock CAD downloads for Purchase #${p.purchase_id}? This will immediately invalidate any active download tokens and prevent OTP verifications.`;
    if (!window.confirm(confirmMsg)) return;

    setTogglingDownloadId(p.purchase_id);
    try {
      await api.togglePurchaseDownloadPermission(p.purchase_id, newEnabled);
      alert(`Success! CAD downloads for Purchase #${p.purchase_id} are now ${newEnabled ? 'ENABLED / UNLOCKED' : 'LOCKED'}.`);
      await fetchGatewayLogs();
    } catch (err: any) {
      alert(err?.message || 'Failed to update CAD download permission.');
    } finally {
      setTogglingDownloadId(null);
    }
  };

  const handleToggleOrderDownload = async (p: GatewayLogRecord) => {
    if (!p.order_id) return;
    const currentEnabled = p.download_enabled_by_admin !== false;
    const newEnabled = !currentEnabled;
    const confirmMsg = newEnabled
      ? `Unlock CAD downloads for Order #${p.order_id}? The customer will be able to download the deliverable CAD files from their dashboard.`
      : `Lock CAD downloads for Order #${p.order_id}? This will prevent CAD file downloads until unlocked.`;
    if (!window.confirm(confirmMsg)) return;

    setTogglingOrderDownloadId(p.order_id);
    try {
      await api.toggleOrderDownloadPermission(p.order_id, newEnabled);
      alert(`Success! CAD downloads for Order #${p.order_id} are now ${newEnabled ? 'ENABLED / UNLOCKED' : 'LOCKED'}.`);
      await fetchGatewayLogs();
    } catch (err: any) {
      alert(err?.message || 'Failed to update CAD download permission.');
    } finally {
      setTogglingOrderDownloadId(null);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const summary = await api.getAnalyticsSummary();
      setAnalyticsSummary(summary);
    } catch (e) {
      console.warn('Analytics summary fetch failed:', e);
    }
  };

  useEffect(() => {
    fetchSettlements();
    fetchGatewayLogs();
    fetchAnalytics();
  }, []);

  // 1. Gross Studio Revenue (Total Contract / Booking Value of all Client Inflows)
  const grossStudioRevenue = React.useMemo(() => {
    if (clientPayments.length === 0 && analyticsSummary?.gross_revenue_inr) {
      return analyticsSummary.gross_revenue_inr;
    }
    const computed = clientPayments.reduce((acc, p) => {
      // For Custom Orders: full total contract value
      const amt = (typeof p.order_total_val === 'number' && p.order_total_val > 0)
        ? p.order_total_val
        : (p.amount_raw || 0);
      return acc + amt;
    }, 0);
    return computed > 0 ? Math.round(computed) : (analyticsSummary?.gross_revenue_inr || 0);
  }, [clientPayments, analyticsSummary]);

  // 2. Verified Client Collections (Audited / Cleared Cash Inflow into Studio Account)
  const verifiedClientCollections = React.useMemo(() => {
    if (clientPayments.length === 0 && analyticsSummary?.total_revenue_inr) {
      return analyticsSummary.total_revenue_inr;
    }
    const computed = clientPayments.reduce((acc, p) => {
      // Custom Orders: strictly verified paid amounts
      if (p.entry_type === 'order' || p.order_id) {
        if (typeof p.order_paid_val === 'number' && p.order_paid_val > 0) {
          return acc + p.order_paid_val;
        }
        if (p.is_order_fully_paid) {
          return acc + (p.order_total_val || p.amount_raw || 0);
        }
        if (p.transactions && p.transactions.length > 0) {
          const verifiedTxn = p.transactions
            .filter((t) => t.raw_status === 'success' || t.raw_status === 'paid' || t.status.toLowerCase().includes('success') || t.status.toLowerCase().includes('paid'))
            .reduce((sum, t) => sum + (t.amount_raw || 0), 0);
          return acc + verifiedTxn;
        }
        return acc;
      }
      // Product Purchases: strictly only verified/paid
      if (p.purchase_id || p.entry_type === 'purchase') {
        const isPaid = p.raw_status === 'paid' || p.status.toLowerCase().includes('paid');
        return isPaid ? acc + (p.amount_raw || 0) : acc;
      }
      // File modifications / other: strictly only verified
      const isPaid = p.raw_status === 'paid' || p.status.toLowerCase().includes('paid') || p.status.toLowerCase().includes('agreed');
      return isPaid ? acc + (p.amount_raw || 0) : acc;
    }, 0);
    return computed > 0 ? Math.round(computed) : (analyticsSummary?.total_revenue_inr || 0);
  }, [clientPayments, analyticsSummary]);

  // Pending Collections Amount (Client payments submitted & awaiting admin verification)
  const pendingCollectionsAmount = React.useMemo(() => {
    const computed = clientPayments.reduce((acc, p) => {
      let pendingForThis = 0;
      if (p.transactions && p.transactions.length > 0) {
        pendingForThis = p.transactions
          .filter((t) => t.raw_status === 'pending' || t.can_approve)
          .reduce((sum, t) => sum + (t.amount_raw || 0), 0);
      } else if (p.purchase_id || p.entry_type === 'purchase') {
        if (p.raw_status === 'pending' || p.can_approve) {
          pendingForThis = p.amount_raw || 0;
        }
      } else if (p.can_approve || p.raw_status === 'pending') {
        pendingForThis = p.amount_raw || 0;
      }
      return acc + pendingForThis;
    }, 0);
    return Math.round(computed);
  }, [clientPayments]);

  const pendingVerificationList = React.useMemo(() => {
    return clientPayments.filter((p) => p.can_approve || p.raw_status === 'pending' || p.has_pending_transactions);
  }, [clientPayments]);

  const pendingVerificationCount = React.useMemo(() => {
    return clientPayments.reduce((acc, p) => {
      if (p.transactions && p.transactions.length > 0) {
        return acc + p.transactions.filter((t) => t.raw_status === 'pending' || t.can_approve).length;
      }
      return (p.can_approve || p.raw_status === 'pending') ? acc + 1 : acc;
    }, 0);
  }, [clientPayments]);

  const totalRevenueUSD = React.useMemo(() => {
    const base = grossStudioRevenue > 0 ? grossStudioRevenue : verifiedClientCollections;
    return base > 0 ? Math.round((base / 86.85) * 100) / 100 : 0;
  }, [grossStudioRevenue, verifiedClientCollections]);

  // 3. Artisan Labor Committed (Modeller Labor)
  const unpaidItems = settlements.filter((s) => s.status !== 'settled');
  const totalUnpaidAmount = unpaidItems.reduce((acc, it) => acc + (it.balanceDue ?? it.payoutAmount), 0);
  const totalSettledAmount = settlements.reduce((acc, it) => acc + (it.amountPaid || 0), 0);
  const totalCommitted = settlements.reduce((acc, it) => acc + it.payoutAmount, 0);

  // Overall Financial Division between Admin and Staff across all orders
  const financialDivision = React.useMemo(() => {
    const totalGross = grossStudioRevenue;
    
    // Sum staff share from all orders & bookings in ledger
    let staffShare = clientPayments.reduce((acc, p) => acc + (p.staff_payout_val || 0), 0);
    if (staffShare === 0 && totalCommitted > 0) {
      staffShare = totalCommitted;
    }

    const adminShare = Math.max(0, totalGross - staffShare);
    const staffPct = totalGross > 0 ? Math.round((staffShare / totalGross) * 100) : 0;
    const adminPct = totalGross > 0 ? Math.round((adminShare / totalGross) * 100) : 100;

    // Custom CAD Orders split
    const customOrders = clientPayments.filter((p) => p.entry_type === 'order' || p.order_id);
    const customGross = customOrders.reduce((acc, p) => acc + (p.order_total_val || p.amount_raw || 0), 0);
    const customStaff = customOrders.reduce((acc, p) => acc + (p.staff_payout_val || 0), 0);
    const customAdmin = Math.max(0, customGross - customStaff);

    // Ready CAD Catalog Purchases split (100% Studio)
    const storePurchases = clientPayments.filter((p) => p.entry_type === 'purchase' || p.purchase_id);
    const storeGross = storePurchases.reduce((acc, p) => acc + (p.amount_raw || 0), 0);

    return {
      totalGross: Math.round(totalGross),
      totalStaffShare: Math.round(staffShare),
      totalAdminShare: Math.round(adminShare),
      staffPercent: staffPct,
      adminPercent: adminPct,
      customGross: Math.round(customGross),
      customStaff: Math.round(customStaff),
      customAdmin: Math.round(customAdmin),
      storeGross: Math.round(storeGross),
    };
  }, [grossStudioRevenue, clientPayments, totalCommitted]);

  // 4. Net Studio Retained Profit & Margin
  const netStudioProfit = financialDivision.totalAdminShare;
  const profitMarginPercent = financialDivision.adminPercent;

  const filteredClientPayments = React.useMemo(() => {
    return clientPayments.filter((p) => {
      if (filterType === 'purchases' && !p.purchase_id) return false;
      if (filterType === 'custom' && !(p.order_id || p.payment_id || p.entry_type === 'order')) return false;
      if (filterType === 'file-edits' && !p.id.startsWith('FED-')) return false;
      if (filterType === 'pending' && !(p.can_approve || p.raw_status === 'pending' || p.has_pending_transactions)) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchClient = p.client?.toLowerCase().includes(q);
        const matchEmail = p.client_email?.toLowerCase().includes(q) || p.buyer_email?.toLowerCase().includes(q);
        const matchItem = p.item_title?.toLowerCase().includes(q);
        const matchId = p.id?.toLowerCase().includes(q);
        const matchRef = p.ref?.toLowerCase().includes(q);
        const matchType = p.type?.toLowerCase().includes(q);
        const matchTransactions = p.transactions?.some((t) =>
          t.id.toLowerCase().includes(q) ||
          t.ref?.toLowerCase().includes(q) ||
          t.payment_details?.toLowerCase().includes(q) ||
          t.type?.toLowerCase().includes(q) ||
          t.amount?.toLowerCase().includes(q)
        );
        if (!matchClient && !matchEmail && !matchItem && !matchId && !matchRef && !matchType && !matchTransactions) {
          return false;
        }
      }
      return true;
    });
  }, [clientPayments, filterType, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.length === unpaidItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unpaidItems.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const openSettleModal = (item: SettlementRecord) => {
    setSettleModalItem(item);
    const balance = item.balanceDue !== undefined && item.balanceDue > 0 ? item.balanceDue : item.payoutAmount;
    setSettleAmount(balance);
    setSettleMethod('bank_transfer');
    setSettleTxnRef('');
    setSettleDate(new Date().toISOString().split('T')[0]);
    setSettleNotes('');
  };

  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalItem) return;
    if (!settleAmount || Number(settleAmount) <= 0) {
      alert('Please enter a valid payout amount.');
      return;
    }

    setIsSubmittingSettle(true);
    try {
      const rawId = parseInt(settleModalItem.id.replace('SET-', ''), 10);
      await api.request('/settlements/process-payout/', {
        method: 'POST',
        body: JSON.stringify({
          settlement_id: rawId,
          amount: Number(settleAmount),
          payment_method: settleMethod,
          transaction_ref: settleTxnRef.trim(),
          notes: settleNotes.trim(),
        }),
      });

      setSettleModalItem(null);
      fetchSettlements();
      alert(`Payout of ₹${Number(settleAmount).toLocaleString('en-IN')} recorded successfully!`);
    } catch (err: any) {
      alert(err?.message || 'Failed to process settlement.');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const handleBulkBatchSettle = async () => {
    if (selectedIds.length === 0) return;
    const ids = selectedIds.map((id) => parseInt(id.replace('SET-', ''), 10)).filter((n) => !isNaN(n));
    if (!window.confirm(`Process full payouts for ${ids.length} selected job(s) via Bank Transfer?`)) return;

    try {
      if (ids.length > 0) {
        await api.request('/settlements/process-payout/', {
          method: 'POST',
          body: JSON.stringify({
            settlement_ids: ids,
            payment_method: 'bank_transfer',
            transaction_ref: `BATCH-PAY-${Date.now()}`,
            notes: 'Batch settlement processed via studio portal',
          }),
        });
      }
      setSelectedIds([]);
      fetchSettlements();
      alert(`Successfully settled full payouts for ${ids.length} job(s)!`);
    } catch (err: any) {
      alert(err?.message || 'Failed to process payouts.');
    }
  };

  const handleRecordClientPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientPayAmount || Number(clientPayAmount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const newRecord: GatewayLogRecord = {
      id: `MAN-${Date.now().toString().slice(-6)}`,
      client: clientPayClientName.trim() || 'Walk-in Client',
      amount: `₹${Number(clientPayAmount).toLocaleString('en-IN')}`,
      amount_raw: Number(clientPayAmount),
      type: clientPayType,
      ref: clientPayTxnRef.trim() || `OFFLINE-${Date.now().toString().slice(-4)}`,
      status: 'Success (Verified)',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      created_at_iso: new Date().toISOString(),
      payment_method: clientPayMethod,
    };

    setClientPayments((prev) => [newRecord, ...prev]);
    setIsClientPaymentModalOpen(false);
    setClientPayClientName('');
    setClientPayOrderRef('');
    setClientPayAmount('');
    setClientPayTxnRef('');
    setClientPayNotes('');
    alert('Client payment record added to gateway audit log!');
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Settlement ID,Modeller Name,Order Number,Design Title,Total Due (INR),Amount Paid (INR),Balance Due (INR),Payment Method,Transaction Ref,Status,Settled Date\n' +
      settlements
        .map(
          (s) =>
            `${s.id},"${s.staffName}","${s.orderNumber}","${s.designTitle}",₹${s.payoutAmount},₹${s.amountPaid || 0},₹${s.balanceDue ?? s.payoutAmount},"${s.paymentMethod || 'N/A'}","${s.transactionRef || 'N/A'}",${s.status},"${s.settledAt || 'N/A'}"`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Shiuli_Staff_Settlements_Ledger.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Functional Explanation Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8D7B7] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-[#17243B] tracking-tight">
                Financial Control & Settlements
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C]">
                Live Ledger
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1 max-w-2xl leading-relaxed">
              Track custom CAD project finances: audit incoming client deposits and record full or partial payouts to your CAD artisans (via Cash, UPI, or Bank Transfer).
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8D7B7] text-xs font-semibold">
              <button
                onClick={() => {
                  setActiveTab('client-payments');
                  fetchGatewayLogs();
                  fetchAnalytics();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'client-payments' ? 'bg-[#17345C] text-white shadow' : 'text-[#6B7280] hover:text-[#17243B]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Client Gateway &amp; Revenue ({clientPayments.length})</span>
                {pendingVerificationList.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {pendingVerificationList.length} Pending
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('settlements')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'settlements' ? 'bg-[#17345C] text-white shadow' : 'text-[#6B7280] hover:text-[#17243B]'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Staff Settlements ({settlements.length})</span>
              </button>
            </div>

            <button
              onClick={() => {
                fetchSettlements();
                fetchGatewayLogs();
                fetchAnalytics();
              }}
              disabled={loadingSettlements || loadingGatewayLogs}
              className="p-2 rounded-xl border border-[#E8D7B7] text-[#6B7280] hover:text-[#17243B] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              title="Refresh Live Financial Ledger & Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSettlements || loadingGatewayLogs ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E8D7B7] text-[#17243B] hover:bg-[#FAF8F5] text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1F9D66]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 3 Dedicated Core Financial Division Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-[#E8D7B7]">
          {/* Card 1: Total Amount (Grand Inflow) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#17345C] to-[#0B1330] text-white shadow-md space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[#F5E7A3]">
              <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-sans">
                <TrendingUp className="w-3.5 h-3.5 text-[#F5E7A3]" />
                Total Amount
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#F5E7A3]/20 text-[#F5E7A3] border border-[#F5E7A3]/30">
                100% Volume
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              ₹{financialDivision.totalGross.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              ≈ ${totalRevenueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD • {clientPayments.length} Total Bookings
            </div>
            <div className="pt-1 border-t border-white/10 text-[10px] text-slate-300 flex items-center justify-between font-sans">
              <span>Custom: <strong>₹{financialDivision.customGross.toLocaleString('en-IN')}</strong></span>
              <span>Store: <strong>₹{financialDivision.storeGross.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

          {/* Card 2: What Admin / Studio Gets */}
          <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-900">
              <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-sans">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                Admin / Studio Gets
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300">
                {financialDivision.adminPercent}% Studio Share
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-blue-950 tracking-tight">
              ₹{financialDivision.totalAdminShare.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-blue-800 font-sans">
              Net retained studio profit margin
            </div>
            <div className="pt-1 border-t border-blue-200/80 text-[10px] text-blue-700 font-sans">
              30% Custom CAD margin + 100% Ready CAD sales
            </div>
          </div>

          {/* Card 3: What Staff / Modeller Gets */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-amber-900">
              <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-sans">
                <Users className="w-3.5 h-3.5 text-amber-700" />
                Staff / Modeller Gets
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {financialDivision.staffPercent}% Modeller Share
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-950 tracking-tight">
              ₹{financialDivision.totalStaffShare.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-800 font-sans">
              Artisan modellers labor compensation
            </div>
            <div className="pt-1 border-t border-amber-200/80 text-[10px] text-amber-900 flex items-center justify-between font-mono">
              <span>Settled: <strong>₹{totalSettledAmount.toLocaleString('en-IN')}</strong></span>
              <span className="text-amber-700">Due: <strong>₹{(financialDivision.totalStaffShare - totalSettledAmount).toLocaleString('en-IN')}</strong></span>
            </div>
          </div>
        </div>

        {/* Visual Revenue Division Proportion Bar */}
        <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E8D7B7] space-y-2 mt-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <span className="font-semibold text-[#17243B] flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Revenue Division Ratio: Admin vs Artisan Modellers</span>
            </span>
            <span className="text-[11px] text-slate-500 font-sans">
              Custom CAD Orders: <strong>70% Modeller / 30% Studio</strong> • Ready CAD Downloads: <strong>100% Studio</strong>
            </span>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${financialDivision.adminPercent}%` }}
              className="bg-gradient-to-r from-[#17345C] to-[#1E4E8C] h-full transition-all flex items-center justify-center text-[9px] font-bold text-white font-mono"
              title={`Admin / Studio Share: ${financialDivision.adminPercent}%`}
            >
              {financialDivision.adminPercent}% Admin
            </div>
            <div
              style={{ width: `${financialDivision.staffPercent}%` }}
              className="bg-gradient-to-r from-[#D4AF37] to-[#C9A227] h-full transition-all flex items-center justify-center text-[9px] font-bold text-[#17243B] font-mono"
              title={`Staff Modellers Share: ${financialDivision.staffPercent}%`}
            >
              {financialDivision.staffPercent}% Staff
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7280]">
            <span className="text-[#17345C] font-semibold">🏛️ Admin / Studio: ₹{financialDivision.totalAdminShare.toLocaleString('en-IN')} ({financialDivision.adminPercent}%)</span>
            <span className="text-amber-800 font-semibold">👤 Staff Modellers: ₹{financialDivision.totalStaffShare.toLocaleString('en-IN')} ({financialDivision.staffPercent}%)</span>
          </div>
        </div>
      </div>

      {activeTab === 'settlements' ? (
        <div className="bg-white rounded-2xl border border-[#E8D7B7] shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-[#E8D7B7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-semibold text-[#17243B] flex items-center gap-2">
              <span>Completed CAD Jobs &amp; Modeller Payout Ledger</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] font-semibold">
                {unpaidItems.length} Pending
              </span>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkBatchSettle}
                className="btn-gold-luxury px-4 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#17345C]" />
                <span>Batch Settle {selectedIds.length} Job(s)</span>
              </button>
            )}
          </div>

          {loadingSettlements ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#17345C] animate-spin" />
              <p className="text-xs font-mono text-[#6B7280]">Loading live staff settlements...</p>
            </div>
          ) : settlements.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-[#9CA3AF] mx-auto" />
              <p className="text-sm font-semibold text-[#17243B]">No Settlements Logged</p>
              <p className="text-xs text-[#6B7280]">
                Completed CAD orders will automatically generate modeller payout entries here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E8D7B7] text-[11px] font-mono uppercase text-[#6B7280]">
                    <th className="p-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === unpaidItems.length && unpaidItems.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-[#E8D7B7] text-[#C9A227] focus:ring-0"
                      />
                    </th>
                    <th className="p-3.5 font-medium">Modeller Name</th>
                    <th className="p-3.5 font-medium">Order Number</th>
                    <th className="p-3.5 font-medium">Design Title</th>
                    <th className="p-3.5 font-medium">Total Payout Due</th>
                    <th className="p-3.5 font-medium">Settled Amount</th>
                    <th className="p-3.5 font-medium">Payment Mode &amp; Ref</th>
                    <th className="p-3.5 font-medium">Status</th>
                    <th className="p-3.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D7B7] text-xs">
                  {settlements.map((set) => {
                    const isFullySettled = set.status === 'settled';
                    const isPartial = set.status === 'partial';
                    const isSelected = selectedIds.includes(set.id);

                    return (
                      <tr key={set.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="p-3.5">
                          {!isFullySettled ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(set.id)}
                              className="rounded border-[#E8D7B7] text-[#C9A227] focus:ring-0"
                            />
                          ) : (
                            <span className="text-[#1F9D66] font-bold">✓</span>
                          )}
                        </td>

                        <td className="p-3.5 font-bold text-[#17243B]">
                          <div className="flex items-center gap-1.5">
                            <span>{set.staffName}</span>
                          </div>
                          <span className="text-[10px] text-[#6B7280] font-normal block">{set.staffRole}</span>
                        </td>

                        <td className="p-3.5 font-mono text-[#17345C] font-semibold">
                          {set.orderNumber}
                        </td>

                        <td className="p-3.5 text-[#17243B] font-medium max-w-xs truncate" title={set.designTitle}>
                          {set.designTitle}
                        </td>

                        <td className="p-3.5 font-mono font-bold text-[#17243B]">
                          ₹{set.payoutAmount.toLocaleString('en-IN')}
                        </td>

                        <td className="p-3.5 font-mono">
                          <span className="font-bold text-emerald-700">₹{(set.amountPaid || 0).toLocaleString('en-IN')}</span>
                          {set.balanceDue !== undefined && set.balanceDue > 0 && (
                            <span className="text-[11px] text-amber-600 block">
                              (₹{set.balanceDue.toLocaleString('en-IN')} balance)
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-xs">
                          {set.amountPaid && set.amountPaid > 0 ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                {set.paymentMethod === 'cash' ? (
                                  <>💵 Cash</>
                                ) : set.paymentMethod === 'upi' ? (
                                  <>📱 UPI</>
                                ) : set.paymentMethod === 'cheque' ? (
                                  <>📄 Cheque</>
                                ) : (
                                  <>🏦 Bank Transfer</>
                                )}
                              </span>
                              {set.transactionRef && (
                                <span className="font-mono text-[10px] text-slate-500 block truncate max-w-[120px]" title={set.transactionRef}>
                                  Ref: {set.transactionRef}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {isFullySettled ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Settled {set.settledAt ? `(${set.settledAt})` : ''}</span>
                            </span>
                          ) : isPartial ? (
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[11px] inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-600" />
                              <span>Partially Paid</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[11px] inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending Payout</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {!isFullySettled && (
                            <button
                              onClick={() => openSettleModal(set)}
                              className="px-3 py-1.5 rounded-lg bg-[#17345C] hover:bg-[#0B1330] text-white font-bold text-xs shadow-sm transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Wallet className="w-3.5 h-3.5 text-[#F5E7A3]" />
                              <span>{isPartial ? 'Settle Balance' : 'Settle Payout'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => setViewSlipItem(set)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="View / Print Payout Slip"
                          >
                            <Receipt className="w-3.5 h-3.5 text-slate-600" />
                            <span>Slip</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Client Payments Gateway Table with Manual Log Button */
        <div className="bg-white rounded-2xl border border-[#E8D7B7] p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8D7B7] pb-3">
            <div>
              <div className="text-xs font-semibold text-[#17243B] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#17345C]" />
                Incoming Client Payments &amp; Gateway Audit Log
              </div>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Online gateway transactions (Razorpay / Stripe) alongside manually logged studio Cash/UPI payments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsClientPaymentModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#0B1330] hover:brightness-105 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#0B1330]" />
                <span>Record Client Offline / Cash Payment</span>
              </button>
            </div>
          </div>

          {/* Pending Approval Highlight Notice */}
          {clientPayments.some((p) => p.can_approve || p.raw_status === 'pending' || p.has_pending_transactions) && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <strong className="font-bold text-amber-950 text-xs">Payment Verification Required:</strong>{' '}
                  <span className="text-amber-900">
                    {clientPayments.reduce((acc, p) => acc + (p.pending_transactions_count || (p.can_approve || p.raw_status === 'pending' ? 1 : 0)), 0)} client payment request(s) awaiting collection confirmation. Confirm receipt to enable their CAD file download.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions by client, email, item, ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#E8D7B7] rounded-xl text-xs text-[#17243B] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C9A227] transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-[#17345C] text-white shadow-sm'
                    : 'bg-[#FAF8F5] text-[#6B7280] hover:text-[#17243B] border border-[#E8D7B7]'
                }`}
              >
                All Inflow ({clientPayments.length})
              </button>
              <button
                onClick={() => setFilterType('purchases')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'purchases'
                    ? 'bg-[#17345C] text-white shadow-sm'
                    : 'bg-[#FAF8F5] text-[#6B7280] hover:text-[#17243B] border border-[#E8D7B7]'
                }`}
              >
                CAD Downloads ({clientPayments.filter((p) => p.purchase_id).length})
              </button>
              <button
                onClick={() => setFilterType('custom')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'custom'
                    ? 'bg-[#17345C] text-white shadow-sm'
                    : 'bg-[#FAF8F5] text-[#6B7280] hover:text-[#17243B] border border-[#E8D7B7]'
                }`}
              >
                Custom Orders ({clientPayments.filter((p) => p.order_id || p.payment_id || p.entry_type === 'order').length})
              </button>
              <button
                onClick={() => setFilterType('file-edits')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'file-edits'
                    ? 'bg-[#17345C] text-white shadow-sm'
                    : 'bg-[#FAF8F5] text-[#6B7280] hover:text-[#17243B] border border-[#E8D7B7]'
                }`}
              >
                CAD Edits ({clientPayments.filter((p) => p.id.startsWith('FED-')).length})
              </button>
              {pendingVerificationList.length > 0 && (
                <button
                  onClick={() => setFilterType('pending')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    filterType === 'pending'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-50 text-amber-800 border border-amber-300'
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Pending ({pendingVerificationList.length})</span>
                </button>
              )}
            </div>
          </div>

          {loadingGatewayLogs ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#17345C] animate-spin" />
              <p className="text-xs font-mono text-[#6B7280]">Auditing live incoming transactions...</p>
            </div>
          ) : clientPayments.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ArrowDownLeft className="w-10 h-10 text-[#9CA3AF] mx-auto" />
              <p className="text-sm font-semibold text-[#17243B]">No Incoming Payments Found</p>
              <p className="text-xs text-[#6B7280]">
                Client deposit payments and store purchases will record live gateway transaction logs here.
              </p>
            </div>
          ) : filteredClientPayments.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Search className="w-8 h-8 text-[#9CA3AF] mx-auto" />
              <p className="text-sm font-semibold text-[#17243B]">No Matching Transactions Found</p>
              <p className="text-xs text-[#6B7280]">
                Try adjusting your search query or filter selection.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-mono">
              {filteredClientPayments.map((p) => {
                const isOrderWithTransactions = Boolean(p.transactions && p.transactions.length > 0);
                const isPending = p.can_approve || p.raw_status === 'pending' || p.has_pending_transactions;

                if (isOrderWithTransactions && p.transactions) {
                  const isExpanded = expandedOrderIds.has(p.id);

                  return (
                    <div
                      key={p.id}
                      className={`p-5 rounded-2xl border transition-all space-y-3 shadow-xs ${
                        isPending
                          ? 'bg-gradient-to-b from-amber-50/60 to-white border-amber-300 shadow-sm'
                          : 'bg-white border-[#E8D7B7] hover:border-[#D4AF37]/50'
                      }`}
                    >
                      {/* ORDER CARD MAIN HEADER (Click to Expand / Collapse) */}
                      <div
                        onClick={() => toggleExpandOrder(p.id)}
                        className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer select-none group"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="font-bold text-[#17243B] flex items-center gap-2 flex-wrap">
                            <span className="text-[#17345C] font-mono font-extrabold text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {p.order_number || p.id}
                            </span>
                            <span className="text-slate-400">—</span>
                            <span className="text-sm font-semibold text-[#17243B] group-hover:text-[#17345C] transition-colors">{p.client}</span>
                            {p.client_email && (
                              <span className="text-xs text-slate-500 font-normal">({p.client_email})</span>
                            )}
                          </div>

                          {p.item_title && (
                            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-[#17345C]" />
                              <span>{p.item_title}</span>
                            </div>
                          )}

                          {/* Status Badges */}
                          <div className="text-[11px] text-[#6B7280] flex items-center gap-2 flex-wrap pt-0.5">
                            {p.total_stages_count ? (
                              <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-bold font-mono">
                                {p.total_stages_count} Milestone Stages (10% / 30% / 60%)
                              </span>
                            ) : null}

                            {p.has_pending_transactions ? (
                              <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Pending Verification ({p.pending_transactions_count || 1})
                              </span>
                            ) : p.is_order_fully_paid ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100% Fully Settled
                              </span>
                            ) : (
                              <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
                                <CheckCircle2 className="w-3 h-3 text-blue-600" /> Part Payment ({p.order_paid_amount || '₹0.00'} Paid)
                              </span>
                            )}

                            {/* Download Authorization Badge */}
                            {!p.is_order_fully_paid ? (
                              <span className="bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
                                <Lock className="w-3 h-3 text-amber-600" /> Downloads Locked (Full Settlement Required)
                              </span>
                            ) : p.download_enabled_by_admin === false ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
                                <Lock className="w-3 h-3 text-rose-600" /> Downloads Locked by Admin
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
                                <Unlock className="w-3 h-3 text-emerald-600" /> Downloads Enabled
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Header Right: Total Contract Price, Download Toggle & Expand Button */}
                        <div className="sm:text-right shrink-0 flex flex-col sm:items-end justify-between space-y-2">
                          <div>
                            <div className="font-extrabold text-[#1F9D66] text-lg font-mono">
                              {p.order_total_amount || p.amount}
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold font-mono">
                              Total Contract Value
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                            {/* If order is 100% paid, show lock/unlock CAD deliverables toggle */}
                            {p.order_id && p.is_order_fully_paid && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleOrderDownload(p);
                                }}
                                disabled={togglingOrderDownloadId === p.order_id}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-mono shadow-2xs ${
                                  p.download_enabled_by_admin === false
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                }`}
                                title={p.download_enabled_by_admin === false ? 'Unlock customer CAD downloads' : 'Lock customer CAD downloads'}
                              >
                                {togglingOrderDownloadId === p.order_id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : p.download_enabled_by_admin === false ? (
                                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span>{p.download_enabled_by_admin === false ? 'Unlock Deliverables' : 'Lock Deliverables'}</span>
                              </button>
                            )}

                            {/* Expand / Collapse Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandOrder(p.id);
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs font-mono border transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                isExpanded
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                  : 'bg-[#17345C] hover:bg-[#0B1330] text-white border-[#17345C]'
                              }`}
                            >
                              <span>{isExpanded ? 'Collapse' : `View Details (${p.transactions.length})`}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* MONEY DIVISION BETWEEN ADMIN & STAFF FOR THIS SPECIFIC ORDER */}
                      <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8D7B7] grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                        {/* 1. Order Total Value */}
                        <div className="bg-white p-2.5 rounded-lg border border-[#E8D7B7] flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block font-sans">
                              Total Order Value
                            </span>
                            <strong className="text-sm font-extrabold text-[#17243B] font-mono">
                              {p.order_total_amount || p.amount}
                            </strong>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                            100% Volume
                          </span>
                        </div>

                        {/* 2. Admin / Studio Gets */}
                        <div className="bg-blue-50/90 p-2.5 rounded-lg border border-blue-200 flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="text-[10px] text-blue-900 font-bold uppercase block font-sans flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-blue-700" />
                              Admin / Studio Gets
                            </span>
                            <strong className="text-sm font-extrabold text-blue-950 font-mono">
                              {p.admin_margin_amount || `₹${((p.order_total_val || p.amount_raw) * 0.3).toFixed(2)}`}
                            </strong>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300 font-mono">
                            {p.admin_percent ?? 30}% Margin
                          </span>
                        </div>

                        {/* 3. Staff / Modeller Gets */}
                        <div className="bg-amber-50/90 p-2.5 rounded-lg border border-amber-200 flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="text-[10px] text-amber-900 font-bold uppercase block font-sans flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-amber-700" />
                              Staff ({p.assigned_staff_name || 'Modeller'})
                            </span>
                            <strong className="text-sm font-extrabold text-amber-950 font-mono">
                              {p.staff_payout_amount || `₹${((p.order_total_val || p.amount_raw) * 0.7).toFixed(2)}`}
                            </strong>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                              {p.staff_percent ?? 70}% Share
                            </span>
                            <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-extrabold uppercase font-mono ${
                              p.staff_payout_status === 'processed' || p.staff_payout_status === 'settled'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-200 text-amber-900'
                            }`}>
                              {p.staff_payout_status === 'processed' || p.staff_payout_status === 'settled' ? 'Settled' : 'Payout Due'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* COLLAPSED SUMMARY HINT */}
                      {!isExpanded && (
                        <div
                          onClick={() => toggleExpandOrder(p.id)}
                          className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-[#17345C] cursor-pointer hover:text-[#0B1330] select-none"
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Click on order to expand milestones &amp; {p.transactions.length} step transactions</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {p.order_paid_amount || '₹0.00'} collected of {p.order_total_amount || p.amount}
                          </span>
                        </div>
                      )}

                      {/* EXPANDED FULL DETAILS SECTION */}
                      {isExpanded && (
                        <div className="space-y-4 pt-3.5 border-t border-slate-200 animate-in fade-in-50 duration-200">
                          {/* Dedicated Staff vs Admin Money Split Card inside Expanded View */}
                          <div className="p-3 rounded-xl bg-white border border-[#E8D7B7] shadow-2xs space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-[#17243B] flex items-center gap-1.5 uppercase tracking-wider">
                                <PieChart className="w-3.5 h-3.5 text-[#C9A227]" />
                                <span>Order Revenue Division (Staff vs Studio Admin)</span>
                              </span>
                              <span className="text-slate-500 font-sans">
                                Assigned: <strong className="text-[#17345C]">{p.assigned_staff_name || 'Modeller'}</strong>
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                              <div className="bg-amber-50/80 p-2.5 rounded-lg border border-amber-200 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] text-amber-900 font-bold uppercase block font-sans">👤 Modeller Payout ({p.staff_percent ?? 70}%)</span>
                                  <strong className="text-sm font-extrabold text-amber-950">{p.staff_payout_amount || `₹${((p.order_total_val || p.amount_raw) * 0.7).toFixed(2)}`}</strong>
                                </div>
                                <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase ${
                                  p.staff_payout_status === 'processed' || p.staff_payout_status === 'settled'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-200 text-amber-900'
                                }`}>
                                  {p.staff_payout_status === 'processed' || p.staff_payout_status === 'settled' ? 'Settled' : 'Payout Due'}
                                </span>
                              </div>

                              <div className="bg-blue-50/80 p-2.5 rounded-lg border border-blue-200 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] text-blue-900 font-bold uppercase block font-sans">🏛️ Studio Retained ({p.admin_percent ?? 30}%)</span>
                                  <strong className="text-sm font-extrabold text-blue-950">{p.admin_margin_amount || `₹${((p.order_total_val || p.amount_raw) * 0.3).toFixed(2)}`}</strong>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 rounded font-extrabold uppercase bg-blue-100 text-blue-800">
                                  Studio Margin
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* MILESTONE FINANCIAL PROGRESS BAR & 3 SUMMARY METRICS */}
                          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                            <div className="flex justify-between items-center text-xs font-mono">
                              <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-blue-600" />
                                <span>Milestone Settlement Progress</span>
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                p.is_order_fully_paid
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}>
                                {p.is_order_fully_paid
                                  ? '✓ 100% Fully Settled'
                                  : `${Math.round(((p.order_paid_val || 0) / (p.order_total_val || 1)) * 100)}% Paid (${p.paid_stages_count || 0}/${p.total_stages_count || 3} Stages)`}
                              </span>
                            </div>

                            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden border border-slate-300/50">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  p.is_order_fully_paid
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(6, Math.round(((p.order_paid_val || 0) / (p.order_total_val || 1)) * 100)))}%`
                                }}
                              />
                            </div>

                            {/* 3 Metric Pills */}
                            <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-mono pt-1">
                              <div className="p-2 rounded-xl bg-emerald-50/90 border border-emerald-200 shadow-2xs">
                                <span className="text-emerald-700 block text-[10px] uppercase font-bold tracking-wider">Collected / Paid</span>
                                <strong className="text-emerald-900 text-sm font-extrabold">{p.order_paid_amount || '₹0.00'}</strong>
                              </div>
                              <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Total Contract</span>
                                <strong className="text-slate-800 text-sm font-extrabold">{p.order_total_amount || p.amount}</strong>
                              </div>
                              <div className={`p-2 rounded-xl border shadow-2xs ${
                                (p.order_remaining_val ?? 0) > 0 ? 'bg-amber-50/90 border-amber-200' : 'bg-emerald-50/50 border-emerald-200'
                              }`}>
                                <span className={`block text-[10px] uppercase font-bold tracking-wider ${
                                  (p.order_remaining_val ?? 0) > 0 ? 'text-amber-700' : 'text-emerald-700'
                                }`}>Remaining Due</span>
                                <strong className={`text-sm font-extrabold ${
                                  (p.order_remaining_val ?? 0) > 0 ? 'text-amber-900' : 'text-emerald-900'
                                }`}>{p.order_remaining_amount || '₹0.00'}</strong>
                              </div>
                            </div>

                            {/* Stepper Display of Milestone Stages if present */}
                            {p.stages && p.stages.length > 0 && (
                              <div className="pt-2 border-t border-slate-200/80">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1 font-mono">
                                  <span>Contract Milestone Schedule:</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                                  {p.stages.map((stg) => {
                                    const isStgPaid = stg.status === 'paid';
                                    const isStgDue = stg.status === 'due';
                                    return (
                                      <div
                                        key={stg.id}
                                        className={`p-2 rounded-xl border flex flex-col justify-between gap-1 transition-all ${
                                          isStgPaid
                                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                            : isStgDue
                                            ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                                            : 'bg-white border-slate-200 text-slate-600'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-[10px]">
                                            Stage {stg.step_number} ({stg.percentage}%)
                                          </span>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                                            isStgPaid
                                              ? 'bg-emerald-200/80 text-emerald-900'
                                              : isStgDue
                                              ? 'bg-amber-200 text-amber-900'
                                              : 'bg-slate-100 text-slate-500'
                                          }`}>
                                            {stg.status}
                                          </span>
                                        </div>
                                        <div className="text-[10px] font-sans font-medium line-clamp-1">{stg.label}</div>
                                        <div className="text-xs font-bold font-mono">{stg.amount_disp}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* NESTED STEP TRANSACTIONS AUDIT LEDGER */}
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800 font-mono">
                              <span className="flex items-center gap-1.5 text-slate-700">
                                <Receipt className="w-4 h-4 text-[#17345C]" />
                                <span className="uppercase tracking-wider">Order Transactions &amp; Inflows ({p.transactions.length})</span>
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                All step transactions for this order are consolidated here
                              </span>
                            </div>

                            <div className="space-y-2">
                              {p.transactions.map((t) => {
                                const isTxnPending = t.can_approve || t.raw_status === 'pending';
                                const isTxnDeclined = t.raw_status === 'declined';

                                return (
                                  <div
                                    key={t.id}
                                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                      isTxnPending
                                        ? 'bg-amber-50/90 border-amber-300 shadow-xs'
                                        : isTxnDeclined
                                        ? 'bg-rose-50/50 border-rose-200'
                                        : 'bg-[#F9FAFC] border-slate-200/90 hover:border-slate-300'
                                    }`}
                                  >
                                    {/* Left: Transaction details */}
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap font-mono">
                                        <span className="font-extrabold text-[#17345C] bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-200">
                                          {t.id}
                                        </span>
                                        <span className="text-slate-400">•</span>
                                        <span className="font-bold text-slate-800 text-xs">
                                          {t.type}
                                        </span>
                                        {t.payment_method && (
                                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                                            t.payment_method === 'cash_check'
                                              ? 'bg-purple-100 text-purple-800'
                                              : 'bg-emerald-100 text-emerald-800'
                                          }`}>
                                            {t.payment_method === 'cash_check' ? 'CASH / Check' : 'UPI / QR'}
                                          </span>
                                        )}
                                        {isTxnPending ? (
                                          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-amber-600" /> Pending Collection Confirmation
                                          </span>
                                        ) : isTxnDeclined ? (
                                          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1">
                                            <XCircle className="w-3 h-3 text-rose-600" /> Declined
                                          </span>
                                        ) : (
                                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified &amp; Collected
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-3 flex-wrap">
                                        <span>Txn Ref: <strong className="text-slate-700">{t.ref}</strong></span>
                                        <span>Recorded: {t.date}</span>
                                      </div>

                                      {/* Customer UTR / Details */}
                                      {t.payment_details && (
                                        <div className="text-[11px] font-sans text-slate-800 bg-white p-2 rounded-lg border border-slate-200 max-w-lg mt-1">
                                          <strong className="text-[#17345C] font-mono text-[10px] uppercase block">
                                            Client Reference / Note:
                                          </strong>
                                          <span className="leading-relaxed">{t.payment_details}</span>
                                        </div>
                                      )}

                                      {/* Decline Reason */}
                                      {isTxnDeclined && t.decline_reason && (
                                        <div className="text-[11px] font-sans text-rose-900 bg-white p-2 rounded-lg border border-rose-200 max-w-lg mt-1">
                                          <strong className="text-rose-700 font-mono text-[10px] uppercase block">
                                            Decline Reason:
                                          </strong>
                                          <span className="leading-relaxed">{t.decline_reason}</span>
                                        </div>
                                      )}

                                      {/* Screenshot Proof Button */}
                                      {t.screenshot && (
                                        <div className="pt-0.5 flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setLightboxScreenshotUrl(t.screenshot!);
                                              setLightboxTitle(`${t.id} — ${p.client} Payment Proof`);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E8D7B7] text-[#17345C] hover:bg-[#FFF9F0] border border-[#E8D7B7] transition-colors font-bold text-[11px] cursor-pointer shadow-2xs font-mono"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>View Proof / Cheque Photo</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Right: Amount & Action Buttons */}
                                    <div className="md:text-right shrink-0 flex flex-col md:items-end justify-between space-y-2">
                                      <div>
                                        <div className="font-extrabold text-[#1F9D66] text-base font-mono">{t.amount}</div>
                                        {t.is_stage_payment && (
                                          <div className="text-[10px] font-mono text-blue-700 font-semibold">
                                            Stage {t.stage_order_index} Payment ({t.stage_percentage ? `${t.stage_percentage}%` : 'Part'})
                                          </div>
                                        )}
                                      </div>

                                      {/* Approval & Decline for this specific transaction */}
                                      {isTxnPending && (
                                        <div className="flex flex-col md:items-end gap-1.5">
                                          <div className="flex items-center gap-2 flex-wrap md:justify-end">
                                            <button
                                              type="button"
                                              onClick={() => handleApproveIncomingPayment({
                                                ...p,
                                                id: t.id,
                                                payment_id: t.payment_id,
                                                amount: t.amount,
                                                is_stage_payment: t.is_stage_payment,
                                                stage_name: t.stage_name,
                                                type: t.type
                                              })}
                                              disabled={approvingPaymentId === t.id || decliningPaymentId === t.id}
                                              className={`px-3 py-1.5 rounded-xl text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-mono ${
                                                t.is_stage_payment && !p.is_order_fully_paid
                                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                                                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600'
                                              }`}
                                            >
                                              {approvingPaymentId === t.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              ) : (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                              )}
                                              <span>
                                                {t.is_stage_payment && !p.is_order_fully_paid
                                                  ? `Verify Stage Payment (${t.stage_percentage ? `${t.stage_percentage}%` : 'Part'})`
                                                  : 'Approve & Confirm'}
                                              </span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => openDeclineModal({
                                                ...p,
                                                id: t.id,
                                                payment_id: t.payment_id,
                                                amount: t.amount,
                                                type: t.type
                                              })}
                                              disabled={approvingPaymentId === t.id || decliningPaymentId === t.id}
                                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-mono"
                                            >
                                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                              <span>Decline</span>
                                            </button>
                                          </div>
                                          {t.is_stage_payment && !p.is_order_fully_paid && (
                                            <div className="text-[10px] font-mono text-amber-700 font-bold flex items-center md:justify-end gap-1">
                                              <Lock className="w-3 h-3 text-amber-600" />
                                              <span>Deliverable download remains locked until 100% full payment</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Standalone Single Card (Store Purchases PUR-... or CAD File Edits FED-...)
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isPending
                        ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400 shadow-sm'
                        : 'bg-[#FAF8F5] border-[#E8D7B7] hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="font-bold text-[#17243B] flex items-center gap-2 flex-wrap">
                        <span className="text-[#17345C]">{p.id}</span>
                        <span>—</span>
                        <span className="text-sm text-[#17243B]">{p.client}</span>
                        {p.client_email && (
                          <span className="text-[11px] text-slate-500 font-normal">({p.client_email})</span>
                        )}
                        {p.buyer_email && !p.client_email && (
                          <span className="text-[11px] text-slate-500 font-normal">({p.buyer_email})</span>
                        )}
                      </div>

                      {p.item_title && (
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#17345C]" />
                          <span>{p.item_title}</span>
                        </div>
                      )}

                      <div className="text-[10px] text-[#6B7280] flex items-center gap-2 flex-wrap">
                        <span className="bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] px-2 py-0.5 rounded font-semibold">
                          {p.type}
                        </span>
                        <span>Txn Ref: <strong>{p.ref}</strong></span>
                        {p.payment_method && (
                          <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                            p.payment_method === 'cash_check'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {p.payment_method === 'cash_check' ? 'CASH / Check' : 'UPI / QR'}
                          </span>
                        )}
                        {isPending ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Collection Confirmation
                          </span>
                        ) : p.raw_status === 'declined' ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" /> Payment Declined
                          </span>
                        ) : p.download_enabled_by_admin === false ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3 text-rose-600" /> Downloads Locked by Admin
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100% Paid &amp; Download Enabled
                          </span>
                        )}
                      </div>

                      {/* Money Division Indicator for Purchases / Edits */}
                      <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8D7B7] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                        {/* 1. Total Price */}
                        <div className="bg-white p-2 rounded-lg border border-[#E8D7B7] flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block font-sans">
                              Total Price
                            </span>
                            <strong className="text-xs font-extrabold text-[#17243B] font-mono">
                              {p.amount}
                            </strong>
                          </div>
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                            100% Inflow
                          </span>
                        </div>

                        {/* 2. Admin / Studio Retained */}
                        <div className="bg-blue-50/90 p-2 rounded-lg border border-blue-200 flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="text-[9px] text-blue-900 font-bold uppercase block font-sans flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5 text-blue-700" />
                              Admin / Studio Gets
                            </span>
                            <strong className="text-xs font-extrabold text-blue-950 font-mono">
                              {p.admin_margin_amount || p.amount}
                            </strong>
                          </div>
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300 font-mono">
                            {p.admin_percent ?? 100}% Margin
                          </span>
                        </div>

                        {/* 3. Staff Share */}
                        <div className="bg-amber-50/90 p-2 rounded-lg border border-amber-200 flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="text-[9px] text-amber-900 font-bold uppercase block font-sans flex items-center gap-1">
                              <UserCheck className="w-2.5 h-2.5 text-amber-700" />
                              {(p.staff_payout_val || 0) > 0 ? `Staff (${p.assigned_staff_name || 'Modeller'})` : 'Artisan Modeller'}
                            </span>
                            <strong className="text-xs font-extrabold text-amber-950 font-mono">
                              {(p.staff_payout_val || 0) > 0 ? p.staff_payout_amount : '₹0.00'}
                            </strong>
                          </div>
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                            {(p.staff_payout_val || 0) > 0 ? `${p.staff_percent}% Share` : 'Catalog Asset'}
                          </span>
                        </div>
                      </div>

                      {/* Decline Reason Note if declined */}
                      {p.raw_status === 'declined' && p.decline_reason && (
                        <div className="text-[11px] font-sans text-rose-900 bg-rose-50 p-2.5 rounded-xl border border-rose-200 max-w-xl">
                          <strong className="font-semibold text-rose-950 block text-[10px] uppercase font-mono text-rose-700">
                            Decline Reason Provided to Client:
                          </strong>
                          <span className="leading-relaxed">{p.decline_reason}</span>
                        </div>
                      )}

                      {/* Customer Details Note */}
                      {p.payment_details && (
                        <div className="text-[11px] font-sans text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 max-w-xl">
                          <strong className="font-semibold text-slate-900 block text-[10px] uppercase font-mono text-[#17345C]">
                            Customer Details &amp; Reference:
                          </strong>
                          <span className="leading-relaxed">{p.payment_details}</span>
                        </div>
                      )}

                      {/* Screenshot thumbnail button */}
                      {p.screenshot && (
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxScreenshotUrl(p.screenshot!);
                              setLightboxTitle(`${p.id} — ${p.client} Proof`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#E8D7B7] text-[#17345C] hover:bg-[#FFF9F0] border border-[#E8D7B7] transition-colors font-bold text-[11px] cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Proof / Cheque Photo</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Amount & Actions */}
                    <div className="sm:text-right space-y-2 shrink-0 flex flex-col sm:items-end justify-between">
                      <div>
                        <div className="font-bold text-[#1F9D66] text-base font-mono">{p.amount}</div>
                        <div className="text-[10px] text-[#6B7280] mt-0.5">{p.date}</div>
                      </div>

                      {/* Approval and Decline Buttons for Pending Transactions */}
                      {isPending && (
                        <div className="flex flex-col sm:items-end gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                            <button
                              type="button"
                              onClick={() => handleApproveIncomingPayment(p)}
                              disabled={approvingPaymentId === p.id || decliningPaymentId === p.id}
                              className="px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600"
                            >
                              {approvingPaymentId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              )}
                              <span>Approve &amp; Send Download Link</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeclineModal(p)}
                              disabled={approvingPaymentId === p.id || decliningPaymentId === p.id}
                              className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Lock / Unlock Toggle Button for Catalog Purchases */}
                      {p.purchase_id && !isPending && (
                        <button
                          type="button"
                          onClick={() => handleTogglePurchaseDownload(p)}
                          disabled={togglingDownloadId === p.purchase_id}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                            p.download_enabled_by_admin === false
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                          title={p.download_enabled_by_admin === false ? 'Unlock customer CAD downloads' : 'Lock customer CAD downloads'}
                        >
                          {togglingDownloadId === p.purchase_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : p.download_enabled_by_admin === false ? (
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{p.download_enabled_by_admin === false ? 'Unlock Download' : 'Lock Download'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: LIGHTBOX FOR PAYMENT PROOFS & CHEQUES */}
      {lightboxScreenshotUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxScreenshotUrl(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-[#070D22] border border-[#D4AF37]/50 rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D4AF37]" />
                <h4 className="font-serif text-sm font-bold text-white">{lightboxTitle || 'Payment Proof'}</h4>
              </div>
              <button
                onClick={() => setLightboxScreenshotUrl(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-black/40 rounded-2xl p-2">
              <img
                src={lightboxScreenshotUrl}
                alt="Payment Proof Full"
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
            <div className="flex justify-between items-center text-xs text-[#C9C2A6] pt-1">
              <span>Inspect transaction reference, cheque number, or deposit voucher.</span>
              <a
                href={lightboxScreenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#12204D] hover:bg-[#1A2E60] text-[#F5E7A3] font-bold border border-[#D4AF37]/40 flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Full Size</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DECLINE PAYMENT PROOF WITH REASON */}
      {declineModalItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setDeclineModalItem(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl border border-rose-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-scale-in text-[#17243B]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">Decline Payment Proof</h3>
                  <p className="text-xs text-slate-500">Ref: {declineModalItem.id} — {declineModalItem.client}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeclineModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Item & Amount Badge */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Client / Buyer</span>
                <strong className="text-sm font-bold text-slate-800">{declineModalItem.client}</strong>
                <span className="text-[10px] text-slate-500 block truncate">{declineModalItem.client_email || declineModalItem.buyer_email}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Claimed Amount</span>
                <strong className="text-base font-bold text-emerald-600">{declineModalItem.amount}</strong>
                <span className="text-[10px] text-slate-500 block truncate">{declineModalItem.type}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmDecline} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Select Decline Reason (Visible to Customer)
                </label>
                <div className="space-y-2">
                  {[
                    'UTR / Reference not found in bank statement',
                    'Payment proof screenshot is blurry or incomplete',
                    'Transferred amount does not match product price',
                    'Duplicate transaction reference (already claimed)',
                    'custom'
                  ].map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedDeclineReason === opt
                          ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="declineReason"
                        checked={selectedDeclineReason === opt}
                        onChange={() => setSelectedDeclineReason(opt)}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <span>{opt === 'custom' ? 'Other custom reason (type below)' : opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedDeclineReason === 'custom' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">
                    Custom Decline Message:
                  </label>
                  <textarea
                    rows={3}
                    value={customDeclineReason}
                    onChange={(e) => setCustomDeclineReason(e.target.value)}
                    placeholder="Provide specific details so the customer understands what was missing..."
                    className="w-full p-2.5 rounded-xl border border-rose-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <strong>What happens when you decline:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-[#5A6679]">
                  <li>Customer receives an instant in-app notification and registered email notice.</li>
                  <li>Customer can re-submit updated UTR or receipt from their My Account &gt; Purchases page.</li>
                  <li>Download permission remains securely locked.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeclineModalItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={decliningPaymentId === declineModalItem.id}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {decliningPaymentId === declineModalItem.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>Decline Payment &amp; Notify Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: PROFESSIONAL SETTLEMENT / PAYOUT MODAL */}
      {settleModalItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E8D7B7] shadow-2xl p-6 sm:p-7 space-y-5 animate-scale-in text-[#17243B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C]">
                    {settleModalItem.id}
                  </span>
                  <span className="text-xs font-mono text-[#6B7280]">{settleModalItem.orderNumber}</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-[#17243B]">
                  Settle Modeller Payout
                </h3>
              </div>
              <button
                onClick={() => setSettleModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient & Job Summary */}
            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8D7B7] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-[#6B7280] uppercase block">Modeller Name</span>
                <strong className="text-sm font-bold text-[#17243B]">{settleModalItem.staffName}</strong>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#6B7280] uppercase block">Design Item</span>
                <span className="font-medium text-[#17243B] truncate block">{settleModalItem.designTitle}</span>
              </div>
            </div>

            {/* Financial Status Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Due</span>
                <span className="font-mono font-bold text-sm text-slate-800">
                  ₹{settleModalItem.payoutAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-mono text-emerald-600 uppercase block">Already Paid</span>
                <span className="font-mono font-bold text-sm text-emerald-800">
                  ₹{(settleModalItem.amountPaid || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-mono text-amber-600 uppercase block">Net Balance</span>
                <span className="font-mono font-bold text-sm text-amber-800">
                  ₹{(settleModalItem.balanceDue ?? settleModalItem.payoutAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Settle Form */}
            <form onSubmit={handleConfirmSettlement} className="space-y-4">
              {/* Amount to Settle Now & Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#17243B]">
                    Amount to Settle Now (INR ₹)
                  </label>
                  <span className="text-[11px] text-[#6B7280]">Part or Full Payment</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={settleModalItem.balanceDue ?? settleModalItem.payoutAmount}
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-base focus:border-[#17345C] focus:ring-1 focus:ring-[#17345C]"
                    placeholder="Enter amount to disburse"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSettleAmount(settleModalItem.balanceDue ?? settleModalItem.payoutAmount)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                  >
                    Full Balance (₹{Number(settleModalItem.balanceDue ?? settleModalItem.payoutAmount).toFixed(2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleAmount(Math.round(((settleModalItem.balanceDue ?? settleModalItem.payoutAmount) * 0.5) * 100) / 100)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                  >
                    50% Part (₹{(Math.round(((settleModalItem.balanceDue ?? settleModalItem.payoutAmount) * 0.5) * 100) / 100).toFixed(2)})
                  </button>
                </div>
              </div>

              {/* Payment Channel Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#17243B]">
                  Payment Channel / Disbursement Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                    { id: 'cash', label: 'Cash in Hand', icon: Banknote },
                    { id: 'upi', label: 'UPI / GPay', icon: Smartphone },
                    { id: 'cheque', label: 'Cheque', icon: FileText },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSel = settleMethod === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSettleMethod(mode.id as any)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          isSel
                            ? 'bg-[#17345C] text-white border-[#17345C] font-bold shadow-sm'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference / UTR Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#17243B] block mb-1">
                    {settleMethod === 'cash' ? 'Cash Receipt / Voucher #' : settleMethod === 'upi' ? 'UPI Reference / Txn ID' : 'Bank UTR / Txn Ref'}
                  </label>
                  <input
                    type="text"
                    value={settleTxnRef}
                    onChange={(e) => setSettleTxnRef(e.target.value)}
                    placeholder={settleMethod === 'cash' ? 'e.g. CASH-VOUCHER-01' : 'e.g. UTR123456789'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:border-[#17345C]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#17243B] block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as any).showPicker?.();
                      } catch {}
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:border-[#17345C] cursor-pointer"
                  />
                </div>
              </div>

              {/* Accounting Remarks / Notes */}
              <div>
                <label className="text-xs font-bold text-[#17243B] block mb-1">Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. 50% part payment handed in cash, balance due after review"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-[#17345C]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSettleModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSettle}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#0B1330] hover:brightness-105 text-xs font-extrabold flex items-center gap-1.5 shadow-md"
                >
                  {isSubmittingSettle ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[#0B1330]" />
                  )}
                  <span>Record &amp; Settle ₹{Number(settleAmount || 0).toLocaleString('en-IN')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PRINTABLE VOUCHER / SLIP */}
      {viewSlipItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl border border-[#E8D7B7] shadow-2xl p-6 sm:p-8 space-y-6 text-[#17243B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-serif text-lg font-bold text-[#17243B]">
                  CAD Modeller Settlement Voucher
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setViewSlipItem(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Slip Printable Container */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 space-y-5 text-xs font-sans">
              <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                <div>
                  <h4 className="font-serif text-xl font-bold tracking-tight text-[#17345C]">SHIULI CAD STUDIO</h4>
                  <p className="text-[11px] text-slate-500 font-mono">Bespoke Fine Jewellery CAD Engineering Atelier</p>
                  <p className="text-[10px] text-slate-400">hello@shiulicadstudio.com &bull; +91 95747 87098</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-[#17345C] block">{viewSlipItem.id}</span>
                  <span className="text-[11px] text-slate-500 font-mono block">Order: {viewSlipItem.orderNumber}</span>
                  <span className="text-[10px] text-slate-400 font-mono block">{viewSlipItem.settledAt || 'Date: Active'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Modeller Name</span>
                  <strong className="text-sm font-bold text-slate-900">{viewSlipItem.staffName}</strong>
                  <span className="text-[11px] text-slate-500 block">{viewSlipItem.staffRole}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">CAD Job Description</span>
                  <strong className="text-sm font-bold text-slate-900">{viewSlipItem.designTitle}</strong>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase text-slate-600">
                    <tr>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Disbursement Channel</th>
                      <th className="p-2.5">Reference ID</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5">Completed CAD Modeling Fee</td>
                      <td className="p-2.5 capitalize">{viewSlipItem.paymentMethod || 'Bank Transfer'}</td>
                      <td className="p-2.5 text-slate-500">{viewSlipItem.transactionRef || 'NEFT-AUTO'}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">₹{viewSlipItem.payoutAmount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right font-bold text-slate-600">Settled to Date:</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700">₹{(viewSlipItem.amountPaid || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    {viewSlipItem.balanceDue !== undefined && viewSlipItem.balanceDue > 0 && (
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right font-bold text-amber-700">Remaining Due:</td>
                        <td className="p-2.5 text-right font-bold text-amber-700">₹{viewSlipItem.balanceDue.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {viewSlipItem.notes && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-600">
                  <strong className="text-slate-800">Remarks:</strong> {viewSlipItem.notes}
                </div>
              )}

              <div className="pt-6 flex justify-between text-[11px] text-slate-500 border-t border-slate-200">
                <div>
                  <div className="w-28 border-b border-slate-400 mb-1"></div>
                  <span>Authorized Signature</span>
                </div>
                <div>
                  <div className="w-28 border-b border-slate-400 mb-1"></div>
                  <span>Artisan Receiver</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD CLIENT OFFLINE / CASH PAYMENT MODAL */}
      {isClientPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E8D7B7] shadow-2xl p-6 sm:p-7 space-y-4 text-[#17243B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#17243B]">
                  Record Client Payment
                </h3>
                <p className="text-xs text-[#6B7280]">Log client cash, direct UPI, or bank deposit</p>
              </div>
              <button
                onClick={() => setIsClientPaymentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordClientPaymentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#17243B] block mb-1">Client Name / Business Atelier</label>
                <input
                  type="text"
                  required
                  value={clientPayClientName}
                  onChange={(e) => setClientPayClientName(e.target.value)}
                  placeholder="e.g. Vikram Mehta / Atelier Gems"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-[#17243B] block mb-1">Order # or Reference</label>
                <input
                  type="text"
                  value={clientPayOrderRef}
                  onChange={(e) => setClientPayOrderRef(e.target.value)}
                  placeholder="e.g. ORD-9 or REQ #12"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-[#17243B] block mb-1">Payment Stage / Purpose</label>
                <select
                  value={clientPayType}
                  onChange={(e) => setClientPayType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="Custom CAD Booking (10%)">Custom CAD Booking (10% Advance)</option>
                  <option value="Design Approval Milestone (30%)">Design Approval Milestone (30%)</option>
                  <option value="Final CAD Delivery (60%)">Final CAD Delivery (60% Balance)</option>
                  <option value="Store Product Purchase">Direct Ready 3DM/STL Purchase</option>
                  <option value="Custom Part Payment">Custom Part Payment / Settlement</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#17243B] block mb-1">Amount Collected (INR ₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={clientPayAmount}
                    onChange={(e) => setClientPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm"
                    placeholder="e.g. 15000"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#17243B] block mb-1">Collection Channel</label>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    { id: 'cash', label: 'Cash in Hand' },
                    { id: 'upi', label: 'Direct UPI / QR' },
                    { id: 'bank_transfer', label: 'Bank Transfer / NEFT' },
                    { id: 'cheque', label: 'Cheque / Draft' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setClientPayMethod(m.id as any)}
                      className={`p-2 rounded-lg border font-bold text-center transition-all ${
                        clientPayMethod === m.id
                          ? 'bg-[#17345C] text-white border-[#17345C]'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#17243B] block mb-1">Transaction Ref / Receipt No.</label>
                <input
                  type="text"
                  value={clientPayTxnRef}
                  onChange={(e) => setClientPayTxnRef(e.target.value)}
                  placeholder="e.g. UPI-REF-9921 or CASH-04"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsClientPaymentModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#17345C] text-white font-bold text-xs hover:bg-[#0B1330] transition-colors"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
