import React, { useState, useEffect } from 'react';
import {
  PageId,
  StaffPortalTab,
  StaffMember,
  AvailableJob,
  StaffActiveJob,
  StaffSubmission,
  StaffEarningsRecord,
  AdminNotification,
  WaxSealState,
} from '../types';
import { appStore } from '../services/store';
import { api } from '../services/api';

import { StaffLayout } from '../components/staff/StaffLayout';
import { AuthModal } from '../components/AuthModal';
import { WaxSealStamp } from '../components/staff/WaxSealStamp';
import { useAuth } from '../context/AuthContext';

import { StaffWorkbenchTab } from '../components/staff/StaffWorkbenchTab';
import { StaffJobPoolTab } from '../components/staff/StaffJobPoolTab';
import { StaffMyDesignsTab } from '../components/staff/StaffMyDesignsTab';
import { StaffActiveJobWorkspace } from '../components/staff/StaffActiveJobWorkspace';
import { StaffHistoryTab } from '../components/staff/StaffHistoryTab';
import { StaffEarningsTab } from '../components/staff/StaffEarningsTab';
import { StaffProfileTab } from '../components/staff/StaffProfileTab';
import { StaffNotificationsTab } from '../components/staff/StaffNotificationsTab';

const DEFAULT_STAFF_FALLBACK: StaffMember = {
  id: 'STF-102',
  name: 'Harshil Shah',
  email: 'shahharshil3103@gmail.com',
  phone: '+91 95747 87098',
  avatar: '/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  role: 'Master CAD Modeler & Gemologist',
  status: 'active',
  maxJobLimit: 5,
  currentLoad: 0,
  jobsCompleted: 42,
  rating: 4.96,
  totalEarnings: 3850,
  activeJobs: [],
};

interface StaffPortalPageProps {
  onBackToMain: () => void;
  onNavigate?: (page: PageId, extraId?: string) => void;
  initialTab?: StaffPortalTab;
}

