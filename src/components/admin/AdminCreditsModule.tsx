import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  DollarSign,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  Edit2,
  Plus,
  Minus,
  FileText,
  AlertTriangle,
  Receipt,
  Building2,
  Coins,
  Check,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import {
  ClientWallet,
  ClientCreditAccount,
  WalletCreditTransaction,
  AdminClientCreditItem,
  AdminCreditMetrics
} from '../../types';

export const AdminCreditsModule: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<AdminCreditMetrics>({
    total_wallet_float: 0,
    total_credit_granted: 0,
    total_credit_used: 0,
    total_credit_available: 0,
    pending_verifications_count: 0,
    active_credit_clients_count: 0,
  });
  const [clients, setClients] = useState<AdminClientCreditItem[]>([]);
  const [pendingTxs, setPendingTxs] = useState<WalletCreditTransaction[]>([]);
  const [auditTxs, setAuditTxs] = useState<WalletCreditTransaction[]>([]);

  const [activeTab, setActiveTab] = useState<'directory' | 'verification' | 'ledger'>('directory');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active_credit' | 'has_wallet' | 'has_debt'>('all');

  // Modals
  const [selectedClientForLimit, setSelectedClientForLimit] = useState<AdminClientCreditItem | null>(null);
  const [limitInput, setLimitInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<'active' | 'suspended' | 'disabled'>('active');
  const [notesInput, setNotesInput] = useState<string>('');
  const [savingLimit, setSavingLimit] = useState<boolean>(false);

  const [selectedClientForWallet, setSelectedClientForWallet] = useState<AdminClientCreditItem | null>(null);
  const [walletAction, setWalletAction] = useState<'credit' | 'debit'>('credit');
  const [walletAmountInput, setWalletAmountInput] = useState<string>('');
  const [walletNotesInput, setWalletNotesInput] = useState<string>('');
  const [savingWallet, setSavingWallet] = useState<boolean>(false);

  const [inspectScreenshot, setInspectScreenshot] = useState<string | null>(null);
  const [processingTxId, setProcessingTxId] = useState<number | null>(null);

  const fetchCreditsData = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminClientCredits();
      if (res) {
        if (res.metrics) setMetrics(res.metrics);
        if (Array.isArray(res.clients)) setClients(res.clients);
        if (Array.isArray(res.pending_verifications)) setPendingTxs(res.pending_verifications);
        if (Array.isArray(res.recent_audit_transactions)) setAuditTxs(res.recent_audit_transactions);
      }
    } catch (e) {
      console.warn('Failed to load admin client credits data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditsData();
  }, []);

  const handleOpenLimitModal = (client: AdminClientCreditItem) => {
    setSelectedClientForLimit(client);
    setLimitInput(String(client.credit_account.credit_limit || '0'));
    setStatusInput(client.credit_account.status || 'active');
    setNotesInput(client.credit_account.notes || '');
  };

  const handleSaveLimit = async () => {
    if (!selectedClientForLimit) return;
    setSavingLimit(true);
    try {
      await api.adminSetCreditLimit({
        client_id: selectedClientForLimit.id,
        credit_limit: parseFloat(limitInput) || 0,
        status: statusInput,
        notes: notesInput,
      });
      setSelectedClientForLimit(null);
      await fetchCreditsData();
    } catch (e: any) {
      alert(e?.message || 'Failed to update credit limit.');
    } finally {
      setSavingLimit(false);
    }
  };

  const handleOpenWalletModal = (client: AdminClientCreditItem) => {
    setSelectedClientForWallet(client);
    setWalletAction('credit');
    setWalletAmountInput('');
    setWalletNotesInput('');
  };

  const handleSaveWallet = async () => {
    if (!selectedClientForWallet) return;
    const amount = parseFloat(walletAmountInput);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive dollar amount.');
      return;
    }
    setSavingWallet(true);
    try {
      await api.adminAdjustWallet({
        client_id: selectedClientForWallet.id,
        amount,
        action: walletAction,
        notes: walletNotesInput || 'Admin manual balance adjustment',
      });
      setSelectedClientForWallet(null);
      await fetchCreditsData();
    } catch (e: any) {
      alert(e?.message || 'Failed to adjust wallet balance.');
    } finally {
      setSavingWallet(false);
    }
  };

  const handleVerifyTx = async (txId: number, decision: 'approve' | 'decline') => {
    setProcessingTxId(txId);
    try {
      await api.adminVerifyCreditTransaction({
        transaction_id: txId,
        decision,
      });
      await fetchCreditsData();
    } catch (e: any) {
      alert(e?.message || 'Failed to verify transaction.');
    } finally {
      setProcessingTxId(null);
    }
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q);

    if (!matchSearch) return false;

    if (statusFilter === 'active_credit') {
      return c.credit_account.status === 'active' && Number(c.credit_account.credit_limit) > 0;
    }
    if (statusFilter === 'has_wallet') {
      return Number(c.wallet.balance) > 0;
    }
    if (statusFilter === 'has_debt') {
      return Number(c.credit_account.used_credit) > 0;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Module Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8D7B7]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8C7A58] uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
            <span>VIP Liquidity &amp; Corporate Purchasing Suite</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#17243B] tracking-tight">
            Client Credits &amp; Prepaid Wallets
          </h2>
          <p className="text-xs text-[#5A6679]">
            Grant postpaid revolving credit lines to VIP jewelry studios, manage prepaid wallets, and approve bill repayments.
          </p>
        </div>

        <button
          onClick={fetchCreditsData}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white border border-[#E8D7B7] text-[#17345C] hover:bg-[#FAF8F5] text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C9A227]' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* 4 Core Financial KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Prepaid Wallet Float */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm space-y-1.5 hover:border-[#C9A227]/40 transition-all">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-sans">
              <Wallet className="w-3.5 h-3.5 text-[#1F9D66]" />
              Prepaid Wallet Float
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Customer Cash
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#0B1330] tracking-tight">
            ${metrics.total_wallet_float.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-sans">
            Advance funds deposited by studios for 1-click purchases
          </div>
        </div>

        {/* Card 2: Total Credit Line Granted */}
        <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-1.5 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-xs text-blue-900">
            <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-sans">
              <CreditCard className="w-3.5 h-3.5 text-blue-700" />
              Corporate Credit Limit
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
              {metrics.active_credit_clients_count} VIP Studios
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-950 tracking-tight">
            ${metrics.total_credit_granted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-blue-700 font-sans">
            Approved post-paid buying limits granted by SuperAdmin
          </div>
        </div>

        {/* Card 3: Active Used Credit (Receivables Due) */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-1.5 hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-xs text-amber-900">
            <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-sans">
              <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
              Outstanding Credit Used
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Receivables
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-950 tracking-tight">
            ${metrics.total_credit_used.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-800 font-sans">
            Used on credit purchases, awaiting client bill settlement
          </div>
        </div>

        {/* Card 4: Verification Queue Alert */}
        <div className={`p-4 rounded-2xl border shadow-sm space-y-1.5 transition-all ${
          metrics.pending_verifications_count > 0
            ? 'bg-gradient-to-br from-[#FFF9F0] to-[#FFF0D4] border-[#D4AF37]'
            : 'bg-white border-[#E8D7B7]'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-sans text-[#17345C]">
              <Clock className="w-3.5 h-3.5 text-[#B88732]" />
              Verification Queue
            </span>
            {metrics.pending_verifications_count > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500 text-white animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-[#0B1330] tracking-tight">
            {metrics.pending_verifications_count} Pending
          </div>
          <div className="text-[11px] text-[#5A6679] font-sans">
            Client top-up slips &amp; credit repayment receipts to verify
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8D7B7]">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'directory'
              ? 'border-[#B88732] text-[#B88732]'
              : 'border-transparent text-[#5A6679] hover:text-[#17243B]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Client Directory ({filteredClients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'verification'
              ? 'border-[#B88732] text-[#B88732]'
              : 'border-transparent text-[#5A6679] hover:text-[#17243B]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Verification Queue</span>
          {pendingTxs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#17345C] text-[#FFF9F0] text-[10px] font-mono font-bold">
              {pendingTxs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-[#B88732] text-[#B88732]'
              : 'border-transparent text-[#5A6679] hover:text-[#17243B]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Master Audit Ledger</span>
        </button>
      </div>

      {/* ─── TAB 1: CLIENT DIRECTORY ────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8D7B7]">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by client name, email, phone..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E8D7B7] text-xs font-medium text-[#17243B] focus:outline-none focus:border-[#B88732]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-[#5A6679] font-medium hidden sm:inline">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-white border border-[#E8D7B7] text-xs font-semibold text-[#17243B] focus:outline-none focus:border-[#B88732]"
              >
                <option value="all">All Clients ({clients.length})</option>
                <option value="active_credit">Active Credit Lines</option>
                <option value="has_wallet">Has Prepaid Wallet Balance</option>
                <option value="has_debt">Has Outstanding Bill / Debt</option>
              </select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-2xl border border-[#E8D7B7] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E8D7B7] text-[10px] uppercase font-mono font-bold text-[#8C7A58] tracking-wider">
                    <th className="p-3.5">Client &amp; Contact</th>
                    <th className="p-3.5">Prepaid Wallet</th>
                    <th className="p-3.5">Corporate Credit Line</th>
                    <th className="p-3.5">Credit Utilization</th>
                    <th className="p-3.5">Credit Status</th>
                    <th className="p-3.5 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D7B7]/60 text-xs">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#5A6679]">
                        No client records found matching search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => {
                      const limit = Number(client.credit_account.credit_limit || 0);
                      const used = Number(client.credit_account.used_credit || 0);
                      const avail = Number(client.credit_account.available_credit || 0);
                      const walletBal = Number(client.wallet.balance || 0);
                      const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                      const hasActiveCredit = client.credit_account.status === 'active' && limit > 0;

                      return (
                        <tr key={client.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                          {/* Client Info */}
                          <td className="p-3.5">
                            <div className="font-bold text-[#17243B] font-serif">{client.name}</div>
                            <div className="text-[11px] text-[#5A6679] font-mono">{client.email}</div>
                            {client.phone && (
                              <div className="text-[10px] text-slate-400 font-mono">{client.phone}</div>
                            )}
                          </td>

                          {/* Prepaid Wallet */}
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-emerald-800 text-sm">
                              ${walletBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                            </div>
                            <span className="text-[10px] text-emerald-600 font-mono block">
                              ≈ ₹{Math.round(walletBal * 86.85).toLocaleString('en-IN')} INR
                            </span>
                          </td>

                          {/* Corporate Credit Line */}
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-[#17345C] text-sm">
                              ${avail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <span className="text-[10px] text-slate-400 font-normal"> / ${limit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              Avail: ≈ ₹{Math.round(avail * 86.85).toLocaleString('en-IN')} INR
                            </div>
                            {used > 0 && (
                              <div className="text-[10px] font-mono text-amber-700">
                                Debt: ${used.toFixed(2)} USD (~ ₹{Math.round(used * 86.85).toLocaleString('en-IN')})
                              </div>
                            )}
                          </td>

                          {/* Utilization Bar */}
                          <td className="p-3.5 min-w-[130px]">
                            {limit > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="text-slate-500">{pct}% Used</span>
                                  <span className="text-emerald-700 font-semibold">${avail.toFixed(0)} left</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">No Credit Line</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                client.credit_account.status === 'active' && limit > 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : client.credit_account.status === 'suspended'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {client.credit_account.status === 'active' && limit > 0 ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Active VIP Line</span>
                                </>
                              ) : client.credit_account.status === 'suspended' ? (
                                <>
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>Suspended</span>
                                </>
                              ) : (
                                <span>Standard Account</span>
                              )}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Credit Limit */}
                              <button
                                onClick={() => handleOpenLimitModal(client)}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-semibold flex items-center gap-1 border border-blue-200 cursor-pointer transition-colors shadow-2xs"
                                title="Adjust Corporate Credit Limit"
                              >
                                <CreditCard className="w-3 h-3 text-blue-700" />
                                <span>Credit Line</span>
                              </button>

                              {/* Adjust Wallet Balance */}
                              <button
                                onClick={() => handleOpenWalletModal(client)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[11px] font-semibold flex items-center gap-1 border border-emerald-200 cursor-pointer transition-colors shadow-2xs"
                                title="Deposit or Debit Wallet"
                              >
                                <Coins className="w-3 h-3 text-emerald-700" />
                                <span>Wallet</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: VERIFICATION QUEUE ──────────────────────────────────────── */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#17243B]">
              Pending Payment Slips &amp; Statements Requiring Approval ({pendingTxs.length})
            </h3>
            <span className="text-xs text-[#5A6679]">
              Approving top-ups credits the client wallet. Approving repayments reduces corporate credit debt.
            </span>
          </div>

          {pendingTxs.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#E8D7B7] space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-serif font-bold text-lg text-[#17243B]">All Clear in Verification Queue</h4>
              <p className="text-xs text-[#5A6679] max-w-md mx-auto">
                No client wallet top-up deposits or credit repayments are currently waiting for admin authorization.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingTxs.map((tx) => {
                const isTopup = tx.transaction_type === 'topup';
                const isRepay = tx.transaction_type === 'repayment';
                const isProcessing = processingTxId === tx.id;

                return (
                  <div
                    key={tx.id}
                    className="p-5 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm space-y-3 hover:border-[#C9A227]/60 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                          isTopup
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {isTopup ? <Coins className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        {isTopup ? 'Wallet Deposit Top-up' : 'Credit Line Repayment'}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#17243B]">
                        TX #{tx.id}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <div className="text-xs font-bold text-[#17243B]">{tx.user_name}</div>
                        <div className="text-[11px] text-[#5A6679] font-mono">{tx.user_email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-mono font-extrabold text-[#0B1330]">
                          ${Number(tx.amount).toFixed(2)} USD
                        </div>
                        <div className="text-[10.5px] text-emerald-700 font-mono font-bold">
                          ≈ ₹{Math.round(Number(tx.amount) * 86.85).toLocaleString('en-IN')} INR
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono uppercase">
                          Via {tx.payment_method || 'Bank Transfer'}
                        </div>
                      </div>
                    </div>

                    {tx.transaction_ref && (
                      <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7]/60 text-xs font-mono flex items-center justify-between">
                        <span className="text-slate-500 text-[10px]">Reference / UTR:</span>
                        <span className="font-bold text-[#17345C]">{tx.transaction_ref}</span>
                      </div>
                    )}

                    {tx.notes && (
                      <div className="text-xs text-[#5A6679] italic bg-slate-50 p-2 rounded-lg">
                        "{tx.notes}"
                      </div>
                    )}

                    {/* Screenshot Preview */}
                    {tx.screenshot_url && (
                      <button
                        onClick={() => setInspectScreenshot(tx.screenshot_url || null)}
                        className="w-full py-2 px-3 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] hover:border-[#B88732] text-xs font-semibold text-[#17345C] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#B88732]" />
                        <span>Inspect Bank Slip / Screenshot</span>
                      </button>
                    )}

                    {/* Decision Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8D7B7]/60">
                      <button
                        disabled={isProcessing}
                        onClick={() => handleVerifyTx(tx.id, 'decline')}
                        className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline Slip</span>
                      </button>

                      <button
                        disabled={isProcessing}
                        onClick={() => handleVerifyTx(tx.id, 'approve')}
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Approve &amp; Settle</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: MASTER AUDIT LEDGER ─────────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-[#E8D7B7] overflow-hidden shadow-xs">
          <div className="p-4 bg-[#FAF8F5] border-b border-[#E8D7B7] flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-[#17243B]">
              Real-time Liquidity &amp; Ledger Audit Trail
            </h3>
            <span className="text-xs text-[#5A6679]">
              Latest {auditTxs.length} balance &amp; credit transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E8D7B7] text-[10px] uppercase font-mono font-bold text-[#8C7A58] tracking-wider">
                  <th className="p-3.5">Date &amp; Time</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Instrument</th>
                  <th className="p-3.5">Transaction Type</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Running Balance</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Reference &amp; Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D7B7]/60 text-xs">
                {auditTxs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#5A6679]">
                      No audit transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditTxs.map((tx) => {
                    const isWallet = tx.account_type === 'wallet';
                    return (
                      <tr key={tx.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                        <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-[#17243B]">{tx.user_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{tx.user_email}</div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isWallet ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                          }`}>
                            {isWallet ? 'Prepaid Wallet' : 'Corporate Credit'}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-[#17345C] capitalize">
                          {tx.transaction_type.replace('_', ' ')}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-sm">
                          ${Number(tx.amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          ${Number(tx.running_balance).toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            tx.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : tx.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-xs truncate text-[11px] text-slate-600">
                          {tx.notes || tx.reference_title || tx.transaction_ref || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: SET / EDIT CORPORATE CREDIT LINE ──────────────────────── */}
      {selectedClientForLimit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E8D7B7] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#17243B]">
                  Corporate Credit Facility
                </h3>
                <p className="text-xs text-[#5A6679]">
                  Manage revolving line of credit for {selectedClientForLimit.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedClientForLimit(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">
                  Credit Limit (USD $)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">$</span>
                  <input
                    type="number"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E8D7B7] text-sm font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#B88732]"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 mt-2 flex items-center justify-between">
                  <span>Customer Views in Country Currency:</span>
                  <strong className="font-mono text-blue-950 font-bold">
                    ≈ ₹{Math.round(Number(limitInput || 0) * 86.85).toLocaleString('en-IN')} INR
                  </strong>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[500, 1000, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLimitInput(String(preset))}
                      className="px-2 py-1 rounded bg-[#FAF8F5] hover:bg-[#FFF9F0] border border-[#E8D7B7] text-[10px] font-mono font-bold text-[#17345C] cursor-pointer"
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">
                  Credit Line Status
                </label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8D7B7] text-xs font-semibold text-[#17243B] focus:outline-none focus:border-[#B88732]"
                >
                  <option value="active">Active (Client can purchase on credit)</option>
                  <option value="suspended">Suspended (Frozen; no new credit orders)</option>
                  <option value="disabled">Disabled (No credit facility)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">
                  Private Studio Notes (Terms &amp; Risk Assessment)
                </label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g. Verified Surat diamond manufacturer, net-30 invoicing, authorized by Harshil."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-[#E8D7B7] text-xs text-[#17243B] focus:outline-none focus:border-[#B88732]"
                />
              </div>

              {Number(selectedClientForLimit.credit_account.used_credit) > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <span>Current Outstanding Debt:</span>
                  <strong className="font-mono">${Number(selectedClientForLimit.credit_account.used_credit).toFixed(2)} USD</strong>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8D7B7]">
              <button
                onClick={() => setSelectedClientForLimit(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={savingLimit}
                onClick={handleSaveLimit}
                className="btn-gold-luxury px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {savingLimit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />}
                <span>Save Facility</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ADJUST CLIENT PREPAID WALLET ──────────────────────────── */}
      {selectedClientForWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E8D7B7] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#17243B]">
                  Prepaid Wallet Balance
                </h3>
                <p className="text-xs text-[#5A6679]">
                  Credit bonus funds or adjust balance for {selectedClientForWallet.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedClientForWallet(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                <span>Current Real Balance:</span>
                <strong className="font-mono text-sm">${Number(selectedClientForWallet.wallet.balance).toFixed(2)} USD</strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalletAction('credit')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      walletAction === 'credit'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Credit (Add Funds)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalletAction('debit')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      walletAction === 'debit'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Debit (Deduct Funds)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">Amount (USD $)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">$</span>
                  <input
                    type="number"
                    value={walletAmountInput}
                    onChange={(e) => setWalletAmountInput(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E8D7B7] text-sm font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#B88732]"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 mt-2 flex items-center justify-between">
                  <span>Customer Views Converted Float:</span>
                  <strong className="font-mono text-emerald-950 font-bold">
                    ≈ ₹{Math.round(Number(walletAmountInput || 0) * 86.85).toLocaleString('en-IN')} INR
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">
                  Reason / Adjustment Audit Note
                </label>
                <input
                  type="text"
                  value={walletNotesInput}
                  onChange={(e) => setWalletNotesInput(e.target.value)}
                  placeholder="e.g. Promotional goodwill bonus, manual bank wire receipt"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8D7B7] text-xs text-[#17243B] focus:outline-none focus:border-[#B88732]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8D7B7]">
              <button
                onClick={() => setSelectedClientForWallet(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={savingWallet}
                onClick={handleSaveWallet}
                className="btn-gold-luxury px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {savingWallet ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Execute Adjustment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: SCREENSHOT PREVIEW ────────────────────────────────────── */}
      {inspectScreenshot && (
        <div
          onClick={() => setInspectScreenshot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full border border-white/20 overflow-hidden shadow-2xl relative"
          >
            <div className="p-3 bg-[#0B1330] text-white flex items-center justify-between text-xs font-mono">
              <span>Client Bank Transaction Proof</span>
              <button
                onClick={() => setInspectScreenshot(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-auto flex items-center justify-center bg-slate-100">
              <img
                src={inspectScreenshot}
                alt="Transaction Slip"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SaveIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);
