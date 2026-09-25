import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Clock, RefreshCw, KeyRound, AlertCircle, CheckCircle2, Lock, Download } from 'lucide-react';
import { api } from '../../services/api';
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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
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

  // Cooldown Timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => setCooldownSeconds(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setOtp(Array(6).fill(''));
      setError(null);
      setIsVerified(false);
      setDownloadUrl(null);
      setExpirySeconds(600);
      setCooldownSeconds(0);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleInputChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    setError(null);
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
      const res = await api.post<any>(`/payments/purchases/${purchaseId}/verify-otp/`, { code });
      if (res && res.download_url) {
        setDownloadUrl(res.download_url);
      }
      setIsVerified(true);
      onVerifiedSuccess();
    } catch (apiErr: any) {
      const errMessage =
        apiErr.data?.error ||
        apiErr.data?.detail ||
        apiErr.message ||
        'Invalid verification code. Please check your email and try again.';
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || resending) return;
    setResending(true);
    setError(null);

    try {
      await api.post(`/payments/purchases/${purchaseId}/resend-otp/`);
      setExpirySeconds(600);
      setCooldownSeconds(60);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err.data?.error || err.message || 'Failed to resend verification code. Please try again.';
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
              <div className="flex justify-between gap-1.5 xs:gap-2 mb-6">
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
                    className="w-9 h-11 xs:w-11 xs:h-13 md:w-14 md:h-16 text-center text-lg xs:text-xl md:text-2xl font-bold font-mono bg-zinc-900 border-2 border-zinc-800 rounded-xl text-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all"
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
              className="py-6 text-center space-y-4"
            >
              <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 mb-1">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <h3 className="text-2xl font-serif font-bold text-amber-100">Verification Successful!</h3>
              <p className="text-sm text-zinc-300 max-w-md mx-auto">
                Your one-time secure CAD download link has been emailed to{' '}
                <span className="text-amber-300 font-semibold">{maskedEmail}</span>.
              </p>

              {downloadUrl && (
                <div className="pt-2 pb-2">
                  <a
                    href={downloadUrl}
                    className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all uppercase tracking-wider"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CAD Files Now (.3DM + .STL)</span>
                  </a>
                  <p className="text-[11px] text-zinc-400 mt-1.5">
                    Single-use link: You can download right now or use the link in your email within 48 hours.
                  </p>
                </div>
              )}

              <div className="p-4 bg-zinc-900 border border-amber-500/20 rounded-xl text-xs text-zinc-400 max-w-sm mx-auto space-y-2 text-left">
                <div className="flex items-center space-x-2 text-amber-400 font-semibold">
                  <Lock className="w-4 h-4" />
                  <span>Security & Delivery Protocol</span>
                </div>
                <p>• Authentic production files (.3DM & .STL) packaged and ready.</p>
                <p>• Single-use download link sent to your email inbox.</p>
                <p>• Download status and license tracked in your account.</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-xs text-zinc-300 transition-colors"
                >
                  Done
                </button>
                <button
                  onClick={() => {
                    onClose();
                    window.location.href = '/account';
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition-colors"
                >
                  View in My CAD Vault
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
