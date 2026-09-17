import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  PieChart, 
  Clock, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  RefreshCw,
  Loader2,
  AlertCircle,
  Sparkles,
  Printer,
  CheckCircle2
} from 'lucide-react';

export interface CategoryStat {
  category: string;
  count: number;
  percent: number;
  color: string;
}

export interface TurnaroundMonth {
  month: string;
  hrs: number;
}

export interface StaffEfficiency {
  id: number;
  name: string;
  email: string;
  assigned_total: number;
  completed: number;
  active: number;
  avg_turnaround: string;
}

export interface AnalyticsSummaryData {
  total_revenue: number;
  total_orders_count: number;
  active_commissions_count: number;
  avg_turnaround_hours: number;
  category_breakdown: CategoryStat[];
  turnaround_trend: TurnaroundMonth[];
  staff_efficiency: StaffEfficiency[];
  generated_at?: string;
}

export const AdminAnalyticsModule: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await api.ensureAdminToken();
      const res = await api.getAnalyticsSummary();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load analytics summary:', err);
      setErrorMsg(err.message || 'Failed to load live business intelligence metrics from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExportPDF = () => {
    if (!data) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export the Analytics PDF report.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shiuli CAD Studio - Executive Analytics Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1E2230; background: #fff; }
            .header { border-bottom: 2px solid #D4AF37; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: bold; color: #0B1330; letter-spacing: 1px; }
            .date { font-size: 12px; color: #666; font-family: monospace; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
            .card { background: #F8F9FC; border: 1px solid #E5E7EF; border-radius: 12px; padding: 15px; }
            .card-label { font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold; }
            .card-val { font-size: 22px; font-weight: bold; color: #0B1330; margin-top: 5px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 15px; color: #0B1330; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { padding: 10px; border: 1px solid #E5E7EF; text-align: left; }
            th { background: #0B1330; color: #F5E7A3; font-weight: bold; }
            .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #eee; font-size: 10px; color: #888; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">SHIULI CAD STUDIO</div>
              <div style="font-size: 14px; color: #555; margin-top: 4px;">Executive Reports & Business Intelligence Summary</div>
            </div>
            <div class="date">
              Report Generated: ${new Date().toLocaleString()}<br/>
              Confidential — SuperAdmin Internal Record
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-label">Total Gross Revenue</div>
              <div class="card-val">$${(data.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="card">
              <div class="card-label">Total Executed Orders</div>
              <div class="card-val">${data.total_orders_count || 0}</div>
            </div>
            <div class="card">
              <div class="card-label">Active CAD Commissions</div>
              <div class="card-val">${data.active_commissions_count || 0}</div>
            </div>
            <div class="card">
              <div class="card-label">Avg Turnaround Time</div>
              <div class="card-val">${data.avg_turnaround_hours || 4.2}h</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Order Breakdown by Jewellery Category</div>
            <table>
              <thead>
                <tr>
                  <th>Jewellery Category</th>
                  <th>Order / Product Count</th>
                  <th>Share Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${(data.category_breakdown || []).map(c => `
                  <tr>
                    <td><strong>${c.category}</strong></td>
                    <td>${c.count}</td>
                    <td>${c.percent}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Turnaround Time Optimization (Last 5 Months)</div>
            <table>
              <thead>
                <tr>
                  ${(data.turnaround_trend || []).map(m => `<th>${m.month}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  ${(data.turnaround_trend || []).map(m => `<td><strong>${m.hrs}h</strong></td>`).join('')}
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            Shiuli CAD Studio Platform © ${new Date().getFullYear()} — All Rights Reserved.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1330]/5 text-[#0B1330] text-xs font-semibold uppercase tracking-wider mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#D4AF37]" />
            Real-Time Analytics Dashboard
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Reports & Business Intelligence
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Volumetric order analysis, revenue breakdown by jewellery category, and modeller efficiency metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh Business Intelligence"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>

          <button
            onClick={handleExportPDF}
            disabled={loading || !data}
            className="btn-gold-luxury px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-[#0D1B4C]" />
            <span>Export Analytics PDF</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" /> Computing live database business intelligence metrics...
        </div>
      ) : data ? (
        <>
          {/* Top KPI Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[#6B7280] text-[10px] font-bold uppercase tracking-wider">Gross Studio Revenue</span>
                <div className="text-2xl font-extrabold text-[#0D1B4C] mt-1 font-mono">
                  ${(data.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#0D1B4C]/5 flex items-center justify-center text-[#0D1B4C]">
                <DollarSign className="w-6 h-6 text-[#D4AF37]" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[#6B7280] text-[10px] font-bold uppercase tracking-wider">Total Orders Executed</span>
                <div className="text-2xl font-extrabold text-[#0D1B4C] mt-1 font-mono">
                  {data.total_orders_count || 0}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#2856C7]/10 flex items-center justify-center text-[#2856C7]">
                <ShoppingBag className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[#6B7280] text-[10px] font-bold uppercase tracking-wider">Active CAD Commissions</span>
                <div className="text-2xl font-extrabold text-[#C9A227] mt-1 font-mono">
                  {data.active_commissions_count || 0}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#C9A227]/10 flex items-center justify-center text-[#C9A227]">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[#6B7280] text-[10px] font-bold uppercase tracking-wider">Avg Turnaround Time</span>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
                  {data.avg_turnaround_hours || 4.2}h
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-white rounded-2xl border border-[#E5E7EF] p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#1E2230] flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#C9A227]" />
                  <span>Orders by Jewellery Category</span>
                </h3>
                <span className="text-[11px] font-mono text-[#6B7280]">Live Volume Split</span>
              </div>

              <div className="space-y-4 text-xs font-mono">
                {(data.category_breakdown || []).map((c) => (
                  <div key={c.category} className="space-y-1.5">
                    <div className="flex justify-between text-[#1E2230]">
                      <span className="font-semibold text-slate-800">{c.category} ({c.count} orders)</span>
                      <span className="font-bold text-[#0D1B4C]">{c.percent}%</span>
                    </div>
                    <div className="h-3 w-full bg-[#F6F7FB] rounded-full overflow-hidden border border-[#E5E7EF]">
                      <div
                        className={`h-full ${c.color || 'bg-[#0D1B4C]'} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(c.percent, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Turnaround Performance Trend */}
            <div className="bg-white rounded-2xl border border-[#E5E7EF] p-6 shadow-sm space-y-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#1E2230] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2856C7]" />
                  <span>Turnaround Time Optimization (Hours)</span>
                </h3>
                <span className="text-[11px] font-mono text-emerald-600 font-bold">▼ Optimization Trend</span>
              </div>

              <div className="h-56 flex items-end justify-between gap-4 pt-6 border-b border-[#E5E7EF] pb-3 text-xs font-mono">
                {(data.turnaround_trend || []).map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="font-bold text-[#0D1B4C] text-xs">{m.hrs}h</span>
                    <div
                      className="w-full bg-[#0D1B4C] rounded-t-xl transition-all duration-500 hover:bg-[#C9A227]"
                      style={{ height: `${Math.min((m.hrs / 10) * 100, 100)}%` }}
                    />
                    <span className="text-[#6B7280] font-bold">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Staff Modeller Efficiency & Workload */}
          {data.staff_efficiency && data.staff_efficiency.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EF] p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-base font-bold text-[#1E2230] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0D1B4C]" />
                <span>Modeller Staff Efficiency & Active Workloads</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F6F7FB] border-b border-[#E5E7EF] text-[10px] font-mono uppercase text-[#6B7280]">
                      <th className="p-3.5 font-bold">Modeller Name</th>
                      <th className="p-3.5 font-bold">Email</th>
                      <th className="p-3.5 font-bold">Total Assigned</th>
                      <th className="p-3.5 font-bold">Completed Jobs</th>
                      <th className="p-3.5 font-bold">Active Jobs</th>
                      <th className="p-3.5 font-bold">Avg Turnaround</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EF]">
                    {data.staff_efficiency.map((staff) => (
                      <tr key={staff.id} className="hover:bg-[#F6F7FB] transition-colors font-mono">
                        <td className="p-3.5 font-bold text-[#1E2230]">{staff.name}</td>
                        <td className="p-3.5 text-[#6B7280]">{staff.email}</td>
                        <td className="p-3.5 font-bold text-[#0D1B4C]">{staff.assigned_total} orders</td>
                        <td className="p-3.5 font-bold text-emerald-600">{staff.completed}</td>
                        <td className="p-3.5 font-bold text-[#C9A227]">{staff.active}</td>
                        <td className="p-3.5 font-bold text-slate-700">{staff.avg_turnaround}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default AdminAnalyticsModule;
