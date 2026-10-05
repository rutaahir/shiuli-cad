import React, { useState, useEffect } from 'react';
import { StaffMember } from '../../types';
import { api } from '../../services/api';
import { appStore } from '../../services/store';
import { getOptimizedImageUrl } from '../../utils/imageHelper';
import { AdminDesignerApplicationsSection } from './AdminDesignerApplicationsSection';
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
  Briefcase,
  ArrowRight,
  UserMinus,
  UserCheck,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ExternalLink,
  Download,
  FileText,
  ShieldCheck,
  X,
  Globe,
  Star,
  MessageSquare,
} from 'lucide-react';

interface AdminStaffModuleProps {
  staffList?: StaffMember[];
  onUpdateStaffLimit: (staffId: string, newLimit: number) => void;
  onToggleStaffStatus: (staffId: string) => void;
  onAddStaff: (newStaff: StaffMember) => void;
  onDeleteStaff?: (staffId: string) => void;
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
  onDeleteStaff,
  escalationTimerMinutes,
  onChangeEscalationTimer,
  assignmentMode,
  onChangeAssignmentMode,
}) => {
  const [subTab, setSubTab] = useState<'board' | 'all' | 'rules' | 'performance' | 'applications'>('board');
  const [loadFilter, setLoadFilter] = useState<'all' | 'available' | 'full'>('all');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [pendingDesignerAppsCount, setPendingDesignerAppsCount] = useState<number>(0);

  useEffect(() => {
    api.getDesignerApplications('pending').then((apps) => {
      setPendingDesignerAppsCount(apps.length);
    }).catch(() => {});
  }, [subTab]);

  // Dynamic Staff List State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    if (initialStaffList && initialStaffList.length > 0) return initialStaffList;
    return appStore.getStaffList();
  });
  const [isLoadingStaff, setIsLoadingStaff] = useState(() => {
    const initial = (initialStaffList && initialStaffList.length > 0) ? initialStaffList : appStore.getStaffList();
    return initial.length === 0;
  });

  // Deletion state
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Assigned Jobs Drawer State
  const [selectedStaffForJobs, setSelectedStaffForJobs] = useState<StaffMember | null>(null);
  const [reassigningJobId, setReassigningJobId] = useState<number | null>(null);
  const [targetModellerId, setTargetModellerId] = useState<string>('');
  const [isReassignSubmitting, setIsReassignSubmitting] = useState(false);
  const [updatingLimitId, setUpdatingLimitId] = useState<string | null>(null);

  // Staff Profile Dossier Right Sidebar State
  const [inspectingStaff, setInspectingStaff] = useState<StaffMember | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff || isDeleting) return;
    setIsDeleting(true);
    const targetId = deletingStaff.id;
    const targetName = deletingStaff.name;

    try {
      // 1. Local & appStore update
      const updated = appStore.deleteStaff(targetId);
      setStaffMembers(updated);
      if (onDeleteStaff) onDeleteStaff(targetId);
      if (inspectingStaff?.id === targetId) {
        setInspectingStaff(null);
      }

      // 2. Call backend API endpoint if connected
      try {
        await api.deleteStaff(targetId);
      } catch (apiErr) {
        console.warn('Backend deleteStaff API call warning:', apiErr);
      }

      setSuccessToast(`Staff member "${targetName}" has been permanently deleted.`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete staff member.');
    } finally {
      setIsDeleting(false);
      setDeletingStaff(null);
    }
  };

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

  // Sync with initialStaffList prop if it updates
  useEffect(() => {
    if (initialStaffList && initialStaffList.length > 0) {
      setStaffMembers(initialStaffList);
    }
  }, [initialStaffList]);

  // Real-time synchronization when staff updates profile photo or details
  useEffect(() => {
    const handleStaffSync = (e: any) => {
      const updatedList = e?.detail || appStore.getStaffList();
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        setStaffMembers(updatedList);
      }
    };
    window.addEventListener('shiuli_staff_updated', handleStaffSync);
    window.addEventListener('storage', handleStaffSync);
    return () => {
      window.removeEventListener('shiuli_staff_updated', handleStaffSync);
      window.removeEventListener('storage', handleStaffSync);
    };
  }, []);

  // Fetch Live Staff List from Backend on Mount
  const fetchStaffList = async () => {
    try {
      const data: any = await api.getStaffList();
      const rawList = Array.isArray(data) ? data : (data?.results || []);
      const stored = appStore.getStaffList();
      if (rawList.length > 0) {
        const mapped: StaffMember[] = rawList.map((item: any) => {
          const localMatch = stored.find(
            (s) => s.id === item.id?.toString() || (s.email && s.email.toLowerCase() === item.email?.toLowerCase())
          );
          return {
            id: item.id.toString(),
            username: item.username,
            name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.username,
            email: item.email,
            phone: item.phone_number || '+91 98765 00000',
            avatar: item.profile_photo || localMatch?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
            role: item.specialty_tags || 'CAD Modeller',
            status: item.is_active_staff ? 'active' : 'inactive',
            maxJobLimit: item.max_concurrent_jobs || 2,
            currentLoad: item.current_load || 0,
            jobsCompleted: item.total_jobs_completed || 0,
            rating: item.rating_average ? parseFloat(item.rating_average) : 5.0,
            totalEarnings: 0,
            dateJoined: item.date_joined,
            bio: item.bio,
            registrationDetails: item.registration_details,
            activeJobs: item.active_jobs || [],
          };
        });
        setStaffMembers(mapped);
        appStore.saveStaffList(mapped);
      } else {
        if (stored.length > 0) {
          setStaffMembers(stored);
        }
      }
    } catch (err) {
      console.warn('api.getStaffList fallback to appStore:', err);
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
    const derivedUsername = `${emailPrefix}_${Math.floor(100 + Math.random() * 900)}`;

    let apiResult: any = null;
    let hasFieldErrors = false;

    try {
      apiResult = await api.createStaff({
        username: derivedUsername,
        email: email.trim(),
        password: password,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber.trim(),
        max_concurrent_jobs: Number(maxJobLimit),
        specialty_tags: specialtyTags.trim() || 'CAD Modeller',
      });
    } catch (apiErr: any) {
      console.warn('Backend API createStaff warning, completing via local store fallback:', apiErr);
      if (apiErr?.fieldErrors) {
        const mappedErrors: typeof fieldErrors = {};
        if (apiErr.fieldErrors.email) mappedErrors.email = apiErr.fieldErrors.email[0];
        if (apiErr.fieldErrors.username) mappedErrors.fullName = apiErr.fieldErrors.username[0];
        if (apiErr.fieldErrors.password) mappedErrors.password = apiErr.fieldErrors.password[0];
        if (apiErr.fieldErrors.phone_number) mappedErrors.phoneNumber = apiErr.fieldErrors.phone_number[0];
        if (Object.keys(mappedErrors).length > 0) {
          hasFieldErrors = true;
          setFieldErrors(mappedErrors);
          setIsSubmitting(false);
          return;
        }
      }
    }

    if (hasFieldErrors) return;

    try {
      const res = apiResult;
      const newMember: StaffMember = {
        id: (res?.id || `STF-${Date.now()}`).toString(),
        name: `${res?.first_name || firstName} ${res?.last_name || lastName}`.trim() || derivedUsername,
        email: res?.email || email.trim(),
        phone: res?.phone_number || phoneNumber.trim(),
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        role: specialtyTags.trim() || 'CAD Modeller',
        status: 'active',
        maxJobLimit: Number(maxJobLimit) || 2,
        currentLoad: 0,
        jobsCompleted: 0,
        rating: 5.0,
        totalEarnings: 0,
        activeJobs: [],
      };

      // Register account in appStore for login verification
      appStore.saveUserAccount({
        email: email.trim(),
        username: derivedUsername,
        password: password,
        role: 'staff',
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber.trim(),
      });

      // Update staff list cleanly through store deduplication
      const updated = appStore.addStaff(newMember);
      setStaffMembers(updated);
      onAddStaff(newMember);

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

      // Try re-fetching live list if API available
      fetchStaffList().catch(() => {});
    } catch (err: any) {
      setFieldErrors({ general: err.message || 'Failed to create staff member.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live Status Toggle
  const handleToggleStatus = async (staff: StaffMember) => {
    const newStatusBool = staff.status !== 'active';
    const newStatusStr = newStatusBool ? 'active' : 'inactive';
    const previousStaff = [...staffMembers];
    const updatedStaff = staffMembers.map((s) =>
      s.id === staff.id ? { ...s, status: newStatusStr as 'active' | 'inactive' } : s
    );
    setStaffMembers(updatedStaff);
    if (inspectingStaff?.id === staff.id) {
      setInspectingStaff((prev) => (prev ? { ...prev, status: newStatusStr as 'active' | 'inactive' } : null));
    }
    appStore.saveStaffList(updatedStaff);
    onToggleStaffStatus(staff.id);

    try {
      await api.updateStaff(staff.id, { is_active_staff: newStatusBool });
    } catch (err) {
      console.warn('Backend toggle status failed, reverting:', err);
      setStaffMembers(previousStaff);
      if (inspectingStaff?.id === staff.id) {
        setInspectingStaff((prev) => (prev ? { ...prev, status: staff.status } : null));
      }
      appStore.saveStaffList(previousStaff);
      onToggleStaffStatus(staff.id);
    }
  };

  // Live Limit Update with Optimistic UI & Parent State Sync
  const handleUpdateLimit = async (staffId: string, newLimit: number) => {
    const safeLimit = Math.max(1, Math.min(20, newLimit));
    const currentStaff = staffMembers.find((s) => s.id === staffId);
    if (!currentStaff || currentStaff.maxJobLimit === safeLimit) return;

    setUpdatingLimitId(staffId);

    // 1. Optimistically update local view and localStorage
    const updatedStaff = staffMembers.map((s) =>
      s.id === staffId ? { ...s, maxJobLimit: safeLimit } : s
    );
    setStaffMembers(updatedStaff);
    if (inspectingStaff?.id === staffId) {
      setInspectingStaff((prev) => (prev ? { ...prev, maxJobLimit: safeLimit } : null));
    }
    appStore.saveStaffList(updatedStaff);
    // 2. Notify SuperAdminPage parent state
    onUpdateStaffLimit(staffId, safeLimit);

    try {
      await api.updateStaff(staffId, { max_concurrent_jobs: safeLimit });
      setSuccessToast(`Job limit updated to ${safeLimit} for ${currentStaff.name}`);
      setTimeout(() => setSuccessToast(null), 2500);
    } catch (err: any) {
      console.error('Backend updateStaff limit failed:', err);
      // Keep optimistic update in localStorage but show error toast
      setSuccessToast(`⚠ Limit updated locally — backend sync failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setSuccessToast(null), 4000);
    } finally {
      setUpdatingLimitId(null);
    }
  };

  const handleOpenStaffJobs = (staff: StaffMember) => {
    setSelectedStaffForJobs(staff);
    setReassigningJobId(null);
    setTargetModellerId('');
  };

  const handleReassignJob = async (orderId: number, newStaffId: string | null) => {
    setIsReassignSubmitting(true);
    try {
      await api.request(`/orders/${orderId}/reassign/`, {
        method: 'POST',
        body: JSON.stringify({ staff_id: newStaffId }),
      });
      setSuccessToast(newStaffId ? 'Job reassigned to modeller successfully!' : 'Job released back to open pool.');
      setTimeout(() => setSuccessToast(null), 4000);
      setReassigningJobId(null);
      setTargetModellerId('');
      // Refresh staff list
      await fetchStaffList();
      // Also update selectedStaffForJobs with fresh data
      const freshData: any = await api.getStaffList();
      const raw = Array.isArray(freshData) ? freshData : (freshData?.results || []);
      const current = raw.find((s: any) => s.id.toString() === selectedStaffForJobs?.id);
      if (current) {
        setSelectedStaffForJobs(prev => prev ? {
          ...prev,
          currentLoad: current.current_load || 0,
          activeJobs: current.active_jobs || [],
        } : null);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to reassign job.');
    } finally {
      setIsReassignSubmitting(false);
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
            <button
              onClick={() => setSubTab('applications')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === 'applications' ? 'bg-[#0D1B4C] text-white' : 'text-[#6B7280] hover:text-[#1E2230]'
              }`}
            >
              <span>Applications</span>
              {pendingDesignerAppsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full font-mono text-[10px] bg-[#C9A227] text-[#0D1B4C] font-bold animate-pulse">
                  {pendingDesignerAppsCount}
                </span>
              )}
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

      {/* Sub-tab: Designer Applications Queue */}
      {subTab === 'applications' && (
        <AdminDesignerApplicationsSection />
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
                  className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4 hover:border-[#C9A227] hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {/* Clickable Profile Card Header to open dossier sidebar */}
                      <button
                        type="button"
                        onClick={() => setInspectingStaff(staff)}
                        className="flex items-center gap-3 text-left group/profile focus:outline-hidden cursor-pointer flex-1 mr-2"
                        title="Click to view full registration details & dossier"
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={getOptimizedImageUrl(staff.avatar)}
                            alt={staff.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
                            }}
                            className="w-11 h-11 rounded-full object-cover border-2 border-[#0D1B4C] group-hover/profile:border-[#C9A227] group-hover/profile:scale-105 transition-all shadow-sm"
                          />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#C9A227] text-[#0D1B4C] rounded-full flex items-center justify-center text-[9px] shadow-sm">
                            <Eye className="w-2.5 h-2.5" />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-sm text-[#1E2230] group-hover/profile:text-[#C9A227] transition-colors truncate">
                              {staff.name}
                            </h3>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#E5E7EF] text-[#6B7280] group-hover/profile:border-[#C9A227]/70 group-hover/profile:text-[#0D1B4C] font-semibold tracking-wide flex items-center gap-0.5">
                              DETAILS →
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6B7280] truncate">{staff.role}</p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isFull ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#D14343]/10 text-[#D14343] font-bold text-[10px] uppercase">
                            🔴 FULL
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-[#1F9D66]/10 text-[#1F9D66] font-bold text-[10px] uppercase animate-pulse">
                            🟢 AVAILABLE
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingStaff(staff);
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 transition-all cursor-pointer shadow-sm"
                          title="Permanently Delete Staff Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

                    <button
                      onClick={() => handleOpenStaffJobs(staff)}
                      className="w-full py-2 px-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] hover:bg-[#E5E7EF] font-semibold text-xs text-[#0D1B4C] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-[#C9A227]" />
                      <span>Manage Assigned Jobs ({staff.currentLoad})</span>
                    </button>
                  </div>

                  {/* Inline Limit Adjuster Stepper (+ / -) */}
                  <div className="pt-3 border-t border-[#E5E7EF] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#6B7280]">Max Limit:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleUpdateLimit(staff.id, staff.maxJobLimit - 1);
                        }}
                        disabled={staff.maxJobLimit <= 1 || updatingLimitId === staff.id}
                        className="w-7 h-7 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] font-bold text-xs hover:bg-[#0D1B4C] hover:text-white hover:border-[#0D1B4C] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-90 flex items-center justify-center"
                        title="Decrease job limit"
                      >
                        {updatingLimitId === staff.id ? '·' : '−'}
                      </button>
                      <span className={`font-mono font-bold text-sm min-w-[24px] text-center transition-colors duration-200 ${updatingLimitId === staff.id ? 'text-[#C9A227]' : 'text-[#1E2230]'}`}>
                        {staff.maxJobLimit}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleUpdateLimit(staff.id, staff.maxJobLimit + 1);
                        }}
                        disabled={staff.maxJobLimit >= 20 || updatingLimitId === staff.id}
                        className="w-7 h-7 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] font-bold text-xs hover:bg-[#0D1B4C] hover:text-white hover:border-[#0D1B4C] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-90 flex items-center justify-center"
                        title="Increase job limit"
                      >
                        {updatingLimitId === staff.id ? '·' : '+'}
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
                  <th className="py-3.5 px-4 font-semibold text-right">Job Limit (+ / -)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EF]">
                {staffMembers.map((staff) => (
                  <tr
                    key={staff.id}
                    onClick={() => setInspectingStaff(staff)}
                    className="hover:bg-[#F6F7FB]/70 transition-colors cursor-pointer group"
                    title="Click row to view staff registration dossier"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getOptimizedImageUrl(staff.avatar)}
                          alt={staff.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
                          }}
                          className="w-9 h-9 rounded-full object-cover border border-[#E5E7EF] group-hover:border-[#C9A227] transition-colors"
                        />
                        <div>
                          <div className="font-bold text-[#1E2230] group-hover:text-[#C9A227] transition-colors flex items-center gap-1.5">
                            <span>{staff.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#E5E7EF] text-[#6B7280] font-mono">
                              PROFILE →
                            </span>
                          </div>
                          <div className="text-[10px] text-[#6B7280]">ID: #{staff.id} • @{staff.username || 'staff'}</div>
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
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1E2230]">
                          {staff.currentLoad} / {staff.maxJobLimit}
                        </span>
                        <button
                          onClick={() => handleOpenStaffJobs(staff)}
                          className="px-2 py-0.5 rounded bg-[#F6F7FB] border border-[#E5E7EF] hover:bg-[#0D1B4C] hover:text-white font-semibold text-[10px] text-[#0D1B4C] transition-colors"
                          title="Manage Active Jobs"
                        >
                          Jobs ({staff.currentLoad})
                        </button>
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
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleUpdateLimit(staff.id, staff.maxJobLimit - 1);
                          }}
                          disabled={staff.maxJobLimit <= 1 || updatingLimitId === staff.id}
                          className="w-7 h-7 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] font-bold text-xs hover:bg-[#0D1B4C] hover:text-white hover:border-[#0D1B4C] text-[#6B7280] flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Decrease Limit"
                        >
                          {updatingLimitId === staff.id ? '·' : '−'}
                        </button>
                        <span className={`font-mono font-bold text-xs min-w-[24px] text-center transition-colors duration-200 ${updatingLimitId === staff.id ? 'text-[#C9A227]' : 'text-[#1E2230]'}`}>
                          {staff.maxJobLimit}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleUpdateLimit(staff.id, staff.maxJobLimit + 1);
                          }}
                          disabled={staff.maxJobLimit >= 20 || updatingLimitId === staff.id}
                          className="w-7 h-7 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] font-bold text-xs hover:bg-[#0D1B4C] hover:text-white hover:border-[#0D1B4C] text-[#6B7280] flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Increase Limit"
                        >
                          {updatingLimitId === staff.id ? '·' : '+'}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingStaff(staff);
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 transition-all cursor-pointer ml-1.5 shadow-sm"
                          title="Permanently Delete Staff Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* PART 2 — ASSIGNED JOBS MANAGEMENT DRAWER */}
      {selectedStaffForJobs && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-250 text-[#1E2230]">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={getOptimizedImageUrl(selectedStaffForJobs.avatar)}
                  alt={selectedStaffForJobs.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
                  }}
                  className="w-11 h-11 rounded-full object-cover border-2 border-[#0D1B4C]"
                />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1E2230]">
                    {selectedStaffForJobs.name}
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    {selectedStaffForJobs.role} • <span className="font-mono font-bold text-[#0D1B4C]">{selectedStaffForJobs.currentLoad} / {selectedStaffForJobs.maxJobLimit} Jobs</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffForJobs(null)}
                className="text-[#6B7280] hover:text-[#1E2230] p-1.5 rounded-lg hover:bg-[#F6F7FB]"
              >
                ✕
              </button>
            </div>

            {/* Capacity Banner */}
            <div className="p-3.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#C9A227]" />
                <span className="font-medium text-[#1E2230]">Current Assigned Workbench</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                selectedStaffForJobs.currentLoad >= selectedStaffForJobs.maxJobLimit
                  ? 'bg-rose-500/10 text-rose-600'
                  : 'bg-emerald-500/10 text-emerald-600'
              }`}>
                {selectedStaffForJobs.currentLoad >= selectedStaffForJobs.maxJobLimit ? 'Full Capacity' : 'Available for Work'}
              </span>
            </div>

            {/* Job List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] font-mono">
                Active Assigned Designs ({selectedStaffForJobs.activeJobs?.length || 0})
              </h4>

              {(!selectedStaffForJobs.activeJobs || selectedStaffForJobs.activeJobs.length === 0) ? (
                <div className="p-8 text-center bg-[#F6F7FB] rounded-2xl border border-dashed border-[#E5E7EF] space-y-2">
                  <Briefcase className="w-8 h-8 text-[#6B7280] mx-auto opacity-50" />
                  <p className="font-medium text-xs text-[#1E2230]">No Active Jobs Assigned</p>
                  <p className="text-[11px] text-[#6B7280] max-w-xs mx-auto">
                    This modeller currently has no active custom CAD jobs on their workbench. They are ready to claim designs from the open job pool.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedStaffForJobs.activeJobs.map((job: any) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-xl bg-white border border-[#E5E7EF] shadow-sm space-y-3 hover:border-[#C9A227]/40 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#0D1B4C]">#{job.id}</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">
                              {job.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <h5 className="font-bold text-xs text-[#1E2230] mt-1">{job.title}</h5>
                          <p className="text-[11px] text-[#6B7280]">
                            Client: {job.client_name} ({job.client_email})
                          </p>
                        </div>
                      </div>

                      {/* Reassignment Controls */}
                      {reassigningJobId === job.id ? (
                        <div className="p-3 bg-[#F6F7FB] rounded-xl border border-[#E5E7EF] space-y-2">
                          <label className="text-[11px] font-semibold text-[#1E2230] block">
                            Select New CAD Modeller:
                          </label>
                          <select
                            value={targetModellerId}
                            onChange={(e) => setTargetModellerId(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EF] rounded-lg focus:outline-none focus:border-[#0D1B4C]"
                          >
                            <option value="">-- Choose Modeller --</option>
                            {staffMembers
                              .filter((s) => s.id !== selectedStaffForJobs.id)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.currentLoad}/{s.maxJobLimit} jobs)
                                </option>
                              ))}
                          </select>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => setReassigningJobId(null)}
                              disabled={isReassignSubmitting}
                              className="px-2.5 py-1 text-[11px] text-[#6B7280] hover:text-[#1E2230]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleReassignJob(job.id, targetModellerId)}
                              disabled={!targetModellerId || isReassignSubmitting}
                              className="btn-gold-luxury px-3 py-1 text-[11px] font-bold rounded-lg uppercase disabled:opacity-50"
                            >
                              {isReassignSubmitting ? 'Reassigning...' : 'Confirm Reassign'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EF] text-xs">
                          <button
                            onClick={() => {
                              setReassigningJobId(job.id);
                              setTargetModellerId('');
                            }}
                            className="text-[#0D1B4C] hover:text-[#C9A227] font-semibold flex items-center gap-1 text-[11px] transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Reassign Modeller</span>
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Release Order #${job.id} back to the unassigned open pool?`)) {
                                handleReassignJob(job.id, null);
                              }
                            }}
                            disabled={isReassignSubmitting}
                            className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 text-[11px] transition-colors"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Release to Open Pool</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E5E7EF] flex justify-end">
              <button
                onClick={() => setSelectedStaffForJobs(null)}
                className="px-4 py-2 bg-[#F6F7FB] hover:bg-[#E5E7EF] text-[#1E2230] rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STAFF PROFILE & REGISTRATION DOSSIER RIGHT SIDEBAR DRAWER */}
      {/* ======================================================== */}
      {inspectingStaff && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setInspectingStaff(null)}
        >
          <div
            className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-[#C9A227]/30 text-[#1E2230] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Navy & Gold Luxury Header */}
            <div className="bg-[#0D1B4C] text-[#FAF8F3] p-6 border-b border-[#C9A227]/30 relative flex-shrink-0">
              {/* Close Button */}
              <button
                onClick={() => setInspectingStaff(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#FAF8F3] flex items-center justify-center transition-all cursor-pointer border border-white/10"
                title="Close Sidebar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C9A227]/20 border border-[#C9A227]/40 text-[#C9A227] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-[#C9A227]" />
                  Staff Registration Dossier
                </span>
                <span className="text-[10px] font-mono text-white/50">
                  ID: #{inspectingStaff.id}
                </span>
              </div>

              {/* Profile Card Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={getOptimizedImageUrl(inspectingStaff.avatar)}
                      alt={inspectingStaff.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
                      }}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C9A227] shadow-xl"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0D1B4C] ${
                        inspectingStaff.status === 'active' ? 'bg-[#1F9D66]' : 'bg-rose-500'
                      }`}
                      title={inspectingStaff.status === 'active' ? 'Active Modeller' : 'Inactive'}
                    />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-[#FAF8F3] leading-tight">
                      {inspectingStaff.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#C9A227] font-mono font-medium">
                        @{inspectingStaff.username || `modeller_${inspectingStaff.id}`}
                      </span>
                      <span className="text-white/30">•</span>
                      <span className="text-xs text-white/70">
                        {inspectingStaff.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle & Quick WhatsApp / Email */}
                <div className="flex sm:flex-col items-end gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleStatus(inspectingStaff)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      inspectingStaff.status === 'active'
                        ? 'bg-[#1F9D66]/20 border border-[#1F9D66]/50 text-[#34D399] hover:bg-[#1F9D66]/30'
                        : 'bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500/30'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    <span>{inspectingStaff.status === 'active' ? 'Status: Active' : 'Status: Inactive'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {inspectingStaff.phone && (
                      <a
                        href={`https://wa.me/${inspectingStaff.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] text-[10px] font-semibold flex items-center gap-1 transition-all"
                        title="Open WhatsApp Chat"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {inspectingStaff.email && (
                      <a
                        href={`mailto:${inspectingStaff.email}`}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-semibold flex items-center gap-1 transition-all"
                        title="Send Direct Email"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF9F5]">
              {/* CAPACITY & JOB LIMIT CONTROLLER */}
              <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#C9A227]" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E2230]">
                      Live Capacity & Concurrent Job Limit
                    </h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    inspectingStaff.currentLoad >= inspectingStaff.maxJobLimit
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {inspectingStaff.currentLoad >= inspectingStaff.maxJobLimit ? 'Max Capacity Reached' : 'Slots Available'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-[#F6F7FB] p-4 rounded-xl border border-[#E5E7EF]">
                  <div className="space-y-1.5">
                    <div className="text-xs text-[#6B7280] font-mono">
                      Current Load: <strong className="text-[#1E2230]">{inspectingStaff.currentLoad}</strong> / {inspectingStaff.maxJobLimit} orders
                    </div>
                    {/* Dots indicator */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {Array.from({ length: inspectingStaff.maxJobLimit }).map((_, idx) => {
                        const isFilled = idx < inspectingStaff.currentLoad;
                        return (
                          <div
                            key={idx}
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold transition-all ${
                              isFilled
                                ? 'bg-[#0D1B4C] text-[#C9A227] shadow-xs border-2 border-[#C9A227]'
                                : 'bg-white border-2 border-[#E5E7EF] text-[#6B7280]'
                            }`}
                          >
                            {isFilled ? '●' : '○'}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5">
                    <span className="text-[11px] text-[#6B7280] font-medium">Adjust Max Concurrency:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateLimit(inspectingStaff.id, inspectingStaff.maxJobLimit - 1)}
                        disabled={inspectingStaff.maxJobLimit <= 1 || updatingLimitId === inspectingStaff.id}
                        className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EF] font-bold text-sm hover:bg-[#0D1B4C] hover:text-white hover:border-[#0D1B4C] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center active:scale-95"
                        title="Decrease Limit"
                      >
                        −
                      </button>
                      <span className="font-mono font-bold text-base min-w-[32px] text-center text-[#1E2230]">
                        {inspectingStaff.maxJobLimit}
                      </span>
                      <button
                        onClick={() => handleUpdateLimit(inspectingStaff.id, inspectingStaff.maxJobLimit + 1)}
                        disabled={inspectingStaff.maxJobLimit >= 20 || updatingLimitId === inspectingStaff.id}
                        className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EF] font-bold text-sm hover:bg-[#0D1B4C] hover:text-white hover:border-[#0D1B4C] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center active:scale-95"
                        title="Increase Limit"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metrics ribbon */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E7EF] text-center">
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Jobs Finished</div>
                    <div className="font-mono font-bold text-base text-[#1E2230] mt-0.5">
                      {inspectingStaff.jobsCompleted}
                    </div>
                  </div>
                  <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E7EF] text-center">
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Client Rating</div>
                    <div className="font-mono font-bold text-base text-[#1E2230] mt-0.5 flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#C9A227] text-[#C9A227]" />
                      <span>{inspectingStaff.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E7EF] text-center">
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Active In Flight</div>
                    <div className="font-mono font-bold text-base text-[#0D1B4C] mt-0.5">
                      {inspectingStaff.currentLoad}
                    </div>
                  </div>
                </div>
              </div>

              {/* REGISTRATION DOSSIER: PERSONAL & CONTACT */}
              <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#C9A227]" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E2230]">
                      Registration Record & Contact Details
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#6B7280]">
                    Registered: {inspectingStaff.registrationDetails?.applied_at
                      ? new Date(inspectingStaff.registrationDetails.applied_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                      : inspectingStaff.dateJoined
                        ? new Date(inspectingStaff.dateJoined).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Verified Atelier Staff'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* First Name & Last Name */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-[#6B7280] uppercase">Legal First Name</div>
                    <div className="font-medium text-[#1E2230] bg-[#F6F7FB] px-3 py-2 rounded-xl border border-[#E5E7EF] flex items-center justify-between">
                      <span>{inspectingStaff.registrationDetails?.first_name || inspectingStaff.name.split(' ')[0] || '—'}</span>
                      <button
                        onClick={() => handleCopyText(inspectingStaff.registrationDetails?.first_name || inspectingStaff.name.split(' ')[0] || '', 'first_name')}
                        className="text-[#6B7280] hover:text-[#0D1B4C]"
                        title="Copy"
                      >
                        {copiedField === 'first_name' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-[#6B7280] uppercase">Legal Last Name</div>
                    <div className="font-medium text-[#1E2230] bg-[#F6F7FB] px-3 py-2 rounded-xl border border-[#E5E7EF] flex items-center justify-between">
                      <span>{inspectingStaff.registrationDetails?.last_name || inspectingStaff.name.split(' ').slice(1).join(' ') || '—'}</span>
                      <button
                        onClick={() => handleCopyText(inspectingStaff.registrationDetails?.last_name || inspectingStaff.name.split(' ').slice(1).join(' ') || '', 'last_name')}
                        className="text-[#6B7280] hover:text-[#0D1B4C]"
                        title="Copy"
                      >
                        {copiedField === 'last_name' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-[#6B7280] uppercase flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-[#C9A227]" />
                      <span>Official Email</span>
                    </div>
                    <div className="font-medium text-[#1E2230] bg-[#F6F7FB] px-3 py-2 rounded-xl border border-[#E5E7EF] flex items-center justify-between break-all">
                      <a href={`mailto:${inspectingStaff.registrationDetails?.email || inspectingStaff.email}`} className="hover:text-[#C9A227] transition-colors">
                        {inspectingStaff.registrationDetails?.email || inspectingStaff.email}
                      </a>
                      <button
                        onClick={() => handleCopyText(inspectingStaff.registrationDetails?.email || inspectingStaff.email, 'email')}
                        className="text-[#6B7280] hover:text-[#0D1B4C] ml-2 flex-shrink-0"
                        title="Copy email"
                      >
                        {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-[#6B7280] uppercase flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-[#C9A227]" />
                      <span>Phone Number</span>
                    </div>
                    <div className="font-medium text-[#1E2230] bg-[#F6F7FB] px-3 py-2 rounded-xl border border-[#E5E7EF] flex items-center justify-between">
                      <a href={`tel:${inspectingStaff.registrationDetails?.phone_number || inspectingStaff.phone}`} className="hover:text-[#C9A227] transition-colors">
                        {inspectingStaff.registrationDetails?.phone_number || inspectingStaff.phone}
                      </a>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyText(inspectingStaff.registrationDetails?.phone_number || inspectingStaff.phone, 'phone')}
                          className="text-[#6B7280] hover:text-[#0D1B4C]"
                          title="Copy phone"
                        >
                          {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Username */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-[#6B7280] uppercase">Workbench Username</div>
                    <div className="font-mono text-[#0D1B4C] font-semibold bg-[#F6F7FB] px-3 py-2 rounded-xl border border-[#E5E7EF] flex items-center justify-between">
                      <span>@{inspectingStaff.username || 'staff'}</span>
                      <button
                        onClick={() => handleCopyText(inspectingStaff.username || '', 'username')}
                        className="text-[#6B7280] hover:text-[#0D1B4C]"
                        title="Copy username"
                      >
                        {copiedField === 'username' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Specialization / Role */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-[#6B7280] uppercase">Modeller Specialization</div>
                    <div className="font-medium text-[#1E2230] bg-[#F6F7FB] px-3 py-2 rounded-xl border border-[#E5E7EF]">
                      {inspectingStaff.role}
                    </div>
                  </div>
                </div>
              </div>

              {/* REGISTRATION DOSSIER: ADDRESS & RESIDENCE */}
              <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#C9A227]" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E2230]">
                      Registered Residence & Studio Address
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Address Verified
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#F6F7FB] rounded-xl border border-[#E5E7EF] space-y-1">
                    <div className="text-[11px] text-[#6B7280] font-semibold uppercase">Street Address / Premises</div>
                    <div className="font-medium text-[#1E2230]">
                      {inspectingStaff.registrationDetails?.address || 'Atelier Jewellery Quarter, Studio Suite 4B'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#F6F7FB] rounded-xl border border-[#E5E7EF]">
                      <div className="text-[10px] text-[#6B7280] font-semibold uppercase">City</div>
                      <div className="font-medium text-[#1E2230] mt-0.5">
                        {inspectingStaff.registrationDetails?.city || 'Mumbai'}
                      </div>
                    </div>
                    <div className="p-3 bg-[#F6F7FB] rounded-xl border border-[#E5E7EF]">
                      <div className="text-[10px] text-[#6B7280] font-semibold uppercase">State</div>
                      <div className="font-medium text-[#1E2230] mt-0.5">
                        {inspectingStaff.registrationDetails?.state || 'Maharashtra'}
                      </div>
                    </div>
                    <div className="p-3 bg-[#F6F7FB] rounded-xl border border-[#E5E7EF]">
                      <div className="text-[10px] text-[#6B7280] font-semibold uppercase">Country</div>
                      <div className="font-medium text-[#1E2230] mt-0.5">
                        {inspectingStaff.registrationDetails?.country || 'India'}
                      </div>
                    </div>
                    <div className="p-3 bg-[#F6F7FB] rounded-xl border border-[#E5E7EF]">
                      <div className="text-[10px] text-[#6B7280] font-semibold uppercase">Postal Code</div>
                      <div className="font-mono font-medium text-[#1E2230] mt-0.5">
                        {inspectingStaff.registrationDetails?.pincode || '400002'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* REGISTRATION DOSSIER: CAD EXPERIENCE & SOFTWARE BACKGROUND */}
              <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E5E7EF] pb-3">
                  <Award className="w-4 h-4 text-[#C9A227]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E2230]">
                    CAD Experience & Software Background
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-[#FAF9F5] rounded-xl border border-[#E5E7EF] text-[#1E2230] leading-relaxed whitespace-pre-wrap">
                    {inspectingStaff.registrationDetails?.experience || inspectingStaff.bio || 'Experienced 3D jewellery CAD modeller specializing in MatrixGold, Rhino 3D, and sub-micron casting tolerances for rings, necklaces, and bespoke bridal pieces.'}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['MatrixGold', 'Rhino 3D', 'ZBrush', 'KeyShot', 'Sub-micron Tolerances', 'Watertight Mesh'].map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] text-[11px] font-medium text-[#0D1B4C]">
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* REGISTRATION DOSSIER: PORTFOLIO & SAMPLE WORK ARCHIVE */}
              <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E5E7EF] pb-3">
                  <Globe className="w-4 h-4 text-[#C9A227]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E2230]">
                    Portfolio & Uploaded Sample Work
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Portfolio Link */}
                  <div className="p-4 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-[#6B7280] uppercase flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-[#C9A227]" />
                        <span>Online Portfolio Link</span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-1">
                        Behance, ArtStation, Instagram, or Drive showcase submitted during registration.
                      </p>
                    </div>

                    {inspectingStaff.registrationDetails?.portfolio_link ? (
                      <a
                        href={inspectingStaff.registrationDetails.portfolio_link.startsWith('http')
                          ? inspectingStaff.registrationDetails.portfolio_link
                          : `https://${inspectingStaff.registrationDetails.portfolio_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0D1B4C] hover:bg-[#C9A227] hover:text-[#0D1B4C] text-[#FAF8F3] font-semibold text-xs transition-colors shadow-xs"
                      >
                        <span>Open Live Portfolio</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <div className="mt-2 text-[11px] italic text-[#6B7280] p-2 bg-white rounded-lg border border-[#E5E7EF] text-center">
                        Portfolio link not provided at registration
                      </div>
                    )}
                  </div>

                  {/* Sample Work Zip Archive */}
                  <div className="p-4 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-[#6B7280] uppercase flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-[#C9A227]" />
                        <span>Uploaded CAD Samples (.ZIP)</span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-1">
                        Original .3DM / .STL 3D geometry sample archive uploaded during registration.
                      </p>
                    </div>

                    {inspectingStaff.registrationDetails?.work_zip_url ? (
                      <a
                        href={inspectingStaff.registrationDetails.work_zip_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Sample Archive (.ZIP)</span>
                      </a>
                    ) : (
                      <div className="mt-2 text-[11px] italic text-[#6B7280] p-2 bg-white rounded-lg border border-[#E5E7EF] text-center">
                        No archive file attached
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CURRENTLY ASSIGNED ACTIVE ORDERS */}
              <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#C9A227]" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E2230]">
                      Active Assigned Workbench Jobs ({inspectingStaff.currentLoad})
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      const target = inspectingStaff;
                      setInspectingStaff(null);
                      handleOpenStaffJobs(target);
                    }}
                    className="text-xs font-semibold text-[#0D1B4C] hover:text-[#C9A227] transition-colors flex items-center gap-1"
                  >
                    <span>Manage / Reassign</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {inspectingStaff.activeJobs && inspectingStaff.activeJobs.length > 0 ? (
                  <div className="space-y-2.5">
                    {inspectingStaff.activeJobs.map((job: any, idx: number) => (
                      <div
                        key={job.id || job.orderId || idx}
                        className="p-3 bg-[#F6F7FB] rounded-xl border border-[#E5E7EF] flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-[#1E2230] flex items-center gap-2">
                            <span>#{job.orderId || job.id}</span>
                            <span className="text-[#6B7280] font-normal">•</span>
                            <span className="font-medium">{job.designTitle || job.title || 'Custom CAD Design'}</span>
                          </div>
                          <div className="text-[11px] text-[#6B7280]">
                            Client: {job.client_name || job.client_email || 'Valued Client'}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase">
                          {job.status || 'In Progress'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-[#FAF9F5] rounded-xl border border-[#E5E7EF] text-center space-y-1 text-xs">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <p className="font-bold text-[#1E2230]">No Active Jobs In Flight</p>
                    <p className="text-[11px] text-[#6B7280]">
                      Modeller has {inspectingStaff.maxJobLimit} available slots to accept new CAD orders.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="bg-white p-5 border-t border-[#E5E7EF] flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  const target = inspectingStaff;
                  setInspectingStaff(null);
                  setDeletingStaff(target);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Staff Member</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingStaff;
                    setInspectingStaff(null);
                    handleOpenStaffJobs(target);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0D1B4C] hover:bg-[#1E2230] text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Open Job Workbench</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingStaff(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5E7EF] bg-[#F6F7FB] hover:bg-[#E5E7EF] text-xs font-semibold text-[#1E2230] transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Staff Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7EF] shadow-2xl p-6 sm:p-8 space-y-6 text-[#1E2230] relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-serif text-xl font-bold text-[#1E2230]">
                Permanently Delete Staff Member?
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-[#1E2230]">{deletingStaff.name}</strong> (<span className="font-mono text-[11px]">#{deletingStaff.id}</span>)?
              </p>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium text-left mt-3 leading-snug">
                ⚠️ <strong>Warning:</strong> This will revoke all CAD workbench access, delete login credentials, and remove them from capacity load boards. This action cannot be undone.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl border border-[#E5E7EF] bg-white hover:bg-[#F6F7FB] text-xs font-semibold text-[#1E2230] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

