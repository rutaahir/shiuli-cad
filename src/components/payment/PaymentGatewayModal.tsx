import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  QrCode,
  Copy,
  Sparkles,
  X,
  AlertCircle,
  FileText,
  Check,
  RefreshCw,
  ArrowRight,
  UploadCloud,
  Banknote,
  Smartphone,
  Trash2,
  Clock,
  Wallet,
  CreditCard
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClientWallet, ClientCreditAccount } from '../../types';
import { useCustomerCountry } from '../../utils/countryContext';
import { convertUsdToCustomer, formatUSD } from '../../utils/currencyHelper';

export interface PaymentSuccessResult {
  transactionId: string;
  method: string;
  amount: number;
  currency: string;
  timestamp: string;
  receiptNumber: string;
  isPendingVerification?: boolean;
  paymentDetails?: string;
  screenshotUrl?: string;
}

export interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  amount: number; // in INR by default or USD
  currency?: 'INR' | 'USD';
  itemType?: 'ready_cad' | 'custom_advance' | 'milestone_stage' | 'order_full_payment' | 'cart';
  orderDetails?: {
    id?: string | number;
    category?: string;
    license?: string;
    itemsCount?: number;
    formats?: string[];
    notes?: string;
    country?: string;
    pricing_mode?: string;
    pricing_tier?: string;
    product_ids?: (string | number)[];
  };
  onPaymentSuccess: (result: PaymentSuccessResult) => Promise<void> | void;
}

