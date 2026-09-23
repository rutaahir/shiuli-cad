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
  Receipt
} from 'lucide-react';

interface GatewayLogRecord {
  id: string;
  purchase_id?: number;
  payment_id?: number;
  order_id?: number;
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
  payment_method?: string;
  payment_details?: string;
  screenshot?: string | null;
  date: string;
  created_at_iso?: string;
}

export const AdminPaymentsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settlements' | 'client-payments'>('settlements');
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState<boolean>(true);
  const [clientPayments, setClientPayments] = useState<GatewayLogRecord[]>([]);
  const [loadingGatewayLogs, setLoadingGatewayLogs] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Payment Verification Approval & Lightbox State
  const [approvingPaymentId, setApprovingPaymentId] = useState<string | null>(null);
  const [lightboxScreenshotUrl, setLightboxScreenshotUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

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

  const handleApproveIncomingPayment = async (p: GatewayLogRecord) => {
    const buyerEmail = p.client_email || p.buyer_email || p.client;
    if (!window.confirm(`Are you sure you want to confirm collection of ${p.amount} from ${p.client}? This will mark the purchase as PAID, enable secure CAD download, and send the verification OTP code to ${buyerEmail}.`)) {
      return;
    }
    setApprovingPaymentId(p.id);
    try {
      if (p.purchase_id) {
        await api.adminApprovePurchase(p.purchase_id);
      } else if (p.payment_id) {
        await api.adminApprovePayment(p.payment_id);
      }
      alert(`Success! Payment ${p.id} confirmed as collected. CAD download option has been enabled for ${buyerEmail}.`);
      await fetchGatewayLogs();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve payment.');
    } finally {
      setApprovingPaymentId(null);
    }
  };

  useEffect(() => {
    fetchSettlements();
    fetchGatewayLogs();
  }, []);

  const unpaidItems = settlements.filter((s) => s.status !== 'settled');
  const totalUnpaidAmount = unpaidItems.reduce((acc, it) => acc + (it.balanceDue ?? it.payoutAmount), 0);
  const totalSettledAmount = settlements.reduce((acc, it) => acc + (it.amountPaid || 0), 0);
  const totalCommitted = settlements.reduce((acc, it) => acc + it.payoutAmount, 0);

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
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
                Financial Control & Settlements
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#E8EEFF] text-[#2856C7]">
                Live Ledger
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1 max-w-2xl leading-relaxed">
              Track custom CAD project finances: audit incoming client deposits and record full or partial payouts to your CAD artisans (via Cash, UPI, or Bank Transfer).
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-[#F6F7FB] p-1 rounded-xl border border-[#E5E7EF] text-xs font-semibold">
              <button
                onClick={() => setActiveTab('settlements')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'settlements' ? 'bg-[#0D1B4C] text-white shadow' : 'text-[#6B7280] hover:text-[#1E2230]'
                }`}
              >
                Staff Settlements ({settlements.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('client-payments');
                  fetchGatewayLogs();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'client-payments' ? 'bg-[#0D1B4C] text-white shadow' : 'text-[#6B7280] hover:text-[#1E2230]'
                }`}
              >
                Client Gateway ({clientPayments.length})
              </button>
            </div>

            <button
              onClick={fetchSettlements}
              disabled={loadingSettlements}
              className="p-2 rounded-xl border border-[#E5E7EF] text-[#6B7280] hover:text-[#1E2230] hover:bg-[#F6F7FB] transition-colors"
              title="Refresh Live Ledger"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSettlements || loadingGatewayLogs ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EF] text-[#1E2230] hover:bg-[#F6F7FB] text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1F9D66]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-[#E5E7EF]">
          <div className="p-3.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] space-y-1">
            <span className="text-[11px] font-mono text-[#6B7280] uppercase block">Total Payouts Committed</span>
            <div className="text-xl font-bold font-mono text-[#1E2230]">
              ₹{totalCommitted.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-[#6B7280]">Total artisan labor value across completed jobs</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
            <span className="text-[11px] font-mono text-emerald-700 uppercase block">Settled to Artisans</span>
            <div className="text-xl font-bold font-mono text-emerald-800">
              ₹{totalSettledAmount.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-600">Disbursed via Cash, UPI, and Bank Transfers</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
            <span className="text-[11px] font-mono text-amber-700 uppercase block">Pending Balance Due</span>
            <div className="text-xl font-bold font-mono text-amber-800">
              ₹{totalUnpaidAmount.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-amber-600">{unpaidItems.length} job(s) awaiting full or part settlement</span>
          </div>
        </div>
      </div>

      {activeTab === 'settlements' ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-[#E5E7EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-semibold text-[#1E2230] flex items-center gap-2">
              <span>Completed CAD Jobs &amp; Modeller Payout Ledger</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#E8EEFF] text-[#2856C7] font-semibold">
                {unpaidItems.length} Pending
              </span>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkBatchSettle}
                className="btn-gold-luxury px-4 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0D1B4C]" />
                <span>Batch Settle {selectedIds.length} Job(s)</span>
              </button>
            )}
          </div>

          {loadingSettlements ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2856C7] animate-spin" />
              <p className="text-xs font-mono text-[#6B7280]">Loading live staff settlements...</p>
            </div>
          ) : settlements.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-[#9CA3AF] mx-auto" />
              <p className="text-sm font-semibold text-[#1E2230]">No Settlements Logged</p>
              <p className="text-xs text-[#6B7280]">
                Completed CAD orders will automatically generate modeller payout entries here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F6F7FB] border-b border-[#E5E7EF] text-[11px] font-mono uppercase text-[#6B7280]">
                    <th className="p-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === unpaidItems.length && unpaidItems.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-[#E5E7EF] text-[#C9A227] focus:ring-0"
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
                <tbody className="divide-y divide-[#E5E7EF] text-xs">
                  {settlements.map((set) => {
                    const isFullySettled = set.status === 'settled';
                    const isPartial = set.status === 'partial';
                    const isSelected = selectedIds.includes(set.id);

                    return (
                      <tr key={set.id} className="hover:bg-[#F6F7FB] transition-colors">
                        <td className="p-3.5">
                          {!isFullySettled ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(set.id)}
                              className="rounded border-[#E5E7EF] text-[#C9A227] focus:ring-0"
                            />
                          ) : (
                            <span className="text-[#1F9D66] font-bold">✓</span>
                          )}
                        </td>

                        <td className="p-3.5 font-bold text-[#1E2230]">
                          <div className="flex items-center gap-1.5">
                            <span>{set.staffName}</span>
                          </div>
                          <span className="text-[10px] text-[#6B7280] font-normal block">{set.staffRole}</span>
                        </td>

                        <td className="p-3.5 font-mono text-[#2856C7] font-semibold">
                          {set.orderNumber}
                        </td>

                        <td className="p-3.5 text-[#1E2230] font-medium max-w-xs truncate" title={set.designTitle}>
                          {set.designTitle}
                        </td>

                        <td className="p-3.5 font-mono font-bold text-[#1E2230]">
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
                              className="px-3 py-1.5 rounded-lg bg-[#0D1B4C] hover:bg-[#16275E] text-white font-bold text-xs shadow-sm transition-all inline-flex items-center gap-1 cursor-pointer"
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
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EF] pb-3">
            <div>
              <div className="text-xs font-semibold text-[#1E2230] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2856C7]" />
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
          {clientPayments.some((p) => p.can_approve || p.raw_status === 'pending') && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <strong className="font-bold text-amber-950 text-xs">Payment Verification Required:</strong>{' '}
                  <span className="text-amber-900">
                    {clientPayments.filter((p) => p.can_approve || p.raw_status === 'pending').length} client payment request(s) awaiting collection confirmation. Confirm receipt to enable their CAD file download.
                  </span>
                </div>
              </div>
            </div>
          )}

          {loadingGatewayLogs ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2856C7] animate-spin" />
              <p className="text-xs font-mono text-[#6B7280]">Auditing live incoming transactions...</p>
            </div>
          ) : clientPayments.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ArrowDownLeft className="w-10 h-10 text-[#9CA3AF] mx-auto" />
              <p className="text-sm font-semibold text-[#1E2230]">No Incoming Payments Found</p>
              <p className="text-xs text-[#6B7280]">
                Client deposit payments and store purchases will record live gateway transaction logs here.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-xs font-mono">
              {clientPayments.map((p) => {
                const isPending = p.can_approve || p.raw_status === 'pending';
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isPending
                        ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400 shadow-sm'
                        : 'bg-[#F6F7FB] border-[#E5E7EF] hover:border-[#2856C7]/30'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="font-bold text-[#1E2230] flex items-center gap-2 flex-wrap">
                        <span className="text-[#2856C7]">{p.id}</span>
                        <span>—</span>
                        <span className="text-sm text-[#1E2230]">{p.client}</span>
                        {p.client_email && (
                          <span className="text-[11px] text-slate-500 font-normal">({p.client_email})</span>
                        )}
                        {p.buyer_email && !p.client_email && (
                          <span className="text-[11px] text-slate-500 font-normal">({p.buyer_email})</span>
                        )}
                      </div>

                      <div className="text-[10px] text-[#6B7280] flex items-center gap-2 flex-wrap">
                        <span className="bg-[#E8EEFF] text-[#2856C7] px-2 py-0.5 rounded font-semibold">
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
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid &amp; Download Enabled
                          </span>
                        )}
                      </div>

                      {/* Customer Details Note */}
                      {p.payment_details && (
                        <div className="text-[11px] font-sans text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 max-w-xl">
                          <strong className="font-semibold text-slate-900 block text-[10px] uppercase font-mono text-[#2856C7]">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#2856C7]/30 text-[#2856C7] hover:bg-[#E8EEFF] transition-colors font-bold text-[11px] cursor-pointer shadow-2xs"
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
                        <div className="font-bold text-[#1F9D66] text-base">{p.amount}</div>
                        <div className="text-[10px] text-[#6B7280]">{p.date}</div>
                      </div>

                      {/* Approval Button for Pending Transactions */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleApproveIncomingPayment(p)}
                          disabled={approvingPaymentId === p.id}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {approvingPaymentId === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          )}
                          <span>Confirm Payment Collected &amp; Enable Download</span>
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

      {/* MODAL 1: PROFESSIONAL SETTLEMENT / PAYOUT MODAL */}
      {settleModalItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E5E7EF] shadow-2xl p-6 sm:p-7 space-y-5 animate-scale-in text-[#1E2230]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EF]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#E8EEFF] text-[#2856C7]">
                    {settleModalItem.id}
                  </span>
                  <span className="text-xs font-mono text-[#6B7280]">{settleModalItem.orderNumber}</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-[#1E2230]">
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
            <div className="p-3.5 rounded-2xl bg-[#F6F7FB] border border-[#E5E7EF] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-[#6B7280] uppercase block">Modeller Name</span>
                <strong className="text-sm font-bold text-[#1E2230]">{settleModalItem.staffName}</strong>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#6B7280] uppercase block">Design Item</span>
                <span className="font-medium text-[#1E2230] truncate block">{settleModalItem.designTitle}</span>
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
                  <label className="text-xs font-bold text-[#1E2230]">
                    Amount to Settle Now (INR ₹)
                  </label>
                  <span className="text-[11px] text-[#6B7280]">Part or Full Payment</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={settleModalItem.balanceDue ?? settleModalItem.payoutAmount}
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-base focus:border-[#0D1B4C] focus:ring-1 focus:ring-[#0D1B4C]"
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
                    Full Balance (₹{settleModalItem.balanceDue ?? settleModalItem.payoutAmount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleAmount(Math.round((settleModalItem.balanceDue ?? settleModalItem.payoutAmount) * 0.5))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                  >
                    50% Part (₹{Math.round((settleModalItem.balanceDue ?? settleModalItem.payoutAmount) * 0.5)})
                  </button>
                </div>
              </div>

              {/* Payment Channel Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E2230]">
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
                            ? 'bg-[#0D1B4C] text-white border-[#0D1B4C] font-bold shadow-sm'
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
                  <label className="text-xs font-bold text-[#1E2230] block mb-1">
                    {settleMethod === 'cash' ? 'Cash Receipt / Voucher #' : settleMethod === 'upi' ? 'UPI Reference / Txn ID' : 'Bank UTR / Txn Ref'}
                  </label>
                  <input
                    type="text"
                    value={settleTxnRef}
                    onChange={(e) => setSettleTxnRef(e.target.value)}
                    placeholder={settleMethod === 'cash' ? 'e.g. CASH-VOUCHER-01' : 'e.g. UTR123456789'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:border-[#0D1B4C]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1E2230] block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:border-[#0D1B4C]"
                  />
                </div>
              </div>

              {/* Accounting Remarks / Notes */}
              <div>
                <label className="text-xs font-bold text-[#1E2230] block mb-1">Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. 50% part payment handed in cash, balance due after review"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-[#0D1B4C]"
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
          <div className="relative w-full max-w-xl bg-white rounded-3xl border border-[#E5E7EF] shadow-2xl p-6 sm:p-8 space-y-6 text-[#1E2230]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EF]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-serif text-lg font-bold text-[#1E2230]">
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
                  <h4 className="font-serif text-xl font-bold tracking-tight text-[#0D1B4C]">SHIULI CAD STUDIO</h4>
                  <p className="text-[11px] text-slate-500 font-mono">Bespoke Fine Jewellery CAD Engineering Atelier</p>
                  <p className="text-[10px] text-slate-400">hello@shiulicadstudio.com &bull; +91 95747 87098</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-[#0D1B4C] block">{viewSlipItem.id}</span>
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
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E5E7EF] shadow-2xl p-6 sm:p-7 space-y-4 text-[#1E2230]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EF]">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1E2230]">
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
                <label className="font-bold text-[#1E2230] block mb-1">Client Name / Business Atelier</label>
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
                <label className="font-bold text-[#1E2230] block mb-1">Order # or Reference</label>
                <input
                  type="text"
                  value={clientPayOrderRef}
                  onChange={(e) => setClientPayOrderRef(e.target.value)}
                  placeholder="e.g. ORD-9 or REQ #12"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-[#1E2230] block mb-1">Payment Stage / Purpose</label>
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
                <label className="font-bold text-[#1E2230] block mb-1">Amount Collected (INR ₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={clientPayAmount}
                    onChange={(e) => setClientPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm"
                    placeholder="e.g. 15000"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1E2230] block mb-1">Collection Channel</label>
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
                          ? 'bg-[#0D1B4C] text-white border-[#0D1B4C]'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1E2230] block mb-1">Transaction Ref / Receipt No.</label>
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
                  className="px-4 py-2 rounded-xl bg-[#0D1B4C] text-white font-bold text-xs hover:bg-[#16275E] transition-colors"
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
