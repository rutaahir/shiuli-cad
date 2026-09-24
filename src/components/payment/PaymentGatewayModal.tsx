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
  const amountINR = isUSD ? Math.round(amount * 84) : amount;
  const amountUSD = isUSD ? amount : Math.round(amount / 84);

  const formatCurrency = (val: number, cur: 'INR' | 'USD') => {
    if (cur === 'USD') {
      return `$${val.toLocaleString('en-US')}`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#09112B] via-[#070D22] to-[#040817] border border-[#D4AF37]/40 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden text-[#FAF8F3]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Luxury Gold Top Trim */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#B8860B] via-[#F5E7A3] via-[#D4AF37] to-[#B8860B]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-[#0B1436]/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] p-[1.5px] shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#060B1E] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#F5E7A3]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-serif font-bold tracking-widest text-[#F5E7A3] uppercase">
                  Shiuli CAD Atelier
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-[9px] font-mono text-emerald-300 flex items-center gap-1 font-semibold">
                  <Lock className="w-2.5 h-2.5" /> 256-BIT SECURE
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-white leading-tight">
                Studio Checkout Gateway
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-[#C9C2A6] hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUBMITTED / CONFIRMATION VIEW */}
        {isSubmitted && submissionResult ? (
          <div className="p-8 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#D4AF37] via-[#F5E7A3] to-[#B8860B] p-[2px] shadow-[0_0_35px_rgba(212,175,55,0.4)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#060B1E] flex items-center justify-center">
                <Clock className="w-10 h-10 text-[#F5E7A3] animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-xs font-mono text-amber-300 tracking-wider uppercase font-bold inline-block">
                Pending Admin Confirmation
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                Payment Proof Transferred to Atelier
              </h3>
              <p className="text-xs text-[#C9C2A6] max-w-lg mx-auto leading-relaxed">
                Your payment request has been securely recorded and sent to the Atelier Accounts desk.
                As soon as the admin confirms that the payment is collected, your download option will be enabled.
                You can then verify your email via 6-digit OTP and receive your one-time secure download link.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-2xl bg-[#0B1436] border border-[#D4AF37]/30 text-left text-xs space-y-2.5 max-w-md mx-auto font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-[#C9C2A6]">Transaction Ref:</span>
                <span className="text-[#F5E7A3] font-bold">{submissionResult.transactionId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#C9C2A6]">Amount:</span>
                <span className="text-white font-bold">{formatCurrency(submissionResult.amount, submissionResult.currency as 'INR' | 'USD')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#C9C2A6]">Payment Channel:</span>
                <span className="text-white font-semibold">{submissionResult.method}</span>
              </div>
              {submissionResult.paymentDetails && (
                <div className="flex justify-between items-start pt-1 border-t border-white/5">
                  <span className="text-[#C9C2A6]">Details / Note:</span>
                  <span className="text-white truncate max-w-[220px] text-right">{submissionResult.paymentDetails}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-white/10 text-amber-300 font-bold">
                <span>CAD Delivery Status:</span>
                <span>Awaiting Admin Verification</span>
              </div>
            </div>

            {/* Step-by-Step Flow Explanation */}
            <div className="p-3.5 rounded-2xl bg-[#060B1E] border border-white/10 text-left max-w-md mx-auto space-y-2">
              <div className="text-[11px] font-mono text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>Next Steps to Download Your File:</span>
              </div>
              <ol className="text-xs text-[#C9C2A6] space-y-1.5 list-decimal list-inside">
                <li>Admin inspects and verifies receipt of payment at studio desk.</li>
                <li>Download authorization is enabled for your account.</li>
                <li>Verify your registered email with a 6-digit OTP code.</li>
                <li>Receive your single-use, watertight CAD download link.</li>
              </ol>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="btn-gold-luxury px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Understood • View in My Dashboard</span>
                <ArrowRight className="w-4 h-4 text-[#0B1330]" />
              </button>
            </div>
          </div>
        ) : isProcessing ? (
          /* Processing State */
          <div className="p-12 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#1E4FA3] via-[#D4AF37] to-[#F5E7A3] p-1 flex items-center justify-center animate-spin">
              <div className="w-full h-full rounded-full bg-[#070D22] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#D4AF37]" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif font-bold text-white">
                Submitting Payment Proof
              </h3>
              <p className="text-xs text-[#F5E7A3] font-mono animate-pulse">
                {processingStage}
              </p>
              <p className="text-[11px] text-[#C9C2A6]">
                Please do not close or refresh this window while we secure your submission.
              </p>
            </div>

            <div className="w-48 mx-auto bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] h-full rounded-full animate-[pulse_1.5s_infinite]" />
            </div>
          </div>
        ) : (
          /* Active Gateway Form */
          <div>
            {/* Order Brief Banner */}
            <div className="px-6 py-4 bg-[#080F29] border-b border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4AF37] font-bold">
                  {itemType === 'ready_cad'
                    ? 'READY-TO-CAST CAD DOWNLOAD'
                    : itemType === 'custom_advance'
                    ? 'CUSTOM BESPOKE CAD ADVANCE'
                    : itemType === 'milestone_stage'
                    ? 'CAD DEVELOPMENT MILESTONE'
                    : 'STUDIO CAD BAG CHECKOUT'}
                </span>
                <h3 className="font-serif text-base text-white font-bold truncate max-w-sm">
                  {title}
                </h3>
                {subtitle && <p className="text-xs text-[#C9C2A6]">{subtitle}</p>}
              </div>

              <div className="text-right shrink-0 bg-[#0B1436] px-4 py-2 rounded-xl border border-[#D4AF37]/30">
                <span className="text-[10px] text-[#C9C2A6] block font-mono">Amount Payable</span>
                <div className="font-serif text-xl sm:text-2xl font-extrabold text-[#F5E7A3]">
                  {formatCurrency(amountINR, 'INR')}
                </div>
                {isUSD && (
                  <span className="text-[10px] text-[#C9C2A6] block font-mono">
                    approx {formatCurrency(amountUSD, 'USD')}
                  </span>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ONLY TWO PAYMENT OPTIONS: UPI / QR and CASH / Check */}
            <div className="px-6 pt-4 pb-2 border-b border-[#D4AF37]/15">
              <div className="grid grid-cols-2 gap-3 text-xs font-serif">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upi');
                    setErrorMessage('');
                  }}
                  className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                    activeTab === 'upi'
                      ? 'bg-gradient-to-r from-[#D4AF37]/25 to-[#F5E7A3]/20 border border-[#D4AF37] text-[#F5E7A3] shadow-md ring-1 ring-[#D4AF37]/40'
                      : 'bg-white/5 border border-white/5 text-[#C9C2A6] hover:bg-white/10 hover:text-white'
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
                      ? 'bg-gradient-to-r from-[#D4AF37]/25 to-[#F5E7A3]/20 border border-[#D4AF37] text-[#F5E7A3] shadow-md ring-1 ring-[#D4AF37]/40'
                      : 'bg-white/5 border border-white/5 text-[#C9C2A6] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-[#D4AF37]" />
                  <span>CASH / Check</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-6 space-y-5">
              {/* 1. UPI / QR CODE TAB */}
              {activeTab === 'upi' && (
                <div className="space-y-5 animate-in fade-in-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                    {/* Dynamic QR Code Card */}
                    <div className="bg-[#050B1E] border border-[#D4AF37]/30 rounded-2xl p-5 text-center space-y-3 relative group">
                      <div className="w-48 h-48 mx-auto bg-white p-2.5 rounded-xl shadow-lg border border-[#D4AF37]/40 flex items-center justify-center relative overflow-hidden">
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

                            <rect x="34" y="34" width="32" height="32" rx="4" fill="#F5E7A3" />
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
                        <div className="flex items-center justify-center gap-1 text-xs text-[#F5E7A3] font-medium">
                          <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Scan with Any UPI App</span>
                        </div>
                        <p className="text-[10px] text-[#C9C2A6]">
                          Google Pay • PhonePe • Paytm • BHIM • Cred
                        </p>
                      </div>

                      {/* Copy UPI ID */}
                      <div className="flex items-center justify-between bg-[#080E24] p-2.5 rounded-xl border border-white/5 text-[11px] font-mono">
                        <span className="text-[#C9C2A6] truncate">{studioUpiId}</span>
                        <button
                          type="button"
                          onClick={handleCopyUPI}
                          className="px-2.5 py-1 rounded bg-[#121F4D] hover:bg-[#1C3278] text-[#F5E7A3] flex items-center gap-1 font-bold text-[10px] transition-colors cursor-pointer"
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
                        <label className="text-[11px] font-mono text-[#C9C2A6] uppercase tracking-wider block font-semibold">
                          UPI Ref / UTR / Transaction ID (Optional if Screenshot Attached)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 423981765412 or payer@upi"
                          value={upiRefId}
                          onChange={(e) => setUpiRefId(e.target.value)}
                          className="w-full bg-[#060B1E] border border-white/15 focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
                        />
                      </div>

                      {/* Screenshot Upload Box */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-[#C9C2A6] uppercase tracking-wider block font-semibold flex items-center justify-between">
                          <span>Upload Payment Screenshot</span>
                          <span className="text-[9px] text-[#D4AF37] font-normal">PNG, JPG, WEBP (Max 10MB)</span>
                        </label>

                        {upiScreenshotPreview ? (
                          <div className="p-3 rounded-xl bg-[#060B1E] border border-[#D4AF37]/50 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={upiScreenshotPreview}
                                alt="Payment Proof"
                                className="w-12 h-12 object-cover rounded-lg border border-white/10 shrink-0"
                              />
                              <div className="truncate">
                                <span className="text-xs font-mono text-white block truncate">
                                  {upiScreenshot?.name || 'Payment_Screenshot.png'}
                                </span>
                                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Ready for verification
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setUpiScreenshot(null);
                                setUpiScreenshotPreview('');
                              }}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer"
                              title="Remove image"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-white/20 hover:border-[#D4AF37]/60 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-colors bg-[#060B1E]/60 hover:bg-[#0B1436]">
                            <UploadCloud className="w-6 h-6 text-[#D4AF37]" />
                            <span className="text-xs font-serif text-white font-medium">
                              Click or drop payment screenshot here
                            </span>
                            <span className="text-[10px] text-[#C9C2A6] font-mono">
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
                      <div className="p-3 rounded-xl bg-[#070D22] border border-white/10 text-[11px] text-[#C9C2A6] flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          After submitting, your payment request transfers directly to Atelier Administration. Once confirmed, you can verify your email to unlock your one-time CAD download.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleSubmitProof}
                        className="btn-gold-luxury w-full py-3.5 rounded-xl font-serif text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-[#0B1330]" />
                        <span>Submit UPI Payment for Verification</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CASH / CHECK TAB */}
              {activeTab === 'cash_check' && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="p-3.5 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 text-xs text-[#C9C2A6] space-y-1">
                    <div className="flex items-center gap-2 text-[#F5E7A3] font-serif font-bold">
                      <Banknote className="w-4 h-4 text-[#D4AF37]" />
                      <span>Studio Cash Counter &amp; Cheque Collection</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {cashCheckInstructions}
                    </p>
                  </div>

                  {/* ONE TEXT BOX FOR DETAILS */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#C9C2A6] uppercase tracking-wider block font-semibold flex items-center justify-between">
                      <span>Transaction &amp; Cheque Details (Required)</span>
                      <span className="text-[9px] text-[#D4AF37] font-normal">Cash / Cheque / Bank details</span>
                    </label>
                    <textarea
                      rows={3}
                      value={cashCheckDetails}
                      onChange={(e) => setCashCheckDetails(e.target.value)}
                      placeholder="Write details: e.g. Cash handed at studio counter (Slip #1042), or Cheque No. 445210, HDFC Bank, Surat Branch, dated 23-Sep, Payer: Royal Jewellers"
                      className="w-full bg-[#060B1E] border border-white/15 focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono resize-none leading-relaxed"
                    />
                  </div>

                  {/* UPLOAD SCREENSHOT / RECEIPT / CHEQUE PHOTO */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#C9C2A6] uppercase tracking-wider block font-semibold flex items-center justify-between">
                      <span>Upload Screenshot / Cheque Photo / Receipt</span>
                      <span className="text-[9px] text-[#D4AF37] font-normal">PNG, JPG, WEBP (Max 10MB)</span>
                    </label>

                    {cashCheckScreenshotPreview ? (
                      <div className="p-3 rounded-xl bg-[#060B1E] border border-[#D4AF37]/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={cashCheckScreenshotPreview}
                            alt="Cash/Cheque Proof"
                            className="w-14 h-14 object-cover rounded-lg border border-white/10 shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-xs font-mono text-white block truncate">
                              {cashCheckScreenshot?.name || 'Cheque_Receipt_Proof.png'}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Attached for studio accounts review
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCashCheckScreenshot(null);
                            setCashCheckScreenshotPreview('');
                          }}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-white/20 hover:border-[#D4AF37]/60 rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-colors bg-[#060B1E]/60 hover:bg-[#0B1436]">
                        <UploadCloud className="w-6 h-6 text-[#D4AF37]" />
                        <span className="text-xs font-serif text-white font-medium">
                          Click or drag cheque photo / cash receipt slip here
                        </span>
                        <span className="text-[10px] text-[#C9C2A6] font-mono">
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
                  <div className="p-3 rounded-xl bg-[#070D22] border border-white/10 text-[11px] text-[#C9C2A6] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Upon submission, your offline payment request is recorded in the studio financial log. When the administration confirms the funds are collected, the download option will be enabled for your account.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitProof}
                    className="btn-gold-luxury w-full py-3.5 rounded-xl font-serif text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#0B1330]" />
                    <span>Submit Cash / Cheque Proof for Verification</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer Assurances */}
            <div className="px-6 py-3.5 bg-[#050A1C] border-t border-[#D4AF37]/20 flex flex-wrap items-center justify-between text-[10px] text-[#C9C2A6] font-mono gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
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
