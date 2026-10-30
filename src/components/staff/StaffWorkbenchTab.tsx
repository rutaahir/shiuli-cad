import React, { useState, useEffect } from 'react';
import { StaffActiveJob, StaffMember, StaffPortalTab } from '../../types';
import {
  Clock,
  Sparkles,
  ArrowRight,
  PlusCircle,
  FileCheck,
  Zap,
  TrendingUp,
  Play,
  Briefcase,
  Calendar,
  Check,
} from 'lucide-react';

const WORKBENCH_STAGES = [
  { step: 1, name: 'Setup', minProgress: 25, label: '01. Setup & Mesh' },
  { step: 2, name: 'Modeling', minProgress: 60, label: '02. 3D Detailing' },
  { step: 3, name: 'Studio QC', minProgress: 85, label: '03. Admin QC' },
  { step: 4, name: 'Delivery', minProgress: 100, label: '04. Handover' },
];

interface JobCountdownTimerProps {
  dueAt?: string;
  deadlineHours?: number;
  assignedAt?: string;
  acceptedAt?: string;
}

export const JobCountdownTimer: React.FC<JobCountdownTimerProps> = ({
  dueAt,
  deadlineHours = 48,
  assignedAt,
  acceptedAt,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('Calculating SLA...');
  const [timerBadgeStyle, setTimerBadgeStyle] = useState<string>(
    'text-amber-800 bg-amber-50/90 border-amber-300'
  );
  const [isOverdue, setIsOverdue] = useState<boolean>(false);

  useEffect(() => {
    let targetTimeMs: number;
    if (dueAt) {
      targetTimeMs = new Date(dueAt).getTime();
    } else {
      const baseMs = assignedAt
        ? new Date(assignedAt).getTime()
        : acceptedAt
        ? new Date(acceptedAt).getTime()
        : Date.now();
      targetTimeMs = baseMs + deadlineHours * 3600 * 1000;
    }

    const totalDurationMs = Math.max(1, deadlineHours * 3600 * 1000);

    const calcTime = () => {
      const now = Date.now();
      const diffMs = targetTimeMs - now;

      if (diffMs <= 0) {
        setIsOverdue(true);
        const overSecs = Math.floor(Math.abs(diffMs) / 1000);
        const days = Math.floor(overSecs / 86400);
        const hours = Math.floor((overSecs % 86400) / 3600);
        const mins = Math.floor((overSecs % 3600) / 60);
        const secs = overSecs % 60;

        setTimeLeftStr(
          `OVERDUE by ${days > 0 ? `${days}d ` : ''}${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
        );
        setTimerBadgeStyle('text-rose-700 bg-rose-50 border-rose-300 font-bold animate-pulse');
        return;
      }

      setIsOverdue(false);
      const totalSecs = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      const formatted = days > 0
        ? `${days}d ${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s remaining`
        : `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s remaining`;

      setTimeLeftStr(formatted);

      const ratio = diffMs / totalDurationMs;
      if (ratio > 0.5) {
        setTimerBadgeStyle('text-[#9C7026] bg-[#FFF9EE] border-[#E8D7B7] font-semibold');
      } else if (ratio > 0.2) {
        setTimerBadgeStyle('text-amber-800 bg-amber-50 border-amber-300 font-semibold');
      } else {
        setTimerBadgeStyle('text-rose-700 bg-rose-50 border-rose-300 font-bold');
      }
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [dueAt, deadlineHours, assignedAt, acceptedAt]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors shadow-2xs ${timerBadgeStyle}`}
      title={dueAt ? `Target Due: ${new Date(dueAt).toLocaleString()}` : `Total SLA Duration: ${deadlineHours}h`}
    >
      <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-600 animate-spin' : 'text-amber-600'}`} />
      <span>{timeLeftStr}</span>
    </span>
  );
};

interface StaffWorkbenchTabProps {
  staff: StaffMember;
  activeJobs: StaffActiveJob[];
  avgTurnaroundHours?: number;
  loading?: boolean;
  onOpenActiveWorkspace: (jobId: string) => void;
  onNavigateToTab: (tab: StaffPortalTab) => void;
}

export const StaffWorkbenchTab: React.FC<StaffWorkbenchTabProps> = ({
  staff,
  activeJobs,
  avgTurnaroundHours = 24.0,
  loading = false,
  onOpenActiveWorkspace,
  onNavigateToTab,
}) => {
  const openSlotCount = Math.max(0, staff.maxJobLimit - activeJobs.length);

  return (
    <div className="w-full space-y-6">
      {/* Top Welcome Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8D7B7] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFF9F0] text-[#B88732] border border-[#E8D7B7] text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#B88732]" /> Shiuli CAD Atelier
            </span>
            <span className="text-xs text-[#687386] font-mono">• Active Session</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#17243B] tracking-tight">
            Good Afternoon, {staff.name}
          </h1>
          <p className="text-xs text-[#687386] max-w-2xl font-light">
            Welcome to your master workbench. You currently hold <strong className="text-[#17243B] font-semibold">{activeJobs.length} active CAD job</strong> on your workbench tray. Status updates sync immediately to the Super Admin control room.
          </p>
        </div>

        <button
          onClick={() => onNavigateToTab('job-pool')}
          className="btn-gold-luxury px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 shrink-0 cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-[#17345C]" />
          <span>Browse Available Job Pool</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8D7B7] shadow-sm hover:border-[#B88732]/40 transition-all flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#FFF9F0] text-[#B88732] border border-[#E8D7B7] shadow-2xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#687386] font-mono font-semibold">Active Load</div>
            <div className="font-serif text-2xl font-bold text-[#17243B]">
              {activeJobs.length} / {staff.maxJobLimit} <span className="text-xs font-sans text-[#687386] font-normal">Jobs</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8D7B7] shadow-sm hover:border-[#B88732]/40 transition-all flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#687386] font-mono font-semibold">Delivered Pieces</div>
            <div className="font-serif text-2xl font-bold text-[#17243B]">
              {staff.jobsCompleted} <span className="text-xs font-sans text-emerald-700 font-normal">Delivered</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8D7B7] shadow-sm hover:border-[#B88732]/40 transition-all flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#687386] font-mono font-semibold">Craftsman Rating</div>
            <div className="font-serif text-2xl font-bold text-[#17243B]">
              ★ {staff.rating} <span className="text-xs font-sans text-[#687386] font-normal">/ 5.0</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8D7B7] shadow-sm hover:border-[#B88732]/40 transition-all flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#FFF9F0] text-[#B88732] border border-[#E8D7B7] shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#687386] font-mono font-semibold">Avg Turnaround</div>
            <div className="font-serif text-2xl font-bold text-[#17243B]">
              {typeof avgTurnaroundHours === 'number' ? avgTurnaroundHours.toFixed(1) : (avgTurnaroundHours || '24.0')} <span className="text-xs font-sans text-[#687386] font-normal">Hours</span>
            </div>
          </div>
        </div>
      </div>

      {/* The Signature Workbench Tray Section */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8D7B7] shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#B88732] animate-pulse" />
            <h3 className="text-lg font-serif font-bold text-[#17243B] tracking-tight">
              The Craftsman Workbench Tray
            </h3>
            <span className="text-xs text-[#687386] font-mono">
              (Secured CAD Commissions)
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-[#17345C] bg-[#FFF9F0] px-3.5 py-1.5 rounded-full border border-[#E8D7B7] shadow-2xs">
            Capacity: {activeJobs.length}/{staff.maxJobLimit} Slots Occupied
          </span>
        </div>

        {/* Grid of Workbench Slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <>
              {[1, 2].map((i) => (
                <div
                  key={`skeleton-${i}`}
                  className="bg-white border border-[#E8D7B7] rounded-2xl p-6 shadow-sm space-y-4 animate-pulse min-h-[340px] flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-slate-200" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 rounded w-1/4" />
                        <div className="h-5 bg-slate-200 rounded w-2/3" />
                      </div>
                    </div>
                    <div className="h-24 bg-[#FFF9F0] border border-[#E8D7B7]/60 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                  </div>
                  <div className="h-10 bg-slate-200 rounded-xl w-full" />
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Active Job Cards */}
          {activeJobs.map((job) => (
            <div
              key={job.id}
              className="group bg-white border border-[#E8D7B7] hover:border-[#B88732] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={job.referenceImage}
                      alt={job.title}
                      className="w-16 h-16 rounded-xl object-cover border border-[#E8D7B7] shadow-sm group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#17345C] text-[#FFF9F0] text-[10px] font-mono font-bold shadow-2xs">
                          {job.orderNumber}
                        </span>
                        <span className="text-[10px] text-[#687386] font-bold uppercase tracking-wider">
                          {job.category}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-[#17243B] text-base mt-1 line-clamp-1">
                        {job.title}
                      </h4>
                      <p className="text-[11px] text-[#8C6D2B] font-mono font-medium">
                        Target SLA: {job.deadlineHours || 48} Hours Turnaround
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress & Milestone Stepper */}
                <div className="space-y-3 bg-[#FFF9F0] p-4 rounded-xl border border-[#E8D7B7] mb-4 shadow-2xs">
                  {/* Stepper Header Row */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#17243B] font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#B88732] animate-ping" />
                      Milestone: <strong className="font-serif text-[#17345C] text-sm">{job.currentMilestone}</strong>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#17345C] text-[#F5E7A3] font-mono text-xs font-bold border border-[#D4AF37]/50 shadow-xs">
                      {job.progressPercentage}% Complete
                    </span>
                  </div>

                  {/* 4-Stage Segmented Progress Bar & Stepper Nodes */}
                  <div className="relative pt-2 pb-1">
                    {/* Underlying Track */}
                    <div className="w-full bg-[#E8D7B7]/50 rounded-full h-2.5 overflow-hidden border border-[#D4AF37]/30 shadow-inner">
                      <div
                        className="bg-gradient-to-r from-[#B88732] via-[#D4AF37] to-[#F5E7A3] h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                        style={{ width: `${Math.min(100, Math.max(0, job.progressPercentage))}%` }}
                      />
                    </div>

                    {/* Step Nodes Row */}
                    <div className="flex justify-between items-center relative -mt-4 px-0.5">
                      {WORKBENCH_STAGES.map((st) => {
                        const isCompleted = job.progressPercentage >= st.minProgress;
                        const isCurrent = !isCompleted && (
                          (st.step === 1 && job.progressPercentage < 25) ||
                          (st.step === 2 && job.progressPercentage >= 25 && job.progressPercentage < 60) ||
                          (st.step === 3 && job.progressPercentage >= 60 && job.progressPercentage < 85) ||
                          (st.step === 4 && job.progressPercentage >= 85)
                        );

                        return (
                          <div key={st.step} className="flex flex-col items-center">
                            <div
                              className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-300 border-2 ${
                                isCompleted
                                  ? 'bg-[#B88732] border-white text-white shadow-sm ring-1 ring-[#B88732]'
                                  : isCurrent
                                  ? 'bg-[#17345C] border-white text-[#F5E7A3] ring-2 ring-[#D4AF37] animate-pulse shadow-md scale-110'
                                  : 'bg-white border-[#E2E8F0] text-[#94A3B8]'
                              }`}
                              title={`${st.label} (${st.minProgress}%)`}
                            >
                              {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : st.step}
                            </div>
                            <span
                              className={`text-[9px] font-mono mt-1 transition-colors ${
                                isCompleted
                                  ? 'text-[#8C6D2B] font-bold'
                                  : isCurrent
                                  ? 'text-[#17345C] font-extrabold underline decoration-[#D4AF37] decoration-2'
                                  : 'text-[#94A3B8]'
                              }`}
                            >
                              {st.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status & SLA Row */}
                  <div className="flex items-center justify-between text-[11px] pt-1 gap-2 flex-wrap border-t border-[#E8D7B7]/50">
                    <JobCountdownTimer
                      dueAt={job.dueAt}
                      deadlineHours={job.deadlineHours}
                      assignedAt={job.assignedAt}
                      acceptedAt={job.acceptedAt}
                    />
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border shadow-2xs ${
                      String(job.status).includes('Review') || String(job.status).includes('Preview')
                        ? 'bg-purple-50 text-purple-900 border-purple-200'
                        : String(job.status).includes('Pending')
                        ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                        : String(job.status).includes('Adjustments') || String(job.status).includes('Revision')
                        ? 'bg-rose-50 text-rose-900 border-rose-300'
                        : 'bg-blue-50 text-[#17345C] border-blue-200'
                    }`}>
                      Status: {job.status}
                    </span>
                  </div>

                  {/* Target Due Date & Time Display */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#687386] pt-2 border-t border-[#E8D7B7]/50">
                    <span className="flex items-center gap-1.5 text-[#8C6D2B]">
                      <Calendar className="w-3.5 h-3.5 text-[#B88732]" />
                      Target Due Date &amp; Time: <strong className="text-[#17243B]">
                        {job.dueAt
                          ? new Date(job.dueAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : job.deadline || `Within ${job.deadlineHours || 48} Hours`}
                      </strong>
                    </span>
                    <span className="text-slate-500 font-semibold text-[10px]">
                      SLA: {job.deadlineHours || 48}h
                    </span>
                  </div>
                </div>

                {/* Client Instructions */}
                <div className="text-xs text-[#4B5563] italic bg-slate-50 p-3 rounded-xl border border-[#E8D7B7]/60 mb-3 line-clamp-2">
                  "{job.clientNotes}"
                </div>

                {/* Modeller Payout Display */}
                <div className="flex items-center justify-between text-xs py-2 px-3.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200/80 font-mono font-bold mb-4 shadow-2xs">
                  <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-[#B88732]" /> Commission Payout:
                  </span>
                  <span className="text-sm font-bold text-emerald-800">
                    {job.payoutAmount > 0 ? `$${job.payoutAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$—'}
                  </span>
                </div>
              </div>

              {/* Action Button to Workspace */}
              <button
                onClick={() => onOpenActiveWorkspace(job.id)}
                className="btn-gold-luxury w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Open Active CAD Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Luxury Open Slot Placeholders */}
          {Array.from({ length: openSlotCount }).map((_, idx) => (
            <div
              key={`open-slot-${idx}`}
              onClick={() => onNavigateToTab('job-pool')}
              className="group border-2 border-dashed border-[#E8D7B7] hover:border-[#B88732] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 bg-[#FFFDF9] hover:bg-[#FFF9F0] min-h-[260px] shadow-2xs"
            >
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8D7B7] text-[#B88732] flex items-center justify-center mb-3 group-hover:scale-105 group-hover:bg-[#17345C] group-hover:text-[#D9B66F] group-hover:border-[#17345C] transition-all duration-300 shadow-2xs">
                <PlusCircle className="w-7 h-7" />
              </div>
              <h4 className="font-serif font-bold text-[#17345C] text-base">
                Workbench Slot Open ({idx + 1 + activeJobs.length}/{staff.maxJobLimit})
              </h4>
              <p className="text-xs text-[#687386] max-w-xs mt-1 mb-4 font-light leading-relaxed">
                You have room on your tray. Claim a commission from the First-Accept-Wins Job Pool to begin modeling.
              </p>
              <span className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm group-hover:shadow-md">
                Claim Job from Pool
              </span>
            </div>
          ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
