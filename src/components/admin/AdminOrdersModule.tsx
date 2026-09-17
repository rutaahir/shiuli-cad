import React, { useState } from 'react';
import { SAMPLE_ORDERS } from '../../data/mockData';
import { Order, StaffMember } from '../../types';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  UserCheck,
  RotateCcw,
  X,
  FileText,
  DollarSign
} from 'lucide-react';

interface AdminOrdersModuleProps {
  staffList: StaffMember[];
}

export const AdminOrdersModule: React.FC<AdminOrdersModuleProps> = ({ staffList }) => {
  const [orders, setOrders] = useState<(Order & { assignedStaffName?: string; stage?: string })[]>([
    {
      ...SAMPLE_ORDERS[0],
      assignedStaffName: 'Rahim Sheikh',
      stage: 'With CAD Designer',
    },
    {
      ...SAMPLE_ORDERS[1],
      assignedStaffName: 'Karim Ansari',
      stage: 'With CAD Designer',
    },
    {
      id: 'ord-8940',
      orderNumber: 'SCS-2026-8940',
      date: 'Today, 10:15 AM',
      items: [
        {
          product: {
            id: 'p-custom-1',
            title: 'Nizam Kundan Choker Suite CAD',
            category: 'Necklace',
            subcategory: 'Bridal',
            price: 380,
            formats: ['3DM', 'STL', 'Render'],
            images: ['/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80'],
            primaryImage: '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
            description: 'Custom bridal choker CAD.',
            shortDescription: 'Bridal choker.',
            tags: ['Custom'],
            rating: 5.0,
            reviewsCount: 1,
            specs: {
              metalWeight18k: '45.0 gm',
              diamondCount: 120,
              diamondTotalWeight: '4.5 ct',
              dimensions: 'Custom',
              meshTriangles: '1.2M',
              tolerance: '0.01 mm',
            },
          },
          license: 'commercial',
          price: 380,
        },
      ],
      total: 380,
      status: 'in_design',
      statusLabel: 'With CAD Designer',
      downloadName: 'Pending_Delivery.zip',
      downloadSize: 'Pending',
      assignedStaffName: 'Rahim Sheikh',
      stage: 'With CAD Designer',
    },
  ]);

  const [selectedOrderDrawer, setSelectedOrderDrawer] = useState<any | null>(null);
  const [reassignModalOrder, setReassignModalOrder] = useState<any | null>(null);
  const [newAssignedStaffId, setNewAssignedStaffId] = useState<string>('');

  const handleReassignStaff = () => {
    if (!reassignModalOrder || !newAssignedStaffId) return;
    const staffObj = staffList.find((s) => s.id === newAssignedStaffId);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === reassignModalOrder.id
          ? { ...o, assignedStaffName: staffObj ? staffObj.name : 'Unassigned' }
          : o
      )
    );

    setReassignModalOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Master Orders Directory
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Track end-to-end status, progress steppers, and modeller assignments across ready and custom orders.
          </p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F6F7FB] border-b border-[#E5E7EF] text-[11px] font-mono uppercase text-[#6B7280]">
              <th className="p-4 font-medium">Order Number & Date</th>
              <th className="p-4 font-medium">Item Title</th>
              <th className="p-4 font-medium">Assigned Modeller</th>
              <th className="p-4 font-medium">Progress Stepper</th>
              <th className="p-4 font-medium">Total</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EF] text-xs">
            {orders.map((ord) => (
              <tr key={ord.id} className="hover:bg-[#F6F7FB] transition-colors">
                <td className="p-4 font-mono">
                  <div className="font-bold text-[#2856C7]">{ord.orderNumber}</div>
                  <div className="text-[10px] text-[#6B7280]">{ord.date}</div>
                </td>

                <td className="p-4 font-semibold text-[#1E2230]">
                  {ord.items[0]?.product?.title || 'Jewellery CAD Package'}
                </td>

                <td className="p-4">
                  <div className="flex items-center gap-1.5 font-medium text-[#1E2230]">
                    <UserCheck className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span>{ord.assignedStaffName || 'Unassigned'}</span>
                  </div>
                </td>

                {/* Stepper matching SOW: In Design -> With CAD Designer -> Completed */}
                <td className="p-4">
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-[#1F9D66]/10 text-[#1F9D66] font-bold">
                      In Design
                    </span>
                    <span className="text-[#6B7280]">➔</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        ord.status === 'completed'
                          ? 'bg-[#1F9D66]/10 text-[#1F9D66]'
                          : 'bg-[#C9A227]/20 text-[#0D1B4C]'
                      }`}
                    >
                      With CAD Designer
                    </span>
                    <span className="text-[#6B7280]">➔</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        ord.status === 'completed'
                          ? 'bg-[#1F9D66] text-white'
                          : 'bg-[#E5E7EF] text-[#6B7280]'
                      }`}
                    >
                      Completed
                    </span>
                  </div>
                </td>

                <td className="p-4 font-mono font-bold text-[#1E2230]">₹{ord.total.toLocaleString('en-IN')}</td>

                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => setSelectedOrderDrawer(ord)}
                    className="px-2.5 py-1 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] text-[#1E2230] hover:bg-[#E5E7EF] font-semibold"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setReassignModalOrder(ord)}
                    className="px-2.5 py-1 rounded-lg bg-[#0D1B4C] text-white hover:bg-[#12245E] font-semibold text-[11px]"
                  >
                    Reassign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Details Drawer */}
      {selectedOrderDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-250">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[#2856C7]">
                  {selectedOrderDrawer.orderNumber}
                </span>
                <h3 className="font-serif text-lg font-bold text-[#1E2230]">Order Master Record</h3>
              </div>
              <button
                onClick={() => setSelectedOrderDrawer(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1E2230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] space-y-2">
                <div className="font-semibold text-[#1E2230]">Assigned Modeller</div>
                <div className="font-mono text-sm text-[#0D1B4C] font-bold">
                  {selectedOrderDrawer.assignedStaffName || 'Unassigned'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-[#1E2230]">Purchased Items</div>
                {selectedOrderDrawer.items.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl border border-[#E5E7EF] flex justify-between">
                    <div>
                      <div className="font-bold text-[#1E2230]">{item.product.title}</div>
                      <div className="text-[10px] text-[#6B7280]">License: {item.license}</div>
                    </div>
                    <div className="font-mono font-bold text-[#1E2230]">₹{item.price.toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>Download File Pack:</span>
                  <span className="font-bold text-[#2856C7]">{selectedOrderDrawer.downloadName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Archive Size:</span>
                  <span>{selectedOrderDrawer.downloadSize}</span>
                </div>
              </div>

              {/* Client Portfolio Consent & Feature Action */}
              <div className="pt-3 border-t border-[#E5E7EF] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1E2230]">Client Portfolio Consent:</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    selectedOrderDrawer.client_consent_to_feature ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedOrderDrawer.client_consent_to_feature ? 'Opt-In Consent Granted' : 'No Consent'}
                  </span>
                </div>

                <button
                  disabled={!selectedOrderDrawer.client_consent_to_feature}
                  onClick={() => {
                    alert(`Order ${selectedOrderDrawer.orderNumber} promoted to public portfolio showcase!`);
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    selectedOrderDrawer.client_consent_to_feature
                      ? 'bg-[#0D1B4C] hover:bg-[#12245E] text-[#F5E7A3] shadow-md cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  <span>Feature in Portfolio</span>
                </button>
                {!selectedOrderDrawer.client_consent_to_feature && (
                  <p className="text-[10px] text-[#6B7280] italic text-center">
                    Cannot feature in public portfolio: Client opt-in consent is required.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Staff Modal */}
      {reassignModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E7EF] p-6 max-w-md w-full space-y-4 text-xs">
            <h3 className="font-serif text-base font-bold text-[#1E2230]">
              Reassign Modeller for Order {reassignModalOrder.orderNumber}
            </h3>
            <p className="text-[#6B7280]">
              Currently assigned to: <strong>{reassignModalOrder.assignedStaffName}</strong>
            </p>

            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Select New Modeller</label>
              <select
                value={newAssignedStaffId}
                onChange={(e) => setNewAssignedStaffId(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] focus:outline-none"
              >
                <option value="">-- Choose Staff Member --</option>
                {staffList
                  .filter((s) => s.status === 'active')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.currentLoad}/{s.maxJobLimit} slots)
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReassignModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E7EF] text-[#1E2230]"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignStaff}
                className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
