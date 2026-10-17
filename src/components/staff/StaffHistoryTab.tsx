import React, { useState } from 'react';
import { StaffEarningsRecord } from '../../types';
import { CheckCircle2, Download, Receipt, X, Printer, Sparkles } from 'lucide-react';

interface StaffHistoryTabProps {
  earnings: StaffEarningsRecord[];
  staffName?: string;
}

export const StaffHistoryTab: React.FC<StaffHistoryTabProps> = ({ earnings, staffName }) => {
  const [selectedReceipt, setSelectedReceipt] = useState<StaffEarningsRecord | null>(null);

  const handleDownloadLog = () => {
    if (earnings.length === 0) return;
    const headers = 'Order Number,Design Title,Completed Date,Payout Amount,Status,UTR Reference\n';
    const rows = earnings
      .map(
        (e) =>
          `"${e.orderNumber}","${e.title.replace(/"/g, '""')}","${e.completedDate}",${e.amount},"${e.status}","${e.settlementRef || 'N/A'}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Shiuli_Completed_CAD_Log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8D7B7] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-widest">
              Craftsman Logbook
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• Completed Commissions</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#17243B] tracking-tight">
            Delivered CAD Commissions Log
          </h1>
          <p className="text-xs text-[#6B7280] max-w-2xl font-light">
            A permanent archive of every custom piece designed, inspected, and delivered by {staffName || 'You'}.
          </p>
        </div>

        {earnings.length > 0 && (
          <button
            onClick={handleDownloadLog}
            className="btn-gold-luxury px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Logbook (CSV)</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-[#E8D7B7] rounded-2xl overflow-hidden shadow-sm">
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
            <tbody className="divide-y divide-[#E8D7B7] text-[#17243B]">
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-mono">
                    <div className="max-w-md mx-auto space-y-2">
                      <Sparkles className="w-8 h-8 text-[#D4AF37] mx-auto opacity-70" />
                      <h4 className="font-bold text-sm text-[#17243B]">No Delivered Commissions Yet</h4>
                      <p className="text-xs text-[#6B7280]">
                        Completed orders assigned to {staffName || 'you'} will be archived here permanently with full QC clearance records.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                earnings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-[#09112B]">{item.orderNumber}</td>
                    <td className="p-4 font-semibold text-[#17243B]">{item.title}</td>
                    <td className="p-4 font-mono text-[#6B7280]">{item.completedDate}</td>
                    <td className="p-4 font-mono font-bold text-emerald-700">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SOW Passed
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedReceipt(item)}
                        className="px-3 py-1.5 rounded-lg bg-[#09112B] hover:bg-[#122254] text-[#F5E7A3] font-bold text-[11px] transition-colors inline-flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        <Receipt className="w-3 h-3 text-[#D4AF37]" /> View Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E8D7B7] shadow-2xl p-6 sm:p-7 space-y-5 text-[#17243B] animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-serif text-lg font-bold text-[#17243B]">
                  Delivered CAD Commission Receipt
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Order Reference:</span>
                <span className="font-bold text-[#09112B]">{selectedReceipt.orderNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Design Title:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[240px]">{selectedReceipt.title}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Completed Date:</span>
                <span className="font-medium text-slate-700">{selectedReceipt.completedDate}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Craftsman Payout:</span>
                <span className="font-bold text-emerald-700 text-sm">
                  ₹{selectedReceipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Settlement Status:</span>
                <span className="font-bold text-emerald-800 uppercase">{selectedReceipt.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
