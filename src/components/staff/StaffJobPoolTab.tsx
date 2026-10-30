import React, { useState } from 'react';
import { AvailableJob, StaffMember } from '../../types';
import { sanitizeOrderBriefForStaff } from '../../utils/staffSanitizer';
import {
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Info,
  X,
  Gem,
  Layers,
  FileText,
  Eye,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  CheckSquare,
  Download,
  Wrench,
  Volume2,
  Calendar,
  Maximize2
} from 'lucide-react';

interface StaffJobPoolTabProps {
  availableJobs: AvailableJob[];
  staff: StaffMember;
  activeJobsCount: number;
  onAcceptJob: (jobId: string) => void;
}

export const StaffJobPoolTab: React.FC<StaffJobPoolTabProps> = ({
  availableJobs,
  staff,
  activeJobsCount,
  onAcceptJob,
}) => {
  const [securingJobId, setSecuringJobId] = useState<string | null>(null);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [selectedJobDrawer, setSelectedJobDrawer] = useState<AvailableJob | null>(null);
  const [activeZoomSketch, setActiveZoomSketch] = useState<string | null>(null);

  const isFullCapacity = activeJobsCount >= staff.maxJobLimit;

  const handleClaimClick = async (jobId: string) => {
    if (isFullCapacity) {
      setCapacityError(`You have reached your maximum capacity limit (${staff.maxJobLimit}/${staff.maxJobLimit} active jobs). Please deliver an active CAD job from your workbench tray first.`);
      return;
    }
    setCapacityError(null);
    setSecuringJobId(jobId);

    try {
      await onAcceptJob(jobId);
      if (selectedJobDrawer?.id === jobId) {
        setSelectedJobDrawer(null);
      }
    } catch (e: any) {
      console.error('Failed to claim job:', e);
    } finally {
      setSecuringJobId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8D7B7] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-600" /> First-Accept-Wins Live Race
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• Open Broadcast Pool</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#17243B] tracking-tight">
            Available Custom CAD Job Pool
          </h1>
          <p className="text-xs text-[#6B7280] max-w-2xl font-light">
            Verified client commissions released to the open pool. Click any order to review technical blueprints, diamond counts, and specs. The first artisan to click <strong className="text-[#09112B] font-semibold">Accept This Job</strong> secures the commission.
          </p>
        </div>

        {/* Capacity Indicator Widget */}
        <div className="px-4 py-3 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] text-right shrink-0 shadow-2xs">
          <div className="text-[10px] uppercase tracking-wider text-[#B88732] font-mono font-bold">Workbench Capacity</div>
          <div className="text-base font-bold font-mono flex items-center justify-end gap-2 mt-0.5">
            <span className={isFullCapacity ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
              {activeJobsCount} / {staff.maxJobLimit} Occupied
            </span>
            <span className="text-[#687386] text-xs">
              ({Math.max(0, staff.maxJobLimit - activeJobsCount)} Open)
            </span>
          </div>
        </div>
      </div>

      {/* Full Capacity Error Banner */}
      {capacityError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-800 animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{capacityError}</span>
          </div>
          <button
            onClick={() => setCapacityError(null)}
            className="text-rose-700 hover:text-rose-950 underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Available Job Cards Grid */}
      {availableJobs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#E8D7B7] space-y-4 shadow-sm">
          <Zap className="w-10 h-10 text-[#C9A227] mx-auto opacity-50" />
          <h3 className="font-serif text-xl font-bold text-[#17243B]">No Open Orders in Broadcast Pool</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">
            All negotiated client orders have been claimed or are awaiting Stage 1 booking confirmation. New approved commissions will appear here live in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableJobs.map((job) => {
            const isSecuringThis = securingJobId === job.id;
            const req = job.rawDetails;

            return (
              <div
                key={job.id}
                onClick={() => setSelectedJobDrawer(job)}
                className="bg-white border-l-4 border-l-[#C9A227] border border-[#E8D7B7] hover:border-[#C9A227] rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden cursor-pointer"
              >
                {/* Release time pill & category */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      Released {job.releasedTimeAgo}
                    </span>
                    {job.isFileEdit && (
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                        <Wrench className="w-3 h-3 text-cyan-400" />
                        FILE EDIT: {job.originalFileFormat?.toUpperCase() || '3DM'}
                      </span>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#17345C] text-[#FFF9F0] text-[10px] font-mono font-bold shadow-2xs">
                    {job.orderNumber}
                  </span>
                </div>

                {/* Reference Image + Title (NO PRICE DISPLAY) */}
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E8D7B7] bg-slate-900 group">
                    <img
                      src={job.referenceImage}
                      alt={job.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[10px] shadow">
                      {job.isFileEdit ? 'FILE MODIFICATION JOB' : 'AVAILABLE COMMISSION'}
                    </div>
                    <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-white text-[10px] font-mono border border-slate-700">
                      {job.isFileEdit ? `Format: .${job.originalFileFormat?.toUpperCase() || '3DM'}` : job.metalPreference}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">
                        {job.category}
                      </span>
                      {req?.aesthetic_style_name && (
                        <span className="text-[10px] text-[#C9A227] font-semibold">
                          • {req.aesthetic_style_name}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif font-bold text-[#17243B] text-lg mt-0.5 group-hover:text-[#C9A227] transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-xs text-[#6B7280] line-clamp-2 mt-1">
                      {job.description}
                    </p>
                    {job.isFileEdit && job.modificationTypes && job.modificationTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {job.modificationTypes.map((mod: string, mIdx: number) => (
                          <span key={mIdx} className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 text-[10px] font-mono font-semibold">
                            🔧 {mod}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Technical Specs Summary */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F8FAFC] p-3 rounded-xl border border-[#E8D7B7] font-mono text-[#17243B]">
                    <div>
                      <span className="text-[#6B7280] block text-[9px] uppercase font-semibold">Stones</span>
                      {job.specsSummary.diamondCount > 0 ? `${job.specsSummary.diamondCount} stones` : 'Metal Only'}
                    </div>
                    <div>
                      <span className="text-[#6B7280] block text-[9px] uppercase font-semibold">Target Weight</span>
                      {job.specsSummary.weightEst}
                    </div>
                    {job.specsSummary.ringSize && (
                      <div className="col-span-2">
                        <span className="text-[#6B7280] block text-[9px] uppercase font-semibold">Ring Size</span>
                        {job.specsSummary.ringSize}
                      </div>
                    )}
                  </div>

                  {/* Delivery Deadline / Target Schedule */}
                  <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#FFF9EE] border border-[#E8D7B7] text-[#17243B] font-mono shadow-2xs">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#8C6D2B] font-bold">
                      <Clock className="w-3.5 h-3.5 text-[#B88732]" /> Target Deadline:
                    </span>
                    <span className="text-[11px] font-bold text-[#17243B]">
                      {job.dueAt
                        ? new Date(job.dueAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : job.neededByDate
                        ? new Date(job.neededByDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : `${job.deadlineHours || 48}h SLA (${Math.round((job.deadlineHours || 48) / 24)}d)`}
                    </span>
                  </div>

                  {/* Staff Payout Price Display (After Admin Commission Deducted) */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#09112B] to-[#12204D] text-[#FAF8F3] border border-[#D4AF37]/40 shadow-sm">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-[#F5E7A3] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" /> Modeller Payout
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono">Net Earnings</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-mono font-bold text-[#F5E7A3] tracking-tight">
                        {job.agreedPayout > 0 ? `$${(job.agreedPayout > 500 ? job.agreedPayout / 86.85 : job.agreedPayout).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$—'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#C9A227] font-semibold flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      Click card to inspect full brief
                    </span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Action Button: First-Accept-Wins */}
                <div className="mt-4 pt-3 border-t border-[#E8D7B7]">
                  <button
                    disabled={isSecuringThis}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClaimClick(job.id);
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all ${
                      isFullCapacity
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : isSecuringThis
                        ? 'bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37] animate-pulse'
                        : 'btn-gold-luxury font-semibold transform hover:-translate-y-0.5'
                    }`}
                  >
                    {isSecuringThis ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                        <span>Securing Lock...</span>
                      </>
                    ) : isFullCapacity ? (
                      <>
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>Workbench Capacity Full</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-[#0B1330]" />
                        <span>Accept This Job {job.agreedPayout > 0 ? `• $${(job.agreedPayout > 500 ? job.agreedPayout / 86.85 : job.agreedPayout).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RIGHT SIDEBAR / SLIDE-OVER DRAWER FOR ORDER SPECIFICATIONS */}
      {/* RIGHT SIDEBAR / SLIDE-OVER DRAWER FOR ORDER SPECIFICATIONS */}
      {selectedJobDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
          onClick={() => setSelectedJobDrawer(null)}
        >
          <div
            className="w-full max-w-2xl bg-gradient-to-b from-[#0B1536] via-[#09112B] to-[#060B1E] text-[#FAF8F3] h-full shadow-[0_0_60px_rgba(0,0,0,0.85),-5px_0_35px_rgba(212,175,55,0.15)] flex flex-col border-l border-[#D4AF37]/40 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Luxury Gradient Hairline */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#F3E5AB] to-transparent shrink-0" />

            {/* Fixed Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 bg-[#09112B]/95 backdrop-blur-md shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D4AF37]/25 to-[#09112B] border border-[#D4AF37]/50 flex items-center justify-center text-[#F3E5AB] shrink-0 shadow-inner">
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#12204D] border border-[#D4AF37]/40 text-[#F5E7A3] font-mono text-[10px] font-bold">
                      {selectedJobDrawer.orderNumber}
                    </span>
                    <span className="text-xs font-mono text-[#C9C2A6]">
                      Released {selectedJobDrawer.releasedTimeAgo}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                      Available In Pool
                    </span>
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#FAF8F3] mt-1 truncate">
                    {selectedJobDrawer.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedJobDrawer(null)}
                className="p-2.5 rounded-full text-[#C9C2A6] hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer shrink-0 ml-3"
                title="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
              {/* Modeller Payout Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0C1638] via-[#101F4E] to-[#0C1638] border border-[#D4AF37]/60 flex items-center justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-1 z-10">
                  <span className="text-[11px] font-mono uppercase font-bold text-[#F5E7A3] flex items-center gap-1.5 tracking-wider">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Modeller Commission Payout
                  </span>
                  <p className="text-xs text-slate-300 font-sans">
                    Guaranteed net earnings credited upon final watertight CAD approval
                  </p>
                </div>
                <div className="text-right z-10 shrink-0 ml-4">
                  <span className="text-3xl font-mono font-extrabold text-[#F5E7A3] tracking-tight block">
                    {selectedJobDrawer.agreedPayout > 0 ? `$${(selectedJobDrawer.agreedPayout > 500 ? selectedJobDrawer.agreedPayout / 86.85 : selectedJobDrawer.agreedPayout).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$—'}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    ● 100% Guaranteed Payout
                  </span>
                </div>
              </div>

              {/* Target Production SLA & Delivery Deadline Schedule */}
              <div className="p-4 rounded-2xl bg-[#091333] border border-[#D4AF37]/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-[#F5E7A3] flex items-center gap-1.5 tracking-wide">
                    <Clock className="w-4 h-4 text-[#D4AF37]" /> Target SLA &amp; Completion Schedule
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-400/15 text-[#F5E7A3] border border-[#D4AF37]/40 text-[10px] font-mono font-bold shadow-2xs">
                    ⏱ {selectedJobDrawer.deadlineHours || 48} Hours SLA
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#060D24] border border-white/10 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Target Due Date &amp; Time
                    </span>
                    <p className="text-xs font-mono font-bold text-[#FAF8F3]">
                      {selectedJobDrawer.dueAt
                        ? new Date(selectedJobDrawer.dueAt).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : selectedJobDrawer.neededByDate
                        ? new Date(selectedJobDrawer.neededByDate + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : `Within ${selectedJobDrawer.deadlineHours || 48}h of accepting`}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#060D24] border border-white/10 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Turnaround Schedule
                    </span>
                    <p className="text-xs font-mono font-bold text-emerald-400 capitalize">
                      {selectedJobDrawer.rawDetails?.timeline
                        ? selectedJobDrawer.rawDetails.timeline === 'standard'
                          ? 'Standard Delivery (2–3 Days)'
                          : selectedJobDrawer.rawDetails.timeline === 'express'
                          ? 'Express Priority (24–48 Hours)'
                          : selectedJobDrawer.rawDetails.timeline === 'urgent'
                          ? 'Urgent Priority (24 Hours)'
                          : selectedJobDrawer.rawDetails.timeline
                        : `${Math.round((selectedJobDrawer.deadlineHours || 48) / 24)} Days Delivery`}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-[#C9C2A6] font-mono flex items-center gap-1.5 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  Realtime countdown begins immediately upon securing this commission.
                </p>
              </div>

              {/* Customer's Original CAD File Box (For File Editing Jobs) */}
              {selectedJobDrawer.isFileEdit && (
                <div className="p-4 rounded-2xl bg-[#06122C] border-2 border-cyan-500/40 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                        <Wrench className="w-5 h-5" />
                      </span>
                      <div>
                        <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider block">
                          Original CAD Model
                        </span>
                        <span className="text-[11px] text-slate-300 font-mono">
                          Format: .{selectedJobDrawer.originalFileFormat?.toUpperCase() || '3DM'} • {selectedJobDrawer.originalFileName || 'Source_CAD_Model'}
                        </span>
                      </div>
                    </div>
                    {selectedJobDrawer.originalFileUrl && (
                      <a
                        href={selectedJobDrawer.originalFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download File</span>
                      </a>
                    )}
                  </div>

                  {selectedJobDrawer.modificationTypes && selectedJobDrawer.modificationTypes.length > 0 && (
                    <div>
                      <span className="text-[10px] font-mono text-[#F5E7A3] uppercase font-bold block mb-1.5">
                        Required Modifications:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJobDrawer.modificationTypes.map((mod: string, mIdx: number) => (
                          <span key={mIdx} className="px-2.5 py-1 rounded-lg bg-cyan-900/60 text-cyan-200 border border-cyan-600/40 text-[11px] font-mono font-medium">
                            ✓ {mod}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedJobDrawer.voiceNoteUrl && (
                    <div className="p-3 rounded-xl bg-[#03091A] border border-cyan-500/30 space-y-1.5">
                      <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 font-bold">
                        <Volume2 className="w-4 h-4" /> Audio Modification Instructions:
                      </span>
                      <audio controls src={selectedJobDrawer.voiceNoteUrl} className="w-full h-8" />
                    </div>
                  )}
                </div>
              )}

              {/* Primary Visual Preview with Enlarge Option */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold">
                    Design Reference &amp; Visuals
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveZoomSketch(selectedJobDrawer.referenceImage)}
                    className="text-[11px] text-[#F3E5AB] hover:underline flex items-center gap-1 font-mono font-semibold cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Enlarge Photo
                  </button>
                </div>
                <div
                  onClick={() => setActiveZoomSketch(selectedJobDrawer.referenceImage)}
                  className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-[#060B1E] group cursor-pointer shadow-lg"
                >
                  <img
                    src={selectedJobDrawer.referenceImage}
                    alt={selectedJobDrawer.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-mono font-bold gap-2">
                    <Maximize2 className="w-4 h-4 text-[#D4AF37]" /> Click to view high-resolution photo
                  </div>
                </div>

                {/* Studio Catalog Design References */}
                {selectedJobDrawer.rawDetails?.catalog_references && selectedJobDrawer.rawDetails.catalog_references.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold block mb-1.5 flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" /> Studio Catalog References ({selectedJobDrawer.rawDetails.catalog_references.length})
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedJobDrawer.rawDetails.catalog_references.map((catRef: any, cIdx: number) => (
                        <div
                          key={cIdx}
                          onClick={() => catRef.image && setActiveZoomSketch(catRef.image)}
                          className="p-2.5 rounded-xl bg-[#070D22] border border-[#D4AF37]/30 hover:border-[#D4AF37] flex items-center gap-3 cursor-pointer transition-all hover:bg-[#0c1436]"
                        >
                          {catRef.image ? (
                            <img src={catRef.image} alt={catRef.title} className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-[10px] text-[#C9C2A6] shrink-0 font-mono">CAD</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono text-[#D4AF37] block font-bold">{catRef.sku || `SKU-${catRef.id}`}</span>
                            <p className="text-xs font-semibold text-[#FAF8F3] truncate">{catRef.title}</p>
                            <span className="text-[9px] text-[#C9C2A6] block">Click to enlarge reference photo</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Multiple Uploaded Sketches Gallery */}
                {selectedJobDrawer.rawDetails?.sketches && selectedJobDrawer.rawDetails.sketches.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-[#C9C2A6] block mb-1 font-bold">
                      Uploaded Sketches &amp; Moodboard ({selectedJobDrawer.rawDetails.sketches.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedJobDrawer.rawDetails.sketches.map((sk: any) => {
                        const imgUrl = sk.image_url || sk.image;
                        return (
                          <img
                            key={sk.id}
                            src={imgUrl}
                            alt="Sketch"
                            onClick={() => setActiveZoomSketch(imgUrl)}
                            className="w-16 h-16 rounded-xl object-cover border border-white/20 hover:border-[#D4AF37] cursor-pointer transition-all hover:scale-105 shadow-md"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Full Technical Specifications Grid */}
              <div className="space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold">
                  Core Jewellery Parameters
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase tracking-wider">Category</span>
                    <p className="font-bold text-[#FAF8F3] text-sm">{selectedJobDrawer.category}</p>
                  </div>
                  
                  <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase tracking-wider">Metal Alloy</span>
                    <p className="font-bold text-[#FAF8F3] text-sm">
                      {selectedJobDrawer.metalPreference || selectedJobDrawer.rawDetails?.metal_alloy_name || selectedJobDrawer.specsSummary?.weightEst || '18K Standard / As per Brief'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase tracking-wider">Target Weight</span>
                    <p className="font-bold text-[#FAF8F3] text-sm">
                      {selectedJobDrawer.rawDetails?.target_weight_grams 
                        ? `${selectedJobDrawer.rawDetails.target_weight_grams} grams` 
                        : (selectedJobDrawer.specsSummary?.weightEst || 'Standard CAD Casting')}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase tracking-wider">Ring Sizing</span>
                    <p className="font-bold text-[#FAF8F3] text-sm">
                      {selectedJobDrawer.rawDetails?.ring_size 
                        ? `Size ${selectedJobDrawer.rawDetails.ring_size} (${selectedJobDrawer.rawDetails.ring_size_standard || 'US'})`
                        : (selectedJobDrawer.specsSummary?.ringSize || 'Standard Sizing')}
                    </p>
                  </div>

                  {selectedJobDrawer.rawDetails?.aesthetic_style_name && (
                    <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-1">
                      <span className="text-[10px] font-mono text-[#C9C2A6] uppercase tracking-wider">Aesthetic Style</span>
                      <p className="font-bold text-[#FAF8F3] text-sm">{selectedJobDrawer.rawDetails.aesthetic_style_name}</p>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-1">
                    <span className="text-[10px] font-mono text-[#C9C2A6] uppercase tracking-wider">Complexity Tier</span>
                    <p className="font-bold text-[#F5E7A3] text-sm">{selectedJobDrawer.rawDetails?.budget_range || 'Atelier Bespoke Tier'}</p>
                  </div>

                  {(selectedJobDrawer.dueAt || selectedJobDrawer.rawDetails?.needed_by_date || selectedJobDrawer.neededByDate) && (
                    <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-1 col-span-2">
                      <span className="text-[10px] font-mono text-[#C9C2A6] uppercase tracking-wider">Delivery Target Date</span>
                      <p className="font-bold text-[#F5E7A3] text-sm">
                        {selectedJobDrawer.dueAt
                          ? new Date(selectedJobDrawer.dueAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
                          : new Date((selectedJobDrawer.neededByDate || selectedJobDrawer.rawDetails?.needed_by_date) + 'T00:00:00').toLocaleDateString('en-US', { dateStyle: 'full' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Gemstones & Stone Configurations */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold flex items-center gap-1.5">
                  <Gem className="w-3.5 h-3.5" />
                  Gemstones &amp; Diamond Setting Plan
                </span>
                {selectedJobDrawer.rawDetails?.is_metal_only ? (
                  <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 text-xs text-[#C9C2A6]">
                    Metal Only piece — No stone seats or prongs required.
                  </div>
                ) : selectedJobDrawer.rawDetails?.stones && selectedJobDrawer.rawDetails.stones.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-2 text-xs">
                    {selectedJobDrawer.rawDetails.stones.map((st: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0 gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#FAF8F3]">{st.stone_type || 'Diamond'} ({st.shape || 'Standard'})</span>
                            {st.is_center_stone && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono text-[9px] font-bold uppercase">
                                Center Stone
                              </span>
                            )}
                          </div>
                          {[st.clarity, st.color].filter(Boolean).length > 0 && (
                            <div className="text-[10px] font-mono text-[#C9C2A6] mt-0.5">
                              Grade: {[st.clarity, st.color].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right font-mono text-xs">
                          <span className="text-[#F5E7A3] font-bold block">
                            {st.quantity || st.count || 1}x {st.size_value ? `(${st.size_value} ${st.size_unit || 'ct'})` : ''}
                          </span>
                          <span className="text-[#C9C2A6] text-[10px]">{st.setting_style || 'Prong'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedJobDrawer.rawDetails?.gemstones && selectedJobDrawer.rawDetails.gemstones.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-2 text-xs">
                    {selectedJobDrawer.rawDetails.gemstones.map((gem: any, idx: number) => (
                      <div key={idx} className="flex justify-between border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                        <span className="font-medium text-[#FAF8F3]">{gem.gemstone_type || 'Gemstone'} ({gem.shape || 'Standard'})</span>
                        <span className="font-mono text-[#F5E7A3]">
                          {gem.quantity ? `${gem.quantity} stones` : ''} {gem.carat_weight ? `• ${gem.carat_weight} ct` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 text-xs text-[#C9C2A6]">
                    {selectedJobDrawer.rawDetails?.gemstone_preference_open ? 'Let Designer Decide optimal stone layout' : 'Plain metal piece — No gemstones specified.'}
                  </div>
                )}
              </div>

              {/* Dynamic Atelier Selections */}
              {selectedJobDrawer.rawDetails?.selections && selectedJobDrawer.rawDetails.selections.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Atelier Component Selections
                  </span>
                  <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-2 text-xs">
                    {selectedJobDrawer.rawDetails.selections.map((sel: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-[#C9C2A6]">{sel.group_label || 'Configuration'}:</span>
                        <span className="font-bold text-[#FAF8F3] flex items-center gap-1.5">
                          {sel.swatch_color && (
                            <span className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: sel.swatch_color }} />
                          )}
                          {sel.value_label || sel.other_text || 'Standard'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand Logo Hallmark Stamping */}
              {selectedJobDrawer.rawDetails?.has_logo && (
                <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-1 text-xs">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1">
                    ✓ Custom Brand Hallmark Stamping Required
                  </span>
                  {selectedJobDrawer.rawDetails.logo_file ? (
                    <a
                      href={selectedJobDrawer.rawDetails.logo_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D4AF37] hover:underline text-[11px] font-mono flex items-center gap-1 mt-1 font-bold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Hallmark Vector File
                    </a>
                  ) : (
                    <p className="text-[10px] text-[#C9C2A6]">Hallmark vector file provided with order.</p>
                  )}
                </div>
              )}

              {/* Custom Engraving Details */}
              {selectedJobDrawer.rawDetails?.engraving_text && (
                <div className="p-3.5 rounded-xl bg-[#0B1536] border border-white/10 space-y-1 text-xs">
                  <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Custom Laser Engraving</span>
                  <p className="font-serif italic text-[#F5E7A3] text-sm">
                    "{selectedJobDrawer.rawDetails.engraving_text}"
                  </p>
                  <div className="flex gap-3 text-[10px] text-[#C9C2A6] pt-1">
                    <span>Font: {selectedJobDrawer.rawDetails.engraving_font || 'Script'}</span>
                    <span>•</span>
                    <span>Placement: {selectedJobDrawer.rawDetails.engraving_placement || 'Inside Shank'}</span>
                  </div>
                </div>
              )}

              {/* Client Brief & Instructions */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Artisan Brief &amp; Special Instructions
                </span>
                <div className="p-4 rounded-xl bg-[#0B1536] border border-white/10 text-xs text-[#FAF8F3] leading-relaxed space-y-2">
                  <p className="whitespace-pre-line">{sanitizeOrderBriefForStaff(selectedJobDrawer.description)}</p>
                  {selectedJobDrawer.rawDetails?.special_instructions && (
                    <div className="pt-2 border-t border-white/10 text-amber-300/90 whitespace-pre-line">
                      <strong className="text-amber-200">Special Note:</strong> {sanitizeOrderBriefForStaff(selectedJobDrawer.rawDetails.special_instructions)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed / Sticky Action Footer */}
            <div className="p-5 border-t border-white/10 bg-[#09112B]/95 backdrop-blur-md shrink-0 shadow-2xl flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-[#F5E7A3] font-bold block flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Net Modeller Payout
                </span>
                <span className="text-2xl font-mono font-extrabold text-[#F5E7A3] tracking-tight">
                  {selectedJobDrawer.agreedPayout > 0 ? `$${(selectedJobDrawer.agreedPayout > 500 ? selectedJobDrawer.agreedPayout / 86.85 : selectedJobDrawer.agreedPayout).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$—'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {selectedJobDrawer.deadlineHours || 48}h SLA Turnaround
                </span>
              </div>

              <button
                disabled={securingJobId === selectedJobDrawer.id || isFullCapacity}
                onClick={() => handleClaimClick(selectedJobDrawer.id)}
                className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                  isFullCapacity
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : securingJobId === selectedJobDrawer.id
                    ? 'bg-[#12204D] text-[#F5E7A3] border border-[#D4AF37] animate-pulse'
                    : 'btn-gold-luxury transform hover:-translate-y-0.5 cursor-pointer font-bold'
                }`}
              >
                {securingJobId === selectedJobDrawer.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    <span>Securing Commission Lock...</span>
                  </>
                ) : isFullCapacity ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Workbench Full ({staff.maxJobLimit}/{staff.maxJobLimit})</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-[#0B1330]" />
                    <span>Accept Commission &amp; Move to Workbench</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Zooming Sketches */}
      {activeZoomSketch && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setActiveZoomSketch(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={activeZoomSketch}
              alt="Zoomed Reference Sketch"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
            />
            <button
              onClick={() => setActiveZoomSketch(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
