import React from 'react';
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
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface StaffWorkbenchTabProps {
  staff: StaffMember;
  activeJobs: StaffActiveJob[];
  onOpenActiveWorkspace: (jobId: string) => void;
  onNavigateToTab: (tab: StaffPortalTab) => void;
}

export const StaffWorkbenchTab: React.FC<StaffWorkbenchTabProps> = ({
  staff,
  activeJobs,
  onOpenActiveWorkspace,
  onNavigateToTab,
}) => {
  const openSlotCount = staff.maxJobLimit - activeJobs.length;

  return (
    <div className="w-full space-y-6">
      {/* Top Welcome Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" /> Shiuli CAD Atelier
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• Active Session</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Good Afternoon, {staff.name}
          </h1>
          <p className="text-xs text-[#6B7280] max-w-2xl font-light">
            Welcome to your master workbench. You currently hold <strong className="text-[#1E2230] font-semibold">{activeJobs.length} active CAD job</strong> on your workbench tray. Status updates sync immediately to the Super Admin control room.
          </p>
        </div>

        <button
          onClick={() => onNavigateToTab('job-pool')}
          className="btn-gold-luxury px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 shrink-0"
        >
          <Zap className="w-4 h-4 fill-[#0B1330]" />
          <span>Browse Available Job Pool</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#09112B] text-[#D4AF37] border border-[#D4AF37]/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#6B7280] font-mono font-semibold">Active Load</div>
            <div className="font-serif text-2xl font-bold text-[#1E2230]">
              {activeJobs.length} / {staff.maxJobLimit} <span className="text-xs font-sans text-[#6B7280] font-normal">Jobs</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#6B7280] font-mono font-semibold">Delivered Pieces</div>
            <div className="font-serif text-2xl font-bold text-[#1E2230]">
              {staff.jobsCompleted} <span className="text-xs font-sans text-emerald-700 font-normal">Delivered</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#6B7280] font-mono font-semibold">Craftsman Rating</div>
            <div className="font-serif text-2xl font-bold text-[#1E2230]">
              ★ {staff.rating} <span className="text-xs font-sans text-[#6B7280] font-normal">/ 5.0</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37]/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#6B7280] font-mono font-semibold">Avg Turnaround</div>
            <div className="font-serif text-2xl font-bold text-[#1E2230]">
              24.5 <span className="text-xs font-sans text-[#6B7280] font-normal">Hours</span>
            </div>
          </div>
        </div>
      </div>

      {/* The Signature Workbench Tray Section */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#C9A227] animate-pulse" />
            <h3 className="text-lg font-serif font-bold text-[#1E2230] tracking-tight">
              The Craftsman Workbench Tray
            </h3>
            <span className="text-xs text-[#6B7280] font-mono">
              (Secured CAD Commissions)
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-[#09112B] bg-[#F1F5F9] px-3.5 py-1.5 rounded-full border border-slate-200">
            Capacity: {activeJobs.length}/{staff.maxJobLimit} Slots Occupied
          </span>
        </div>

        {/* Grid of Workbench Slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Job Cards */}
          {activeJobs.map((job) => (
            <div
              key={job.id}
              className="group bg-[#F8FAFC] border-l-4 border-l-[#C9A227] border border-[#E5E7EF] hover:border-[#C9A227] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={job.referenceImage}
                      alt={job.title}
                      className="w-16 h-16 rounded-xl object-cover border border-[#E5E7EF] shadow-sm group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold">
                          {job.orderNumber}
                        </span>
                        <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">
                          {job.category}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-[#1E2230] text-base mt-1 line-clamp-1">
                        {job.title}
                      </h4>
                      <p className="text-[11px] text-[#6B7280]">
                        Client: {job.clientName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress & Milestone Stepper */}
                <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-[#E5E7EF] mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#1E2230] font-semibold flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-[#C9A227] fill-[#C9A227]" />
                      Milestone: <strong className="font-serif text-[#09112B]">{job.currentMilestone}</strong>
                    </span>
                    <span className="text-[#09112B] font-mono font-bold">
                      {job.progressPercentage}% Complete
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className="bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#AA820A] h-full transition-all duration-500"
                      style={{ width: `${job.progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {job.hoursRemaining}h remaining
                    </span>
                    <span className="text-[#09112B] font-mono text-[10px] font-bold">
                      Status: {job.status}
                    </span>
                  </div>
                </div>

                {/* Client Instructions */}
                <div className="text-xs text-[#4B5563] italic bg-slate-100/70 p-3 rounded-xl border border-slate-200/60 mb-4 line-clamp-2">
                  "{job.clientNotes}"
                </div>
              </div>

              {/* Action Button to Workspace */}
              <button
                onClick={() => onOpenActiveWorkspace(job.id)}
                className="w-full py-2.5 rounded-xl bg-[#09112B] hover:bg-[#122254] text-[#F5E7A3] font-bold text-xs uppercase tracking-wider shadow-sm border border-[#D4AF37]/30 flex items-center justify-center gap-2 transition-all"
              >
                <span>Open Active CAD Workspace</span>
                <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
              </button>
            </div>
          ))}

          {/* Glowing Open Slot Placeholders */}
          {Array.from({ length: openSlotCount }).map((_, idx) => (
            <div
              key={`open-slot-${idx}`}
              onClick={() => onNavigateToTab('job-pool')}
              className="group border-2 border-dashed border-[#C9A227]/40 hover:border-[#C9A227] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 bg-[#FAF9F5] hover:bg-[#F5F1E6] min-h-[260px]"
            >
              <div className="w-14 h-14 rounded-full bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37]/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-all shadow-md">
                <PlusCircle className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <h4 className="font-serif font-bold text-[#1E2230] text-base">
                Workbench Slot Open ({idx + 1 + activeJobs.length}/{staff.maxJobLimit})
              </h4>
              <p className="text-xs text-[#6B7280] max-w-xs mt-1 mb-4">
                You have room on your tray. Claim a commission from the First-Accept-Wins Job Pool to begin modeling.
              </p>
              <span className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md">
                Claim Job from Pool
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Broadcast Alert Banner */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5E7EF] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37]/30">
            <Zap className="w-5 h-5 text-[#D4AF37] animate-bounce" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1E2230] uppercase tracking-wider">
              Job Pool Live Broadcast
            </h4>
            <p className="text-xs text-[#6B7280]">
              3 new high-ticket custom CAD requests were just released by Super Admin. First-accept-wins claims the job immediately.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateToTab('job-pool')}
          className="btn-gold-luxury shrink-0 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md"
        >
          View Job Pool
        </button>
      </div>
    </div>
  );
};
