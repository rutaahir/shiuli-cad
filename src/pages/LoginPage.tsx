import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from '../components/BrandLogo';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { DesignerApplicationModal } from '../components/DesignerApplicationModal';
import { Mail, Lock, ArrowRight, Sparkles, AlertCircle, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageId } from '../types';

interface LoginPageProps {
  onNavigate: (page: PageId, extraId?: string) => void;
  onSuccess?: () => void;
}

const BRAND_QUOTES = [
  { text: 'Where Imagination Becomes Jewellery', author: 'The Shiuli Atelier' },
  { text: 'Engineered to ±0.02 mm Precision', author: 'MatrixGold Engineers' },
  { text: 'Native Rhino .3DM & Castable STL', author: 'Master CAD Foundry' },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showDesignerModal, setShowDesignerModal] = useState(false);

  // Rotate tagline quotes every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % BRAND_QUOTES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address or username');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(email, password);
      const role = (res?.role || res?.user?.role || 'client').toLowerCase();

      setIsLoading(false);
      if (role === 'admin') {
        onNavigate('admin');
      } else if (role === 'staff') {
        onNavigate('staff-portal');
      } else {
        onNavigate('account');
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setIsLoading(false);
      const msg = err?.message || 'Invalid email or password. Please check your credentials.';
      setErrorMessage(msg);
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoPass: string, role: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await login(demoEmail, demoPass);
      setIsLoading(false);
      if (role === 'admin') onNavigate('admin');
      else if (role === 'staff') onNavigate('staff-portal');
      else onNavigate('account');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(`Demo login failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B1E] text-[#F5F1E8] flex flex-col lg:flex-row relative overflow-hidden pt-20 lg:pt-0">
      
      {/* LEFT SIDE PANEL (45% DESKTOP): Rich Dark Royal Navy + Looping Gold Ribbon Motif */}
      <div className="lg:w-[45%] bg-[#080E24] relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-[#D4AF37]/20 overflow-hidden min-h-[320px] lg:min-h-screen">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#1E4FA3]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Line Drawing Background Ribbon SVG Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none stroke-[#D4AF37]" fill="none" viewBox="0 0 800 800">
          <motion.path
            d="M 100,100 Q 400,500 700,100 T 100,700"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
          <circle cx="400" cy="400" r="280" strokeWidth="1" strokeDasharray="6 6" />
        </svg>

        {/* Top Brand Logo */}
        <div className="relative z-10">
          <button onClick={() => onNavigate('home')} className="inline-block hover:opacity-90 transition-opacity">
            <BrandLogo variant="full" size="md" />
          </button>
        </div>

        {/* Center Quote Carousel */}
        <div className="relative z-10 my-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] uppercase tracking-[0.25em] text-[#F5E7A3] mb-6">
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span>Private Atelier Salon</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={quoteIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#FAF8F3] font-light leading-relaxed italic">
                “{BRAND_QUOTES[quoteIndex].text}”
              </h2>
              <p className="text-xs text-[#D4AF37] font-mono tracking-widest uppercase">
                — {BRAND_QUOTES[quoteIndex].author}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Trust Indicators */}
        <div className="relative z-10 flex items-center gap-6 text-[11px] text-[#C9C2A6]/70 border-t border-white/10 pt-6">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>256-bit Encrypted</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div>Certified Rhino 3DM Standards</div>
        </div>
      </div>

      {/* RIGHT SIDE FORM (55% DESKTOP): Warm Soft-Navy Card */}
      <div className="lg:w-[55%] flex items-center justify-center p-6 sm:p-12 lg:p-16 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md space-y-8 bg-[#080E24] border border-[#D4AF37]/25 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl relative z-10"
        >
          {/* Form Header */}
          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl text-[#FAF8F3] tracking-wide">
              Sign In to Your Account
            </h1>
            <p className="text-xs text-[#C9C2A6] font-light leading-relaxed">
              Sign in with your email or username to access your CAD library, orders, or workbench
            </p>
          </div>

          {/* Calm Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <FloatingLabelInput
                label="Email Address or Username"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <FloatingLabelInput
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />
            </motion.div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-xs text-[#C9C2A6] hover:text-[#D4AF37] transition-colors font-light"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-gold-luxury w-full py-4 rounded-xl font-medium tracking-[0.15em] uppercase text-xs flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 transition-transform active:scale-[0.99]"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-[#0B1330]" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D4AF37]/15" />
            </div>
            <span className="relative px-4 bg-[#080E24] text-[10px] uppercase tracking-widest text-[#C9C2A6]/60">
              Or
            </span>
          </div>

          {/* Create Account Link */}
          <div className="text-center">
            <p className="text-xs text-[#C9C2A6] font-light">
              New to Shiuli CAD Studio?{' '}
              <button
                onClick={() => onNavigate('register')}
                className="text-[#F5E7A3] font-semibold hover:text-[#D4AF37] underline underline-offset-4 transition-colors"
              >
                Create an Account
              </button>
            </p>
          </div>

          {/* Are you CAD Designer Section */}
          <div className="pt-2">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/15 via-[#101A3D] to-[#D4AF37]/15 border border-[#D4AF37]/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="text-left space-y-0.5">
                <p className="text-xs font-bold text-[#F5E7A3] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Are you a CAD Designer?</span>
                </p>
                <p className="text-[11px] text-[#C9C2A6]/80 font-light leading-snug">
                  Apply to join our atelier and accept bespoke 3D CAD design orders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDesignerModal(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] hover:brightness-110 text-[#0B1330] font-bold text-xs whitespace-nowrap transition-all shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>Apply Here</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

            {(import.meta as any).env?.DEV && (
              <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-[#C9C2A6]/50 text-center font-mono">
                  Quick Dev Fill (Dev Only)
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => { setEmail('shiulicad@gmail.com'); setPassword('admin123'); setErrorMessage(null); }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('shahharshil313@gmail.com'); setPassword('admin123'); setErrorMessage(null); }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] hover:bg-emerald-500/20 flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('vikram@example.com'); setPassword('admin123'); setErrorMessage(null); }}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] hover:bg-blue-500/20 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Client
                  </button>
                </div>
              </div>
            )}
        </motion.div>
      </div>

      <DesignerApplicationModal
        isOpen={showDesignerModal}
        onClose={() => setShowDesignerModal(false)}
      />
    </div>
  );
};
