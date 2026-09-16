import React, { useState, useEffect } from 'react';
import { DesignApproval } from '../../types';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Maximize2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Zap,
  Check,
  Clock,
  ShieldCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminApprovalsModule: React.FC = () => {
  const [approvals, setApprovals] = useState<DesignApproval[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectingItem, setRejectingItem] = useState<DesignApproval | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Rapid Reviewer Mode state
  const [rapidReviewIndex, setRapidReviewIndex] = useState<number | null>(null);

  const fetchApprovalsQueue = async () => {
    setLoading(true);
    try {
      const items: DesignApproval[] = [];

      // 1. Fetch pending/completed custom orders needing review
      try {
        const ordersRes = await api.request<any>('/orders/');
        const orderList = Array.isArray(ordersRes) ? ordersRes : ordersRes?.results || [];
        
        orderList.forEach((ord: any) => {
          const isPendingReview = ord.status === 'pending_review';
          const isApproved = ord.status === 'preview_ready' || ord.status === 'completed' || ord.quality_approved;
          const isRejected = ord.status === 'with_designer' && ord.admin_review_notes;

          if (isPendingReview || isApproved || isRejected) {
            const req = ord.custom_request || {};
            const staff = ord.assigned_staff || {};
            items.push({
              id: `ORD-${ord.id}`,
              title: req.category_name ? `Bespoke ${req.category_name} (Order #${ord.id})` : `Custom Order #${ord.id}`,
              designerName: staff.first_name ? `${staff.first_name} ${staff.last_name || ''}`.trim() : (staff.username || 'CAD Modeller'),
              designerAvatar: staff.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
              category: req.category_name || 'Bespoke Order',
              uploadedDate: ord.assigned_at ? new Date(ord.assigned_at).toISOString().split('T')[0] : 'Recently',
              thumbnail: ord.preview_image || req.sketches?.[0]?.image_url || req.sketches?.[0]?.image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
              status: isPendingReview ? 'pending' : isApproved ? 'approved' : 'rejected',
              fileFormats: ['3DM', 'STL', 'Render'],
              suggestedPrice: Math.round(parseFloat(ord.total_price || '200') * 0.4),
              specs: {
                metalWeight18k: req.metal_alloy_name || '18K Gold',
                diamondCount: req.gemstones?.length ? `${req.gemstones.length} Pcs` : 'As per brief',
                dimensions: 'Watertight SOW',
              },
              // Metadata for API execution
              rawId: ord.id,
              isCustomOrder: true,
            } as any);
          }
        });
      } catch (e) {
        console.warn('Could not fetch custom orders for approvals:', e);
      }

      // 2. Fetch catalog products needing review
      try {
        const prodRes = await api.getProducts();
        const prodList = Array.isArray(prodRes) ? prodRes : prodRes?.results || [];

        prodList.forEach((p: any) => {
          items.push({
            id: p.slug || `PROD-${p.id}`,
            title: p.title,
            designerName: p.uploaded_by?.username || 'Craftsman',
            designerAvatar: p.uploaded_by?.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
            category: p.category_name || p.category?.name || 'Catalog Design',
            uploadedDate: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : 'Recently',
            thumbnail: p.primary_image || p.images?.[0]?.image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
            status: p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending',
            fileFormats: ['3DM', 'STL', 'Render'],
            suggestedPrice: parseFloat(p.price || '0'),
            specs: {
              metalWeight18k: p.metal_weight_grams ? `${p.metal_weight_grams}g` : '14.5g',
              diamondCount: p.stone_count ? `${p.stone_count} Pcs` : '36 Pcs',
              dimensions: 'Standard',
            },
            rawSlug: p.slug,
            isCatalogProduct: true,
          } as any);
        });
      } catch (e) {
        console.warn('Could not fetch catalog products for approvals:', e);
      }

      setApprovals(items);
    } catch (err) {
      console.error('Failed to load approvals queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalsQueue();
  }, []);

  const pendingList = approvals.filter((a) => a.status === 'pending');
  const filteredList =
    activeFilter === 'all'
      ? approvals
      : approvals.filter((a) => a.status === activeFilter);

  const handleApprove = async (item: DesignApproval | any) => {
    setProcessingId(item.id);
    try {
      if (item.isCustomOrder && item.rawId) {
        // Approve Custom Order Handover -> Transition to preview_ready
        await api.adminReviewOrder(item.rawId, 'approve');
      } else if (item.rawSlug) {
        // Approve Store Catalog Design -> Transition to approved
        await api.approveProduct(item.rawSlug);
      }

      setApprovals((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'approved' } : i))
      );
      await fetchApprovalsQueue();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve submission.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const item: any = rejectingItem;
    setProcessingId(item.id);

    try {
      if (item.isCustomOrder && item.rawId) {
        await api.adminReviewOrder(item.rawId, 'reject', rejectionReason || 'Revisions requested by Admin QC');
      } else if (item.rawSlug) {
        await api.rejectProduct(item.rawSlug, rejectionReason || 'Revisions requested by Admin QC');
      }

      setApprovals((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'rejected', rejectionReason: rejectionReason || 'Quality standards not met' }
            : i
        )
      );
      setRejectingItem(null);
      setRejectionReason('');
      await fetchApprovalsQueue();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject submission.');
    } finally {
      setProcessingId(null);
    }
  };

  // Keyboard navigation for Rapid Reviewer Mode
  useEffect(() => {
    if (rapidReviewIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (pendingList.length === 0) {
        setRapidReviewIndex(null);
        return;
      }
      const currentItem = pendingList[rapidReviewIndex];
      if (!currentItem) return;

      if (e.key === 'ArrowRight') {
        handleApprove(currentItem);
        if (rapidReviewIndex >= pendingList.length - 1) {
          setRapidReviewIndex(Math.max(0, pendingList.length - 2));
        }
      } else if (e.key === 'ArrowLeft') {
        setRejectingItem(currentItem);
      } else if (e.key === 'Escape') {
        setRapidReviewIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rapidReviewIndex, pendingList]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Staff Design Approvals Queue
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Review modellers' custom order handovers &amp; ready CAD catalog submissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pendingList.length > 0 && (
            <button
              onClick={() => setRapidReviewIndex(0)}
              className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-lg animate-pulse"
            >
              <Zap className="w-4 h-4 text-[#0D1B4C]" />
              <span>Launch Rapid Review Mode ({pendingList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EF] pb-3 text-xs font-semibold">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-4 py-2 rounded-xl capitalize transition-all ${
              activeFilter === tab
                ? 'bg-[#0D1B4C] text-white shadow-sm font-bold'
                : 'bg-white text-[#6B7280] hover:text-[#1E2230] border border-[#E5E7EF]'
            }`}
          >
            {tab === 'all' ? 'All Submissions' : tab}
            {tab === 'pending' && pendingList.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#C9A227] text-[#0D1B4C] font-mono font-bold text-[10px]">
                {pendingList.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid of Approval Cards */}
      {loading ? (
        <div className="w-full py-16 bg-white rounded-2xl border border-[#E5E7EF] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
          <span className="text-xs font-mono text-[#6B7280]">Loading approvals queue from Django database...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#E5E7EF] space-y-3">
          <ShieldCheck className="w-10 h-10 text-[#C9A227] mx-auto opacity-50" />
          <h3 className="font-serif text-lg font-bold text-[#1E2230]">No Items in {activeFilter} Queue</h3>
          <p className="text-xs text-[#6B7280]">Submitted CAD deliverables and catalog designs awaiting QC approval will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#E5E7EF] overflow-hidden shadow-sm hover:shadow-md hover:border-[#C9A227]/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] bg-[#F6F7FB] overflow-hidden">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#0D1B4C]/80 backdrop-blur text-[10px] font-mono text-white uppercase border border-[#C9A227]/40">
                    {item.category}
                  </div>

                  <div className="absolute top-3 right-3">
                    {item.status === 'pending' && (
                      <span className="px-2.5 py-1 rounded-full bg-[#E8A93B] text-[#0D1B4C] font-bold text-[10px] uppercase shadow-md flex items-center gap-1">
                        <Clock className="w-3 h-3" /> QC Review
                      </span>
                    )}
                    {item.status === 'approved' && (
                      <span className="px-2.5 py-1 rounded-full bg-[#1F9D66] text-white font-bold text-[10px] uppercase shadow-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    )}
                    {item.status === 'rejected' && (
                      <span className="px-2.5 py-1 rounded-full bg-[#D14343] text-white font-bold text-[10px] uppercase shadow-md flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Revision
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={item.designerAvatar}
                        alt={item.designerName}
                        className="w-6 h-6 rounded-full object-cover border border-[#E5E7EF]"
                      />
                      <span className="text-xs font-semibold text-[#1E2230]">
                        {item.designerName}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#6B7280] font-mono">{item.uploadedDate}</span>
                  </div>

                  <h3 className="font-serif text-base font-bold text-[#1E2230] leading-snug">
                    {item.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#6B7280] bg-[#F6F7FB] p-2.5 rounded-xl">
                    <div>Spec: {item.specs.metalWeight18k}</div>
                    <div>Stone: {item.specs.diamondCount}</div>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {item.fileFormats.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded bg-[#0D1B4C]/5 text-[#0D1B4C] font-bold border border-[#0D1B4C]/10"
                      >
                        {f}
                      </span>
                    ))}
                    <span className="ml-auto font-bold text-xs text-[#1E2230]">
                      Value: ₹{item.suggestedPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {item.status === 'pending' && (
                <div className="p-4 border-t border-[#E5E7EF] bg-[#F6F7FB] flex items-center justify-between gap-3">
                  <button
                    disabled={processingId === item.id}
                    onClick={() => setRejectingItem(item)}
                    className="flex-1 py-2 rounded-xl bg-white border border-[#D14343]/30 text-[#D14343] hover:bg-[#D14343]/10 font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Revision</span>
                  </button>
                  <button
                    disabled={processingId === item.id}
                    onClick={() => handleApprove(item)}
                    className="flex-1 py-2 rounded-xl bg-[#1F9D66] text-white font-semibold text-xs hover:bg-[#198354] transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    {processingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Approve</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E7EF] p-6 max-w-md w-full space-y-4">
            <h3 className="font-serif text-base font-bold text-[#1E2230]">
              Request Revision: {rejectingItem.title}
            </h3>
            <p className="text-xs text-[#6B7280]">
              Please specify QC feedback notes for {rejectingItem.designerName} so they can adjust the STL mesh or Rhino layer hierarchy.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Stone seat angles are 90° instead of 42°; metal thickness is below 0.8mm minimum wall tolerance..."
              className="w-full p-3 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#D14343]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E7EF] text-xs text-[#1E2230]"
              >
                Cancel
              </button>
              <button
                disabled={processingId === rejectingItem.id}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-[#D14343] text-white text-xs font-semibold hover:bg-[#B33535] flex items-center gap-1"
              >
                {processingId === rejectingItem.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Revision Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rapid Reviewer Mode Full-Screen Overlay */}
      {rapidReviewIndex !== null && pendingList[rapidReviewIndex] && (
        <div className="fixed inset-0 z-50 bg-[#0D1B4C] text-white p-6 flex flex-col justify-between animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-[#C9A227] text-[#0D1B4C] font-mono font-bold text-xs">
                RAPID REVIEW MODE
              </div>
              <span className="text-xs text-white/70">
                Item {rapidReviewIndex + 1} of {pendingList.length}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1 text-[#1F9D66]">
                <kbd className="px-2 py-1 bg-white/10 rounded font-bold">→</kbd> Approve
              </span>
              <span className="flex items-center gap-1 text-[#D14343]">
                <kbd className="px-2 py-1 bg-white/10 rounded font-bold">←</kbd> Reject
              </span>
              <button
                onClick={() => setRapidReviewIndex(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ml-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Card View */}
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col md:flex-row items-center gap-8 py-6">
            <div className="w-full md:w-1/2 aspect-square rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black">
              <img
                src={pendingList[rapidReviewIndex].thumbnail}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full md:w-1/2 space-y-6">
              <div>
                <span className="text-xs font-mono text-[#C9A227] uppercase">
                  {pendingList[rapidReviewIndex].category}
                </span>
                <h2 className="font-serif text-3xl font-bold mt-1 text-white">
                  {pendingList[rapidReviewIndex].title}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={pendingList[rapidReviewIndex].designerAvatar}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs text-white/80">
                    Modeller: {pendingList[rapidReviewIndex].designerName}
                  </span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2 text-xs font-mono">
                <div>Spec: {pendingList[rapidReviewIndex].specs.metalWeight18k}</div>
                <div>Stone: {pendingList[rapidReviewIndex].specs.diamondCount}</div>
                <div>Dimensions: {pendingList[rapidReviewIndex].specs.dimensions}</div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={() => setRejectingItem(pendingList[rapidReviewIndex])}
                  className="flex-1 py-3 rounded-xl bg-[#D14343] text-white font-bold text-xs hover:bg-[#B33535] flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Revision (←)</span>
                </button>
                <button
                  onClick={() => {
                    handleApprove(pendingList[rapidReviewIndex]);
                    if (rapidReviewIndex >= pendingList.length - 1) {
                      setRapidReviewIndex(Math.max(0, pendingList.length - 2));
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#1F9D66] text-white font-bold text-xs hover:bg-[#198354] flex items-center justify-center gap-2"
                >
                  <span>Approve (→)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
