import React, { useState } from 'react';
import { StaffMember, AdminModuleId, ActivityLogItem } from '../../types';
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
  ShieldAlert
} from 'lucide-react';

interface AdminOverviewModuleProps {
  staffList: StaffMember[];
  onSelectModule: (module: AdminModuleId) => void;
  onUpdateStaffLimit: (staffId: string, newLimit: number) => void;
  escalationTimerMinutes: number;
  activityLogs: ActivityLogItem[];
}

export const AdminOverviewModule: React.FC<AdminOverviewModuleProps> = ({
  staffList,
  onSelectModule,
  onUpdateStaffLimit,
  escalationTimerMinutes,
  activityLogs,
}) => {
  const [selectedStaffDrawer, setSelectedStaffDrawer] = useState<StaffMember | null>(null);
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D'>('30D');

  const availableStaff = staffList.filter((s) => s.status === 'active' && s.currentLoad < s.maxJobLimit);

  // Unassigned urgent orders mock data with elapsed time
  const actionRequiredOrders = [
    {
      id: 'SCS-2026-8948',
      title: 'Bespoke Jadau Polki Choker CAD',
      client: 'Priya Singhania',
      unassignedMinutes: 27, // Exceeds threshold (15m) -> Escalated Red
      budget: '₹45,000',
    },
    {
      id: 'SCS-2026-8951',
      title: 'Solitaire Platinum Emerald Ring',
      client: 'David Rothschild',
      unassignedMinutes: 8, // Under threshold -> Amber
      budget: '₹20,000',
    },
    {
      id: 'SCS-2026-8954',
      title: 'Floral Relief Kada Bangle 3DM',
      client: 'Ananya Verma',
      unassignedMinutes: 19, // Exceeds threshold -> Escalated Red
      budget: '₹26,000',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Studio Command Center
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5 font-light">
            Real-time staff workload, live design pipeline, and order assignment monitoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectModule('approvals')}
            className="px-3.5 py-2 rounded-xl bg-[#C9A227]/10 text-[#C9A227] hover:bg-[#C9A227]/20 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#C9A227]/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Review Approvals (3)</span>
          </button>
          <button
            onClick={() => onSelectModule('custom-requests')}
            className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md"
          >
            Manage Quotes
          </button>
        </div>
      </div>

      {/* Section 1: KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Stat 1 */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Total Orders Today</span>
            <span className="p-1 rounded-lg bg-[#2856C7]/10 text-[#2856C7]">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#1E2230]">14</div>
          <div className="flex items-center gap-1 text-[11px] text-[#1F9D66] font-medium">
            <span>+18.4%</span>
            <span className="text-[#6B7280] font-normal">vs yesterday</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#C9A227]/30 shadow-sm hover:border-[#C9A227]/60 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Pending Approvals</span>
            <span className="p-1 rounded-lg bg-[#E8A93B]/10 text-[#E8A93B]">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#1E2230]">3</div>
          <div className="text-[11px] text-[#E8A93B] font-medium">Needs review</div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Active Custom Requests</span>
            <span className="p-1 rounded-lg bg-[#2856C7]/10 text-[#2856C7]">
              <Zap className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#1E2230]">5</div>
          <div className="text-[11px] text-[#2856C7] font-medium">In negotiation</div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Monthly Revenue</span>
            <span className="p-1 rounded-lg bg-[#1F9D66]/10 text-[#1F9D66]">
              <IndianRupee className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#1E2230]">₹1,84,200</div>
          <div className="flex items-center gap-1 text-[11px] text-[#1F9D66] font-medium">
            <span>+24%</span>
            <span className="text-[#6B7280] font-normal">vs target</span>
          </div>
        </div>

        {/* Stat 5 */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Available Staff</span>
            <span className="p-1 rounded-lg bg-[#1F9D66]/10 text-[#1F9D66]">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#1E2230]">
            {availableStaff.length} / {staffList.filter((s) => s.status === 'active').length}
          </div>
          <div className="text-[11px] text-[#1F9D66] font-medium">Ready for jobs</div>
        </div>

        {/* Stat 6 */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Avg Turnaround Time</span>
            <span className="p-1 rounded-lg bg-[#2856C7]/10 text-[#2856C7]">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#1E2230]">4.2 hrs</div>
          <div className="text-[11px] text-[#1F9D66] font-medium">-15 mins vs avg</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 2: Live Staff Workload Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
            <div>
              <h2 className="font-serif text-base font-bold text-[#1E2230] flex items-center gap-2">
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
              className="text-xs font-semibold text-[#2856C7] hover:underline flex items-center gap-1"
            >
              <span>Full Board</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Workload Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EF] text-[11px] font-mono uppercase text-[#6B7280]">
                  <th className="pb-2 font-medium">Modeller</th>
                  <th className="pb-2 font-medium">Max Limit</th>
                  <th className="pb-2 font-medium">Current Load</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EF] text-xs">
                {staffList.map((staff) => {
                  const isFull = staff.currentLoad >= staff.maxJobLimit;
                  const loadPercent = Math.round((staff.currentLoad / staff.maxJobLimit) * 100);

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-[#F6F7FB] transition-colors group cursor-pointer"
                      onClick={() => setSelectedStaffDrawer(staff)}
                    >
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={staff.avatar}
                            alt={staff.name}
                            className="w-8 h-8 rounded-full object-cover border border-[#E5E7EF]"
                          />
                          <div>
                            <div className="font-semibold text-[#1E2230] group-hover:text-[#2856C7]">
                              {staff.name}
                            </div>
                            <div className="text-[10px] text-[#6B7280]">{staff.role}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 font-mono font-semibold text-[#1E2230]">
                        {staff.maxJobLimit} jobs
                      </td>

                      <td className="py-3 w-40">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span>
                              {staff.currentLoad} / {staff.maxJobLimit} slots
                            </span>
                            <span className="font-semibold">{loadPercent}%</span>
                          </div>
                          <div className="h-2 w-full bg-[#E5E7EF] rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isFull ? 'bg-[#D14343]' : 'bg-[#0D1B4C]'
                              }`}
                              style={{ width: `${Math.min(loadPercent, 100)}%` }}
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
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#0D1B4C] hover:bg-[#E5E7EF] transition-colors"
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
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
              <h2 className="font-serif text-base font-bold text-[#1E2230] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E8A93B]" />
                <span>Orders Requiring Attention</span>
              </h2>
              <span className="text-[10px] font-mono text-[#6B7280]">
                Escalation Limit: {escalationTimerMinutes} min
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {actionRequiredOrders.map((order) => {
                const isEscalated = order.unassignedMinutes > escalationTimerMinutes;
                return (
                  <div
                    key={order.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isEscalated
                        ? 'bg-[#D14343]/5 border-l-4 border-l-[#D14343] border-y-[#E5E7EF] border-r-[#E5E7EF]'
                        : 'bg-[#E8A93B]/5 border-l-4 border-l-[#E8A93B] border-y-[#E5E7EF] border-r-[#E5E7EF]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-[#2856C7]">
                          {order.id}
                        </span>
                        <h4 className="font-semibold text-xs text-[#1E2230]">{order.title}</h4>
                        <div className="text-[10px] text-[#6B7280]">Client: {order.client}</div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isEscalated
                              ? 'bg-[#D14343] text-white animate-pulse'
                              : 'bg-[#E8A93B]/20 text-[#1E2230]'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{order.unassignedMinutes}m wait</span>
                        </span>
                        {isEscalated && (
                          <div className="text-[9px] text-[#D14343] font-bold mt-1 uppercase flex items-center justify-end gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            Overdue Escalated!
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#E5E7EF]/60 flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1E2230]">{order.budget}</span>
                      <button
                        onClick={() => onSelectModule('orders')}
                        className="px-2.5 py-1 rounded-lg bg-[#0D1B4C] text-white hover:bg-[#12245E] transition-colors text-[11px] font-medium"
                      >
                        Assign Modeller Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EF] text-center">
            <button
              onClick={() => onSelectModule('orders')}
              className="text-xs font-semibold text-[#2856C7] hover:underline"
            >
              View All 14 Master Orders →
            </button>
          </div>
        </div>
      </div>

      {/* Section 4 & 5: Revenue Chart & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Orders Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
            <div>
              <h2 className="font-serif text-base font-bold text-[#1E2230]">
                Revenue & Orders Trend
              </h2>
              <p className="text-xs text-[#6B7280]">
                Monthly performance overview across ready downloads & custom engineering.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#F6F7FB] p-1 rounded-xl border border-[#E5E7EF] text-xs font-mono">
              {(['7D', '30D', '90D'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    chartRange === r
                      ? 'bg-[#0D1B4C] text-white font-bold'
                      : 'text-[#6B7280] hover:text-[#1E2230]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Graphic SVG Chart Simulation */}
          <div className="h-64 w-full pt-4 flex flex-col justify-between relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-[#6B7280]" />
              <div className="border-b border-[#6B7280]" />
              <div className="border-b border-[#6B7280]" />
              <div className="border-b border-[#6B7280]" />
            </div>

            <svg className="w-full h-48 overflow-visible" viewBox="0 0 500 150">
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
                stroke="#2856C7"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </svg>

            <div className="flex justify-between text-[11px] font-mono text-[#6B7280] pt-2 border-t border-[#E5E7EF]">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4 (Current)</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
          <div className="border-b border-[#E5E7EF] pb-3 flex items-center justify-between">
            <h2 className="font-serif text-base font-bold text-[#1E2230]">Recent Studio Activity</h2>
            <span className="text-[10px] font-mono text-[#6B7280]">Live feed</span>
          </div>

          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <img
                  src={
                    log.userAvatar ||
                    '/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
                  }
                  alt=""
                  className="w-7 h-7 rounded-full object-cover border border-[#E5E7EF] mt-0.5"
                />
                <div className="flex-1">
                  <div>
                    <strong className="text-[#1E2230]">{log.user}</strong>{' '}
                    <span className="text-[#6B7280]">{log.action}</span>
                  </div>
                  <div className="font-medium text-[#2856C7] mt-0.5">{log.target}</div>
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
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
              <h3 className="font-serif text-lg font-bold text-[#1E2230]">Modeller Quick Manage</h3>
              <button
                onClick={() => setSelectedStaffDrawer(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1E2230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={selectedStaffDrawer.avatar}
                alt=""
                className="w-12 h-12 rounded-full object-cover border-2 border-[#C9A227]"
              />
              <div>
                <h4 className="font-bold text-sm text-[#1E2230]">{selectedStaffDrawer.name}</h4>
                <p className="text-xs text-[#6B7280]">{selectedStaffDrawer.role}</p>
              </div>
            </div>

            {/* Quick Limit Edit */}
            <div className="p-4 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] space-y-3">
              <label className="text-xs font-semibold text-[#1E2230] block">
                Max Concurrent Job Limit
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    onUpdateStaffLimit(
                      selectedStaffDrawer.id,
                      Math.max(1, selectedStaffDrawer.maxJobLimit - 1)
                    )
                  }
                  className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EF] font-bold text-lg hover:bg-[#E5E7EF]"
                >
                  -
                </button>
                <span className="font-serif text-xl font-bold text-[#1E2230] font-mono">
                  {selectedStaffDrawer.maxJobLimit} jobs
                </span>
                <button
                  onClick={() =>
                    onUpdateStaffLimit(selectedStaffDrawer.id, selectedStaffDrawer.maxJobLimit + 1)
                  }
                  className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EF] font-bold text-lg hover:bg-[#E5E7EF]"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Determines how many active designs this staff member can accept simultaneously.
              </p>
            </div>

            {/* Active Jobs List */}
            <div className="space-y-3">
              <h5 className="font-semibold text-xs text-[#1E2230]">Current Active Jobs</h5>
              {selectedStaffDrawer.activeJobs.length > 0 ? (
                selectedStaffDrawer.activeJobs.map((job) => (
                  <div key={job.orderId} className="p-3 rounded-xl border border-[#E5E7EF] space-y-1">
                    <div className="flex justify-between font-mono text-[10px] text-[#2856C7] font-bold">
                      <span>{job.orderId}</span>
                      <span>Due: {job.deadline}</span>
                    </div>
                    <div className="font-semibold text-xs text-[#1E2230]">{job.designTitle}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#6B7280] italic">No active jobs assigned right now.</div>
              )}
            </div>

            <button
              onClick={() => setSelectedStaffDrawer(null)}
              className="w-full py-2.5 rounded-xl bg-[#0D1B4C] text-white text-xs font-semibold hover:bg-[#12245E]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
