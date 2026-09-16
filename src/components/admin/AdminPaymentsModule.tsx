import React, { useState, useEffect } from 'react';
import { SettlementRecord } from '../../types';
import { INITIAL_SETTLEMENTS } from '../../data/adminMockData';
import { api } from '../../services/api';
import {
  CreditCard,
  IndianRupee,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';

export const AdminPaymentsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settlements' | 'client-payments'>('settlements');
  const [settlements, setSettlements] = useState<SettlementRecord[]>(INITIAL_SETTLEMENTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchSettlements = async () => {
    try {
      await api.ensureAdminToken();
      const res = await api.request<any>('/settlements/');
      const ensureArray = (r: any) => {
        if (Array.isArray(r)) return r;
        if (r && Array.isArray(r.results)) return r.results;
        return [];
      };
      const list = ensureArray(res);
      if (list.length > 0) {
        const mapped: SettlementRecord[] = list.map((st: any) => ({
          id: `SET-${st.id}`,
          staffName: st.staff_name || st.staff?.first_name || 'CAD Designer',
          staffRole: 'Senior CAD Specialist',
          orderNumber: st.order ? `ORD-${st.order}` : `ORD-${st.id}`,
          designTitle: st.order_title || 'Bespoke Custom CAD Design',
          payoutAmount: parseFloat(st.amount || '0'),
          completedAt: st.created_at ? new Date(st.created_at).toLocaleDateString() : 'Recent',
          status: st.status === 'processed' ? 'settled' : 'unpaid',
          settledAt: st.processed_at ? new Date(st.processed_at).toLocaleDateString() : undefined,
          transactionRef: st.transaction_ref || undefined,
        }));
        setSettlements(mapped);
      }
    } catch (e) {
      console.warn('Failed to fetch settlements from API:', e);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const unpaidItems = settlements.filter((s) => s.status === 'unpaid');
  const totalUnpaidAmount = unpaidItems.reduce((acc, it) => acc + it.payoutAmount, 0);

  const toggleSelectAll = () => {
    if (selectedIds.length === unpaidItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unpaidItems.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleProcessSettlements = async () => {
    if (selectedIds.length === 0) return;
    const ids = selectedIds.map((id) => parseInt(id.replace('SET-', ''), 10)).filter((n) => !isNaN(n));
    try {
      if (ids.length > 0) {
        await api.request('/settlements/process-payout/', {
          method: 'POST',
          body: JSON.stringify({ settlement_ids: ids }),
        });
      }
      setSelectedIds([]);
      fetchSettlements();
      alert(`Successfully processed payout for ${selectedIds.length} job(s)!`);
    } catch (err: any) {
      alert(err?.message || 'Failed to process payouts.');
    }
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Settlement ID,Staff Name,Order Number,Design Title,Payout Amount (INR),Status\n' +
      settlements
        .map((s) => `${s.id},${s.staffName},${s.orderNumber},${s.designTitle},₹${s.payoutAmount},${s.status}`)
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Shiuli_Staff_Settlements_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Financial Control & Staff Settlements
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Audit client incoming gateway transactions and process modeller payouts for completed CAD jobs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#F6F7FB] p-1 rounded-xl border border-[#E5E7EF] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('settlements')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'settlements' ? 'bg-[#0D1B4C] text-white' : 'text-[#6B7280]'
              }`}
            >
              Staff Settlements (₹{totalUnpaidAmount.toLocaleString('en-IN')} Due)
            </button>
            <button
              onClick={() => setActiveTab('client-payments')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'client-payments' ? 'bg-[#0D1B4C] text-white' : 'text-[#6B7280]'
              }`}
            >
              Client Incoming Gateway
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EF] text-[#1E2230] hover:bg-[#F6F7FB] text-xs font-semibold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#1F9D66]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {activeTab === 'settlements' ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-[#E5E7EF] flex items-center justify-between">
            <div className="text-xs font-semibold text-[#1E2230]">
              Completed CAD Jobs Awaiting Modeller Payout
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={handleProcessSettlements}
                className="btn-gold-luxury px-4 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0D1B4C]" />
                <span>Process Payout for {selectedIds.length} Job(s)</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F6F7FB] border-b border-[#E5E7EF] text-[11px] font-mono uppercase text-[#6B7280]">
                  <th className="p-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === unpaidItems.length && unpaidItems.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-[#E5E7EF] text-[#C9A227] focus:ring-0"
                    />
                  </th>
                  <th className="p-3.5 font-medium">Modeller Name</th>
                  <th className="p-3.5 font-medium">Order Number</th>
                  <th className="p-3.5 font-medium">Design Title</th>
                  <th className="p-3.5 font-medium">Completion Date</th>
                  <th className="p-3.5 font-medium">Payout Due</th>
                  <th className="p-3.5 font-medium text-right">Settlement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EF] text-xs">
                {settlements.map((set) => {
                  const isUnpaid = set.status === 'unpaid';
                  const isSelected = selectedIds.includes(set.id);

                  return (
                    <tr key={set.id} className="hover:bg-[#F6F7FB] transition-colors">
                      <td className="p-3.5">
                        {isUnpaid ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(set.id)}
                            className="rounded border-[#E5E7EF] text-[#C9A227] focus:ring-0"
                          />
                        ) : (
                          <span className="text-[#1F9D66] font-bold">✓</span>
                        )}
                      </td>

                      <td className="p-3.5 font-bold text-[#1E2230]">{set.staffName}</td>

                      <td className="p-3.5 font-mono text-[#2856C7] font-semibold">
                        {set.orderNumber}
                      </td>

                      <td className="p-3.5 text-[#1E2230] font-medium">{set.designTitle}</td>

                      <td className="p-3.5 text-[#6B7280] font-mono">{set.completedDate}</td>

                      <td className="p-3.5 font-mono font-bold text-[#1E2230]">₹{set.payoutAmount.toLocaleString('en-IN')}</td>

                      <td className="p-3.5 text-right">
                        {isUnpaid ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#E8A93B]/10 text-[#E8A93B] font-bold text-[11px]">
                            Pending Payout
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-[#1F9D66]/10 text-[#1F9D66] font-bold text-[11px]">
                            Settled ({set.settledAt})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Client Payments Gateway Table */
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
          <div className="text-xs font-semibold text-[#1E2230] border-b border-[#E5E7EF] pb-3">
            Incoming Client Payments & Gateway Log (Razorpay / UPI)
          </div>

          <div className="space-y-2 text-xs font-mono">
            {[
              { id: 'PAY-8821', client: 'Priya Singhania', amount: '₹15,000', type: '50% Advance', ref: 'pay_3M00192', date: 'Today, 02:15 PM' },
              { id: 'PAY-8819', client: 'David Rothschild', amount: '₹20,000', type: 'Full Payment', ref: 'pay_3M00190', date: 'Yesterday' },
              { id: 'PAY-8815', client: 'Meera Kapoor', amount: '₹17,000', type: 'Full Payment', ref: 'pay_3M00184', date: 'Sep 06, 2026' },
            ].map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-[#2856C7]">{p.id} — {p.client}</div>
                  <div className="text-[10px] text-[#6B7280]">{p.type} • Txn: {p.ref}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#1F9D66]">{p.amount}</div>
                  <div className="text-[10px] text-[#6B7280]">{p.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
