import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Mail, Phone, ShoppingBag, X, Loader2, Calendar, RefreshCw, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

interface ClientOrderHistory {
  id: string;
  type: string;
  title: string;
  status: string;
  amount: number;
  original_amount?: number;
  original_currency?: string;
  date: string;
}

interface ClientCRMRecord {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  orders_count: number;
  total_spend: string;
  total_spend_raw: number;
  last_activity: string;
  created_at: string;
  history?: ClientOrderHistory[];
}

const USD_RATE = 86.85;

const toUSDNumber = (amt: number): number => {
  if (!amt || isNaN(amt)) return 0;
  return typeof amt === 'number' ? amt : parseFloat(String(amt)) || 0;
};

const formatSpendUSD = (c: ClientCRMRecord): string => {
  if (c.total_spend) return c.total_spend;
  if (typeof c.total_spend_raw === 'number') {
    return `$${c.total_spend_raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return '$0.00';
};

export const AdminClientsModule: React.FC = () => {
  const [clients, setClients] = useState<ClientCRMRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClientDrawer, setSelectedClientDrawer] = useState<ClientCRMRecord | null>(null);

  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [clearingClients, setClearingClients] = useState<boolean>(false);
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null);

  const handleClearAllClients = async () => {
    setClearingClients(true);
    try {
      await api.adminClearAllClients();
      setShowClearModal(false);
      await fetchClients();
    } catch (err: any) {
      alert(err?.message || 'Failed to clear clients.');
    } finally {
      setClearingClients(false);
    }
  };

  const handleDeleteClient = async (clientId: number, clientName: string) => {
    if (!window.confirm(`Are you sure you want to remove client "${clientName}"? This will delete their account and associated histories.`)) {
      return;
    }
    setDeletingClientId(clientId);
    try {
      await api.adminDeleteClient(clientId);
      await fetchClients();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete client.');
    } finally {
      setDeletingClientId(null);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminClients();
      setClients(data);
    } catch (err: any) {
      console.error('Failed to load client CRM base:', err);
      setError(err?.message || 'Failed to fetch clients from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8D7B7] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#17243B] tracking-tight">
            Client CRM & Order Histories
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage repeat luxury jeweller client accounts, total lifetime spend, and custom notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clients by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#E8D7B7] rounded-xl text-xs focus:outline-none focus:border-[#B88732] w-60 sm:w-64 transition-all"
            />
          </div>

          <button
            onClick={() => setShowClearModal(true)}
            disabled={loading || clearingClients}
            className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
            title="Wipe demo and test clients for a fresh public launch"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Fresh Start (Clear Demo Clients)</span>
          </button>

          <button
            onClick={fetchClients}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E8D7B7] text-[#6B7280] hover:text-[#17243B] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="Refresh Client List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-[#E8D7B7] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#17345C] animate-spin" />
            <p className="text-xs font-mono text-[#6B7280]">Loading live client records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs font-mono text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
              {error}
            </p>
            <button
              onClick={fetchClients}
              className="px-4 py-2 rounded-xl bg-[#17345C] text-white text-xs font-semibold hover:bg-[#17243B]"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] text-[#B88732] flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-base font-serif font-bold text-[#17243B]">
              {clients.length === 0 ? 'Fresh Launch Directory (0 Clients)' : 'No Matching Clients Found'}
            </p>
            <p className="text-xs text-[#6B7280] max-w-md mx-auto">
              {clients.length === 0
                ? 'Your client CRM is clean and ready for public launch. When clients register on your store or place custom jewelry requests, their profiles, order counts, and lifetime spend will automatically appear here.'
                : 'No client accounts match your search filter.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8D7B7] text-[11px] font-mono uppercase text-[#6B7280]">
                <th className="p-4 font-medium">Client Name & Email</th>
                <th className="p-4 font-medium">Country / Phone</th>
                <th className="p-4 font-medium">Total Orders</th>
                <th className="p-4 font-medium">Lifetime Spend</th>
                <th className="p-4 font-medium">Last Activity</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8D7B7] text-xs">
              {filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-[#17243B]">{c.name}</div>
                    <div className="text-[10px] text-[#6B7280] font-mono">{c.email}</div>
                  </td>
                  <td className="p-4 text-[#17243B]">
                    <div className="font-medium">{c.country}</div>
                    <div className="text-[10px] text-[#6B7280] font-mono">{c.phone}</div>
                  </td>
                  <td className="p-4 font-mono font-bold text-[#17345C]">
                    {c.orders_count} {c.orders_count === 1 ? 'order' : 'orders'}
                  </td>
                  <td className="p-4 font-mono font-bold text-[#1F9D66]">{formatSpendUSD(c)}</td>
                  <td className="p-4 text-[#6B7280] font-mono">{c.last_activity}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedClientDrawer(c)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#17345C] text-white text-xs font-semibold hover:bg-[#17243B] transition-colors shadow-sm cursor-pointer"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => handleDeleteClient(c.id, c.name)}
                        disabled={deletingClientId === c.id}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 cursor-pointer transition-colors shadow-2xs"
                        title="Remove / Delete Client Account"
                      >
                        {deletingClientId === c.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over Profile Drawer */}
      {selectedClientDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-250">
            <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#17243B]">Client Profile & History</h3>
                <p className="text-[11px] text-[#6B7280] font-mono">ID: #{selectedClientDrawer.id}</p>
              </div>
              <button
                onClick={() => setSelectedClientDrawer(null)}
                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#17243B] hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client Bio & Info */}
            <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E8D7B7] space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-sm text-[#17243B]">{selectedClientDrawer.name}</div>
                  <div className="text-[11px] text-[#6B7280] font-mono">@{selectedClientDrawer.username}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] font-semibold">
                  Registered Client
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#4B5563] pt-1 border-t border-[#E8D7B7]">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span className="truncate">{selectedClientDrawer.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>{selectedClientDrawer.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Joined: {selectedClientDrawer.created_at}</span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white p-3 rounded-lg border border-[#E8D7B7]">
                  <div className="text-[10px] uppercase font-mono text-[#6B7280]">Total Lifetime Spend</div>
                  <div className="font-mono font-bold text-base text-[#1F9D66]">
                    {formatSpendUSD(selectedClientDrawer)}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E8D7B7]">
                  <div className="text-[10px] uppercase font-mono text-[#6B7280]">Total Executed Orders</div>
                  <div className="font-mono font-bold text-base text-[#17345C]">
                    {selectedClientDrawer.orders_count}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders Timeline */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-sm text-[#17243B] flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#17345C]" />
                Recent Orders & Activity History
              </h4>

              {selectedClientDrawer.history && selectedClientDrawer.history.length > 0 ? (
                <div className="space-y-2">
                  {selectedClientDrawer.history.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-[#E8D7B7] hover:border-[#D4AF37]/50 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#17243B]">{item.title}</span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#1F9D66]">
                            ${toUSDNumber(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {item.original_currency && item.original_currency !== 'USD' && item.original_amount && (
                            <span className="block text-[10px] font-mono text-[#6B7280]">
                              ({item.original_currency === 'INR' ? '₹' : item.original_currency + ' '}{Number(item.original_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                        <span className="font-mono text-[10px] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8D7B7]">
                          {item.type}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[#17345C] bg-[#FFF9F0] border border-[#E8D7B7] px-2 py-0.5 rounded font-semibold">
                            {item.status}
                          </span>
                          <span className="font-mono text-[10px]">{item.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7280] italic bg-[#FAF8F5] p-4 rounded-xl text-center">
                  No previous order history recorded for this client yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fresh Start Confirmation Modal */}
      {showClearModal && (
        <div
          onClick={() => !clearingClients && setShowClearModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full border border-rose-200 shadow-2xl p-6 space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#17243B]">
                  Fresh Start: Clear All Clients
                </h3>
                <p className="text-xs text-[#5A6679]">
                  Pre-launch CRM & Directory Reset
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-950 space-y-2">
              <p className="font-semibold">
                Are you sure you want to clear all client CRM accounts?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-rose-800 text-[11px]">
                <li>Deletes test/demo client user accounts from the database.</li>
                <li>Cleans client order histories, spend metrics, and wallets.</li>
                <li className="font-bold text-rose-950">SuperAdmin and Staff profiles are strictly preserved.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={clearingClients}
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6679] hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearingClients}
                onClick={handleClearAllClients}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {clearingClients ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing Directory...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clear Demo Clients</span>
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
