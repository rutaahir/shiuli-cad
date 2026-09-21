import React, { useState, useEffect, useRef } from 'react';
import { StaffActiveJob } from '../../types';
import { api } from '../../services/api';
import {
  Clock,
  CheckCircle2,
  Upload,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Award,
  Send,
  Eye,
  Loader2,
  FileCheck,
  AlertCircle,
  Gem,
  Layers,
  Check,
  X,
  FileText,
  Video,
  Image as ImageIcon,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface StaffActiveJobWorkspaceProps {
  job: StaffActiveJob;
  onBack: () => void;
  onUpdateMilestone?: (jobId: string, milestone: StaffActiveJob['currentMilestone'], progress: number) => void;
  onCompleteJob?: (jobId: string) => void;
}

const MILESTONES: { name: StaffActiveJob['currentMilestone']; progress: number; label: string }[] = [
  { name: 'Started', progress: 25, label: '01. Blueprint Setup & Mesh Blocking' },
  { name: 'Modeling', progress: 60, label: '02. Stone Seats & Filigree Detailing' },
  { name: 'Refining', progress: 85, label: '03. Tolerances, Prongs & Castability' },
  { name: 'Ready for Delivery', progress: 100, label: '04. Final STL Export & 4K Renders' },
];

export const StaffActiveJobWorkspace: React.FC<StaffActiveJobWorkspaceProps> = ({
  job,
  onBack,
  onUpdateMilestone,
  onCompleteJob,
}) => {
  const effectiveOrderId = job.id;

  // Live order state fetched from backend GET /api/orders/{id}/
  const [orderData, setOrderData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // SLA Countdown Timer State
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('Calculated Live...');
  const [timerColorClass, setTimerColorClass] = useState<string>('text-emerald-700 bg-emerald-50 border-emerald-200');

  // File Upload & Progress State
  const [uploadingFileType, setUploadingFileType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Lightbox & Modal States
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);
  const [selectedSketchIndex, setSelectedSketchIndex] = useState<number>(0);
  const [showGemstonesModal, setShowGemstonesModal] = useState<boolean>(false);

  // Complete / Handover Modal
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);

  // Fetch real order data from backend
  const fetchOrderDetails = async () => {
    try {
      setError(null);
      const res = await api.request<any>(`/orders/${effectiveOrderId}/`);
      setOrderData(res);
    } catch (err: any) {
      console.error('Failed to load order workspace data:', err);
      setError(err?.message || 'Failed to fetch order details from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchOrderDetails();
  }, [effectiveOrderId]);

  // Live SLA Countdown Calculation with Color Shifting
  useEffect(() => {
    if (!orderData) return;

    let targetTimeMs: number;
    if (orderData.due_at) {
      targetTimeMs = new Date(orderData.due_at).getTime();
    } else {
      const assignedAtMs = orderData.assigned_at ? new Date(orderData.assigned_at).getTime() : Date.now();
      const deadlineHours = orderData.deadline_hours || 48;
      targetTimeMs = assignedAtMs + deadlineHours * 60 * 60 * 1000;
    }

    const totalSlaMs = (orderData.deadline_hours || 48) * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diffMs = targetTimeMs - now;

      if (diffMs <= 0) {
        const overdueMs = Math.abs(diffMs);
        const overTotalSecs = Math.floor(overdueMs / 1000);
        const overHours = Math.floor(overTotalSecs / 3600);
        const overMins = Math.floor((overTotalSecs % 3600) / 60);

        setRemainingTimeStr(`OVERDUE by ${overHours}h ${overMins}m`);
        setTimerColorClass('text-rose-700 bg-rose-50 border-rose-300 font-extrabold animate-pulse');
        return;
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      const formatted = `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
      setRemainingTimeStr(formatted);

      // Ratio thresholds: >50% Gold, 20-50% Amber, <20% Red
      const remainingRatio = diffMs / totalSlaMs;
      if (remainingRatio > 0.5) {
        setTimerColorClass('text-[#C9A227] bg-amber-50/80 border-[#C9A227]/40');
      } else if (remainingRatio > 0.2) {
        setTimerColorClass('text-amber-700 bg-amber-100 border-amber-300');
      } else {
        setTimerColorClass('text-rose-700 bg-rose-50 border-rose-300 font-bold');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [orderData]);

  // Extract linked CustomRequest, deliverables, milestones
  const req = orderData?.custom_request || {};
  const deliverablesList: any[] = orderData?.deliverables || [];
  const milestonesList: any[] = orderData?.milestones || [];
  const gemstonesList: any[] = req.gemstones || [];

  // Determine current milestone stage from backend milestones
  const getLatestMilestoneIndex = () => {
    if (orderData?.status === 'completed' || orderData?.status === 'pending_review') return 3;

    if (!milestonesList || milestonesList.length === 0) {
      if (deliverablesList.length >= 3) return 2;
      if (deliverablesList.length >= 2) return 1;
      if (deliverablesList.length >= 1) return 0;
      return -1; // Freshly accepted order: no milestone marked yet (0% progress)
    }

    const stageNames = milestonesList.map((m: any) => m.stage);
    let highestIdx = -1;
    MILESTONES.forEach((m, idx) => {
      if (stageNames.includes(m.name) || stageNames.includes(m.label)) {
        highestIdx = idx;
      }
    });

    return highestIdx;
  };

  const currentMilestoneIndex = orderData ? getLatestMilestoneIndex() : -1;
  const currentMilestoneObj = currentMilestoneIndex >= 0 ? MILESTONES[currentMilestoneIndex] : null;
  const progressPercentage = currentMilestoneIndex >= 0 ? (MILESTONES[currentMilestoneIndex]?.progress || 0) : 0;

  // Advance Milestone via API
  const handleStepClick = async (targetIdx: number) => {
    const targetMilestone = MILESTONES[targetIdx];
    try {
      await api.request(`/orders/${effectiveOrderId}/milestone/`, {
        method: 'POST',
        body: JSON.stringify({ stage: targetMilestone.name }),
      });

      await fetchOrderDetails();

      if (onUpdateMilestone) {
        onUpdateMilestone(effectiveOrderId, targetMilestone.name, targetMilestone.progress);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update milestone stage.');
    }
  };

  // Handle File Upload to Backend with Strict Validation & Extension Check
  const handleFileSelected = async (fileType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Client-side File Type Extension Validation
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts: { [key: string]: string[] } = {
      '3dm': ['3dm', 'rhino'],
      'stl': ['stl'],
      'render': ['jpg', 'jpeg', 'png', 'webp'],
      'video': ['mp4', 'webm', 'mov', 'mkv'],
    };

    const allowed = validExts[fileType] || [];
    if (allowed.length > 0 && !allowed.includes(ext)) {
      const errMsg = `Invalid file format '.${ext}' for ${fileType.toUpperCase()} slot. Expected format: ${allowed.map(a => '.' + a).join(', ')}`;
      setUploadError(errMsg);
      if (fileInputRefs.current[fileType]) {
        fileInputRefs.current[fileType]!.value = '';
      }
      return;
    }

    setUploadingFileType(fileType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', fileType);

      await api.request(`/orders/${effectiveOrderId}/deliverables/`, {
        method: 'POST',
        body: formData,
      });

      await fetchOrderDetails();
    } catch (err: any) {
      setUploadError(err?.message || `Failed to upload ${fileType} file.`);
    } finally {
      setUploadingFileType(null);
      if (fileInputRefs.current[fileType]) {
        fileInputRefs.current[fileType]!.value = '';
      }
    }
  };

  // Deliverables helper
  const getDeliverableByType = (type: string) => {
    return deliverablesList.find((d: any) => d.file_type === type);
  };

  const rhinoDeliverable = getDeliverableByType('3dm');
  const stlDeliverable = getDeliverableByType('stl');
  const renderDeliverable = getDeliverableByType('render') || (orderData?.preview_image ? { filename: 'Client_Preview_Render.png', uploaded_at: orderData.created_at } : null);
  const videoDeliverable = getDeliverableByType('video');

  // All deliverables are optional
  const missingRequirements: string[] = [];
  const isReadyToComplete = true;

  // Handle Final Order Completion / Handover
  const handleConfirmCompleteOrder = async () => {
    setIsCompleting(true);
    try {
      await api.request(`/orders/${effectiveOrderId}/submit-for-review/`, {
        method: 'POST',
      });

      setShowCompleteModal(false);
      if (onCompleteJob) {
        onCompleteJob(effectiveOrderId);
      } else {
        onBack();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to submit order for review.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Extract client reference sketches & catalog reference products
  const catRefImages = (req.catalog_references || []).map((c: any) => c.image).filter(Boolean);
  const sketchesList: any[] = req.sketches || [];
  const sketchImages = sketchesList.map((s: any) => s.image_url || s.image).filter(Boolean);
  const mainRef = req.reference_image ? [req.reference_image] : [];
  const referenceImages: string[] = Array.from(new Set([...catRefImages, ...sketchImages, ...mainRef]));

  const activeReferenceImage = referenceImages[selectedSketchIndex] || referenceImages[0];

  if (loading) {
    return (
      <div className="w-full py-20 bg-white rounded-2xl border border-[#E5E7EF] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
        <span className="text-xs font-mono text-[#6B7280]">Loading Order #{effectiveOrderId} Active Workspace...</span>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="w-full p-8 bg-white rounded-2xl border border-rose-200 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <div>
          <h3 className="font-serif text-lg font-bold text-[#1E2230]">Workspace Data Error</h3>
          <p className="text-xs text-[#6B7280] mt-1">{error || 'Order record not found or not assigned to you.'}</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#09112B] text-[#F5E7A3] text-xs font-bold rounded-xl"
        >
          Back to Workbench
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* SECTION 1: PAGE HEADER (PRICE-BLIND STAFF RULE ENFORCED — NO PRICE FIELDS) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EF] pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#1E2230] font-bold text-xs border border-[#E5E7EF] shadow-sm transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-[#C9A227]" /> Back to Workbench
        </button>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37]/40 text-xs font-mono font-bold">
            Order: ORD-{orderData.id}
          </span>
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase ${
            orderData.status === 'pending_review'
              ? 'bg-purple-100 text-purple-800 border border-purple-300'
              : orderData.status === 'completed'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            Status: {orderData.status === 'pending_review' ? 'Pending Admin Review' : orderData.status === 'with_designer' ? 'With Designer' : orderData.status}
          </span>
        </div>
      </div>

      {/* SECTION 7: ADMIN REVISION FEEDBACK BANNER (IF REVISION REQUESTED) */}
      {orderData.admin_review_notes && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 text-[#1E2230] shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
            <span>Admin Quality Control Revision Feedback</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed italic bg-white p-3 rounded-xl border border-amber-200">
            "{orderData.admin_review_notes}"
          </p>
          <p className="text-[11px] text-amber-800 font-mono">
            ● Please address the feedback notes above, update your deliverables or milestones, and re-submit for review.
          </p>
        </div>
      )}

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 2: JOB BRIEF CARD */}
          <div className="bg-white border-l-4 border-l-[#C9A227] border border-[#E5E7EF] p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#C9A227] font-bold">
                {req.category_name || 'Custom Jewellery'} • CLIENT: {req.client_display_name || 'VALUED CLIENT'}
              </span>
              <span className={`flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded-full border font-bold ${timerColorClass}`}>
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                {remainingTimeStr}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-serif font-bold text-[#1E2230]">
                Bespoke {req.category_name || 'Custom Piece'} — Order #ORD-{orderData.id}
              </h2>
            </div>

            {/* Configurator Attributes Strip */}
            <div className="flex flex-wrap gap-2 pt-1">
              {req.aesthetic_style_name && (
                <span className="px-3 py-1 rounded-lg bg-[#F1F5F9] border border-slate-200 text-xs text-[#09112B] font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" /> Style: {req.aesthetic_style_name}
                </span>
              )}

              {req.metal_alloy_name && (
                <span className="px-3 py-1 rounded-lg bg-[#F1F5F9] border border-slate-200 text-xs text-[#09112B] font-medium flex items-center gap-1.5">
                  {req.metal_swatch_color && (
                    <span
                      className="w-3 h-3 rounded-full border border-black/20"
                      style={{ backgroundColor: req.metal_swatch_color }}
                    />
                  )}
                  Metal: {req.metal_alloy_name}
                </span>
              )}

              {req.gemstone_preference_open ? (
                <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-medium flex items-center gap-1">
                  <Gem className="w-3.5 h-3.5 text-emerald-600" />
                  Open Preference (Let Designer Decide)
                </span>
              ) : gemstonesList.length > 0 ? (
                <button
                  onClick={() => setShowGemstonesModal(true)}
                  className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-xs text-indigo-800 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Gem className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{gemstonesList.length} Gemstone Spec(s) Defined (Click to View)</span>
                </button>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
                  Standard Metal Only (No Stones)
                </span>
              )}

              {req.ring_size && (
                <span className="px-3 py-1 rounded-lg bg-[#F1F5F9] border border-slate-200 text-xs text-[#09112B] font-medium flex items-center gap-1">
                  Size: {req.ring_size} ({req.ring_size_standard?.toUpperCase() || 'US'})
                </span>
              )}

              {req.target_weight_grams && (
                <span className="px-3 py-1 rounded-lg bg-[#F1F5F9] border border-slate-200 text-xs text-[#09112B] font-medium flex items-center gap-1">
                  Target Weight: {req.target_weight_grams}g
                </span>
              )}

              {req.needed_by_date && (
                <span className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
                  Due: {new Date(req.needed_by_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}

              {req.selections?.map((sel: any, idx: number) => (
                <span key={idx} className="px-3 py-1 rounded-lg bg-[#F1F5F9] border border-slate-200 text-xs text-[#09112B] font-medium flex items-center gap-1">
                  {sel.group_label}: <strong className="ml-0.5">{sel.value_label || sel.other_text}</strong>
                </span>
              ))}
            </div>

            {/* Client Notes / Instructions */}
            <div className="text-xs text-[#4B5563] leading-relaxed bg-[#F8FAFC] p-4 rounded-xl border border-[#E5E7EF]">
              <strong className="text-[#1E2230] font-bold block mb-1">Client Brief & Written Instructions:</strong>
              <p className="italic text-slate-700">{req.description || 'No detailed written instructions provided by client.'}</p>
            </div>
          </div>

          {/* SECTION 4: CRAFTSMAN MILESTONE STEPPER */}
          <div className="bg-white border border-[#E5E7EF] p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C9A227]" />
                <h3 className="text-lg font-serif font-bold text-[#1E2230]">
                  Craftsman Milestone Stepper
                </h3>
              </div>
              <span className="text-xs font-mono text-[#09112B] font-bold bg-[#F1F5F9] px-3 py-1 rounded-lg border border-slate-200">
                Progress: {progressPercentage}%
              </span>
            </div>

            {/* Stepper Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {MILESTONES.map((m, idx) => {
                const isActive = idx === currentMilestoneIndex;
                const isPassed = currentMilestoneIndex >= 0 && idx <= currentMilestoneIndex;

                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => handleStepClick(idx)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isActive
                        ? 'bg-[#09112B] border-[#D4AF37] text-white font-bold shadow-md scale-105'
                        : isPassed
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                        : 'bg-[#F8FAFC] border-[#E5E7EF] text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isActive ? 'text-[#F5E7A3]' : ''}`}>
                        Step 0{idx + 1}
                      </span>
                      {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="text-xs font-bold font-serif">{m.name}</div>
                    <div className={`text-[9px] font-mono mt-1 ${isActive ? 'text-[#F5E7A3]' : 'text-slate-500'}`}>
                      {m.progress}% Weight
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] text-xs text-[#6B7280] flex items-center justify-between">
              <span>
                Current Stage: <strong className="text-[#1E2230] font-serif">{currentMilestoneObj ? currentMilestoneObj.label : 'Commission Claimed • Ready to Begin Blueprint Setup'}</strong>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Click any step to advance milestone</span>
            </div>
          </div>

          {/* SECTION 5: CAD DELIVERABLES VAULT (.3DM, .STL, Render, Video) */}
          <div className="bg-white border border-[#E5E7EF] p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#C9A227]" />
                <h3 className="text-lg font-serif font-bold text-[#1E2230]">
                  CAD Deliverables Vault
                </h3>
              </div>
              <span className="text-xs text-[#6B7280] font-mono">Protected Storage Split Active</span>
            </div>

            {/* Error Notification Alert for File Type Mismatch */}
            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
                <span>⚠️ {uploadError}</span>
                <button onClick={() => setUploadError(null)} className="text-rose-600 font-bold ml-2">✕</button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Slot 1: Rhino 3D (.3DM) — Protected Storage */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#1E2230]">1. Rhino 3D (.3DM)</span>
                  {rhinoDeliverable ? (
                    <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Attached
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium text-[10px]">Optional</span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  Master editable Rhino surface file with layer hierarchy.
                </p>

                <input
                  type="file"
                  accept=".3dm,.rhino"
                  ref={(el) => (fileInputRefs.current['3dm'] = el)}
                  onChange={(e) => handleFileSelected('3dm', e)}
                  className="hidden"
                />

                <button
                  disabled={uploadingFileType === '3dm'}
                  onClick={() => fileInputRefs.current['3dm']?.click()}
                  className="w-full py-2.5 rounded-lg bg-[#09112B] hover:bg-[#122254] text-[#F5E7A3] font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingFileType === '3dm' ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#D4AF37] animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                  )}
                  <span>{rhinoDeliverable ? 'Replace .3DM File' : 'Upload .3DM File'}</span>
                </button>

                {rhinoDeliverable && (
                  <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200 space-y-1">
                    <div className="font-bold truncate">📄 {rhinoDeliverable.filename || 'Master_Model.3dm'}</div>
                    <div className="text-[9px] text-emerald-600 flex justify-between">
                      <span>{rhinoDeliverable.file_size || 'CAD File'}</span>
                      <span>Uploaded {new Date(rhinoDeliverable.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Slot 2: Castable Mesh (.STL) — Protected Storage */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#1E2230]">2. Castable Mesh (.STL)</span>
                  {stlDeliverable ? (
                    <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Attached
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium text-[10px]">Optional</span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  Watertight STL mesh ready for resin 3D printing.
                </p>

                <input
                  type="file"
                  accept=".stl"
                  ref={(el) => (fileInputRefs.current['stl'] = el)}
                  onChange={(e) => handleFileSelected('stl', e)}
                  className="hidden"
                />

                <button
                  disabled={uploadingFileType === 'stl'}
                  onClick={() => fileInputRefs.current['stl']?.click()}
                  className="w-full py-2.5 rounded-lg bg-[#09112B] hover:bg-[#122254] text-[#F5E7A3] font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingFileType === 'stl' ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#D4AF37] animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                  )}
                  <span>{stlDeliverable ? 'Replace .STL File' : 'Upload .STL File'}</span>
                </button>

                {stlDeliverable && (
                  <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200 space-y-1">
                    <div className="font-bold truncate">📄 {stlDeliverable.filename || 'PrintReady.stl'}</div>
                    <div className="text-[9px] text-emerald-600 flex justify-between">
                      <span>{stlDeliverable.file_size || 'Mesh File'}</span>
                      <span>Uploaded {new Date(stlDeliverable.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Slot 3: Client-Facing Render Preview (.JPG/.PNG) */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#1E2230]">3. Render Preview (.JPG/.PNG)</span>
                  {renderDeliverable ? (
                    <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Attached
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium text-[10px]">Optional</span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  Client-facing preview render (becomes visible to client after Admin approval).
                </p>

                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => (fileInputRefs.current['render'] = el)}
                  onChange={(e) => handleFileSelected('render', e)}
                  className="hidden"
                />

                <button
                  disabled={uploadingFileType === 'render'}
                  onClick={() => fileInputRefs.current['render']?.click()}
                  className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingFileType === 'render' ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#D4AF37] animate-spin" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                  )}
                  <span>{renderDeliverable ? 'Replace Render' : 'Upload Render'}</span>
                </button>

                {renderDeliverable && (
                  <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200 truncate">
                    🖼️ {renderDeliverable.filename || 'Preview_Render.png'}
                  </div>
                )}
              </div>

              {/* Slot 4: 360° Turntable Video (Optional) */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#1E2230]">4. 360° Turntable Video</span>
                  {videoDeliverable ? (
                    <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Attached
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium text-[10px]">Optional</span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  360-degree MP4 turntable video demonstration.
                </p>

                <input
                  type="file"
                  accept="video/*"
                  ref={(el) => (fileInputRefs.current['video'] = el)}
                  onChange={(e) => handleFileSelected('video', e)}
                  className="hidden"
                />

                <button
                  disabled={uploadingFileType === 'video'}
                  onClick={() => fileInputRefs.current['video']?.click()}
                  className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingFileType === 'video' ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#D4AF37] animate-spin" />
                  ) : (
                    <Video className="w-3.5 h-3.5 text-[#D4AF37]" />
                  )}
                  <span>{videoDeliverable ? 'Replace Video' : 'Upload Video'}</span>
                </button>

                {videoDeliverable && (
                  <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200 truncate">
                    🎥 {videoDeliverable.filename || 'Turntable.mp4'}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 6: SUBMIT & COMPLETE JOB BUTTON OR SUBMITTED/COMPLETED STATUS BANNER */}
            <div className="pt-4 border-t border-[#E5E7EF] space-y-3">
              {orderData.status === 'pending_review' ? (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-purple-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">Deliverables Submitted for QC Review</h4>
                      <p className="text-xs text-purple-800 mt-0.5">
                        This CAD job has been submitted and is currently awaiting Super Admin Quality Control approval.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onBack}
                    className="px-4 py-2.5 bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs rounded-xl shadow-sm transition-colors whitespace-nowrap"
                  >
                    Return to Workbench
                  </button>
                </div>
              ) : orderData.status === 'completed' || orderData.status === 'preview_ready' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">Job Handover Completed &amp; Approved</h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Super Admin has approved this order. Deliverables have been released to the client.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onBack}
                    className="px-4 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs rounded-xl shadow-sm transition-colors whitespace-nowrap"
                  >
                    Return to Workbench
                  </button>
                </div>
              ) : (
                <>
                  <button
                    disabled={!isReadyToComplete}
                    onClick={() => setShowCompleteModal(true)}
                    className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all ${
                      isReadyToComplete
                        ? 'btn-gold-luxury transform hover:-translate-y-0.5 cursor-pointer'
                        : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Award className="w-5 h-5 stroke-[2.5]" />
                    <span>
                      {orderData.admin_review_notes
                        ? 'Re-submit Revised Deliverables & Hand Over Job'
                        : 'Submit Deliverables & Hand Over Job'}
                    </span>
                    <Send className="w-4 h-4" />
                  </button>

                  {!isReadyToComplete && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 text-amber-600" /> Handover Requirements Pending ({missingRequirements.length}):
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-amber-900 space-y-0.5 pl-1 font-mono">
                        {missingRequirements.map((reqItem, idx) => (
                          <li key={idx}>{reqItem}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: SECTION 3: CLIENT REFERENCE ARTWORK PANEL */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EF] p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-[#1E2230] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#C9A227]" />
                Client Reference Artwork
              </h3>
              {referenceImages.length > 0 && (
                <span className="text-[10px] text-[#6B7280] font-mono">Click to Zoom</span>
              )}
            </div>

            {referenceImages.length > 0 ? (
              <div className="space-y-3">
                <div
                  onClick={() => setActiveZoomImage(activeReferenceImage)}
                  className="relative aspect-square rounded-xl overflow-hidden border border-[#E5E7EF] group cursor-pointer shadow-sm bg-slate-900"
                >
                  <img
                    src={activeReferenceImage}
                    alt="Client Reference Sketch"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                    <Eye className="w-4 h-4 text-[#F5E7A3]" /> Click to Zoom
                  </div>
                </div>

                {/* Multiple Sketches Strip */}
                {referenceImages.length > 1 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#6B7280] block">
                      Uploaded Sketches ({referenceImages.length}):
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {referenceImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedSketchIndex(idx)}
                          className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                            idx === selectedSketchIndex ? 'border-[#C9A227] scale-105 shadow-sm' : 'border-slate-200 opacity-60'
                          }`}
                        >
                          <img src={imgUrl} alt={`Sketch ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Studio Catalog References List */}
                {req.catalog_references && req.catalog_references.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#C9A227] block">
                      Studio Catalog References ({req.catalog_references.length}):
                    </span>
                    {req.catalog_references.map((cRef: any, cIdx: number) => (
                      <div
                        key={cIdx}
                        onClick={() => cRef.image && setActiveZoomImage(cRef.image)}
                        className="flex items-center gap-2.5 text-xs p-2 rounded-lg bg-white border border-slate-200 hover:border-[#C9A227] cursor-pointer transition-all hover:shadow-sm"
                      >
                        {cRef.image ? (
                          <img src={cRef.image} alt={cRef.title} className="w-9 h-9 rounded-md object-cover border border-slate-100 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-mono text-slate-500 shrink-0">CAD</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#1E2230] truncate">{cRef.title}</p>
                          <span className="text-[10px] font-mono text-[#C9A227] font-semibold">{cRef.sku || `SKU-${cRef.id}`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* HONEST EMPTY STATE (NO FAKE UNRELATED FALLBACK ARTWORK!) */
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-[#1E2230]">No Reference Image Provided</p>
                <p className="text-[11px] text-[#6B7280] leading-relaxed">
                  No reference image provided — refer to the written brief above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GEMSTONES SPECIFICATION MODAL */}
      {showGemstonesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-2xl p-6 max-w-lg w-full space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-indigo-600" />
                <h3 className="font-serif text-base font-bold text-[#1E2230]">Gemstone Specifications</h3>
              </div>
              <button onClick={() => setShowGemstonesModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {gemstonesList.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {gemstonesList.map((stone: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EF] flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-[#1E2230] text-sm">
                        {stone.quantity}x {stone.stone_type || 'Diamond'}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        Cut: {stone.cut_type || 'Round Brilliant'} {stone.carat_size ? `• ${stone.carat_size} Carat` : ''}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-800 font-mono font-bold text-[10px]">
                      Spec #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">No specific gemstone details configured.</p>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowGemstonesModal(false)}
                className="px-4 py-2 rounded-xl bg-[#09112B] text-white text-xs font-bold"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX IMAGE ZOOM MODAL */}
      {activeZoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-fadeIn"
          onClick={() => setActiveZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-2xl bg-black">
            <button
              onClick={() => setActiveZoomImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={activeZoomImage} alt="Full Reference Zoom" className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      {/* SUBMIT CONFIRMATION MODAL */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-2xl p-6 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-[#E5E7EF] pb-3">
              <div className="p-2.5 rounded-xl bg-[#09112B] text-[#D4AF37]">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1E2230]">Hand Over CAD Commission</h3>
                <span className="text-xs font-mono text-[#6B7280]">Order #ORD-{effectiveOrderId}</span>
              </div>
            </div>

            <p className="text-xs text-[#4B5563] leading-relaxed">
              Ready to hand this job over? Your workbench slot will be freed once submitted, and deliverables will be transferred for Admin QC review.
            </p>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1 font-mono">
              <div>✓ Rhino Master File (.3DM): {rhinoDeliverable?.filename}</div>
              <div>✓ Castable STL (.STL): {stlDeliverable?.filename}</div>
              <div>✓ Render Preview (.JPG/.PNG): {renderDeliverable?.filename || 'Attached'}</div>
              <div>✓ Milestone Stage: Ready for Delivery (100%)</div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={isCompleting}
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E5E7EF] text-xs font-bold text-[#1E2230] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isCompleting}
                onClick={handleConfirmCompleteOrder}
                className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
              >
                {isCompleting ? (
                  <Loader2 className="w-4 h-4 text-[#09112B] animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#09112B]" />
                    <span>Confirm &amp; Complete Handover</span>
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
