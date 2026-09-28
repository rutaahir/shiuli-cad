import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from './BrandLogo';
import { FloatingLabelInput } from './FloatingLabelInput';
import { DesignerApplicationModal } from './DesignerApplicationModal';
import { X, Mail, Lock, User, Phone, Sparkles, ArrowRight, ArrowLeft, KeyRound, AlertCircle, ShieldCheck, CheckCircle2, RefreshCw, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validateConfirmPassword,
  getPasswordStrength,
  STRENGTH_CONFIG,
} from '../utils/validationHelper';

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLoginSuccess?: (email: string, role?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  onLoginSuccess,
}) => {
  const {
    isLoggedIn,
    authModalOpen,
    authModalMessage,
    closeAuthModal,
    login,
    register,
    sendRegistrationOtp,
    verifyRegistrationOtp,
    executePendingIntent,
    pendingIntent,
  } = useAuth();

  const isOpen = propIsOpen !== undefined ? propIsOpen : authModalOpen;
  const handleClose = propOnClose || closeAuthModal;

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');

  // Registration step ('form' | 'otp')
  const [regStep, setRegStep] = useState<'form' | 'otp'>('form');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot password state
  const [fpStep, setFpStep] = useState<'request' | 'verify'>('request');
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtpDigits, setFpOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpTimer, setFpTimer] = useState<number>(60);
  const fpOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Form Fields
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDesignerModal, setShowDesignerModal] = useState(false);

  // Professional Field Validation State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [shakeKey, setShakeKey] = useState(0);

  const strengthScore = getPasswordStrength(password);

  const validateField = (field: string, val: string): string => {
    switch (field) {
      case 'name':
        return validateFullName(val).error;
      case 'email':
        return validateEmail(val).error;
      case 'phone':
        return validatePhoneNumber(val, false).error;
      case 'password':
        return validatePassword(val).error;
      case 'confirmPassword':
        return validateConfirmPassword(val, password).error;
      default:
        return '';
    }
  };

  const handleBlur = (field: string, val: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, val);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: string, val: string, setter: (v: string) => void) => {
    setter(val);
    if (touched[field] || fieldErrors[field]) {
      const error = validateField(field, val);
      setFieldErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  // OTP Countdown timer for registration
  useEffect(() => {
    let interval: any = null;
    if (regStep === 'otp' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [regStep, otpTimer]);

  // Forgot password OTP timer
  useEffect(() => {
    let interval: any = null;
    if (authMode === 'forgot_password' && fpStep === 'verify' && fpTimer > 0) {
      interval = setInterval(() => {
        setFpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authMode, fpStep, fpTimer]);

  if (!isOpen) return null;

  const handleOtpDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const cleaned = value.replace(/[^0-9]/g, '').slice(0, 6);
      if (cleaned.length > 0) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < cleaned.length; i++) {
          if (index + i < 6) newDigits[index + i] = cleaned[i];
        }
        setOtpDigits(newDigits);
        const nextFocus = Math.min(index + cleaned.length, 5);
        otpInputRefs.current[nextFocus]?.focus();
      }
      return;
    }

    const digit = value.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleFpOtpDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      const cleaned = value.replace(/[^0-9]/g, '').slice(0, 6);
      if (cleaned.length > 0) {
        const newDigits = [...fpOtpDigits];
        for (let i = 0; i < cleaned.length; i++) {
          if (index + i < 6) newDigits[index + i] = cleaned[i];
        }
        setFpOtpDigits(newDigits);
        const nextFocus = Math.min(index + cleaned.length, 5);
        fpOtpInputRefs.current[nextFocus]?.focus();
      }
      return;
    }

    const digit = value.replace(/[^0-9]/g, '');
    const newDigits = [...fpOtpDigits];
    newDigits[index] = digit;
    setFpOtpDigits(newDigits);

    if (digit && index < 5) {
      fpOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleFpOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !fpOtpDigits[index] && index > 0) {
      fpOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    try {
      const res = await sendRegistrationOtp(usernameOrEmail.trim(), name.trim());
      setOtpTimer(60);
      if (res?.debug_otp) setDebugOtp(res.debug_otp);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = fpEmail.trim();
    if (!targetEmail || !validateEmail(targetEmail).isValid) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.requestPasswordResetOtp(targetEmail);
      setIsLoading(false);
      setFpStep('verify');
      setFpTimer(60);
      setFpOtpDigits(['', '', '', '', '', '']);
      if (res?.debug_otp) setDebugOtp(res.debug_otp);
      setTimeout(() => {
        fpOtpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Failed to dispatch password reset code.');
    }
  };

  const handleVerifyPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = fpOtpDigits.join('').trim();
    if (code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }
    if (!fpNewPassword || fpNewPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.verifyPasswordResetOtp(code, fpNewPassword, fpEmail.trim());
      setIsLoading(false);
      setSuccessMessage('Password reset successfully! You can now sign in with your new password.');
      setUsernameOrEmail(fpEmail.trim());
      setPassword('');
      setAuthMode('login');
      setFpStep('request');
      setDebugOtp(null);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Invalid verification code or password reset failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (authMode === 'login') {
        const data = await login(usernameOrEmail, password);
        const userRole = (data?.user?.role || data?.role || 'client').toLowerCase();

        setIsLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess(data.user?.email || usernameOrEmail, userRole);
        }
        if (pendingIntent) {
          await executePendingIntent();
        } else {
          handleClose();
          if (userRole === 'admin') {
            window.location.href = '/admin';
          } else if (userRole === 'staff') {
            window.location.href = '/staff-portal';
          }
        }
      } else if (regStep === 'form') {
        // Step 1: Validate Registration Details & Send OTP
        const errors: Record<string, string> = {
          name: validateField('name', name),
          email: validateField('email', usernameOrEmail),
          phone: validateField('phone', phone),
          password: validateField('password', password),
          confirmPassword: validateField('confirmPassword', confirmPassword),
        };

        const activeErrors = Object.fromEntries(
          Object.entries(errors).filter(([_, v]) => Boolean(v))
        );

        if (Object.keys(activeErrors).length > 0) {
          setIsLoading(false);
          setFieldErrors(activeErrors);
          setTouched({
            name: true,
            email: true,
            phone: true,
            password: true,
            confirmPassword: true,
          });
          setShakeKey((k) => k + 1);
          setErrorMessage('Please review and correct the highlighted fields.');
          return;
        }

        const otpRes = await sendRegistrationOtp(usernameOrEmail.trim(), name.trim());
        setIsLoading(false);
        setRegStep('otp');
        setOtpTimer(60);
        setOtpDigits(['', '', '', '', '', '']);
        if (otpRes?.debug_otp) {
          setDebugOtp(otpRes.debug_otp);
        }
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        // Step 2: Verify OTP and finalize registration
        const fullCode = otpDigits.join('').trim();
        if (fullCode.length !== 6) {
          setIsLoading(false);
          setErrorMessage('Please enter the complete 6-digit verification code.');
          return;
        }

        const data = await verifyRegistrationOtp({
          email: usernameOrEmail.trim(),
          code: fullCode,
          name: name.trim(),
          password,
          phone_number: phone.trim(),
        });

        setIsLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess(data.user?.email || usernameOrEmail, 'client');
        }
        if (pendingIntent) {
          await executePendingIntent();
        } else {
          handleClose();
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      const msg = err?.message || err?.detail || err?.error || 'Authentication failed. Please check your details.';
      setErrorMessage(msg);
    }
  };

  const handleQuickDemoLogin = (role: 'client' | 'staff' | 'admin') => {
    if (role === 'staff') {
      setUsernameOrEmail('shahharshil313@gmail.com');
    } else if (role === 'admin') {
      setUsernameOrEmail('shiulicad@gmail.com');
    } else {
      setUsernameOrEmail('client@shiulicad.com');
    }
    setPassword('DemoPass@123');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060B1E]/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-[#0B1330] border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 overflow-hidden"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-[#C9C2A6] hover:text-[#FAF8F3] rounded-full hover:bg-white/10 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Contextual Action Message Banner (from requireAuth) */}
        {authModalMessage && (
          <div className="mb-5 p-3 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5E7A3] text-xs font-medium flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>{authModalMessage}</span>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <BrandLogo variant="mark-only" size="lg" className="mx-auto" />
          <h3 className="font-serif text-2xl tracking-wide text-[#FAF8F3]">
            {authMode === 'register'
              ? regStep === 'otp'
                ? 'Verify Your Email Address'
                : 'Join Shiuli CAD Studio'
              : authMode === 'forgot_password'
                ? fpStep === 'request'
                  ? 'Reset Your Password'
                  : 'Enter Verification Code'
                : 'Sign In to Your Account'}
          </h3>
          <p className="text-xs text-[#C9C2A6] font-light">
            {authMode === 'register'
              ? regStep === 'otp'
                ? `Enter the 6-digit verification code sent to ${usernameOrEmail}`
                : 'Save designs, track custom orders & download watertight CAD files'
              : authMode === 'forgot_password'
                ? fpStep === 'request'
                  ? 'Enter your registered email address and we will dispatch a 6-digit security code.'
                  : `Enter the 6-digit verification code dispatched to ${fpEmail}`
                : 'Sign in with your email or username to access your account, orders, or workbench'}
          </p>
        </div>

        {/* Error Message with Smart Switch-To-Login helper */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            {errorMessage.toLowerCase().includes('already exists') && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setRegStep('form');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="self-start text-[11px] font-semibold text-[#F5E7A3] hover:text-[#D4AF37] underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <span>Click here to Sign In with this email</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Success Message Banner */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORGOT PASSWORD WORKFLOW */}
        {authMode === 'forgot_password' ? (
          fpStep === 'request' ? (
            <form onSubmit={handleRequestPasswordReset} className="space-y-4">
              <FloatingLabelInput
                label="Registered Email Address"
                type="email"
                value={fpEmail}
                onChange={(e) => setFpEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />

              <button
                type="submit"
                disabled={isLoading || !fpEmail.trim()}
                className="btn-gold-luxury w-full py-3.5 rounded-xl font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#0B1330]" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full py-2.5 text-xs text-[#C9C2A6] hover:text-[#FAF8F3] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPasswordReset} className="space-y-4">
              {/* 6 Individual Digit Boxes */}
              <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-3">
                {fpOtpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (fpOtpInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleFpOtpDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleFpOtpKeyDown(index, e)}
                    className="w-9 h-11 xs:w-10 xs:h-12 sm:w-12 sm:h-14 text-center text-lg xs:text-xl sm:text-2xl font-mono font-bold bg-[#060D22] border-2 border-[#D4AF37]/40 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30 rounded-xl text-[#FAF8F3] outline-none transition-all shadow-inner"
                  />
                ))}
              </div>

              {debugOtp && (
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
                    <Sparkles className="w-3 h-3" /> Auto-Test Code: <strong>{debugOtp}</strong>
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-[#C9C2A6]">
                <span>Didn't receive code?</span>
                {fpTimer > 0 ? (
                  <span className="font-mono text-[#D4AF37] font-medium">Resend in {fpTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      if (isResending) return;
                      setIsResending(true);
                      setErrorMessage(null);
                      try {
                        const res = await api.requestPasswordResetOtp(fpEmail.trim());
                        setFpTimer(60);
                        if (res?.debug_otp) setDebugOtp(res.debug_otp);
                      } catch (err: any) {
                        setErrorMessage(err?.message || 'Failed to resend code.');
                      } finally {
                        setIsResending(false);
                      }
                    }}
                    disabled={isResending}
                    className="text-[#F5E7A3] font-semibold hover:text-[#D4AF37] underline transition-colors disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {isResending && <RefreshCw className="w-3 h-3 animate-spin" />}
                    Resend Code
                  </button>
                )}
              </div>

              <FloatingLabelInput
                label="New Password"
                type="password"
                value={fpNewPassword}
                onChange={(e) => setFpNewPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <FloatingLabelInput
                label="Confirm New Password"
                type="password"
                value={fpConfirmPassword}
                onChange={(e) => setFpConfirmPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <button
                type="submit"
                disabled={isLoading || fpOtpDigits.join('').length !== 6 || !fpNewPassword}
                className="btn-gold-luxury w-full py-3.5 rounded-xl font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#0B1330]" />
                    <span>Reset Password &amp; Sign In</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFpStep('request');
                  setErrorMessage(null);
                }}
                className="w-full py-2.5 text-xs text-[#C9C2A6] hover:text-[#FAF8F3] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>
            </form>
          )
        ) : authMode === 'register' && regStep === 'otp' ? (
          /* STEP 2: REGISTRATION OTP VIEW */
          <div className="space-y-6">
            <div className="flex justify-center my-2">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            {/* 6 Individual Digit Boxes */}
            <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-3">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-9 h-11 xs:w-10 xs:h-12 sm:w-12 sm:h-14 text-center text-lg xs:text-xl sm:text-2xl font-mono font-bold bg-[#060D22] border-2 border-[#D4AF37]/40 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30 rounded-xl text-[#FAF8F3] outline-none transition-all shadow-inner"
                />
              ))}
            </div>

            {/* Debug OTP Chip for developer testing */}
            {debugOtp && (
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
                  <Sparkles className="w-3 h-3" /> Auto-Test Code: <strong>{debugOtp}</strong>
                </span>
              </div>
            )}

            {/* Resend OTP + Timer */}
            <div className="flex items-center justify-between text-xs text-[#C9C2A6]">
              <span>Didn't receive code?</span>
              {otpTimer > 0 ? (
                <span className="font-mono text-[#D4AF37] font-medium">
                  Resend in {otpTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-[#F5E7A3] font-semibold hover:text-[#D4AF37] underline transition-colors disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                >
                  {isResending && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Resend Code
                </button>
              )}
            </div>

            {/* Submit & Back Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || otpDigits.join('').length !== 6}
                className="btn-gold-luxury w-full py-3.5 rounded-xl font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#0B1330]" />
                    <span>Verify &amp; Complete Registration</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRegStep('form');
                  setErrorMessage(null);
                }}
                className="w-full py-2.5 text-xs text-[#C9C2A6] hover:text-[#FAF8F3] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Registration Details</span>
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1: LOGIN / REGISTRATION FORM */
          <form
            key={shakeKey}
            onSubmit={handleSubmit}
            noValidate
            className={`space-y-4 ${shakeKey > 0 ? 'animate-shake' : ''}`}
          >
            {authMode === 'register' && (
              <>
                <FloatingLabelInput
                  label="Full Name"
                  type="text"
                  value={name}
                  onChange={(e) => handleChange('name', e.target.value, setName)}
                  onBlur={() => handleBlur('name', name)}
                  icon={<User className="w-4 h-4" />}
                  error={touched.name ? fieldErrors.name : undefined}
                  required
                />
              </>
            )}

            <FloatingLabelInput
              label={authMode === 'register' ? 'Email Address' : 'Email or Username'}
              type={authMode === 'register' ? 'email' : 'text'}
              value={usernameOrEmail}
              onChange={(e) => handleChange('email', e.target.value, setUsernameOrEmail)}
              onBlur={() => authMode === 'register' && handleBlur('email', usernameOrEmail)}
              icon={<Mail className="w-4 h-4" />}
              error={authMode === 'register' && touched.email ? fieldErrors.email : undefined}
              required
            />

            {authMode === 'register' && (
              <FloatingLabelInput
                label="Mobile Phone (Optional)"
                type="tel"
                value={phone}
                onChange={(e) => handleChange('phone', e.target.value, setPhone)}
                onBlur={() => handleBlur('phone', phone)}
                icon={<Phone className="w-4 h-4" />}
                error={touched.phone ? fieldErrors.phone : undefined}
                hint="Used for critical order status & WhatsApp CAD alerts"
              />
            )}

            <div>
              <FloatingLabelInput
                label="Password"
                type="password"
                value={password}
                onChange={(e) => handleChange('password', e.target.value, setPassword)}
                onBlur={() => authMode === 'register' && handleBlur('password', password)}
                icon={<Lock className="w-4 h-4" />}
                error={authMode === 'register' && touched.password ? fieldErrors.password : undefined}
                required
              />

              {/* Forgot Password link in Login Mode */}
              {authMode === 'login' && (
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot_password');
                      setFpStep('request');
                      setFpEmail(usernameOrEmail.includes('@') ? usernameOrEmail.trim() : '');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-[#D4AF37] hover:text-[#F5E7A3] underline transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {/* Password Strength Indicator for Registration */}
            {authMode === 'register' && password.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-white/5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`flex-1 transition-all duration-300 ${
                        strengthScore >= step ? STRENGTH_CONFIG[strengthScore].color : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#C9C2A6]/60">Password Security:</span>
                  <span className={`font-semibold ${STRENGTH_CONFIG[strengthScore].text}`}>
                    {STRENGTH_CONFIG[strengthScore].label}
                  </span>
                </div>
              </div>
            )}

            {authMode === 'register' && (
              <FloatingLabelInput
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value, setConfirmPassword)}
                onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                icon={<Lock className="w-4 h-4" />}
                error={touched.confirmPassword ? fieldErrors.confirmPassword : undefined}
                required
              />
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-gold-luxury w-full py-3.5 rounded-xl font-medium tracking-wider uppercase text-xs flex items-center justify-center gap-2 shadow-lg mt-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {authMode === 'register'
                      ? 'Register & Verify Email'
                      : 'Sign In'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#0B1330]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Toggle Login/Register */}
        {authMode !== 'forgot_password' && regStep === 'form' && (
          <div className="text-center pt-4 border-t border-white/10 mt-4 space-y-3">
            <p className="text-xs text-[#C9C2A6] font-light">
              {authMode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'));
                  setRegStep('form');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setFieldErrors({});
                  setTouched({});
                }}
                className="text-[#F5E7A3] font-semibold hover:text-[#D4AF37] underline underline-offset-4 cursor-pointer"
              >
                {authMode === 'login' ? 'Create Client Account' : 'Sign In'}
              </button>
            </p>

            {/* CAD Designer Self-Registration Prompt */}
            <div className="p-3 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-between gap-2 text-left">
              <div>
                <p className="text-[11px] font-bold text-[#F5E7A3] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  <span>Are you a CAD Designer?</span>
                </p>
                <p className="text-[10px] text-[#C9C2A6]/80 font-light">
                  Apply to join our atelier and receive staff login credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDesignerModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#F5E7A3] text-[#0B1330] font-bold text-[11px] whitespace-nowrap transition-colors shadow-sm cursor-pointer"
              >
                Apply Here
              </button>
            </div>
          </div>
        )}

        {/* Demo Fast Login Shortcuts (Dev Only) */}
        {(import.meta as any).env?.DEV && authMode !== 'forgot_password' && regStep === 'form' && (
          <div className="mt-4 pt-3 border-t border-white/5 text-center space-y-2">
            <div className="text-[10px] text-[#C9C2A6]/60 uppercase tracking-widest font-mono">Quick Dev Fill</div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('staff')}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] hover:bg-emerald-500/20 flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                Staff
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('client')}
                className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] hover:bg-blue-500/20 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Client
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <DesignerApplicationModal
        isOpen={showDesignerModal}
        onClose={() => setShowDesignerModal(false)}
      />
    </div>
  );
};
