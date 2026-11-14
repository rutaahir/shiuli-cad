import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Loader2,
  Camera,
  User,
  Briefcase,
  Phone,
  Mail,
  Upload,
  Trash2,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth, UserProfile } from '../../context/AuthContext';
import { api } from '../../services/api';
import { appStore } from '../../services/store';
import { getOptimizedImageUrl } from '../../utils/imageHelper';

interface AdminProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (name: string, title: string, avatar: string | null) => void;
}

const TITLE_PRESETS = [
  'Head CAD Engineer',
  'Studio Director',
  'Lead CAD Designer',
  'Super Admin',
  'Master Craftsman',
  'Operations Director'
];

export const AdminProfileEditModal: React.FC<AdminProfileEditModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated
}) => {
  const { user, updateUser, refreshUser } = useAuth();

  // Initial name determination
  const storedName = typeof window !== 'undefined' ? localStorage.getItem('shiuli_admin_custom_name') : null;
  const storedTitle = typeof window !== 'undefined' ? localStorage.getItem('shiuli_admin_title') : null;

  // Split name if first_name / last_name are present
  const initialFirstName = user?.first_name || (storedName ? storedName.split(' ')[0] : 'Harshil');
  const initialLastName = user?.last_name || (storedName ? storedName.split(' ').slice(1).join(' ') : 'Shah');

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [title, setTitle] = useState(storedTitle || 'Head CAD Engineer');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '+91 98765 00000');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profile_photo || null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.profile_photo || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state whenever modal opens or user updates
  useEffect(() => {
    if (isOpen) {
      const sName = localStorage.getItem('shiuli_admin_custom_name');
      const sTitle = localStorage.getItem('shiuli_admin_title');
      
      const fName = user?.first_name || (sName ? sName.split(' ')[0] : 'Harshil');
      const lName = user?.last_name || (sName ? sName.split(' ').slice(1).join(' ') : 'Shah');
      
      setFirstName(fName);
      setLastName(lName);
      setTitle(sTitle || 'Head CAD Engineer');
      setPhoneNumber(user?.phone_number || '+91 98765 00000');
      setProfilePhoto(user?.profile_photo || null);
      setPhotoPreview(user?.profile_photo || null);
      setPhotoFile(null);
      setToastMessage(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'Admin User';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'AD';

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage({ type: 'error', text: 'Image file size must be less than 5MB.' });
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setProfilePhoto(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setToastMessage({ type: 'error', text: 'Please enter a valid first name.' });
      return;
    }

    setSaving(true);
    setToastMessage(null);

    try {
      const trimmedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      // Update backend /auth/me/
      const payload: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
      };

      if (photoPreview && photoPreview.startsWith('data:image/')) {
        payload.profile_photo = photoPreview;
      } else if (!photoPreview && user?.profile_photo) {
        payload.remove_photo = true;
      }

      let updatedUser: UserProfile | null = null;
      try {
        updatedUser = await api.request<UserProfile>('/auth/me/', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Backend update failed or running in offline mode, persisting locally:', err);
      }

      // Persist to localStorage for guaranteed immediate admin UI reactivity
      localStorage.setItem('shiuli_admin_custom_name', trimmedFullName);
      localStorage.setItem('shiuli_admin_title', title.trim() || 'Head CAD Engineer');

      // Update AuthContext user state
      if (updatedUser) {
        updateUser(updatedUser);
      } else if (user) {
        updateUser({
          ...user,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim(),
          profile_photo: photoPreview || profilePhoto,
        });
      }

      // Also update staff list if this admin appears in staff list
      try {
        const staffList = appStore.getStaffList();
        const updatedStaffList = staffList.map((s) => {
          if (
            (user?.email && s.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
            s.name.toLowerCase().includes('harshil') ||
            s.name.toLowerCase() === trimmedFullName.toLowerCase()
          ) {
            return {
              ...s,
              name: trimmedFullName,
              role: title.trim() || s.role,
              avatar: photoPreview || s.avatar,
            };
          }
          return s;
        });
        appStore.saveStaffList(updatedStaffList);
      } catch (e) {
        console.warn('Could not update staff store:', e);
      }

      // Dispatch custom sync event
      window.dispatchEvent(
        new CustomEvent('shiuli_admin_profile_updated', {
          detail: {
            name: trimmedFullName,
            title: title.trim() || 'Head CAD Engineer',
            avatar: photoPreview,
          },
        })
      );

      if (onProfileUpdated) {
        onProfileUpdated(trimmedFullName, title.trim() || 'Head CAD Engineer', photoPreview);
      }

      setToastMessage({ type: 'success', text: 'Admin profile updated successfully!' });

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err?.message || 'Failed to update admin profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17243B]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#FFFDF9] border border-[#E8D7B7] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[#17243B]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#17345C] to-[#1F4275] text-[#FFF9F0] px-6 py-5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF9F0]/10 border border-[#FFF9F0]/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#D9B66F]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold tracking-tight text-[#FFF9F0]">
                  Edit Administrator Profile
                </h3>
                <p className="text-xs text-[#FFF9F0]/70 font-light">
                  Manage your studio leadership identity and sidebar card
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFF9F0]/80 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Toast / Notification */}
          {toastMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span className="font-medium">{toastMessage.text}</span>
            </div>
          )}

          {/* Avatar Section */}
          <div className="p-4 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] flex items-center gap-4">
            <div className="relative group flex-shrink-0">
              {photoPreview ? (
                <img
                  src={getOptimizedImageUrl(photoPreview)}
                  alt={fullName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#D9B66F] shadow-sm"
                  onError={(e) => {
                    // Fallback to initials if broken
                    (e.target as HTMLElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      const fallback = parent.querySelector('.initials-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div
                className={`initials-fallback w-16 h-16 rounded-full bg-gradient-to-br from-[#17345C] to-[#2A4D7C] text-[#FFF9F0] font-serif font-bold text-xl border-2 border-[#D9B66F] shadow-sm flex items-center justify-center ${
                  photoPreview ? 'hidden' : 'flex'
                }`}
              >
                {initials}
              </div>

              <label
                htmlFor="admin-photo-upload"
                className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-5 h-5 text-white" />
              </label>
              <input
                id="admin-photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#17345C] mb-1">
                Admin Avatar &amp; Atelier Portrait
              </div>
              <p className="text-[11px] text-[#687386] mb-2 leading-relaxed">
                PNG, JPG or WEBP under 5MB. Visible on sidebar, approvals, and order assignments.
              </p>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="admin-photo-upload"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E8D7B7] hover:border-[#B88732] text-[11px] font-semibold text-[#17345C] cursor-pointer hover:bg-[#FFFDF9] transition-all shadow-2xs"
                >
                  <Upload className="w-3 h-3 text-[#B88732]" />
                  Upload Photo
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#17345C] tracking-wide uppercase mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Harshil"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8D7B7] rounded-xl text-xs text-[#17345C] placeholder-[#9CA3AF] focus:outline-none focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732] transition-all shadow-2xs font-medium"
                />
                <User className="w-4 h-4 text-[#B88732] absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#17345C] tracking-wide uppercase mb-1.5">
                Last Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Shah"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8D7B7] rounded-xl text-xs text-[#17345C] placeholder-[#9CA3AF] focus:outline-none focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732] transition-all shadow-2xs font-medium"
                />
                <User className="w-4 h-4 text-[#B88732] absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Studio Designation / Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-[#17345C] tracking-wide uppercase">
                Studio Designation / Title
              </label>
              <span className="text-[10px] text-[#B88732] font-semibold">Sidebar Subtitle</span>
            </div>
            <div className="relative mb-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Head CAD Engineer"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8D7B7] rounded-xl text-xs text-[#17345C] placeholder-[#9CA3AF] focus:outline-none focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732] transition-all shadow-2xs font-medium"
              />
              <Briefcase className="w-4 h-4 text-[#B88732] absolute left-3 top-3" />
            </div>

            {/* Title Presets */}
            <div className="flex flex-wrap gap-1.5">
              {TITLE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTitle(p)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                    title === p
                      ? 'bg-[#17345C] text-[#FFF9F0] border border-[#17345C] shadow-2xs'
                      : 'bg-[#FFF9F0] text-[#687386] border border-[#E8D7B7] hover:border-[#B88732] hover:text-[#17345C]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number & Email Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-[#17345C] tracking-wide uppercase mb-1.5">
                Contact Phone
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8D7B7] rounded-xl text-xs text-[#17345C] placeholder-[#9CA3AF] focus:outline-none focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732] transition-all shadow-2xs font-medium"
                />
                <Phone className="w-4 h-4 text-[#B88732] absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#17345C] tracking-wide uppercase mb-1.5">
                System Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={user?.email || 'shiulicad@gmail.com'}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F9FAFB] border border-[#E8D7B7] rounded-xl text-xs text-[#687386] cursor-not-allowed font-medium select-all"
                />
                <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Live Card Preview */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7]">
            <div className="text-[10px] font-bold text-[#B88732] tracking-wider uppercase mb-2">
              Sidebar Preview
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E8D7B7] shadow-2xs">
              {photoPreview ? (
                <img
                  src={getOptimizedImageUrl(photoPreview)}
                  alt={fullName}
                  className="w-8 h-8 rounded-full object-cover border-2 border-[#D9B66F]"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#17345C] text-[#FFF9F0] font-serif font-bold text-xs flex items-center justify-center border-2 border-[#D9B66F]">
                  {initials}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-serif font-bold text-[#17345C] truncate">
                  {fullName}
                </div>
                <div className="text-[10px] text-[#B88732] font-semibold tracking-wide truncate">
                  {title.trim() || 'Head CAD Engineer'}
                </div>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold">
                Online
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8D7B7]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-[#E8D7B7] hover:bg-[#FFF9F0] text-xs font-semibold text-[#687386] hover:text-[#17345C] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#17345C] hover:bg-[#1f4275] text-[#FFF9F0] text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D9B66F]" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#D9B66F]" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
