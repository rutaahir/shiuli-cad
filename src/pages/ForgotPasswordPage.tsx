import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from '../components/BrandLogo';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { Mail, Lock, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { PageId } from '../types';
import { api } from '../services/api';

interface ForgotPasswordPageProps {
  onNavigate: (page: PageId, extraId?: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let t: any = null;
    if (countdown > 0) {
      t = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [countdown]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await api.requestPasswordResetOtp(email.trim().toLowerCase());
      setStep('otp');
      setCountdown(60);
      setSuccessMessage(`A 6-digit verification code has been dispatched to ${email}.`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch verification code. Please check your email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code received in your email.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await api.verifyPasswordResetOtp(otpCode.trim(), newPassword, email.trim().toLowerCase());
      setStep('success');
      setTimeout(() => {
        onNavigate('login');
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B1E] text-[#F5F1E8] flex items-center justify-center p-6 sm:p-12 relative overflow-hidden pt-28 pb-20">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#1E4FA3]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[#080E24] border border-[#D4AF37]/25 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl space-y-6 relative z-10"
      >
        {/* Top Logo */}
        <div className="text-center">
          <button onClick={() => onNavigate('home')} className="inline-block hover:opacity-90 transition-opacity">
            <BrandLogo variant="full" size="md" className="mx-auto" />
          </button>
        </div>

        {step === 'email' && (
          <>
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-3xl text-[#FAF8F3]">Reset Password</h1>
              <p className="text-xs text-[#C9C2A6] font-light leading-relaxed">
                Enter your registered email address to receive a secure 6-digit OTP verification code.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRequestOtp} className="space-y-5">
              <FloatingLabelInput
                label="Registered Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="btn-gold-luxury w-full py-3.5 rounded-xl font-medium tracking-[0.15em] uppercase text-xs flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4 text-[#0B1330]" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-2xl sm:text-3xl text-[#FAF8F3]">Verify Code &amp; Reset</h1>
              <p className="text-xs text-[#C9C2A6] font-light leading-relaxed">
                Enter the 6-digit OTP sent to <strong className="text-[#FAF8F3]">{email}</strong> and choose your new password.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && !errorMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="text-xs text-[#C9C2A6] font-medium block mb-1">
                  6-Digit Verification Code (OTP)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#060B1E] border border-white/15 text-center font-mono text-lg font-bold text-[#F5E7A3] tracking-[0.3em] focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>

              <FloatingLabelInput
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <FloatingLabelInput
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#C9C2A6]/70">Didn't receive code?</span>
                {countdown > 0 ? (
                  <span className="font-mono text-[#D4AF37]">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp()}
                    className="text-[#F5E7A3] hover:underline font-semibold cursor-pointer"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6 || !newPassword}
                className="btn-gold-luxury w-full py-3.5 rounded-xl font-medium tracking-[0.15em] uppercase text-xs flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify Code &amp; Update Password</span>
                    <CheckCircle2 className="w-4 h-4 text-[#0B1330]" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-center text-xs text-[#C9C2A6] hover:text-[#FAF8F3] transition-colors py-1 cursor-pointer"
              >
                ← Change Email Address
              </button>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h2 className="font-serif text-2xl text-[#FAF8F3]">Password Updated!</h2>

            <p className="text-xs text-[#C9C2A6] leading-relaxed">
              Your password has been successfully reset. Redirecting you to sign in...
            </p>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('login')}
                className="btn-gold-luxury px-6 py-2 rounded-xl text-xs font-semibold uppercase"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Back to Login link */}
        <div className="pt-4 border-t border-white/5 text-center">
          <button
            onClick={() => onNavigate('login')}
            className="inline-flex items-center gap-1.5 text-xs text-[#C9C2A6] hover:text-[#FAF8F3] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
