import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Clock, RefreshCw, KeyRound, AlertCircle, CheckCircle2, Lock, X, Download } from 'lucide-react';
import { api } from '../../services/api';

interface OrderOTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderTitle: string;
  maskedEmail: string;
  debugOtp?: string;
  onVerifiedSuccess: () => void;
}

export const OrderOTPVerificationModal: React.FC<OrderOTPVerificationModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderTitle,
  maskedEmail,
  debugOtp,
  onVerifiedSuccess
}) => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [activeDebugOtp, setActiveDebugOtp] = useState<string | undefined>(debugOtp);
  const [verifiedDownloadUrl, setVerifiedDownloadUrl] = useState<string | null>(null);
  
  // Timers
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 mins countdown
  const [cooldownSeconds, setCooldownSeconds] = useState(0); // 60s resend cooldown
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setOtp(Array(6).fill(''));
      setError(null);
      setIsVerified(false);
      setExpirySeconds(600);
      setActiveDebugOtp(debugOtp);
      setVerifiedDownloadUrl(null);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 200);
    }
  }, [isOpen, debugOtp]);

  // Expiry Timer countdown
  useEffect(() => {
    if (!isOpen || isVerified) return;
    const interval = setInterval(() => {
      setExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isVerified]);

  // Cooldown Timer countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(null);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      setError(null);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.request<any>(`/orders/${orderId}/verify-otp/`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      if (res?.download_url) {
        setVerifiedDownloadUrl(res.download_url);
      }

      setIsVerified(true);
      setTimeout(() => {
        onVerifiedSuccess();
        if (!res?.download_url) {
          onClose();
        }
      }, 4000);
    } catch (err: any) {
      const msg = err.data?.error || err.data?.detail || (err.message && !err.message.includes('Server Error') && !err.message.includes('500') ? err.message : 'Invalid or expired OTP. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0) return;
    setResending(true);
    setError(null);

    try {
      const res = await api.request<any>(`/orders/${orderId}/request-otp/`, {
        method: 'POST',
      });
      if (res?.debug_otp) {
        setActiveDebugOtp(res.debug_otp);
      }
      setCooldownSeconds(60);
      setExpirySeconds(600);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#070D22] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.2)] overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!isVerified ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                  <KeyRound className="w-7 h-7 text-[#D4AF37]" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#FAF8F3]">
                  Verify Email for CAD Download
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  A 6-digit verification code has been dispatched to your registered email address:
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#12204D] border border-white/10 text-xs font-mono text-[#F5E7A3]">
                  <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{maskedEmail || 'your registered email'}</span>
                </div>
              </div>

              {/* Order Info */}
              <div className="p-3.5 rounded-2xl bg-[#09112B] border border-white/10 text-xs flex justify-between items-center">
                <span className="text-zinc-400">Order:</span>
                <span className="font-serif font-bold text-[#FAF8F3]">{orderTitle || `Order #${orderId}`}</span>
              </div>

              {/* Dev Helper OTP Badge */}
              {activeDebugOtp && (
                <div className="p-3.5 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-xs font-mono text-[#F5E7A3] flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[10px] text-[#C9C2A6] block font-sans uppercase tracking-wider font-semibold">Studio Verification Code</span>
                    <strong className="text-white text-base tracking-[0.25em] font-bold">{activeDebugOtp}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtp(activeDebugOtp.split(''));
                      setError(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#F5E7A3] text-[#070D22] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1 hover:scale-105"
                  >
                    <span>Auto-Fill</span>
                  </button>
                </div>
              )}

              {/* 6 Digit Inputs */}
              <div className="space-y-3">
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleInputChange(index, e.target.value)}
                      onKeyDown={e => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold bg-[#040817] border border-[#D4AF37]/40 rounded-xl text-[#FAF8F3] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all"
                    />
                  ))}
                </div>

                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              {/* Countdown & Resend */}
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Expires in: {formatTimer(expirySeconds)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldownSeconds > 0 || resending}
                  className="text-[#D4AF37] hover:underline disabled:text-zinc-600 disabled:no-underline font-semibold flex items-center gap-1"
                >
                  {resending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  <span>
                    {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend Code'}
                  </span>
                </button>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full btn-gold-luxury py-3.5 rounded-2xl font-serif text-sm font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#0B1330]" />
                      <span>Verify &amp; Receive Download Link</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-zinc-400 text-center">
                  Once verified, a single-use download link will be dispatched to your email. The download button on the portal will self-lock immediately for security.
                </p>
              </div>
            </div>
          ) : (
            /* SUCCESS STATE */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-bold text-[#FAF8F3]">
                  Identity Verified Successfully!
                </h3>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                  Your single-use secure CAD download link has been generated. Click below to download your master files:
                </p>
              </div>

              {verifiedDownloadUrl && (
                <div className="pt-2 pb-1">
                  <a
                    href={verifiedDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-gold-luxury py-3.5 px-6 rounded-2xl font-serif text-xs font-bold uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                  >
                    <Download className="w-4 h-4 text-[#0B1330]" />
                    <span>Download Master CAD Package (.3DM)</span>
                  </a>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-[#09112B] border border-emerald-500/30 text-xs text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security &amp; Single-Use Policy:</span>
                </div>
                <ul className="list-disc list-inside text-zinc-400 text-[11px] space-y-1">
                  <li>Your download link is valid for 1 download only.</li>
                  <li>After downloading, the link automatically self-destructs.</li>
                  <li>The download button has now been locked on your dashboard.</li>
                  <li>If you require re-download access in the future, please contact Studio Support.</li>
                </ul>
              </div>

              <div className="text-[11px] font-mono text-[#D4AF37] animate-pulse">
                Redirecting to dashboard in a moment...
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
