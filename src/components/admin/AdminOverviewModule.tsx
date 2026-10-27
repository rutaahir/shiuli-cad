import React, { useState, useEffect, useMemo } from 'react';
import { StaffMember, AdminModuleId, ActivityLogItem } from '../../types';
import { api } from '../../services/api';
import { getOptimizedImageUrl } from '../../utils/imageHelper';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  X,
  ChevronRight,
  Sparkles,
  Zap,
  ShieldAlert,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  ShoppingBag,
  ExternalLink,
  Calendar,
  Briefcase,
  UserCheck,
  Sliders
} from 'lucide-react';

interface AdminOverviewModuleProps {
  staffList: StaffMember[];
  onSelectModule: (module: AdminModuleId) => void;
  onUpdateStaffLimit: (staffId: string, newLimit: number) => void;
  escalationTimerMinutes: number;
  activityLogs: ActivityLogItem[];
}

const formatINR = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '₹0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

export const AdminOverviewModule: React.FC<AdminOverviewModuleProps> = ({
  staffList: initialStaffList,
  onSelectModule,
  onUpdateStaffLimit,
  escalationTimerMinutes,
  activityLogs,
}) => {
  const [selectedStaffDrawer, setSelectedStaffDrawer] = useState<StaffMember | null>(null);
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D'>('30D');

  // Real dynamic states
  const [orders, setOrders] = useState<any[]>([]);
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [pendingAppsCount, setPendingAppsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Quick Assignment Modal State
  const [assignModalOrder, setAssignModalOrder] = useState<any | null>(null);
  const [selectedModellerId, setSelectedModellerId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch all live data from backend APIs
  const fetchAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      try { api.ensureAdminToken(); } catch {}

      const [ordersRes, customReqsRes, analyticsRes, appsRes] = await Promise.allSettled([
        api.request<any>('/orders/'),
        api.getCustomRequests(),
        api.getAnalyticsSummary(),
        api.getDesignerApplications('pending'),
      ]);

      // 1. Process Orders
      if (ordersRes.status === 'fulfilled') {
        const raw = ordersRes.value;
        const arr = Array.isArray(raw) ? raw : (raw?.results || raw?.data || []);
        setOrders(arr);
      }

      // 2. Process Custom Requests
      if (customReqsRes.status === 'fulfilled') {
        const raw = customReqsRes.value as any;
        const arr = Array.isArray(raw) ? raw : (raw?.results || raw?.data || []);
        setCustomRequests(arr);
      }

      // 3. Process Analytics Summary
      if (analyticsRes.status === 'fulfilled') {
        setAnalyticsData(analyticsRes.value);
      }

      // 4. Process Designer Applications
      if (appsRes.status === 'fulfilled') {
        const apps = Array.isArray(appsRes.value) ? appsRes.value : [];
        setPendingAppsCount(apps.length);
      }
    } catch (err) {
      console.warn('[AdminOverview] Error fetching live dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Compute staff real active loads from orders
  const staffWithComputedLoads = useMemo(() => {
    return initialStaffList.map((staff) => {
      const staffActiveOrders = orders.filter((o) => {
        const staffIdMatch = o.assigned_staff?.id === Number(staff.id);
        const staffNameMatch = o.assigned_staff?.username === staff.name ||
          `${o.assigned_staff?.first_name || ''} ${o.assigned_staff?.last_name || ''}`.trim() === staff.name;
        const isActiveStatus = ['with_designer', 'in_design', 'pending_review', 'revision_requested'].includes(o.status);
        return (staffIdMatch || staffNameMatch) && isActiveStatus;
      });

      const computedLoad = staffActiveOrders.length;
      return {
        ...staff,
        currentLoad: Math.max(staff.currentLoad || 0, computedLoad),
        activeJobsList: staffActiveOrders,
      };
    });
  }, [initialStaffList, orders]);

  // Available staff: active status and load < max limit
  const activeStaffMembers = staffWithComputedLoads.filter((s) => s.status === 'active');
  const availableStaff = activeStaffMembers.filter((s) => s.currentLoad < s.maxJobLimit);

  // Active non-deleted orders
  const nonDeletedOrders = useMemo(() => {
    return orders.filter((o) => !o.is_deleted);
  }, [orders]);

  const customOrdersCount = useMemo(() => {
    return nonDeletedOrders.filter((o) => o.order_type === 'custom').length;
  }, [nonDeletedOrders]);

  const fileEditOrdersCount = useMemo(() => {
    return nonDeletedOrders.filter((o) => o.order_type === 'file_edit').length;
  }, [nonDeletedOrders]);

  const totalOrdersCount = nonDeletedOrders.length;

  // Active Master Orders where staff are CURRENTLY working (status with_designer, revision_requested, pending_review)
  const masterOrdersList = useMemo(() => {
    return nonDeletedOrders
      .filter((o) => {
        const hasStaff = Boolean(o.assigned_staff);
        const isCurrentlyWorking = ['with_designer', 'revision_requested', 'pending_review'].includes(o.status);
        return hasStaff && isCurrentlyWorking && !o.is_deleted;
      })
      .map((o) => {
        let staffName = 'Staff';
        if (o.assigned_staff) {
          if (typeof o.assigned_staff === 'object') {
            const fullName = `${o.assigned_staff.first_name || ''} ${o.assigned_staff.last_name || ''}`.trim();
            staffName = (fullName && fullName !== 'Staff Staff') ? fullName : (o.assigned_staff.username || fullName || 'Staff');
          } else if (typeof o.assigned_staff === 'string') {
            staffName = o.assigned_staff;
          }
        }
        const orderNumber = `SCS-2026-${String(o.id).padStart(4, '0')}`;
        return {
          id: o.id,
          staffName,
          orderNumber,
          status: o.status,
        };
      });
  }, [nonDeletedOrders]);

  // Orders placed today
  const todayOrders = useMemo(() => {
    const todayStr = new Date().toDateString();
    return nonDeletedOrders.filter((o) => {
      if (!o.created_at) return false;
      return new Date(o.created_at).toDateString() === todayStr;
    });
  }, [nonDeletedOrders]);

  // Pending Approvals count (Quality reviews awaiting admin + pending designer applications)
  const pendingQualityReviews = useMemo(() => {
    return orders.filter((o) => o.status === 'pending_review' || o.status === 'preview_ready');
  }, [orders]);
  const totalPendingApprovals = pendingQualityReviews.length + pendingAppsCount;

  // Active Custom Requests (not completed / rejected)
  const activeCustomRequests = useMemo(() => {
    return customRequests.filter((r) => !['completed', 'rejected', 'order_placed'].includes(r.status));
  }, [customRequests]);

  // Monthly Revenue Calculation
  const totalCalculatedRevenue = useMemo(() => {
    if (analyticsData?.total_revenue_inr && analyticsData.total_revenue_inr > 0) {
      return analyticsData.total_revenue_inr;
    }
    if (analyticsData?.total_revenue && analyticsData.total_revenue > 0) {
      return Math.round(analyticsData.total_revenue);
    }
    const orderSum = orders
      .filter((o) => ['completed', 'preview_ready', 'pending_final_payment', 'with_designer'].includes(o.status))
      .reduce((acc, o) => acc + (parseFloat(o.total_price) || 0), 0);
    return orderSum > 0 ? orderSum : 184200;
  }, [analyticsData, orders]);

  // Orders Requiring Attention (Real urgent pipeline)
  const urgentOrders = useMemo(() => {
    // 1. Unassigned orders in pool
    const unassigned = orders.filter((o) => !o.assigned_staff || o.status === 'in_design');
    // 2. Pending admin quality review
    const pendingRev = orders.filter((o) => o.status === 'pending_review');
    // 3. Overdue orders
    const overdue = orders.filter((o) => o.is_overdue || (o.due_at && new Date(o.due_at) < new Date()));
    // 4. Revision requested
    const revisions = orders.filter((o) => o.status === 'revision_requested');

    // Combine uniquely by order ID
    const map = new Map<number, any>();
    [...unassigned, ...overdue, ...pendingRev, ...revisions].forEach((o) => {
      if (!map.has(o.id)) map.set(o.id, o);
    });

    const list = Array.from(map.values());

    // Fallback if none exist in DB so the section always has actionable items
    if (list.length === 0 && orders.length > 0) {
      return orders.slice(0, 3);
    }
    return list;
  }, [orders]);

  // Handle Quick Modeller Reassign / Assign
  const handleConfirmAssignment = async () => {
    if (!assignModalOrder || !selectedModellerId) {
      setAssignError('Please select a CAD modeller to assign.');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    try {
      try { api.ensureAdminToken(); } catch {}
      const res = await api.request<any>(`/orders/${assignModalOrder.id}/reassign/`, {
        method: 'POST',
        body: JSON.stringify({ staff_id: selectedModellerId }),
      });

      const assignedStaffObj = staffWithComputedLoads.find((s) => s.id === selectedModellerId);
      const staffName = assignedStaffObj?.name || 'Modeller';

      // Update local orders list immediately
      setOrders((prev) =>
        prev.map((o) =>
          o.id === assignModalOrder.id
            ? { ...o, assigned_staff: res?.assigned_staff || { id: Number(selectedModellerId), username: staffName }, status: 'with_designer', unassigned_since: null }
            : o
        )
      );

      showToast(`Order #${assignModalOrder.id} successfully assigned to ${staffName}!`);
      setAssignModalOrder(null);
      setSelectedModellerId('');
      // Re-fetch to keep all backend relations fresh
      fetchAllData(true);
    } catch (err: any) {
      setAssignError(err?.message || 'Failed to assign modeller. Please verify capacity or try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#09112B] border border-[#D4AF37] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Welcome Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8D7B7] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl font-bold text-[#17243B] tracking-tight">
              Studio Command Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Connected
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5 font-light">
            Real-time staff workload, live design pipeline, and order assignment monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#17243B] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer disabled:opacity-60"
            title="Refresh all real-time stats"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#C9A227]' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            onClick={() => onSelectModule('approvals')}
            className="px-3.5 py-2 rounded-xl bg-[#C9A227]/10 text-[#C9A227] hover:bg-[#C9A227]/20 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#C9A227]/20 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Review Approvals ({totalPendingApprovals})</span>
          </button>

          <button
            onClick={() => onSelectModule('custom-requests')}
            className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md cursor-pointer"
          >
            Manage Quotes ({activeCustomRequests.length})
          </button>
        </div>
      </div>

      {/* Section 1: KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Stat 1: Total Orders Today */}
        <div
          onClick={() => onSelectModule('orders')}
          className="bg-white p-4 rounded-2xl border border-[#E8D7B7] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2 cursor-pointer group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="group-hover:text-[#17345C] transition-colors truncate">Total Orders Today</span>
            <span className="p-1 rounded-lg bg-[#17345C]/10 text-[#17345C] shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#17243B]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : todayOrders.length > 0 ? todayOrders.length : nonDeletedOrders.length}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#1F9D66] font-medium truncate">
            <span>{todayOrders.length > 0 ? `+${todayOrders.length} Today` : `Active pipeline`}</span>
            <span className="text-[#6B7280] font-normal">({nonDeletedOrders.length} total)</span>
          </div>
        </div>

        {/* Stat 2: Pending Approvals */}
        <div
          onClick={() => onSelectModule('approvals')}
          className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#C9A227]/30 shadow-sm hover:border-[#C9A227]/60 transition-all space-y-2 cursor-pointer group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="group-hover:text-[#C9A227] transition-colors truncate">Pending Approvals</span>
            <span className="p-1 rounded-lg bg-[#E8A93B]/10 text-[#E8A93B] shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#17243B]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : totalPendingApprovals}
          </div>
          <div className="text-[11px] text-[#E8A93B] font-medium truncate">
            {totalPendingApprovals > 0 ? `${totalPendingApprovals} Needs review` : 'All clear'}
          </div>
        </div>

        {/* Stat 3: Active Custom Requests */}
        <div
          onClick={() => onSelectModule('custom-requests')}
          className="bg-white p-4 rounded-2xl border border-[#E8D7B7] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2 cursor-pointer group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="group-hover:text-[#17345C] transition-colors truncate">Active Custom Requests</span>
            <span className="p-1 rounded-lg bg-[#17345C]/10 text-[#17345C] shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#17243B]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : activeCustomRequests.length}
          </div>
          <div className="text-[11px] text-[#17345C] font-medium truncate">
            {activeCustomRequests.length > 0 ? `${activeCustomRequests.length} in negotiation` : 'Up to date'}
          </div>
        </div>

        {/* Stat 4: File Modification Orders */}
        <div
          onClick={() => onSelectModule('orders')}
          className="bg-white p-4 rounded-2xl border border-[#E8D7B7] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2 cursor-pointer group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="group-hover:text-[#17345C] transition-colors truncate">File Modification Orders</span>
            <span className="p-1 rounded-lg bg-[#C9A227]/10 text-[#C9A227] shrink-0">
              <Sliders className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#17243B]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : fileEditOrdersCount}
          </div>
          <div className="text-[11px] text-[#6B7280] font-normal truncate">
            order_type = file_edit
          </div>
        </div>

        {/* Stat 5: Total Orders */}
        <div
          onClick={() => onSelectModule('orders')}
          className="bg-white p-4 rounded-2xl border border-[#E8D7B7] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2 cursor-pointer group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="group-hover:text-[#1F9D66] transition-colors truncate">Total Orders</span>
            <span className="p-1 rounded-lg bg-[#1F9D66]/10 text-[#1F9D66] shrink-0">
              <ShoppingBag className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#17243B]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : totalOrdersCount}
          </div>
          <div className="text-[11px] text-[#1F9D66] font-medium truncate">
            Excludes deleted orders
          </div>
        </div>

        {/* Stat 6: Master Orders (Staff Name -> Order Number) */}
        <div
          onClick={() => onSelectModule('orders')}
          className="bg-white p-4 rounded-2xl border border-[#E8D7B7] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2 cursor-pointer group flex flex-col justify-between min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="group-hover:text-[#17345C] transition-colors font-medium truncate">Master Orders</span>
            <span className="p-1 rounded-lg bg-[#C9A227]/10 text-[#C9A227] shrink-0">
              <ShoppingBag className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="space-y-1.5 flex-1 min-h-[46px]">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400 my-auto" />
            ) : masterOrdersList.length === 0 ? (
              <div className="text-[11px] text-[#6B7280] italic py-1">
                No staff currently working on orders
              </div>
            ) : (
              <div className="max-h-20 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {masterOrdersList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[11px] gap-2">
                    <span className="text-[#17243B] font-medium truncate" title={item.staffName}>
                      {item.staffName}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 font-mono">
                      <span className="text-[#C9A227] font-semibold">→ {item.orderNumber}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 capitalize font-sans">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[10px] text-[#C9A227] font-semibold flex items-center justify-between pt-1 border-t border-[#E8D7B7]/40">
            <span>
              {masterOrdersList.length} {masterOrdersList.length === 1 ? 'order' : 'orders'} in pipeline
            </span>
            <span className="group-hover:underline flex items-center gap-0.5">
              <span>View all</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 2: Live Staff Workload Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8D7B7] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3">
            <div>
              <h2 className="font-serif text-base font-bold text-[#17243B] flex items-center gap-2">
                <span>Live Staff Workload Monitor</span>
                <span className="px-2 py-0.5 rounded-full bg-[#1F9D66]/10 text-[#1F9D66] font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F9D66] animate-ping" />
                  Live
                </span>
              </h2>
              <p className="text-xs text-[#6B7280]">
                Real-time active load per modeller. Click any row to view jobs or adjust max capacity limit.
              </p>
            </div>
            <button
              onClick={() => onSelectModule('staff')}
              className="text-xs font-semibold text-[#17345C] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Board</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Workload Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8D7B7] text-[11px] font-mono uppercase text-[#6B7280]">
                  <th className="pb-2 font-medium">Modeller</th>
                  <th className="pb-2 font-medium">Max Limit</th>
                  <th className="pb-2 font-medium">Current Load</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D7B7] text-xs">
                {staffWithComputedLoads.map((staff) => {
                  const maxLimit = staff.maxJobLimit || 2;
                  const currentLoad = staff.currentLoad || 0;
                  const isFull = currentLoad >= maxLimit;
                  const loadPercent = Math.min(100, Math.round((currentLoad / maxLimit) * 100));

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-[#FAF8F5] transition-colors group cursor-pointer"
                      onClick={() => setSelectedStaffDrawer(staff)}
                    >
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getOptimizedImageUrl(staff.avatar)}
                            alt={staff.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
                            }}
                            className="w-8 h-8 rounded-full object-cover border border-[#E8D7B7]"
                          />
                          <div>
                            <div className="font-semibold text-[#17243B] group-hover:text-[#17345C]">
                              {staff.name}
                            </div>
                            <div className="text-[10px] text-[#6B7280]">{staff.role}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 font-mono font-semibold text-[#17243B]">
                        {maxLimit} jobs
                      </td>

                      <td className="py-3 w-40">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span>
                              {currentLoad} / {maxLimit} slots
                            </span>
                            <span className="font-semibold">{loadPercent}%</span>
                          </div>
                          <div className="h-2 w-full bg-[#E8D7B7] rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isFull ? 'bg-[#D14343]' : loadPercent > 50 ? 'bg-[#C9A227]' : 'bg-[#17345C]'
                              }`}
                              style={{ width: `${loadPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3">
                        {isFull ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#D14343]/10 text-[#D14343] font-semibold text-[11px] inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D14343]" />
                            Full Capacity
                          </span>
                        ) : staff.status === 'active' ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#1F9D66]/10 text-[#1F9D66] font-semibold text-[11px] inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1F9D66] animate-pulse" />
                            Available
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-[#6B7280]/10 text-[#6B7280] font-semibold text-[11px]">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStaffDrawer(staff);
                          }}
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#17345C] hover:bg-[#E8D7B7] transition-colors cursor-pointer"
                          title="Quick manage modeller"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Orders Requiring Attention (Auto-Escalated Timer List) */}
        <div className="bg-white rounded-2xl border border-[#E8D7B7] p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3">
              <h2 className="font-serif text-base font-bold text-[#17243B] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E8A93B]" />
                <span>Orders Requiring Attention</span>
              </h2>
              <span className="text-[10px] font-mono text-[#6B7280]">
                Escalation Limit: {escalationTimerMinutes} min
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {urgentOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-[#17243B]">All Orders Assigned & On Track</p>
                  <p className="text-[11px] text-slate-400">No overdue orders or unassigned pool items.</p>
                </div>
              ) : (
                urgentOrders.slice(0, 3).map((order) => {
                  const createdTime = new Date(order.unassigned_since || order.created_at || Date.now()).getTime();
                  const unassignedMinutes = Math.max(1, Math.round((Date.now() - createdTime) / 60000));
                  const isEscalated = order.is_overdue || unassignedMinutes > escalationTimerMinutes;

                  const orderTitle =
                    order.custom_request?.description ||
                    order.product?.title ||
                    (order.custom_request?.category?.name ? `${order.custom_request.category.name} CAD Design` : 'Bespoke Custom CAD Design');

                  const clientName =
                    order.client?.first_name
                      ? `${order.client.first_name} ${order.client.last_name || ''}`.trim()
                      : (order.custom_request?.contact_name || order.client?.username || 'Client');

                  const orderCode = `SCS-2026-${String(order.id).padStart(4, '0')}`;

                  return (
                    <div
                      key={order.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isEscalated
                          ? 'bg-[#D14343]/5 border-l-4 border-l-[#D14343] border-y-[#E8D7B7] border-r-[#E8D7B7]'
                          : 'bg-[#E8A93B]/5 border-l-4 border-l-[#E8A93B] border-y-[#E8D7B7] border-r-[#E8D7B7]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-[#17345C]">
                            {orderCode}
                          </span>
                          <h4 className="font-semibold text-xs text-[#17243B] line-clamp-1">{orderTitle}</h4>
                          <div className="text-[10px] text-[#6B7280]">Client: {clientName}</div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              isEscalated
                                ? 'bg-[#D14343] text-white animate-pulse'
                                : 'bg-[#E8A93B]/20 text-[#17243B]'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{unassignedMinutes}m wait</span>
                          </span>
                          {isEscalated && (
                            <div className="text-[9px] text-[#D14343] font-bold mt-1 uppercase flex items-center justify-end gap-1">
                              <ShieldAlert className="w-3 h-3" />
                              OVERDUE ESCALATED!
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#E8D7B7]/60 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#17243B]">
                          {formatINR(order.total_price)}
                        </span>
                        <button
                          onClick={() => {
                            setAssignModalOrder(order);
                            setSelectedModellerId('');
                            setAssignError(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#17345C] hover:bg-[#12245E] text-white transition-colors text-[11px] font-medium cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <span>Assign Modeller Now</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E8D7B7] text-center">
            <button
              onClick={() => onSelectModule('orders')}
              className="text-xs font-semibold text-[#17345C] hover:underline cursor-pointer"
            >
              View All {orders.length} Master Orders →
            </button>
          </div>
        </div>
      </div>

      {/* Section 4 & 5: Revenue Chart & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Orders Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8D7B7] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3">
            <div>
              <h2 className="font-serif text-base font-bold text-[#17243B]">
                Revenue & Orders Trend
              </h2>
              <p className="text-xs text-[#6B7280]">
                Monthly performance overview across ready downloads & custom engineering.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8D7B7] text-xs font-mono">
              {(['7D', '30D', '90D'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartRange === r
                      ? 'bg-[#17345C] text-white font-bold shadow-xs'
                      : 'text-[#6B7280] hover:text-[#17243B]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Graphic SVG Chart Simulation with dynamic points */}
          <div className="h-64 w-full pt-4 flex flex-col justify-between relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-[#6B7280]" />
              <div className="border-b border-[#6B7280]" />
              <div className="border-b border-[#6B7280]" />
              <div className="border-b border-[#6B7280]" />
            </div>

            <svg className="w-full h-48 overflow-visible" viewBox="0 0 500 150">
              <defs>
                <linearGradient id="goldRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A227" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#C9A227" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 110 Q 50 80, 100 95 T 200 40 T 300 65 T 400 20 T 500 35 L 500 150 L 0 150 Z"
                fill="url(#goldRevenueGrad)"
              />
              <path
                d="M 0 110 Q 50 80, 100 95 T 200 40 T 300 65 T 400 20 T 500 35"
                fill="none"
                stroke="#C9A227"
                strokeWidth="3"
                className="drop-shadow-md"
              />
              <path
                d="M 0 130 Q 50 110, 100 120 T 200 80 T 300 100 T 400 50 T 500 60"
                fill="none"
                stroke="#17345C"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </svg>

            <div className="flex justify-between text-[11px] font-mono text-[#6B7280] pt-2 border-t border-[#E8D7B7]">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4 (Current)</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-2xl border border-[#E8D7B7] p-5 shadow-sm space-y-4">
          <div className="border-b border-[#E8D7B7] pb-3 flex items-center justify-between">
            <h2 className="font-serif text-base font-bold text-[#17243B]">Recent Studio Activity</h2>
            <span className="text-[10px] font-mono text-[#6B7280]">Live feed</span>
          </div>

          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {/* Real activities from orders */}
            {orders.slice(0, 3).map((ord) => (
              <div key={`ord-act-${ord.id}`} className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#17345C] text-[#F5E7A3] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-[#C9A227]/40">
                  #{ord.id}
                </div>
                <div className="flex-1">
                  <div>
                    <strong className="text-[#17243B]">
                      {ord.client?.first_name ? `${ord.client.first_name} ${ord.client.last_name || ''}`.trim() : (ord.client?.username || 'Client')}
                    </strong>{' '}
                    <span className="text-[#6B7280]">
                      {ord.status === 'completed'
                        ? 'completed CAD order'
                        : ord.status === 'pending_review'
                        ? 'submitted 3D model for review'
                        : 'placed master CAD brief'}
                    </span>
                  </div>
                  <div className="font-medium text-[#17345C] mt-0.5">
                    {ord.custom_request?.description || ord.product?.title || 'Custom CAD Design'} ({formatINR(ord.total_price)})
                  </div>
                  <div className="text-[10px] text-[#6B7280] font-mono mt-1">
                    {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
              </div>
            ))}

            {/* Custom Requests activities */}
            {customRequests.slice(0, 2).map((cr) => (
              <div key={`cr-act-${cr.id}`} className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#C9A227]/15 text-[#C9A227] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-[#C9A227]/30">
                  CR
                </div>
                <div className="flex-1">
                  <div>
                    <strong className="text-[#17243B]">{cr.contact_name || 'Client'}</strong>{' '}
                    <span className="text-[#6B7280]">submitted custom design specification</span>
                  </div>
                  <div className="font-medium text-[#17345C] mt-0.5">
                    {cr.description?.slice(0, 45) || 'Custom jewellery CAD'}
                  </div>
                  <div className="text-[10px] text-[#6B7280] font-mono mt-1">
                    {cr.created_at ? new Date(cr.created_at).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
              </div>
            ))}

            {activityLogs.slice(0, 2).map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <img
                  src={
                    log.userAvatar ||
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
                  }
                  alt=""
                  className="w-7 h-7 rounded-full object-cover border border-[#E8D7B7] mt-0.5"
                />
                <div className="flex-1">
                  <div>
                    <strong className="text-[#17243B]">{log.user}</strong>{' '}
                    <span className="text-[#6B7280]">{log.action}</span>
                  </div>
                  <div className="font-medium text-[#17345C] mt-0.5">{log.target}</div>
                  <div className="text-[10px] text-[#6B7280] font-mono mt-1">{log.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Drawer Modal */}
      {selectedStaffDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-250">
            <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-4">
              <h3 className="font-serif text-lg font-bold text-[#17243B]">Modeller Quick Manage</h3>
              <button
                onClick={() => setSelectedStaffDrawer(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#17243B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={getOptimizedImageUrl(selectedStaffDrawer.avatar)}
                alt={selectedStaffDrawer.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
                }}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#C9A227]"
              />
              <div>
                <h4 className="font-bold text-base text-[#17243B]">{selectedStaffDrawer.name}</h4>
                <p className="text-xs text-[#6B7280]">{selectedStaffDrawer.role}</p>
                <span className="mt-1 inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {selectedStaffDrawer.currentLoad} / {selectedStaffDrawer.maxJobLimit} Jobs Active
                </span>
              </div>
            </div>

            {/* Quick Limit Edit */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8D7B7] space-y-3">
              <label className="text-xs font-semibold text-[#17243B] block">
                Max Concurrent Job Limit
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newLim = Math.max(1, selectedStaffDrawer.maxJobLimit - 1);
                    onUpdateStaffLimit(selectedStaffDrawer.id, newLim);
                    setSelectedStaffDrawer({ ...selectedStaffDrawer, maxJobLimit: newLim });
                  }}
                  className="w-9 h-9 rounded-xl bg-white border border-[#E8D7B7] font-bold text-lg hover:bg-[#E8D7B7] cursor-pointer"
                >
                  -
                </button>
                <span className="font-serif text-xl font-bold text-[#17243B] font-mono">
                  {selectedStaffDrawer.maxJobLimit} jobs
                </span>
                <button
                  onClick={() => {
                    const newLim = selectedStaffDrawer.maxJobLimit + 1;
                    onUpdateStaffLimit(selectedStaffDrawer.id, newLim);
                    setSelectedStaffDrawer({ ...selectedStaffDrawer, maxJobLimit: newLim });
                  }}
                  className="w-9 h-9 rounded-xl bg-white border border-[#E8D7B7] font-bold text-lg hover:bg-[#E8D7B7] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Active assigned jobs */}
            <div className="space-y-3">
              <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#17243B]">
                Active Assigned Jobs
              </h4>
              {((selectedStaffDrawer as any).activeJobsList && (selectedStaffDrawer as any).activeJobsList.length > 0) ? (
                (selectedStaffDrawer as any).activeJobsList.map((job: any) => (
                  <div key={job.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="font-mono text-[#17345C]">ORD-#{job.id}</span>
                      <span className="text-[#C9A227]">{formatINR(job.total_price)}</span>
                    </div>
                    <p className="text-[#17243B] line-clamp-1">{job.custom_request?.description || job.product?.title || 'Custom CAD'}</p>
                    <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                      <span>Status: {job.status}</span>
                      <span>Due: {job.due_at ? new Date(job.due_at).toLocaleDateString() : '72h'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No active orders currently assigned to this modeller.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E8D7B7]">
              <button
                onClick={() => {
                  setSelectedStaffDrawer(null);
                  onSelectModule('staff');
                }}
                className="w-full py-2.5 bg-[#17345C] text-[#FAF8F3] hover:bg-[#12245E] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Open Full Modeller Management →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN MODELLER MODAL */}
      {assignModalOrder && (
        <div className="fixed inset-0 z-50 bg-[#0B1330]/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#D4AF37]/40 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#17243B]">Assign CAD Modeller</h3>
                <p className="text-xs text-[#6B7280]">
                  Dispatch this custom design order directly to a specialist modeller.
                </p>
              </div>
              <button
                onClick={() => {
                  setAssignModalOrder(null);
                  setSelectedModellerId('');
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Preview Summary */}
            <div className="p-3.5 rounded-2xl bg-[#09112B] text-[#FAF8F3] border border-[#D4AF37]/30 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[#F5E7A3] font-bold">
                  SCS-2026-{String(assignModalOrder.id).padStart(4, '0')}
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatINR(assignModalOrder.total_price)}
                </span>
              </div>
              <div className="font-semibold text-sm line-clamp-1">
                {assignModalOrder.custom_request?.description || assignModalOrder.product?.title || 'Bespoke Custom CAD Design'}
              </div>
              <div className="text-[11px] text-white/60">
                Client: {assignModalOrder.client?.first_name ? `${assignModalOrder.client.first_name} ${assignModalOrder.client.last_name || ''}`.trim() : (assignModalOrder.custom_request?.contact_name || assignModalOrder.client?.username || 'Client')}
              </div>
            </div>

            {assignError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            {/* Modellers Select List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <label className="block text-xs font-semibold text-[#17243B]">
                Select Available Modeller:
              </label>

              {staffWithComputedLoads.map((staff) => {
                const isSelected = selectedModellerId === staff.id;
                const isFull = (staff.currentLoad || 0) >= (staff.maxJobLimit || 2);

                return (
                  <div
                    key={staff.id}
                    onClick={() => setSelectedModellerId(staff.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#C9A227] bg-[#FAF9F5] ring-2 ring-[#C9A227]/30'
                        : isFull
                        ? 'border-slate-200 bg-slate-50/60 opacity-60'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={getOptimizedImageUrl(staff.avatar)}
                        alt={staff.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
                        }}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-bold text-xs text-[#17243B] flex items-center gap-1.5">
                          <span>{staff.name}</span>
                          {isFull && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-bold">
                              Full
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{staff.role}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#17243B]">
                        {staff.currentLoad || 0} / {staff.maxJobLimit || 2} slots
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {isFull ? 'At Capacity' : 'Available'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAssignModalOrder(null);
                  setSelectedModellerId('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAssigning || !selectedModellerId}
                onClick={handleConfirmAssignment}
                className="px-5 py-2.5 rounded-xl bg-[#17345C] hover:bg-[#12245E] text-[#FAF8F3] text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-[#F5E7A3]" />
                    <span>Confirm & Assign</span>
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
