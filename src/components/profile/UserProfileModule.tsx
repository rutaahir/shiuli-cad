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
      <RevealOnScroll className="rounded-3xl bg-[#0B1330]/90 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5E7A3]">
              <User className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#FAF8F3]">My Profile Details</h2>
              <p className="text-xs text-[#C9C2A6]">Update your personal information and avatar photo</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#12204D] border border-[#D4AF37]/40 text-[11px] font-mono text-[#F5E7A3] uppercase tracking-wider">
            {user?.role?.toUpperCase() || 'CLIENT'}
          </span>
        </div>

        {infoMessage && (
          <div className={`p-4 rounded-2xl mb-6 text-xs flex items-center gap-3 ${
            infoMessage.type === 'success' ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
          }`}>
            {infoMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span>{infoMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSavePersonalInfo} className="space-y-6">
          {/* PHOTO UPLOAD SECTION */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-[#070D22]/60 border border-[#D4AF37]/20">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#1E4FA3] via-[#D4AF37] to-[#F5E7A3] p-[3px] shadow-[0_0_20px_rgba(212,175,55,0.3)] overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#0B1330] flex items-center justify-center text-[#D4AF37]">
                    <User className="w-10 h-10" />
                  </div>
                )}
              </div>
              <label 
                htmlFor="photo-upload-input" 
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#D4AF37] text-[#070D22] cursor-pointer shadow-lg hover:scale-110 transition-transform"
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
              <h3 className="text-sm font-semibold text-[#FAF8F3]">Profile Picture</h3>
              <p className="text-xs text-[#C9C2A6]">
                Upload a JPG, PNG or WEBP image (max 5MB). Photo updates automatically across your account workspace.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label 
                  htmlFor="photo-upload-input" 
                  className="px-4 py-2 rounded-xl bg-[#12204D] border border-[#D4AF37]/40 text-xs font-semibold text-[#F5E7A3] hover:bg-[#1A2E6E] cursor-pointer transition-colors inline-flex items-center gap-2"
                >
                  <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Choose Photo</span>
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={savingInfo}
                    className="px-4 py-2 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition-colors flex items-center gap-1.5"
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
              <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Rutvika"
                className="w-full px-4 py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sahir"
                className="w-full px-4 py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rutvika_atelier"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 95747 87098"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingInfo}
              className="btn-gold-luxury px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50"
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
      <RevealOnScroll className="rounded-3xl bg-[#0B1330]/90 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 border-b border-[#D4AF37]/20 pb-5 mb-6">
          <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5E7A3]">
            <Mail className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#FAF8F3]">Change Email Address (OTP Verified)</h2>
            <p className="text-xs text-[#C9C2A6]">
              Current Account Email: <span className="font-mono text-[#F5E7A3] font-bold">{user?.email}</span>
            </p>
          </div>
        </div>

        {emailMessage && (
          <div className={`p-4 rounded-2xl mb-6 text-xs flex items-center gap-3 ${
            emailMessage.type === 'success' ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
          }`}>
            {emailMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span>{emailMessage.text}</span>
          </div>
        )}

        {!emailOtpSent ? (
          <form onSubmit={handleRequestEmailOtp} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                New Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="enter.new.email@domain.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[11px] text-[#C9C2A6] mt-1.5">
                We will dispatch a 6-digit OTP verification code to this new email address to complete the security change.
              </p>
            </div>

            <button
              type="submit"
              disabled={requestingEmailOtp || !newEmail}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#1E4FA3] to-[#2563EB] text-white text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 hover:brightness-110 transition-all"
            >
              {requestingEmailOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching OTP...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Request Verification OTP for New Email</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyEmailOtp} className="space-y-4 max-w-xl bg-[#070D22]/60 p-5 rounded-2xl border border-[#D4AF37]/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#F5E7A3] font-semibold">
                OTP Sent To: <span className="font-mono">{newEmail}</span>
              </span>
              <button
                type="button"
                onClick={() => setEmailOtpSent(false)}
                className="text-[11px] text-[#C9C2A6] underline hover:text-white"
              >
                Change Email
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                Enter 6-Digit Email Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={emailOtpCode}
                onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 849201"
                required
                className="w-full text-center tracking-[0.5em] font-mono text-xl font-bold py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/50 text-[#F5E7A3] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={verifyingEmailOtp || emailOtpCode.length < 6}
                className="btn-gold-luxury px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50"
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
                className="px-4 py-3 rounded-2xl bg-[#12204D] border border-[#D4AF37]/40 text-xs font-semibold text-[#C9C2A6] hover:text-white transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${requestingEmailOtp ? 'animate-spin' : ''}`} />
                <span>Resend OTP</span>
              </button>
            </div>
          </form>
        )}
      </RevealOnScroll>

      {/* CARD 3: CHANGE PASSWORD (OTP OR DIRECT) */}
      <RevealOnScroll className="rounded-3xl bg-[#0B1330]/90 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#D4AF37]/20 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5E7A3]">
              <Lock className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#FAF8F3]">Password &amp; Security Settings</h2>
              <p className="text-xs text-[#C9C2A6]">Change your account password securely using email OTP verification</p>
            </div>
          </div>

          <div className="flex rounded-xl bg-[#070D22] p-1 border border-[#D4AF37]/30">
            <button
              type="button"
              onClick={() => setPasswordMode('otp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                passwordMode === 'otp' ? 'bg-[#12204D] text-[#F5E7A3] shadow-md border border-[#D4AF37]/50' : 'text-[#C9C2A6] hover:text-white'
              }`}
            >
              🔑 OTP Verification
            </button>
            <button
              type="button"
              onClick={() => setPasswordMode('direct')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                passwordMode === 'direct' ? 'bg-[#12204D] text-[#F5E7A3] shadow-md border border-[#D4AF37]/50' : 'text-[#C9C2A6] hover:text-white'
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
                passwordMessage.type === 'success' ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
              }`}>
                {passwordMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            {!passwordOtpSent ? (
              <div className="space-y-4 max-w-xl">
                <p className="text-xs text-[#C9C2A6]">
                  Click below to dispatch a secure 6-digit OTP code to your registered email address (<span className="font-mono text-[#F5E7A3] font-bold">{user?.email}</span>).
                </p>
                <button
                  type="button"
                  onClick={handleRequestPasswordOtp}
                  disabled={requestingPasswordOtp}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F5E7A3] to-[#D4AF37] text-[#070D22] text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50 hover:brightness-110 transition-all"
                >
                  {requestingPasswordOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#070D22]" />
                      <span>Sending OTP Code...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-[#070D22]" />
                      <span>Send Password Reset OTP Code</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyPasswordOtp} className="space-y-5 max-w-xl bg-[#070D22]/60 p-5 rounded-2xl border border-[#D4AF37]/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#F5E7A3] font-semibold">
                    OTP Dispatched To: <span className="font-mono">{user?.email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRequestPasswordOtp}
                    disabled={requestingPasswordOtp}
                    className="text-[11px] text-[#C9C2A6] underline hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${requestingPasswordOtp ? 'animate-spin' : ''}`} />
                    <span>Resend Code</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                    Enter 6-Digit Security OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={passwordOtpCode}
                    onChange={(e) => setPasswordOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 592014"
                    required
                    className="w-full text-center tracking-[0.5em] font-mono text-xl font-bold py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/50 text-[#F5E7A3] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={verifyingPasswordOtp || passwordOtpCode.length < 6 || !newPassword}
                    className="btn-gold-luxury px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50"
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
                directPasswordMessage.type === 'success' ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
              }`}>
                {directPasswordMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <span>{directPasswordMessage.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full px-4 py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C9C2A6] uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                value={directNewPassword}
                onChange={(e) => setDirectNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                required
                className="w-full px-4 py-3 rounded-2xl bg-[#070D22] border border-[#D4AF37]/30 text-sm text-[#FAF8F3] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={changingDirectPassword || !oldPassword || !directNewPassword}
              className="btn-gold-luxury px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50"
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
