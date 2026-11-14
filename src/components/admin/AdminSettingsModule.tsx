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
  Clock,
  Building2
} from 'lucide-react';

export const AdminSettingsModule: React.FC = () => {
  const isDummyBankNumber = (acc?: string | null) => {
    if (!acc) return true;
    return !acc.trim();
  };

  // Dynamic Payment Gateway Preferences State
  const [studioUpiId, setStudioUpiId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_studio_upi_id') || 'shiulicad@okhdfcbank' : 'shiulicad@okhdfcbank'));
  const [studioQrCodeUrl, setStudioQrCodeUrl] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_studio_qr_code_url') || '' : ''));
  const [cashCheckInstructions, setCashCheckInstructions] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_cash_check_instructions') || '' : ''));

  // Dynamic Official Bank & Treasury Account Details State
  const [bankBeneficiaryName, setBankBeneficiaryName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_bank_beneficiary_name') || '' : ''));
  const [bankName, setBankName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_bank_name') || '' : ''));
  const [bankAccountNumber, setBankAccountNumber] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_bank_account_number') || '' : ''));
  const [bankIfscCode, setBankIfscCode] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_bank_ifsc_code') || '' : ''));
  const [bankSwiftCode, setBankSwiftCode] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_bank_swift_code') || '' : ''));
  const [bankBranch, setBankBranch] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_bank_branch') || '' : ''));
  const [bankAccountType, setBankAccountType] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_bank_account_type') || '' : ''));
  const [bankNotes, setBankNotes] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('shiuli_bank_notes') || '' : ''));
  const [savingBank, setSavingBank] = useState(false);
  const [bankToastMessage, setBankToastMessage] = useState<string | null>(null);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

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
  const [reAuthUsername, setReAuthUsername] = useState('shiulicad@gmail.com');
  const [reAuthPassword, setReAuthPassword] = useState('admin123');
  const [reAuthenticating, setReAuthenticating] = useState(false);

  // Load existing settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const plat = await api.getPlatformSettings().catch(() => null);
      if (plat) {
        if (plat.studio_upi_id !== undefined) setStudioUpiId(plat.studio_upi_id || '');
        if (plat.studio_qr_code_url !== undefined) setStudioQrCodeUrl(plat.studio_qr_code_url || '');
        if (plat.cash_check_instructions !== undefined) setCashCheckInstructions(plat.cash_check_instructions || '');

        // Dynamic Bank & Treasury Account details
        const accNum = plat.bank_account_number || '';
        const beneficiary = plat.bank_beneficiary_name || '';
        const bName = plat.bank_name || '';
        const ifsc = plat.bank_ifsc_code || '';
        const swift = plat.bank_swift_code || '';
        const branch = plat.bank_branch || '';
        const accType = plat.bank_account_type || '';
        const notes = plat.bank_notes || '';

        setBankAccountNumber(accNum);
        setBankBeneficiaryName(beneficiary);
        setBankName(bName);
        setBankIfscCode(ifsc);
        setBankSwiftCode(swift);
        setBankBranch(branch);
        setBankAccountType(accType);
        setBankNotes(notes);

        if (accNum) localStorage.setItem('shiuli_bank_account_number', accNum);
        else localStorage.removeItem('shiuli_bank_account_number');
        if (beneficiary) localStorage.setItem('shiuli_bank_beneficiary_name', beneficiary);
        else localStorage.removeItem('shiuli_bank_beneficiary_name');
        if (bName) localStorage.setItem('shiuli_bank_name', bName);
        else localStorage.removeItem('shiuli_bank_name');
        if (ifsc) localStorage.setItem('shiuli_bank_ifsc_code', ifsc);
        else localStorage.removeItem('shiuli_bank_ifsc_code');
        if (swift) localStorage.setItem('shiuli_bank_swift_code', swift);
        else localStorage.removeItem('shiuli_bank_swift_code');
        if (branch) localStorage.setItem('shiuli_bank_branch', branch);
        else localStorage.removeItem('shiuli_bank_branch');
        if (accType) localStorage.setItem('shiuli_bank_account_type', accType);
        else localStorage.removeItem('shiuli_bank_account_type');
        if (notes) localStorage.setItem('shiuli_bank_notes', notes);
        else localStorage.removeItem('shiuli_bank_notes');

        // Email configuration data
        setEmailConfigured(Boolean(plat.email_configured));
        if (plat.smtp_email) setSmtpEmailInput(plat.smtp_email);
        if (plat.smtp_app_password) setSmtpPasswordInput(plat.smtp_app_password);
        setMaskedSmtpEmail(plat.masked_smtp_email || '');
        setSmtpUpdatedByName(plat.smtp_updated_by_name || null);
        setSmtpUpdatedAt(plat.smtp_updated_at || null);
      } else {
        const localUpi = localStorage.getItem('shiuli_studio_upi_id');
        const localQr = localStorage.getItem('shiuli_studio_qr_code_url');
        const localInstr = localStorage.getItem('shiuli_cash_check_instructions');
        if (localUpi) setStudioUpiId(localUpi);
        if (localQr) setStudioQrCodeUrl(localQr);
        if (localInstr) setCashCheckInstructions(localInstr);

        const localAcc = localStorage.getItem('shiuli_bank_account_number');
        if (localAcc) setBankAccountNumber(localAcc);
        const localBeneficiary = localStorage.getItem('shiuli_bank_beneficiary_name');
        if (localBeneficiary) setBankBeneficiaryName(localBeneficiary);
        const localBankName = localStorage.getItem('shiuli_bank_name');
        if (localBankName) setBankName(localBankName);
        const localIfsc = localStorage.getItem('shiuli_bank_ifsc_code');
        if (localIfsc) setBankIfscCode(localIfsc);
        const localSwift = localStorage.getItem('shiuli_bank_swift_code');
        if (localSwift) setBankSwiftCode(localSwift);
        const localBranch = localStorage.getItem('shiuli_bank_branch');
        if (localBranch) setBankBranch(localBranch);
        const localAccType = localStorage.getItem('shiuli_bank_account_type');
        if (localAccType) setBankAccountType(localAccType);
        const localNotes = localStorage.getItem('shiuli_bank_notes');
        if (localNotes) setBankNotes(localNotes);
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

  const handleCopyBankField = (val: string, field: string) => {
    if (!val) return;
    navigator.clipboard?.writeText(val);
    setCopiedBankField(field);
    setTimeout(() => setCopiedBankField(null), 2000);
  };

  const handleSaveBank = async () => {
    setSavingBank(true);
    setBankToastMessage(null);
    try {
      const trimmedBeneficiary = bankBeneficiaryName.trim();
      const trimmedBankName = bankName.trim();
      const trimmedAccNum = bankAccountNumber.trim();
      const trimmedIfsc = bankIfscCode.trim();
      const trimmedSwift = bankSwiftCode.trim();
      const trimmedBranch = bankBranch.trim();
      const trimmedAccType = bankAccountType.trim();
      const trimmedNotes = bankNotes.trim();
      const trimmedUpi = studioUpiId.trim();

      await api.updatePlatformSettings({
        bank_beneficiary_name: trimmedBeneficiary,
        bank_name: trimmedBankName,
        bank_account_number: trimmedAccNum,
        bank_ifsc_code: trimmedIfsc,
        bank_swift_code: trimmedSwift,
        bank_branch: trimmedBranch,
        bank_account_type: trimmedAccType,
        bank_notes: trimmedNotes,
        studio_upi_id: trimmedUpi,
      });

      const bankEntries: [string, string][] = [
        ['shiuli_bank_beneficiary_name', trimmedBeneficiary],
        ['shiuli_bank_name', trimmedBankName],
        ['shiuli_bank_account_number', trimmedAccNum],
        ['shiuli_bank_ifsc_code', trimmedIfsc],
        ['shiuli_bank_swift_code', trimmedSwift],
        ['shiuli_bank_branch', trimmedBranch],
        ['shiuli_bank_account_type', trimmedAccType],
        ['shiuli_bank_notes', trimmedNotes],
        ['shiuli_studio_upi_id', trimmedUpi],
      ];

      bankEntries.forEach(([key, val]) => {
        if (val) localStorage.setItem(key, val);
        else localStorage.removeItem(key);
      });

      // Dispatch dynamic synchronization event for instant client updates across all tabs
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shiuli:bank_details_updated', {
          detail: {
            bankBeneficiaryName: trimmedBeneficiary,
            bankName: trimmedBankName,
            bankAccountNumber: trimmedAccNum,
            bankIfscCode: trimmedIfsc,
            bankSwiftCode: trimmedSwift,
            bankBranch: trimmedBranch,
            bankAccountType: trimmedAccType,
            bankNotes: trimmedNotes,
            studioUpiId: trimmedUpi,
          }
        }));
      }

      const msg = bankAccountNumber.trim()
        ? 'Official Bank & Treasury account details saved and dynamically synchronized across all checkout & top-up modals!'
        : 'Bank details saved. Note: Bank wire card is hidden on customer checkout until an account number is provided.';
      setBankToastMessage(msg);
      setTimeout(() => setBankToastMessage(null), 4000);
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
        alert(err?.message || 'Failed to save bank account settings');
      }
    } finally {
      setSavingBank(false);
    }
  };

  const handleClearBankDetails = async () => {
    if (!window.confirm('Are you sure you want to completely remove and clear all Bank & Treasury details? The bank details card will be immediately removed from the customer checkout modal.')) {
      return;
    }
    setSavingBank(true);
    setBankToastMessage(null);
    try {
      await api.updatePlatformSettings({
        bank_beneficiary_name: '',
        bank_name: '',
        bank_account_number: '',
        bank_ifsc_code: '',
        bank_swift_code: '',
        bank_branch: '',
        bank_account_type: '',
        bank_notes: '',
      });
      setBankBeneficiaryName('');
      setBankName('');
      setBankAccountNumber('');
      setBankIfscCode('');
      setBankSwiftCode('');
      setBankBranch('');
      setBankAccountType('');
      setBankNotes('');

      localStorage.removeItem('shiuli_bank_beneficiary_name');
      localStorage.removeItem('shiuli_bank_name');
      localStorage.removeItem('shiuli_bank_account_number');
      localStorage.removeItem('shiuli_bank_ifsc_code');
      localStorage.removeItem('shiuli_bank_swift_code');
      localStorage.removeItem('shiuli_bank_branch');
      localStorage.removeItem('shiuli_bank_account_type');
      localStorage.removeItem('shiuli_bank_notes');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shiuli:bank_details_updated', {
          detail: {
            bankBeneficiaryName: '',
            bankName: '',
            bankAccountNumber: '',
            bankIfscCode: '',
            bankSwiftCode: '',
            bankBranch: '',
            bankAccountType: '',
            bankNotes: '',
            studioUpiId,
          }
        }));
      }

      setBankToastMessage('Bank & Treasury details removed. Public customer checkout will no longer display any bank details.');
      setTimeout(() => setBankToastMessage(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to clear bank details');
    } finally {
      setSavingBank(false);
    }
  };


  const handleSave = async () => {
    setSaving(true);
    setToastMessage(null);
    try {
      await api.updatePlatformSettings({
        studio_upi_id: studioUpiId,
        studio_qr_code_url: studioQrCodeUrl,
        cash_check_instructions: cashCheckInstructions,
        bank_beneficiary_name: bankBeneficiaryName,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_ifsc_code: bankIfscCode,
        bank_swift_code: bankSwiftCode,
        bank_branch: bankBranch,
        bank_account_type: bankAccountType,
        bank_notes: bankNotes,
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
      if (res.smtp_email) setSmtpEmailInput(res.smtp_email);
      if (res.smtp_app_password) setSmtpPasswordInput(res.smtp_app_password);
      setMaskedSmtpEmail(res.masked_smtp_email || '');
      setSmtpUpdatedByName(res.smtp_updated_by_name || 'Super Admin');
      setSmtpUpdatedAt(res.smtp_updated_at || new Date().toISOString());

      setEmailToast({
        type: 'success',
        message: 'Email credentials saved and verified! Live emails will now use these credentials.',
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
      <div className="bg-white p-6 rounded-2xl border border-[#E8D7B7] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
              <CreditCard className="w-5 h-5 text-[#17345C]" />
            </span>
            <h1 className="font-serif text-2xl font-bold text-[#17243B] tracking-tight">
              Studio Payment Gateway Settings
            </h1>
          </div>
          <p className="text-xs text-[#6B7280]">
            Configure the dynamic customer payment options (UPI / QR Code &amp; CASH / Check) shown in checkout.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <Loader2 className="w-4 h-4 animate-spin text-[#17345C]" />
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
      <div className="bg-white rounded-2xl border border-[#E8D7B7] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E8D7B7]">
          <QrCode className="w-5 h-5 text-[#17345C]" />
          <div>
            <h3 className="font-bold text-base text-[#17243B]">
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
            <label className="font-semibold text-[#17243B] text-xs block">
              Studio Primary UPI VPA ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={studioUpiId}
                onChange={(e) => setStudioUpiId(e.target.value)}
                placeholder="e.g. shiulicad@okhdfcbank"
                className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] font-mono text-xs text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none transition-all"
              />
              <button
                type="button"
                onClick={handleCopyUpiPreview}
                title="Test 1-Click Copy"
                className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-white border border-[#E8D7B7] text-[11px] text-[#17345C] font-semibold flex items-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer"
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
              <label className="font-semibold text-[#17243B] text-xs block">
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
                <div className="w-16 h-16 rounded-xl border border-[#E8D7B7] bg-white p-1 shrink-0 overflow-hidden shadow-sm flex items-center justify-center">
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
                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] hover:border-[#17345C] hover:bg-white text-xs font-semibold text-[#17243B] flex items-center justify-center gap-2 transition-all">
                  <UploadCloud className="w-4 h-4 text-[#17345C]" />
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
        <div className="space-y-2 pt-2 border-t border-[#E8D7B7]">
          <label className="font-semibold text-[#17243B] text-xs flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-[#17345C]" />
            <span>Customer Advisory for CASH &amp; Cheque Option</span>
          </label>
          <textarea
            rows={3}
            value={cashCheckInstructions}
            onChange={(e) => setCashCheckInstructions(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] text-xs text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none resize-none leading-relaxed transition-all"
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

      {/* Official Studio Bank & Treasury Account Details Card */}
      <div className="bg-white rounded-2xl border border-[#E8D7B7] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E8D7B7] gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-[#B88732] border border-[#E8D7B7]">
              <Building2 className="w-5 h-5 text-[#B88732]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#17243B]">
                Official Studio Bank &amp; Treasury Account Details
              </h3>
              <p className="text-xs text-[#6B7280]">
                These details are shown dynamically to clients during Studio Wallet Top-Up, Corporate Credit Repayments, and Direct Bank Transfers.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dynamic Sync Active</span>
          </span>
        </div>

        {/* Success notification for bank save */}
        {bankToastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-semibold shadow-sm animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bankToastMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Beneficiary / Entity Name */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#17243B] text-xs block">
              Beneficiary / Entity Name
            </label>
            <input
              type="text"
              value={bankBeneficiaryName}
              onChange={(e) => setBankBeneficiaryName(e.target.value)}
              placeholder="e.g. Shiuli CAD Studio LLP"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] text-xs font-medium text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none transition-all"
            />
            <span className="text-[11px] text-[#6B7280] block">
              Official legal business or firm name registered with the bank.
            </span>
          </div>

          {/* Bank Name */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#17243B] text-xs block">
              Bank Name
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. HDFC Bank / Silicon Valley Bank"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] text-xs font-medium text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none transition-all"
            />
            <span className="text-[11px] text-[#6B7280] block">
              Financial institution name where funds will be credited.
            </span>
          </div>

          {/* Account Number */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#17243B] text-xs block">
              Bank Account Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="e.g. 50200084739201"
                className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] font-mono text-xs text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none transition-all tracking-wider"
              />
              <button
                type="button"
                onClick={() => handleCopyBankField(bankAccountNumber, 'acc')}
                title="Test Copy"
                className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-white border border-[#E8D7B7] text-[11px] text-[#17345C] font-semibold flex items-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {copiedBankField === 'acc' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <span className="text-[11px] text-[#6B7280] block font-mono">
              Receiving current or savings account number.
            </span>
          </div>

          {/* Account Type */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#17243B] text-xs block">
              Account Type
            </label>
            <select
              value={bankAccountType}
              onChange={(e) => setBankAccountType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] text-xs text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none transition-all"
            >
              <option value="">-- Select Account Type (Optional) --</option>
              <option value="Current Account">Current Account (Corporate / Business)</option>
              <option value="Savings Account">Savings Account</option>
              <option value="Corporate Escrow">Corporate Escrow Account</option>
              <option value="Treasury Pool">Treasury Pool Account</option>
            </select>
            <span className="text-[11px] text-[#6B7280] block">
              Specifies the nature of the deposit account to customers.
            </span>
          </div>

          {/* IFSC Code */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#17243B] text-xs block">
              IFSC Code (Domestic Indian Transfers)
            </label>
            <div className="relative">
              <input
                type="text"
                value={bankIfscCode}
                onChange={(e) => setBankIfscCode(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0000240"
                className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] font-mono text-xs uppercase text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none transition-all tracking-wider"
              />
              <button
                type="button"
                onClick={() => handleCopyBankField(bankIfscCode, 'ifsc')}
                title="Test Copy"
                className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-white border border-[#E8D7B7] text-[11px] text-[#17345C] font-semibold flex items-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {copiedBankField === 'ifsc' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <span className="text-[11px] text-[#6B7280] block font-mono">
              11-character Indian Financial System Code for NEFT / RTGS / IMPS.
            </span>
          </div>

          {/* SWIFT / BIC Code */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#17243B] text-xs block">
              SWIFT / BIC Code (International Wire Transfers)
            </label>
            <div className="relative">
              <input
                type="text"
                value={bankSwiftCode}
                onChange={(e) => setBankSwiftCode(e.target.value.toUpperCase())}
                placeholder="e.g. HDFCINBB"
                className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] font-mono text-xs uppercase text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none transition-all tracking-wider"
              />
              <button
                type="button"
                onClick={() => handleCopyBankField(bankSwiftCode, 'swift')}
                title="Test Copy"
                className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-white border border-[#E8D7B7] text-[11px] text-[#17345C] font-semibold flex items-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {copiedBankField === 'swift' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <span className="text-[11px] text-[#6B7280] block font-mono">
              Required for international global wires (USD, EUR, GBP).
            </span>
          </div>

          {/* Branch & City */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="font-semibold text-[#17243B] text-xs block">
              Branch Name &amp; Location
            </label>
            <input
              type="text"
              value={bankBranch}
              onChange={(e) => setBankBranch(e.target.value)}
              placeholder="e.g. Surat Main Branch, Ring Road, Gujarat"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] text-xs text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none transition-all"
            />
            <span className="text-[11px] text-[#6B7280] block">
              Physical branch location shown on customer wire instruction receipts.
            </span>
          </div>

          {/* Bank Wire / Deposit Instructions & Notes */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="font-semibold text-[#17243B] text-xs block">
              Bank Wire &amp; Deposit Instructions for Customers
            </label>
            <textarea
              rows={2}
              value={bankNotes}
              onChange={(e) => setBankNotes(e.target.value)}
              placeholder="e.g. Please include your registered phone number or Order/Client ID in the wire transfer description."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] text-xs text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none resize-none leading-relaxed transition-all"
            />
            <span className="text-[11px] text-[#6B7280] block">
              Advisory shown at the bottom of the bank details card in the client dashboard.
            </span>
          </div>
        </div>

        {/* Live Client Preview Box */}
        {(() => {
          const hasAnyBankDetail = Boolean(
            bankBeneficiaryName?.trim() ||
            bankName?.trim() ||
            bankAccountNumber?.trim() ||
            bankIfscCode?.trim() ||
            bankSwiftCode?.trim() ||
            bankBranch?.trim() ||
            bankAccountType?.trim() ||
            bankNotes?.trim() ||
            studioUpiId?.trim()
          );

          return (
            <div className="pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#B88732] mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Client View Preview (How it appears in Top Up &amp; Repay Modals)</span>
              </div>
              {!hasAnyBankDetail ? (
                <div className="p-5 rounded-xl bg-[#FAF8F5] border border-dashed border-[#E8D7B7] text-center space-y-1.5 text-xs text-slate-500 max-w-lg">
                  <Building2 className="w-6 h-6 text-[#B88732]/60 mx-auto" />
                  <p className="font-semibold text-[#17243B]">No Bank &amp; Treasury Details Configured</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    All bank fields are currently blank. Public clients will not see any bank wire or treasury details during checkout, wallet top-up, or repayments.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] space-y-2.5 text-xs text-[#17243B] max-w-lg shadow-inner">
                  {(bankBeneficiaryName?.trim() || bankAccountType?.trim()) && (
                    <div className="font-semibold text-[11px] uppercase tracking-wider text-[#B88732] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#B88732]" />
                        <span>{bankBeneficiaryName.trim() || 'Bank Wire Transfer'}</span>
                      </div>
                      {bankAccountType?.trim() && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-[#B88732] border border-[#E8D7B7]">
                          {bankAccountType.trim()}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-[11px] space-y-1.5 text-slate-700 font-mono">
                    {(bankName?.trim() || bankBranch?.trim()) && (
                      <div className="flex items-center justify-between">
                        {bankName?.trim() && <span>Bank: <strong className="text-slate-900 font-bold">{bankName.trim()}</strong></span>}
                        {bankBranch?.trim() && <span className="text-[10px] text-slate-500 font-sans">{bankBranch.trim()}</span>}
                      </div>
                    )}
                    {bankAccountNumber?.trim() && (
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-[#E8D7B7]">
                        <span>Account: <strong className="text-slate-900 tracking-wide">{bankAccountNumber.trim()}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopyBankField(bankAccountNumber.trim(), 'preview_acc')}
                          className="text-[10px] text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedBankField === 'preview_acc' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {bankIfscCode?.trim() && (
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-[#E8D7B7]">
                        <span>IFSC: <strong className="text-slate-900">{bankIfscCode.trim()}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopyBankField(bankIfscCode.trim(), 'preview_ifsc')}
                          className="text-[10px] text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedBankField === 'preview_ifsc' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {bankSwiftCode?.trim() && (
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-[#E8D7B7] text-[10px] text-slate-500">
                        <span>SWIFT/BIC: <strong className="text-slate-700">{bankSwiftCode.trim()}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopyBankField(bankSwiftCode.trim(), 'preview_swift')}
                          className="text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedBankField === 'preview_swift' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {studioUpiId?.trim() && (
                      <div className="flex items-center justify-between bg-amber-50/60 px-2.5 py-1.5 rounded-lg border border-amber-200/60">
                        <span>UPI ID: <strong className="text-slate-900">{studioUpiId.trim()}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopyBankField(studioUpiId.trim(), 'preview_upi')}
                          className="text-[10px] text-[#B88732] hover:text-[#8C6218] font-sans font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedBankField === 'preview_upi' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  {bankNotes?.trim() && (
                    <p className="text-[10px] text-slate-500 italic pt-1.5 border-t border-[#E8D7B7]/60 leading-normal">
                      {bankNotes.trim()}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Save & Clear Bank Details Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSaveBank}
            disabled={savingBank}
            className="btn-gold-luxury px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
          >
            {savingBank ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                <span>Saving Bank Details...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-[#0B1330]" />
                <span>Save Bank &amp; Treasury Details</span>
              </>
            )}
          </button>

          {(bankAccountNumber || bankBeneficiaryName || bankName || bankIfscCode || bankSwiftCode || bankBranch || bankAccountType || bankNotes) && (
            <button
              onClick={handleClearBankDetails}
              disabled={savingBank}
              type="button"
              className="px-5 py-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Remove / Clear Bank Details</span>
            </button>
          )}
        </div>

      </div>

      {/* Dynamic Email Configuration Card */}
      <div className="bg-white rounded-2xl border border-[#E8D7B7] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E8D7B7] gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#17345C] border border-blue-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#17243B]">
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
        <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] text-xs text-[#4B5563] flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-[#17345C] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#17243B] block">
              Multi-Process Encryption &amp; In-Memory Caching
            </span>
            <p className="leading-relaxed">
              Google App Passwords are encrypted at rest with Fernet symmetric cryptography and are never returned across any API endpoint. Live emails instantly adapt to saved credentials without requiring a server reboot.
            </p>
          </div>
        </div>

        {emailToast && (
          <div className={`p-4 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-sm animate-in fade-in duration-200 ${emailToast.type === 'success'
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
            <label className="font-semibold text-[#17243B] text-xs block">
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] font-mono text-xs text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none transition-all"
            />
            <span className="text-[11px] text-[#6B7280] block">
              Outgoing transactional emails will display this address as the verified sender.
            </span>
          </div>

          {/* 16-Character Google App Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#17243B] text-xs block">
                16-Character Google App Password
              </label>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#17345C] hover:underline font-medium"
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
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] font-mono text-xs text-[#17243B] focus:border-[#B88732] focus:bg-white outline-none transition-all"
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
              <h4 className="text-xs font-bold text-[#17243B] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#17345C]" />
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
                className="px-3 py-1.5 text-xs rounded-lg bg-white border border-[#E8D7B7] font-mono outline-none w-56 hidden sm:block"
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="px-4 py-2 rounded-xl bg-[#17243B] text-[#FAF8F3] hover:bg-[#17345C] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
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
            <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${testPassed
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
                  <div className="mt-1 space-y-1">
                    <span className="block font-medium text-emerald-700">
                      Pre-flight check passed. You may now click "Save Email Credentials" below to commit these settings.
                    </span>
                    <span className="block text-[11px] text-emerald-600/90 font-sans">
                      💡 <strong>Note on Delivery:</strong> If you don't see the email in your primary inbox, please check your <strong>Spam / Junk</strong> folder or <strong>Promotions</strong> tab and click <em>"Report Not Spam"</em>.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save & Reset Actions Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#E8D7B7]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveEmailSettings}
              disabled={savingEmail || (!testPassed && !emailConfigured)}
              title={!testPassed && !emailConfigured ? "Send and pass a test email before saving" : "Save verified credentials"}
              className="btn-gold-luxury px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                  <span>Saving Credentials...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#0B1330]" />
                  <span>Save Email Credentials</span>
                </>
              )}
            </button>

            {!testPassed && !emailConfigured && (
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
                  placeholder="shiulicad@gmail.com"
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
                  onClick={() => { setReAuthUsername('shiulicad@gmail.com'); setReAuthPassword('admin123'); }}
                  className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  shiulicad@gmail.com
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
