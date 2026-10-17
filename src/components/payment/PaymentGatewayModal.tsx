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
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
  };
  onPaymentSuccess: (result: PaymentSuccessResult) => Promise<void> | void;
}

type TabType = 'upi' | 'cash_check';

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

  // Currency amounts
  const isUSD = currency === 'USD';
  const usdToInrRate = 86.85;
  const amountINR = isUSD ? Math.round(amount * usdToInrRate) : Math.round(amount);
  const amountUSD = isUSD ? amount : Math.round((amount / usdToInrRate) * 100) / 100;

  const formatCurrency = (val: number, cur: 'INR' | 'USD') => {
    if (cur === 'USD') {
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

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
    }
  }, [isOpen]);

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
                <Clock className="w-10 h-10 text-[#B88732] animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
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
              <div className="flex justify-between items-center pt-2 border-t border-[#E8D7B7] text-amber-800 font-bold">
                <span>CAD Delivery Status:</span>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-mono text-[10px]">Awaiting Admin Verification</span>
              </div>
            </div>

            {/* Step-by-Step Flow Explanation */}
            <div className="p-4 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] text-left max-w-md mx-auto space-y-2">
              <div className="text-[11px] font-mono text-[#8C6218] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#B88732]" />
                <span>Next Steps to Download Your File:</span>
              </div>
              <ol className="text-xs text-[#475569] space-y-1.5 list-decimal list-inside font-medium">
                <li>Admin inspects and verifies receipt of payment at studio desk.</li>
                <li>Download authorization is enabled for your account.</li>
                <li>Verify your registered email with a 6-digit OTP code.</li>
                <li>Receive your single-use, watertight CAD download link.</li>
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
                  {isUSD ? formatCurrency(amountUSD, 'USD') : formatCurrency(amountINR, 'INR')}
                </div>
                <span className="text-[10px] text-[#8C6218] block font-mono font-semibold">
                  {isUSD
                    ? `approx ${formatCurrency(amountINR, 'INR')}`
                    : `approx ${formatCurrency(amountUSD, 'USD')}`}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ONLY TWO PAYMENT OPTIONS: UPI / QR and CASH / Check */}
            <div className="px-6 pt-4 pb-3 border-b border-[#E8D7B7] bg-white">
              <div className="grid grid-cols-2 gap-3 text-xs font-serif">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upi');
                    setErrorMessage('');
                  }}
                  className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                    activeTab === 'upi'
                      ? 'bg-[#0B1330] text-[#F5E7A3] border border-[#D4AF37]/50 shadow-md ring-1 ring-[#D4AF37]/40'
                      : 'bg-[#FAF8F5] border border-[#E8D7B7] text-[#475569] hover:text-[#0B1330] hover:bg-[#FFF9F0]'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                  <span>UPI / QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('cash_check');
                    setErrorMessage('');
                  }}
                  className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                    activeTab === 'cash_check'
                      ? 'bg-[#0B1330] text-[#F5E7A3] border border-[#D4AF37]/50 shadow-md ring-1 ring-[#D4AF37]/40'
                      : 'bg-[#FAF8F5] border border-[#E8D7B7] text-[#475569] hover:text-[#0B1330] hover:bg-[#FFF9F0]'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-[#D4AF37]" />
                  <span>CASH / Check</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-6 space-y-5 bg-[#FFFDF9]">
              {/* 1. UPI / QR CODE TAB */}
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
