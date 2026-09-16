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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#09112B] text-[#F5E7A3] text-[10px] uppercase font-bold tracking-widest font-mono">
            Broadcast Feed
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight mt-1">
            Artisan Alerts & Broadcasts
          </h1>
        </div>
        <button
          onClick={onMarkAllRead}
          className="btn-gold-luxury px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md"
        >
          Mark All Read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
              n.read
                ? 'bg-white border-[#E5E7EF] text-[#6B7280]'
                : 'bg-white border-l-4 border-l-[#C9A227] border-[#E5E7EF] text-[#1E2230] shadow-sm'
            }`}
          >
            <div className="p-2.5 rounded-xl bg-[#09112B] text-[#F5E7A3] border border-[#D4AF37]/30 shrink-0">
              {n.type === 'approval' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {n.type === 'order' && <Zap className="w-5 h-5 text-[#D4AF37]" />}
              {n.type === 'payment' && <Coins className="w-5 h-5 text-emerald-300" />}
              {n.type === 'system' && <Bell className="w-5 h-5 text-purple-300" />}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-sm text-[#1E2230]">{n.title}</h4>
                <span className="text-[10px] font-mono text-[#6B7280]">{n.timestamp}</span>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
