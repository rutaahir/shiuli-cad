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
  Copy
} from 'lucide-react';

export const AdminSettingsModule: React.FC = () => {
  // Dynamic Payment Gateway Preferences State
  const [studioUpiId, setStudioUpiId] = useState('shiulicad@okhdfcbank');
  const [studioQrCodeUrl, setStudioQrCodeUrl] = useState('');
  const [cashCheckInstructions, setCashCheckInstructions] = useState(
    'For Cash or Cheque, please enter your transaction details and attach deposit receipt or cheque photo. Atelier accounts will confirm collection and enable your download.'
  );

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
