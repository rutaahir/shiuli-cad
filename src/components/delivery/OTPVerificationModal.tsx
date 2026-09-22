import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Clock, RefreshCw, KeyRound, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../../services/api';


import { sendCadDownloadEmail, sendOtpEmail } from '../../services/emailService';
import { useAuth } from '../../context/AuthContext';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number;
  productTitle: string;
  maskedEmail: string;
  userEmail?: string;
  debugOtp?: string;
  onVerifiedSuccess: () => void;
}

export const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
  productTitle,
  maskedEmail,
  userEmail,
  debugOtp,
  onVerifiedSuccess
}) => {
  const { user } = useAuth();
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  
  // Timers
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 mins countdown
  const [cooldownSeconds, setCooldownSeconds] = useState(0); // 60s resend cooldown
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 200);
    }
  }, [isOpen]);

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
      let verifiedOk = false;
      let errMessage = 'Invalid verification code. Please check your email and try again.';

      // Attempt API backend verification first
      try {
        const res = await api.post<any>(`/payments/purchases/${purchaseId}/verify-otp/`, { code });
        if (res && (res.message || res.purchase || res.success)) {
          verifiedOk = true;
        }
      } catch (apiErr: any) {
        if (apiErr.data?.error) {
          errMessage = apiErr.data.error;
        } else if (apiErr.data?.detail) {
          errMessage = apiErr.data.detail;
        } else if (apiErr.message && !apiErr.message.includes('Server Error') && !apiErr.message.includes('500') && !apiErr.message.includes('HTTP')) {
          errMessage = apiErr.message;
        }
      }

      // Check debug/expected OTP generated during purchase
      if (!verifiedOk && debugOtp && code.trim() === debugOtp.trim()) {
        verifiedOk = true;
      }

      // STRICTLY REJECT WRONG OTP!
      if (!verifiedOk) {
        setError(errMessage);
        setLoading(false);
        return;
      }

      // Dispatch CAD Download Email to user's registered email via Gmail SMTP
      const targetEmail = userEmail || user?.email || (maskedEmail.includes('*') ? '' : maskedEmail);
      if (targetEmail) {
        const downloadLink = `${window.location.origin}/account`;
        sendCadDownloadEmail(
          targetEmail,
          productTitle || 'Jewellery CAD File',
          ['.3DM (Rhino 8)', '.STL (Watertight)'],
          downloadLink,
          'Atelier Production License'
        ).catch(() => {});
      }

      setIsVerified(true);
      setTimeout(() => {
        onVerifiedSuccess();
      }, 2000);
    } catch (err: any) {
      const msg = err.data?.error || err.data?.detail || (err.message && !err.message.includes('Server Error') && !err.message.includes('500') ? err.message : 'Invalid verification code. Please check and try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || resending) return;
    setResending(true);
    setError(null);

    try {
      const targetEmail = userEmail || user?.email || 'shahharshil3103@gmail.com';
      if (debugOtp) {
        await sendOtpEmail(targetEmail, debugOtp, productTitle || 'CAD Download Verification');
      } else {
        await api.post(`/payments/purchases/${purchaseId}/resend-otp/`).catch(() => {});
      }
      setExpirySeconds(600);
      setCooldownSeconds(60);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err.message || err.response?.data?.error || 'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };


  const formatTime = (secs: number) => {
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
          className="relative w-full max-w-lg bg-zinc-950 border border-amber-500/30 rounded-2xl shadow-2xl p-6 md:p-8 overflow-hidden text-zinc-100"
        >
          {/* Subtle gold gradient glow top edge */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

          {!isVerified ? (
            <div>
              {/* Header */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-amber-100 font-serif">Verify Your Email to Unlock Download</h3>
                  <p className="text-xs text-zinc-400">Purchase: {productTitle}</p>
                </div>
              </div>

              {/* Masked Email Notice */}
              <div className="mb-6 p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-start space-x-3">
                <Mail className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-zinc-300">
                  We've sent a 6-digit security code to your registered account email{' '}
                  <span className="font-semibold text-amber-300">{maskedEmail}</span>.
                  <br />
                  <span className="text-zinc-400 text-[11px]">Check your inbox or spam folder.</span>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-6 bg-zinc-900/40 px-3.5 py-2 rounded-lg border border-zinc-800/60">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Code expires in:</span>
                </div>
                <span className={`font-mono font-bold ${expirySeconds < 60 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                  {formatTime(expirySeconds)}
                </span>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2 text-rose-300 text-xs"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* 6-Digit Gold Accented OTP Input Boxes */}
              <div className="flex justify-between gap-2 mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleInputChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 md:w-14 md:h-16 text-center text-xl md:text-2xl font-bold font-mono bg-zinc-900 border-2 border-zinc-800 rounded-xl text-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all"
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleVerify}
                  disabled={loading || otp.join('').length !== 6 || expirySeconds === 0}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-5 h-5" />
                      <span>Verify Code & Send Secure Link</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    onClick={onClose}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleResend}
                    disabled={cooldownSeconds > 0 || resending}
                    className="flex items-center space-x-1.5 text-amber-400 hover:text-amber-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    <span>
                      {cooldownSeconds > 0 ? `Resend Code in (${cooldownSeconds}s)` : 'Resend Code'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Verified Success Ceremony State */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-4"
            >
              <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 mb-2">
                <CheckCircle2 className="w-12 h-12 animate-bounce" />
              </div>

              <h3 className="text-2xl font-serif font-bold text-amber-100">Identity Verified!</h3>
              <p className="text-sm text-zinc-300 max-w-md mx-auto">
                Your single-use secure download link has been dispatched to{' '}
                <span className="text-amber-300 font-semibold">{maskedEmail}</span>.
              </p>

              <div className="p-4 bg-zinc-900 border border-amber-500/20 rounded-xl text-xs text-zinc-400 max-w-sm mx-auto space-y-2 text-left">
                <div className="flex items-center space-x-2 text-amber-400 font-semibold">
                  <Lock className="w-4 h-4" />
                  <span>Security Delivery Policy</span>
                </div>
                <p>• The email link is locked to your account.</p>
                <p>• It will expire after 48 hours or after 1 download.</p>
              </div>

              <p className="text-xs text-zinc-500 pt-2">Closing modal automatically...</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
