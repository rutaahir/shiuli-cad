import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BrandLogo } from '../components/BrandLogo';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import { PageId } from '../types';

interface ForgotPasswordPageProps {
  onNavigate: (page: PageId, extraId?: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Simulate sending request & set submitted state
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1000);
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

        {!isSubmitted ? (
          <>
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-3xl text-[#FAF8F3]">Reset Password</h1>
              <p className="text-xs text-[#C9C2A6] font-light leading-relaxed">
                Enter your registered email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {/* Note banner regarding Backend Email Integration */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Automated password reset emails require an active SMTP mail server configuration on the Django backend.
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <FloatingLabelInput
                label="Registered Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                error={errorMessage || undefined}
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="btn-gold-luxury w-full py-3.5 rounded-xl font-medium tracking-[0.15em] uppercase text-xs flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4 text-[#0B1330]" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success Confirmation State */
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="font-serif text-2xl text-[#FAF8F3]">Check Your Inbox</h2>

            <p className="text-xs text-[#C9C2A6] leading-relaxed">
              If an account associated with <strong className="text-[#F5E7A3]">{email}</strong> exists, you will receive password reset instructions shortly.
            </p>

            <div className="pt-2">
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-xs text-[#D4AF37] hover:underline"
              >
                Didn't receive email? Try again
              </button>
            </div>
          </div>
        )}

        {/* Back to Login link */}
        <div className="pt-4 border-t border-white/5 text-center">
          <button
            onClick={() => onNavigate('login')}
            className="inline-flex items-center gap-1.5 text-xs text-[#C9C2A6] hover:text-[#FAF8F3] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
