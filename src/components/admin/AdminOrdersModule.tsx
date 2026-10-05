import React, { useState, useEffect } from 'react';
import { StaffMember } from '../../types';
import { api } from '../../services/api';
import { appStore } from '../../services/store';
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
  DollarSign,
  Download,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Gem,
  Layers,
  ArrowRight,
  Check,
  RefreshCw,
  Phone,
  PhoneCall,
  Save,
  Lock,
  StickyNote,
  Plus,
  Edit2,
  Trash2,
  XCircle,
  Send
} from 'lucide-react';
import { AdminCreateOrderModal, AdminEditOrderModal } from './AdminOrderModals';

interface AdminOrdersModuleProps {
  staffList: StaffMember[];
}

const formatUSD = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '$0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '$0';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const AdminOrdersModule: React.FC<AdminOrdersModuleProps> = ({ staffList }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrderDrawer, setSelectedOrderDrawer] = useState<any | null>(null);
  const [reassignModalOrder, setReassignModalOrder] = useState<any | null>(null);
  const [newAssignedStaffId, setNewAssignedStaffId] = useState<string>('');
  
  // Create & Edit order modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  // Rejection modal state
  const [rejectingOrderId, setRejectingOrderId] = useState<number | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [togglingDownloadId, setTogglingDownloadId] = useState<number | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [downloadingDelId, setDownloadingDelId] = useState<number | null>(null);

  // Commission editing state
  const [drawerCommissionPct, setDrawerCommissionPct] = useState<number>(20);
  const [isSavingCommission, setIsSavingCommission] = useState<boolean>(false);
  const [isReleasingToPool, setIsReleasingToPool] = useState<boolean>(false);

  // Admin Call & Consultation Notes State
  const [drawerAdminNotes, setDrawerAdminNotes] = useState<string>('');
  const [isSavingDrawerNotes, setIsSavingDrawerNotes] = useState<boolean>(false);
  const [drawerNotesSaveStatus, setDrawerNotesSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (selectedOrderDrawer) {
      const notes = selectedOrderDrawer.admin_call_notes || selectedOrderDrawer.custom_request?.admin_call_notes || '';
      setDrawerAdminNotes(notes);
      setDrawerNotesSaveStatus(null);
    }
  }, [selectedOrderDrawer?.id]);

  const handleSaveDrawerAdminNotes = async () => {
    if (!selectedOrderDrawer) return;
    setIsSavingDrawerNotes(true);
    setDrawerNotesSaveStatus(null);
    try {
      if (selectedOrderDrawer.custom_request?.id) {
        try {
          await api.updateCustomRequestAdminNotes(selectedOrderDrawer.custom_request.id, drawerAdminNotes);
        } catch {}
      }
      try {
        await api.updateOrderAdminNotes(selectedOrderDrawer.id, drawerAdminNotes);
      } catch {}

      if (selectedOrderDrawer.custom_request?.id) {
        appStore.updateCustomRequestNotes(selectedOrderDrawer.custom_request.id, drawerAdminNotes);
      }

      setSelectedOrderDrawer((prev: any) => prev ? {
        ...prev,
        admin_call_notes: drawerAdminNotes,
        custom_request: prev.custom_request ? { ...prev.custom_request, admin_call_notes: drawerAdminNotes } : prev.custom_request
      } : prev);

      setDrawerNotesSaveStatus('Saved');
      setTimeout(() => setDrawerNotesSaveStatus(null), 3500);
    } catch (err) {
      console.error(err);
      setDrawerNotesSaveStatus('Failed');
    } finally {
      setIsSavingDrawerNotes(false);
    }
  };

  const handleDownloadDeliverable = async (del: any, orderId: number) => {
    if (!del?.id || !orderId) return;
    setDownloadingDelId(del.id);
    try {
      const token = localStorage.getItem('shiuli_access_token');
      const downloadUrl = `/api/orders/${orderId}/deliverables/${del.id}/download/${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Download failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = del.filename || `${del.file_type}_deliverable`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert(err?.message || 'Failed to download deliverable file.');
    } finally {
      setDownloadingDelId(null);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.request<any>('/orders/');
      const ensureArray = (r: any) => {
        if (Array.isArray(r)) return r;
        if (r && Array.isArray(r.results)) return r.results;
        if (r && Array.isArray(r.data)) return r.data;
        return [];
      };
      const fetched = ensureArray(res);
      setOrders(fetched);
      if (selectedOrderDrawer) {
        const refreshedSelected = fetched.find((o: any) => o.id === selectedOrderDrawer.id);
        if (refreshedSelected) setSelectedOrderDrawer(refreshedSelected);
      }
    } catch (err) {
      console.warn('Failed to fetch admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrderDrawer) {
      setDrawerCommissionPct(Number(selectedOrderDrawer.admin_commission_percentage ?? 20));
    }
  }, [selectedOrderDrawer?.id]);

  const handleSaveCommission = async () => {
    if (!selectedOrderDrawer) return;
    setIsSavingCommission(true);
    try {
      const res = await api.request<any>(`/orders/${selectedOrderDrawer.id}/set-commission/`, {
        method: 'POST',
        body: JSON.stringify({ admin_commission_percentage: drawerCommissionPct }),
      });
      if (res) {
        setSelectedOrderDrawer(res);
        setOrders(prev => prev.map(o => o.id === res.id ? res : o));
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update commission');
    } finally {
      setIsSavingCommission(false);
    }
  };

  const handleReleaseToPool = async (orderId: number) => {
    setIsReleasingToPool(true);
    try {
      const res = await api.request<any>(`/orders/${orderId}/approve-to-pool/`, {
        method: 'POST',
        body: JSON.stringify({ admin_commission_percentage: drawerCommissionPct }),
      });
      if (res?.order) {
        setSelectedOrderDrawer(res.order);
        setOrders(prev => prev.map(o => o.id === res.order.id ? res.order : o));
      } else {
        await fetchOrders();
      }
      alert(`Order #${orderId} approved & updated in Staff Pool with ${drawerCommissionPct}% commission!`);
    } catch (err: any) {
      alert(err?.message || 'Failed to release order to pool');
    } finally {
      setIsReleasingToPool(false);
    }
  };

  // Admin QC Approve
  const handleApproveOrder = async (orderId: number) => {
    setIsSubmittingReview(true);
    try {
      await api.request(`/orders/${orderId}/admin-review/`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'approve',
          notes: 'CAD model meets all studio quality specifications. Released for client 3D preview review.',
        }),
      });
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve order.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Admin QC Reject with Notes
  const handleConfirmRejectOrder = async () => {
    if (!rejectingOrderId || !rejectionNotes.trim()) {
      alert('Please enter revision instructions explaining what the modeller must correct.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await api.request(`/orders/${rejectingOrderId}/admin-review/`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'reject',
          notes: rejectionNotes.trim(),
        }),
      });
      setRejectingOrderId(null);
      setRejectionNotes('');
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject order.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Toggle Customer CAD Download Authorization
  const handleToggleDownload = async (orderId: number) => {
    setTogglingDownloadId(orderId);
    try {
      const res = await api.request<any>(`/orders/${orderId}/toggle-download-permission/`, {
        method: 'POST',
      });
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle download authorization.');
    } finally {
      setTogglingDownloadId(null);
    }
  };

  // Reassign staff
  const handleReassignStaff = async () => {
    if (!reassignModalOrder || !newAssignedStaffId) return;
    try {
      await api.request(`/orders/${reassignModalOrder.id}/reassign/`, {
        method: 'POST',
        body: JSON.stringify({ staff_id: newAssignedStaffId }),
      });
      setReassignModalOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to reassign modeller.');
    }
  };

  // Admin Cancel Order
  const handleCancelOrder = async (order: any) => {
    const reason = window.prompt(
      `Are you sure you want to cancel Order #ORD-${order.id}?\n\nEnter cancellation reason:`,
      'Client requested cancellation / Spec adjustment'
    );
    if (reason === null) return;
    try {
      await api.cancelOrder(order.id, reason);
      alert(`Order #ORD-${order.id} has been cancelled.`);
      await fetchOrders();
      if (selectedOrderDrawer?.id === order.id) {
        setSelectedOrderDrawer((prev: any) => (prev ? { ...prev, status: 'cancelled' } : null));
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel order.');
    }
  };

  // Admin Delete Order Permanently
  const handleDeleteOrderPermanently = async (order: any) => {
    const confirmed = window.confirm(
      `⚠️ PERMANENT DELETION WARNING:\n\nAre you sure you want to permanently delete Order #ORD-${order.id}?\n\nThis will remove all files, deliverables, milestones, and payment records from the database permanently.\n\nThis action CANNOT be undone.`
    );
    if (!confirmed) return;
    try {
      await api.deleteOrder(order.id);
      alert(`Order #ORD-${order.id} has been permanently deleted.`);
      if (selectedOrderDrawer?.id === order.id) {
        setSelectedOrderDrawer(null);
      }
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete order.');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'pending_review') return o.status === 'pending_review';
    if (statusFilter === 'in_design') return o.status === 'in_design';
    if (statusFilter === 'preview_ready') return o.status === 'preview_ready';
    if (statusFilter === 'completed') return o.status === 'completed';
    if (statusFilter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#12204D] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-wider">
              SuperAdmin HQ
            </span>
            <span className="text-xs text-[#6B7280] font-mono">• Production &amp; Delivery Management</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight mt-1">
            Master Orders &amp; Quality Control Directory
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Monitor active commissions, inspect designer CAD uploads, authorize quality releases, and place or edit customer orders.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Place Order for Customer</span>
          </button>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs font-semibold text-[#1E2230] hover:bg-[#E5E7EF] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Orders</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { key: 'all', label: `All Orders (${orders.length})` },
          { key: 'pending_review', label: `Pending QC Review (${orders.filter(o => o.status === 'pending_review').length})` },
          { key: 'in_design', label: `In Design (${orders.filter(o => o.status === 'in_design').length})` },
          { key: 'preview_ready', label: `Preview Ready (${orders.filter(o => o.status === 'preview_ready').length})` },
          { key: 'completed', label: `Completed (${orders.filter(o => o.status === 'completed').length})` },
          { key: 'cancelled', label: `Cancelled (${orders.filter(o => o.status === 'cancelled').length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              statusFilter === t.key
                ? 'bg-[#09112B] text-[#F5E7A3] font-bold shadow-md'
                : 'bg-white border border-[#E5E7EF] text-[#6B7280] hover:bg-[#F6F7FB]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-sm overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
            <span className="text-xs font-mono text-[#6B7280]">Loading live orders from database...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#6B7280]">
            No orders match the selected filter.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F7FB] border-b border-[#E5E7EF] text-[11px] font-mono uppercase text-[#6B7280]">
                <th className="p-4 font-medium">Order &amp; Client</th>
                <th className="p-4 font-medium">Design Brief</th>
                <th className="p-4 font-medium">Assigned Modeller</th>
                <th className="p-4 font-medium">Progress / QC Status</th>
                <th className="p-4 font-medium">Price &amp; Commission</th>
                <th className="p-4 font-medium">Download Toggle</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EF] text-xs">
              {filteredOrders.map((ord) => {
                const req = ord.custom_request;
                const assignedStaff = ord.assigned_staff;
                const isFullyPaid = ord.is_fully_paid;

                return (
                  <tr key={ord.id} className="hover:bg-[#F6F7FB] transition-colors">
                    {/* Order & Client */}
                    <td className="p-4 font-mono">
                      <div className="font-bold text-[#2856C7]">ORD-{ord.id}</div>
                      <div className="text-[11px] text-[#1E2230] font-sans font-semibold">
                        {ord.client?.username || req?.client_name || 'Client'}
                      </div>
                      <div className="text-[10px] text-[#6B7280]">
                        {new Date(ord.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Design Brief */}
                    <td className="p-4">
                      <div className="font-semibold text-[#1E2230]">
                        {req?.category_name ? `Bespoke ${req.category_name}` : 'Custom Jewellery CAD'}
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        {req?.metal_alloy_name || '18K Gold'} &bull; {req?.aesthetic_style_name || 'Bespoke'}
                      </div>
                    </td>

                    {/* Assigned Modeller */}
                    <td className="p-4">
                      {assignedStaff ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#12204D] border border-[#D4AF37]/50 flex items-center justify-center text-[#F5E7A3] text-xs font-bold shrink-0">
                            {assignedStaff.first_name?.[0] || assignedStaff.username?.[0] || 'M'}
                          </div>
                          <div>
                            <div className="font-semibold text-[#1E2230]">
                              {assignedStaff.first_name ? `${assignedStaff.first_name} ${assignedStaff.last_name || ''}`.trim() : assignedStaff.username}
                            </div>
                            <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                              Assigned Craftsman
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold">
                          Unassigned / Open Pool
                        </span>
                      )}
                    </td>

                    {/* Progress / QC Status */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          ord.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : ord.status === 'pending_review'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                            : ord.status === 'preview_ready'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {ord.status === 'pending_review' ? '⚠️ Pending QC Review' : ord.status.replace('_', ' ')}
                        </span>
                        
                        {ord.status === 'pending_review' && (
                          <div className="flex items-center gap-1 pt-1">
                            <button
                              onClick={() => handleApproveOrder(ord.id)}
                              disabled={isSubmittingReview}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-0.5 shadow-sm"
                            >
                              <Check className="w-3 h-3" /> Approve QC
                            </button>
                            <button
                              onClick={() => setRejectingOrderId(ord.id)}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Price & Admin Commission & Staff Payout */}
                    <td className="p-4 font-mono">
                      <div className="font-bold text-[#1E2230] text-sm">
                        {formatUSD(ord.total_price || req?.agreed_price)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                          Admin: {ord.admin_commission_percentage ?? 20}%
                        </span>
                        <span className="text-emerald-700 font-bold">
                          Staff: {formatUSD(ord.staff_payout_price || (Number(ord.total_price || req?.agreed_price || 0) * 0.8))}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {isFullyPaid ? (
                          <span className="text-emerald-700 font-bold">100% Paid</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">Milestones Active</span>
                        )}
                      </div>
                    </td>

                    {/* Download Toggle Switch */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleDownload(ord.id)}
                          disabled={togglingDownloadId === ord.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all shadow-sm ${
                            ord.download_enabled_by_admin
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {ord.download_enabled_by_admin ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-white" />
                              <span>ENABLED</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              <span>DISABLED</span>
                            </>
                          )}
                        </button>
                      </div>
                      <span className="text-[9px] text-[#6B7280] block mt-0.5">
                        {ord.download_count ? `${ord.download_count} download(s)` : 'Not downloaded yet'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => setSelectedOrderDrawer(ord)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] text-[#1E2230] hover:bg-[#E5E7EF] font-semibold text-xs transition-colors cursor-pointer"
                          title="Inspect Full Brief"
                        >
                          Inspect
                        </button>

                        <button
                          onClick={() => setEditingOrder(ord)}
                          className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Edit Order Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {ord.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelOrder(ord)}
                            className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                            title="Cancel Order"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteOrderPermanently(ord)}
                          className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Permanently Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ORDER DETAILS DRAWER */}
      {selectedOrderDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl p-6 sm:p-8 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-250">
            
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[#2856C7]">
                  ORDER #{selectedOrderDrawer.id} &bull; REQ #{selectedOrderDrawer.custom_request?.id}
                </span>
                <h3 className="font-serif text-xl font-bold text-[#1E2230]">
                  Master CAD Order &amp; Quality Record
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setEditingOrder(selectedOrderDrawer)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Edit Order Details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                {selectedOrderDrawer.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrderDrawer)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Cancel Order"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                )}
                <button
                  onClick={() => handleDeleteOrderPermanently(selectedOrderDrawer)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Permanently Delete Order"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setSelectedOrderDrawer(null)}
                  className="p-1.5 rounded-xl text-[#6B7280] hover:text-[#1E2230] hover:bg-[#F6F7FB]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quality Review Banner if pending review */}
            {selectedOrderDrawer.status === 'pending_review' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>QC ACTION REQUIRED: Designer has submitted deliverables for review.</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveOrder(selectedOrderDrawer.id)}
                    disabled={isSubmittingReview}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve &amp; Unlock Client 3D Preview</span>
                  </button>
                  <button
                    onClick={() => setRejectingOrderId(selectedOrderDrawer.id)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
                  >
                    Reject with Revision Notes
                  </button>
                </div>
              </div>
            )}

            {/* Admin Commission & Staff Pool Payout Control */}
            <div className="p-4 rounded-2xl bg-[#09112B] text-white border border-[#D4AF37]/40 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-[#F5E7A3] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Admin Commission &amp; Staff Pool Payout
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Pool Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Client Total Price */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Client Order Price</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {formatUSD(selectedOrderDrawer.total_price)}
                  </span>
                </div>

                {/* Admin Commission Input */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-mono text-[#F5E7A3] uppercase block font-semibold">Admin Commission %</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={drawerCommissionPct}
                      onChange={(e) => setDrawerCommissionPct(Number(e.target.value))}
                      className="w-16 px-2 py-1 rounded-lg bg-black/40 border border-[#D4AF37]/50 text-xs font-mono font-bold text-[#F5E7A3] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <span className="text-xs font-mono text-slate-300 font-bold">%</span>
                    <button
                      onClick={handleSaveCommission}
                      disabled={isSavingCommission}
                      className="ml-auto px-2.5 py-1 rounded-lg bg-[#D4AF37] hover:bg-[#F5E7A3] text-[#09112B] text-[11px] font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                      {isSavingCommission ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-1 block">
                    Fee: -{formatUSD((Number(selectedOrderDrawer.total_price || 0) * (drawerCommissionPct || 0)) / 100)}
                  </span>
                </div>

                {/* Staff Payout Price */}
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase block font-semibold">Staff Pool Payout</span>
                  <span className="text-sm font-mono font-bold text-emerald-300">
                    {formatUSD((Number(selectedOrderDrawer.total_price || 0) * (100 - (drawerCommissionPct || 0))) / 100)}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-500/80 mt-1 block">
                    Shown to staff in pool
                  </span>
                </div>
              </div>

              {/* Release to Pool Action if unassigned or in_design */}
              {!selectedOrderDrawer.assigned_staff && (
                <div className="pt-2 flex items-center justify-between border-t border-white/10">
                  <span className="text-[11px] text-slate-300 font-mono">
                    Status: <strong className="text-amber-400 font-semibold">Open Pool Broadcast</strong>
                  </span>
                  <button
                    onClick={() => handleReleaseToPool(selectedOrderDrawer.id)}
                    disabled={isReleasingToPool}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isReleasingToPool ? 'Releasing...' : 'Approve & Refresh in Staff Pool'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Download Toggle Banner */}
            <div className="p-4 rounded-2xl bg-[#F6F7FB] border border-[#E5E7EF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#C9A227]" />
                  <span className="font-bold text-[#1E2230] text-xs">Customer CAD Download Authorization</span>
                </div>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  When enabled, client can click "Download CAD Package" and verify via registered email OTP. Button will self-disable after OTP verification.
                </p>
                <div className="text-[10px] font-mono mt-1">
                  Payment Status: {selectedOrderDrawer.is_fully_paid ? (
                    <strong className="text-emerald-700">100% FULLY PAID</strong>
                  ) : (
                    <strong className="text-amber-700">PARTIAL PAYMENT (Stages Active)</strong>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleToggleDownload(selectedOrderDrawer.id)}
                disabled={togglingDownloadId === selectedOrderDrawer.id}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow shrink-0 ${
                  selectedOrderDrawer.download_enabled_by_admin
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-[#09112B] text-[#F5E7A3] hover:bg-[#12204D]'
                }`}
              >
                {selectedOrderDrawer.download_enabled_by_admin ? (
                  <>
                    <ToggleRight className="w-4 h-4" />
                    <span>AUTHORIZED (ON)</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4" />
                    <span>ENABLE DOWNLOAD</span>
                  </>
                )}
              </button>
            </div>

            {/* Preview Image if available */}
            {selectedOrderDrawer.preview_image && (
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-[#C9A227]">Uploaded 3D Preview Render</span>
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#E5E7EF] bg-slate-900">
                  <img
                    src={selectedOrderDrawer.preview_image}
                    alt="CAD Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Deliverables List */}
            {selectedOrderDrawer.deliverables && selectedOrderDrawer.deliverables.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-[#C9A227]">CAD Deliverables on File</span>
                <div className="space-y-1.5">
                  {selectedOrderDrawer.deliverables.map((d: any) => (
                    <div key={d.id} className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold uppercase text-[#2856C7] mr-2">.{d.file_type}</span>
                        <span className="font-semibold text-[#1E2230]">{d.filename}</span>
                        <span className="text-[10px] text-[#6B7280] ml-2">({d.file_size})</span>
                      </div>
                      <button
                        type="button"
                        disabled={downloadingDelId === d.id}
                        onClick={() => handleDownloadDeliverable(d, selectedOrderDrawer.id)}
                        className="text-[#2856C7] hover:underline font-bold text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {downloadingDelId === d.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#2856C7]" />
                        ) : (
                          <Download className="w-3 h-3 text-[#2856C7]" />
                        )}
                        <span>{downloadingDelId === d.id ? 'Downloading...' : 'Download File'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Request Technical Specifications */}
            {selectedOrderDrawer.custom_request && (
              <div className="space-y-3 pt-2 border-t border-[#E5E7EF]">
                <span className="text-xs font-mono font-bold uppercase text-[#C9A227]">Bespoke CAD Specifications</span>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]">
                    <span className="text-[10px] font-mono text-[#6B7280] uppercase block">Category</span>
                    <strong className="text-[#1E2230]">{selectedOrderDrawer.custom_request.category_name || 'Bespoke Piece'}</strong>
                  </div>
                  {/* Metal Alloy */}
                  {(() => {
                    const selMetal = selectedOrderDrawer.custom_request.selections?.find((s: any) => s.group_key === 'metal' || s.group_label?.toLowerCase().includes('metal'));
                    const metalName = selMetal?.value_label || selectedOrderDrawer.custom_request.metal_alloy_name;
                    return metalName ? (
                      <div className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]">
                        <span className="text-[10px] font-mono text-[#6B7280] uppercase block">Metal Alloy</span>
                        <strong className="text-[#1E2230]">{metalName}</strong>
                      </div>
                    ) : null;
                  })()}
                  {/* Ring Sizing */}
                  {selectedOrderDrawer.custom_request.ring_size && (
                    <div className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]">
                      <span className="text-[10px] font-mono text-[#6B7280] uppercase block">Ring Sizing</span>
                      <strong className="text-[#1E2230]">Size {selectedOrderDrawer.custom_request.ring_size} ({selectedOrderDrawer.custom_request.ring_size_standard?.toUpperCase() || 'US'})</strong>
                    </div>
                  )}
                  {/* Target Weight */}
                  {selectedOrderDrawer.custom_request.target_weight_grams && (
                    <div className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]">
                      <span className="text-[10px] font-mono text-[#6B7280] uppercase block">Target Weight</span>
                      <strong className="text-[#1E2230]">{selectedOrderDrawer.custom_request.target_weight_grams} grams</strong>
                    </div>
                  )}
                  {/* Target Completion Date */}
                  {selectedOrderDrawer.custom_request.needed_by_date && (
                    <div className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF]">
                      <span className="text-[10px] font-mono text-[#6B7280] uppercase block">Target Completion Date</span>
                      <strong className="text-[#1E2230]">{new Date(selectedOrderDrawer.custom_request.needed_by_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </div>
                  )}
                </div>

                {/* Additional Selections */}
                {selectedOrderDrawer.custom_request.selections && selectedOrderDrawer.custom_request.selections.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-[#6B7280] block font-bold">Atelier Option Selections</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {selectedOrderDrawer.custom_request.selections.map((sel: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] flex justify-between">
                          <span className="text-[#6B7280]">{sel.group_label}:</span>
                          <span className="font-bold text-[#1E2230]">{sel.value_label || sel.other_text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stones */}
                {selectedOrderDrawer.custom_request.stones && selectedOrderDrawer.custom_request.stones.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-[#6B7280] block font-bold">Gemstones &amp; Diamonds ({selectedOrderDrawer.custom_request.stones.length})</span>
                    <div className="space-y-1 text-xs">
                      {selectedOrderDrawer.custom_request.stones.map((st: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] flex justify-between">
                          <span className="font-semibold text-[#1E2230]">{st.shape} {st.stone_type} ({st.quantity}x)</span>
                          <span className="font-mono text-[#2856C7]">{st.size_value} {st.size_unit} • {st.setting_style}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engraving */}
                {selectedOrderDrawer.custom_request.engraving_text && (
                  <div className="p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs space-y-1">
                    <span className="text-[10px] font-mono uppercase text-[#6B7280] block font-bold">Laser Engraving</span>
                    <p className="font-serif italic text-[#1E2230] font-bold">"{selectedOrderDrawer.custom_request.engraving_text}"</p>
                    <p className="text-[10px] text-[#6B7280]">Font: {selectedOrderDrawer.custom_request.engraving_font || 'Script'} • Placement: {selectedOrderDrawer.custom_request.engraving_placement || 'Inside Shank'}</p>
                  </div>
                )}

                {/* Sketches */}
                {selectedOrderDrawer.custom_request.sketches && selectedOrderDrawer.custom_request.sketches.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-[#6B7280] block">Client Reference Sketches</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrderDrawer.custom_request.sketches.map((sk: any) => (
                        <img
                          key={sk.id}
                          src={sk.image_url || sk.image}
                          alt="Sketch"
                          className="w-16 h-16 rounded-xl object-cover border border-[#E5E7EF] shadow-sm"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Brief */}
                <div className="p-4 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs text-[#1E2230] space-y-1">
                  <span className="text-[10px] font-mono text-[#6B7280] uppercase block">Client Brief Description:</span>
                  <p>{selectedOrderDrawer.custom_request.description}</p>
                </div>
              </div>
            )}

            {/* ADMIN CALL & CONSULTATION NOTES (SAVED PER PARTICULAR ORDER) */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/70 to-slate-50 border-2 border-amber-300/80 rounded-xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-800 shrink-0">
                    <PhoneCall className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <div>
                    <span className="font-bold text-xs uppercase tracking-wider text-amber-950 font-mono flex items-center gap-1.5">
                      Admin Call &amp; Consultation Notes
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                        <Lock className="w-2 h-2" /> Internal CRM
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {drawerNotesSaveStatus && (
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                      ✓ {drawerNotesSaveStatus}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveDrawerAdminNotes}
                    disabled={isSavingDrawerNotes}
                    className="px-3 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-[11px] font-bold font-mono flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    {isSavingDrawerNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    <span>Save Note</span>
                  </button>
                </div>
              </div>

              {/* Direct Messenger Actions & Quick Tag Templates */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(() => {
                    const clientPhone = selectedOrderDrawer.custom_request?.phone || selectedOrderDrawer.client?.phone || '';
                    const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
                    return clientPhone ? (
                      <div className="flex items-center gap-1.5 mr-2">
                        <a
                          href={`tel:${clientPhone}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-mono font-bold hover:bg-blue-100 transition-colors"
                        >
                          <Phone className="w-3 h-3 text-blue-600" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-mono font-bold hover:bg-emerald-100 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={`https://t.me/+${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-300 text-sky-800 text-[10px] font-mono font-bold hover:bg-sky-100 transition-colors"
                        >
                          <Send className="w-3 h-3 text-sky-600" />
                          <span>Telegram</span>
                        </a>
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const stamp = `\n[📞 Call (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                      setDrawerAdminNotes(prev => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                    }}
                    className="text-[9px] font-mono px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 cursor-pointer"
                  >
                    + Call Log
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const stamp = `\n[💬 WhatsApp (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                      setDrawerAdminNotes(prev => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                    }}
                    className="text-[9px] font-mono px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 cursor-pointer"
                  >
                    + WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const stamp = `\n[✈️ Telegram (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                      setDrawerAdminNotes(prev => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                    }}
                    className="text-[9px] font-mono px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 cursor-pointer"
                  >
                    + Telegram
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const stamp = `\n[📝 Customer Spec Note]: `;
                      setDrawerAdminNotes(prev => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                    }}
                    className="text-[9px] font-mono px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 cursor-pointer"
                  >
                    + Spec Note
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                value={drawerAdminNotes}
                onChange={(e) => setDrawerAdminNotes(e.target.value)}
                placeholder="Log customer phone calls, WhatsApp messages, or special order agreements here..."
                className="w-full text-xs font-mono p-2.5 rounded-lg border border-amber-300 bg-white text-[#1E2230] focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400 resize-y"
              />
            </div>

            {/* Payment Schedule Breakdown */}
            {selectedOrderDrawer.payment_stages && selectedOrderDrawer.payment_stages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E5E7EF]">
                <span className="text-xs font-mono font-bold uppercase text-[#C9A227]">10/30/60 Milestone Payment Schedule</span>
                <div className="space-y-1.5">
                  {selectedOrderDrawer.payment_stages.map((st: any) => (
                    <div key={st.id} className="p-3 rounded-xl border border-[#E5E7EF] flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-[#1E2230]">{st.label}</span>
                        <span className="text-[10px] text-[#6B7280] ml-2">({st.percentage}%)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[#1E2230]">{formatUSD(st.amount)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          st.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {st.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* QC REJECTION MODAL */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E7EF] p-6 max-w-md w-full space-y-4 text-xs">
            <h3 className="font-serif text-base font-bold text-[#1E2230]">
              Reject Order #{rejectingOrderId} &bull; Request Modeller Revisions
            </h3>
            <p className="text-[#6B7280]">
              Please describe precisely what must be adjusted in the CAD model (e.g. wall thickness, stone seat tolerances, filigree details). The order will be reassigned back to the modeller with your feedback.
            </p>

            <textarea
              rows={4}
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="e.g. Prongs on the center diamond need 0.1mm extra stock for setting, and shank thickness should be at least 1.6mm."
              className="w-full p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setRejectingOrderId(null);
                  setRejectionNotes('');
                }}
                className="px-4 py-2 rounded-xl border border-[#E5E7EF] text-[#1E2230]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejectOrder}
                disabled={isSubmittingReview || !rejectionNotes.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                {isSubmittingReview ? 'Submitting...' : 'Send Revision Notes to Designer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN CREATE ORDER MODAL */}
      {isCreateModalOpen && (
        <AdminCreateOrderModal
          isOpen={isCreateModalOpen}
          staffList={staffList}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={async () => {
            setIsCreateModalOpen(false);
            await fetchOrders();
          }}
        />
      )}

      {/* ADMIN EDIT ORDER MODAL */}
      {editingOrder && (
        <AdminEditOrderModal
          isOpen={Boolean(editingOrder)}
          order={editingOrder}
          staffList={staffList}
          onClose={() => setEditingOrder(null)}
          onCancelOrder={(ord) => {
            setEditingOrder(null);
            handleCancelOrder(ord);
          }}
          onDeleteOrder={(ord) => {
            setEditingOrder(null);
            handleDeleteOrderPermanently(ord);
          }}
          onSuccess={async (updatedOrder) => {
            setEditingOrder(null);
            await fetchOrders();
            if (selectedOrderDrawer?.id === updatedOrder?.id) {
              setSelectedOrderDrawer(updatedOrder);
            }
          }}
        />
      )}

    </div>
  );
};
