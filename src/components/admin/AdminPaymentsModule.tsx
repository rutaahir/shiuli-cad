import React, { useState, useEffect } from 'react';
import { SettlementRecord } from '../../types';
import { api } from '../../services/api';
import {
  CreditCard,
  IndianRupee,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ArrowDownLeft
} from 'lucide-react';

interface GatewayLogRecord {
  id: string;
  client: string;
  amount: string;
  amount_raw: number;
  type: string;
  ref: string;
  status: string;
  date: string;
  created_at_iso?: string;
}

export const AdminPaymentsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settlements' | 'client-payments'>('settlements');
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState<boolean>(true);
  const [clientPayments, setClientPayments] = useState<GatewayLogRecord[]>([]);
  const [loadingGatewayLogs, setLoadingGatewayLogs] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSettlements = async () => {
    setLoadingSettlements(true);
    setError(null);
    try {
      await api.ensureAdminToken();
      const res = await api.request<any>('/settlements/');
      const ensureArray = (r: any) => {
        if (Array.isArray(r)) return r;
        if (r && Array.isArray(r.results)) return r.results;
        return [];
      };
      const list = ensureArray(res);
      const mapped: SettlementRecord[] = list.map((st: any) => ({
        id: `SET-${st.id}`,
        staffName: st.staff_name || (st.staff ? `${st.staff.first_name} ${st.staff.last_name}`.trim() || st.staff.username : 'CAD Designer'),
        staffRole: 'Senior CAD Specialist',
        orderNumber: st.order_number || (st.order ? `ORD-${st.order}` : `ORD-${st.id}`),
        designTitle: st.design_title || 'Bespoke Custom CAD Design',
        payoutAmount: parseFloat(st.amount || '0'),
        completedDate: st.created_at || 'Recent',
        completedAt: st.created_at || 'Recent',
        status: st.status === 'processed' ? 'settled' : 'unpaid',
        settledAt: st.processed_at ? new Date(st.processed_at).toLocaleDateString() : undefined,
        transactionRef: st.transaction_ref || undefined,
      }));
      setSettlements(mapped);
    } catch (e: any) {
      console.warn('Failed to fetch settlements from API:', e);
      setError(e?.message || 'Failed to fetch settlements.');
    } finally {
      setLoadingSettlements(false);
    }
  };

  const fetchGatewayLogs = async () => {
    setLoadingGatewayLogs(true);
    try {
      const logs = await api.getGatewayLogs();
      setClientPayments(logs);
    } catch (err: any) {
      console.warn('Failed to fetch incoming gateway logs:', err);
    } finally {
      setLoadingGatewayLogs(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
    fetchGatewayLogs();
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
              onClick={() => {
                setActiveTab('client-payments');
                fetchGatewayLogs();
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'client-payments' ? 'bg-[#0D1B4C] text-white' : 'text-[#6B7280]'
              }`}
            >
              Client Incoming Gateway ({clientPayments.length})
            </button>
          </div>

          <button
            onClick={fetchSettlements}
            disabled={loadingSettlements}
            className="p-2 rounded-xl border border-[#E5E7EF] text-[#6B7280] hover:text-[#1E2230] hover:bg-[#F6F7FB] transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSettlements || loadingGatewayLogs ? 'animate-spin' : ''}`} />
          </button>

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
            <div className="text-xs font-semibold text-[#1E2230] flex items-center gap-2">
              Completed CAD Jobs Awaiting Modeller Payout
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#E8EEFF] text-[#2856C7] font-semibold">
                {unpaidItems.length} Pending
              </span>
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

          {loadingSettlements ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2856C7] animate-spin" />
              <p className="text-xs font-mono text-[#6B7280]">Loading live staff settlements...</p>
            </div>
          ) : settlements.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-[#9CA3AF] mx-auto" />
              <p className="text-sm font-semibold text-[#1E2230]">No Settlements Logged</p>
              <p className="text-xs text-[#6B7280]">
                Completed CAD jobs will automatically generate staff payout records here.
              </p>
            </div>
          ) : (
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

                        <td className="p-3.5 text-[#6B7280] font-mono">{set.completedDate || set.completedAt || 'Recent'}</td>

                        <td className="p-3.5 font-mono font-bold text-[#1E2230]">₹{set.payoutAmount.toLocaleString('en-IN')}</td>

                        <td className="p-3.5 text-right">
                          {isUnpaid ? (
                            <span className="px-2.5 py-1 rounded-full bg-[#E8A93B]/10 text-[#E8A93B] font-bold text-[11px]">
                              Pending Payout
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-[#1F9D66]/10 text-[#1F9D66] font-bold text-[11px]">
                              Settled {set.settledAt ? `(${set.settledAt})` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Client Payments Gateway Table */
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
            <div className="text-xs font-semibold text-[#1E2230] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#2856C7]" />
              Incoming Client Payments & Gateway Log (Razorpay / Stripe / UPI)
            </div>
            <span className="text-xs font-mono text-[#6B7280]">
              {clientPayments.length} Transactions Logged
            </span>
          </div>

          {loadingGatewayLogs ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2856C7] animate-spin" />
              <p className="text-xs font-mono text-[#6B7280]">Auditing live incoming transactions...</p>
            </div>
          ) : clientPayments.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ArrowDownLeft className="w-10 h-10 text-[#9CA3AF] mx-auto" />
              <p className="text-sm font-semibold text-[#1E2230]">No Incoming Payments Found</p>
              <p className="text-xs text-[#6B7280]">
                Client deposit payments and store purchases will record live gateway transaction logs here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs font-mono">
              {clientPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] hover:border-[#2856C7]/30 transition-colors flex justify-between items-center"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#1E2230] flex items-center gap-2">
                      <span className="text-[#2856C7]">{p.id}</span>
                      <span>—</span>
                      <span>{p.client}</span>
                    </div>
                    <div className="text-[10px] text-[#6B7280] flex items-center gap-2">
                      <span className="bg-[#E8EEFF] text-[#2856C7] px-1.5 py-0.5 rounded font-semibold">
                        {p.type}
                      </span>
                      <span>Txn Ref: {p.ref}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <div className="font-bold text-[#1F9D66] text-sm">{p.amount}</div>
                    <div className="text-[10px] text-[#6B7280]">{p.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
