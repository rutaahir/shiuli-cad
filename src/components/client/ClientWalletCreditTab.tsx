import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Receipt,
  Eye,
  RefreshCw,
  Sparkles,
  Zap,
  Building2,
  FileText,
  Upload,
  X,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import {
  ClientWallet,
  ClientCreditAccount,
  WalletCreditTransaction
} from '../../types';
import { useCustomerCountry } from '../../utils/countryContext';
import {
  convertUsdToCustomer,
  convertCustomerToUsd,
  formatUSD,
  CURRENCY_SYMBOLS
} from '../../utils/currencyHelper';

interface ClientWalletCreditTabProps {
  onNavigateCustom?: () => void;
}

export const ClientWalletCreditTab: React.FC<ClientWalletCreditTabProps> = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [wallet, setWallet] = useState<ClientWallet | null>(null);
  const [creditAccount, setCreditAccount] = useState<ClientCreditAccount | null>(null);
  const [transactions, setTransactions] = useState<WalletCreditTransaction[]>([]);

  // Modals
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);
  const [topupAmount, setTopupAmount] = useState<string>('100');
  const [topupMethod, setTopupMethod] = useState<string>('bank_transfer');
  const [topupRef, setTopupRef] = useState<string>('');
  const [topupFile, setTopupFile] = useState<File | null>(null);
  const [submittingTopup, setSubmittingTopup] = useState<boolean>(false);

  const [showRepayModal, setShowRepayModal] = useState<boolean>(false);
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [repayRef, setRepayRef] = useState<string>('');
  const [repayFile, setRepayFile] = useState<File | null>(null);
  const [submittingRepay, setSubmittingRepay] = useState<boolean>(false);

  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

  const fetchWalletAndCredit = async () => {
    setLoading(true);
    try {
      const res = await api.getClientCreditAccount();
      if (res) {
        if (res.wallet) setWallet(res.wallet);
        if (res.credit_account) {
          setCreditAccount(res.credit_account);
          setRepayAmount(String(res.credit_account.used_credit || ''));
        }
        if (Array.isArray(res.transactions)) setTransactions(res.transactions);
      }
    } catch (e) {
      console.warn('Failed to load wallet & credit account:', e);
    } finally {
      setLoading(false);
    }
  };

  // Customer Country Context & Exchange Rate
  const { currentCountry, exchangeRates } = useCustomerCountry();
  const customerCurrency = currentCountry?.currency || 'INR';
  const customerSymbol = currentCountry?.symbol || '₹';
  const customerRate = exchangeRates[customerCurrency] || (customerCurrency === 'INR' ? 86.85 : 1.0);

  useEffect(() => {
    fetchWalletAndCredit();
    if (customerCurrency === 'INR') {
      setTopupAmount('5000');
    }
  }, [customerCurrency]);

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = parseFloat(topupAmount);
    if (isNaN(rawVal) || rawVal <= 0) {
      alert(`Please enter a valid deposit amount in ${customerCurrency}.`);
      return;
    }
    const calculatedUsd = customerCurrency === 'USD'
      ? rawVal
      : convertCustomerToUsd(rawVal, customerCurrency, customerRate).usdAmount;

    setSubmittingTopup(true);
    try {
      const fd = new FormData();
      fd.append('amount', String(calculatedUsd));
      fd.append('payment_method', topupMethod);
      fd.append('transaction_ref', topupRef);
      fd.append('currency', customerCurrency);
      fd.append('original_amount', String(rawVal));
      if (topupFile) {
        fd.append('payment_screenshot', topupFile);
      }
      await api.submitWalletTopup(fd);
      alert(`Deposit request for ${customerSymbol}${rawVal.toLocaleString()} (${formatUSD(calculatedUsd)} USD float) submitted! Funds will be credited once verified by Studio Admin.`);
      setShowTopupModal(false);
      setTopupRef('');
      setTopupFile(null);
      await fetchWalletAndCredit();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit top-up request.');
    } finally {
      setSubmittingTopup(false);
    }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = parseFloat(repayAmount);
    if (isNaN(rawVal) || rawVal <= 0) {
      alert('Please enter a valid repayment amount.');
      return;
    }
    const calculatedUsd = customerCurrency === 'USD'
      ? rawVal
      : convertCustomerToUsd(rawVal, customerCurrency, customerRate).usdAmount;

    setSubmittingRepay(true);
    try {
      const fd = new FormData();
      fd.append('amount', String(calculatedUsd));
      fd.append('transaction_ref', repayRef);
      fd.append('currency', customerCurrency);
      fd.append('original_amount', String(rawVal));
      if (repayFile) {
        fd.append('payment_screenshot', repayFile);
      }
      await api.submitCreditRepayment(fd);
      alert(`Repayment of ${customerSymbol}${rawVal.toLocaleString()} (${formatUSD(calculatedUsd)} USD) submitted! Credit limit will restore upon Studio Admin review.`);
      setShowRepayModal(false);
      setRepayRef('');
      setRepayFile(null);
      await fetchWalletAndCredit();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit credit repayment.');
    } finally {
      setSubmittingRepay(false);
    }
  };

  const balance = Number(wallet?.balance || 0);
  const creditLimit = Number(creditAccount?.credit_limit || 0);
  const usedCredit = Number(creditAccount?.used_credit || 0);
  const availableCredit = Number(creditAccount?.available_credit || 0);
  const hasActiveCredit = creditAccount?.status === 'active' && creditLimit > 0;
  const utilizationPct = creditLimit > 0 ? Math.min(100, Math.round((usedCredit / creditLimit) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-[#17345C] to-[#0B1330] text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[#F5E7A3] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Shiuli Financial Liquidity Suite</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
            Prepaid Wallet &amp; Corporate Credit Line
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Deposit store funds for 1-click instant CAD releases, or leverage an approved corporate revolving line of credit.
          </p>
        </div>

        <button
          onClick={fetchWalletAndCredit}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-[#F5E7A3] flex items-center gap-1.5 cursor-pointer transition-all z-10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Two Hero Cards: Wallet vs Credit Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CARD 1: PREPAID STUDIO WALLET */}
        <div className="p-6 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm space-y-5 relative overflow-hidden flex flex-col justify-between hover:border-[#C9A227]/60 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#1F9D66] uppercase tracking-wider">
                <Wallet className="w-4 h-4 text-[#1F9D66]" />
                Shiuli Prepaid Wallet
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                1-Click Checkout
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs font-mono text-slate-500 block">Available Cash Float</span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#0B1330] tracking-tight">
                {convertUsdToCustomer(balance, customerCurrency, customerRate).display}
                {customerCurrency !== 'USD' && (
                  <span className="text-xs font-normal text-slate-400 font-sans ml-2">
                    ({formatUSD(balance)} USD Available Float)
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#E8D7B7]/60 space-y-2 text-xs text-[#5A6679]">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#B88732] shrink-0" />
                <span>Instant 0-second file download unlocks on Ready CAD store assets</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Funds never expire and can be used on custom design milestones</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowTopupModal(true)}
              className="btn-gold-luxury w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Money to Wallet</span>
            </button>
          </div>
        </div>

        {/* CARD 2: CORPORATE POSTPAID CREDIT LINE */}
        <div className="p-6 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm space-y-5 relative overflow-hidden flex flex-col justify-between hover:border-blue-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-900 uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-blue-700" />
                Corporate Credit Facility
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                hasActiveCredit
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                {hasActiveCredit ? 'Active VIP Line' : 'Not Activated'}
              </span>
            </div>

            {hasActiveCredit ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-500 block">Available Credit</span>
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono text-blue-950 tracking-tight">
                      {convertUsdToCustomer(availableCredit, customerCurrency, customerRate).display}
                      {customerCurrency !== 'USD' && (
                        <span className="text-xs font-normal text-slate-400 font-sans ml-2">
                          ({formatUSD(availableCredit)} USD)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Approved Limit</span>
                    <span className="text-sm font-mono font-bold text-slate-700">
                      {convertUsdToCustomer(creditLimit, customerCurrency, customerRate).display}
                      {customerCurrency !== 'USD' && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({formatUSD(creditLimit)} USD)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Utilization Gauge */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-amber-800 font-semibold">
                      Used: {convertUsdToCustomer(usedCredit, customerCurrency, customerRate).display}
                      {customerCurrency !== 'USD' && (
                        <span className="text-slate-400 font-normal ml-1">
                          ({formatUSD(usedCredit)} USD)
                        </span>
                      )}
                    </span>
                    <span className="text-slate-500">{utilizationPct}% Utilized</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        utilizationPct > 80 ? 'bg-rose-500' : utilizationPct > 50 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${utilizationPct}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 text-xs text-[#5A6679] flex items-center justify-between">
                  <span>Terms: <strong>Net-30 Billing Cycle</strong></span>
                  <span className="text-emerald-700 font-semibold">● Guaranteed CAD Delivery</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] space-y-2">
                <div className="font-serif font-bold text-sm text-[#17243B]">
                  Looking for Postpaid Net-30 Invoicing?
                </div>
                <p className="text-xs text-[#5A6679]">
                  High-volume jewelry manufacturers and atelier studios can qualify for an approved revolving credit line granted directly by Shiuli SuperAdmin.
                </p>
                <div className="text-[11px] text-[#B88732] font-semibold flex items-center gap-1 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Contact your dedicated CAD project engineer to apply.</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            {hasActiveCredit ? (
              <button
                disabled={usedCredit <= 0}
                onClick={() => setShowRepayModal(true)}
                className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  usedCredit > 0
                    ? 'bg-[#17345C] hover:bg-[#0B1330] text-[#F5E7A3] border border-[#D4AF37]'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>{usedCredit > 0 ? `Settle Used Credit Bill ($${usedCredit.toFixed(2)})` : 'No Outstanding Bill Due'}</span>
              </button>
            ) : (
              <button
                disabled
                className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                <span>VIP Credit Line by Invitation</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History & Audit Ledger */}
      <div className="bg-white rounded-2xl border border-[#E8D7B7] overflow-hidden shadow-xs">
        <div className="p-4 bg-[#FAF8F5] border-b border-[#E8D7B7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#B88732]" />
            <h3 className="font-serif font-bold text-sm text-[#17243B]">
              Wallet &amp; Credit Statement History ({transactions.length})
            </h3>
          </div>
          <span className="text-xs text-[#5A6679]">Official Real-time Ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8D7B7] text-[10px] uppercase font-mono font-bold text-[#8C7A58] tracking-wider">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Instrument</th>
                <th className="p-3.5">Activity</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Balance</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Reference &amp; Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8D7B7]/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#5A6679]">
                    No wallet or credit transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isTopup = tx.transaction_type === 'topup';
                  const isWalletSpend = tx.transaction_type === 'wallet_spend';
                  const isCreditSpend = tx.transaction_type === 'credit_spend';
                  const isRepayment = tx.transaction_type === 'repayment';

                  return (
                    <tr key={tx.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          tx.account_type === 'wallet' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                        }`}>
                          {tx.account_type === 'wallet' ? 'Prepaid Wallet' : 'Corporate Credit'}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-[#17345C] capitalize">
                        {tx.transaction_type.replace('_', ' ')}
                      </td>
                      <td className="p-3.5 font-mono font-bold">
                        <span className={isTopup || isRepayment ? 'text-emerald-700' : 'text-slate-900'}>
                          {isTopup || isRepayment ? '+' : '-'}{convertUsdToCustomer(tx.amount, customerCurrency, customerRate).display}
                        </span>
                        {customerCurrency !== 'USD' && (
                          <span className="block text-[9px] text-slate-400 font-normal">
                            ({isTopup || isRepayment ? '+' : '-'}${Number(tx.amount).toFixed(2)} USD)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">
                        {convertUsdToCustomer(tx.running_balance, customerCurrency, customerRate).display}
                        {customerCurrency !== 'USD' && (
                          <span className="block text-[9px] text-slate-400 font-normal">
                            (${Number(tx.running_balance).toFixed(2)} USD)
                          </span>
                        )}
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
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-xs text-[11px] text-slate-600">
                            {tx.notes || tx.reference_title || tx.transaction_ref || '—'}
                          </span>
                          {tx.screenshot_url && (
                            <button
                              onClick={() => setViewReceiptUrl(tx.screenshot_url || null)}
                              className="text-[#B88732] hover:text-[#17345C] p-1 rounded hover:bg-slate-100"
                              title="View Slip"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* ─── MODAL 1: TOP UP PREPAID WALLET ─────────────────────────────────── */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E8D7B7] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#17243B]">
                  Top Up Studio Wallet
                </h3>
                <p className="text-xs text-[#5A6679]">
                  Deposit funds for instant 1-click purchases
                </p>
              </div>
              <button
                onClick={() => setShowTopupModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTopupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">
                  Deposit Amount ({customerCurrency} {customerSymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">{customerSymbol}</span>
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder={customerCurrency === 'INR' ? 'e.g. 5000' : 'e.g. 100'}
                    required
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#E8D7B7] text-sm font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#B88732]"
                  />
                </div>

                {customerCurrency !== 'USD' && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 mt-2 flex items-center justify-between">
                    <span>Float Credited in Base USD:</span>
                    <strong className="font-mono text-emerald-800 text-sm">
                      ≈ {convertCustomerToUsd(topupAmount, customerCurrency, customerRate).displayUsd} USD
                    </strong>
                  </div>
                )}

                <div className="flex items-center gap-1.5 mt-2">
                  {(customerCurrency === 'INR' ? ['1000', '2500', '5000', '10000'] : ['50', '100', '250', '500']).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopupAmount(preset)}
                      className="px-2.5 py-1 rounded bg-[#FAF8F5] hover:bg-[#FFF9F0] border border-[#E8D7B7] text-[11px] font-mono font-bold text-[#17345C] cursor-pointer"
                    >
                      {customerSymbol}{Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Details Card */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] space-y-1.5 text-xs text-[#17243B]">
                <div className="font-semibold text-[11px] uppercase tracking-wider text-[#B88732] flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Shiuli Atelier Official Treasury</span>
                </div>
                <div className="text-[11px] space-y-0.5 text-slate-600 font-mono">
                  <div>Bank: <strong>HDFC Bank / Silicon Valley Bank</strong></div>
                  <div>Account: <strong>50200084739201</strong></div>
                  <div>SWIFT/IFSC: <strong>HDFC0000240</strong></div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">
                  Bank Reference / UTR / Transaction ID
                </label>
                <input
                  type="text"
                  value={topupRef}
                  onChange={(e) => setTopupRef(e.target.value)}
                  placeholder="e.g. UTR-983749284 / Wire Ref"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#E8D7B7] text-xs font-mono text-[#17243B] focus:outline-none focus:border-[#B88732]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">
                  Upload Payment Proof / Screenshot (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setTopupFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FAF8F5] file:text-[#17345C] hover:file:bg-[#FFF9F0] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8D7B7]">
                <button
                  type="button"
                  onClick={() => setShowTopupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTopup}
                  className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {submittingTopup ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Submit Deposit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: SETTLE USED CREDIT BILL ────────────────────────────────── */}
      {showRepayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E8D7B7] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#17243B]">
                  Settle Credit Bill
                </h3>
                <p className="text-xs text-[#5A6679]">
                  Restore your revolving corporate credit limit
                </p>
              </div>
              <button
                onClick={() => setShowRepayModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRepaySubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                <span>Total Outstanding Balance:</span>
                <div className="text-right">
                  <strong className="font-mono text-sm block">
                    {convertUsdToCustomer(usedCredit, customerCurrency, customerRate).display}
                  </strong>
                  {customerCurrency !== 'USD' && (
                    <span className="text-[10px] text-slate-500 font-mono">(${usedCredit.toFixed(2)} USD)</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">
                  Repayment Amount ({customerCurrency} {customerSymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">{customerSymbol}</span>
                  <input
                    type="number"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#E8D7B7] text-sm font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#B88732]"
                  />
                </div>

                {customerCurrency !== 'USD' && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 mt-2 flex items-center justify-between">
                    <span>Deducted from USD Debt:</span>
                    <strong className="font-mono text-emerald-800 text-sm">
                      ≈ {convertCustomerToUsd(repayAmount, customerCurrency, customerRate).displayUsd} USD
                    </strong>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">
                  Bank Reference / UTR
                </label>
                <input
                  type="text"
                  value={repayRef}
                  onChange={(e) => setRepayRef(e.target.value)}
                  placeholder="e.g. WIRE-REF-774921"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#E8D7B7] text-xs font-mono text-[#17243B] focus:outline-none focus:border-[#B88732]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243B] mb-1">
                  Upload Repayment Proof / Wire Slip
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setRepayFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FAF8F5] file:text-[#17345C] hover:file:bg-[#FFF9F0] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8D7B7]">
                <button
                  type="button"
                  onClick={() => setShowRepayModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRepay}
                  className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {submittingRepay ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Confirm Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: VIEW SLIP PREVIEW ─────────────────────────────────────── */}
      {viewReceiptUrl && (
        <div
          onClick={() => setViewReceiptUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full border border-white/20 overflow-hidden shadow-2xl relative"
          >
            <div className="p-3 bg-[#0B1330] text-white flex items-center justify-between text-xs font-mono">
              <span>Transaction Slip</span>
              <button
                onClick={() => setViewReceiptUrl(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-auto flex items-center justify-center bg-slate-100">
              <img
                src={viewReceiptUrl}
                alt="Payment Slip"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
