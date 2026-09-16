import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from '../components/BrandLogo';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { User, Mail, Phone, Lock, ArrowRight, Check, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageId } from '../types';

interface RegisterPageProps {
  onNavigate: (page: PageId, extraId?: string) => void;
  onSuccess?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onSuccess }) => {
  const { register, executePendingIntent, pendingIntent } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showSuccessSeal, setShowSuccessSeal] = useState(false);

  // Compute password strength score (0 to 4)
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength(password);
  const strengthConfig = [
    { label: '', color: 'bg-transparent', text: '' },
    { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' },
    { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-400' },
    { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400' },
    { label: 'Royal Standard', color: 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3]', text: 'text-[#F5E7A3]' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'Full name is required';
    if (!email.trim()) errors.email = 'Email address is required';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters';

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!agreedTerms) {
      errors.terms = 'You must accept the Terms of Service';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name,
        email,
        password,
        phone_number: phone,
      });

      setIsLoading(false);
      setShowSuccessSeal(true);

      // Brief wax seal ceremony animation (~600ms) then execute intent or navigate
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
      const msg = err?.message || 'Registration failed. Please check your information.';
      setErrorMessage(msg);
      if (err?.fieldErrors) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fieldErrors)) {
          map[k] = Array.isArray(v) ? (v[0] as string) : String(v);
        }
        setFieldErrors(map);
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
              Join the Studio
            </h1>
            <p className="text-xs text-[#C9C2A6] font-light leading-relaxed">
              Create your client account to save designs, track custom orders, and download CAD assets.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <FloatingLabelInput
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="w-4 h-4" />}
              error={fieldErrors.name}
              required
            />

            <FloatingLabelInput
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              error={fieldErrors.email}
              required
            />

            <FloatingLabelInput
              label="Phone Number (Optional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="w-4 h-4" />}
              error={fieldErrors.phone}
            />

            {/* Password Field + Strength Indicator */}
            <div className="space-y-1.5">
              <FloatingLabelInput
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                error={fieldErrors.password}
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
                          strengthScore >= step ? strengthConfig[strengthScore].color : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#C9C2A6]/60">Password Strength:</span>
                    <span className={`font-semibold ${strengthConfig[strengthScore].text}`}>
                      {strengthConfig[strengthScore].label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <FloatingLabelInput
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              error={fieldErrors.confirmPassword}
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
