import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Globe,
  UploadCloud,
  FileArchive,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Check,
  Building,
  Layers,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { FloatingLabelInput } from './FloatingLabelInput';
import { api } from '../services/api';

interface DesignerApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesignerApplicationModal: React.FC<DesignerApplicationModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');
  const [experience, setExperience] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [workZip, setWorkZip] = useState<File | null>(null);

  // Captcha state
  const [captchaKey, setCaptchaKey] = useState<string>('');
  const [captchaQuestion, setCaptchaQuestion] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState<boolean>(false);

  // Status & validation state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchCaptcha = async () => {
    setIsLoadingCaptcha(true);
    setCaptchaAnswer('');
    try {
      const res = await api.getCaptcha();
      setCaptchaKey(res.key);
      setCaptchaQuestion(res.question);
    } catch (err) {
      console.warn('Could not load captcha challenge from backend:', err);
      setCaptchaQuestion('7 + 5 = ?');
      setCaptchaKey('fallback');
    } finally {
      setIsLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCaptcha();
      setErrorMessage(null);
      setIsSuccess(false);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('Please upload a valid .zip archive containing your 3DM or STL samples.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 80 * 1024 * 1024) {
      setErrorMessage('ZIP file exceeds the 80 MB limit. Please compress or link via portfolio URL.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrorMessage(null);
    setWorkZip(file);
  };

  const handleRemoveFile = () => {
    setWorkZip(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic Validation
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please enter both your first and last name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid email address for receiving login credentials.');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Please provide a contact phone number.');
      return;
    }
    if (!address.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      setErrorMessage('Please complete all address and location fields (Street, City, State, PIN).');
      return;
    }
    if (!experience.trim()) {
      setErrorMessage('Please provide details on your CAD experience and software proficiency.');
      return;
    }
    if (!captchaAnswer.trim()) {
      setErrorMessage('Please solve the math verification challenge.');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('first_name', firstName.trim());
      formData.append('last_name', lastName.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('phone_number', phoneNumber.trim());
      formData.append('address', address.trim());
      formData.append('city', city.trim());
      formData.append('state', state.trim());
      formData.append('country', country.trim());
      formData.append('pincode', pincode.trim());
      formData.append('experience', experience.trim());
      if (portfolioLink.trim()) {
        formData.append('portfolio_link', portfolioLink.trim());
      }
      if (workZip) {
        formData.append('work_zip', workZip);
      }
      formData.append('captcha_key', captchaKey);
      formData.append('captcha_answer', captchaAnswer.trim());

      await api.applyAsDesigner(formData);
      setIsLoading(false);
      setIsSuccess(true);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Failed to submit CAD Designer application. Please review your details.');
      fetchCaptcha(); // Refresh captcha on failure
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-[#080E24] border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-[#F5F1E8] my-auto max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-[#C9C2A6] hover:text-[#FAF8F3] hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] uppercase tracking-[0.25em] text-[#F5E7A3]">
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  <span>CAD Designer Self-Registration</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#FAF8F3] tracking-wide">
                  Join the Shiuli Atelier
                </h2>
                <p className="text-xs text-[#C9C2A6] max-w-lg mx-auto font-light leading-relaxed">
                  Apply as an elite Jewellery CAD Modeler. Once approved by administration, your auto-generated credentials will be emailed to your inbox.
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3.5 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Application Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. First & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FloatingLabelInput
                    label="First Name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    icon={<User className="w-4 h-4" />}
                    required
                  />
                  <FloatingLabelInput
                    label="Last Name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    icon={<User className="w-4 h-4" />}
                    required
                  />
                </div>

                {/* 2. Email & Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FloatingLabelInput
                    label="Email Address (Login ID)"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail className="w-4 h-4" />}
                    required
                  />
                  <FloatingLabelInput
                    label="Phone / WhatsApp"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    icon={<Phone className="w-4 h-4" />}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>

                {/* 3. Street Address */}
                <FloatingLabelInput
                  label="Studio / Street Address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  icon={<MapPin className="w-4 h-4" />}
                  required
                />

                {/* 4. City, State, Country, PIN */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <FloatingLabelInput
                    label="City"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    icon={<Building className="w-3.5 h-3.5" />}
                    required
                  />
                  <FloatingLabelInput
                    label="State"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  />
                  <FloatingLabelInput
                    label="Country"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                  />
                  <FloatingLabelInput
                    label="PIN / Zip"
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    required
                  />
                </div>

                {/* 5. Experience & Software Background */}
                <div className="space-y-1">
                  <label className="text-xs text-[#C9C2A6] font-medium block">
                    Experience &amp; CAD Software Background <span className="text-amber-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 5+ years specializing in MatrixGold & Rhino. Diamond pavé, bridal rings, watertight STL generation..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#060B1E] border border-white/10 text-xs text-[#FAF8F3] placeholder:text-[#C9C2A6]/40 focus:outline-none focus:border-[#D4AF37]/60 resize-none transition-colors"
                    required
                  />
                </div>

                {/* 6. Portfolio URL */}
                <FloatingLabelInput
                  label="Portfolio Link (Behance, Artstation, Drive, Website)"
                  type="url"
                  value={portfolioLink}
                  onChange={(e) => setPortfolioLink(e.target.value)}
                  icon={<Globe className="w-4 h-4" />}
                  placeholder="https://..."
                />

                {/* 7. Upload ZIP of Past Work */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#C9C2A6] font-medium block">
                    Upload Past Work Samples (.ZIP Archive)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="hidden"
                    id="designer-zip-upload"
                  />
                  {!workZip ? (
                    <label
                      htmlFor="designer-zip-upload"
                      className="border-2 border-dashed border-[#D4AF37]/30 hover:border-[#D4AF37]/70 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-[#060B1E]/60 transition-colors group"
                    >
                      <UploadCloud className="w-6 h-6 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                      <span className="text-xs text-[#F5E7A3] font-medium">Click to upload 3D sample files (.zip)</span>
                      <span className="text-[10px] text-[#C9C2A6]/60">Rhino 3DM, STL renders, or past portfolio designs (Max 80MB)</span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-[#D4AF37]/40">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileArchive className="w-5 h-5 text-[#D4AF37] shrink-0" />
                        <div className="truncate">
                          <p className="text-xs text-[#FAF8F3] font-medium truncate">{workZip.name}</p>
                          <p className="text-[10px] text-[#C9C2A6]/60">{(workZip.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* 8. Captcha Verification */}
                <div className="p-3.5 rounded-xl bg-[#060B1E] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#C9C2A6] font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                      <span>Human Verification Captcha</span>
                    </span>
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      disabled={isLoadingCaptcha}
                      className="text-[11px] text-[#D4AF37] hover:text-[#F5E7A3] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Reload new captcha question"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingCaptcha ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3.5 py-2 rounded-xl bg-black/60 border border-[#D4AF37]/30 font-mono text-sm font-bold text-[#F5E7A3] tracking-widest select-none">
                      {isLoadingCaptcha ? '...' : captchaQuestion || 'What is 9 + 4?'}
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        placeholder="Enter answer"
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080E24] border border-white/15 text-xs text-[#FAF8F3] focus:outline-none focus:border-[#D4AF37]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-gold-luxury w-full py-4 rounded-xl font-medium tracking-[0.15em] uppercase text-xs flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 transition-transform active:scale-[0.99] cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit CAD Designer Application</span>
                      <ArrowRight className="w-4 h-4 text-[#0B1330]" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success confirmation screen */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-5"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F5E7A3] flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.4)] text-[#0B1330]">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-3xl text-[#FAF8F3]">
                  Application Submitted
                </h3>
                <p className="text-xs text-[#C9C2A6] max-w-md mx-auto leading-relaxed">
                  Thank you, <strong className="text-[#FAF8F3]">{firstName} {lastName}</strong>. Your CAD Designer application and portfolio have been routed to the Shiuli Atelier Administration.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#060B1E] border border-[#D4AF37]/30 text-left space-y-2 max-w-md mx-auto text-xs text-[#C9C2A6] leading-relaxed">
                <div className="flex items-center gap-2 font-semibold text-[#F5E7A3]">
                  <Mail className="w-4 h-4 text-[#D4AF37]" />
                  <span>Next Step: Email Delivery of Login Credentials</span>
                </div>
                <p className="text-[11px] text-[#C9C2A6]/80">
                  As soon as our admin approves your application, an automated welcome email with your <strong>Login Email ({email})</strong> and <strong>Auto-Generated Password</strong> will be dispatched to your inbox.
                </p>
                <p className="text-[11px] text-[#C9C2A6]/80">
                  You will then be able to log in to the Staff Workbench and change your password anytime via email OTP verification.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="btn-gold-luxury px-8 py-3 rounded-xl font-semibold uppercase text-xs cursor-pointer shadow-lg inline-block"
              >
                Close &amp; Return
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
