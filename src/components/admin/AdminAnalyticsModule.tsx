import React from 'react';
import { BarChart3, Download, TrendingUp, PieChart, Clock } from 'lucide-react';

export const AdminAnalyticsModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Reports & Business Intelligence
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Volumetric order analysis, revenue breakdown by jewellery category, and modeller efficiency metrics.
          </p>
        </div>

        <button
          onClick={() => alert('Report PDF exported!')}
          className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-md"
        >
          <Download className="w-3.5 h-3.5 text-[#0D1B4C]" />
          <span>Export Analytics PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-bold text-[#1E2230] flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#C9A227]" />
            <span>Orders by Category</span>
          </h3>

          <div className="space-y-3 text-xs font-mono">
            {[
              { category: 'Bridal Chokers & Necklaces', percent: 42, color: 'bg-[#0D1B4C]' },
              { category: 'Solitaire & Engagement Rings', percent: 28, color: 'bg-[#C9A227]' },
              { category: 'Heritage Bangles & Kadas', percent: 18, color: 'bg-[#2856C7]' },
              { category: 'Earrings & Pendants', percent: 12, color: 'bg-[#1F9D66]' },
            ].map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between text-[#1E2230]">
                  <span>{c.category}</span>
                  <span className="font-bold">{c.percent}%</span>
                </div>
                <div className="h-2.5 w-full bg-[#F6F7FB] rounded-full overflow-hidden border border-[#E5E7EF]">
                  <div
                    className={`h-full ${c.color} rounded-full`}
                    style={{ width: `${c.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Turnaround Performance Trend */}
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-bold text-[#1E2230] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2856C7]" />
            <span>Turnaround Time Optimization (Hours)</span>
          </h3>

          <div className="h-48 flex items-end justify-between gap-4 pt-6 border-b border-[#E5E7EF] pb-2 text-xs font-mono">
            {[
              { month: 'May', hrs: 8.5 },
              { month: 'Jun', hrs: 6.2 },
              { month: 'Jul', hrs: 5.1 },
              { month: 'Aug', hrs: 4.5 },
              { month: 'Sep', hrs: 4.2 },
            ].map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="font-bold text-[#0D1B4C]">{m.hrs}h</span>
                <div
                  className="w-full bg-[#0D1B4C] rounded-t-lg transition-all"
                  style={{ height: `${(m.hrs / 10) * 100}%` }}
                />
                <span className="text-[#6B7280]">{m.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
