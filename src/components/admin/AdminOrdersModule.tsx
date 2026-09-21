import React, { useState, useEffect } from 'react';
import { StaffMember } from '../../types';
import { api } from '../../services/api';
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
  RefreshCw
} from 'lucide-react';

interface AdminOrdersModuleProps {
  staffList: StaffMember[];
}

const formatINR = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '₹0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

export const AdminOrdersModule: React.FC<AdminOrdersModuleProps> = ({ staffList }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrderDrawer, setSelectedOrderDrawer] = useState<any | null>(null);
  const [reassignModalOrder, setReassignModalOrder] = useState<any | null>(null);
  const [newAssignedStaffId, setNewAssignedStaffId] = useState<string>('');
  
  // Rejection modal state
  const [rejectingOrderId, setRejectingOrderId] = useState<number | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [togglingDownloadId, setTogglingDownloadId] = useState<number | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [downloadingDelId, setDownloadingDelId] = useState<number | null>(null);

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

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'pending_review') return o.status === 'pending_review';
    if (statusFilter === 'in_design') return o.status === 'in_design';
    if (statusFilter === 'preview_ready') return o.status === 'preview_ready';
    if (statusFilter === 'completed') return o.status === 'completed';
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
            Monitor active commissions, inspect designer CAD uploads, authorize quality releases, and toggle client download permissions.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs font-semibold text-[#1E2230] hover:bg-[#E5E7EF] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { key: 'all', label: `All Orders (${orders.length})` },
          { key: 'pending_review', label: `Pending QC Review (${orders.filter(o => o.status === 'pending_review').length})` },
          { key: 'in_design', label: `In Design (${orders.filter(o => o.status === 'in_design').length})` },
          { key: 'preview_ready', label: `Preview Ready (${orders.filter(o => o.status === 'preview_ready').length})` },
          { key: 'completed', label: `Completed (${orders.filter(o => o.status === 'completed').length})` },
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
                <th className="p-4 font-medium">Agreed Price</th>
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

                    {/* Agreed Price */}
                    <td className="p-4 font-mono">
                      <div className="font-bold text-[#1E2230] text-sm">
                        {formatINR(ord.total_price || req?.agreed_price)}
                      </div>
                      <div className="text-[10px]">
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
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedOrderDrawer(ord)}
                        className="px-3 py-1.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-[#1E2230] hover:bg-[#E5E7EF] font-semibold text-xs"
                      >
                        Inspect Full Brief
                      </button>
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
              <button
                onClick={() => setSelectedOrderDrawer(null)}
                className="p-1.5 rounded-xl text-[#6B7280] hover:text-[#1E2230] hover:bg-[#F6F7FB]"
              >
                <X className="w-5 h-5" />
              </button>
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
                        <span className="font-mono font-bold text-[#1E2230]">{formatINR(st.amount)}</span>
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

    </div>
  );
};