export const StaffPortalPage: React.FC<StaffPortalPageProps> = ({
  onBackToMain,
  onNavigate,
  initialTab,
}) => {
  const { openAuthModal } = useAuth();
  const [activeTab, setActiveTabState] = useState<StaffPortalTab>(initialTab || 'workbench');
  const [selectedActiveJobId, setSelectedActiveJobId] = useState<string | null>(null);
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  // Sync state from URL tab param if initialTab changes
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTabState(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: StaffPortalTab) => {
    setActiveTabState(tab);
    if (onNavigate) {
      onNavigate('staff-portal', tab);
    }
  };

  // Core State from appStore (Persisted!)
  const [staff, setStaff] = useState<StaffMember>(() => {
    const saved = localStorage.getItem('shiuli_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u) {
          const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
          return {
            id: `STF-${u.id || '102'}`,
            name: fullName || 'Harshil Shah',
            email: u.email || 'shahharshil313@gmail.com',
            phone: u.phone_number || '+91 98201 44829',
            avatar: u.profile_photo || DEFAULT_STAFF_FALLBACK.avatar,
            role: u.staff_profile?.specialty_tags || 'MatrixGold Specialist',
            status: u.is_active_staff !== false ? 'active' : 'inactive',
            maxJobLimit: u.staff_profile?.max_concurrent_jobs || 3,
            currentLoad: 0,
            jobsCompleted: u.staff_profile?.total_jobs_completed || 0,
            rating: parseFloat(u.staff_profile?.rating_average || '5.0') || 5.0,
            totalEarnings: 0,
            activeJobs: [],
          };
        }
      } catch (e) {
        console.warn('Failed to parse shiuli_user:', e);
      }
    }
    return DEFAULT_STAFF_FALLBACK;
  });
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [activeJobs, setActiveJobs] = useState<StaffActiveJob[]>(() => appStore.getActiveJobs());
  const [submissions, setSubmissions] = useState<StaffSubmission[]>(() => appStore.getSubmissions());
  const [earnings, setEarnings] = useState<StaffEarningsRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  // Wax-Seal Animation Overlay state
  const [waxSeal, setWaxSeal] = useState<WaxSealState>({
    active: false,
    title: '',
    subtitle: '',
  });

  const fetchPoolJobs = async () => {
    try {
      const res = await api.request<any>('/orders/pool/');
      if (res && Array.isArray(res.pool_orders)) {
        const mapped: AvailableJob[] = res.pool_orders.map((ord: any) => {
          const isFileEdit = ord.order_type === 'file_edit' || Boolean(ord.file_edit_request) || Boolean(ord.is_file_edit);
          const fe = ord.file_edit_request;
          const req = ord.custom_request;

          const rawPayout = Number(ord.staff_payout_price ?? ord.payout_price ?? (ord.total_price ? Math.round(Number(ord.total_price) * 0.8) : 0));

          if (isFileEdit && fe) {
            const formatStr = (fe.original_file_format || '3dm').toUpperCase();
            return {
              id: ord.id.toString(),
              orderNumber: `FE-ORD-${ord.id}`,
              title: fe.original_file_name ? `CAD Modification: ${fe.original_file_name}` : `CAD File Modification #${ord.id} (${formatStr})`,
              category: `CAD File Modification (${formatStr})`,
              agreedPayout: rawPayout,
              clientBudget: rawPayout > 0 ? `₹${rawPayout.toLocaleString('en-IN')}` : '',
              deadlineHours: ord.deadline_hours || 48,
              releasedTimeAgo: ord.unassigned_since
                ? new Date(ord.unassigned_since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Recently',
              referenceImage: fe.reference_image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
              description: fe.description || 'Customer-uploaded CAD file modification request.',
              metalPreference: fe.modification_type_labels?.join(', ') || 'CAD Modification',
              specsSummary: {
                diamondCount: 0,
                weightEst: fe.target_weight_grams ? `${fe.target_weight_grams} gm` : 'As per brief',
                ringSize: fe.target_stone_size ? `Target: ${fe.target_stone_size}` : undefined,
              },
              status: 'available',
              rawDetails: fe,
              isFileEdit: true,
              originalFileFormat: fe.original_file_format,
              originalFileName: fe.original_file_name,
              originalFileUrl: fe.download_url || fe.original_file,
              downloadUrl: fe.download_url,
              fileSizeBytes: fe.file_size_bytes,
              modificationTypes: fe.modification_type_labels,
              targetWeightGrams: fe.target_weight_grams,
              targetStoneSize: fe.target_stone_size,
              voiceNoteUrl: fe.voice_note,
            };
          }

          const stoneCount = (req?.stones && Array.isArray(req.stones) ? req.stones.length : 0) +
                             (req?.gemstones && Array.isArray(req.gemstones) ? req.gemstones.length : 0);
          const selMetal = req?.selections?.find((s: any) => s.group_key === 'metal' || s.group_label?.toLowerCase().includes('metal'));
          const metalPreference = selMetal?.value_label || req?.metal_alloy_name || '';

          return {
            id: ord.id.toString(),
            orderNumber: `ORD-${ord.id}`,
            title: req?.category_name ? `Bespoke ${req.category_name}` : `Custom Design #${ord.id}`,
            category: req?.category_name || 'Custom Jewellery',
            agreedPayout: rawPayout,
            clientBudget: rawPayout > 0 ? `₹${rawPayout.toLocaleString('en-IN')}` : '',
            deadlineHours: ord.deadline_hours || 48,
            releasedTimeAgo: ord.unassigned_since
              ? new Date(ord.unassigned_since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently',
            referenceImage: req?.catalog_references?.[0]?.image || req?.reference_image || req?.sketches?.[0]?.image_url || req?.sketches?.[0]?.image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
            description: req?.description || 'Watertight 3D CAD design request.',
            metalPreference: metalPreference,
            specsSummary: {
              diamondCount: stoneCount,
              weightEst: req?.target_weight_grams ? `${req.target_weight_grams} gm` : (metalPreference || 'As per CAD'),
              ringSize: req?.ring_size ? `${req.ring_size} (${req.ring_size_standard || 'US'})` : undefined,
            },
            status: 'available',
            rawDetails: req,
            isFileEdit: false,
          };
        });
        setAvailableJobs(mapped);
      }
    } catch (e) {
      console.warn('Failed to fetch pool jobs from API:', e);
    }
  };

  const fetchMyActiveJobs = async () => {
    try {
      const res = await api.request<any>('/orders/');
      const ensureArray = (r: any) => {
        if (Array.isArray(r)) return r;
        if (r && Array.isArray(r.results)) return r.results;
        return [];
      };
      const orderList = ensureArray(res);
      if (orderList.length > 0) {
        // Filter out finished/completed/delivered orders from active workbench tray
        const activeOrders = orderList.filter(
          (ord: any) => ord.status !== 'completed' && ord.status !== 'delivered'
        );
        const completedOrders = orderList.filter(
          (ord: any) => ord.status === 'completed' || ord.status === 'delivered'
        );

        const mappedActive: StaffActiveJob[] = activeOrders.map((ord: any) => {
          const isFileEdit = ord.order_type === 'file_edit' || Boolean(ord.file_edit_request) || Boolean(ord.is_file_edit);
          const fe = ord.file_edit_request;
          const req = ord.custom_request;
          const total = parseFloat(ord.total_price || '200');

          // Dynamically compute real milestone and progress percentage from backend
          const milestones: any[] = ord.milestones || [];
          const deliverables: any[] = ord.deliverables || [];
          let currentMilestone: StaffActiveJob['currentMilestone'] = 'Just Accepted';
          let progressPercentage = 0;

          const isClientApproved = milestones.some((m: any) => 
            (m.stage || '').toLowerCase().includes('approved by client') || (m.stage || '').toLowerCase().includes('preview approved')
          );

          if (ord.status === 'completed' || ord.status === 'delivered') {
            currentMilestone = 'Ready for Delivery';
            progressPercentage = 100;
          } else if (isClientApproved) {
            currentMilestone = 'Ready for Delivery';
            progressPercentage = 95;
          } else if (ord.status === 'pending_review') {
            currentMilestone = 'Pending Review';
            progressPercentage = 90;
          } else if (ord.status === 'preview_ready') {
            currentMilestone = 'Refining';
            progressPercentage = 85;
          } else if (milestones.length > 0) {
            const stageNames = milestones.map((m: any) => m.stage);
            if (stageNames.some((s: string) => s.includes('04.') || s.includes('Ready for Delivery') || s.includes('Final'))) {
              currentMilestone = 'Ready for Delivery';
              progressPercentage = 95;
            } else if (stageNames.some((s: string) => s.includes('03.') || s.includes('Refining') || s.includes('Tolerances'))) {
              currentMilestone = 'Refining';
              progressPercentage = 85;
            } else if (stageNames.some((s: string) => s.includes('02.') || s.includes('Modeling') || s.includes('Modifications'))) {
              currentMilestone = 'Modeling';
              progressPercentage = 60;
            } else if (stageNames.some((s: string) => s.includes('01.') || s.includes('Started') || s.includes('Inspected'))) {
              currentMilestone = 'Started';
              progressPercentage = 25;
            }
          } else if (deliverables.length > 0) {
            if (deliverables.length >= 3) {
              currentMilestone = 'Refining';
              progressPercentage = 85;
            } else if (deliverables.length >= 2) {
              currentMilestone = 'Modeling';
              progressPercentage = 60;
            } else {
              currentMilestone = 'Started';
              progressPercentage = 25;
            }
          } else {
            // Freshly accepted order: 0% real progress!
            currentMilestone = 'Just Accepted';
            progressPercentage = 0;
          }

          let displayStatus: StaffActiveJob['status'] = 'With CAD Designer';
          if (ord.status === 'pending_review') {
            displayStatus = 'Pending Admin QC Review' as any;
          } else if (ord.status === 'preview_ready') {
            displayStatus = isClientApproved 
              ? 'Client Approved • Upload Master Deliverables' as any
              : 'In Client 3D Review' as any;
          }

          if (isFileEdit && fe) {
            const formatStr = (fe.original_file_format || '3dm').toUpperCase();
            return {
              id: ord.id.toString(),
              orderNumber: `FE-ORD-${ord.id}`,
              title: fe.original_file_name ? `CAD Modification: ${fe.original_file_name}` : `CAD File Modification #${ord.id} (${formatStr})`,
              category: `CAD File Modification (${formatStr})`,
              referenceImage: fe.reference_image || ord.preview_image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
              acceptedAt: ord.assigned_at ? new Date(ord.assigned_at).toLocaleDateString() : 'Active',
              deadline: 'In 48 Hours',
              hoursRemaining: 48,
              payoutAmount: Number(ord.staff_payout_price ?? ord.payout_price ?? (total ? Math.round(total * 0.8) : 0)),
              clientName: fe.contact_name || fe.client_display_name || ord.client?.first_name || 'Jewellery Atelier',
              clientNotes: fe.description || 'CAD File Modification',
              currentMilestone: currentMilestone,
              progressPercentage: progressPercentage,
              status: displayStatus,
              isFileEdit: true,
              originalFileFormat: fe.original_file_format,
              originalFileName: fe.original_file_name,
              originalFileUrl: fe.download_url || fe.original_file,
              downloadUrl: fe.download_url,
              fileSizeBytes: fe.file_size_bytes,
              modificationTypes: fe.modification_type_labels,
              targetWeightGrams: fe.target_weight_grams,
              targetStoneSize: fe.target_stone_size,
              voiceNoteUrl: fe.voice_note,
            };
          }

          return {
            id: ord.id.toString(),
            orderNumber: `ORD-${ord.id}`,
            title: req?.category_name ? `Bespoke ${req.category_name}` : `Custom Design #${ord.id}`,
            category: req?.category_name || 'Custom Jewellery',
            referenceImage: req?.catalog_references?.[0]?.image || req?.reference_image || req?.sketches?.[0]?.image_url || req?.sketches?.[0]?.image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
            acceptedAt: ord.assigned_at ? new Date(ord.assigned_at).toLocaleDateString() : 'Active',
            deadline: 'In 48 Hours',
            hoursRemaining: 48,
            payoutAmount: Number(ord.staff_payout_price ?? ord.payout_price ?? (total ? Math.round(total * 0.8) : 0)),
            clientName: req?.contact_name || ord.client?.first_name || 'Jewellery Atelier',
            clientNotes: req?.description || 'Watertight 3D CAD design request.',
            currentMilestone: currentMilestone,
            progressPercentage: progressPercentage,
            status: displayStatus,
            isFileEdit: false,
          };
        });

        setActiveJobs(mappedActive);
        setStaff((prev) => ({
          ...prev,
          currentLoad: mappedActive.length,
          jobsCompleted: Math.max(prev.jobsCompleted, completedOrders.length),
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch my active jobs:', e);
    }
  };

  const fetchStaffDashboard = async () => {
    try {
      const dash: any = await api.request('/staff/me/dashboard/');
      if (dash) {
        setAuthWarning(null);
        setStaff((prev) => ({
          ...prev,
          name: `${dash.user?.first_name || ''} ${dash.user?.last_name || ''}`.trim() || dash.user?.username || prev.name,
          email: dash.user?.email || prev.email,
          maxJobLimit: dash.max_concurrent_jobs || prev.maxJobLimit || 2,
          currentLoad: dash.active_jobs_count ?? prev.currentLoad,
          jobsCompleted: dash.total_completed ?? prev.jobsCompleted,
          rating: dash.user?.rating_average ? parseFloat(dash.user.rating_average) : prev.rating,
        }));
      }
    } catch (e: any) {
      if (e?.status === 403 || e?.status === 401) {
        setAuthWarning(
          'You are currently viewing the Artisan Portal in Guest / Preview Mode. Sign in with an authorized CAD Staff account (e.g. designer_rahul / staff123) or Admin to access real-time job assignments and live payouts.'
        );
      } else {
        console.warn('Failed to fetch staff dashboard:', e);
      }
    }
  };

  const [loadingEarnings, setLoadingEarnings] = useState<boolean>(false);

  const fetchSettlements = async () => {
    setLoadingEarnings(true);
    try {
      const res = await api.request<any>('/settlements/');
      const ensureArray = (r: any) => {
        if (Array.isArray(r)) return r;
        if (r && Array.isArray(r.results)) return r.results;
        return [];
      };
      const list = ensureArray(res);
      const mapped: StaffEarningsRecord[] = list.map((st: any) => {
        const totalAmt = parseFloat(st.amount || '0');
        const paidAmt = parseFloat(st.amount_paid || '0');
        const isSettled = st.status === 'processed' || (paidAmt >= totalAmt && totalAmt > 0);
        const isPartial = st.status === 'partial' || (paidAmt > 0 && paidAmt < totalAmt);

        let displayStatus: 'Settled' | 'Pending Settlement' | 'Partially Settled' = isSettled
          ? 'Settled'
          : isPartial
          ? 'Partially Settled'
          : 'Pending Settlement';

        return {
          id: `SET-${st.id}`,
          orderNumber: st.order_number || (st.order_id ? `ORD-${st.order_id}` : `ORD-${st.id}`),
          title: st.design_title || 'Bespoke Custom CAD Design',
          completedDate: st.created_at || (st.processed_at ? new Date(st.processed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'),
          amount: totalAmt,
          amountPaid: paidAmt,
          balanceDue: typeof st.balance_due === 'number' ? st.balance_due : Math.max(0, totalAmt - paidAmt),
          status: displayStatus,
          settlementRef: st.transaction_ref || undefined,
          paymentMethod: st.payment_method || 'bank_transfer',
          notes: st.notes || '',
          settledAt: st.processed_at ? new Date(st.processed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined,
        };
      });

      setEarnings(mapped);

      // Compute total lifetime earnings & update staff object dynamically!
      const totalLifetime = mapped.reduce((acc, it) => acc + (it.amount || 0), 0);
      setStaff((prev) => ({
        ...prev,
        totalEarnings: totalLifetime,
        jobsCompleted: Math.max(prev.jobsCompleted, mapped.length),
      }));
    } catch (e) {
      console.warn('Failed to fetch staff settlements/earnings:', e);
    } finally {
      setLoadingEarnings(false);
    }
  };

  useEffect(() => {
    fetchStaffDashboard();
    fetchPoolJobs();
    fetchMyActiveJobs();
    fetchSettlements();
  }, [activeTab]);

  // Action 1: Accept Job from Job Pool (First-Accept-Wins Race Mechanic)
  const handleAcceptJob = async (jobId: string) => {
    try {
      await api.request(`/orders/${jobId}/accept/`, { method: 'POST' });
      setWaxSeal({
        active: true,
        title: 'SEAL OF ASSIGNMENT',
        subtitle: `Order #${jobId} has been accepted and locked on your velvet workbench tray!`,
      });
      fetchPoolJobs();
      fetchMyActiveJobs();
    } catch (err: any) {
      alert(err?.message || 'Failed to claim order from pool.');
    }
  };

  // Action 2: Open active job workspace
  const handleOpenActiveWorkspace = (jobId: string) => {
    setSelectedActiveJobId(jobId);
    handleTabChange('active-job');
  };

  // Action 3: Update Milestone Stepper
  const handleUpdateMilestone = (
    jobId: string,
    milestone: StaffActiveJob['currentMilestone'],
    progress: number
  ) => {
    const updatedActive = activeJobs.map((job) =>
      job.id === jobId
        ? {
            ...job,
            currentMilestone: milestone,
            progressPercentage: progress,
          }
        : job
    );
    setActiveJobs(updatedActive);
    appStore.saveActiveJobs(updatedActive);
  };

  // Action 4: Submit Deliverables & Complete Job
  const handleCompleteJob = (jobId: string) => {
    const targetJob = activeJobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    // Remove from active jobs
    const updatedActive = activeJobs.filter((j) => j.id !== jobId);
    setActiveJobs(updatedActive);
    appStore.saveActiveJobs(updatedActive);

    // Update staff load & jobs completed
    setStaff((prev) => ({
      ...prev,
      currentLoad: Math.max(0, prev.currentLoad - 1),
      jobsCompleted: prev.jobsCompleted + 1,
      totalEarnings: prev.totalEarnings + targetJob.payoutAmount,
    }));

    // Add to earnings history
    const newEarnRecord: StaffEarningsRecord = {
      id: `EARN-${Date.now().toString().slice(-4)}`,
      orderNumber: targetJob.orderNumber,
      title: targetJob.title,
      completedDate: new Date().toISOString().split('T')[0],
      amount: targetJob.payoutAmount,
      status: 'Pending Settlement',
    };
    setEarnings((prev) => [newEarnRecord, ...prev]);

    // Trigger Completion Wax-Seal Ceremony
    setWaxSeal({
      active: true,
      title: 'SEAL OF COMPLETION',
      subtitle: `CAD Deliverables for "${targetJob.title}" have been officially delivered to Super Admin. Your workbench slot is now open!`,
      onComplete: () => {
        handleTabChange('workbench');
      },
    });
  };

  // Action 5: Upload Independent Design
  const handleUploadDesign = (newSub: StaffSubmission) => {
    const updatedSubmissions = [newSub, ...submissions];
    setSubmissions(updatedSubmissions);
    appStore.saveSubmissions(updatedSubmissions);

    // Trigger Approval Ceremony preview
    setWaxSeal({
      active: true,
      title: 'STAMPED FOR ADMIN REVIEW',
      subtitle: `Your custom design "${newSub.title}" has been submitted to the Super Admin review queue.`,
    });
  };

  const selectedJobObject = activeJobs.find((j) => j.id === selectedActiveJobId) || activeJobs[0];

  return (
    <>
    <StaffLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      staff={staff}
      availableJobsCount={availableJobs.length}
      activeJobsCount={activeJobs.length}
      notifications={notifications}
      onBackToMain={onBackToMain}
    >
      {/* Wax Seal Ceremony Animation Modal */}
      <WaxSealStamp
        active={waxSeal.active}
        title={waxSeal.title}
        subtitle={waxSeal.subtitle}
        onClose={() => {
          setWaxSeal({ active: false });
          if (waxSeal.onComplete) waxSeal.onComplete();
        }}
      />

      {/* Staff Auth Notice Banner */}
      {authWarning && (
        <div className="mb-5 p-4 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#17345C] shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span className="font-medium">{authWarning}</span>
          </div>
          <button
            onClick={() => openAuthModal('Please sign in with your CAD Designer / Staff account to access the staff portal.')}
            className="btn-gold-luxury px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider shrink-0 cursor-pointer shadow-2xs"
          >
            Sign In as Staff
          </button>
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === 'workbench' && (
        <StaffWorkbenchTab
          staff={staff}
          activeJobs={activeJobs}
          onOpenActiveWorkspace={handleOpenActiveWorkspace}
          onNavigateToTab={handleTabChange}
        />
      )}

      {activeTab === 'job-pool' && (
        <StaffJobPoolTab
          availableJobs={availableJobs}
          staff={staff}
          activeJobsCount={activeJobs.length}
          onAcceptJob={handleAcceptJob}
        />
      )}

      {activeTab === 'my-designs' && (
        <StaffMyDesignsTab submissions={submissions} onUploadDesign={handleUploadDesign} />
      )}

      {activeTab === 'active-job' && selectedJobObject && (
        <StaffActiveJobWorkspace
          job={selectedJobObject}
          onBack={() => handleTabChange('workbench')}
          onUpdateMilestone={handleUpdateMilestone}
          onCompleteJob={(jobId) => {
            fetchMyActiveJobs();
            handleCompleteJob(jobId);
          }}
        />
      )}

      {activeTab === 'history' && <StaffHistoryTab earnings={earnings} staffName={staff.name} />}

      {activeTab === 'earnings' && (
        <StaffEarningsTab
          staff={staff}
          earnings={earnings}
          loading={loadingEarnings}
          onRefresh={fetchSettlements}
        />
      )}

      {activeTab === 'profile' && <StaffProfileTab staff={staff} onUpdateProfile={setStaff} />}

      {activeTab === 'notifications' && (
        <StaffNotificationsTab
          notifications={notifications}
          onMarkAllRead={() =>
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
          }
        />
      )}
    </StaffLayout>
    <AuthModal />
    </>
  );
};
