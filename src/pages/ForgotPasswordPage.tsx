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
    <div className="min-h-[calc(100vh-53px)] bg-[#FFFDF9] text-[#17243B] flex items-center justify-center p-6 sm:p-12 relative overflow-hidden py-12">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#D9B66F]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#17345C]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white border border-[#E8D7B7] rounded-3xl p-8 sm:p-10 shadow-lg space-y-6 relative z-10"
      >
        {/* Top Logo */}
        <div className="text-center">
          <button onClick={() => onNavigate('home')} className="inline-block hover:opacity-90 transition-opacity">
            <BrandLogo variant="full" size="md" className="mx-auto" theme="light" />
          </button>
        </div>

        {step === 'email' && (
          <>
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-3xl font-bold text-[#17345C]">Reset Password</h1>
              <p className="text-xs text-[#687386] font-normal leading-relaxed">
                Enter your registered email address to receive a secure 6-digit OTP verification code.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRequestOtp} className="space-y-5">
              <FloatingLabelInput
                label="Registered Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4 text-[#B88732]" />}
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="btn-gold-luxury text-[#17345C] font-bold w-full py-3.5 rounded-xl tracking-[0.15em] uppercase text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#17345C] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4 text-[#17345C]" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#17345C]">Verify Code &amp; Reset</h1>
              <p className="text-xs text-[#687386] font-normal leading-relaxed">
                Enter the 6-digit OTP sent to <strong className="text-[#17345C]">{email}</strong> and choose your new password.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && !errorMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="text-xs text-[#17345C] font-semibold block mb-1">
                  6-Digit Verification Code (OTP)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-center font-mono text-lg font-bold text-[#17345C] tracking-[0.3em] focus:outline-none focus:border-[#D9B66F]"
                  required
                />
              </div>

              <FloatingLabelInput
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock className="w-4 h-4 text-[#B88732]" />}
                required
              />

              <FloatingLabelInput
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-4 h-4 text-[#B88732]" />}
                required
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#687386]">Didn't receive code?</span>
                {countdown > 0 ? (
                  <span className="font-mono text-[#B88732] font-semibold">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp()}
                    className="text-[#B88732] hover:underline font-semibold cursor-pointer"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6 || !newPassword}
                className="btn-gold-luxury text-[#17345C] font-bold w-full py-3.5 rounded-xl tracking-[0.15em] uppercase text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#17345C] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify Code &amp; Update Password</span>
                    <CheckCircle2 className="w-4 h-4 text-[#17345C]" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-center text-xs text-[#687386] hover:text-[#17345C] transition-colors py-1 cursor-pointer"
              >
                ← Change Email Address
              </button>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600 shadow-sm">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h2 className="font-serif text-2xl font-bold text-[#17345C]">Password Updated!</h2>

            <p className="text-xs text-[#687386] leading-relaxed">
              Your password has been successfully reset. Redirecting you to sign in...
            </p>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('login')}
                className="btn-gold-luxury text-[#17345C] font-bold px-6 py-2 rounded-xl text-xs uppercase"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Back to Login link */}
        <div className="pt-4 border-t border-[#E8D7B7] text-center">
          <button
            onClick={() => onNavigate('login')}
            className="inline-flex items-center gap-1.5 text-xs text-[#687386] hover:text-[#17345C] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
