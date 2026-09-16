import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from './BrandLogo';
import { FloatingLabelInput } from './FloatingLabelInput';
import { X, Mail, Lock, User, Phone, Sparkles, ArrowRight, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    executePendingIntent,
    pendingIntent,
  } = useAuth();

  const isOpen = propIsOpen !== undefined ? propIsOpen : authModalOpen;
  const handleClose = propOnClose || closeAuthModal;

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [userType, setUserType] = useState<'client' | 'staff'>('client');

  // Form Fields
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (authMode === 'login') {
        const data = await login(usernameOrEmail, password);
        setIsLoading(false);
        const userRole = data?.user?.role || data?.role;
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
      } else {
        // Register Client
        if (!name.trim()) {
          setIsLoading(false);
          setErrorMessage('Please enter your full name.');
          return;
        }
        if (!usernameOrEmail.trim()) {
          setIsLoading(false);
          setErrorMessage('Please enter your email address.');
          return;
        }
        if (!password) {
          setIsLoading(false);
          setErrorMessage('Please enter a password.');
          return;
        }
        if (password.length < 6) {
          setIsLoading(false);
          setErrorMessage('Password must be at least 6 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setIsLoading(false);
          setErrorMessage('Passwords do not match.');
          return;
        }

        const data = await register({
          name,
          email: usernameOrEmail,
          password,
          phone_number: phone,
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
      const msg = err?.message || 'Authentication failed. Please check your details.';
      setErrorMessage(msg);
    }
  };

  const handleQuickDemoLogin = async (role: 'client' | 'staff' | 'admin') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let demoUser = 'vikram@example.com';
      let demoPass = 'client123';
      if (role === 'staff') {
        demoUser = 'shahharshil313@gmail.com';
        demoPass = 'staff123';
      } else if (role === 'admin') {
        demoUser = 'admin@shiuli.com';
        demoPass = 'admin123';
      }

      const res = await login(demoUser, demoPass);
      setIsLoading(false);

      const userRole = res?.user?.role || res?.role || role;
      if (onLoginSuccess) {
        onLoginSuccess(res?.user?.email || demoUser, userRole);
      }

      handleClose();
      if (userRole === 'admin') {
        window.location.href = '/admin';
      } else if (userRole === 'staff') {
        window.location.href = '/staff-portal';
      } else {
        window.location.href = '/account';
      }
      if (pendingIntent) {
        await executePendingIntent();
      } else {
        handleClose();
        if (role === 'admin') {
          window.location.href = '/admin';
        } else if (role === 'staff') {
          window.location.href = '/staff-portal';
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(`Demo login failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-md rounded-3xl bg-[#080E24] border border-[#D4AF37]/35 shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-6 sm:p-8 text-[#FAF8F3] overflow-hidden"
      >
        {/* Ambient Gold Gradient Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1E4FA3] via-[#D4AF37] to-[#F5E7A3]" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-[#C9C2A6] hover:text-[#FAF8F3] rounded-full hover:bg-white/10 transition-colors z-10"
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
            {authMode === 'register' ? 'Join Shiuli CAD Studio' : userType === 'staff' ? 'Staff & Designer Portal' : 'Client Atelier Login'}
          </h3>
          <p className="text-xs text-[#C9C2A6] font-light">
            {authMode === 'register'
              ? 'Save designs, track custom orders & download watertight CAD files'
              : userType === 'staff'
              ? 'Sign in to access your CAD Workbench & active job pool'
              : 'Sign in to access your downloaded 3DM and STL assets'}
          </p>
        </div>

        {/* User Role Selector */}
        <div className="flex rounded-xl bg-[#060D22] p-1 border border-[#D4AF37]/20 mb-5">
          <button
            type="button"
            onClick={() => {
              setUserType('client');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg tracking-wider transition-all ${
              userType === 'client' ? 'bg-[#D4AF37] text-[#0B1330] shadow-md' : 'text-[#C9C2A6] hover:text-white'
            }`}
          >
            Client Login
          </button>
          <button
            type="button"
            onClick={() => {
              setUserType('staff');
              setAuthMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg tracking-wider transition-all ${
              userType === 'staff' ? 'bg-[#D4AF37] text-[#0B1330] shadow-md' : 'text-[#C9C2A6] hover:text-white'
            }`}
          >
            Staff / Modeller
          </button>
        </div>

        {/* Calm Error Message */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'register' && (
            <>
              <FloatingLabelInput
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User className="w-4 h-4" />}
                required
              />
              <FloatingLabelInput
                label="Phone Number (Optional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                icon={<Phone className="w-4 h-4" />}
              />
            </>
          )}

          <FloatingLabelInput
            label={userType === 'staff' ? 'Username or Email' : 'Email Address'}
            type="text"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
          />

          <FloatingLabelInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />

          {authMode === 'register' && (
            <FloatingLabelInput
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-gold-luxury w-full py-3.5 rounded-xl font-medium tracking-wider uppercase text-xs flex items-center justify-center gap-2 shadow-lg mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{authMode === 'register' ? 'Register & Continue' : userType === 'staff' ? 'Login to Staff Portal' : 'Sign In To Atelier'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#0B1330]" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Login/Register */}
        {userType === 'client' && (
          <div className="text-center pt-4 border-t border-white/10 mt-4">
            <p className="text-xs text-[#C9C2A6] font-light">
              {authMode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'));
                  setErrorMessage(null);
                }}
                className="text-[#F5E7A3] font-semibold hover:text-[#D4AF37] underline underline-offset-4"
              >
                {authMode === 'login' ? 'Create Account' : 'Sign In'}
              </button>
            </p>
          </div>
        )}

        {/* Demo Fast Login Shortcuts */}
        <div className="mt-4 pt-3 border-t border-white/5 text-center space-y-2">
          <div className="text-[10px] text-[#C9C2A6]/60 uppercase tracking-widest font-mono">Quick Demo Logins</div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('staff')}
              className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] hover:bg-emerald-500/20 flex items-center gap-1"
            >
              <KeyRound className="w-3 h-3" />
              Staff
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin')}
              className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] hover:bg-amber-500/20 flex items-center gap-1"
            >
              <KeyRound className="w-3 h-3" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('client')}
              className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] hover:bg-blue-500/20 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Client
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
