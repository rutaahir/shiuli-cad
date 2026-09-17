import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Mail, Phone, ShoppingBag, X, Loader2, Calendar, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface ClientOrderHistory {
  id: string;
  type: string;
  title: string;
  status: string;
  amount: number;
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

export const AdminClientsModule: React.FC = () => {
  const [clients, setClients] = useState<ClientCRMRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClientDrawer, setSelectedClientDrawer] = useState<ClientCRMRecord | null>(null);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Client CRM & Order Histories
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage repeat luxury jeweller client accounts, total lifetime spend, and custom notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clients by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#F6F7FB] border border-[#E5E7EF] rounded-xl text-xs focus:outline-none focus:border-[#2856C7] w-64 transition-all"
            />
          </div>

          <button
            onClick={fetchClients}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E5E7EF] text-[#6B7280] hover:text-[#1E2230] hover:bg-[#F6F7FB] transition-colors"
            title="Refresh Client List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#2856C7] animate-spin" />
            <p className="text-xs font-mono text-[#6B7280]">Loading live client records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs font-mono text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
              {error}
            </p>
            <button
              onClick={fetchClients}
              className="px-4 py-2 rounded-xl bg-[#0D1B4C] text-white text-xs font-semibold hover:bg-[#1E2230]"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <UserCheck className="w-10 h-10 text-[#9CA3AF] mx-auto" />
            <p className="text-sm font-semibold text-[#1E2230]">No Clients Found</p>
            <p className="text-xs text-[#6B7280]">
              {searchTerm ? 'No client accounts match your search filter.' : 'No registered clients found in system.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F7FB] border-b border-[#E5E7EF] text-[11px] font-mono uppercase text-[#6B7280]">
                <th className="p-4 font-medium">Client Name & Email</th>
                <th className="p-4 font-medium">Country / Phone</th>
                <th className="p-4 font-medium">Total Orders</th>
                <th className="p-4 font-medium">Lifetime Spend</th>
                <th className="p-4 font-medium">Last Activity</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EF] text-xs">
              {filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-[#F6F7FB] transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-[#1E2230]">{c.name}</div>
                    <div className="text-[10px] text-[#6B7280] font-mono">{c.email}</div>
                  </td>
                  <td className="p-4 text-[#1E2230]">
                    <div className="font-medium">{c.country}</div>
                    <div className="text-[10px] text-[#6B7280] font-mono">{c.phone}</div>
                  </td>
                  <td className="p-4 font-mono font-bold text-[#2856C7]">
                    {c.orders_count} {c.orders_count === 1 ? 'order' : 'orders'}
                  </td>
                  <td className="p-4 font-mono font-bold text-[#1F9D66]">{c.total_spend}</td>
                  <td className="p-4 text-[#6B7280] font-mono">{c.last_activity}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedClientDrawer(c)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0D1B4C] text-white text-xs font-semibold hover:bg-[#1E2230] transition-colors shadow-sm"
                    >
                      View Profile
                    </button>
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
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1E2230]">Client Profile & History</h3>
                <p className="text-[11px] text-[#6B7280] font-mono">ID: #{selectedClientDrawer.id}</p>
              </div>
              <button
                onClick={() => setSelectedClientDrawer(null)}
                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1E2230] hover:bg-[#F6F7FB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client Bio & Info */}
            <div className="bg-[#F6F7FB] p-4 rounded-xl border border-[#E5E7EF] space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-sm text-[#1E2230]">{selectedClientDrawer.name}</div>
                  <div className="text-[11px] text-[#6B7280] font-mono">@{selectedClientDrawer.username}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#E8EEFF] text-[#2856C7] font-semibold">
                  Registered Client
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#4B5563] pt-1 border-t border-[#E5E7EF]">
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
                <div className="bg-white p-3 rounded-lg border border-[#E5E7EF]">
                  <div className="text-[10px] uppercase font-mono text-[#6B7280]">Total Lifetime Spend</div>
                  <div className="font-mono font-bold text-base text-[#1F9D66]">
                    {selectedClientDrawer.total_spend}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E5E7EF]">
                  <div className="text-[10px] uppercase font-mono text-[#6B7280]">Total Executed Orders</div>
                  <div className="font-mono font-bold text-base text-[#2856C7]">
                    {selectedClientDrawer.orders_count}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders Timeline */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-sm text-[#1E2230] flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#2856C7]" />
                Recent Orders & Activity History
              </h4>

              {selectedClientDrawer.history && selectedClientDrawer.history.length > 0 ? (
                <div className="space-y-2">
                  {selectedClientDrawer.history.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-[#E5E7EF] hover:border-[#2856C7]/30 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1E2230]">{item.title}</span>
                        <span className="font-mono font-bold text-[#1F9D66]">
                          ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                        <span className="font-mono text-[10px] bg-[#F6F7FB] px-2 py-0.5 rounded border border-[#E5E7EF]">
                          {item.type}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[#2856C7] bg-[#E8EEFF] px-2 py-0.5 rounded font-semibold">
                            {item.status}
                          </span>
                          <span className="font-mono text-[10px]">{item.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7280] italic bg-[#F6F7FB] p-4 rounded-xl text-center">
                  No previous order history recorded for this client yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
