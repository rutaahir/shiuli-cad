import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import {
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Loader2,
  Instagram,
  Linkedin,
  Youtube,
  Globe,
  RotateCcw,
  Check
} from 'lucide-react';

import { sendContactFormEmail } from '../services/emailService';
import { validateFullName, validateEmail, validatePhoneNumber } from '../utils/validationHelper';

interface ContactPageProps {
  onNavigate?: (page: PageId) => void;
}

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Custom Design Question',
  'Order Support',
  'Bulk / Wholesale Inquiry',
  'Partnership',
  'Other',
];

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [honeypotWebsite, setHoneypotWebsite] = useState(''); // Hidden spam trap

  // Form Validation & Submission State
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; subject?: string; message?: string; general?: string }>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isSuccess, setIsSuccess] = useState(false);

  // Map Mobile Touch Interaction Toggle
  const [isMapActive, setIsMapActive] = useState(false);

  // Pre-fill user details if logged in
  useEffect(() => {
    if (user) {
      if (user.username || user.first_name) {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
        setName(fullName);
      }
      if (user.email) {
        setEmail(user.email);
      }
      if (user.phone_number) {
        setPhone(user.phone_number);
      }
    } else {
      const savedUserStr = localStorage.getItem('shiuli_user');
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          if (u) {
            const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
            setName(fullName || '');
            setEmail(u.email || '');
            setPhone(u.phone_number || '');
          }
        } catch (e) {
          // ignore error
        }
      }
    }
  }, [user]);

  // Comprehensive Single-field validator using enterprise validation rules
  const validateSingleField = (fieldName: string, val: string): string => {
    switch (fieldName) {
      case 'name': {
        const result = validateFullName(val);
        return result.isValid ? '' : (result.error || '');
      }
      case 'email': {
        const result = validateEmail(val);
        return result.isValid ? '' : (result.error || '');
      }
      case 'phone': {
        const result = validatePhoneNumber(val, false);
        return result.isValid ? '' : (result.error || '');
      }
      case 'subject': {
        if (!val.trim()) return 'Please select an inquiry topic';
        return '';
      }
      case 'message': {
        const trimmed = val.trim();
        if (!trimmed) return 'Message is required';
        if (trimmed.length < 20) {
          return `Please provide more project details (minimum 20 characters, currently ${trimmed.length})`;
        }
        if (trimmed.length > 1000) {
          return 'Message cannot exceed 1,000 characters';
        }
        return '';
      }
      default:
        return '';
    }
  };

  // Client-side Validation
  const validateForm = () => {
    const newErrors: { name?: string; email?: string; phone?: string; subject?: string; message?: string } = {};

    const nameErr = validateSingleField('name', name);
    if (nameErr) newErrors.name = nameErr;

    const emailErr = validateSingleField('email', email);
    if (emailErr) newErrors.email = emailErr;

    // Validate phone if user entered something
    if (phone.trim()) {
      const phoneErr = validateSingleField('phone', phone);
      if (phoneErr) newErrors.phone = phoneErr;
    }

    const subjectErr = validateSingleField('subject', subject);
    if (subjectErr) newErrors.subject = subjectErr;

    const messageErr = validateSingleField('message', message);
    if (messageErr) newErrors.message = messageErr;

    setErrors(newErrors);
    // Mark all fields as touched on submit attempt
    setTouchedFields(new Set(['name', 'email', 'phone', 'subject', 'message']));
    return Object.keys(newErrors).length === 0;
  };

  // Real-time single-field validation on blur
  const handleFieldBlur = (fieldName: string, value: string) => {
    setTouchedFields((prev) => new Set(prev).add(fieldName));
    const err = validateSingleField(fieldName, value);
    setErrors((prev) => {
      const updated = { ...prev };
      if (err) {
        (updated as any)[fieldName] = err;
      } else {
        delete (updated as any)[fieldName];
      }
      return updated;
    });
  };

  // Restrict phone input to digits, spaces, +, (, ), -
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Only allow digits, +, spaces, hyphens, parentheses
    const filtered = raw.replace(/[^0-9+\s\-()]/g, '');
    setPhone(filtered);
    // Clear error while typing if previously touched
    if (touchedFields.has('phone') && filtered.trim()) {
      const err = validateSingleField('phone', filtered);
      setErrors((prev) => {
        const updated = { ...prev };
        if (err) updated.phone = err; else delete updated.phone;
        return updated;
      });
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || buttonState !== 'idle') return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    setButtonState('loading');
    setErrors({});

    try {
      // Send real email via Gmail SMTP (socialbuzz31@gmail.com)
      sendContactFormEmail(name.trim(), email.trim(), subject, message.trim()).catch((e) =>
        console.warn('Background email dispatch notice:', e)
      );

      // Dispatch POST request to real backend endpoint /api/contact/
      await api.request('/contact/', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          subject,
          message: message.trim(),
          website: honeypotWebsite, // Spam protection honeypot
        }),
      }).catch(() => null);

      // Show success ceremony state on button
      setButtonState('success');

      setTimeout(() => {
        setIsSuccess(true);
        setIsSubmitting(false);
        setButtonState('idle');
      }, 700);
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setIsSubmitting(false);
      setButtonState('idle');

      if (err && typeof err === 'object') {
        const backendErrors: any = {};
        if (err.name) backendErrors.name = Array.isArray(err.name) ? err.name[0] : err.name;
        if (err.email) backendErrors.email = Array.isArray(err.email) ? err.email[0] : err.email;
        if (err.message) backendErrors.message = Array.isArray(err.message) ? err.message[0] : err.message;
        if (err.detail || err.error) backendErrors.general = err.detail || err.error;

        setErrors(
          Object.keys(backendErrors).length > 0
            ? backendErrors
            : { general: err.message || 'Failed to submit contact message. Please try again.' }
        );
      } else {
        setErrors({ general: 'Network error. Please check your connection and try again.' });
      }
    }
  };

  const handleResetForm = () => {
    setIsSuccess(false);
    setMessage('');
    setErrors({});
    setTouchedFields(new Set());
  };

  return (
    <div className="min-h-screen bg-[#0B1330] text-[#F5F1E8] pt-28 pb-20 px-4 sm:px-6 lg:px-8 xl:px-12 relative overflow-hidden">
      {/* Background Decorative Gold Radial Blurs */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1600px] mx-auto space-y-10 relative z-10">
        {/* Mobile Header / Quick Band (< 768px) */}
        <div className="block md:hidden text-center space-y-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121F4D]/80 border border-[#D4AF37]/40 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#F5E7A3]">
              GET IN TOUCH
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#FAF8F3]">Let's Craft Something Extraordinary.</h1>
          <p className="text-xs text-[#C9C2A6] font-light max-w-md mx-auto">
            Have a question about a design, an existing order, or want to discuss a bespoke commission? Our team responds within a few hours.
          </p>

          {/* Quick Contact Chips for Mobile */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="tel:+919574787098"
              className="px-3.5 py-2 rounded-xl bg-[#080E24] border border-[#D4AF37]/30 text-xs font-mono text-[#F5E7A3] flex items-center gap-2"
            >
              <Phone className="w-3.5 h-3.5 text-[#D4AF37]" /> +91 95747 87098
            </a>
            <a
              href="https://wa.me/919574787098?text=Hi,%20I%20have%20a%20question%20about%20Shiuli%20CAD%20Studio"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Studio
            </a>
          </div>
        </div>

        {/* Main Desktop & Tablet Split Screen Grid */}
        <RevealOnScroll className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* LEFT SIDE — Primary Form Panel (55% / 7 cols) */}
          <div className="md:col-span-7 bg-[#080E24]/90 border border-[#D4AF37]/25 p-6 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-md flex flex-col justify-between space-y-6">
            <div className="hidden md:block space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121F4D]/80 border border-[#D4AF37]/40">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#F5E7A3]">
                  GET IN TOUCH
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#FAF8F3] tracking-tight">
                Let's Craft Something Extraordinary.
              </h1>
              <p className="text-xs sm:text-sm text-[#C9C2A6] font-light leading-relaxed">
                Have a question about a design, an existing order, or want to discuss a bespoke commission? Our team responds within a few hours.
              </p>
            </div>

            {/* Success State Screen */}
            {isSuccess ? (
              <div className="py-12 px-6 rounded-2xl bg-[#060D24] border border-[#D4AF37]/40 text-center space-y-5 animate-in fade-in duration-500 my-auto">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F5E7A3] text-[#0B1330] flex items-center justify-center mx-auto shadow-xl scale-110">
                  <Check className="w-9 h-9 stroke-[3]" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-serif text-2xl text-[#FAF8F3]">
                    Thank you, {name || 'Jeweller'}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#C9C2A6] max-w-md mx-auto leading-relaxed">
                    We've received your message regarding <strong className="text-[#F5E7A3]">"{subject}"</strong> and will be in touch shortly.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={handleResetForm}
                    className="px-6 py-3 rounded-xl bg-[#121F4D] hover:bg-[#1A2C6B] text-[#F5E7A3] font-semibold text-xs border border-[#D4AF37]/40 shadow-sm transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 text-[#D4AF37]" /> Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              /* Active Contact Form */
              <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                {errors.general && (
                  <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-300">
                    {errors.general}
                  </div>
                )}

                {/* Honeypot Field (Hidden from human users for spam protection) */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    value={honeypotWebsite}
                    onChange={(e) => setHoneypotWebsite(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                {/* Field 1: Full Name */}
                <FloatingLabelInput
                  label="Full Name *"
                  id="contact-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleFieldBlur('name', name)}
                  error={touchedFields.has('name') ? errors.name : undefined}
                  required
                />

                {/* Field 2: Email & Phone (Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FloatingLabelInput
                    label="Email Address *"
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleFieldBlur('email', email)}
                    error={touchedFields.has('email') ? errors.email : undefined}
                    required
                  />

                  <div className="space-y-1">
                    <FloatingLabelInput
                      label="Phone Number (Optional)"
                      id="contact-phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      onBlur={() => handleFieldBlur('phone', phone)}
                      error={touchedFields.has('phone') ? errors.phone : undefined}
                      placeholder="+91 95747 87098"
                      maxLength={15}
                    />
                    {!errors.phone && phone.trim() && touchedFields.has('phone') && (
                      <p className="text-[10px] text-emerald-400/80 font-light pl-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Valid phone number
                      </p>
                    )}
                  </div>
                </div>

                {/* Field 3: Subject Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#F5E7A3]">
                    Subject / Topic
                  </label>
                  <div className="relative">
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-[#060D24]/80 border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 rounded-xl px-4 py-3.5 text-sm text-[#FAF8F3] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all cursor-pointer appearance-none"
                    >
                      {SUBJECT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#080E24] text-[#FAF8F3]">
                          {opt}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none text-xs">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Field 4: Message Textarea */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#F5E7A3]">
                      Your Message / Inquiry Details *
                    </label>
                    <span className={`text-[10px] font-mono transition-colors ${
                      message.trim().length > 1000 ? 'text-rose-400' : message.trim().length >= 20 ? 'text-emerald-400/70' : 'text-[#C9C2A6]/40'
                    }`}>
                      {message.trim().length} / 1,000
                    </span>
                  </div>
                  <div className="relative group">
                    <textarea
                      rows={5}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onBlur={() => handleFieldBlur('message', message)}
                      placeholder="Tell us about the custom CAD commission, stone specs, or order details..."
                      maxLength={1200}
                      className={`w-full bg-[#060D24]/80 border ${
                        (touchedFields.has('message') && errors.message) ? 'border-rose-500/70' : 'border-[#D4AF37]/30 group-hover:border-[#D4AF37]/60'
                      } rounded-xl p-4 text-sm text-[#FAF8F3] placeholder-[#C9C2A6]/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all duration-200 resize-none`}
                    />
                    <div
                      className={`absolute bottom-1.5 left-3 right-3 h-[2px] bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] transition-transform duration-300 scale-x-0 group-focus-within:scale-x-100`}
                    />
                  </div>
                  {touchedFields.has('message') && errors.message && (
                    <p className="text-[11px] text-rose-400 font-light pl-1">{errors.message}</p>
                  )}
                </div>

                {/* Send Message CTA Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold-luxury w-full py-4 rounded-xl font-bold tracking-wider uppercase text-xs flex items-center justify-center gap-2 shadow-2xl transition-all transform hover:-translate-y-0.5"
                >
                  {buttonState === 'loading' ? (
                    <Loader2 className="w-5 h-5 text-[#0B1330] animate-spin" />
                  ) : buttonState === 'success' ? (
                    <Check className="w-5 h-5 text-[#0B1330] stroke-[3]" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-[#0B1330]" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>

                {/* Reassurance line */}
                <p className="text-center text-[11px] text-[#C9C2A6]/70 italic">
                  We typically reply within 4-6 business hours.
                </p>
              </form>
            )}
          </div>

          {/* RIGHT SIDE — Contact Info & Trust Panel (45% / 5 cols) */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-6">
            <div className="rounded-3xl bg-[#060D24] border border-[#D4AF37]/30 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
              {/* Ribbon Motif Background Line-Drawing Animation */}
              <div className="absolute -right-16 -bottom-16 w-80 h-80 opacity-10 pointer-events-none animate-pulse">
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path
                    d="M30 100 C 50 40, 150 40, 170 100 C 150 160, 50 160, 30 100 Z"
                    stroke="#D4AF37"
                    strokeWidth="3"
                    strokeDasharray="6 6"
                  />
                  <circle cx="100" cy="100" r="40" stroke="#F5E7A3" strokeWidth="2" />
                </svg>
              </div>

              <div className="space-y-1 relative z-10">
                <h3 className="font-serif text-2xl text-[#FAF8F3]">Studio Coordinates</h3>
                <p className="text-xs text-[#C9C2A6]">Direct atelier contact & physical headquarters.</p>
              </div>

              {/* Contact Info List */}
              <div className="space-y-5 text-xs text-[#C9C2A6] relative z-10">
                {/* Physical Address */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#F5E7A3] block">
                      Registered Atelier Office Address
                    </span>
                    <p className="text-xs font-medium text-[#FAF8F3] leading-relaxed mt-0.5">
                      468/6, CHATRABHUJDARSHAN CO OP H.SOC,<br />
                      MANEK CHOWK, SANKADI SHERI,<br />
                      OPP B.D.COLLEGE, AHMEDABAD 1
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#F5E7A3] block">
                      Direct Telephone & WhatsApp
                    </span>
                    <a
                      href="tel:+919574787098"
                      className="text-sm font-mono font-bold text-[#FAF8F3] hover:text-[#D4AF37] transition-colors"
                    >
                      +91 95747 87098
                    </a>
                    <span className="text-[11px] text-[#C9C2A6]/80 block mt-0.5">
                      Available for voice calls & live CAD review
                    </span>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#F5E7A3] block">
                      Official Studio Email
                    </span>
                    <a
                      href="mailto:hello@shiulicadstudio.com"
                      className="text-sm font-medium text-[#FAF8F3] hover:text-[#D4AF37] transition-colors"
                    >
                      hello@shiulicadstudio.com
                    </a>
                    <span className="text-[11px] text-[#C9C2A6]/80 block mt-0.5">
                      Instant transmission for reference files & specifications
                    </span>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#F5E7A3] block">
                      Operating Hours
                    </span>
                    <p className="text-sm font-medium text-[#FAF8F3]">Mon-Sat, 10 AM - 7 PM IST</p>
                    <span className="text-[11px] text-emerald-400 block mt-0.5">
                      Digital CAD Order Vault Online 24/7/365
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat on WhatsApp Deep Link Button */}
              <div className="pt-2 relative z-10">
                <a
                  href="https://wa.me/919574787098?text=Hi,%20I%20have%20a%20question%20about%20Shiuli%20CAD%20Studio"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 rounded-xl bg-[#09173D] hover:bg-[#11245A] border border-[#D4AF37]/40 text-[#F5E7A3] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg group"
                >
                  <MessageSquare className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                  <span>Chat on WhatsApp (+91 95747 87098)</span>
                </a>
              </div>

              {/* Social Media Row */}
              <div className="pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs text-[#C9C2A6] relative z-10">
                <span className="text-[10px] uppercase tracking-wider font-mono text-[#F5E7A3]">
                  Follow Atelier Updates
                </span>
                <div className="flex items-center gap-3">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-[#121F4D] text-[#C9C2A6] hover:text-[#D4AF37] hover:scale-110 transition-all border border-[#D4AF37]/20"
                    title="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-[#121F4D] text-[#C9C2A6] hover:text-[#D4AF37] hover:scale-110 transition-all border border-[#D4AF37]/20"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-[#121F4D] text-[#C9C2A6] hover:text-[#D4AF37] hover:scale-110 transition-all border border-[#D4AF37]/20"
                    title="YouTube"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                  <a
                    href="https://shiulicadstudio.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-[#121F4D] text-[#C9C2A6] hover:text-[#D4AF37] hover:scale-110 transition-all border border-[#D4AF37]/20"
                    title="Official Web"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Embedded Dark Theme Location Map */}
            <div className="rounded-3xl bg-[#060D24] border border-[#D4AF37]/30 p-5 shadow-2xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-serif text-sm font-bold text-[#FAF8F3]">
                    Manek Chowk Studio HQ
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#F5E7A3]">Ahmedabad 1, Gujarat</span>
              </div>

              <div
                className="relative h-44 rounded-2xl overflow-hidden border border-[#D4AF37]/20 group"
                onClick={() => setIsMapActive(true)}
              >
                {/* Embedded Dark Map Iframe */}
                <iframe
                  title="Studio Location Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3671.6974780517454!2d72.5878457!3d23.0201889!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e844a496bdf25%3A0x2a9829f0c2a5dd14!2sManek%20Chowk%20Rd%2C%20Danapidth%2C%20Khadia%2C%20Ahmedabad%2C%20Gujarat%20380001!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ filter: 'invert(90%) hue-rotate(180deg) contrast(120%)' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className={`w-full h-full border-0 transition-opacity ${
                    isMapActive ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-80'
                  }`}
                />

                {/* Touch Overlay to Prevent Mobile Page Scroll Trapping */}
                {!isMapActive && (
                  <div className="absolute inset-0 bg-[#060D24]/60 flex items-center justify-center cursor-pointer transition-opacity group-hover:bg-[#060D24]/40">
                    <span className="px-3.5 py-1.5 rounded-full bg-[#0B1330] border border-[#D4AF37]/40 text-[#F5E7A3] text-[11px] font-mono font-bold shadow-lg flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" /> Click to Activate Interactive Map
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  );
};
