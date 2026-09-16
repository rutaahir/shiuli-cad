import React, { useState } from 'react';
import { AdminNotification } from '../../types';
import { Bell, Plus, Check, Sparkles, Send } from 'lucide-react';

interface AdminNotificationsModuleProps {
  notifications: AdminNotification[];
  onMarkAllRead: () => void;
  onPostAnnouncement: (title: string, message: string) => void;
}

export const AdminNotificationsModule: React.FC<AdminNotificationsModuleProps> = ({
  notifications,
  onMarkAllRead,
  onPostAnnouncement,
}) => {
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');

  const handleSubmitAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle || !announcementMsg) return;
    onPostAnnouncement(announcementTitle, announcementMsg);
    setAnnouncementTitle('');
    setAnnouncementMsg('');
    alert('Announcement broadcasted to all staff members!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EF] shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1E2230] tracking-tight">
            Notifications & Broadcast Center
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Audit system alerts and broadcast studio announcements to modellers.
          </p>
        </div>

        <button
          onClick={onMarkAllRead}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EF] text-xs font-semibold text-[#2856C7]"
        >
          Mark All Read
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-bold text-[#1E2230]">System Notifications Feed</h3>
          <div className="space-y-3 text-xs">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border ${
                  n.read ? 'bg-[#F6F7FB] border-[#E5E7EF]' : 'bg-white border-[#C9A227] shadow-sm'
                }`}
              >
                <div className="flex justify-between font-bold text-[#1E2230]">
                  <span>{n.title}</span>
                  <span className="text-[10px] text-[#6B7280] font-mono">{n.timestamp}</span>
                </div>
                <p className="text-[#6B7280] mt-1">{n.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Post Announcement Form */}
        <div className="bg-white rounded-2xl border border-[#E5E7EF] p-5 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-bold text-[#1E2230] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C9A227]" />
            <span>Broadcast Staff Announcement</span>
          </h3>

          <form onSubmit={handleSubmitAnnouncement} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Notice Title</label>
              <input
                type="text"
                required
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="e.g. Diwali Rush Priority Order Rates"
                className="w-full px-3 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Message Content</label>
              <textarea
                rows={4}
                required
                value={announcementMsg}
                onChange={(e) => setAnnouncementMsg(e.target.value)}
                placeholder="Message will be displayed on all modellers' dashboards..."
                className="w-full px-3 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full btn-gold-luxury py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-[#0D1B4C]" />
              <span>Broadcast Notice</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
