import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  QrCode, 
  Smartphone, 
  UploadCloud, 
  Banknote, 
  Check, 
  Loader2, 
  Lock, 
  KeyRound, 
  ShieldAlert, 
  X,
  CreditCard,
  Copy,
  Mail,
  Send,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  Clock
} from 'lucide-react';

export const AdminSettingsModule: React.FC = () => {
  // Dynamic Payment Gateway Preferences State
  const [studioUpiId, setStudioUpiId] = useState('shiulicad@okhdfcbank');
  const [studioQrCodeUrl, setStudioQrCodeUrl] = useState('');
  const [cashCheckInstructions, setCashCheckInstructions] = useState(
    'For Cash or Cheque, please enter your transaction details and attach deposit receipt or cheque photo. Atelier accounts will confirm collection and enable your download.'
  );

  // Dynamic Email Configuration State
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [maskedSmtpEmail, setMaskedSmtpEmail] = useState('');
  const [smtpUpdatedByName, setSmtpUpdatedByName] = useState<string | null>(null);
  const [smtpUpdatedAt, setSmtpUpdatedAt] = useState<string | null>(null);

  const [smtpEmailInput, setSmtpEmailInput] = useState('');
  const [smtpPasswordInput, setSmtpPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [testRecipientInput, setTestRecipientInput] = useState('');

  const [testingEmail, setTestingEmail] = useState(false);
  const [testPassed, setTestPassed] = useState<boolean | null>(null);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailToast, setEmailToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Quick Admin Re-Auth State (if token expires while editing)
  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [reAuthUsername, setReAuthUsername] = useState('admin@shiuli.com');
  const [reAuthPassword, setReAuthPassword] = useState('admin123');
  const [reAuthenticating, setReAuthenticating] = useState(false);

  // Load existing settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const plat = await api.getPlatformSettings().catch(() => null);
      if (plat) {
        if (plat.studio_upi_id) setStudioUpiId(plat.studio_upi_id);
        if (plat.studio_qr_code_url) setStudioQrCodeUrl(plat.studio_qr_code_url);
        if (plat.cash_check_instructions) setCashCheckInstructions(plat.cash_check_instructions);
        
        // Email configuration data
        setEmailConfigured(Boolean(plat.email_configured));
        setMaskedSmtpEmail(plat.masked_smtp_email || '');
        setSmtpUpdatedByName(plat.smtp_updated_by_name || null);
        setSmtpUpdatedAt(plat.smtp_updated_at || null);
      } else {
        const localUpi = localStorage.getItem('shiuli_studio_upi_id');
        const localQr = localStorage.getItem('shiuli_studio_qr_code_url');
        if (localUpi) setStudioUpiId(localUpi);
        if (localQr) setStudioQrCodeUrl(localQr);
      }
    } catch (err) {
      console.warn('Failed to fetch platform settings:', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setToastMessage(null);
    try {
      await api.updatePlatformSettings({
        studio_upi_id: studioUpiId,
        studio_qr_code_url: studioQrCodeUrl,
        cash_check_instructions: cashCheckInstructions,
      });
      localStorage.setItem('shiuli_studio_upi_id', studioUpiId);
      if (studioQrCodeUrl) {
        localStorage.setItem('shiuli_studio_qr_code_url', studioQrCodeUrl);
      } else {
        localStorage.removeItem('shiuli_studio_qr_code_url');
      }
      setToastMessage('Payment Gateway & Dynamic QR settings saved successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      if (
        err?.status === 401 ||
        err?.isAuthExpired ||
        err?.message?.toLowerCase().includes('token') ||
        err?.message?.toLowerCase().includes('session') ||
        err?.message?.toLowerCase().includes('expired')
      ) {
        setShowReAuthModal(true);
        setAuthError('Your admin session has expired. Sign in to save settings instantly without losing your inputs.');
      } else {
        alert(err?.message || 'Failed to save payment gateway settings');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleQuickReAuthAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setReAuthenticating(true);
    setAuthError(null);
    try {
      await api.login(reAuthUsername, reAuthPassword);
      setShowReAuthModal(false);
      // Immediately retry saving settings with fresh token
      await handleSave();
    } catch (loginErr: any) {
      setAuthError(loginErr?.message || 'Invalid credentials. Please verify your email & password.');
    } finally {
      setReAuthenticating(false);
    }
  };

  const handleCopyUpiPreview = () => {
    if (studioUpiId) {
      navigator.clipboard?.writeText(studioUpiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleTestEmail = async () => {
    if (!smtpEmailInput && !emailConfigured) {
      setTestFeedback('Please enter a sender Gmail address to test.');
      setTestPassed(false);
      return;
    }
    if (!smtpPasswordInput && !emailConfigured) {
      setTestFeedback('Please enter your 16-character Google App Password to test.');
      setTestPassed(false);
      return;
    }

    setTestingEmail(true);
    setTestFeedback(null);
    setTestPassed(null);
    setEmailToast(null);

    try {
      const res = await api.testSmtpEmail({
        smtp_email: smtpEmailInput || undefined,
        smtp_app_password: smtpPasswordInput || undefined,
        recipient: testRecipientInput || undefined,
      });

      if (res?.success) {
        setTestPassed(true);
        setTestFeedback(res.detail || 'Test email verified and delivered successfully!');
      } else {
        setTestPassed(false);
        setTestFeedback(res?.detail || 'SMTP test failed. Please check credentials.');
      }
    } catch (err: any) {
      setTestPassed(false);
      setTestFeedback(err?.message || 'SMTP test failed. Please check credentials and 2-step verification.');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!testPassed) {
      setEmailToast({
        type: 'error',
        message: 'Please send and verify a test email successfully before saving credentials.',
      });
      return;
    }

    setSavingEmail(true);
    setEmailToast(null);

    try {
      const res = await api.updatePlatformSettings({
        smtp_email: smtpEmailInput,
        smtp_app_password: smtpPasswordInput,
      });

      setEmailConfigured(Boolean(res.email_configured));
      setMaskedSmtpEmail(res.masked_smtp_email || '');
      setSmtpUpdatedByName(res.smtp_updated_by_name || 'Super Admin');
      setSmtpUpdatedAt(res.smtp_updated_at || new Date().toISOString());

      // Wipe sensitive app password from browser memory
      setSmtpPasswordInput('');
      setSmtpEmailInput('');
      setTestPassed(null);
      setTestFeedback(null);

      setEmailToast({
        type: 'success',
        message: 'Email credentials encrypted with Fernet and updated successfully! Live emails will now use these credentials.',
      });
      setTimeout(() => setEmailToast(null), 6000);
    } catch (err: any) {
      setEmailToast({
        type: 'error',
        message: err?.message || 'Failed to save email settings.',
      });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleClearEmailSettings = async () => {
    if (!window.confirm('Revert email credentials to system default (.env)? Outgoing email will fall back to environment settings.')) {
      return;
    }

    setSavingEmail(true);
    try {
      const res = await api.updatePlatformSettings({
        smtp_email: '',
        smtp_app_password: '',
      });

      setEmailConfigured(false);
      setMaskedSmtpEmail('');
      setSmtpUpdatedByName(res.smtp_updated_by_name || 'Super Admin');
      setSmtpUpdatedAt(res.smtp_updated_at || new Date().toISOString());
      setTestPassed(null);
      setTestFeedback(null);
      setEmailToast({
        type: 'success',
        message: 'Custom credentials cleared. Outgoing emails successfully reverted to .env defaults.',
      });
      setTimeout(() => setEmailToast(null), 6000);
    } catch (err: any) {
      setEmailToast({
        type: 'error',
        message: err?.message || 'Failed to reset email credentials.',
      });
    } finally {
      setSavingEmail(false);
    }
  };


  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
              <CreditCard className="w-5 h-5 text-[#2856C7]" />
            </span>
            <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
              Studio Payment Gateway Settings
            </h1>
          </div>
          <p className="text-xs text-[#6B7280]">
            Configure the dynamic customer payment options (UPI / QR Code &amp; CASH / Check) shown in checkout.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <Loader2 className="w-4 h-4 animate-spin text-[#2856C7]" />
            <span>Loading active settings...</span>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-semibold shadow-sm animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EF] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E5E7EF]">
          <QrCode className="w-5 h-5 text-[#2856C7]" />
          <div>
            <h3 className="font-bold text-base text-[#1E2230]">
              Dynamic Client Payment Gateway (UPI / QR &amp; Cash / Check)
            </h3>
            <p className="text-xs text-[#6B7280]">
              Manage the live QR Code, Studio UPI ID, and Cash/Cheque instructions displayed to customers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Studio Primary UPI ID */}
          <div className="space-y-2">
            <label className="font-semibold text-[#1E2230] text-xs block">
              Studio Primary UPI VPA ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={studioUpiId}
                onChange={(e) => setStudioUpiId(e.target.value)}
                placeholder="e.g. shiulicad@okhdfcbank"
                className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] font-mono text-xs text-[#1E2230] focus:border-[#2856C7] focus:bg-white outline-none transition-all"
              />
              <button
                type="button"
                onClick={handleCopyUpiPreview}
                title="Test 1-Click Copy"
                className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-white border border-[#E5E7EF] text-[11px] text-[#2856C7] font-semibold flex items-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Test Copy</span>
                  </>
                )}
              </button>
            </div>
            <span className="text-[11px] text-[#6B7280] block font-mono">
              Displayed on client checkout modal with 1-click copy button.
            </span>
          </div>

          {/* Upload Dynamic QR Code Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#1E2230] text-xs block">
                Studio UPI QR Code Image
              </label>
              {studioQrCodeUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setStudioQrCodeUrl('');
                    localStorage.removeItem('shiuli_studio_qr_code_url');
                  }}
                  className="text-[11px] text-rose-600 hover:underline cursor-pointer font-medium"
                >
                  Reset to Vector QR
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {studioQrCodeUrl ? (
                <div className="w-16 h-16 rounded-xl border border-[#E5E7EF] bg-white p-1 shrink-0 overflow-hidden shadow-sm flex items-center justify-center">
                  <img
                    src={studioQrCodeUrl}
                    alt="Custom QR Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center shrink-0">
                  <QrCode className="w-8 h-8 text-slate-400" />
                </div>
              )}

              <div className="flex-1">
                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] hover:border-[#2856C7] hover:bg-white text-xs font-semibold text-[#1E2230] flex items-center justify-center gap-2 transition-all">
                  <UploadCloud className="w-4 h-4 text-[#2856C7]" />
                  <span>{studioQrCodeUrl ? 'Change QR Image' : 'Upload Studio QR Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64Str = reader.result as string;
                          setStudioQrCodeUrl(base64Str);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <span className="text-[10px] text-[#6B7280] block mt-1">
                  Upload screenshot from Google Pay, PhonePe, Paytm, or your bank UPI app.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Advisory for CASH & Cheque Option */}
        <div className="space-y-2 pt-2 border-t border-[#E5E7EF]">
          <label className="font-semibold text-[#1E2230] text-xs flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-[#2856C7]" />
            <span>Customer Advisory for CASH &amp; Cheque Option</span>
          </label>
          <textarea
            rows={3}
            value={cashCheckInstructions}
            onChange={(e) => setCashCheckInstructions(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs text-[#1E2230] focus:border-[#2856C7] focus:bg-white outline-none resize-none leading-relaxed transition-all"
            placeholder="Write bank account details, cheque payee name, and cash deposit instructions for customers..."
          />
          <span className="text-[11px] text-[#6B7280] block">
            Displayed inside the client checkout modal when customer selects the CASH / Check option with text input &amp; slip uploader.
          </span>
        </div>

        {/* Save Button */}
        <div className="pt-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-gold-luxury px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-[#0B1330]" />
                <span>Save Payment Gateway Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Email Configuration Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EF] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E7EF] gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#2856C7] border border-blue-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#1E2230]">
                  Transactional Email Configuration (Google SMTP)
                </h3>
              </div>
              <p className="text-xs text-[#6B7280]">
                Configure the outgoing Gmail address and Google App Password for OTPs, downloads, and customer alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {emailConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Active: {maskedSmtpEmail}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                <span>System Default (.env)</span>
              </span>
            )}
          </div>
        </div>

        {/* Informative Callout */}
        <div className="p-3.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs text-[#4B5563] flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-[#2856C7] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#1E2230] block">
              Multi-Process Encryption &amp; In-Memory Caching
            </span>
            <p className="leading-relaxed">
              Google App Passwords are encrypted at rest with Fernet symmetric cryptography and are never returned across any API endpoint. Live emails instantly adapt to saved credentials without requiring a server reboot.
            </p>
          </div>
        </div>

        {emailToast && (
          <div className={`p-4 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-sm animate-in fade-in duration-200 ${
            emailToast.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {emailToast.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{emailToast.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SMTP Sender Gmail Address */}
          <div className="space-y-2">
            <label className="font-semibold text-[#1E2230] text-xs block">
              Sender Gmail Address
            </label>
            <input
              type="email"
              value={smtpEmailInput}
              onChange={(e) => {
                setSmtpEmailInput(e.target.value);
                setTestPassed(null);
              }}
              placeholder={maskedSmtpEmail ? `Current: ${maskedSmtpEmail}` : "e.g. socialbuzz31@gmail.com"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] font-mono text-xs text-[#1E2230] focus:border-[#2856C7] focus:bg-white outline-none transition-all"
            />
            <span className="text-[11px] text-[#6B7280] block">
              Outgoing transactional emails will display this address as the verified sender.
            </span>
          </div>

          {/* 16-Character Google App Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#1E2230] text-xs block">
                16-Character Google App Password
              </label>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#2856C7] hover:underline font-medium"
              >
                Generate App Password &rarr;
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={smtpPasswordInput}
                onChange={(e) => {
                  setSmtpPasswordInput(e.target.value);
                  setTestPassed(null);
                }}
                placeholder={emailConfigured ? "•••• •••• •••• •••• (configured)" : "e.g. abcd efgh ijkl mnop"}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] font-mono text-xs text-[#1E2230] focus:border-[#2856C7] focus:bg-white outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-[#6B7280] block">
              Requires 2-Step Verification enabled on Google. Never write your personal password.
            </span>
          </div>
        </div>

        {/* Send Test Email Controls */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-[#1E2230] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#2856C7]" />
                <span>Pre-Flight SMTP Verification</span>
              </h4>
              <p className="text-[11px] text-[#6B7280]">
                Sends a live test email through Google SMTP to guarantee delivery before credentials can be saved.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="email"
                value={testRecipientInput}
                onChange={(e) => setTestRecipientInput(e.target.value)}
                placeholder="Custom test recipient (optional)"
                className="px-3 py-1.5 text-xs rounded-lg bg-white border border-[#E5E7EF] font-mono outline-none w-56 hidden sm:block"
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="px-4 py-2 rounded-xl bg-[#1E2230] text-[#FAF8F3] hover:bg-[#2856C7] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {testingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying SMTP...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Test Feedback Result */}
          {testFeedback && (
            <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              testPassed 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {testPassed ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-bold">{testPassed ? 'Verification Succeeded: ' : 'Verification Failed: '}</span>
                <span>{testFeedback}</span>
                {testPassed && (
                  <span className="block mt-0.5 font-medium text-emerald-700">
                    Pre-flight check passed. You may now click "Save Email Credentials" below to commit these settings.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save & Reset Actions Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#E5E7EF]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveEmailSettings}
              disabled={savingEmail || !testPassed}
              title={!testPassed ? "Send and pass a test email before saving" : "Save verified credentials"}
              className="btn-gold-luxury px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                  <span>Encrypting &amp; Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#0B1330]" />
                  <span>Save Email Credentials</span>
                </>
              )}
            </button>

            {!testPassed && (
              <span className="text-[11px] text-[#6B7280] italic">
                * Test verification required before save
              </span>
            )}
          </div>

          {emailConfigured && (
            <button
              type="button"
              onClick={handleClearEmailSettings}
              disabled={savingEmail}
              className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Revert to System Default (.env)</span>
            </button>
          )}
        </div>

        {/* Audit Trail Log */}
        {(smtpUpdatedAt || smtpUpdatedByName) && (
          <div className="pt-2 text-[11px] text-[#6B7280] flex items-center gap-1.5 font-mono border-t border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Last modified {smtpUpdatedByName ? `by ${smtpUpdatedByName}` : ''} {smtpUpdatedAt ? `on ${new Date(smtpUpdatedAt).toLocaleString()}` : ''}
            </span>
          </div>
        )}
      </div>


      {/* QUICK ADMIN RE-AUTHENTICATION MODAL */}
      {showReAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#09112B] border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-[#FAF8F3] space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#FAF8F3]">Admin Authorization</h3>
                  <p className="text-xs text-[#C9C2A6]">Session expired — quick re-auth to save</p>
                </div>
              </div>
              <button
                onClick={() => setShowReAuthModal(false)}
                className="text-[#C9C2A6] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <p className="text-xs text-[#C9C2A6] leading-relaxed">
              Your entered settings are preserved! Sign in below to securely persist them to the database.
            </p>

            <form onSubmit={handleQuickReAuthAndSave} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider block mb-1">
                  Admin Email / Username
                </label>
                <input
                  type="text"
                  value={reAuthUsername}
                  onChange={(e) => setReAuthUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D22] border border-white/15 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none"
                  placeholder="admin@shiuli.com"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={reAuthPassword}
                  onChange={(e) => setReAuthPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D22] border border-white/15 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setReAuthUsername('admin@shiuli.com'); setReAuthPassword('admin123'); }}
                  className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  admin@shiuli.com
                </button>
                <button
                  type="button"
                  onClick={() => { setReAuthUsername('shahharshil313@gmail.com'); setReAuthPassword('admin123'); }}
                  className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] hover:bg-emerald-500/20 flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  shahharshil313@gmail.com
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReAuthModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs text-[#C9C2A6] hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reAuthenticating}
                  className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {reAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                      <span>Authenticating &amp; Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#0B1330]" />
                      <span>Authenticate &amp; Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
