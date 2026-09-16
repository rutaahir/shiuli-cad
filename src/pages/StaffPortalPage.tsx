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

import {
  CURRENT_STAFF_MEMBER,
  INITIAL_AVAILABLE_JOBS,
  INITIAL_STAFF_ACTIVE_JOBS,
  INITIAL_STAFF_SUBMISSIONS,
  INITIAL_STAFF_EARNINGS,
  STAFF_NOTIFICATIONS,
} from '../data/staffMockData';

import { StaffLayout } from '../components/staff/StaffLayout';
import { WaxSealStamp } from '../components/staff/WaxSealStamp';

import { StaffWorkbenchTab } from '../components/staff/StaffWorkbenchTab';
import { StaffJobPoolTab } from '../components/staff/StaffJobPoolTab';
import { StaffMyDesignsTab } from '../components/staff/StaffMyDesignsTab';
import { StaffActiveJobWorkspace } from '../components/staff/StaffActiveJobWorkspace';
import { StaffHistoryTab } from '../components/staff/StaffHistoryTab';
import { StaffEarningsTab } from '../components/staff/StaffEarningsTab';
import { StaffProfileTab } from '../components/staff/StaffProfileTab';
import { StaffNotificationsTab } from '../components/staff/StaffNotificationsTab';

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
  const [activeTab, setActiveTabState] = useState<StaffPortalTab>(initialTab || 'workbench');
  const [selectedActiveJobId, setSelectedActiveJobId] = useState<string | null>(null);

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
            avatar: u.profile_photo || CURRENT_STAFF_MEMBER.avatar,
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
    return CURRENT_STAFF_MEMBER;
  });
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [activeJobs, setActiveJobs] = useState<StaffActiveJob[]>(() => appStore.getActiveJobs());
  const [submissions, setSubmissions] = useState<StaffSubmission[]>(() => appStore.getSubmissions());
  const [earnings, setEarnings] = useState<StaffEarningsRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>(STAFF_NOTIFICATIONS);

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
          const req = ord.custom_request;
          const total = parseFloat(ord.total_price || req?.agreed_price || req?.estimated_price_shown || '200');
          return {
            id: ord.id.toString(),
            orderNumber: `ORD-${ord.id}`,
            title: req?.category_name ? `Bespoke ${req.category_name}` : `Custom Design #${ord.id}`,
            category: req?.category_name || 'Custom Jewellery',
            agreedPayout: Math.round(total * 0.4),
            deadlineHours: 48,
            releasedTimeAgo: ord.unassigned_since
              ? new Date(ord.unassigned_since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently',
            referenceImage: req?.sketches?.[0]?.image_url || req?.sketches?.[0]?.image || req?.reference_image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
            description: req?.description || 'Watertight 3D CAD design request.',
            metalPreference: req?.metal_alloy_name || '18K Yellow Gold',
            specsSummary: {
              diamondCount: req?.gemstones?.length ? `${req.gemstones.length} stones` : 'As per brief',
              weightEst: req?.metal_alloy_name ? `Calibrated ${req.metal_alloy_name}` : 'Custom weight',
              ringSize: 'US 7.0',
            },
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
          (ord: any) => ord.status !== 'completed' && ord.status !== 'delivered' && ord.status !== 'preview_ready'
        );
        const completedOrders = orderList.filter(
          (ord: any) => ord.status === 'completed' || ord.status === 'delivered' || ord.status === 'preview_ready'
        );

        const mappedActive: StaffActiveJob[] = activeOrders.map((ord: any) => {
          const req = ord.custom_request;
          const total = parseFloat(ord.total_price || '200');
          return {
            id: ord.id.toString(),
            orderNumber: `ORD-${ord.id}`,
            title: req?.category_name ? `Bespoke ${req.category_name}` : `Custom Design #${ord.id}`,
            category: req?.category_name || 'Custom Jewellery',
            referenceImage: req?.sketches?.[0]?.image_url || req?.sketches?.[0]?.image || req?.reference_image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
            acceptedAt: ord.assigned_at ? new Date(ord.assigned_at).toLocaleDateString() : 'Active',
            deadline: 'In 48 Hours',
            hoursRemaining: 48,
            payoutAmount: Math.round(total * 0.4),
            clientName: req?.contact_name || ord.client?.first_name || 'Jewellery Atelier',
            clientNotes: req?.description || 'Watertight 3D CAD design request.',
            currentMilestone: ord.status === 'pending_review' ? 'Pending Review' : 'Modeling',
            progressPercentage: ord.status === 'pending_review' ? 100 : 50,
            status: ord.status === 'pending_review' ? 'Pending Admin QC Review' : 'With CAD Designer',
          };
        });

        setActiveJobs(mappedActive);
        setStaff((prev) => ({
          ...prev,
          currentLoad: mappedActive.length,
          jobsCompleted: Math.max(prev.jobsCompleted, completedOrders.length),
          maxJobLimit: Math.max(mappedActive.length, prev.maxJobLimit || 4),
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch my active jobs:', e);
    }
  };

  useEffect(() => {
    fetchPoolJobs();
    fetchMyActiveJobs();
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

      {activeTab === 'history' && <StaffHistoryTab earnings={earnings} />}

      {activeTab === 'earnings' && (
        <StaffEarningsTab staff={staff} earnings={earnings} />
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
  );
};
