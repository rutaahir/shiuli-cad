import React, { useState } from 'react';
import { StaffEarningsRecord, StaffMember } from '../../types';
import {
  Coins,
  CheckCircle2,
  Clock,
  FileText,
  Receipt,
  Printer,
  X,
  RefreshCw,
  Building2,
  Banknote,
  Smartphone,
  Download,
  Sparkles,
} from 'lucide-react';

interface StaffEarningsTabProps {
  staff: StaffMember;
  earnings: StaffEarningsRecord[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const StaffEarningsTab: React.FC<StaffEarningsTabProps> = ({
  staff,
  earnings,
  loading = false,
  onRefresh,
}) => {
  const [selectedVoucher, setSelectedVoucher] = useState<StaffEarningsRecord | null>(null);

  // Dynamic Financial Calculations from Real Data
  const totalSettled = earnings.reduce((acc, e) => {
    if (typeof e.amountPaid === 'number') {
      return acc + e.amountPaid;
    }
    return e.status === 'Settled' ? acc + e.amount : acc;
  }, 0);

  const totalPending = earnings.reduce((acc, e) => {
    if (e.status === 'Settled') return acc;
    if (typeof e.balanceDue === 'number') return acc + e.balanceDue;
    return acc + Math.max(0, e.amount - (e.amountPaid || 0));
  }, 0);

  const totalLifetime = earnings.reduce((acc, e) => acc + (e.amount || 0), 0) || staff.totalEarnings;

  // Identify latest settled disbursement for note
  const settledRecords = earnings.filter((e) => e.status === 'Settled' || (e.amountPaid && e.amountPaid > 0));
  const latestSettled = settledRecords[0];

  const handleDownloadStatement = () => {
    if (earnings.length === 0) {
      alert('No settlement history available to export yet.');
      return;
    }

    const headers = 'Settlement ID,Order Number,Design Piece,Date,Total Payout (INR),Amount Paid (INR),Balance Due (INR),Status,Payment Method,Transaction Ref\n';
    const rows = earnings
      .map(
        (e) =>
          `"${e.id}","${e.orderNumber}","${e.title.replace(/"/g, '""')}","${e.completedDate}",${e.amount},${e.amountPaid ?? (e.status === 'Settled' ? e.amount : 0)},${e.balanceDue ?? 0},"${e.status}","${e.paymentMethod || 'bank_transfer'}","${e.settlementRef || 'N/A'}"`
      )
      .join('\n');

    const csvBlob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Shiuli_Craftsman_Payout_Statement_${staff.id || 'STF'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8D7B7] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFF9F0] text-[#B88732] border border-[#E8D7B7] text-[10px] font-mono font-bold uppercase tracking-widest shadow-2xs">
              Financial Atelier
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• Real-time Payout Ledger</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#17243B] tracking-tight">
            Craftsman Earnings &amp; Payouts
          </h1>
          <p className="text-xs text-[#6B7280] max-w-2xl font-light">
            Live commission fees, client-approved milestones, and studio accounting disbursement records for {staff.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Refresh Live Settlements"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#17345C]' : ''}`} />
            </button>
          )}

          <button
            onClick={handleDownloadStatement}
            className="btn-gold-luxury px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Statement (CSV)</span>
          </button>
        </div>
      </div>

      {/* 3 Real-time Financial Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Lifetime Earnings */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280] font-mono font-semibold">
            <span>Lifetime Earnings</span>
            <Coins className="w-4 h-4 text-[#C9A227]" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#17243B] font-mono">
            ₹{totalLifetime.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-[#6B7280]">
            Based on {earnings.length} completed CAD commission{earnings.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Card 2: Settled Bank Credits */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm hover:border-emerald-300 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-mono font-semibold">
            <span>Settled Bank Credits</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-700 font-mono">
            ₹{totalSettled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-emerald-600 truncate" title={latestSettled?.settlementRef ? `Ref: ${latestSettled.settlementRef}` : undefined}>
            {latestSettled
              ? latestSettled.paymentMethod === 'upi'
                ? `Direct UPI / QR Transfer ${latestSettled.settlementRef ? `(${latestSettled.settlementRef})` : ''}`
                : latestSettled.paymentMethod === 'cash'
                ? 'Studio Cash Voucher'
                : latestSettled.settlementRef
                ? `Credited via Bank Transfer (Ref: ${latestSettled.settlementRef})`
                : 'Credited via Direct Bank Transfer'
              : 'Direct studio bank settlement upon review'}
          </p>
        </div>

        {/* Card 3: Pending Settlement */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8D7B7] shadow-sm hover:border-[#C9A227]/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-700 font-mono font-semibold">
            <span>Pending Settlement</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-amber-700 font-mono">
            ₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-amber-600">
            {totalPending > 0 ? 'Disbursement queued for atelier accounting' : 'All completed commissions fully settled'}
          </p>
        </div>
      </div>

      {/* Live Settlement History Breakdown Table */}
      <div className="bg-white border border-[#E8D7B7] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-[#FFF9F0] text-[#17345C] font-serif font-bold text-sm border-b border-[#E8D7B7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#B88732]" />
            <span>Settlement History Breakdown</span>
          </div>
          <span className="text-xs font-mono font-normal text-[#687386]">
            {earnings.length} Record{earnings.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E8D7B7] text-[#6B7280] font-mono uppercase text-[10px] tracking-wider">
                <th className="p-4">Reference</th>
                <th className="p-4">Order / Piece</th>
                <th className="p-4">Completion Date</th>
                <th className="p-4">Payout</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Accounting Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8D7B7] text-[#17243B]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-mono">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#17345C]" />
                      <span>Loading real-time financial settlements...</span>
                    </div>
                  </td>
                </tr>
              ) : earnings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-mono">
                    <div className="max-w-md mx-auto space-y-2">
                      <Sparkles className="w-8 h-8 text-[#D4AF37] mx-auto opacity-70" />
                      <h4 className="font-bold text-sm text-[#17243B]">No Settlement Records Yet</h4>
                      <p className="text-xs text-[#6B7280]">
                        Orders completed by you will automatically generate real-time modeller payout and bank credit records here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                earnings.map((e) => {
                  const isSettled = e.status === 'Settled';
                  const isPartial = e.status === 'Partially Settled';

                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      {/* Reference Column */}
                      <td className="p-4 font-mono font-bold text-[#09112B]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#17345C] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {e.id}
                          </span>
                        </div>
                        {e.settlementRef && (
                          <span className="text-[10px] text-slate-500 font-mono block mt-1 truncate max-w-[120px]" title={e.settlementRef}>
                            Txn: {e.settlementRef}
                          </span>
                        )}
                      </td>

                      {/* Order / Piece Column */}
                      <td className="p-4 max-w-xs">
                        <div className="font-semibold text-[#17243B] truncate" title={e.title}>
                          {e.title}
                        </div>
                        <div className="text-[10px] text-[#6B7280] font-mono mt-0.5">
                          {e.orderNumber}
                        </div>
                      </td>

                      {/* Completion Date */}
                      <td className="p-4 font-mono text-[#6B7280] whitespace-nowrap">
                        {e.completedDate}
                      </td>

                      {/* Payout Amounts */}
                      <td className="p-4 font-mono whitespace-nowrap">
                        <div className="font-bold text-emerald-700 text-sm">
                          ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {e.amountPaid !== undefined && e.amountPaid > 0 && !isSettled && (
                          <div className="text-[10px] text-blue-600 font-semibold">
                            ₹{e.amountPaid.toLocaleString('en-IN')} paid
                          </div>
                        )}
                        {e.balanceDue !== undefined && e.balanceDue > 0 && (
                          <div className="text-[10px] text-amber-600 font-medium">
                            ₹{e.balanceDue.toLocaleString('en-IN')} remaining
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                            isSettled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPartial
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isSettled ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{e.status}</span>
                        </span>
                        {e.settledAt && (
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                            {e.settledAt}
                          </span>
                        )}
                      </td>

                      {/* Action: View Slip */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedVoucher(e)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs font-mono transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Receipt className="w-3.5 h-3.5 text-slate-600" />
                          <span>View Voucher</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL: OFFICIAL CRAFTSMAN SETTLEMENT VOUCHER */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl border border-[#E8D7B7] shadow-2xl p-6 sm:p-8 space-y-6 text-[#17243B] animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D7B7]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-serif text-lg font-bold text-[#17243B]">
                  CAD Modeller Settlement Voucher
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Voucher Printable Container */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#FBFBFE] to-white border border-slate-200 space-y-4 text-xs font-mono">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="font-serif text-base font-bold text-[#17345C] tracking-wide">
                    SHIULI CAD ATELIER
                  </div>
                  <div className="text-[10px] text-slate-500">Fine Jewellery CAD &amp; 3D Engineering Studio</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[#17345C]">{selectedVoucher.id}</div>
                  <div className="text-[10px] text-slate-500">{selectedVoucher.completedDate}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-1">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Artisan / Modeller</span>
                  <span className="font-bold text-slate-800 text-sm block">{staff.name}</span>
                  <span className="text-[11px] text-slate-500">{staff.role}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Job Assignment</span>
                  <span className="font-bold text-slate-800 text-sm block">{selectedVoucher.orderNumber}</span>
                  <span className="text-[11px] text-slate-600 truncate block">{selectedVoucher.title}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Total Agreed CAD Payout:</span>
                  <span className="font-bold text-slate-800">
                    ₹{selectedVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Disbursed / Settled Amount:</span>
                  <span className="font-bold text-emerald-700">
                    ₹{(selectedVoucher.amountPaid ?? (selectedVoucher.status === 'Settled' ? selectedVoucher.amount : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 font-bold">
                  <span className="text-slate-700">Remaining Balance Due:</span>
                  <span className="text-amber-700">
                    ₹{(selectedVoucher.balanceDue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-400 uppercase text-[9px] block">Payment Channel</span>
                  <span className="font-bold text-slate-700 uppercase flex items-center gap-1 mt-0.5">
                    {selectedVoucher.paymentMethod === 'cash' ? (
                      <><Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash in Hand</>
                    ) : selectedVoucher.paymentMethod === 'upi' ? (
                      <><Smartphone className="w-3.5 h-3.5 text-blue-600" /> UPI / QR Transfer</>
                    ) : (
                      <><Building2 className="w-3.5 h-3.5 text-indigo-600" /> Direct Bank NEFT</>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[9px] block">UTR / Transaction Ref</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {selectedVoucher.settlementRef || '—'}
                  </span>
                </div>
              </div>

              {selectedVoucher.notes && (
                <div className="pt-2 border-t border-slate-200 text-[11px]">
                  <span className="text-slate-400 uppercase text-[9px] block mb-0.5">Accounting Notes</span>
                  <span className="text-slate-700 italic">{selectedVoucher.notes}</span>
                </div>
              )}

              <div className="pt-6 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200">
                <div>Authorized By: Shiuli CAD Studio Accounts</div>
                <div>Settlement Status: <strong className="text-emerald-700 uppercase">{selectedVoucher.status}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
