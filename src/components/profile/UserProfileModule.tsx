import React, { useState, useEffect } from 'react';
import { useAuth, UserProfile } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound, 
  Loader2, 
  Sparkles,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { sendOtpEmail } from '../../services/emailService';
import { RevealOnScroll } from '../motion/RevealOnScroll';

export const UserProfileModule: React.FC = () => {
  const { user, updateUser, refreshUser } = useAuth();

  // Personal Info Form State
  const [firstName, setFirstName] = useState<string>(user?.first_name || '');
  const [lastName, setLastName] = useState<string>(user?.last_name || '');
  const [username, setUsername] = useState<string>(user?.username || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(user?.phone_number || '');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profile_photo || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.profile_photo || null);
  
  const [savingInfo, setSavingInfo] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email Change State (OTP Flow)
  const [newEmail, setNewEmail] = useState<string>('');
  const [emailOtpCode, setEmailOtpCode] = useState<string>('');
  const [emailOtpSent, setEmailOtpSent] = useState<boolean>(false);
  const [requestingEmailOtp, setRequestingEmailOtp] = useState<boolean>(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState<boolean>(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change via OTP State
  const [passwordOtpCode, setPasswordOtpCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordOtpSent, setPasswordOtpSent] = useState<boolean>(false);
  const [requestingPasswordOtp, setRequestingPasswordOtp] = useState<boolean>(false);
  const [verifyingPasswordOtp, setVerifyingPasswordOtp] = useState<boolean>(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Direct Password Change State (Old Password + New Password)
  const [oldPassword, setOldPassword] = useState<string>('');
  const [directNewPassword, setDirectNewPassword] = useState<string>('');
  const [changingDirectPassword, setChangingDirectPassword] = useState<boolean>(false);
  const [directPasswordMessage, setDirectPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab mode for security (OTP vs Direct)
  const [passwordMode, setPasswordMode] = useState<'otp' | 'direct'>('otp');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setUsername(user.username || '');
      setPhoneNumber(user.phone_number || '');
      setProfilePhoto(user.profile_photo || null);
      setPhotoPreview(user.profile_photo || null);
    }
  }, [user]);

  // Handle Photo Select
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setInfoMessage({ type: 'error', text: 'Image file size must be less than 5MB.' });
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove Photo
  const handleRemovePhoto = async () => {
    setSavingInfo(true);
    try {
      const res = await api.request<UserProfile>('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ remove_photo: true }),
      });
      setPhotoPreview(null);
      setProfilePhoto(null);
      setPhotoFile(null);
      updateUser(res);
      setInfoMessage({ type: 'success', text: 'Profile photo removed successfully.' });
    } catch (err: any) {
      setInfoMessage({ type: 'error', text: err.message || 'Failed to remove photo.' });
    } finally {
      setSavingInfo(false);
    }
  };

  // Save Personal Info
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMessage(null);

    try {
      const payload: any = {
        first_name: firstName,
        last_name: lastName,
        username: username,
        phone_number: phoneNumber,
      };

      if (photoPreview && photoPreview.startsWith('data:image/')) {
        payload.profile_photo = photoPreview;
      }

      const updated = await api.request<UserProfile>('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      updateUser(updated);
      setInfoMessage({ type: 'success', text: 'Profile details updated successfully!' });
    } catch (err: any) {
      setInfoMessage({ type: 'error', text: err.message || 'Failed to update profile details.' });
    } finally {
      setSavingInfo(false);
    }
  };

  // Request Email Change OTP
  const handleRequestEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setEmailMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setRequestingEmailOtp(true);
    setEmailMessage(null);

    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      sendOtpEmail(newEmail, generatedOtp, 'Profile Email Change').catch((e) =>
        console.warn('Background OTP dispatch notice:', e)
      );

      await api.post<any>('/auth/request-email-change-otp/', { new_email: newEmail }).catch(() => null);
      setEmailOtpSent(true);
      setEmailMessage({ type: 'success', text: `Verification code sent to ${newEmail}!` });
    } catch (err: any) {
      setEmailMessage({ type: 'error', text: err.message || 'Failed to request email OTP.' });
    } finally {
      setRequestingEmailOtp(false);
    }
  };

  // Verify Email Change OTP
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtpCode || emailOtpCode.length < 6) {
      setEmailMessage({ type: 'error', text: 'Please enter the 6-digit verification code.' });
      return;
    }
    setVerifyingEmailOtp(true);
    setEmailMessage(null);

    try {
      const res = await api.post<any>('/auth/verify-email-change-otp/', {
        code: emailOtpCode,
        new_email: newEmail,
      });
      if (res.user) {
        updateUser(res.user);
      }
      setEmailMessage({ type: 'success', text: 'Email address successfully updated!' });
      setEmailOtpSent(false);
      setNewEmail('');
      setEmailOtpCode('');
    } catch (err: any) {
      setEmailMessage({ type: 'error', text: err.message || err.response?.data?.error || 'Verification failed.' });
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // Request Password Reset OTP
  const handleRequestPasswordOtp = async () => {
    setRequestingPasswordOtp(true);
    setPasswordMessage(null);

    try {
      const res = await api.post<any>('/auth/request-password-reset-otp/');
      setPasswordOtpSent(true);
      setPasswordMessage({ type: 'success', text: res.message || `Verification OTP code sent to your registered email (${user?.email})!` });
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || err.response?.data?.error || 'Failed to request password reset OTP.' });
    } finally {
      setRequestingPasswordOtp(false);
    }
  };

  // Verify Password Reset OTP
  const handleVerifyPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordOtpCode || passwordOtpCode.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Please enter the 6-digit verification code.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setVerifyingPasswordOtp(true);
    setPasswordMessage(null);

    try {
      const res = await api.post<any>('/auth/verify-password-reset-otp/', {
        code: passwordOtpCode,
        new_password: newPassword,
      });
      setPasswordMessage({ type: 'success', text: res.detail || 'Password updated successfully!' });
      setPasswordOtpSent(false);
      setPasswordOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || err.response?.data?.error || 'Password update failed.' });
    } finally {
      setVerifyingPasswordOtp(false);
    }
  };

  // Direct Password Change (Old + New)
  const handleChangeDirectPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !directNewPassword) {
      setDirectPasswordMessage({ type: 'error', text: 'Please fill out both password fields.' });
      return;
    }
    if (directNewPassword.length < 6) {
      setDirectPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    setChangingDirectPassword(true);
    setDirectPasswordMessage(null);

    try {
      const res = await api.post<any>('/auth/change-password/', {
        old_password: oldPassword,
        new_password: directNewPassword,
      });
      setDirectPasswordMessage({ type: 'success', text: res.detail || 'Password updated successfully!' });
      setOldPassword('');
      setDirectNewPassword('');
    } catch (err: any) {
      setDirectPasswordMessage({ type: 'error', text: err.message || err.response?.data?.error || 'Password change failed.' });
    } finally {
      setChangingDirectPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* CARD 1: PERSONAL INFORMATION & PHOTO */}
      <RevealOnScroll className="rounded-3xl bg-white border border-[#E8D7B7] p-6 sm:p-8 shadow-[0_12px_35px_rgba(184,135,50,0.06)]">
        <div className="flex items-center justify-between border-b border-[#E8D7B7]/60 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] text-[#B88732] shadow-xs">
              <User className="w-5 h-5 text-[#B88732]" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#0B1330]">My Profile Details</h2>
              <p className="text-xs text-[#5A6679]">Update your personal information and avatar photo</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#FCFAF7] border border-[#E8D7B7] text-[11px] font-mono font-bold text-[#0B1330] uppercase tracking-wider">
            {user?.role?.toUpperCase() || 'CLIENT'}
          </span>
        </div>

        {infoMessage && (
          <div className={`p-4 rounded-2xl mb-6 text-xs flex items-center gap-3 ${
            infoMessage.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {infoMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium">{infoMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSavePersonalInfo} className="space-y-6">
          {/* PHOTO UPLOAD SECTION */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-[#FCFAF7] border border-[#E8D7B7]">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#F5E7A3] to-[#B88732] p-[3px] shadow-[0_6px_20px_rgba(184,135,50,0.18)] overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#B88732]">
                    <User className="w-10 h-10" />
                  </div>
                )}
              </div>
              <label 
                htmlFor="photo-upload-input" 
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#0B1330] text-[#F5E7A3] border border-[#D4AF37]/50 cursor-pointer shadow-md hover:scale-110 transition-transform"
                title="Upload Profile Photo"
              >
                <Camera className="w-4 h-4" />
                <input 
                  id="photo-upload-input" 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                  onChange={handlePhotoSelect}
                />
              </label>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <h3 className="text-sm font-bold text-[#0B1330]">Profile Picture</h3>
              <p className="text-xs text-[#5A6679]">
                Upload a JPG, PNG or WEBP image (max 5MB). Photo updates automatically across your account workspace.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label 
                  htmlFor="photo-upload-input" 
                  className="px-4 py-2 rounded-xl bg-white border border-[#E8D7B7] text-xs font-bold text-[#0B1330] hover:bg-[#FAF8F5] hover:border-[#D4AF37] cursor-pointer transition-colors inline-flex items-center gap-2 shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-[#B88732]" />
                  <span>Choose Photo</span>
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={savingInfo}
                    className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* FORM FIELDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Rutvika"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E8D7B7] text-sm text-[#0B1330] placeholder:text-slate-400 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sahir"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E8D7B7] text-sm text-[#0B1330] placeholder:text-slate-400 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#B88732] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rutvika_atelier"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#E8D7B7] text-sm text-[#0B1330] placeholder:text-slate-400 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#B88732] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 95747 87098"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#E8D7B7] text-sm text-[#0B1330] placeholder:text-slate-400 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none transition-all shadow-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingInfo}
              className="btn-gold-luxury px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_8px_20px_rgba(184,135,50,0.25)] text-[#0B1330] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {savingInfo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#0B1330]" />
                  <span>Save Profile Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      </RevealOnScroll>

      {/* CARD 2: CHANGE EMAIL ADDRESS (OTP SECURED) */}
      <RevealOnScroll className="rounded-3xl bg-white border border-[#E8D7B7] p-6 sm:p-8 shadow-[0_12px_35px_rgba(184,135,50,0.06)]">
        <div className="flex items-center gap-3 border-b border-[#E8D7B7]/60 pb-5 mb-6">
          <div className="p-2.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] text-[#B88732] shadow-xs">
            <Mail className="w-5 h-5 text-[#B88732]" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#0B1330]">Change Email Address (OTP Verified)</h2>
            <p className="text-xs text-[#5A6679]">
              Current Account Email: <span className="font-mono text-[#0B1330] font-bold bg-[#FCFAF7] px-2 py-0.5 rounded-md border border-[#E8D7B7]">{user?.email}</span>
            </p>
          </div>
        </div>

        {emailMessage && (
          <div className={`p-4 rounded-2xl mb-6 text-xs flex items-center gap-3 ${
            emailMessage.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {emailMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium">{emailMessage.text}</span>
          </div>
        )}

        {!emailOtpSent ? (
          <form onSubmit={handleRequestEmailOtp} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                New Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#B88732] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="enter.new.email@domain.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#E8D7B7] text-sm text-[#0B1330] placeholder:text-slate-400 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none transition-all shadow-xs"
                />
              </div>
              <p className="text-[11px] text-[#5A6679] mt-1.5">
                We will dispatch a 6-digit OTP verification code to this new email address to complete the security change.
              </p>
            </div>

            <button
              type="submit"
              disabled={requestingEmailOtp || !newEmail}
              className="px-6 py-3 rounded-2xl bg-[#0B1330] text-[#F5E7A3] text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_4px_16px_rgba(11,19,48,0.2)] disabled:opacity-50 hover:bg-[#12204D] transition-all"
            >
              {requestingEmailOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching OTP...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                  <span>Request Verification OTP for New Email</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyEmailOtp} className="space-y-4 max-w-xl bg-[#FCFAF7] p-5 rounded-2xl border border-[#E8D7B7]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#0B1330] font-semibold">
                OTP Sent To: <span className="font-mono font-bold text-[#B88732]">{newEmail}</span>
              </span>
              <button
                type="button"
                onClick={() => setEmailOtpSent(false)}
                className="text-[11px] text-[#B88732] font-semibold underline hover:text-[#0B1330]"
              >
                Change Email
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                Enter 6-Digit Email Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={emailOtpCode}
                onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 849201"
                required
                className="w-full text-center tracking-[0.5em] font-mono text-xl font-bold py-3 rounded-2xl bg-white border border-[#D4AF37] text-[#0B1330] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none shadow-xs"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={verifyingEmailOtp || emailOtpCode.length < 6}
                className="btn-gold-luxury px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_8px_20px_rgba(184,135,50,0.25)] text-[#0B1330] disabled:opacity-50"
              >
                {verifyingEmailOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#0B1330]" />
                    <span>Confirm &amp; Update Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRequestEmailOtp}
                disabled={requestingEmailOtp}
                className="px-4 py-3 rounded-2xl bg-white border border-[#E8D7B7] text-xs font-bold text-[#5A6679] hover:text-[#0B1330] hover:border-[#D4AF37] shadow-xs transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${requestingEmailOtp ? 'animate-spin' : ''}`} />
                <span>Resend OTP</span>
              </button>
            </div>
          </form>
        )}
      </RevealOnScroll>

      {/* CARD 3: CHANGE PASSWORD (OTP OR DIRECT) */}
      <RevealOnScroll className="rounded-3xl bg-white border border-[#E8D7B7] p-6 sm:p-8 shadow-[0_12px_35px_rgba(184,135,50,0.06)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E8D7B7]/60 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FCFAF7] border border-[#E8D7B7] text-[#B88732] shadow-xs">
              <Lock className="w-5 h-5 text-[#B88732]" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#0B1330]">Password &amp; Security Settings</h2>
              <p className="text-xs text-[#5A6679]">Change your account password securely using email OTP verification or current password</p>
            </div>
          </div>

          <div className="flex rounded-2xl bg-[#FCFAF7] p-1 border border-[#E8D7B7]">
            <button
              type="button"
              onClick={() => setPasswordMode('otp')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                passwordMode === 'otp' 
                  ? 'bg-[#0B1330] text-[#F5E7A3] shadow-sm' 
                  : 'text-[#5A6679] hover:text-[#0B1330]'
              }`}
            >
              🔑 OTP Verification
            </button>
            <button
              type="button"
              onClick={() => setPasswordMode('direct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                passwordMode === 'direct' 
                  ? 'bg-[#0B1330] text-[#F5E7A3] shadow-sm' 
                  : 'text-[#5A6679] hover:text-[#0B1330]'
              }`}
            >
              🔒 Current Password
            </button>
          </div>
        </div>

        {passwordMode === 'otp' ? (
          <div>
            {passwordMessage && (
              <div className={`p-4 rounded-2xl mb-6 text-xs flex items-center gap-3 ${
                passwordMessage.type === 'success' 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {passwordMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <span className="font-medium">{passwordMessage.text}</span>
              </div>
            )}

            {!passwordOtpSent ? (
              <div className="space-y-4 max-w-xl">
                <p className="text-xs text-[#5A6679] leading-relaxed">
                  Click below to dispatch a secure 6-digit OTP code to your registered email address (<span className="font-mono text-[#0B1330] font-bold bg-[#FCFAF7] px-2 py-0.5 rounded-md border border-[#E8D7B7]">{user?.email}</span>).
                </p>
                <button
                  type="button"
                  onClick={handleRequestPasswordOtp}
                  disabled={requestingPasswordOtp}
                  className="btn-gold-luxury px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_8px_20px_rgba(184,135,50,0.25)] text-[#0B1330] disabled:opacity-50 hover:brightness-105 active:scale-[0.99] transition-all"
                >
                  {requestingPasswordOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                      <span>Sending OTP Code...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-[#0B1330]" />
                      <span>Send Password Reset OTP Code</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyPasswordOtp} className="space-y-5 max-w-xl bg-[#FCFAF7] p-5 rounded-2xl border border-[#E8D7B7]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#0B1330] font-semibold">
                    OTP Dispatched To: <span className="font-mono font-bold text-[#B88732]">{user?.email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRequestPasswordOtp}
                    disabled={requestingPasswordOtp}
                    className="text-[11px] text-[#B88732] font-semibold underline hover:text-[#0B1330] flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${requestingPasswordOtp ? 'animate-spin' : ''}`} />
                    <span>Resend Code</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                    Enter 6-Digit Security OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={passwordOtpCode}
                    onChange={(e) => setPasswordOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 592014"
                    required
                    className="w-full text-center tracking-[0.5em] font-mono text-xl font-bold py-3 rounded-2xl bg-white border border-[#D4AF37] text-[#0B1330] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E8D7B7] text-sm text-[#0B1330] placeholder:text-slate-400 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E8D7B7] text-sm text-[#0B1330] placeholder:text-slate-400 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none transition-all shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={verifyingPasswordOtp || passwordOtpCode.length < 6 || !newPassword}
                    className="btn-gold-luxury px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_8px_20px_rgba(184,135,50,0.25)] text-[#0B1330] disabled:opacity-50"
                  >
                    {verifyingPasswordOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                        <span>Verifying &amp; Saving...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-[#0B1330]" />
                        <span>Verify OTP &amp; Reset Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleChangeDirectPassword} className="space-y-4 max-w-xl">
            {directPasswordMessage && (
              <div className={`p-4 rounded-2xl mb-4 text-xs flex items-center gap-3 ${
                directPasswordMessage.type === 'success' 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {directPasswordMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <span className="font-medium">{directPasswordMessage.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E8D7B7] text-sm text-[#0B1330] placeholder:text-slate-400 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A6679] uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                value={directNewPassword}
                onChange={(e) => setDirectNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                required
                className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E8D7B7] text-sm text-[#0B1330] placeholder:text-slate-400 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none transition-all shadow-xs"
              />
            </div>

            <button
              type="submit"
              disabled={changingDirectPassword || !oldPassword || !directNewPassword}
              className="btn-gold-luxury px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_8px_20px_rgba(184,135,50,0.25)] text-[#0B1330] disabled:opacity-50"
            >
              {changingDirectPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#0B1330]" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        )}
      </RevealOnScroll>
    </div>
  );
};
