import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from '../components/BrandLogo';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { User, Mail, Phone, Lock, ArrowRight, ArrowLeft, Check, ShieldCheck, Sparkles, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageId } from '../types';
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validateConfirmPassword,
  getPasswordStrength,
  STRENGTH_CONFIG,
} from '../utils/validationHelper';

interface RegisterPageProps {
  onNavigate: (page: PageId, extraId?: string) => void;
  onSuccess?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onSuccess }) => {
  const { register, sendRegistrationOtp, verifyRegistrationOtp, executePendingIntent, pendingIntent } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  // OTP State
  const [regStep, setRegStep] = useState<'form' | 'otp'>('form');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [shakeKey, setShakeKey] = useState(0);
  const [showSuccessSeal, setShowSuccessSeal] = useState(false);

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
    const err = validateField(field, val);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field: string, val: string, setter: (v: string) => void) => {
    setter(val);
    if (touched[field] || fieldErrors[field]) {
      const err = validateField(field, val);
      setFieldErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  // OTP Countdown timer
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

  const handleOtpDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
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

  const handleResendOtp = async () => {
    if (otpTimer > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    try {
      const res = await sendRegistrationOtp(email.trim(), name.trim());
      setOtpTimer(60);
      if (res?.debug_otp) setDebugOtp(res.debug_otp);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const strengthScore = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (regStep === 'form') {
      const errors: Record<string, string> = {
        name: validateFullName(name).error,
        email: validateEmail(email).error,
        phone: validatePhoneNumber(phone, false).error,
        password: validatePassword(password).error,
        confirmPassword: validateConfirmPassword(confirmPassword, password).error,
      };
      if (!agreedTerms) {
        errors.terms = 'You must accept the Terms of Service & Privacy Policy.';
      }

      const activeErrors = Object.fromEntries(
        Object.entries(errors).filter(([_, v]) => Boolean(v))
      );

      if (Object.keys(activeErrors).length > 0) {
        setFieldErrors(activeErrors);
        setTouched({
          name: true,
          email: true,
          phone: true,
          password: true,
          confirmPassword: true,
          terms: true,
        });
        setShakeKey((k) => k + 1);
        setErrorMessage('Please review and correct the highlighted fields.');
        return;
      }

      setIsLoading(true);

      try {
        const otpRes = await sendRegistrationOtp(email.trim(), name.trim());
        setIsLoading(false);
        setRegStep('otp');
        setOtpTimer(60);
        setOtpDigits(['', '', '', '', '', '']);
        if (otpRes?.debug_otp) setDebugOtp(otpRes.debug_otp);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } catch (err: any) {
        setIsLoading(false);
        const msg = err?.message || err?.detail || 'Failed to dispatch verification code. Please check your email.';
        setErrorMessage(msg);
      }
    } else {
      // Step 2: Verify OTP and finalize
      const fullCode = otpDigits.join('').trim();
      if (fullCode.length !== 6) {
        setErrorMessage('Please enter the complete 6-digit verification code.');
        return;
      }

      setIsLoading(true);

      try {
        await verifyRegistrationOtp({
          email: email.trim(),
          code: fullCode,
          name: name.trim(),
          password,
          phone_number: phone.trim(),
        });

        setIsLoading(false);
        setShowSuccessSeal(true);

        setTimeout(async () => {
          if (pendingIntent) {
            await executePendingIntent();
          } else if (onSuccess) {
            onSuccess();
          } else {
            onNavigate('account');
          }
        }, 700);
      } catch (err: any) {
        setIsLoading(false);
        const msg = err?.message || err?.detail || 'Verification code invalid or expired.';
        setErrorMessage(msg);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#060B1E] text-[#F5F1E8] flex flex-col lg:flex-row relative overflow-hidden pt-20 lg:pt-0">
      
      {/* LEFT SIDE PANEL (45% DESKTOP) */}
      <div className="lg:w-[45%] bg-[#080E24] relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-[#D4AF37]/20 overflow-hidden min-h-[320px] lg:min-h-screen">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Ribbon Pattern Overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none stroke-[#D4AF37]" fill="none" viewBox="0 0 800 800">
          <motion.path
            d="M 200,600 Q 500,200 700,600 T 200,100"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 7, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
        </svg>

        {/* Top Logo */}
        <div className="relative z-10">
          <button onClick={() => onNavigate('home')} className="inline-block hover:opacity-90 transition-opacity">
            <BrandLogo variant="full" size="md" />
          </button>
        </div>

        {/* Tagline Content */}
        <div className="relative z-10 my-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] uppercase tracking-[0.25em] text-[#F5E7A3]">
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span>Join Wholesale Atelier</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl text-[#FAF8F3] font-light leading-snug">
            Welcome to the World's Premier Jewellery CAD Studio
          </h2>

          <p className="text-xs text-[#C9C2A6] font-light leading-relaxed max-w-md">
            Direct access to ready-to-cast .3DM geometry, watertight .STL meshes calibrated for gold &amp; platinum shrinkage, and priority bespoke modeling.
          </p>
        </div>

        {/* Trust Strip */}
        <div className="relative z-10 flex items-center gap-6 text-[11px] text-[#C9C2A6]/70 border-t border-white/10 pt-6">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>Instant Access</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div>±0.02 mm Standard</div>
        </div>
      </div>

      {/* RIGHT SIDE FORM (55% DESKTOP) */}
      <div className="lg:w-[55%] flex items-center justify-center p-6 sm:p-12 lg:p-16 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md space-y-6 bg-[#080E24] border border-[#D4AF37]/25 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl relative z-10"
        >
          {/* Header */}
          <div className="space-y-1.5">
            <h1 className="font-serif text-3xl sm:text-4xl text-[#FAF8F3] tracking-wide">
              {regStep === 'otp' ? 'Verify Your Email' : 'Join the Studio'}
            </h1>
            <p className="text-xs text-[#C9C2A6] font-light leading-relaxed">
              {regStep === 'otp'
                ? `Enter the 6-digit verification code sent to ${email}`
                : 'Create your client account to save designs, track custom orders, and download CAD assets.'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {regStep === 'otp' ? (
            /* STEP 2: REGISTRATION OTP VIEW */
            <div className="space-y-6">
              <div className="flex justify-center my-2">
                <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <ShieldCheck className="w-7 h-7" />
                </div>
              </div>

              {/* 6 Individual Digit Boxes */}
              <div className="flex justify-center gap-2 sm:gap-3">
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
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold bg-[#060D22] border-2 border-[#D4AF37]/40 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30 rounded-xl text-[#FAF8F3] outline-none transition-all shadow-inner"
                  />
                ))}
              </div>

              {/* Debug OTP Chip for testing */}
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
                    className="text-[#F5E7A3] font-semibold hover:text-[#D4AF37] underline transition-colors disabled:opacity-50 inline-flex items-center gap-1"
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
                  className="btn-gold-luxury w-full py-4 rounded-xl font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
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
            /* STEP 1: FORM */
            <form
              key={shakeKey}
              onSubmit={handleSubmit}
              noValidate
              className={`space-y-4 ${shakeKey > 0 ? 'animate-shake' : ''}`}
            >
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

              <FloatingLabelInput
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => handleChange('email', e.target.value, setEmail)}
                onBlur={() => handleBlur('email', email)}
                icon={<Mail className="w-4 h-4" />}
                error={touched.email ? fieldErrors.email : undefined}
                required
              />

              <FloatingLabelInput
                label="Phone Number (Optional)"
                type="tel"
                value={phone}
                onChange={(e) => handleChange('phone', e.target.value, setPhone)}
                onBlur={() => handleBlur('phone', phone)}
                icon={<Phone className="w-4 h-4" />}
                error={touched.phone ? fieldErrors.phone : undefined}
                placeholder="+91 98765 43210"
              />

              {/* Password Field + Strength Indicator */}
              <div className="space-y-1.5">
                <FloatingLabelInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => handleChange('password', e.target.value, setPassword)}
                  onBlur={() => handleBlur('password', password)}
                  icon={<Lock className="w-4 h-4" />}
                  error={touched.password ? fieldErrors.password : undefined}
                  required
                />

                {/* Strength Indicator Bar */}
                {password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex h-1.5 w-full bg-black/40 rounded-full overflow-hidden gap-1">
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
                      <span className="text-[#C9C2A6]/60">Password Strength:</span>
                      <span className={`font-semibold ${STRENGTH_CONFIG[strengthScore].text}`}>
                        {STRENGTH_CONFIG[strengthScore].label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

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

            {/* Terms Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#D4AF37] cursor-pointer"
                />
                <span className="text-xs text-[#C9C2A6] font-light leading-snug">
                  I agree to the{' '}
                  <button type="button" onClick={() => onNavigate('privacy-terms' as any)} className="text-[#F5E7A3] underline">
                    Terms of Service
                  </button>{' '}
                  &amp; Privacy Policy.
                </span>
              </label>
              {fieldErrors.terms && (
                <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.terms}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-gold-luxury w-full py-4 rounded-xl font-medium tracking-[0.15em] uppercase text-xs flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 transition-transform active:scale-[0.99] mt-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 text-[#0B1330]" />
                </>
              )}
            </button>
          </form>
        )}

          {/* Already have account */}
          <div className="text-center pt-2 border-t border-white/5">
            <p className="text-xs text-[#C9C2A6] font-light">
              Already have an account?{' '}
              <button
                onClick={() => onNavigate('login')}
                className="text-[#F5E7A3] font-semibold hover:text-[#D4AF37] underline underline-offset-4 transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Royal Checkmark Seal Success Overlay */}
      <AnimatePresence>
        {showSuccessSeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-[#080E24] border border-[#D4AF37] rounded-3xl p-8 text-center space-y-4 max-w-sm shadow-[0_0_60px_rgba(212,175,55,0.4)]"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F5E7A3] flex items-center justify-center shadow-lg text-[#0B1330]">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
              <h3 className="font-serif text-2xl text-[#FAF8F3]">Account Verified</h3>
              <p className="text-xs text-[#C9C2A6]">Welcome to Shiuli CAD Studio. Redirecting to your atelier…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
