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
  Calendar,
  MessageSquare,
  Volume2,
  Wrench,
  Download,
  ExternalLink
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
  const [selectedUploadFile, setSelectedUploadFile] = useState<{ file: File; fileType: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
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

  // Abort any in-progress upload on workspace unmount
  useEffect(() => {
    return () => {
      if (uploadAbortControllerRef.current) {
        uploadAbortControllerRef.current.abort();
      }
    };
  }, []);

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
        const overDays = Math.floor(overTotalSecs / 86400);
        const overHours = Math.floor((overTotalSecs % 86400) / 3600);
        const overMins = Math.floor((overTotalSecs % 3600) / 60);

        setRemainingTimeStr(`OVERDUE by ${overDays > 0 ? `${overDays}d ` : ''}${overHours}h ${overMins}m`);
        setTimerColorClass('text-rose-700 bg-rose-50 border-rose-300 font-extrabold animate-pulse');
        return;
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      const formatted = days > 0
        ? `${days}d ${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
        : `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
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

  // Extract linked CustomRequest / FileEditRequest, deliverables, milestones
  const isFileEdit = orderData?.order_type === 'file_edit' || Boolean(orderData?.file_edit_request) || Boolean(orderData?.is_file_edit) || Boolean(job?.isFileEdit);
  const fe = orderData?.file_edit_request || (job?.isFileEdit ? job : null);
  const req = isFileEdit && fe ? fe : (orderData?.custom_request || {});
  const deliverablesList: any[] = orderData?.deliverables || [];
  const milestonesList: any[] = orderData?.milestones || [];
  const gemstonesList: any[] = req.gemstones || [];

  const activeMilestones = isFileEdit ? [
    { name: 'Started' as const, progress: 25, label: '01. Original Geometry & Mesh Inspected' },
    { name: 'Modeling' as const, progress: 60, label: '02. CAD Modifications & Corrections Sculpted' },
    { name: 'Refining' as const, progress: 85, label: '03. Tolerances, Prongs & Castability Verified' },
    { name: 'Ready for Delivery' as const, progress: 100, label: '04. Watertight CAD Export & 3D Render' },
  ] : MILESTONES;

  // Determine current milestone stage from backend milestones
  const getLatestMilestoneIndex = () => {
    if (orderData?.status === 'completed' || orderData?.status === 'delivered') return 3;
    if (orderData?.status === 'pending_review' || orderData?.status === 'preview_ready') return 2;

    if (!milestonesList || milestonesList.length === 0) {
      if (deliverablesList.length >= 3) return 2;
      if (deliverablesList.length >= 2) return 1;
      if (deliverablesList.length >= 1) return 0;
      return -1; // Freshly accepted order: no milestone marked yet (0% progress)
    }

    const stageNames = milestonesList.map((m: any) => (m.stage || '').toLowerCase());
    let highestIdx = -1;
    activeMilestones.forEach((m, idx) => {
      if (stageNames.some((s: string) => s.includes(m.name.toLowerCase()) || s.includes(m.label.toLowerCase()) || s.includes(`0${idx + 1}.`))) {
        highestIdx = idx;
      }
    });

    if (highestIdx === -1) {
      if (deliverablesList.length >= 3) return 2;
      if (deliverablesList.length >= 2) return 1;
      if (deliverablesList.length >= 1) return 0;
    }

    return highestIdx;
  };

  const currentMilestoneIndex = orderData ? getLatestMilestoneIndex() : -1;
  const currentMilestoneObj = currentMilestoneIndex >= 0 ? activeMilestones[currentMilestoneIndex] : null;
  const progressPercentage = currentMilestoneIndex >= 0 ? (activeMilestones[currentMilestoneIndex]?.progress || 0) : 0;

  // Advance Milestone via API
  const handleStepClick = async (targetIdx: number) => {
    const targetMilestone = activeMilestones[targetIdx];
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

  // Cancel In-Progress Upload Flow (Aborts fetch, clears file selection, resets state)
  const handleCancelUpload = (fileType?: string) => {
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
      uploadAbortControllerRef.current = null;
    }
    const targetType = fileType || uploadingFileType || selectedUploadFile?.fileType;
    if (targetType && fileInputRefs.current[targetType]) {
      fileInputRefs.current[targetType]!.value = '';
    }
    setUploadingFileType(null);
    setSelectedUploadFile(null);
    setUploadError(null);
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

    const controller = new AbortController();
    uploadAbortControllerRef.current = controller;
    setUploadingFileType(fileType);
    setSelectedUploadFile({ file, fileType });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', fileType);

      await api.request(`/orders/${effectiveOrderId}/deliverables/`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      await fetchOrderDetails();
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        console.log(`[Deliverable Upload] Aborted by staff for slot: ${fileType}`);
      } else {
        setUploadError(err?.message || `Failed to upload ${fileType} file.`);
      }
    } finally {
      uploadAbortControllerRef.current = null;
      setUploadingFileType(null);
      setSelectedUploadFile(null);
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
      <div className="w-full py-20 bg-white rounded-2xl border border-[#E8D7B7] flex flex-col items-center justify-center gap-3">
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
          <h3 className="font-serif text-lg font-bold text-[#17243B]">Workspace Data Error</h3>
          <p className="text-xs text-[#6B7280] mt-1">{error || 'Order record not found or not assigned to you.'}</p>
        </div>
        <button
          onClick={onBack}
          className="btn-gold-luxury px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
        >
          Back to Workbench
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* SECTION 1: PAGE HEADER (PRICE-BLIND STAFF RULE ENFORCED — NO PRICE FIELDS) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8D7B7] pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#FFF9F0] text-[#17345C] font-semibold text-xs border border-[#E8D7B7] hover:border-[#B88732] shadow-2xs transition-colors w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#B88732]" /> Back to Workbench
        </button>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full bg-[#17345C] text-[#FFF9F0] text-xs font-mono font-bold shadow-2xs">
            Order: ORD-{orderData.id}
          </span>
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase ${
            orderData.status === 'pending_review'
              ? 'bg-purple-100 text-purple-800 border border-purple-300'
              : orderData.status === 'completed'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : orderData.status === 'revision_requested'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            Status: {
              orderData.status === 'pending_review'
                ? 'Pending Admin Review'
                : orderData.status === 'with_designer'
                ? 'With Designer'
                : orderData.status === 'revision_requested'
                ? `Changes Requested by Client (Target v${orderData.current_version || 1})`
                : orderData.status
            }
          </span>
        </div>
      </div>

      {/* SECTION 7A: CLIENT REVISION FEEDBACK (IF CLIENT REQUESTED CHANGES) */}
      {orderData.revision_requests && orderData.revision_requests.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 space-y-3 text-[#17243B] shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase tracking-wider">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <span>Customer Revision Instructions ({orderData.revision_requests.length} Iteration{orderData.revision_requests.length > 1 ? 's' : ''} Logged)</span>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold border border-amber-300">
              Active Target: Deliverable v{orderData.current_version || 1}
            </span>
          </div>

          <div className="space-y-2.5">
            {orderData.revision_requests.map((rev: any, idx: number) => (
              <div key={rev.id || idx} className="p-4 rounded-xl bg-white border border-amber-200 shadow-sm space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#17243B]">
                    Revision #{rev.revision_number} &bull; Against Previous Deliverable v{rev.deliverable_version}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                    rev.status === 'addressed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    rev.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {rev.status === 'addressed' ? 'Addressed' : rev.status === 'in_progress' ? 'Modelling in CAD' : 'Action Required'}
                  </span>
                </div>

                <p className="text-slate-800 text-xs italic leading-relaxed bg-[#F8FAFC] p-3 rounded-lg border border-slate-200">
                  "{rev.comment}"
                </p>

                {(rev.voice_note || rev.reference_image) && (
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    {rev.voice_note && (
                      <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                        <Volume2 className="w-4 h-4 text-amber-600" />
                        <span className="text-[11px]">Spoken Voice Note:</span>
                        <audio controls src={rev.voice_note} className="h-7 w-48" />
                      </div>
                    )}
                    {rev.reference_image && (
                      <a
                        href={rev.reference_image}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold hover:underline"
                      >
                        <ImageIcon className="w-4 h-4 text-blue-600" />
                        <span>Inspect Customer Markup Image</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-amber-900 font-mono">
            ● Please address the client's instructions above in Rhino CAD, export updated files, and upload below as <strong>v{orderData.current_version || 1}</strong>.
          </p>
        </div>
      )}

      {/* SECTION 7B: ADMIN REVISION FEEDBACK BANNER (IF INTERNAL QC REVISION REQUESTED) */}
      {orderData.admin_review_notes && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 text-[#17243B] shadow-sm">
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
          <div className="bg-white border-l-4 border-l-[#C9A227] border border-[#E8D7B7] p-6 rounded-2xl shadow-sm space-y-4">
            {isFileEdit ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-cyan-700 font-bold flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-cyan-600" />
                    CAD FILE MODIFICATION STUDIO • CLIENT: {fe?.client_display_name || fe?.contact_name || 'VALUED CLIENT'}
                  </span>
                  <div className="flex flex-col sm:items-end gap-1">
                    <span className={`flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded-full border font-bold ${timerColorClass}`}>
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      {remainingTimeStr}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-cyan-600" />
                      Target Due: <strong className="text-slate-800">
                        {orderData.due_at
                          ? new Date(orderData.due_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : `Within ${orderData.deadline_hours || 48}h`}
                      </strong>
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#17243B]">
                    {fe?.original_file_name ? `CAD Modification: ${fe.original_file_name}` : `CAD File Modification #${orderData.id}`}
                  </h2>
                </div>

                {/* Customer's Original File Direct Download Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#071329] via-[#0B1E3D] to-[#071329] text-white border-2 border-cyan-500/50 shadow-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono font-bold uppercase">
                            .{fe?.original_file_format?.toUpperCase() || '3DM'} ORIGINAL ASSET
                          </span>
                          {fe?.file_size_bytes && (
                            <span className="text-slate-400 text-xs font-mono">
                              {(fe.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          )}
                        </div>
                        <h4 className="font-mono font-bold text-sm text-white mt-1 truncate max-w-md">
                          {fe?.original_file_name || `Customer_CAD_File.${fe?.original_file_format || '3dm'}`}
                        </h4>
                        <p className="text-xs text-slate-300">
                          Inspect &amp; modify geometry in Rhino 8, MatrixGold, or CAD software.
                        </p>
                      </div>
                    </div>

                    {(fe?.download_url || fe?.original_file_url || fe?.original_file) && (
                      <a
                        href={fe.download_url || fe.original_file_url || fe.original_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-gold-luxury px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shrink-0 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-[#0B1330]" />
                        <span>Download Original File</span>
                      </a>
                    )}
                  </div>

                  {fe?.drive_web_view_link && (
                    <div className="pt-1 flex items-center gap-2 text-xs text-cyan-300">
                      <span>Cloud Storage:</span>
                      <a
                        href={fe.drive_web_view_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-cyan-200 flex items-center gap-1 font-mono"
                      >
                        <span>Open in Google Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Requested Modifications Badges */}
                {fe?.modification_type_labels && fe.modification_type_labels.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                      Requested CAD Modifications:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {fe.modification_type_labels.map((lbl: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 rounded-xl bg-cyan-50 border border-cyan-300 text-cyan-900 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                          <Wrench className="w-3.5 h-3.5 text-cyan-600" />
                          {lbl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  {fe?.target_weight_grams && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Target Weight</span>
                      <p className="font-bold text-slate-900 font-mono">{fe.target_weight_grams} grams</p>
                    </div>
                  )}
                  {fe?.target_stone_size && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Target Stone Sizing</span>
                      <p className="font-bold text-slate-900 font-mono">{fe.target_stone_size}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Delivery SLA</span>
                    <p className="font-bold text-slate-900 font-mono">{orderData.deadline_hours || 48} Hours</p>
                  </div>
                </div>

                {/* Voice Note if available */}
                {fe?.voice_note && (
                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 space-y-1.5">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-amber-600" /> Customer Spoken Voice Note:
                    </span>
                    <audio controls src={fe.voice_note} className="w-full h-8" />
                  </div>
                )}

                {/* Client Notes / Instructions */}
                <div className="text-xs text-[#4B5563] leading-relaxed bg-[#F8FAFC] p-4 rounded-xl border border-[#E8D7B7]">
                  <strong className="text-[#17243B] font-bold block mb-1">Customer Special Modification Instructions:</strong>
                  <p className="italic text-slate-700">{fe?.description || req?.description || 'No detailed written instructions provided.'}</p>
                </div>
              </div>
            ) : (
              <>
                {(() => {
                  const categoryDisplay =
                    req.category_name ||
                    req.description?.match(/(?:Requirement|Category|Design Requirement):\s*([^\n•]+)/i)?.[1]?.trim() ||
                    'Custom Jewellery';

                  const metalDisplay =
                    req.metal_alloy_name ||
                    req.description?.match(/(?:Full Metal Specification|Full Metal Alloy|Alloy):\s*([^\n•]+)/i)?.[1]?.trim() ||
                    req.description?.match(/Material:\s*([^\n•]+)/i)?.[1]?.trim() ||
                    'Custom Metal Alloy';

                  const purityDisplay =
                    req.description?.match(/(?:Carat \/ Purity|Purity|Carat):\s*([^\n•]+)/i)?.[1]?.trim();

                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs font-mono uppercase tracking-widest text-[#C9A227] font-bold">
                          {categoryDisplay} • CLIENT: {req.contact_name || req.client_name || req.client_display_name || 'VALUED CLIENT'}
                        </span>
                        <div className="flex flex-col sm:items-end gap-1">
                          <span className={`flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded-full border font-bold ${timerColorClass}`}>
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            {remainingTimeStr}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#B88732]" />
                            Target Due: <strong className="text-slate-800">
                              {orderData.due_at
                                ? new Date(orderData.due_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : `Within ${orderData.deadline_hours || 48}h`}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div>
                        <h2 className="text-2xl font-serif font-bold text-[#17243B]">
                          Bespoke {categoryDisplay} — Order #ORD-{orderData.id}
                        </h2>
                      </div>

                      {/* Configurator Attributes Strip */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {req.aesthetic_style_name && (
                          <span className="px-3 py-1 rounded-lg bg-[#F1F5F9] border border-slate-200 text-xs text-[#09112B] font-medium flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" /> Style: {req.aesthetic_style_name}
                          </span>
                        )}

                        <span className="px-3 py-1 rounded-lg bg-[#F1F5F9] border border-slate-200 text-xs text-[#09112B] font-medium flex items-center gap-1.5">
                          {req.metal_swatch_color && (
                            <span
                              className="w-3 h-3 rounded-full border border-black/20"
                              style={{ backgroundColor: req.metal_swatch_color }}
                            />
                          )}
                          Metal: <strong>{metalDisplay}</strong>
                        </span>

                        {purityDisplay && !metalDisplay.includes(purityDisplay) && (
                          <span className="px-3 py-1 rounded-lg bg-[#F1F5F9] border border-slate-200 text-xs text-[#09112B] font-medium flex items-center gap-1">
                            Purity: <strong>{purityDisplay}</strong>
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
                        ) : req.is_metal_only ? (
                          <span className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
                            Metal Only (No Stones)
                          </span>
                        ) : null}

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
                      <div className="text-xs text-[#4B5563] leading-relaxed bg-[#F8FAFC] p-5 rounded-2xl border border-[#E8D7B7] space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-[#E8D7B7]/60 pb-2">
                          <strong className="text-[#17243B] font-serif font-bold text-sm flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#C9A227]" />
                            Client Brief &amp; Written Instructions
                          </strong>
                          <span className="text-[10px] font-mono text-[#6B7280]">Original Customer Specifications</span>
                        </div>
                        <div className="whitespace-pre-line text-slate-800 font-sans leading-relaxed text-xs pt-1">
                          {req.description || 'No detailed written instructions provided by client.'}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>

          {/* SECTION 4: CRAFTSMAN MILESTONE STEPPER */}
          <div className="bg-white border border-[#E8D7B7] p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C9A227]" />
                <h3 className="text-lg font-serif font-bold text-[#17243B]">
                  Craftsman Milestone Stepper
                </h3>
              </div>
              <span className="text-xs font-mono text-[#17345C] font-bold bg-[#FFF9F0] px-3 py-1 rounded-lg border border-[#E8D7B7] shadow-2xs">
                Progress: {progressPercentage}%
              </span>
            </div>

            {/* Stepper Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {activeMilestones.map((m, idx) => {
                const isActive = idx === currentMilestoneIndex;
                const isPassed = currentMilestoneIndex >= 0 && idx <= currentMilestoneIndex;

                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => handleStepClick(idx)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isActive
                        ? 'bg-[#17345C] border-[#B88732] text-[#FFF9F0] font-bold shadow-md scale-105'
                        : isPassed
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                        : 'bg-[#FFFDF9] border-[#E8D7B7] text-[#687386] hover:border-[#B88732]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isActive ? 'text-[#D9B66F]' : ''}`}>
                        Step 0{idx + 1}
                      </span>
                      {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="text-xs font-bold font-serif">{m.name}</div>
                    <div className={`text-[9px] font-mono mt-1 ${isActive ? 'text-[#D9B66F]' : 'text-slate-500'}`}>
                      {m.progress}% Weight
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E8D7B7] text-xs text-[#6B7280] flex items-center justify-between">
              <span>
                Current Stage: <strong className="text-[#17243B] font-serif">{currentMilestoneObj ? currentMilestoneObj.label : 'Commission Claimed • Ready to Begin Blueprint Setup'}</strong>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Click any step to advance milestone</span>
            </div>
          </div>

          {/* SECTION 5: CAD DELIVERABLES VAULT (.3DM, .STL, Render, Video) */}
          <div className="bg-white border border-[#E8D7B7] p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#C9A227]" />
                <h3 className="text-lg font-serif font-bold text-[#17243B]">
                  CAD Deliverables Vault
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#17345C] text-[#F5E7A3] text-xs font-mono font-bold border border-[#C9A227]/40">
                  Target: Deliverable v{orderData?.current_version || 1}
                </span>
                <span className="text-xs text-[#6B7280] font-mono hidden sm:inline">Protected Storage Active</span>
              </div>
            </div>

            {/* Uploading Notification Alert with Cancel Button */}
            {uploadingFileType && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Loader2 className="w-4 h-4 text-[#C9A227] animate-spin shrink-0" />
                  <span className="truncate">
                    Uploading <strong>{uploadingFileType.toUpperCase()}</strong> deliverable: <span className="font-mono text-[11px] font-semibold">{selectedUploadFile?.file?.name || 'File'}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCancelUpload(uploadingFileType)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Cancel upload and reset file"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Upload</span>
                </button>
              </div>
            )}

            {/* Error Notification Alert for File Type Mismatch */}
            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
                <span>⚠️ {uploadError}</span>
                <button onClick={() => setUploadError(null)} className="text-rose-600 font-bold ml-2">✕</button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Slot 1: Rhino 3D (.3DM) — Protected Storage */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E8D7B7] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#17243B]">1. Rhino 3D (.3DM)</span>
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

                {uploadingFileType === '3dm' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2.5 rounded-xl bg-[#17345C] text-[#FFF9F0] font-bold text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-[#D9B66F] animate-spin" />
                      <span className="truncate">Uploading .3DM...</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelUpload('3dm')}
                      className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Cancel this upload"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRefs.current['3dm']?.click()}
                    className="btn-gold-luxury w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{rhinoDeliverable ? 'Replace .3DM File' : 'Upload .3DM File'}</span>
                  </button>
                )}

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
              <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E8D7B7] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#17345C]">2. Castable Mesh (.STL)</span>
                  {stlDeliverable ? (
                    <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Attached
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium text-[10px]">Optional</span>
                  )}
                </div>
                <p className="text-[11px] text-[#687386]">
                  Watertight STL mesh ready for resin 3D printing.
                </p>

                <input
                  type="file"
                  accept=".stl"
                  ref={(el) => (fileInputRefs.current['stl'] = el)}
                  onChange={(e) => handleFileSelected('stl', e)}
                  className="hidden"
                />

                {uploadingFileType === 'stl' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2.5 rounded-xl bg-[#17345C] text-[#FFF9F0] font-bold text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-[#D9B66F] animate-spin" />
                      <span className="truncate">Uploading .STL...</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelUpload('stl')}
                      className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Cancel this upload"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRefs.current['stl']?.click()}
                    className="btn-gold-luxury w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{stlDeliverable ? 'Replace .STL File' : 'Upload .STL File'}</span>
                  </button>
                )}

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
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E8D7B7] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#17243B]">3. Render Preview (.JPG/.PNG)</span>
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

                {uploadingFileType === 'render' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2.5 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-[#D4AF37] animate-spin" />
                      <span className="truncate">Uploading Render...</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelUpload('render')}
                      className="py-2.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Cancel this upload"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRefs.current['render']?.click()}
                    className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{renderDeliverable ? 'Replace Render' : 'Upload Render'}</span>
                  </button>
                )}

                {renderDeliverable && (
                  <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200 truncate">
                    🖼️ {renderDeliverable.filename || 'Preview_Render.png'}
                  </div>
                )}
              </div>

              {/* Slot 4: 360° Turntable Video (Optional) */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E8D7B7] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#17243B]">4. 360° Turntable Video</span>
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

                {uploadingFileType === 'video' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2.5 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-[#D4AF37] animate-spin" />
                      <span className="truncate">Uploading Video...</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelUpload('video')}
                      className="py-2.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Cancel this upload"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRefs.current['video']?.click()}
                    className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{videoDeliverable ? 'Replace Video' : 'Upload Video'}</span>
                  </button>
                )}

                {videoDeliverable && (
                  <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200 truncate">
                    🎥 {videoDeliverable.filename || 'Turntable.mp4'}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 6: SUBMIT & COMPLETE JOB BUTTON OR SUBMITTED/COMPLETED STATUS BANNER */}
            <div className="pt-4 border-t border-[#E8D7B7] space-y-3">
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
          <div className="bg-white border border-[#E8D7B7] p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-[#17243B] flex items-center gap-2">
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
                  className="relative aspect-square rounded-xl overflow-hidden border border-[#E8D7B7] group cursor-pointer shadow-sm bg-slate-900"
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
                          <p className="font-bold text-[#17243B] truncate">{cRef.title}</p>
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
                <p className="text-xs font-semibold text-[#17243B]">No Reference Image Provided</p>
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
          <div className="bg-white rounded-2xl border border-[#E8D7B7] shadow-2xl p-6 max-w-lg w-full space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-indigo-600" />
                <h3 className="font-serif text-base font-bold text-[#17243B]">Gemstone Specifications</h3>
              </div>
              <button onClick={() => setShowGemstonesModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {gemstonesList.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {gemstonesList.map((stone: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E8D7B7] flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-[#17243B] text-sm">
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
                className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-[#E8D7B7] shadow-2xl p-6 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-[#E8D7B7] pb-3">
              <div className="p-2.5 rounded-xl bg-[#FFF9F0] text-[#B88732] border border-[#E8D7B7] shadow-2xs">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#17243B]">Hand Over CAD Deliverables (v{orderData?.current_version || 1})</h3>
                <span className="text-xs font-mono text-[#687386]">Order #ORD-{effectiveOrderId} &bull; Target Iteration v{orderData?.current_version || 1}</span>
              </div>
            </div>

            <p className="text-xs text-[#4B5563] leading-relaxed">
              Ready to hand this job over? Your deliverables for version <strong>v{orderData?.current_version || 1}</strong> will be submitted to the studio admin QC queue for review.
            </p>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1 font-mono">
              <div>✓ Version: Deliverable v{orderData?.current_version || 1}</div>
              <div>✓ Rhino Master File (.3DM): {rhinoDeliverable?.filename || 'Attached'}</div>
              <div>✓ Castable STL (.STL): {stlDeliverable?.filename || 'Attached'}</div>
              <div>✓ Render Preview (.JPG/.PNG): {renderDeliverable?.filename || 'Attached'}</div>
              <div>✓ Milestone Stage: Ready for Delivery (100%)</div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={isCompleting}
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E8D7B7] text-xs font-bold text-[#17243B] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isCompleting}
                onClick={handleConfirmCompleteOrder}
                className="btn-gold-luxury px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
              >
                {isCompleting ? (
                  <Loader2 className="w-4 h-4 text-[#17345C] animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#17345C]" />
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
