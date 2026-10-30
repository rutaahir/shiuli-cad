import React from 'react';
import { AdminNotification } from '../../types';
import { Bell, CheckCircle2, Zap, Coins } from 'lucide-react';

interface StaffNotificationsTabProps {
  notifications: AdminNotification[];
  onMarkAllRead: () => void;
}

export const StaffNotificationsTab: React.FC<StaffNotificationsTabProps> = ({
  notifications,
  onMarkAllRead,
}) => {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8D7B7] shadow-sm">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#FFF9F0] text-[#B88732] border border-[#E8D7B7] text-[10px] uppercase font-bold tracking-widest font-mono shadow-2xs">
            Broadcast Feed
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#17243B] tracking-tight mt-1">
            Artisan Alerts &amp; Broadcasts
          </h1>
          <p className="text-xs text-[#687386] font-light mt-0.5">
            Real-time status updates on milestone approvals, commission payouts, and system messages.
          </p>
        </div>
        <button
          onClick={onMarkAllRead}
          className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm cursor-pointer"
        >
          Mark All Read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-[#E8D7B7] space-y-3 shadow-sm">
            <Bell className="w-8 h-8 text-[#B88732] mx-auto opacity-40" />
            <h3 className="font-serif text-base font-bold text-[#17345C]">No Active Notifications</h3>
            <p className="text-xs text-[#687386]">You are all caught up with studio communications.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                n.read
                  ? 'bg-white border-[#E8D7B7] text-[#687386]'
                  : 'bg-[#FFFDF9] border-l-4 border-l-[#B88732] border-[#E8D7B7] text-[#17243B] shadow-2xs'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-[#FFF9F0] text-[#B88732] border border-[#E8D7B7] shadow-2xs shrink-0">
                {n.type === 'approval' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {n.type === 'order' && <Zap className="w-5 h-5 text-[#B88732]" />}
                {n.type === 'payment' && <Coins className="w-5 h-5 text-emerald-600" />}
                {n.type === 'system' && <Bell className="w-5 h-5 text-[#17345C]" />}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-[#17345C]">{n.title}</h4>
                  <span className="text-[10px] font-mono text-[#687386]">{n.timestamp}</span>
                </div>
                <p className="text-xs text-[#687386] leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
