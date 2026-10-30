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
import { sanitizeOrderBriefForStaff } from '../utils/staffSanitizer';

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

const round2 = (num: number): number => Math.round(num * 100) / 100;

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
  const { openAuthModal, user, isLoggedIn } = useAuth();
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

  // Re-sync staff identity whenever user session changes
  useEffect(() => {
    if (user) {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
      const isStaffOrAdmin = user.role === 'staff' || user.role === 'admin' || user.is_staff || user.is_superuser;
      setStaff((prev) => ({
        ...prev,
        id: `STF-${user.id || '102'}`,
        name: fullName || prev.name,
        email: user.email || prev.email,
        phone: user.phone_number || prev.phone,
        avatar: user.profile_photo || prev.avatar,
        role: (user as any).staff_profile?.specialty_tags || prev.role,
        status: (user as any).is_active_staff !== false ? 'active' : 'inactive',
        maxJobLimit: (user as any).staff_profile?.max_concurrent_jobs || prev.maxJobLimit || 3,
        jobsCompleted: (user as any).staff_profile?.total_jobs_completed || prev.jobsCompleted,
        rating: parseFloat((user as any).staff_profile?.rating_average || '5.0') || prev.rating,
      }));
      if (isStaffOrAdmin) {
        setAuthWarning(null);
      }
    }
  }, [user]);

  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [activeJobs, setActiveJobs] = useState<StaffActiveJob[]>([]);
  const [loadingActiveJobs, setLoadingActiveJobs] = useState<boolean>(true);
  const [submissions, setSubmissions] = useState<StaffSubmission[]>(() => appStore.getSubmissions());
  const [earnings, setEarnings] = useState<StaffEarningsRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [avgTurnaroundHours, setAvgTurnaroundHours] = useState<number>(24.0);

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
              clientBudget: rawPayout > 0 ? `$${(rawPayout / 86.85).toFixed(2)}` : '',
              deadlineHours: ord.deadline_hours || 48,
              dueAt: ord.due_at,
              neededByDate: fe?.needed_by_date,
              releasedTimeAgo: ord.unassigned_since
                ? new Date(ord.unassigned_since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Recently',
              referenceImage: fe.reference_image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
              description: sanitizeOrderBriefForStaff(fe.description) || 'CAD file modification request.',
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
          const descStr = `${req?.description || ''} ${req?.special_instructions || ''}`;
          const parsedCategory = descStr.match(/(?:Requirement|Category|Design Requirement):\s*([^\n\r•]+)/i)?.[1]?.trim();
          const category = req?.category_name || (parsedCategory && parsedCategory.toLowerCase() !== 'null' ? parsedCategory : 'Custom Jewellery');
          
          const parsedMetal = descStr.match(/(?:Full Metal Specification|Full Metal Alloy|Alloy|Material):\s*([^\n\r•]+)/i)?.[1]?.trim();
          const metalPreference = selMetal?.value_label || req?.metal_alloy_name || (parsedMetal && parsedMetal.toLowerCase() !== 'null' ? parsedMetal : '');

          const parsedWeight = descStr.match(/(?:Weight|Target Weight):\s*([^\n\r•]+)/i)?.[1]?.trim();
          const weightEst = req?.target_weight_grams ? `${req.target_weight_grams} gm` : (parsedWeight || (metalPreference ? `${metalPreference}` : 'As per brief'));

          const parsedRingSize = descStr.match(/(?:Ring Size|Size):\s*([^\n\r•]+)/i)?.[1]?.trim();
          const ringSize = req?.ring_size ? `${req.ring_size} (${req.ring_size_standard || 'US'})` : parsedRingSize;

          return {
            id: ord.id.toString(),
            orderNumber: `ORD-${ord.id}`,
            title: category && category !== 'Custom Jewellery' ? `Bespoke ${category}` : `Bespoke CAD Design #${ord.id}`,
            category: category,
            agreedPayout: rawPayout,
            clientBudget: rawPayout > 0 ? `$${(rawPayout / 86.85).toFixed(2)}` : '',
            deadlineHours: ord.deadline_hours || 48,
            dueAt: ord.due_at,
            neededByDate: req?.needed_by_date,
            releasedTimeAgo: ord.unassigned_since
              ? new Date(ord.unassigned_since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently',
            referenceImage: req?.catalog_references?.[0]?.image || req?.reference_image || req?.sketches?.[0]?.image_url || req?.sketches?.[0]?.image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
            description: sanitizeOrderBriefForStaff(req?.description) || 'Watertight 3D CAD design request.',
            metalPreference: metalPreference,
            specsSummary: {
              diamondCount: stoneCount,
              weightEst: weightEst,
              ringSize: ringSize,
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
        // Determine whether the craftsman's task on this order is fully completed
        // "when whole process is completed ....like admin approve and aslo client not have any querry then make slot empty and move order to completed orders"
        const isOrderFullyCompleted = (ord: any) => {
          if (ord.status === 'completed' || ord.status === 'delivered') return true;
          if (ord.status === 'cancelled') return false;

          const milestones: any[] = ord.milestones || [];
          const revisions: any[] = ord.revision_requests || [];
          const hasOpenRevisions = revisions.some(
            (r: any) => r.status === 'open' || r.status === 'in_progress'
          ) || ord.status === 'revision_requested';

          const isAdminApproved = Boolean(ord.quality_approved) || milestones.some((m: any) =>
            (m.stage || '').toLowerCase().includes('approved by admin') ||
            (m.stage || '').toLowerCase().includes('qc approved')
          );

          const isClientApproved = milestones.some((m: any) =>
            (m.stage || '').toLowerCase().includes('approved by client') ||
            (m.stage || '').toLowerCase().includes('preview approved')
          );

          // Admin approved AND client has no pending queries or revisions
          if (isAdminApproved && !hasOpenRevisions) {
            if (isClientApproved || ord.status === 'preview_ready' || ord.balance_paid) {
              return true;
            }
          }

          return false;
        };

        const activeOrders = orderList.filter((ord: any) => !isOrderFullyCompleted(ord) && ord.status !== 'cancelled');
        const completedOrders = orderList.filter((ord: any) => isOrderFullyCompleted(ord));

        const mappedActive: StaffActiveJob[] = activeOrders.map((ord: any) => {
          const isFileEdit = ord.order_type === 'file_edit' || Boolean(ord.file_edit_request) || Boolean(ord.is_file_edit);
          const fe = ord.file_edit_request;
          const req = ord.custom_request;
          const total = parseFloat(ord.total_price || '200');

          // Compute milestone and progress strictly reflecting real CAD progress
          const milestones: any[] = ord.milestones || [];
          const deliverables: any[] = ord.deliverables || [];
          let currentMilestone: StaffActiveJob['currentMilestone'] = 'Just Accepted';
          let progressPercentage = 0;

          if (ord.status === 'completed' || ord.status === 'delivered') {
            currentMilestone = 'Ready for Delivery';
            progressPercentage = 100;
          } else if (ord.status === 'pending_review' || ord.status === 'preview_ready') {
            currentMilestone = 'Refining';
            progressPercentage = 85;
          } else {
            // Order is active with designer (with_designer or revision_requested)
            // Progress strictly comes from craftsman milestone advancements or uploaded deliverables
            const stageNames = milestones.map((m: any) => (m.stage || '').toLowerCase());
            let highestIdx = -1;

            if (stageNames.some((s: string) => s.includes('04.') || s.includes('ready for delivery') || s.includes('final stl export') || s.includes('watertight cad export'))) {
              if (deliverables.length > 0) highestIdx = 3;
              else highestIdx = 2;
            } else if (stageNames.some((s: string) => s.includes('03.') || s.includes('refining') || s.includes('tolerances') || s.includes('admin qc'))) {
              highestIdx = 2;
            } else if (stageNames.some((s: string) => s.includes('02.') || s.includes('modeling') || s.includes('modifications') || s.includes('stone seats'))) {
              highestIdx = 1;
            } else if (stageNames.some((s: string) => s.includes('01.') || s.includes('started') || s.includes('mesh blocking') || s.includes('mesh inspected'))) {
              highestIdx = 0;
            }

            // Fallback to deliverables count if no milestone markers clicked yet
            if (highestIdx === -1) {
              if (deliverables.length >= 3) highestIdx = 2;
              else if (deliverables.length >= 2) highestIdx = 1;
              else if (deliverables.length >= 1) highestIdx = 0;
            }

            if (highestIdx === 3) {
              currentMilestone = 'Ready for Delivery';
              progressPercentage = 100;
            } else if (highestIdx === 2) {
              currentMilestone = 'Refining';
              progressPercentage = 85;
            } else if (highestIdx === 1) {
              currentMilestone = 'Modeling';
              progressPercentage = 60;
            } else if (highestIdx === 0) {
              currentMilestone = 'Started';
              progressPercentage = 25;
            } else {
              // 0 deliverables, no milestone stage clicked: 0% real progress!
              currentMilestone = 'Just Accepted';
              progressPercentage = 0;
            }
          }

          let displayStatus: StaffActiveJob['status'] = 'With CAD Designer';
          if (ord.status === 'pending_review') {
            displayStatus = 'Pending Admin QC Review' as any;
          } else if (ord.status === 'preview_ready') {
            displayStatus = 'In Client 3D Review' as any;
          } else if (ord.status === 'revision_requested') {
            displayStatus = 'Client Requested Adjustments' as any;
          }

          // Real dynamic SLA target calculation
          const nowMs = Date.now();
          const targetTimeMs = ord.due_at
            ? new Date(ord.due_at).getTime()
            : (ord.assigned_at ? new Date(ord.assigned_at).getTime() : nowMs) + (ord.deadline_hours || 48) * 3600 * 1000;
          const dynamicRemainingHours = Math.max(0, Math.round((targetTimeMs - nowMs) / (3600 * 1000)));
          const deadlineText = ord.due_at
            ? new Date(ord.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : `${ord.deadline_hours || 48} Hours`;

          if (isFileEdit && fe) {
            const formatStr = (fe.original_file_format || '3dm').toUpperCase();
            return {
              id: ord.id.toString(),
              orderNumber: `FE-ORD-${ord.id}`,
              title: fe.original_file_name ? `CAD Modification: ${fe.original_file_name}` : `CAD File Modification #${ord.id} (${formatStr})`,
              category: `CAD File Modification (${formatStr})`,
              referenceImage: fe.reference_image || ord.preview_image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
              acceptedAt: ord.assigned_at ? new Date(ord.assigned_at).toLocaleDateString() : 'Active',
              assignedAt: ord.assigned_at,
              dueAt: ord.due_at,
              deadlineHours: ord.deadline_hours || 48,
              deadline: deadlineText,
              hoursRemaining: dynamicRemainingHours,
              payoutAmount: Number(ord.staff_payout_price_usd ?? (ord.staff_payout_price ? round2(Number(ord.staff_payout_price)/86.85) : (total ? round2(total * 0.8 / 86.85) : 0))),
              clientNotes: sanitizeOrderBriefForStaff(fe.description) || 'CAD File Modification',
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
            assignedAt: ord.assigned_at,
            dueAt: ord.due_at,
            deadlineHours: ord.deadline_hours || 48,
            deadline: deadlineText,
            hoursRemaining: dynamicRemainingHours,
            payoutAmount: Number(ord.staff_payout_price_usd ?? (ord.staff_payout_price ? round2(Number(ord.staff_payout_price)/86.85) : (total ? round2(total * 0.8 / 86.85) : 0))),
            clientNotes: sanitizeOrderBriefForStaff(req?.description) || 'Watertight 3D CAD design request.',
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
          jobsCompleted: completedOrders.length,
        }));

        // Dynamically compute real average turnaround hours from completed orders
        if (completedOrders.length > 0) {
          const list: number[] = [];
          completedOrders.forEach((co: any) => {
            const start = co.assigned_at ? new Date(co.assigned_at).getTime() : (co.created_at ? new Date(co.created_at).getTime() : null);
            const end = co.handed_over_at ? new Date(co.handed_over_at).getTime() : (co.updated_at ? new Date(co.updated_at).getTime() : null);
            if (start && end && end > start) {
              list.push((end - start) / (3600 * 1000));
            }
          });
          if (list.length > 0) {
            const avg = list.reduce((a, b) => a + b, 0) / list.length;
            setAvgTurnaroundHours(Math.round(avg * 10) / 10);
          }

          const mappedEarnings: StaffEarningsRecord[] = completedOrders.map((cord: any) => {
            const total = parseFloat(cord.total_price || '200');
            const payout = Number(cord.staff_payout_price ?? cord.payout_price ?? (total ? Math.round(total * 0.8) : 0));
            const req = cord.custom_request;
            const fe = cord.file_edit_request;
            const title = fe?.original_file_name ? `CAD Modification: ${fe.original_file_name}` : req?.category_name ? `Bespoke ${req.category_name}` : `Custom Design #${cord.id}`;
            const dateStr = cord.handed_over_at ? new Date(cord.handed_over_at).toISOString().split('T')[0] : (cord.updated_at ? new Date(cord.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

            return {
              id: `EARN-ORD-${cord.id}`,
              orderNumber: cord.order_type === 'file_edit' ? `FE-ORD-${cord.id}` : `ORD-${cord.id}`,
              title: title,
              completedDate: dateStr,
              amount: payout,
              status: cord.balance_paid ? 'Settled & Paid' : 'Pending Settlement',
            };
          });
          setEarnings(mappedEarnings);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch my active jobs:', e);
    } finally {
      setLoadingActiveJobs(false);
    }
  };

  const fetchStaffDashboard = async () => {
    const isStaffOrAdmin = Boolean(
      user && (user.role === 'staff' || user.role === 'admin' || user.is_staff || user.is_superuser)
    );

    try {
      const dash: any = await api.request('/staff/me/dashboard/');
      if (dash) {
        setAuthWarning(null);
        if (dash.avg_turnaround_hours) {
          setAvgTurnaroundHours(Number(dash.avg_turnaround_hours));
        }
        setStaff((prev) => ({
          ...prev,
          name: `${dash.user?.first_name || ''} ${dash.user?.last_name || ''}`.trim() || dash.user?.username || prev.name,
          email: dash.user?.email || prev.email,
          maxJobLimit: dash.max_concurrent_jobs || prev.maxJobLimit || 3,
          currentLoad: dash.active_jobs_count ?? prev.currentLoad,
          jobsCompleted: dash.total_completed !== undefined ? dash.total_completed : prev.jobsCompleted,
          rating: dash.user?.rating_average ? parseFloat(dash.user.rating_average) : prev.rating,
        }));
      }
    } catch (e: any) {
      if (isStaffOrAdmin) {
        // Authenticated staff or admin should never be treated as guest
        setAuthWarning(null);
      } else if (e?.status === 403 || e?.status === 401) {
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
        const totalAmt = typeof st.amount_usd === 'number' ? st.amount_usd : round2(parseFloat(st.amount || '0') / 86.85);
        const paidAmt = typeof st.amount_paid_usd === 'number' ? st.amount_paid_usd : round2(parseFloat(st.amount_paid || '0') / 86.85);
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
  }, [activeTab, user]);

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

      {/* Staff Auth Notice Banner (only displayed for guest/unauthorized sessions) */}
      {authWarning && (!user || (user.role !== 'staff' && user.role !== 'admin' && !user.is_staff && !user.is_superuser)) && (
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
          loading={loadingActiveJobs}
          avgTurnaroundHours={avgTurnaroundHours}
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