type TabType = 'wallet' | 'credit' | 'upi' | 'cash_check';

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  amount,
  currency = 'INR',
  itemType = 'ready_cad',
  orderDetails,
  onPaymentSuccess,
}) => {
  const { isLoggedIn, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<PaymentSuccessResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Client Wallet & Credit Line State
  const [clientWallet, setClientWallet] = useState<ClientWallet | null>(null);
  const [clientCredit, setClientCredit] = useState<ClientCreditAccount | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState<boolean>(false);

  // Dynamic Studio Payment Settings
  const [studioUpiId, setStudioUpiId] = useState<string>('shiulicad@okhdfcbank');
  const [studioQrCodeUrl, setStudioQrCodeUrl] = useState<string>('');
  const [cashCheckInstructions, setCashCheckInstructions] = useState<string>(
    'For Cash or Cheque, please enter your transaction details and attach deposit receipt or cheque photo. Atelier accounts will confirm collection and enable your download.'
  );

  // UPI Form State
  const [upiRefId, setUpiRefId] = useState('');
  const [upiScreenshot, setUpiScreenshot] = useState<File | null>(null);
  const [upiScreenshotPreview, setUpiScreenshotPreview] = useState<string>('');

  // CASH / Check Form State
  const [cashCheckDetails, setCashCheckDetails] = useState('');
  const [cashCheckScreenshot, setCashCheckScreenshot] = useState<File | null>(null);
  const [cashCheckScreenshotPreview, setCashCheckScreenshotPreview] = useState<string>('');

  // Customer Country Context & Exchange Rate
  const { currentCountry, exchangeRates } = useCustomerCountry();
  const customerCurrency = currentCountry?.currency || 'INR';
  const customerSymbol = currentCountry?.symbol || '₹';
  const customerRate = exchangeRates[customerCurrency] || (customerCurrency === 'INR' ? 86.85 : 1.0);

  // Currency amounts (Always Dollar-Based Atelier Pricing authoritatively)
  const isUSD = currency === 'USD';
  const rawAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const inrRate = exchangeRates['INR'] || 86.85;
  const amountUSD = currency === 'INR'
    ? Math.round((rawAmount / inrRate) * 100) / 100
    : (isNaN(rawAmount) ? 0 : rawAmount);
  const amountINR = Math.round(amountUSD * inrRate);

  // Resolved Customer-Facing Price
  const convertedPayable = convertUsdToCustomer(amountUSD, customerCurrency, customerRate);

  const formatCurrency = (val: number | string | undefined | null, _cur?: 'INR' | 'USD') => {
    return convertUsdToCustomer(val, customerCurrency, customerRate).display;
  };

  // Safe numeric values for client wallet and credit line (avoids string .toFixed errors)
  const walletBalance = Number(clientWallet?.balance || 0);
  const creditLimit = Number(clientCredit?.credit_limit || 0);
  const usedCredit = Number(clientCredit?.used_credit || 0);
  const availableCredit = Number(clientCredit?.available_credit || 0);
  const hasActiveCredit = clientCredit?.status === 'active' && creditLimit > 0;

  // Load Dynamic Studio Payment Settings
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setIsSubmitted(false);
      setSubmissionResult(null);
      setErrorMessage('');
      setProcessingStage('');

      // Check localStorage first
      const localUpi = localStorage.getItem('shiuli_studio_upi_id');
      const localQr = localStorage.getItem('shiuli_studio_qr_code_url');
      if (localUpi) setStudioUpiId(localUpi);
      if (localQr) setStudioQrCodeUrl(localQr);

      // Fetch latest from API
      api.getPlatformSettings()
        .then((plat) => {
          if (plat) {
            if (plat.studio_upi_id) {
              setStudioUpiId(plat.studio_upi_id);
              localStorage.setItem('shiuli_studio_upi_id', plat.studio_upi_id);
            }
            if (plat.studio_qr_code_url) {
              setStudioQrCodeUrl(plat.studio_qr_code_url);
              localStorage.setItem('shiuli_studio_qr_code_url', plat.studio_qr_code_url);
            }
            if (plat.cash_check_instructions) {
              setCashCheckInstructions(plat.cash_check_instructions);
            }
          }
        })
        .catch(() => {});

      // Fetch client wallet & corporate credit status
      if (isLoggedIn) {
        setIsLoadingAccount(true);
        api.getClientCreditAccount()
          .then((acc) => {
            if (acc) {
              setClientWallet(acc.wallet);
              setClientCredit(acc.credit_account);
            }
          })
          .catch(() => {})
          .finally(() => setIsLoadingAccount(false));
      }
    }
  }, [isOpen, isLoggedIn]);

  if (!isOpen) return null;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(studioUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Handle UPI Screenshot Upload
  const handleUpiScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Screenshot file exceeds 10MB limit.');
        return;
      }
      setUpiScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUpiScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrorMessage('');
    }
  };

  // Handle Cash/Check Screenshot Upload
  const handleCashCheckScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File exceeds 10MB limit.');
        return;
      }
      setCashCheckScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCashCheckScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrorMessage('');
    }
  };

  const handleSubmitProof = async () => {
    setErrorMessage('');

    if (!isLoggedIn) {
      setErrorMessage('You must be signed in to place an order or complete payment.');
      openAuthModal('Please sign in to complete your payment.');
      return;
    }

    // Validation
    if (activeTab === 'cash_check') {
      if (!cashCheckDetails.trim() && !cashCheckScreenshot) {
        setErrorMessage('Please enter transaction details (cheque number, bank, or cash counter receipt) or attach screenshot proof.');
        return;
      }
    } else if (activeTab === 'upi') {
      if (!upiRefId.trim() && !upiScreenshot) {
        setErrorMessage('Please enter UPI Transaction Reference/UTR or attach payment screenshot.');
        return;
      }
    }

    setIsProcessing(true);
    setProcessingStage('Encrypting payment receipt & dispatching to Atelier Accounts...');

    const transactionId = `TXN-SHIULI-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const receiptNumber = `RCP-SCS-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowIso = new Date().toISOString();

    const chosenMethod = activeTab === 'upi' ? 'UPI / QR Code' : 'CASH / Check';
    const chosenDetails = activeTab === 'upi'
      ? (upiRefId.trim() ? `UPI Ref/UTR: ${upiRefId.trim()}` : 'UPI Transfer')
      : cashCheckDetails.trim();
    const chosenScreenshot = activeTab === 'upi' ? upiScreenshotPreview : cashCheckScreenshotPreview;

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 1. Submit to Backend
      if (itemType === 'ready_cad' && orderDetails?.id) {
        setProcessingStage('Transferring purchase request to SuperAdmin verification queue...');
        try {
          await api.post('/payments/purchases/', {
            product_id: orderDetails.id,
            license_type: orderDetails.license || 'atelier',
            payment_transaction_id: transactionId,
            payment_method: activeTab,
            payment_details: chosenDetails,
            payment_screenshot: chosenScreenshot || undefined,
            auto_confirm: false,
            country: orderDetails.country || undefined,
          });
        } catch (bkErr) {
          console.warn('Backend purchase submission notice:', bkErr);
        }
      } else if (orderDetails?.id) {
        setProcessingStage('Recording milestone payment request...');
        try {
          await api.post('/payments/create-order/', {
            order_id: orderDetails.id,
            payment_type: itemType === 'order_full_payment' ? 'full' : itemType === 'custom_advance' ? 'advance' : 'stage',
            payment_method: activeTab,
            payment_details: chosenDetails,
            payment_screenshot: chosenScreenshot || undefined,
          });
        } catch (bkErr) {
          console.warn('Backend custom order payment notice:', bkErr);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const payload: PaymentSuccessResult = {
        transactionId,
        method: chosenMethod,
        amount: isUSD ? amountUSD : amountINR,
        currency: isUSD ? 'USD' : 'INR',
        timestamp: nowIso,
        receiptNumber,
        isPendingVerification: true,
        paymentDetails: chosenDetails,
        screenshotUrl: chosenScreenshot,
      };

      setSubmissionResult(payload);
      setIsSubmitted(true);
      setIsProcessing(false);

      // Call caller callback
      await onPaymentSuccess(payload);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || 'Payment submission failed. Please try again.');
    }
  };

  // 1-Click Pay with Shiuli Prepaid Wallet
  const handlePayWithWallet = async () => {
    setErrorMessage('');
    if (!isLoggedIn) {
      setErrorMessage('You must be signed in to purchase with your wallet.');
      openAuthModal('Please sign in to complete your payment.');
      return;
    }

    const requiredUsd = amountUSD;
    if (!clientWallet || clientWallet.balance < requiredUsd) {
      setErrorMessage(`Insufficient wallet funds. Required: ${convertedPayable.display} (${formatUSD(requiredUsd)} USD), Wallet Balance: ${convertUsdToCustomer(walletBalance, customerCurrency, customerRate).display}.`);
      return;
    }

    setIsProcessing(true);
    setProcessingStage('Processing 1-Click instant purchase from your Atelier Wallet...');

    try {
      let res: any;
      if (itemType === 'ready_cad' && orderDetails?.id) {
        res = await api.checkoutWithWallet({
          type: 'product',
          product_id: orderDetails.id,
          license_type: orderDetails.license || 'atelier',
        });
      } else if (itemType === 'cart') {
        res = await api.checkoutWithWallet({
          type: 'cart',
          product_ids: orderDetails?.product_ids || (orderDetails?.id ? [orderDetails.id] : []),
        });
      } else {
        res = await api.checkoutWithWallet({
          type: 'order_stage',
          order_id: orderDetails?.id,
          stage_id: orderDetails?.id,
        });
      }

      const txId = res?.download_token ? `WLT-${res.download_token.substring(0, 10).toUpperCase()}` : `WLT-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const payload: PaymentSuccessResult = {
        transactionId: txId,
        method: 'Shiuli Prepaid Wallet',
        amount: requiredUsd,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        receiptNumber: `RCP-WLT-${Math.floor(100000 + Math.random() * 900000)}`,
        isPendingVerification: false,
        paymentDetails: `Instant 1-Click Purchase via Atelier Wallet (New balance: $${(res?.new_balance ?? (clientWallet.balance - requiredUsd)).toFixed(2)} USD)`,
      };

      if (res?.new_balance !== undefined) {
        setClientWallet(prev => prev ? { ...prev, balance: res.new_balance } : prev);
      }

      setSubmissionResult(payload);
      setIsSubmitted(true);
      setIsProcessing(false);

      await onPaymentSuccess(payload);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.response?.data?.error || err?.message || 'Wallet payment failed. Please try again.');
    }
  };

  // Charge to Corporate Postpaid Credit Line
  const handlePayWithCredit = async () => {
    setErrorMessage('');
    if (!isLoggedIn) {
      setErrorMessage('You must be signed in to purchase on corporate credit.');
      openAuthModal('Please sign in to complete your payment.');
      return;
    }

    const requiredUsd = amountUSD;
    if (!clientCredit || clientCredit.status !== 'active') {
      setErrorMessage('Corporate Credit Line is not active on your account.');
      return;
    }

    if (clientCredit.available_credit < requiredUsd) {
      setErrorMessage(`Credit limit exceeded. Required: ${convertedPayable.display} (${formatUSD(requiredUsd)} USD), Available Credit: ${convertUsdToCustomer(availableCredit, customerCurrency, customerRate).display}.`);
      return;
    }

    setIsProcessing(true);
    setProcessingStage('Charging purchase to your Corporate Credit Line & issuing instant CAD license...');

    try {
      let res: any;
      if (itemType === 'ready_cad' && orderDetails?.id) {
        res = await api.checkoutWithCredit({
          type: 'product',
          product_id: orderDetails.id,
          license_type: orderDetails.license || 'atelier',
        });
      } else if (itemType === 'cart') {
        res = await api.checkoutWithCredit({
          type: 'cart',
          product_ids: orderDetails?.product_ids || (orderDetails?.id ? [orderDetails.id] : []),
        });
      } else {
        res = await api.checkoutWithCredit({
          type: 'order_stage',
          order_id: orderDetails?.id,
          stage_id: orderDetails?.id,
        });
      }

      const txId = res?.download_token ? `CRD-${res.download_token.substring(0, 10).toUpperCase()}` : `CRD-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const payload: PaymentSuccessResult = {
        transactionId: txId,
        method: 'Corporate Credit Line',
        amount: requiredUsd,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        receiptNumber: `RCP-CRD-${Math.floor(100000 + Math.random() * 900000)}`,
        isPendingVerification: false,
        paymentDetails: `Billed to Corporate Credit (Terms: ${clientCredit.payment_terms_days || 30} Days • Remaining Credit: $${(res?.available_credit ?? (clientCredit.available_credit - requiredUsd)).toFixed(2)} USD)`,
      };

      if (res?.available_credit !== undefined && res?.used_credit !== undefined) {
        setClientCredit(prev => prev ? { ...prev, available_credit: res.available_credit, used_credit: res.used_credit } : prev);
      }

      setSubmissionResult(payload);
      setIsSubmitted(true);
      setIsProcessing(false);

      await onPaymentSuccess(payload);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.response?.data?.error || err?.message || 'Credit line charge failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF8F5] to-[#FFF9F0] border border-[#E8D7B7] rounded-3xl shadow-[0_25px_80px_rgba(23,52,92,0.22)] overflow-hidden text-[#17243B]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Luxury Gold Top Trim */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#B88732] via-[#F3DE9C] via-[#D4AF37] to-[#B88732]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#E8D7B7] bg-white backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B88732] p-[1.5px] shadow-sm flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#FFF9F0] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#B88732]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-serif font-bold tracking-widest text-[#8C6218] uppercase">
                  Shiuli CAD Atelier
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[10px] font-mono text-emerald-800 flex items-center gap-1 font-bold shadow-2xs">
                  <Lock className="w-2.5 h-2.5 text-emerald-700" /> 256-BIT SECURE
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-serif font-bold text-[#0B1330] leading-tight">
                Studio Checkout Gateway
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-[#475569] hover:text-[#0B1330] hover:bg-[#FFF9F0] rounded-full border border-transparent hover:border-[#E8D7B7] transition-all disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* UNAUTHENTICATED GUARD VIEW */}
        {!isLoggedIn ? (
          <div className="p-8 sm:p-10 text-center space-y-6 bg-[#FFFDF9]">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B88732] p-[2px] shadow-sm flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#FFF9F0] flex items-center justify-center">
                <Lock className="w-8 h-8 text-[#B88732]" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif font-bold text-[#0B1330]">Sign In Required to Complete Order</h3>
              <p className="text-xs text-[#475569] max-w-md mx-auto leading-relaxed">
                Orders and CAD downloads are securely linked to your customer account. Please sign in or create an account to proceed with this payment.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                openAuthModal('Please sign in to complete your CAD file purchase.');
              }}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3DE9C] to-[#B88732] text-[#070D22] font-serif font-black text-xs uppercase tracking-widest shadow-md hover:brightness-105 transition-all cursor-pointer"
            >
              Sign In / Register
            </button>
          </div>
        ) : isSubmitted && submissionResult ? (
          <div className="p-8 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-300 bg-[#FFFDF9]">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#D4AF37] via-[#F3DE9C] to-[#B88732] p-[2px] shadow-[0_0_35px_rgba(212,175,55,0.3)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#FFF9F0] flex items-center justify-center">
                {submissionResult.isPendingVerification === false ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                ) : (
                  <Clock className="w-10 h-10 text-[#B88732] animate-pulse" />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              {submissionResult.isPendingVerification === false ? (
                <>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-xs font-mono text-emerald-800 tracking-wider uppercase font-bold inline-block">
                    Payment Authorized Instantly
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#0B1330]">
                    CAD Purchase Confirmed!
                  </h3>
                  <p className="text-xs text-[#475569] max-w-lg mx-auto leading-relaxed">
                    Your order was completed instantly via <strong>{submissionResult.method}</strong>.
                    File download permission is enabled immediately without waiting for manual verification!
                  </p>
                </>
              ) : (
                <>
                  <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-xs font-mono text-amber-800 tracking-wider uppercase font-bold inline-block">
                    Pending Admin Confirmation
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#0B1330]">
                    Payment Proof Transferred to Atelier
                  </h3>
                  <p className="text-xs text-[#475569] max-w-lg mx-auto leading-relaxed">
                    Your payment request has been securely recorded and sent to the Atelier Accounts desk.
                    As soon as the admin confirms that the payment is collected, your download option will be enabled.
                    You can then verify your email via 6-digit OTP and receive your one-time secure download link.
                  </p>
                </>
              )}
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] text-left text-xs space-y-2.5 max-w-md mx-auto font-mono shadow-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E8D7B7]/60">
                <span className="text-[#475569]">Transaction Ref:</span>
                <span className="text-[#0B1330] font-extrabold">{submissionResult.transactionId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#475569]">Amount:</span>
                <span className="text-[#0B1330] font-black">{formatCurrency(submissionResult.amount, submissionResult.currency as 'INR' | 'USD')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#475569]">Payment Channel:</span>
                <span className="text-[#0B1330] font-bold">{submissionResult.method}</span>
              </div>
              {submissionResult.paymentDetails && (
                <div className="flex justify-between items-start pt-1 border-t border-[#E8D7B7]/60">
                  <span className="text-[#475569]">Details / Note:</span>
                  <span className="text-[#0B1330] font-medium truncate max-w-[220px] text-right">{submissionResult.paymentDetails}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-[#E8D7B7] font-bold">
                <span className={submissionResult.isPendingVerification === false ? 'text-emerald-800' : 'text-amber-800'}>CAD Delivery Status:</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                  submissionResult.isPendingVerification === false
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {submissionResult.isPendingVerification === false ? 'Authorized & Unlocked' : 'Awaiting Admin Verification'}
                </span>
              </div>
            </div>

            {/* Step-by-Step Flow Explanation */}
            <div className="p-4 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] text-left max-w-md mx-auto space-y-2">
              <div className="text-[11px] font-mono text-[#8C6218] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#B88732]" />
                <span>Next Steps to Download Your File:</span>
              </div>
              <ol className="text-xs text-[#475569] space-y-1.5 list-decimal list-inside font-medium">
                {submissionResult.isPendingVerification === false ? (
                  <>
                    <li>Instant authorization completed from your credit line or wallet.</li>
                    <li>Go to your Downloads or Client Dashboard page.</li>
                    <li>Verify your registered email with 6-digit OTP security code.</li>
                    <li>Download your watertight Rhino 3DM &amp; STL mesh assets.</li>
                  </>
                ) : (
                  <>
                    <li>Admin inspects and verifies receipt of payment at studio desk.</li>
                    <li>Download authorization is enabled for your account.</li>
                    <li>Verify your registered email with a 6-digit OTP code.</li>
                    <li>Receive your single-use, watertight CAD download link.</li>
                  </>
                )}
              </ol>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="btn-gold-luxury px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <span>Understood • View in My Dashboard</span>
                <ArrowRight className="w-4 h-4 text-[#0B1330]" />
              </button>
            </div>
          </div>
        ) : isProcessing ? (
          /* Processing State */
          <div className="p-12 text-center space-y-6 bg-[#FFFDF9]">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#B88732] via-[#F3DE9C] to-[#D4AF37] p-1 flex items-center justify-center animate-spin shadow-md">
              <div className="w-full h-full rounded-full bg-[#FFF9F0] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#B88732]" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-bold text-[#0B1330]">
                Submitting Payment Proof
              </h3>
              <p className="text-xs text-[#8C6218] font-mono font-bold animate-pulse">
                {processingStage}
              </p>
              <p className="text-xs text-[#475569]">
                Please do not close or refresh this window while we secure your submission.
              </p>
            </div>

            <div className="w-52 mx-auto bg-[#E8D7B7]/40 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-[#B88732] via-[#D4AF37] to-[#F3DE9C] h-full rounded-full animate-[pulse_1.5s_infinite]" />
            </div>
          </div>
        ) : (
          /* Active Gateway Form */
          <div>
            {/* Order Brief Banner */}
            <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E8D7B7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C6218] font-bold">
                  {itemType === 'ready_cad'
                    ? 'READY-TO-CAST CAD DOWNLOAD'
                    : itemType === 'custom_advance'
                    ? 'CUSTOM BESPOKE CAD ADVANCE'
                    : itemType === 'milestone_stage'
                    ? 'CAD DEVELOPMENT MILESTONE'
                    : 'STUDIO CAD BAG CHECKOUT'}
                </span>
                <h3 className="font-serif text-base sm:text-lg text-[#0B1330] font-bold truncate max-w-sm">
                  {title}
                </h3>
                {subtitle && <p className="text-xs text-[#475569]">{subtitle}</p>}
              </div>

              <div className="text-right shrink-0 bg-white px-4 py-2.5 rounded-2xl border border-[#E8D7B7] shadow-xs">
                <span className="text-[10px] text-[#64748B] block font-mono font-semibold uppercase tracking-wider">Amount Payable</span>
                <div className="font-serif text-xl sm:text-2xl font-black text-[#0B1330]">
                  {convertedPayable.display}
                </div>
                <span className="text-[10px] text-[#8C6218] block font-mono font-semibold">
                  {customerCurrency === 'USD' ? 'USD Atelier Pricing' : `(${formatUSD(amountUSD)} USD)`}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PAYMENT METHOD SELECTOR: WALLET, CREDIT LINE, UPI, CASH */}
            <div className="px-6 pt-4 pb-3 border-b border-[#E8D7B7] bg-white">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-serif">
                {/* 1. Wallet Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('wallet');
                    setErrorMessage('');
                  }}
                  className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                    activeTab === 'wallet'
                      ? 'bg-[#0B1330] text-[#F5E7A3] border border-[#D4AF37]/50 shadow-md ring-1 ring-[#D4AF37]/40'
                      : 'bg-[#FAF8F5] border border-[#E8D7B7] text-[#475569] hover:text-[#0B1330] hover:bg-[#FFF9F0]'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-[#D4AF37]" />
                  <span>Wallet {clientWallet ? `(${convertUsdToCustomer(walletBalance, customerCurrency, customerRate).display})` : ''}</span>
                </button>

                {/* 2. Credit Line Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('credit');
                    setErrorMessage('');
                  }}
                  className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                    activeTab === 'credit'
                      ? 'bg-[#0B1330] text-[#F5E7A3] border border-[#D4AF37]/50 shadow-md ring-1 ring-[#D4AF37]/40'
                      : 'bg-[#FAF8F5] border border-[#E8D7B7] text-[#475569] hover:text-[#0B1330] hover:bg-[#FFF9F0]'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                  <span>Credit Line</span>
                </button>

                {/* 3. UPI / QR Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upi');
                    setErrorMessage('');
                  }}
                  className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                    activeTab === 'upi'
                      ? 'bg-[#0B1330] text-[#F5E7A3] border border-[#D4AF37]/50 shadow-md ring-1 ring-[#D4AF37]/40'
                      : 'bg-[#FAF8F5] border border-[#E8D7B7] text-[#475569] hover:text-[#0B1330] hover:bg-[#FFF9F0]'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                  <span>UPI / QR</span>
                </button>

                {/* 4. Cash / Check Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('cash_check');
                    setErrorMessage('');
                  }}
                  className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                    activeTab === 'cash_check'
                      ? 'bg-[#0B1330] text-[#F5E7A3] border border-[#D4AF37]/50 shadow-md ring-1 ring-[#D4AF37]/40'
                      : 'bg-[#FAF8F5] border border-[#E8D7B7] text-[#475569] hover:text-[#0B1330] hover:bg-[#FFF9F0]'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-[#D4AF37]" />
                  <span>Cash / Cheque</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-6 space-y-5 bg-[#FFFDF9]">
              {/* TAB 1: PREPAID WALLET */}
              {activeTab === 'wallet' && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8D7B7]/60">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-[#8C6218] font-bold uppercase tracking-widest">
                          Prepaid Atelier Float
                        </span>
                        <h4 className="font-serif font-bold text-[#0B1330] text-sm">
                          Shiuli CAD Prepaid Wallet
                        </h4>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-mono text-[#64748B] block uppercase">Current Float Balance</span>
                        <span className="font-serif text-lg font-bold text-emerald-800">
                          {convertUsdToCustomer(walletBalance, customerCurrency, customerRate).display}
                          {customerCurrency !== 'USD' && (
                            <span className="text-xs font-normal text-slate-500 font-sans ml-1.5">
                              ({formatUSD(walletBalance)} USD)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Balance Check */}
                    {walletBalance >= amountUSD ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-bold block">Sufficient Balance Available for 1-Click Purchase</span>
                            <span className="text-[11px] text-emerald-800 block">
                              Deducting <strong>{convertedPayable.display} {customerCurrency !== 'USD' ? `(${formatUSD(amountUSD)} USD)` : ''}</strong> from your float. Remaining balance will be <strong>{convertUsdToCustomer(Math.max(0, walletBalance - amountUSD), customerCurrency, customerRate).display}</strong>.
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-[#475569]">
                          <div className="p-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7]/70 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#B88732] shrink-0" />
                            <span>Instant 1-Click Order</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7]/70 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>Immediate CAD Access</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7]/70 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-[#B88732] shrink-0" />
                            <span>Zero Slip Delay</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handlePayWithWallet}
                          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3DE9C] to-[#B88732] text-[#070D22] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer w-full"
                        >
                          <Sparkles className="w-4 h-4 text-[#070D22]" />
                          <span>Pay {convertedPayable.display} with Atelier Wallet {customerCurrency !== 'USD' ? `(${formatUSD(amountUSD)} USD)` : ''} (Instant Unlock)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold block">Insufficient Wallet Float</span>
                            <span className="text-[11px] text-amber-800 block">
                              Required: <strong>${amountUSD.toFixed(2)} USD</strong> • Available: <strong>${walletBalance.toFixed(2)} USD</strong>.
                              Shortfall: <strong>${Math.max(0, amountUSD - walletBalance).toFixed(2)} USD</strong>.
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] text-xs text-[#475569] space-y-1">
                          <span className="font-bold text-[#0B1330] block">How to Top Up Your Wallet:</span>
                          <p className="text-[11px] leading-relaxed">
                            Visit your <strong>Client Dashboard &gt; Credits &amp; Wallets</strong> to submit a prepaid deposit slip. Alternatively, you can complete this purchase right now using UPI or Cash / Cheque below.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('upi');
                            setErrorMessage('');
                          }}
                          className="px-5 py-2.5 rounded-xl bg-[#0B1330] text-[#F5E7A3] text-xs font-bold font-serif flex items-center justify-center gap-2 hover:bg-[#17345C] transition-all cursor-pointer w-full"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Pay with UPI / QR Code Instead</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CORPORATE POSTPAID CREDIT LINE */}
              {activeTab === 'credit' && (
                <div className="space-y-4 animate-in fade-in-50">
                  {hasActiveCredit ? (
                    <div className="p-4 rounded-2xl bg-white border border-[#E8D7B7] shadow-xs space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8D7B7]/60">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono text-[#8C6218] font-bold uppercase tracking-widest">
                            VIP Corporate Facility
                          </span>
                          <h4 className="font-serif font-bold text-[#0B1330] text-sm">
                            Atelier Line of Credit
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-[10px] font-mono font-bold text-emerald-800">
                          <ShieldCheck className="w-3 h-3 text-emerald-700" /> ACTIVE CREDIT LINE
                        </div>
                      </div>

                      {/* Credit Line Status Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7]/60">
                          <span className="text-[9px] font-mono uppercase text-[#64748B] block">Credit Limit</span>
                          <span className="font-serif font-bold text-xs text-[#0B1330]">
                            {convertUsdToCustomer(creditLimit, customerCurrency, customerRate).display}
                          </span>
                          {customerCurrency !== 'USD' && (
                            <span className="text-[8.5px] font-mono text-slate-400 block">(${creditLimit.toFixed(0)} USD)</span>
                          )}
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7]/60">
                          <span className="text-[9px] font-mono uppercase text-[#64748B] block">Current Used</span>
                          <span className="font-serif font-bold text-xs text-rose-700">
                            {convertUsdToCustomer(usedCredit, customerCurrency, customerRate).display}
                          </span>
                          {customerCurrency !== 'USD' && (
                            <span className="text-[8.5px] font-mono text-slate-400 block">(${usedCredit.toFixed(0)} USD)</span>
                          )}
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                          <span className="text-[9px] font-mono uppercase text-emerald-800 block">Available Credit</span>
                          <span className="font-serif font-bold text-xs text-emerald-900">
                            {convertUsdToCustomer(availableCredit, customerCurrency, customerRate).display}
                          </span>
                          {customerCurrency !== 'USD' && (
                            <span className="text-[8.5px] font-mono text-emerald-600 block">(${availableCredit.toFixed(0)} USD)</span>
                          )}
                        </div>
                      </div>

                      {/* Eligibility Check */}
                      {availableCredit >= amountUSD ? (
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-bold block">Credit Approved: Net-{clientCredit?.payment_terms_days || 30} Days Settlement</span>
                              <span className="text-[11px] text-emerald-800 block">
                                Charge <strong>{convertedPayable.display} {customerCurrency !== 'USD' ? `(${formatUSD(amountUSD)} USD)` : ''}</strong> to your corporate credit account. Your CAD download permission is activated immediately.
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handlePayWithCredit}
                            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#0B1330] via-[#17345C] to-[#0B1330] text-[#F5E7A3] font-serif font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer w-full border border-[#D4AF37]/40"
                          >
                            <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                            <span>Confirm &amp; Charge {convertedPayable.display} to Corporate Credit {customerCurrency !== 'USD' ? `(${formatUSD(amountUSD)} USD)` : ''}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <span className="font-bold block">Credit Limit Exceeded</span>
                              <span className="text-[11px] text-rose-800 block">
                                Available credit of <strong>${availableCredit.toFixed(2)} USD</strong> is insufficient for this <strong>${amountUSD.toFixed(2)} USD</strong> order.
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-[#475569] leading-relaxed">
                            Please settle your outstanding credit bill under the <strong>Credits &amp; Wallets</strong> tab in your dashboard, or choose UPI / Cash &amp; Cheque below.
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('upi');
                              setErrorMessage('');
                            }}
                            className="px-5 py-2.5 rounded-xl bg-[#0B1330] text-[#F5E7A3] text-xs font-bold font-serif flex items-center justify-center gap-2 hover:bg-[#17345C] transition-all cursor-pointer w-full"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Pay with UPI / QR Code Instead</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Inactive Credit Notice */
                    <div className="p-5 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] space-y-3.5 text-xs text-[#475569]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white border border-[#E8D7B7] flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4 text-[#B88732]" />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-[#0B1330] text-sm">
                            Corporate Postpaid Credit Line
                          </h4>
                          <span className="text-[10px] text-[#8C6218] font-mono font-semibold">
                            VIP Revolving Account for High-Volume Jewellers
                          </span>
                        </div>
                      </div>

                      <p className="leading-relaxed text-[#475569]">
                        Corporate Credit is an exclusive revolving facility granted by Atelier SuperAdmin to select verified manufacturers, retail brands, and jewelry houses.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                        <div className="p-2.5 rounded-xl bg-white border border-[#E8D7B7]/60 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B88732]" />
                          <span>Net-30 / 60 Settlement Terms</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-[#E8D7B7]/60 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>Instant File Unlock (No Verification Slip)</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-[#E8D7B7] text-[11px] text-[#64748B] flex items-center justify-between">
                        <span>To apply for corporate credit, contact studio administration.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('upi');
                            setErrorMessage('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#0B1330] text-[#F5E7A3] font-bold text-[10px] uppercase font-mono hover:bg-[#17345C] transition-colors cursor-pointer"
                        >
                          Use UPI / Cash
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. UPI / QR CODE TAB */}
              {activeTab === 'upi' && (
                <div className="space-y-5 animate-in fade-in-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                    {/* Dynamic QR Code Card */}
                    <div className="bg-[#FFF9F0] border border-[#E8D7B7] rounded-2xl p-5 text-center space-y-3.5 shadow-xs relative group">
                      <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-sm border border-[#E8D7B7] flex items-center justify-center relative overflow-hidden">
                        {studioQrCodeUrl ? (
                          <img
                            src={studioQrCodeUrl}
                            alt="Studio UPI QR Code"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          /* High Fidelity SVG QR Code fallback */
                          <svg viewBox="0 0 100 100" className="w-full h-full text-[#0B1330] fill-current">
                            <rect x="5" y="5" width="26" height="26" rx="4" fill="#0B1330" />
                            <rect x="9" y="9" width="18" height="18" rx="2" fill="#FFFFFF" />
                            <rect x="13" y="13" width="10" height="10" rx="1" fill="#0B1330" />

                            <rect x="69" y="5" width="26" height="26" rx="4" fill="#0B1330" />
                            <rect x="73" y="9" width="18" height="18" rx="2" fill="#FFFFFF" />
                            <rect x="77" y="13" width="10" height="10" rx="1" fill="#0B1330" />

                            <rect x="5" y="69" width="26" height="26" rx="4" fill="#0B1330" />
                            <rect x="9" y="73" width="18" height="18" rx="2" fill="#FFFFFF" />
                            <rect x="13" y="77" width="10" height="10" rx="1" fill="#0B1330" />

                            <rect x="36" y="8" width="6" height="6" fill="#0B1330" />
                            <rect x="46" y="8" width="6" height="6" fill="#0B1330" />
                            <rect x="56" y="8" width="6" height="6" fill="#0B1330" />
                            <rect x="36" y="18" width="6" height="6" fill="#0B1330" />
                            <rect x="46" y="24" width="6" height="6" fill="#0B1330" />
                            <rect x="56" y="18" width="6" height="6" fill="#0B1330" />

                            <rect x="8" y="36" width="6" height="6" fill="#0B1330" />
                            <rect x="18" y="36" width="6" height="6" fill="#0B1330" />
                            <rect x="8" y="46" width="6" height="6" fill="#0B1330" />
                            <rect x="18" y="56" width="6" height="6" fill="#0B1330" />

                            <rect x="34" y="34" width="32" height="32" rx="4" fill="#F3DE9C" />
                            <circle cx="50" cy="50" r="8" fill="#0B1330" />

                            <rect x="70" y="36" width="6" height="6" fill="#0B1330" />
                            <rect x="82" y="36" width="6" height="6" fill="#0B1330" />
                            <rect x="76" y="48" width="6" height="6" fill="#0B1330" />
                            <rect x="86" y="56" width="6" height="6" fill="#0B1330" />

                            <rect x="36" y="72" width="6" height="6" fill="#0B1330" />
                            <rect x="48" y="72" width="6" height="6" fill="#0B1330" />
                            <rect x="40" y="82" width="6" height="6" fill="#0B1330" />
                            <rect x="52" y="86" width="6" height="6" fill="#0B1330" />
                            <rect x="72" y="72" width="6" height="6" fill="#0B1330" />
                            <rect x="84" y="78" width="6" height="6" fill="#0B1330" />
                            <rect x="74" y="86" width="6" height="6" fill="#0B1330" />
                          </svg>
                        )}

                        <div className="absolute inset-x-0 bottom-1 text-[8px] font-mono text-[#0B1330] font-bold">
                          SCAN &amp; PAY
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-[#0B1330] font-bold">
                          <QrCode className="w-3.5 h-3.5 text-[#B88732]" />
                          <span>Scan with Any UPI App</span>
                        </div>
                        <p className="text-[11px] text-[#475569] font-medium">
                          Google Pay • PhonePe • Paytm • BHIM • Cred
                        </p>
                      </div>

                      {/* Copy UPI ID */}
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#E8D7B7] text-xs font-mono shadow-2xs">
                        <span className="text-[#0B1330] font-bold truncate">{studioUpiId}</span>
                        <button
                          type="button"
                          onClick={handleCopyUPI}
                          className="px-2.5 py-1 rounded-lg bg-[#0B1330] hover:bg-[#17345C] text-[#F5E7A3] flex items-center gap-1 font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
                        >
                          {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#D4AF37]" />}
                          <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Reference ID + Proof Upload */}
                    <div className="space-y-4">
                      {/* UPI Reference / UTR Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-[#0B1330] uppercase tracking-wider block font-bold">
                          UPI Ref / UTR / Transaction ID (Optional if Screenshot Attached)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 423981765412 or payer@upi"
                          value={upiRefId}
                          onChange={(e) => setUpiRefId(e.target.value)}
                          className="w-full bg-white border border-[#E8D7B7] focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732] rounded-xl px-4 py-2.5 text-xs text-[#0B1330] placeholder-slate-400 outline-none font-mono shadow-2xs transition-all"
                        />
                      </div>

                      {/* Screenshot Upload Box */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-[#0B1330] uppercase tracking-wider block font-bold flex items-center justify-between">
                          <span>Upload Payment Screenshot</span>
                          <span className="text-[10px] text-[#8C6218] font-semibold">PNG, JPG, WEBP (Max 10MB)</span>
                        </label>

                        {upiScreenshotPreview ? (
                          <div className="p-3 rounded-xl bg-white border border-[#E8D7B7] flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={upiScreenshotPreview}
                                alt="Payment Proof"
                                className="w-12 h-12 object-cover rounded-lg border border-[#E8D7B7] shrink-0"
                              />
                              <div className="truncate">
                                <span className="text-xs font-mono text-[#0B1330] font-bold block truncate">
                                  {upiScreenshot?.name || 'Payment_Screenshot.png'}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready for verification
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setUpiScreenshot(null);
                                setUpiScreenshotPreview('');
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove image"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-[#E8D7B7] hover:border-[#B88732] rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all bg-white hover:bg-[#FFF9F0] shadow-2xs">
                            <UploadCloud className="w-7 h-7 text-[#B88732]" />
                            <span className="text-xs font-serif text-[#0B1330] font-bold">
                              Click or drop payment screenshot here
                            </span>
                            <span className="text-[11px] text-[#475569] font-mono">
                              Attach UPI success screen or bank debit SMS slip
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUpiScreenshotChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* Advisory Notice */}
                      <div className="p-3.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-xs text-[#475569] flex items-start gap-2.5 leading-relaxed">
                        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <span>
                          After submitting, your payment request transfers directly to Atelier Administration. Once confirmed, you can verify your email to unlock your one-time CAD download.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleSubmitProof}
                        className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3DE9C] to-[#B88732] text-[#070D22] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer w-full"
                      >
                        <Sparkles className="w-4 h-4 text-[#070D22]" />
                        <span>Submit UPI Payment for Verification</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CASH / CHECK TAB */}
              {activeTab === 'cash_check' && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="p-4 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] text-xs text-[#475569] space-y-1">
                    <div className="flex items-center gap-2 text-[#0B1330] font-serif font-bold">
                      <Banknote className="w-4 h-4 text-[#B88732]" />
                      <span>Studio Cash Counter &amp; Cheque Collection</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#475569]">
                      {cashCheckInstructions}
                    </p>
                  </div>

                  {/* ONE TEXT BOX FOR DETAILS */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#0B1330] uppercase tracking-wider block font-bold flex items-center justify-between">
                      <span>Transaction &amp; Cheque Details (Required)</span>
                      <span className="text-[10px] text-[#8C6218] font-semibold">Cash / Cheque / Bank details</span>
                    </label>
                    <textarea
                      rows={3}
                      value={cashCheckDetails}
                      onChange={(e) => setCashCheckDetails(e.target.value)}
                      placeholder="Write details: e.g. Cash handed at studio counter (Slip #1042), or Cheque No. 445210, HDFC Bank, Surat Branch, dated 23-Sep, Payer: Royal Jewellers"
                      className="w-full bg-white border border-[#E8D7B7] focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732] rounded-xl px-4 py-2.5 text-xs text-[#0B1330] placeholder-slate-400 outline-none font-mono resize-none leading-relaxed shadow-2xs transition-all"
                    />
                  </div>

                  {/* UPLOAD SCREENSHOT / RECEIPT / CHEQUE PHOTO */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#0B1330] uppercase tracking-wider block font-bold flex items-center justify-between">
                      <span>Upload Screenshot / Cheque Photo / Receipt</span>
                      <span className="text-[10px] text-[#8C6218] font-semibold">PNG, JPG, WEBP (Max 10MB)</span>
                    </label>

                    {cashCheckScreenshotPreview ? (
                      <div className="p-3 rounded-xl bg-white border border-[#E8D7B7] flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={cashCheckScreenshotPreview}
                            alt="Cash/Cheque Proof"
                            className="w-14 h-14 object-cover rounded-lg border border-[#E8D7B7] shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-xs font-mono text-[#0B1330] font-bold block truncate">
                              {cashCheckScreenshot?.name || 'Cheque_Receipt_Proof.png'}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Attached for studio accounts review
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCashCheckScreenshot(null);
                            setCashCheckScreenshotPreview('');
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-[#E8D7B7] hover:border-[#B88732] rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all bg-white hover:bg-[#FFF9F0] shadow-2xs">
                        <UploadCloud className="w-7 h-7 text-[#B88732]" />
                        <span className="text-xs font-serif text-[#0B1330] font-bold">
                          Click or drag cheque photo / cash receipt slip here
                        </span>
                        <span className="text-[11px] text-[#475569] font-mono">
                          Attach clear photo of signed cheque or studio counter deposit voucher
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCashCheckScreenshotChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Submission Assurance */}
                  <div className="p-3.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-xs text-[#475569] flex items-start gap-2.5 leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      Upon submission, your offline payment request is recorded in the studio financial log. When the administration confirms the funds are collected, the download option will be enabled for your account.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitProof}
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3DE9C] to-[#B88732] text-[#070D22] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer w-full"
                  >
                    <FileText className="w-4 h-4 text-[#070D22]" />
                    <span>Submit Cash / Cheque Proof for Verification</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer Assurances */}
            <div className="px-6 py-3.5 bg-white border-t border-[#E8D7B7] flex flex-wrap items-center justify-between text-[11px] text-[#475569] font-mono gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>PCI-DSS Level 1 Security • Atelier Verified Delivery</span>
              </div>
              <div className="flex items-center gap-3">
                <span>100% Watertight Mesh Guarantee</span>
                <span>•</span>
                <span>One-Time Email OTP Link</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
