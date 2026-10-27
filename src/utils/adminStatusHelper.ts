export type AdminEntityType = 'order' | 'custom_request' | 'file_edit';

export interface CancellationInfo {
  isCancelledOrRejected: boolean;
  actor: 'customer' | 'admin' | 'unknown';
  label: string;
  badgeClass: string;
}

/**
 * Option 1 cancellation attribution helper for Admin panel.
 * - CustomRequest: admin_call_notes contains "Cancelled by Customer" or "Cancelled by Admin"
 * - FileEditRequest: rejection_reason starts with "Declined by customer" or last message sender_type='client'
 * - Order: milestone text contains "Cancelled by Customer" or "Cancelled by Studio" / "Cancelled by Admin"
 *
 * Safe default: Shows "Cancelled" if source cannot be determined, NEVER "Rejected" for customer cancellation.
 */
export function getCancellationInfo(item: any, type: AdminEntityType): CancellationInfo {
  if (!item) {
    return { isCancelledOrRejected: false, actor: 'unknown', label: '', badgeClass: '' };
  }

  const rawStatus = (item.status || '').toLowerCase();
  const isCancelledOrRejected = rawStatus === 'cancelled' || rawStatus === 'rejected';

  if (!isCancelledOrRejected) {
    return {
      isCancelledOrRejected: false,
      actor: 'unknown',
      label: rawStatus.replace(/_/g, ' '),
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  }

  if (type === 'custom_request') {
    const notes = String(item.admin_call_notes || '');
    if (notes.includes('Cancelled by Customer')) {
      return {
        isCancelledOrRejected: true,
        actor: 'customer',
        label: 'Cancelled by Customer',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
      };
    }
    if (notes.includes('Cancelled by Admin')) {
      return {
        isCancelledOrRejected: true,
        actor: 'admin',
        label: 'Cancelled by Admin',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
      };
    }
    return {
      isCancelledOrRejected: true,
      actor: 'unknown',
      label: 'Cancelled',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    };
  }

  if (type === 'file_edit') {
    const reason = String(item.rejection_reason || '').trim().toLowerCase();
    const msgs = Array.isArray(item.messages) ? item.messages : [];
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    const lastSender = (lastMsg?.sender_type || lastMsg?.sender || '').toLowerCase();

    const isCustomer =
      reason.startsWith('declined by customer') ||
      reason.includes('cancelled by customer') ||
      lastSender === 'client' ||
      (lastMsg?.message || '').toLowerCase().includes('customer declined');

    const isAdmin =
      reason.includes('studio admin declined') ||
      reason.includes('admin') ||
      lastSender === 'admin' ||
      (lastMsg?.message || '').toLowerCase().includes('studio admin declined');

    if (isCustomer) {
      return {
        isCancelledOrRejected: true,
        actor: 'customer',
        label: 'Cancelled by Customer',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
      };
    }
    if (isAdmin) {
      return {
        isCancelledOrRejected: true,
        actor: 'admin',
        label: 'Rejected by Admin',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
      };
    }
    return {
      isCancelledOrRejected: true,
      actor: 'unknown',
      label: 'Cancelled',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    };
  }

  // Order
  const milestones = Array.isArray(item.milestones) ? item.milestones : [];
  const hasCustMilestone = milestones.some((m: any) =>
    String(m.stage || m.title || m.description || '').includes('Cancelled by Customer')
  );
  const hasAdminMilestone = milestones.some((m: any) => {
    const txt = String(m.stage || m.title || m.description || '');
    return txt.includes('Cancelled by Studio') || txt.includes('Cancelled by Admin');
  });
  const customReqNotes = String(item.custom_request?.admin_call_notes || '');

  if (hasCustMilestone || customReqNotes.includes('Cancelled by Customer')) {
    return {
      isCancelledOrRejected: true,
      actor: 'customer',
      label: 'Cancelled by Customer',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    };
  }

  if (hasAdminMilestone || customReqNotes.includes('Cancelled by Admin')) {
    return {
      isCancelledOrRejected: true,
      actor: 'admin',
      label: 'Cancelled by Admin',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    };
  }

  return {
    isCancelledOrRejected: true,
    actor: 'unknown',
    label: 'Cancelled',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  };
}

/**
 * Returns uniform status label across all admin modules.
 */
export function getAdminStatusLabel(item: any, type: AdminEntityType): string {
  if (!item) return '';
  const rawStatus = (item.status || '').toLowerCase();
  if (rawStatus === 'cancelled' || rawStatus === 'rejected') {
    return getCancellationInfo(item, type).label;
  }
  return rawStatus.replace(/_/g, ' ');
}
