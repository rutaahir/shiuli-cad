import React, { useState, useEffect } from 'react';
import { StaffMember } from '../../types';
import { api } from '../../services/api';
import { appStore } from '../../services/store';
import {
  Users,
  Sliders,
  Award,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface AdminStaffModuleProps {
  staffList?: StaffMember[];
  onUpdateStaffLimit: (staffId: string, newLimit: number) => void;
  onToggleStaffStatus: (staffId: string) => void;
  onAddStaff: (newStaff: StaffMember) => void;
  escalationTimerMinutes: number;
  onChangeEscalationTimer: (mins: number) => void;
  assignmentMode: 'first-accept' | 'least-loaded';
  onChangeAssignmentMode: (mode: 'first-accept' | 'least-loaded') => void;
}

export const AdminStaffModule: React.FC<AdminStaffModuleProps> = ({
  staffList: initialStaffList,
  onUpdateStaffLimit,
  onToggleStaffStatus,
  onAddStaff,
  escalationTimerMinutes,
  onChangeEscalationTimer,
  assignmentMode,
  onChangeAssignmentMode,
}) => {
  const [subTab, setSubTab] = useState<'all' | 'board' | 'rules' | 'performance'>('board');
  const [loadFilter, setLoadFilter] = useState<'all' | 'available' | 'full'>('all');
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  // Dynamic Staff List State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialtyTags, setSpecialtyTags] = useState('');
  const [maxJobLimit, setMaxJobLimit] = useState(2);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Form Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    general?: string;
  }>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Fetch Live Staff List from Backend on Mount
  const fetchStaffList = async () => {
    setIsLoadingStaff(true);
    try {
      const data: any = await api.getStaffList();
      const rawList = Array.isArray(data) ? data : (data?.results || []);
      const mapped: StaffMember[] = rawList.map((item: any) => ({
        id: item.id.toString(),
        name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.username,
        email: item.email,
        phone: item.phone_number || '+91 98765 00000',
        avatar: item.profile_photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        role: item.specialty_tags || 'CAD Modeller',
        status: item.is_active_staff ? 'active' : 'inactive',
        maxJobLimit: item.max_concurrent_jobs || 2,
        currentLoad: item.current_load || 0,
        jobsCompleted: item.total_jobs_completed || 0,
        rating: item.rating_average ? parseFloat(item.rating_average) : 5.0,
        totalEarnings: 0,
        activeJobs: [],
      }));
      setStaffMembers(mapped);
      appStore.saveStaffList(mapped);
    } catch {
      // Fallback to local store if API fails
      setStaffMembers(appStore.getStaffList());
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  // Password Generator
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let randPass = 'Shiuli@';
    for (let i = 0; i < 6; i++) {
      randPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(randPass);
    setShowPassword(true);
  };

  const copyPasswordToClipboard = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  // Client-Side Validation
  const validateForm = () => {
    const errors: typeof fieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full Name is required.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required.';
    }

    if (!password) {
      errors.password = 'Initial login password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submit Handler
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setFieldErrors({});

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const emailPrefix = email.trim().split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '_');
    const derivedUsername = emailPrefix || fullName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    try {
      await api.createStaff({
        username: derivedUsername,
        email: email.trim(),
        password: password,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber.trim(),
        max_concurrent_jobs: Number(maxJobLimit),
        specialty_tags: specialtyTags.trim() || 'CAD Modeller',
      });

      setSuccessToast(`${fullName} has been added to your team successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);

      // Reset form
      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setSpecialtyTags('');
      setMaxJobLimit(2);
      setPassword('');
      setShowAddDrawer(false);

      // Re-fetch live list
      await fetchStaffList();
    } catch (err: any) {
      if (err.fieldErrors) {
        const mappedErrors: typeof fieldErrors = {};
        if (err.fieldErrors.email) mappedErrors.email = err.fieldErrors.email[0];
        if (err.fieldErrors.username) mappedErrors.fullName = err.fieldErrors.username[0];
        if (err.fieldErrors.password) mappedErrors.password = err.fieldErrors.password[0];
        if (err.fieldErrors.phone_number) mappedErrors.phoneNumber = err.fieldErrors.phone_number[0];
        mappedErrors.general = err.message;
        setFieldErrors(mappedErrors);
      } else {
        setFieldErrors({ general: err.message || 'Failed to create staff member.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live Status Toggle
  const handleToggleStatus = async (staff: StaffMember) => {
    const newStatus = staff.status === 'active' ? false : true;
    try {
      await api.updateStaff(staff.id, { is_active_staff: newStatus });
      await fetchStaffList();
    } catch {
      onToggleStaffStatus(staff.id);
    }
  };

  // Live Limit Update
  const handleUpdateLimit = async (staffId: string, newLimit: number) => {
    try {
      await api.updateStaff(staffId, { max_concurrent_jobs: newLimit });
      await fetchStaffList();
    } catch {
      onUpdateStaffLimit(staffId, newLimit);
    }
  };

  const filteredBoardStaff = staffMembers.filter((s) => {
    if (loadFilter === 'available') return s.currentLoad < s.maxJobLimit;
    if (loadFilter === 'full') return s.currentLoad >= s.maxJobLimit;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#091029] border border-[#1F9D66]/50 text-[#FAF8F3] text-xs shadow-2xl animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 text-[#1F9D66] flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Staff & Job Limit Control Center
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Configure modeller job limits, view live capacity load boards, and set assignment rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#F6F7FB] p-1 rounded-xl border border-[#E5E7EF] text-xs font-semibold">
            <button
              onClick={() => setSubTab('board')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'board' ? 'bg-[#0D1B4C] text-white' : 'text-[#6B7280] hover:text-[#1E2230]'
              }`}
            >
              Load Board
            </button>
            <button
              onClick={() => setSubTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'all' ? 'bg-[#0D1B4C] text-white' : 'text-[#6B7280] hover:text-[#1E2230]'
              }`}
            >
              All Staff ({staffMembers.length})
            </button>
            <button
              onClick={() => setSubTab('rules')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'rules' ? 'bg-[#0D1B4C] text-white' : 'text-[#6B7280] hover:text-[#1E2230]'
              }`}
            >
              Assignment Rules
            </button>
            <button
              onClick={() => setSubTab('performance')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'performance' ? 'bg-[#0D1B4C] text-white' : 'text-[#6B7280] hover:text-[#1E2230]'
              }`}
            >
              Leaderboard
            </button>
          </div>

          <button
            onClick={() => setShowAddDrawer(true)}
            className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#0B1330]" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoadingStaff && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-[#E5E7EF] p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingStaff && staffMembers.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-12 text-center space-y-3">
          <Users className="w-12 h-12 text-[#D4AF37] mx-auto opacity-60" />
          <h3 className="font-serif text-lg font-bold text-[#1E2230]">No Staff Members Yet</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            Click "Add Staff" above to register your first CAD designer and grant them portal credentials.
          </p>
          <button
            onClick={() => setShowAddDrawer(true)}
            className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md"
          >
            Register First CAD Designer
          </button>
        </div>
      )}

      {/* Sub-tab B: Job Limits & Live Load Board */}
      {!isLoadingStaff && staffMembers.length > 0 && subTab === 'board' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#1E2230] flex items-center gap-2">
              <span>Live Modeller Capacity Grid</span>
              <span className="text-[10px] font-mono text-[#6B7280]">
                (Filled dots = Active accepted designs)
              </span>
            </div>

            <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-[#E5E7EF] text-xs">
              <span className="text-[#6B7280] font-mono">Filter:</span>
              <button
                onClick={() => setLoadFilter('all')}
                className={`px-2 py-0.5 rounded ${
                  loadFilter === 'all' ? 'font-bold text-[#0D1B4C]' : 'text-[#6B7280]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setLoadFilter('available')}
                className={`px-2 py-0.5 rounded ${
                  loadFilter === 'available' ? 'font-bold text-[#1F9D66]' : 'text-[#6B7280]'
                }`}
              >
                Available Only
              </button>
              <button
                onClick={() => setLoadFilter('full')}
                className={`px-2 py-0.5 rounded ${
                  loadFilter === 'full' ? 'font-bold text-[#D14343]' : 'text-[#6B7280]'
                }`}
              >
                Full Only
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoardStaff.map((staff) => {
              const isFull = staff.currentLoad >= staff.maxJobLimit;

              return (
                <div
                  key={staff.id}
                  className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4 hover:border-[#C9A227]/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={staff.avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#0D1B4C]"
                        />
                        <div>
                          <h3 className="font-bold text-sm text-[#1E2230]">{staff.name}</h3>
                          <p className="text-[11px] text-[#6B7280]">{staff.role}</p>
                        </div>
                      </div>

                      {isFull ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#D14343]/10 text-[#D14343] font-bold text-[10px] uppercase">
                          🔴 FULL
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-[#1F9D66]/10 text-[#1F9D66] font-bold text-[10px] uppercase animate-pulse">
                          🟢 AVAILABLE
                        </span>
                      )}
                    </div>

                    {/* Circular Slots Indicator */}
                    <div className="p-4 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#6B7280]">Capacity Slot Indicator</span>
                        <span className="font-bold text-[#1E2230]">
                          {staff.currentLoad} / {staff.maxJobLimit} slots filled
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {Array.from({ length: staff.maxJobLimit }).map((_, idx) => {
                          const isFilled = idx < staff.currentLoad;
                          return (
                            <div
                              key={idx}
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold transition-all duration-300 ${
                                isFilled
                                  ? 'bg-[#0D1B4C] text-[#C9A227] shadow-md border-2 border-[#C9A227] scale-105'
                                  : 'bg-white border-2 border-[#E5E7EF] text-[#6B7280]'
                              }`}
                            >
                              {isFilled ? '●' : '○'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Inline Limit Adjuster Stepper (+ / -) */}
                  <div className="pt-3 border-t border-[#E5E7EF] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#6B7280]">Max Limit:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleUpdateLimit(staff.id, Math.max(1, staff.maxJobLimit - 1))
                        }
                        className="w-7 h-7 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] font-bold text-xs hover:bg-[#E5E7EF]"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-sm text-[#1E2230]">
                        {staff.maxJobLimit}
                      </span>
                      <button
                        onClick={() =>
                          handleUpdateLimit(staff.id, staff.maxJobLimit + 1)
                        }
                        className="w-7 h-7 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] font-bold text-xs hover:bg-[#E5E7EF]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-tab A: All Staff List */}
      {!isLoadingStaff && staffMembers.length > 0 && subTab === 'all' && (
        <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F6F7FB] border-b border-[#E5E7EF] text-[#6B7280] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Staff Member</th>
                  <th className="py-3.5 px-4 font-semibold">Contact</th>
                  <th className="py-3.5 px-4 font-semibold">Specialization</th>
                  <th className="py-3.5 px-4 font-semibold">Live Load / Limit</th>
                  <th className="py-3.5 px-4 font-semibold">Rating</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EF]">
                {staffMembers.map((staff) => (
                  <tr key={staff.id} className="hover:bg-[#F6F7FB]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={staff.avatar}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-[#E5E7EF]"
                        />
                        <div>
                          <div className="font-bold text-[#1E2230]">{staff.name}</div>
                          <div className="text-[10px] text-[#6B7280]">ID: #{staff.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[#1E2230]">{staff.email}</div>
                      <div className="text-[10px] text-[#6B7280]">{staff.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-[#F6F7FB] border border-[#E5E7EF] font-medium text-[#1E2230]">
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-[#1E2230]">
                        {staff.currentLoad} / {staff.maxJobLimit}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-bold text-[#1E2230]">
                        <span className="text-[#C9A227]">★</span>
                        <span>{staff.rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                          staff.status === 'active'
                            ? 'bg-[#1F9D66]/10 text-[#1F9D66]'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                      >
                        {staff.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleUpdateLimit(staff.id, staff.maxJobLimit + 1)}
                        className="p-1.5 rounded-lg border border-[#E5E7EF] text-[#6B7280] hover:text-[#1E2230] hover:bg-[#F6F7FB]"
                        title="Increase Limit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PART 1 — FIX THE "REGISTER NEW CAD MODELLER" DRAWER FORM */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-250 text-[#1E2230]">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1E2230]">
                  Register New CAD Modeller
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Creates a real staff user account connected to Django API with login credentials.
                </p>
              </div>
              <button
                onClick={() => setShowAddDrawer(false)}
                className="text-[#6B7280] hover:text-[#1E2230] p-1.5 rounded-lg hover:bg-[#F6F7FB]"
              >
                ✕
              </button>
            </div>

            {/* General Error Banner */}
            {fieldErrors.general && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{fieldErrors.general}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              {/* Full Name */}
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Salim Merchant"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7FB] border ${
                    fieldErrors.fullName ? 'border-rose-500' : 'border-[#E5E7EF]'
                  } focus:outline-none focus:border-[#0D1B4C] text-xs`}
                />
                {fieldErrors.fullName && (
                  <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="salim@shiuli.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7FB] border ${
                    fieldErrors.email ? 'border-rose-500' : 'border-[#E5E7EF]'
                  } focus:outline-none focus:border-[#0D1B4C] text-xs`}
                />
                {fieldErrors.email && (
                  <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7FB] border ${
                    fieldErrors.phoneNumber ? 'border-rose-500' : 'border-[#E5E7EF]'
                  } focus:outline-none focus:border-[#0D1B4C] text-xs`}
                />
                {fieldErrors.phoneNumber && (
                  <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.phoneNumber}</p>
                )}
              </div>

              {/* Specialization Role Tags */}
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">
                  Specialization Tags / Role
                </label>
                <input
                  type="text"
                  value={specialtyTags}
                  onChange={(e) => setSpecialtyTags(e.target.value)}
                  placeholder="e.g. Diamond Setting, Temple Jewellery, 3D Rhino"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] focus:outline-none focus:border-[#0D1B4C] text-xs"
                />
              </div>

              {/* Initial Max Concurrent Job Limit */}
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">
                  Initial Max Concurrent Job Limit
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={maxJobLimit}
                  onChange={(e) => setMaxJobLimit(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] focus:outline-none font-mono font-bold text-xs"
                />
              </div>

              {/* Set Initial Password & Random Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#1E2230]">
                    Set Initial Login Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-[#0D1B4C] font-semibold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3 text-[#C9A227]" />
                    Generate Random
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set password for staff login"
                    className={`w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-[#F6F7FB] border ${
                      fieldErrors.password ? 'border-rose-500' : 'border-[#E5E7EF]'
                    } focus:outline-none focus:border-[#0D1B4C] text-xs font-mono`}
                  />

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-[#6B7280] hover:text-[#1E2230]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    {password && (
                      <button
                        type="button"
                        onClick={copyPasswordToClipboard}
                        className="p-1 text-[#6B7280] hover:text-[#1E2230]"
                        title="Copy Password"
                      >
                        {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {fieldErrors.password && (
                  <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.password}</p>
                )}
                {password && showPassword && (
                  <p className="text-[10px] text-[#6B7280] mt-1 font-mono">
                    Share this initial credential with staff member: <strong className="text-[#0D1B4C]">{password}</strong>
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-[#E5E7EF]">
                <button
                  type="button"
                  onClick={() => setShowAddDrawer(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-[#E5E7EF] text-[#1E2230] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold-luxury px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B1330]" />
                      <span>Registering Staff...</span>
                    </>
                  ) : (
                    <span>Register Staff</span>
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
