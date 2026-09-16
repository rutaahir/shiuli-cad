import React, { useState } from 'react';
import { UserCheck, Search, Mail, Phone, ShoppingBag, X } from 'lucide-react';

export const AdminClientsModule: React.FC = () => {
  const [selectedClientDrawer, setSelectedClientDrawer] = useState<any | null>(null);

  const clients = [
    {
      id: 'c-101',
      name: 'Priya Singhania',
      email: 'priya.singhania@mumbai.com',
      phone: '+91 98200 11223',
      ordersCount: 8,
      totalSpend: '$3,450',
      lastOrderDate: 'Today',
      country: 'India (Mumbai)',
    },
    {
      id: 'c-102',
      name: 'David Rothschild',
      email: 'david@rothschildjewels.co.uk',
      phone: '+44 7700 900077',
      ordersCount: 4,
      totalSpend: '$1,890',
      lastOrderDate: 'Yesterday',
      country: 'United Kingdom (London)',
    },
    {
      id: 'c-103',
      name: 'Meera Kapoor',
      email: 'meera.k@delhicouture.in',
      phone: '+91 99100 44556',
      ordersCount: 12,
      totalSpend: '$5,800',
      lastOrderDate: 'Sep 06, 2026',
      country: 'India (New Delhi)',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Client CRM & Order Histories
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage repeat luxury jeweller client accounts, total lifetime spend, and custom notes.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F6F7FB] border-b border-[#E5E7EF] text-[11px] font-mono uppercase text-[#6B7280]">
              <th className="p-4 font-medium">Client Name & Email</th>
              <th className="p-4 font-medium">Country</th>
              <th className="p-4 font-medium">Total Orders</th>
              <th className="p-4 font-medium">Lifetime Spend</th>
              <th className="p-4 font-medium">Last Activity</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EF] text-xs">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-[#F6F7FB] transition-colors">
                <td className="p-4">
                  <div className="font-semibold text-[#1E2230]">{c.name}</div>
                  <div className="text-[10px] text-[#6B7280] font-mono">{c.email}</div>
                </td>
                <td className="p-4 text-[#1E2230] font-medium">{c.country}</td>
                <td className="p-4 font-mono font-bold text-[#2856C7]">{c.ordersCount} orders</td>
                <td className="p-4 font-mono font-bold text-[#1F9D66]">{c.totalSpend}</td>
                <td className="p-4 text-[#6B7280] font-mono">{c.lastOrderDate}</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setSelectedClientDrawer(c)}
                    className="px-3 py-1.5 rounded-lg bg-[#0D1B4C] text-white text-xs font-semibold"
                  >
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedClientDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-250">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
              <h3 className="font-serif text-lg font-bold text-[#1E2230]">Client Profile</h3>
              <button
                onClick={() => setSelectedClientDrawer(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1E2230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="font-bold text-base text-[#1E2230]">{selectedClientDrawer.name}</div>
              <div className="text-[#6B7280]">{selectedClientDrawer.email}</div>
              <div className="text-[#6B7280]">{selectedClientDrawer.phone}</div>

              <div className="p-4 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] space-y-1 font-mono">
                <div>Total Lifetime Spend: {selectedClientDrawer.totalSpend}</div>
                <div>Total Orders Executed: {selectedClientDrawer.ordersCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
