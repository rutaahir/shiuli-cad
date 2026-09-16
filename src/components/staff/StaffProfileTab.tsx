import React, { useState } from 'react';
import { StaffMember } from '../../types';
import {
  ShieldCheck,
  Mail,
  Phone,
  Settings,
  LogOut,
  Loader2,
  Check,
  X,
  Camera,
  Key,
  Send,
  Lock,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface StaffProfileTabProps {
  staff: StaffMember;
  onUpdateProfile?: (staff: StaffMember) => void;
  onLogout?: () => void;
}

export const StaffProfileTab: React.FC<StaffProfileTabProps> = ({ staff, onUpdateProfile, onLogout }) => {
  const { logout } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Profile Form Fields
  const [firstName, setFirstName] = useState(staff.name.split(' ')[0] || '');
  const [lastName, setLastName] = useState(staff.name.split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(staff.email || '');
  const [phone, setPhone] = useState(staff.phone || '');
  const [role, setRole] = useState(staff.role || '');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(staff.avatar || '');

  // Password Reset / Change State
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
      window.location.href = '/';
    }
  };

  // Image Upload Handler (reads file as Base64 Data URL)
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Send Password Reset Email
  const handleSendResetEmail = async () => {
    if (!email) {
      alert('Please enter a valid email address.');
      return;
    }
    setSendingResetEmail(true);
    setResetEmailSent(false);
    try {
      await api.requestPasswordResetEmail(email);
      setResetEmailSent(true);
      setToastMsg(`Password reset link & security code dispatched to ${email}!`);
      setTimeout(() => setToastMsg(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to dispatch password reset email.');
    } finally {
      setSendingResetEmail(false);
    }
  };

  // Direct Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setChangingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await api.changePassword(oldPassword, newPassword);
      setPasswordMsg({ type: 'success', text: res.detail || 'Password changed successfully.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 4000);
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err?.message || 'Failed to change password. Check current password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToastMsg(null);
    try {
      const updatedUser = await api.updateMe({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phone,
        profile_photo: avatar,
        staff_profile: {
          specialty_tags: role,
          bio: bio,
        },
      });

      const fullName = `${updatedUser.first_name || firstName} ${updatedUser.last_name || lastName}`.trim();
      const updatedStaff: StaffMember = {
        ...staff,
        name: fullName,
        email: updatedUser.email || email,
        phone: updatedUser.phone_number || phone,
        avatar: updatedUser.profile_photo || avatar,
        role: updatedUser.staff_profile?.specialty_tags || role,
      };

      if (onUpdateProfile) {
        onUpdateProfile(updatedStaff);
      }
      localStorage.setItem('shiuli_user', JSON.stringify(updatedUser));
      setToastMsg('Craftsman profile & credentials updated in database successfully!');
      setShowEditModal(false);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] uppercase font-bold tracking-widest font-mono">
            Certified CAD Craftsman
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight mt-1">
            Artisan Profile & Credentials
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md flex items-center gap-2"
          >
            <Settings className="w-4 h-4" /> Edit Preferences
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>

      <div className="bg-white border-l-4 border-l-[#C9A227] border border-[#E5E7EF] p-8 rounded-2xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-[#E5E7EF] pb-6">
          <div className="relative group">
            <img
              src={staff.avatar}
              alt={staff.name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-[#C9A227] shadow-md"
            />
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold gap-1"
            >
              <Camera className="w-4 h-4" /> Edit
            </button>
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="text-2xl font-serif font-bold text-[#1E2230]">{staff.name}</h3>
              <ShieldCheck className="w-5 h-5 text-[#C9A227]" />
            </div>
            <p className="text-xs font-mono text-[#09112B] font-bold uppercase tracking-wider">
              {staff.role} • Staff ID: {staff.id}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-[#6B7280] pt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[#C9A227]" /> {staff.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#C9A227]" /> {staff.phone}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] space-y-1">
            <div className="text-[10px] font-mono text-[#6B7280] uppercase font-semibold">Workbench Capacity</div>
            <div className="font-serif text-xl font-bold text-[#1E2230]">{staff.maxJobLimit} Jobs Max</div>
            <p className="text-[10px] text-slate-400">Strict quality control limit</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] space-y-1">
            <div className="text-[10px] font-mono text-[#6B7280] uppercase font-semibold">Lifetime Rating</div>
            <div className="font-serif text-xl font-bold text-amber-700">★ {staff.rating} / 5.0</div>
            <p className="text-[10px] text-slate-400">SOW tolerance compliance score</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] space-y-1">
            <div className="text-[10px] font-mono text-[#6B7280] uppercase font-semibold">Commissions Delivered</div>
            <div className="font-serif text-xl font-bold text-emerald-700">{staff.jobsCompleted} Pieces</div>
            <p className="text-[10px] text-slate-400">Zero return rate</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-serif font-bold text-[#1E2230] text-sm">Primary CAD Mastery</h4>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-lg bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37]/30 font-bold">
              Rhino 7 3D Architecture
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37]/30 font-bold">
              Kundan & Polki Foil Tolerances
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37]/30 font-bold">
              Magics STL Mesh Repair
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37]/30 font-bold">
              KeyShot 11 4K Photorealistic Rendering
            </span>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E5E7EF] max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1E2230]">Edit Artisan Credentials</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Photo Upload & Preview Section */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] space-y-3">
                <label className="font-semibold text-[#1E2230] block">Artisan Profile Photo</label>
                <div className="flex items-center gap-4">
                  <img
                    src={avatar || staff.avatar}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-[#C9A227] shadow-sm shrink-0"
                  />
                  <div className="space-y-2 flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#09112B] text-[#F5E7A3] font-bold text-[11px] hover:bg-[#15234d] transition-colors shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                      <span>Upload New Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="Or enter Image URL..."
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EF] text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1E2230] block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1E2230] block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]"
                  />
                </div>
              </div>

              {/* Email Address & Password Reset Action */}
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Email Address</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]"
                  />
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={sendingResetEmail}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1.5 transition-colors"
                  >
                    {sendingResetEmail ? (
                      <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-amber-700" />
                    )}
                    <span>Reset via Email</span>
                  </button>
                </div>
                {resetEmailSent && (
                  <p className="text-[10px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> Password reset link dispatched to {email}!
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]"
                />
              </div>

              {/* Role / Specialty */}
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Specialty Role / Tags</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. MatrixGold Specialist & Diamond Setter"
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Artisan Bio / Notes</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief summary of CAD modeling background..."
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]"
                />
              </div>

              {/* Expandable Direct Password Change Accordion */}
              <div className="pt-2 border-t border-[#E5E7EF]">
                <button
                  type="button"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="text-xs text-[#09112B] font-bold flex items-center gap-1.5 hover:text-[#C9A227] transition-colors"
                >
                  <Key className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>{showPasswordChange ? 'Hide Password Form' : 'Or Change Password Directly'}</span>
                </button>

                {showPasswordChange && (
                  <div className="mt-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] space-y-3 animate-fadeIn">
                    {passwordMsg && (
                      <div
                        className={`p-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                          passwordMsg.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {passwordMsg.type === 'success' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>{passwordMsg.text}</span>
                      </div>
                    )}

                    <div>
                      <label className="font-semibold text-[#1E2230] block mb-1">Current Password</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EF]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-[#1E2230] block mb-1">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 chars"
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EF]"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-[#1E2230] block mb-1">Confirm New</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new"
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EF]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={changingPassword || !oldPassword || !newPassword}
                      onClick={handleChangePassword}
                      className="w-full py-2 rounded-lg bg-[#09112B] hover:bg-[#162758] text-[#F5E7A3] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {changingPassword ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#C9A227] animate-spin" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[#C9A227]" />
                      )}
                      <span>Update Password Now</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EF]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gold-luxury px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0B1330]" />
                      <span>Saving DB...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#0B1330]" />
                      <span>Save Changes</span>
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

