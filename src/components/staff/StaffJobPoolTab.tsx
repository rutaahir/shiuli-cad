import React, { useState } from 'react';
import { AvailableJob, StaffMember } from '../../types';
import {
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Info,
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
    } catch (e: any) {
      console.error('Failed to claim job:', e);
    } finally {
      setSecuringJobId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-600" /> First-Accept-Wins Live Race
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• Open Broadcast Pool</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Available Custom CAD Job Pool
          </h1>
          <p className="text-xs text-[#6B7280] max-w-2xl font-light">
            Commissions negotiated and approved by Super Admin are released to the open pool. The first CAD designer to click <strong className="text-[#09112B] font-semibold">Accept This Job</strong> secures the commission immediately.
          </p>
        </div>

        {/* Capacity Indicator Widget */}
        <div className="px-4 py-3 rounded-2xl bg-[#09112B] text-white text-right shrink-0 shadow-md">
          <div className="text-[10px] uppercase tracking-wider text-[#F5E7A3] font-mono">Workbench Capacity</div>
          <div className="text-base font-bold font-mono flex items-center justify-end gap-2 mt-0.5">
            <span className={isFullCapacity ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {activeJobsCount} / {staff.maxJobLimit} Occupied
            </span>
            <span className="text-[#C9C2A6] text-xs">
              ({staff.maxJobLimit - activeJobsCount} Open)
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Scope Note */}
      <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#C9A227]/30 text-xs text-[#1E2230] leading-relaxed flex items-start gap-3 shadow-sm">
        <Info className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#09112B] font-serif">Note on race simulation:</strong> In this prototype phase, the "Securing..." → win/lose outcome is simulated client-side (mock resolution after delay) since there is no live WebSocket backend arbitrating concurrent accepts yet. The UI and wax-seal animation sequence are built strictly to spec.
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
        <div className="p-12 text-center rounded-2xl bg-white border border-[#E5E7EF] space-y-4 shadow-sm">
          <Zap className="w-10 h-10 text-[#C9A227] mx-auto opacity-50" />
          <h3 className="font-serif text-xl font-bold text-[#1E2230]">No Open Orders in Broadcast Pool</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">
            All negotiated client orders have been claimed or are awaiting Stage 1 booking confirmation. New approved commissions will appear here live in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableJobs.map((job) => {
          const isSecuringThis = securingJobId === job.id;

          return (
            <div
              key={job.id}
              className="bg-white border-l-4 border-l-[#C9A227] border border-[#E5E7EF] hover:border-[#C9A227] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Release time pill */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  Released {job.releasedTimeAgo}
                </span>
                <span className="text-[10px] text-[#6B7280] font-mono font-semibold">
                  Deadline: {job.deadlineHours}h
                </span>
              </div>

              {/* Reference Image + Title */}
              <div className="space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E5E7EF] bg-slate-900 group">
                  <img
                    src={job.referenceImage}
                    alt={job.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-[#09112B] border border-[#D4AF37]/50 text-[#F5E7A3] font-mono font-bold text-xs shadow-md">
                    ₹{job.agreedPayout.toLocaleString('en-IN')}
                  </div>
                  <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-white text-[10px] font-mono border border-slate-700">
                    {job.metalPreference}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold">
                      {job.orderNumber}
                    </span>
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">
                      {job.category}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-[#1E2230] text-lg mt-1 group-hover:text-[#C9A227] transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-xs text-[#6B7280] line-clamp-2 mt-1">
                    {job.description}
                  </p>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EF] font-mono text-[#1E2230]">
                  <div>
                    <span className="text-[#6B7280] block text-[9px] uppercase font-semibold">Diamonds</span>
                    {job.specsSummary.diamondCount} stones
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[9px] uppercase font-semibold">Weight Est</span>
                    {job.specsSummary.weightEst}
                  </div>
                  {job.specsSummary.ringSize && (
                    <div className="col-span-2">
                      <span className="text-[#6B7280] block text-[9px] uppercase font-semibold">Size</span>
                      {job.specsSummary.ringSize}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: First-Accept-Wins */}
              <div className="mt-5 pt-3 border-t border-[#E5E7EF]">
                <button
                  disabled={isSecuringThis}
                  onClick={() => handleClaimClick(job.id)}
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
                      <span>Accept This Job (First-Wins)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
