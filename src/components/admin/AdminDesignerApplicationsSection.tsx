import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Search,
  Filter,
  Loader2,
  Sparkles,
  ShieldCheck,
  Clock,
  Key,
  Copy,
  Check,
  AlertCircle,
  FileArchive,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';

export interface DesignerApplicationItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  experience: string;
  portfolio_link?: string;
  work_zip?: string;
  work_zip_url?: string;
  status: 'pending' | 'approved' | 'declined';
  admin_notes?: string;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
}

export const AdminDesignerApplicationsSection: React.FC = () => {
  const [applications, setApplications] = useState<DesignerApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'declined' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Inspection modal
  const [inspectingApp, setInspectingApp] = useState<DesignerApplicationItem | null>(null);

  // Approval success modal
  const [approvedDetails, setApprovedDetails] = useState<{
    id: number;
    name: string;
    email: string;
    password: string;
    email_sent?: boolean;
    email_error?: string | null;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Decline modal
  const [decliningApp, setDecliningApp] = useState<DesignerApplicationItem | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getDesignerApplications('all');
      setApplications(data);
    } catch (err) {
      console.error('Failed to load designer applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (app: DesignerApplicationItem) => {
    const confirmApprove = window.confirm(
      `Approve ${app.first_name} ${app.last_name} as CAD Designer?\n\nThis will auto-generate their login password, create their staff account, and dispatch an official welcome email with credentials to ${app.email}.`
    );
    if (!confirmApprove) return;

    setActionLoadingId(app.id);
    try {
      const res = await api.approveDesignerApplication(app.id);
      setApprovedDetails({
        id: app.id,
        name: `${app.first_name} ${app.last_name}`,
        email: app.email,
        password: res.generated_password || 'Shiuli@Staff2026!',
        email_sent: res.email_sent,
        email_error: res.email_error,
      });
      // Update local state
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: 'approved' } : a))
      );
      if (inspectingApp?.id === app.id) {
        setInspectingApp((prev) => (prev ? { ...prev, status: 'approved' } : null));
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to approve application.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResendCredentials = async (appId: number) => {
    setResendingEmail(true);
    try {
      const res = await api.resendDesignerApplicationCredentials(appId);
      if (res.email_sent) {
        alert(`Credentials email successfully dispatched!`);
      } else {
        alert(`Email dispatch failed: ${res.email_error || 'SMTP delivery limit exceeded'}`);
      }
      if (approvedDetails && approvedDetails.id === appId) {
        setApprovedDetails((prev) =>
          prev
            ? {
                ...prev,
                password: res.generated_password || prev.password,
                email_sent: res.email_sent,
                email_error: res.email_error,
              }
            : null
        );
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to resend credentials.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleConfirmDecline = async () => {
    if (!decliningApp) return;
    setActionLoadingId(decliningApp.id);
    try {
      await api.declineDesignerApplication(decliningApp.id, declineReason);
      setApplications((prev) =>
        prev.map((a) => (a.id === decliningApp.id ? { ...a, status: 'declined', rejection_reason: declineReason } : a))
      );
      if (inspectingApp?.id === decliningApp.id) {
        setInspectingApp((prev) => (prev ? { ...prev, status: 'declined', rejection_reason: declineReason } : null));
      }
      setDecliningApp(null);
      setDeclineReason('');
    } catch (err: any) {
      alert(err?.message || 'Failed to decline application.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadZip = (app: DesignerApplicationItem) => {
    const token = localStorage.getItem('shiuli_access_token');
    const downloadUrl = `/api/auth/designer-applications/${app.id}/download-zip/${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(downloadUrl, '_blank');
  };

  const handleCopyPassword = () => {
    if (approvedDetails?.password) {
      navigator.clipboard.writeText(approvedDetails.password);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const filteredApps = applications.filter((app) => {
    const matchesFilter = activeFilter === 'all' || app.status === activeFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      `${app.first_name} ${app.last_name}`.toLowerCase().includes(query) ||
      app.email.toLowerCase().includes(query) ||
      app.phone_number.toLowerCase().includes(query) ||
      app.city.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const declinedCount = applications.filter((a) => a.status === 'declined').length;

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'pending', label: 'Pending Review', count: pendingCount, color: 'text-amber-500' },
            { id: 'approved', label: 'Approved Staff', count: approvedCount, color: 'text-emerald-500' },
            { id: 'declined', label: 'Declined', count: declinedCount, color: 'text-rose-500' },
            { id: 'all', label: 'All Applicants', count: applications.length, color: 'text-slate-500' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-[#0D1B4C] text-white shadow-sm font-bold'
                  : 'bg-white text-[#6B7280] hover:text-[#1E2230] border border-[#E5E7EF]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full font-mono text-[10px] ${
                  activeFilter === tab.id ? 'bg-[#C9A227] text-[#0D1B4C]' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, city..."
              className="pl-9 pr-4 py-2 rounded-xl bg-white border border-[#E5E7EF] text-xs text-[#1E2230] placeholder:text-slate-400 focus:outline-none focus:border-[#C9A227] w-64"
            />
          </div>
          <button
            onClick={fetchApplications}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-[#E5E7EF] text-slate-600 hover:text-[#0D1B4C] hover:border-slate-300 transition-colors cursor-pointer"
            title="Refresh applications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Applicants */}
      {loading ? (
        <div className="py-16 bg-white rounded-2xl border border-[#E5E7EF] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
          <span className="text-xs font-mono text-[#6B7280]">Loading CAD Designer applicants...</span>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#E5E7EF] space-y-3">
          <Users className="w-10 h-10 text-[#C9A227] mx-auto opacity-50" />
          <h3 className="font-serif text-lg font-bold text-[#1E2230]">No Applications Found</h3>
          <p className="text-xs text-[#6B7280]">
            {activeFilter === 'pending'
              ? 'No CAD designer applicants are currently waiting for approval.'
              : `No applications match the current filter (${activeFilter}).`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm hover:shadow-md hover:border-[#C9A227]/50 transition-all flex flex-col justify-between space-y-4"
            >
              {/* Top Row: Name, Status Badge */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#0D1B4C] flex items-center gap-1.5">
                      <span>{app.first_name} {app.last_name}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-normal">#{app.id}</span>
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-[#6B7280] mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Applied {new Date(app.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      app.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : app.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-xs text-[#4B5563] bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                    <span className="truncate">{app.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                    <span>{app.phone_number}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                    <span className="truncate">{app.city}, {app.state} ({app.country})</span>
                  </div>
                </div>

                {/* Experience Snippet */}
                <div className="text-xs text-[#374151] line-clamp-2 italic bg-white p-2 border-l-2 border-[#C9A227] pl-3">
                  “{app.experience}”
                </div>

                {/* Attachments & Links */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {app.portfolio_link && (
                    <a
                      href={app.portfolio_link.startsWith('http') ? app.portfolio_link : `https://${app.portfolio_link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Portfolio</span>
                    </a>
                  )}

                  {app.work_zip && (
                    <button
                      type="button"
                      onClick={() => handleDownloadZip(app)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-[11px] font-medium transition-colors cursor-pointer"
                      title="Download Work ZIP archive"
                    >
                      <FileArchive className="w-3 h-3 text-amber-600" />
                      <span>Download Samples (.zip)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E5E7EF] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingApp(app)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Inspect</span>
                </button>

                {app.status === 'pending' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={actionLoadingId === app.id}
                      onClick={() => {
                        setDecliningApp(app);
                        setDeclineReason('');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === app.id}
                      onClick={() => handleApprove(app)}
                      className="btn-gold-luxury px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      {actionLoadingId === app.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Approve</span>
                    </button>
                  </div>
                )}

                {app.status === 'approved' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Approved</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResendCredentials(app.id)}
                      disabled={resendingEmail}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Resend welcome credentials email"
                    >
                      <Mail className="w-3 h-3 text-slate-500" />
                      <span>Resend Email</span>
                    </button>
                  </div>
                )}

                {app.status === 'declined' && (
                  <span className="text-[11px] text-rose-600 font-medium">
                    Declined
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Modal */}
      {inspectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A227] font-bold">
                  Applicant Dossier #{inspectingApp.id}
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#0D1B4C]">
                  {inspectingApp.first_name} {inspectingApp.last_name}
                </h2>
              </div>
              <button
                onClick={() => setInspectingApp(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-slate-400 font-medium">Email Address</span>
                <p className="font-semibold text-slate-800 break-all">{inspectingApp.email}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-slate-400 font-medium">Phone / WhatsApp</span>
                <p className="font-semibold text-slate-800">{inspectingApp.phone_number}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl space-y-1 text-xs">
              <span className="text-slate-400 font-medium">Studio / Postal Address</span>
              <p className="font-medium text-slate-800">{inspectingApp.address}</p>
              <p className="text-slate-600">
                {inspectingApp.city}, {inspectingApp.state}, {inspectingApp.country} - PIN: {inspectingApp.pincode}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl space-y-1 text-xs">
              <span className="text-slate-400 font-medium">Experience &amp; CAD Background</span>
              <p className="font-normal text-slate-800 whitespace-pre-wrap leading-relaxed">
                {inspectingApp.experience}
              </p>
            </div>

            {inspectingApp.portfolio_link && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
                <span className="text-indigo-900 font-medium">Online Portfolio Link</span>
                <a
                  href={inspectingApp.portfolio_link.startsWith('http') ? inspectingApp.portfolio_link : `https://${inspectingApp.portfolio_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-indigo-700 hover:underline flex items-center gap-1"
                >
                  <span>Open URL</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {inspectingApp.work_zip && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <div className="flex items-center gap-2">
                  <FileArchive className="w-4 h-4 text-amber-700" />
                  <span className="font-semibold text-amber-900">Applicant Past Work ZIP Archive</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadZip(inspectingApp)}
                  className="btn-gold-luxury px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
              </div>
            )}

            {inspectingApp.rejection_reason && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                <span className="font-bold text-rose-800">Decline Feedback:</span>
                <p className="text-rose-700">{inspectingApp.rejection_reason}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingApp(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>

              {inspectingApp.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDecliningApp(inspectingApp);
                      setDeclineReason('');
                      setInspectingApp(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-semibold cursor-pointer hover:bg-rose-50"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(inspectingApp)}
                    className="btn-gold-luxury px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve &amp; Send Credentials</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {decliningApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#0D1B4C]">
              Decline Application
            </h3>
            <p className="text-xs text-slate-600">
              Provide optional feedback for {decliningApp.first_name} {decliningApp.last_name}. A polite notification will be dispatched to {decliningApp.email}.
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Current studio capacity is full; looking for specialized pavé stone experience..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#C9A227]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecliningApp(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Success Modal with Generated Credentials */}
      {approvedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div
              className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                approvedDetails.email_sent === false
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {approvedDetails.email_sent === false ? (
                <AlertCircle className="w-8 h-8 stroke-[2.5]" />
              ) : (
                <Check className="w-8 h-8 stroke-[3]" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-2xl font-bold text-[#0D1B4C]">
                CAD Designer Approved!
              </h3>
              {approvedDetails.email_sent === false ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-1.5 text-xs text-amber-900 mt-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Email Delivery Alert (Google SMTP Limit)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Google returned: <em>Daily sending limit exceeded (550 5.4.5)</em> for sender <code>socialbuzz31@gmail.com</code>.
                  </p>
                  <p className="text-[11px] font-medium text-slate-700">
                    👉 <strong>Staff account is created &amp; active!</strong> Please copy and provide the password below directly to the designer, or configure a fresh Gmail account in <code>backend/.env</code>.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  Staff login credentials have been created and automatically emailed to{' '}
                  <strong className="text-slate-900">{approvedDetails.email}</strong>.
                </p>
              )}
            </div>

            {/* Credential summary box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Designer:</span>
                <span className="font-bold text-slate-800">{approvedDetails.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Login Email:</span>
                <span className="font-mono text-slate-800 font-semibold">{approvedDetails.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Auto-Generated Password:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[#0D1B4C] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {approvedDetails.password}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Copy password"
                  >
                    {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              The staff member can log in immediately at <code>/staff-portal</code> or <code>/login</code>, and change their password anytime via email OTP verification.
            </p>

            <div className="space-y-2 pt-1">
              {approvedDetails.email_sent === false && (
                <button
                  type="button"
                  onClick={() => handleResendCredentials(approvedDetails.id)}
                  disabled={resendingEmail}
                  className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Mail className={`w-3.5 h-3.5 ${resendingEmail ? 'animate-spin' : ''}`} />
                  <span>{resendingEmail ? 'Attempting Redelivery...' : 'Retry Email Dispatch'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setApprovedDetails(null)}
                className="btn-gold-luxury w-full py-3 rounded-xl font-bold uppercase text-xs cursor-pointer shadow-md"
              >
                Done &amp; Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
