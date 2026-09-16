import React from 'react';
import { StaffEarningsRecord } from '../../types';
import { CheckCircle2, Download } from 'lucide-react';

interface StaffHistoryTabProps {
  earnings: StaffEarningsRecord[];
}

export const StaffHistoryTab: React.FC<StaffHistoryTabProps> = ({ earnings }) => {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-widest">
              Craftsman Logbook
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• Completed Commissions</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Delivered CAD Commissions Log
          </h1>
          <p className="text-xs text-[#6B7280] max-w-2xl font-light">
            A permanent archive of every custom piece designed and delivered by Rahim Sheikh.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EF] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#09112B] border-b border-[#D4AF37]/20 text-[#F5E7A3] font-mono uppercase text-[10px] tracking-wider">
                <th className="p-4">Order #</th>
                <th className="p-4">Design Title</th>
                <th className="p-4">Completed Date</th>
                <th className="p-4">Payout Amount</th>
                <th className="p-4">QA Status</th>
                <th className="p-4 text-right">Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EF] text-[#1E2230]">
              {earnings.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-[#09112B]">{item.orderNumber}</td>
                  <td className="p-4 font-semibold text-[#1E2230]">{item.title}</td>
                  <td className="p-4 font-mono text-[#6B7280]">{item.completedDate}</td>
                  <td className="p-4 font-mono font-bold text-emerald-700">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SOW Passed
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="px-3 py-1.5 rounded-lg bg-[#09112B] hover:bg-[#122254] text-[#F5E7A3] font-bold text-[11px] transition-colors inline-flex items-center gap-1 shadow-sm">
                      <Download className="w-3 h-3 text-[#D4AF37]" /> PDF Receipt
                    </button>
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
