import React from 'react';
import { StaffEarningsRecord, StaffMember } from '../../types';
import { Coins, CheckCircle2, Clock, FileText } from 'lucide-react';

interface StaffEarningsTabProps {
  staff: StaffMember;
  earnings: StaffEarningsRecord[];
}

export const StaffEarningsTab: React.FC<StaffEarningsTabProps> = ({ staff, earnings }) => {
  const totalSettled = earnings
    .filter((e) => e.status === 'Settled')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalPending = earnings
    .filter((e) => e.status === 'Pending Settlement')
    .reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-widest">
              Financial Atelier
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• Monthly Payout Ledger</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Craftsman Earnings & Payouts
          </h1>
          <p className="text-xs text-[#6B7280] max-w-2xl font-light">
            Track your agreed commission fees, approved custom sales, and direct bank settlement records.
          </p>
        </div>

        <button className="btn-gold-luxury px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all shrink-0">
          <FileText className="w-4 h-4" />
          <span>Download Tax Statement (PDF)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280] font-mono font-semibold">
            <span>Lifetime Earnings</span>
            <Coins className="w-4 h-4 text-[#C9A227]" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#1E2230]">
            ₹{staff.totalEarnings.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#6B7280]">Based on 142 completed CAD commissions</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm hover:border-emerald-300 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-mono font-semibold">
            <span>Settled Bank Credits</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-700">
            ₹{totalSettled.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-emerald-600">Credited to HDFC Bank A/C ending 4829</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EF] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-700 font-mono font-semibold">
            <span>Pending Settlement</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-amber-700">
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-amber-600">Auto-settled upon client approval</p>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EF] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-[#09112B] text-[#F5E7A3] font-serif font-bold text-sm border-b border-[#D4AF37]/20">
          Settlement History Breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E5E7EF] text-[#6B7280] font-mono uppercase text-[10px] tracking-wider">
                <th className="p-4">Reference</th>
                <th className="p-4">Order / Piece</th>
                <th className="p-4">Completion Date</th>
                <th className="p-4">Payout</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EF] text-[#1E2230]">
              {earnings.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-[#09112B]">{e.settlementRef || e.id}</td>
                  <td className="p-4">
                    <div className="font-semibold text-[#1E2230]">{e.title}</div>
                    <div className="text-[10px] text-[#6B7280] font-mono">{e.orderNumber}</div>
                  </td>
                  <td className="p-4 font-mono text-[#6B7280]">{e.completedDate}</td>
                  <td className="p-4 font-mono font-bold text-emerald-700">₹{e.amount.toLocaleString('en-IN')}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        e.status === 'Settled'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
