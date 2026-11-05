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
  Check,
  Lock,
  Smartphone,
  ArrowRight,
  ChevronDown,
  Copy
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

interface ClientWalletCreditTabProps {
  onNavigateCustom?: () => void;
}

export const ClientWalletCreditTab: React.FC<ClientWalletCreditTabProps> = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [wallet, setWallet] = useState<ClientWallet | null>(null);
  const [creditAccount, setCreditAccount] = useState<ClientCreditAccount | null>(null);
  const [transactions, setTransactions] = useState<WalletCreditTransaction[]>([]);
  const [showAllTransactions, setShowAllTransactions] = useState<boolean>(false);

  // Modals
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);
  const [topupAmount, setTopupAmount] = useState<string>('5000');
  const [topupMethod, setTopupMethod] = useState<string>('bank_transfer');
  const [topupRef, setTopupRef] = useState<string>('');
  const [topupFile, setTopupFile] = useState<File | null>(null);
  const [submittingTopup, setSubmittingTopup] = useState<boolean>(false);
  const [topupMode, setTopupMode] = useState<'razorpay' | 'manual'>('razorpay');

  // Credit Repayment State
  const [showRepayModal, setShowRepayModal] = useState<boolean>(false);
  const [repayMethod, setRepayMethod] = useState<'razorpay' | 'manual'>('razorpay');
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [repayRef, setRepayRef] = useState<string>('');
  const [repayFile, setRepayFile] = useState<File | null>(null);
  const [submittingRepay, setSubmittingRepay] = useState<boolean>(false);
  const [repayError, setRepayError] = useState<string>('');
  const [repaySuccessData, setRepaySuccessData] = useState<{
    paymentId: string;
    amount: number;
    amountUsd: number;
    restoredLimit?: number;
    message?: string;
  } | null>(null);

  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

  // Countdown Timer for Time-Limited Promotional Credit
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!creditAccount?.expires_at) {
      setSecondsRemaining(null);
      return;
    }

    // Authoritative starting seconds from server (immune to client machine clock skew)
    const serverSecs = typeof creditAccount.time_remaining_seconds === 'number'
      ? creditAccount.time_remaining_seconds
      : Math.floor((new Date(creditAccount.expires_at).getTime() - Date.now()) / 1000);

    const initialSecs = Math.max(0, serverSecs);
    setSecondsRemaining(initialSecs);

    const startClientMs = Date.now();
    const interval = setInterval(() => {
      const elapsedSecs = Math.floor((Date.now() - startClientMs) / 1000);
      const remaining = Math.max(0, initialSecs - elapsedSecs);
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [creditAccount?.expires_at, creditAccount?.time_remaining_seconds]);

  const formatCountdown = (totalSecs: number) => {
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
    }
    return `${hours.toString().padStart(2, '0')}h : ${mins.toString().padStart(2, '0')}m : ${secs.toString().padStart(2, '0')}s`;
  };

  // Customer Country Context & Exchange Rate
  const { currentCountry, exchangeRates } = useCustomerCountry();
  const customerCurrency = currentCountry?.currency || 'INR';
  const customerSymbol = currentCountry?.symbol || '₹';
  const customerRate = exchangeRates[customerCurrency] || (customerCurrency === 'INR' ? 86.85 : 1.0);

  const fetchWalletAndCredit = async () => {
    setLoading(true);
    try {
      const res = await api.getClientCreditAccount();
      if (res) {
        if (res.wallet) setWallet(res.wallet);
        if (res.credit_account) {
          setCreditAccount(res.credit_account);
        }
        if (Array.isArray(res.transactions)) setTransactions(res.transactions);
      }
    } catch (e) {
      console.warn('Failed to load wallet & credit account:', e);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Official Bank & Treasury Details from Admin Settings
  const [bankDetails, setBankDetails] = useState({
    beneficiaryName: localStorage.getItem('shiuli_bank_beneficiary_name') || 'Shiuli CAD Studio LLP',
    bankName: localStorage.getItem('shiuli_bank_name') || 'HDFC Bank / Silicon Valley Bank',
    accountNumber: localStorage.getItem('shiuli_bank_account_number') || '50200084739201',
    ifscCode: localStorage.getItem('shiuli_bank_ifsc_code') || 'HDFC0000240',
    swiftCode: localStorage.getItem('shiuli_bank_swift_code') || 'HDFCINBB',
    branch: localStorage.getItem('shiuli_bank_branch') || 'Surat Main Branch',
    accountType: localStorage.getItem('shiuli_bank_account_type') || 'Current Account',
    upiId: localStorage.getItem('shiuli_studio_upi_id') || 'shiulicad@okhdfcbank',
    notes: localStorage.getItem('shiuli_bank_notes') || 'Please include your registered phone number or Order/Client ID in the wire transfer description.',
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchBankDetails = async () => {
    try {
      const plat = await api.getPlatformSettings().catch(() => null);
      if (plat) {
        setBankDetails({
          beneficiaryName: plat.bank_beneficiary_name || 'Shiuli CAD Studio LLP',
          bankName: plat.bank_name || 'HDFC Bank / Silicon Valley Bank',
          accountNumber: plat.bank_account_number || '50200084739201',
          ifscCode: plat.bank_ifsc_code || 'HDFC0000240',
          swiftCode: plat.bank_swift_code || 'HDFCINBB',
          branch: plat.bank_branch || 'Surat Main Branch',
          accountType: plat.bank_account_type || 'Current Account',
          upiId: plat.studio_upi_id || 'shiulicad@okhdfcbank',
          notes: plat.bank_notes || '',
        });
        if (plat.bank_beneficiary_name) localStorage.setItem('shiuli_bank_beneficiary_name', plat.bank_beneficiary_name);
        if (plat.bank_name) localStorage.setItem('shiuli_bank_name', plat.bank_name);
        if (plat.bank_account_number) localStorage.setItem('shiuli_bank_account_number', plat.bank_account_number);
        if (plat.bank_ifsc_code) localStorage.setItem('shiuli_bank_ifsc_code', plat.bank_ifsc_code);
        if (plat.bank_swift_code) localStorage.setItem('shiuli_bank_swift_code', plat.bank_swift_code);
        if (plat.bank_branch) localStorage.setItem('shiuli_bank_branch', plat.bank_branch);
        if (plat.bank_account_type) localStorage.setItem('shiuli_bank_account_type', plat.bank_account_type);
        if (plat.bank_notes) localStorage.setItem('shiuli_bank_notes', plat.bank_notes);
        if (plat.studio_upi_id) localStorage.setItem('shiuli_studio_upi_id', plat.studio_upi_id);
      }
    } catch {
      // Offline fallback silently uses cached localStorage
    }
  };

  useEffect(() => {
    fetchWalletAndCredit();
    fetchBankDetails();
    if (customerCurrency === 'INR') {
      setTopupAmount('5000');
    }
  }, [customerCurrency]);

  const openRepayModal = () => {
    setRepayError('');
    setRepaySuccessData(null);
    setRepayMethod('razorpay');
    const used = Number(creditAccount?.used_credit || 0);
    const amountInCurrency = customerCurrency === 'USD'
      ? used
      : Math.round(used * customerRate);
    setRepayAmount(amountInCurrency > 0 ? String(amountInCurrency) : '');
    setShowRepayModal(true);
  };

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
      fd.append('original_amount', String(rawVal.toFixed(2)));
      fd.append('exchange_rate', String(customerRate));
      if (topupFile) {
        fd.append('payment_screenshot', topupFile);
      }
      await api.submitWalletTopup(fd);
      alert(`Deposit request for ${customerSymbol}${rawVal.toLocaleString(customerCurrency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${formatUSD(calculatedUsd)} USD float) submitted! Funds will be credited once verified by Studio Admin.`);
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

  // 1-Click Instant Wallet Top-Up with Razorpay
  const handleRazorpayTopup = async () => {
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
      const orderRes = await api.createRazorpayWalletTopupOrder({
        amount: rawVal,
        currency: customerCurrency,
        amount_usd: calculatedUsd,
      });

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        throw new Error('Razorpay SDK could not be loaded. Please check your internet connection.');
      }

      const keyId = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || orderRes.key_id;

      const options = {
        key: keyId,
        amount: orderRes.amount_paise,
        currency: orderRes.currency || 'INR',
        name: 'Shiuli CAD Studio',
        description: `Prepaid Wallet Recharge (${customerSymbol}${rawVal.toLocaleString()})`,
        image: '/assets/logo.png',
        order_id: orderRes.razorpay_order_id,
        prefill: {
          name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '',
          email: user?.email || '',
          contact: user?.phone_number || '',
        },
        theme: {
          color: '#17345C',
        },
        modal: {
          ondismiss: function () {
            setSubmittingTopup(false);
          },
        },
        handler: async function (response: any) {
          try {
            setSubmittingTopup(true);
            await api.verifyRazorpayWalletTopup({
              razorpay_order_id: response.razorpay_order_id || orderRes.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount_usd: calculatedUsd,
              amount_inr: orderRes.amount_inr,
            });

            try {
              const confetti = (await import('canvas-confetti')).default;
              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            } catch {}

            alert(`Wallet recharged with ${customerSymbol}${rawVal.toLocaleString()}! Available balance has been credited immediately.`);
            setShowTopupModal(false);
            await fetchWalletAndCredit();
          } catch (vErr: any) {
            alert(vErr?.message || 'Wallet verification failed. If money was deducted, please contact Studio Support.');
          } finally {
            setSubmittingTopup(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        alert(resp?.error?.description || 'Razorpay payment was cancelled or failed.');
        setSubmittingTopup(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay wallet topup error:', err);
      alert(err?.message || 'Failed to initiate Razorpay top-up.');
      setSubmittingTopup(false);
    }
  };

  // 1-Click Online Settlement with Razorpay
  const handleRazorpayRepay = async () => {
    setRepayError('');
    const rawVal = parseFloat(repayAmount);
    if (isNaN(rawVal) || rawVal <= 0) {
      setRepayError(`Please enter a valid repayment amount in ${customerCurrency}.`);
      return;
    }

    const calculatedUsd = customerCurrency === 'USD'
      ? rawVal
      : convertCustomerToUsd(rawVal, customerCurrency, customerRate).usdAmount;

    const currentUsed = Number(creditAccount?.used_credit || 0);
    if (calculatedUsd > currentUsed + 0.10) {
      setRepayError(`Repayment amount cannot exceed total outstanding balance of ${convertUsdToCustomer(currentUsed, customerCurrency, customerRate).display}.`);
      return;
    }

    setSubmittingRepay(true);
    try {
      // 1. Create order on backend with Razorpay SDK
      const orderRes = await api.createRazorpayCreditRepaymentOrder({
        amount: rawVal,
        currency: customerCurrency,
        amount_usd: calculatedUsd,
      });

      // 2. Load Razorpay script dynamically
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        throw new Error('Razorpay SDK could not be loaded. Please check your internet connection or use manual wire transfer.');
      }

      const keyId = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || orderRes.key_id;

      // 3. Configure Checkout Options
      const options = {
        key: keyId,
        amount: orderRes.amount_paise,
        currency: orderRes.currency || 'INR',
        name: 'Shiuli CAD Studio',
        description: `Credit Bill Settlement (${customerSymbol}${rawVal.toLocaleString()})`,
        image: '/assets/logo.png',
        order_id: orderRes.razorpay_order_id,
        prefill: {
          name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '',
          email: user?.email || '',
          contact: user?.phone_number || '',
        },
        notes: {
          purpose: 'credit_repayment',
          amount_usd: String(calculatedUsd),
          amount_inr: String(orderRes.amount_inr),
        },
        theme: {
          color: '#17345C',
        },
        modal: {
          ondismiss: function () {
            setSubmittingRepay(false);
          },
        },
        handler: async function (response: any) {
          try {
            setSubmittingRepay(true);
            const verifyRes = await api.verifyRazorpayCreditRepayment({
              razorpay_order_id: response.razorpay_order_id || orderRes.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount_usd: calculatedUsd,
              amount_inr: orderRes.amount_inr,
            });

            // Trigger celebratory confetti
            try {
              const confetti = (await import('canvas-confetti')).default;
              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            } catch {}

            setRepaySuccessData({
              paymentId: response.razorpay_payment_id,
              amount: rawVal,
              amountUsd: calculatedUsd,
              restoredLimit: verifyRes.credit_account?.available_credit,
              message: verifyRes.message,
            });

            await fetchWalletAndCredit();
          } catch (vErr: any) {
            setRepayError(vErr?.message || 'Payment verification failed. If money was deducted, please contact Studio Support.');
          } finally {
            setSubmittingRepay(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setRepayError(resp?.error?.description || 'Razorpay payment was cancelled or failed.');
        setSubmittingRepay(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay credit order error:', err);
      setRepayError(err?.message || 'Failed to initiate Razorpay checkout.');
      setSubmittingRepay(false);
    }
  };

  // Sandbox simulation helper (for testing in local dev)
  const handleSimulateRazorpaySuccess = async () => {
    setRepayError('');
    const rawVal = parseFloat(repayAmount);
    if (isNaN(rawVal) || rawVal <= 0) {
      setRepayError('Please enter a valid repayment amount.');
      return;
    }
    const calculatedUsd = customerCurrency === 'USD'
      ? rawVal
      : convertCustomerToUsd(rawVal, customerCurrency, customerRate).usdAmount;

    setSubmittingRepay(true);
    try {
      const mockPayId = `pay_sim_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      const mockOrderId = `order_sim_${Date.now().toString(36)}`;
      const verifyRes = await api.verifyRazorpayCreditRepayment({
        razorpay_order_id: mockOrderId,
        razorpay_payment_id: mockPayId,
        razorpay_signature: 'sandbox_simulation_sig',
        amount_usd: calculatedUsd,
      });

      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {}

      setRepaySuccessData({
        paymentId: mockPayId,
        amount: rawVal,
        amountUsd: calculatedUsd,
        restoredLimit: verifyRes.credit_account?.available_credit,
        message: verifyRes.message || 'Credit bill settled successfully in sandbox mode!',
      });
      await fetchWalletAndCredit();
    } catch (err: any) {
      setRepayError(err?.message || 'Failed to complete test settlement.');
    } finally {
      setSubmittingRepay(false);
    }
  };

  // Manual Offline Wire Submission
  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepayError('');
    const rawVal = parseFloat(repayAmount);
    if (isNaN(rawVal) || rawVal <= 0) {
      setRepayError('Please enter a valid repayment amount.');
      return;
    }
    const calculatedUsd = customerCurrency === 'USD'
      ? rawVal
      : convertCustomerToUsd(rawVal, customerCurrency, customerRate).usdAmount;

    setSubmittingRepay(true);
    try {
      const fd = new FormData();
      fd.append('amount', String(calculatedUsd));
      fd.append('payment_method', 'bank_transfer');
      fd.append('transaction_ref', repayRef);
      fd.append('currency', customerCurrency);
      fd.append('original_amount', String(rawVal.toFixed(2)));
      fd.append('exchange_rate', String(customerRate));
      if (repayFile) {
        fd.append('payment_screenshot', repayFile);
      }
      await api.submitCreditRepayment(fd);
      alert(`Repayment of ${customerSymbol}${rawVal.toLocaleString(customerCurrency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${formatUSD(calculatedUsd)} USD) submitted! Credit limit will restore upon Studio Admin review.`);
      setShowRepayModal(false);
      setRepayRef('');
      setRepayFile(null);
      await fetchWalletAndCredit();
    } catch (err: any) {
      setRepayError(err?.message || 'Failed to submit credit repayment.');
    } finally {
      setSubmittingRepay(false);
    }
  };

  const isExpired = Boolean(creditAccount?.is_expired || (creditAccount?.expires_at && secondsRemaining !== null && secondsRemaining <= 0));
  const balance = Number(wallet?.balance || 0);
  const creditLimit = Number(creditAccount?.credit_limit || 0);
  const usedCredit = Number(creditAccount?.used_credit || 0);
  const rawAvailableCredit = Number(creditAccount?.available_credit || 0);
  const availableCredit = isExpired ? 0 : rawAvailableCredit;
  const hasActiveCredit = creditAccount?.status === 'active' && creditLimit > 0 && !isExpired;
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
        <div className="p-6 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-[#C9A227]/60 transition-all">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#1F9D66] uppercase tracking-wider">
                <Wallet className="w-4 h-4 text-[#1F9D66]" />
                Shiuli Prepaid Wallet
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                1-Click Checkout
              </span>
            </div>

            {/* Balance */}
            <div>
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

            {/* Wallet Advantages Box */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#FAF8F5] via-[#FFFBF5] to-[#FAF8F5] border border-[#E8D7B7] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#17345C] flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-[#B88732]" />
                  Studio Float Privileges
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Perpetual Store Balance
                </span>
              </div>

              <div className="space-y-2 text-xs text-[#5A6679]">
                <div className="flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#B88732] shrink-0 mt-0.5" />
                  <span><strong>Instant 0-Second Downloads:</strong> 1-click checkout on Ready CAD catalog with immediate production file release.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Funds Never Expire:</strong> Deposit store float once and use across standard store models and custom milestones.</span>
                </div>
              </div>
            </div>

            {/* Terms / Subtext */}
            <div className="pt-1 text-xs text-[#5A6679] flex items-center justify-between border-t border-[#E8D7B7]/60">
              <span>Account Type: <strong>Prepaid Store Float</strong></span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>100% Liquidity Backed</span>
              </span>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => setShowTopupModal(true)}
              className="btn-gold-luxury w-full h-12 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Money to Wallet</span>
            </button>
          </div>
        </div>

        {/* CARD 2: CORPORATE POSTPAID CREDIT LINE */}
        <div className="p-6 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-blue-300 transition-all">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-900 uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-blue-700" />
                Corporate Credit Facility
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isExpired
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : hasActiveCredit && creditAccount?.expires_at
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                  : hasActiveCredit
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                {isExpired
                  ? 'Expired Credit Facility'
                  : hasActiveCredit && creditAccount?.expires_at
                  ? `⏳ ${formatCountdown(secondsRemaining ?? creditAccount.time_remaining_seconds ?? 0)} Left`
                  : hasActiveCredit
                  ? 'Active VIP Line'
                  : 'Not Activated'}
              </span>
            </div>

            {/* Balance & Approved Limit */}
            {hasActiveCredit ? (
              <div className="space-y-2">
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

                {/* Utilization Mini Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-0.5">
                  <span className="text-amber-800 font-semibold">
                    Used: {convertUsdToCustomer(usedCredit, customerCurrency, customerRate).display}
                    {customerCurrency !== 'USD' && ` ($${usedCredit.toFixed(2)})`}
                  </span>
                  <span>{utilizationPct}% Utilized</span>
                </div>
              </div>
            ) : null}

            {/* ─── TIME-LIMITED COUNTDOWN BOX ─── */}
            {hasActiveCredit && creditAccount?.expires_at && !isExpired && (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0B1330] via-[#122240] to-[#0B1330] border border-[#D4AF37]/50 text-white shadow-md space-y-2.5 relative overflow-hidden">
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F5E7A3]">
                      <Clock className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#F5E7A3]">
                      Credit Expiry Countdown
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#D4AF37] text-[#0B1330] uppercase tracking-wider animate-pulse">
                    {creditAccount.validity_duration || 'Time-Limited'}
                  </span>
                </div>

                {/* Digital Countdown Ticker */}
                {(() => {
                  const totalSecs = secondsRemaining ?? creditAccount.time_remaining_seconds ?? 0;
                  const days = Math.floor(totalSecs / 86400);
                  const hours = Math.floor((totalSecs % 86400) / 3600);
                  const mins = Math.floor((totalSecs % 3600) / 60);
                  const secs = totalSecs % 60;

                  return (
                    <div className={`grid gap-2 text-center relative z-10 ${days > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      {days > 0 && (
                        <div className="py-1.5 px-1 rounded-lg bg-white/10 border border-white/10">
                          <div className="text-xl font-mono font-black text-[#F5E7A3]">
                            {String(days).padStart(2, '0')}
                          </div>
                          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-300">Days</span>
                        </div>
                      )}
                      <div className="py-1.5 px-1 rounded-lg bg-white/10 border border-white/10">
                        <div className="text-xl font-mono font-black text-[#F5E7A3]">
                          {String(hours).padStart(2, '0')}
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-300">Hours</span>
                      </div>
                      <div className="py-1.5 px-1 rounded-lg bg-white/10 border border-white/10">
                        <div className="text-xl font-mono font-black text-[#F5E7A3]">
                          {String(mins).padStart(2, '0')}
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-300">Mins</span>
                      </div>
                      <div className="py-1.5 px-1 rounded-lg bg-[#D4AF37]/25 border border-[#D4AF37] shadow-inner">
                        <div className="text-xl font-mono font-black text-[#F5E7A3] animate-pulse">
                          {String(secs).padStart(2, '0')}
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#F5E7A3] font-bold">Secs</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Deadline & Shop Link */}
                <div className="flex items-center justify-between pt-1 border-t border-white/15 text-[11px] relative z-10">
                  <span className="text-slate-300 text-[10.5px]">
                    Expires: <strong className="text-white font-mono">{new Date(creditAccount.expires_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                  </span>
                  <a
                    href="/collections"
                    className="inline-flex items-center gap-1 text-[10.5px] font-mono font-bold text-[#F5E7A3] hover:text-white transition-colors"
                  >
                    <span>Shop CAD Library</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Permanent Net-30 Showcase (when no expiry) */}
            {hasActiveCredit && !creditAccount?.expires_at && !isExpired && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#FAF8F5] to-[#F0F5FA] border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5 font-sans">
                    <Building2 className="w-3.5 h-3.5 text-blue-700" />
                    Corporate Net-30 Facility
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    Guaranteed Delivery
                  </span>
                </div>
                <p className="text-xs text-[#5A6679]">
                  Revolving corporate purchasing facility with consolidated monthly Net-30 settlement invoicing.
                </p>
              </div>
            )}

            {/* Expired Facility Warning */}
            {isExpired && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-sm">Time-Limited Promotional Credit Expired</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-800">
                  Your promotional credit facility of <strong>{convertUsdToCustomer(creditLimit, customerCurrency, customerRate).display}</strong> ({formatUSD(creditLimit)} USD) expired on {creditAccount?.expires_at ? new Date(creditAccount.expires_at).toLocaleString() : 'the designated deadline'}. Unused credit has lapsed. Please contact Studio Admin to renew.
                </p>
              </div>
            )}

            {/* Terms / Subtext */}
            {hasActiveCredit && (
              <div className="pt-1 text-xs text-[#5A6679] flex items-center justify-between border-t border-[#E8D7B7]/60">
                <span>Terms: <strong>{creditAccount?.validity_duration || 'Net-30 Billing Cycle'}</strong></span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Guaranteed CAD Delivery</span>
                </span>
              </div>
            )}
          </div>

          {/* Action button aligned with Card 1 button */}
          <div className="pt-4">
            {hasActiveCredit ? (
              <button
                disabled={usedCredit <= 0}
                onClick={openRepayModal}
                className={`w-full h-12 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  usedCredit > 0
                    ? 'bg-gradient-to-r from-[#17345C] to-[#0B1330] hover:from-[#1E4273] hover:to-[#17345C] text-[#F5E7A3] border border-[#D4AF37] hover:shadow-md'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <Receipt className="w-4 h-4 text-[#D4AF37]" />
                <span>
                  {usedCredit > 0
                    ? `Settle Credit Bill (${convertUsdToCustomer(usedCredit, customerCurrency, customerRate).display}${customerCurrency !== 'USD' ? ` / $${usedCredit.toFixed(2)}` : ''})`
                    : 'No Outstanding Bill Due'}
                </span>
              </button>
            ) : (
              <button
                disabled
                className="w-full h-12 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
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
                (showAllTransactions ? transactions : transactions.slice(0, 5)).map((tx) => {
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
                          {isTopup || isRepayment ? '+' : '-'}
                          {tx.original_amount && tx.currency === customerCurrency
                            ? `${customerSymbol}${Number(tx.original_amount).toLocaleString(customerCurrency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : convertUsdToCustomer(tx.amount, customerCurrency, customerRate).display}
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

        {transactions.length > 5 && (
          <div className="p-3 bg-[#FAF8F5] border-t border-[#E8D7B7] flex items-center justify-between px-6">
            <span className="text-xs text-[#5A6679] font-mono">
              Showing <span className="font-bold text-[#17345C]">{showAllTransactions ? transactions.length : Math.min(5, transactions.length)}</span> of <span className="font-bold text-[#17345C]">{transactions.length}</span> entries
            </span>
            <button
              type="button"
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#FFF9F0] border border-[#E8D7B7] text-xs font-mono font-bold text-[#17345C] hover:border-[#B88732] hover:text-[#B88732] transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <span>
                {showAllTransactions
                  ? 'Show Less'
                  : `Show More (${transactions.length - 5} More)`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#B88732] transition-transform duration-200 ${
                  showAllTransactions ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        )}
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

            {/* Top-up Method Switcher: Razorpay (Instant) vs Manual Bank Wire */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF8F5] rounded-xl border border-[#E8D7B7]">
              <button
                type="button"
                onClick={() => setTopupMode('razorpay')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  topupMode === 'razorpay'
                    ? 'bg-[#17345C] text-[#F5E7A3] shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Razorpay (Instant)</span>
              </button>
              <button
                type="button"
                onClick={() => setTopupMode('manual')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  topupMode === 'manual'
                    ? 'bg-white text-[#17345C] shadow-sm border border-[#D4AF37]/40'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Bank Wire / UTR</span>
              </button>
            </div>

            {topupMode === 'razorpay' ? (
              <div className="space-y-4 pt-2">
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
                      min="1"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#E8D7B7] text-sm font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#B88732]"
                    />
                  </div>

                  {customerCurrency !== 'USD' && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Float Credited in Base USD:</span>
                        <strong className="font-mono text-emerald-800 text-sm">
                          ≈ {convertCustomerToUsd(topupAmount, customerCurrency, customerRate).displayUsd} USD
                        </strong>
                      </div>
                      <div className="text-[10px] text-emerald-700/80 font-mono text-right">
                        Conversion Rate: 1 USD = {customerSymbol}{Number(customerRate).toFixed(2)} {customerCurrency}
                      </div>
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
                        {customerSymbol}{Number(preset).toLocaleString(customerCurrency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0B1330] via-[#17345C] to-[#0B1330] text-[#F5F1E8] border border-[#D4AF37]/40 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-[#F5E7A3]">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>Instant Credit Verification</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Pay securely with UPI, Credit/Debit Card, or Netbanking via Razorpay. Your Atelier Wallet balance is credited instantly upon authorization.
                  </p>
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
                    type="button"
                    onClick={handleRazorpayTopup}
                    disabled={submittingTopup}
                    className="btn-gold-luxury px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingTopup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    <span>Recharge Instantly ({customerSymbol}{Number(topupAmount || 0).toLocaleString()})</span>
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleTopupSubmit} className="space-y-4 pt-2">
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
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Float Credited in Base USD:</span>
                      <strong className="font-mono text-emerald-800 text-sm">
                        ≈ {convertCustomerToUsd(topupAmount, customerCurrency, customerRate).displayUsd} USD
                      </strong>
                    </div>
                    <div className="text-[10px] text-emerald-700/80 font-mono text-right">
                      Conversion Rate: 1 USD = {customerSymbol}{Number(customerRate).toFixed(2)} {customerCurrency}
                    </div>
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
                      {customerSymbol}{Number(preset).toLocaleString(customerCurrency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Bank Details Card from Admin */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] space-y-2 text-xs text-[#17243B]">
                <div className="font-semibold text-[11px] uppercase tracking-wider text-[#B88732] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#B88732]" />
                    <span>{bankDetails.beneficiaryName || 'Shiuli Atelier Official Treasury'}</span>
                  </div>
                  {bankDetails.accountType && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-[#B88732] border border-[#E8D7B7]">
                      {bankDetails.accountType}
                    </span>
                  )}
                </div>
                <div className="text-[11px] space-y-1 text-slate-700 font-mono">
                  <div className="flex items-center justify-between">
                    <span>Bank: <strong>{bankDetails.bankName || 'HDFC Bank Ltd.'}</strong></span>
                    {bankDetails.branch && (
                      <span className="text-[10px] text-slate-500 font-sans">{bankDetails.branch}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-[#E8D7B7]">
                    <span>Account: <strong className="text-slate-900 tracking-wide">{bankDetails.accountNumber}</strong></span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankDetails.accountNumber, 'topup_acc')}
                      className="text-[10px] text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'topup_acc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'topup_acc' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-[#E8D7B7]">
                    <span>IFSC: <strong className="text-slate-900">{bankDetails.ifscCode}</strong></span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankDetails.ifscCode, 'topup_ifsc')}
                      className="text-[10px] text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'topup_ifsc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'topup_ifsc' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  {bankDetails.swiftCode && (
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>SWIFT/BIC: <strong className="text-slate-700">{bankDetails.swiftCode}</strong></span>
                      <button
                        type="button"
                        onClick={() => handleCopy(bankDetails.swiftCode, 'topup_swift')}
                        className="text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'topup_swift' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'topup_swift' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                  {bankDetails.upiId && customerCurrency === 'INR' && (
                    <div className="flex items-center justify-between bg-amber-50/50 px-2 py-1 rounded border border-amber-200/50">
                      <span>UPI ID: <strong className="text-slate-900">{bankDetails.upiId}</strong></span>
                      <button
                        type="button"
                        onClick={() => handleCopy(bankDetails.upiId, 'topup_upi')}
                        className="text-[10px] text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'topup_upi' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'topup_upi' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
                {bankDetails.notes && (
                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-[#E8D7B7]/60 leading-normal">
                    {bankDetails.notes}
                  </p>
                )}
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
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 2: SETTLE USED CREDIT BILL (RAZORPAY & WIRE) ──────────────── */}
      {showRepayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E8D7B7] shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-[#17345C] to-[#0B1330] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#F5E7A3]">
                  <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-white">
                    Settle Credit Bill
                  </h3>
                  <p className="text-xs text-[#F5E7A3]/80">
                    Revolving Corporate Credit Line Settlement
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRepayModal(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            {repaySuccessData ? (
              <div className="p-6 text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-bold text-[#17243B]">
                    Credit Bill Settled Successfully!
                  </h4>
                  <p className="text-xs text-slate-600">
                    Your revolving corporate credit limit has been restored immediately.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] text-left text-xs space-y-2 font-mono">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Amount Paid:</span>
                    <strong className="text-emerald-700 font-bold text-sm">
                      {customerSymbol}{repaySuccessData.amount.toLocaleString()} ({formatUSD(repaySuccessData.amountUsd)})
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Payment Gateway:</span>
                    <span className="font-bold text-[#17345C]">Razorpay Verified</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Transaction ID:</span>
                    <span className="text-slate-700 font-semibold">{repaySuccessData.paymentId}</span>
                  </div>
                  {repaySuccessData.restoredLimit !== undefined && (
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500">New Available Credit:</span>
                      <strong className="text-[#B88732] font-bold">
                        {convertUsdToCustomer(repaySuccessData.restoredLimit, customerCurrency, customerRate).display}
                      </strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowRepayModal(false);
                    setRepaySuccessData(null);
                  }}
                  className="w-full btn-gold-luxury py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
                >
                  Done & Return to Portfolio
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Outstanding Balance Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between text-amber-950">
                  <div className="space-y-0.5">
                    <span className="text-xs uppercase font-bold tracking-wider text-amber-800">
                      Total Outstanding Balance
                    </span>
                    <div className="text-xl font-bold font-mono text-[#17243B]">
                      {convertUsdToCustomer(usedCredit, customerCurrency, customerRate).display}
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono text-slate-500">
                    <div>USD Base: <strong>${usedCredit.toFixed(2)}</strong></div>
                    <div className="text-[11px] text-emerald-700 font-semibold">Ready for Clearance</div>
                  </div>
                </div>

                {/* Method Switcher Tabs */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setRepayMethod('razorpay');
                      setRepayError('');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      repayMethod === 'razorpay'
                        ? 'bg-white text-[#17345C] shadow-sm border border-[#D4AF37]/40'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Razorpay (Instant)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRepayMethod('manual');
                      setRepayError('');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      repayMethod === 'manual'
                        ? 'bg-white text-[#17345C] shadow-sm border border-[#D4AF37]/40'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Bank Wire / UTR</span>
                  </button>
                </div>

                {/* Error Banner */}
                {repayError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{repayError}</span>
                  </div>
                )}

                {/* Amount Input & Fast Quick-Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#17243B]">
                      Repayment Amount ({customerCurrency})
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Max: {convertUsdToCustomer(usedCredit, customerCurrency, customerRate).display}
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono text-base">
                      {customerSymbol}
                    </span>
                    <input
                      type="number"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      placeholder="Enter amount"
                      required
                      min="1"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#E8D7B7] text-base font-mono font-bold text-[#17243B] focus:outline-none focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732]"
                    />
                  </div>

                  {/* Preset Quick Chips */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const full = customerCurrency === 'USD' ? usedCredit : Math.round(usedCredit * customerRate);
                        setRepayAmount(String(full));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#FFF9F0] border border-[#E8D7B7] text-[11px] font-mono font-bold text-[#17345C] cursor-pointer"
                    >
                      100% Full ({customerSymbol}{(customerCurrency === 'USD' ? usedCredit : Math.round(usedCredit * customerRate)).toLocaleString()})
                    </button>
                    {usedCredit > 10 && (
                      <button
                        type="button"
                        onClick={() => {
                          const half = customerCurrency === 'USD' ? Math.round((usedCredit / 2) * 100) / 100 : Math.round((usedCredit * customerRate) / 2);
                          setRepayAmount(String(half));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#FFF9F0] border border-[#E8D7B7] text-[11px] font-mono font-semibold text-slate-700 cursor-pointer"
                      >
                        50% Half
                      </button>
                    )}
                    {usedCredit > 25 && (
                      <button
                        type="button"
                        onClick={() => {
                          const quarter = customerCurrency === 'USD' ? Math.round((usedCredit / 4) * 100) / 100 : Math.round((usedCredit * customerRate) / 4);
                          setRepayAmount(String(quarter));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#FFF9F0] border border-[#E8D7B7] text-[11px] font-mono font-semibold text-slate-700 cursor-pointer"
                      >
                        25%
                      </button>
                    )}
                  </div>

                  {/* Live Conversion Preview */}
                  {customerCurrency !== 'USD' && repayAmount && !isNaN(parseFloat(repayAmount)) && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                      <span>Deducted from USD Debt:</span>
                      <strong className="font-mono text-emerald-800 text-sm">
                        ≈ {convertCustomerToUsd(repayAmount, customerCurrency, customerRate).displayUsd} USD
                      </strong>
                    </div>
                  )}
                </div>

                {/* Option 1: Razorpay Instant Flow */}
                {repayMethod === 'razorpay' ? (
                  <div className="space-y-4 pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#17243B]">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Supported Payment Methods</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          Instant Clearance
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span><strong>UPI:</strong> Google Pay, PhonePe, Paytm, BHIM, Cred</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span><strong>Cards:</strong> Visa, Mastercard, RuPay, Corporate Amex</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span><strong>NetBanking:</strong> HDFC, ICICI, SBI, Axis, Kotak & 50+ Banks</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRepayModal(false)}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={submittingRepay || !repayAmount || parseFloat(repayAmount) <= 0}
                        onClick={handleRazorpayRepay}
                        className="btn-gold-luxury flex-1 py-3 px-5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingRepay ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        <span>
                          {submittingRepay
                            ? 'Launching Razorpay...'
                            : `Pay ${customerSymbol}${Number(repayAmount || 0).toLocaleString()} via Razorpay`}
                        </span>
                      </button>
                    </div>

                    {/* Simulation helper for test environments */}
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleSimulateRazorpaySuccess}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Test Sandbox: Simulate Successful Payment
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Option 2: Manual Bank Wire / UTR Slip */
                  <form onSubmit={handleRepaySubmit} className="space-y-4 pt-1">
                    {/* Dynamic Bank Details Card from Admin */}
                    <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] space-y-2 text-xs text-[#17243B]">
                      <div className="font-semibold text-[11px] uppercase tracking-wider text-[#B88732] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#B88732]" />
                          <span>{bankDetails.beneficiaryName || 'Shiuli Atelier Official Bank Details'}</span>
                        </div>
                        {bankDetails.accountType && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-[#B88732] border border-[#E8D7B7]">
                            {bankDetails.accountType}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] space-y-1 text-slate-700 font-mono">
                        <div className="flex items-center justify-between">
                          <span>Bank: <strong>{bankDetails.bankName || 'HDFC Bank Ltd.'}</strong></span>
                          {bankDetails.branch && (
                            <span className="text-[10px] text-slate-500 font-sans">{bankDetails.branch}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-[#E8D7B7]">
                          <span>Account: <strong className="text-slate-900 tracking-wide">{bankDetails.accountNumber}</strong></span>
                          <button
                            type="button"
                            onClick={() => handleCopy(bankDetails.accountNumber, 'repay_acc')}
                            className="text-[10px] text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === 'repay_acc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === 'repay_acc' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-[#E8D7B7]">
                          <span>IFSC: <strong className="text-slate-900">{bankDetails.ifscCode}</strong></span>
                          <button
                            type="button"
                            onClick={() => handleCopy(bankDetails.ifscCode, 'repay_ifsc')}
                            className="text-[10px] text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === 'repay_ifsc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === 'repay_ifsc' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        {bankDetails.swiftCode && (
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                            <span>SWIFT/BIC: <strong className="text-slate-700">{bankDetails.swiftCode}</strong></span>
                            <button
                              type="button"
                              onClick={() => handleCopy(bankDetails.swiftCode, 'repay_swift')}
                              className="text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === 'repay_swift' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === 'repay_swift' ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}
                        {bankDetails.upiId && customerCurrency === 'INR' && (
                          <div className="flex items-center justify-between bg-amber-50/50 px-2 py-1 rounded border border-amber-200/50">
                            <span>UPI ID: <strong className="text-slate-900">{bankDetails.upiId}</strong></span>
                            <button
                              type="button"
                              onClick={() => handleCopy(bankDetails.upiId, 'repay_upi')}
                              className="text-[10px] text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === 'repay_upi' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === 'repay_upi' ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      {bankDetails.notes && (
                        <p className="text-[10px] text-slate-500 italic pt-1 border-t border-[#E8D7B7]/60 leading-normal">
                          {bankDetails.notes}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#17243B] mb-1">
                        Bank Reference / UTR / Transaction ID
                      </label>
                      <input
                        type="text"
                        value={repayRef}
                        onChange={(e) => setRepayRef(e.target.value)}
                        placeholder="e.g. UTR-983749284 / Wire Ref"
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
                        {submittingRepay ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>Submit Wire Slip</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
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
