import React, { useState, useEffect } from 'react';
import { AdminModuleId, AdminNotification } from '../../types';
import { BrandLogo } from '../BrandLogo';
import {
  LayoutDashboard,
  FolderKanban,
  CheckCircle2,
  MessageSquare,
  ShoppingBag,
  Users,
  CreditCard,
  UserCheck,
  BarChart3,
  Bell,
  Settings,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Command,
  X,
  ExternalLink,
  ShieldCheck,
  Sliders
} from 'lucide-react';

interface AdminLayoutProps {
  activeModule: AdminModuleId;
  onSelectModule: (module: AdminModuleId) => void;
  notifications: AdminNotification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onExitAdmin: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeModule,
  onSelectModule,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onExitAdmin,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickNew, setShowQuickNew] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems: { id: AdminModuleId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'catalog', label: 'Categories & Products', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'services', label: 'CAD Services CMS', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'file-edits', label: 'File Modifications', icon: <Sliders className="w-4 h-4" /> },
    { id: 'portfolio', label: 'Portfolio Showcase', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'approvals', label: 'Design Approvals', icon: <CheckCircle2 className="w-4 h-4" />, badge: 3 },
    { id: 'custom-requests', label: 'Custom Requests', icon: <MessageSquare className="w-4 h-4" />, badge: 2 },
    { id: 'custom-options', label: 'Custom Design Options', icon: <Sliders className="w-4 h-4" /> },
    { id: 'orders', label: 'Master Orders', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'staff', label: 'Staff & Job Limits', icon: <Users className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments & Settlements', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'clients', label: 'Client Base', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'analytics', label: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, badge: unreadCount },
    { id: 'settings', label: 'Studio Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="h-screen w-screen bg-[#F6F7FB] text-[#1E2230] flex flex-col font-sans selection:bg-[#D4AF37] selection:text-[#0B1330] overflow-hidden">
      {/* Prototype Banner Notice */}
      <div className="bg-[#09112B] border-b border-[#D4AF37]/30 px-4 py-1.5 text-center text-xs text-[#F5F1E8] flex items-center justify-center gap-2 flex-shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span>
          <strong className="text-[#F5E7A3]">SUPER ADMIN CONTROL PANEL (Internal Prototype)</strong> — Visible toggle for demo review only. Production route will use auth gating (`/admin/login`).
        </span>
        <button
          onClick={onExitAdmin}
          className="ml-3 text-[11px] underline text-[#D4AF37] hover:text-white transition-colors"
        >
          Exit to Client Site
        </button>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Royal Sapphire & Gold Metallic Sidebar */}
        <aside
          className={`h-full flex-shrink-0 bg-gradient-to-b from-[#09112B] via-[#0B1536] to-[#060B1E] text-[#F5F1E8] border-r border-[#D4AF37]/25 flex flex-col justify-between transition-all duration-300 z-30 shadow-[10px_0_30px_rgba(0,0,0,0.5)] ${
            isSidebarCollapsed ? 'w-[76px]' : 'w-[260px]'
          }`}
        >
          {/* Top Brand Header (Single Line Logo) */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-3.5 flex items-center justify-between border-b border-[#D4AF37]/20 bg-[#09112B]/80 backdrop-blur-md whitespace-nowrap overflow-hidden flex-shrink-0">
              {!isSidebarCollapsed ? (
                <BrandLogo variant="horizontal" size="sm" />
              ) : (
                <div className="mx-auto">
                  <BrandLogo variant="mark-only" size="sm" />
                </div>
              )}
            </div>

            {/* Navigation Links (Scrollable Area) */}
            <nav className="p-3 space-y-1.5 overflow-y-auto flex-1">
              {navItems.map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectModule(item.id)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all relative ${
                      isActive
                        ? 'bg-gradient-to-r from-[#D4AF37]/25 via-[#D4AF37]/10 to-transparent text-[#F5E7A3] font-bold border-l-[3px] border-[#D4AF37] pl-3 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                        : 'text-[#C9C2A6]/80 hover:bg-[#122254]/60 hover:text-white'
                    }`}
                  >
                    <span className={isActive ? 'text-[#D4AF37]' : 'text-[#8A9BC7]'}>
                      {item.icon}
                    </span>
                    {!isSidebarCollapsed && (
                      <span className="truncate flex-1 text-left tracking-wide">{item.label}</span>
                    )}
                    {!isSidebarCollapsed && item.badge && item.badge > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#0B1330] font-mono text-[10px] font-bold shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Controls (Fixed at Bottom) */}
          <div className="p-3 border-t border-[#D4AF37]/20 bg-[#060B1E]/90 backdrop-blur-md space-y-2.5 flex-shrink-0">
            {/* Collapse Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#09112B] border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 text-xs text-[#C9C2A6] hover:text-white transition-all shadow-sm"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[11px] font-medium tracking-wide">Collapse Sidebar</span>
                </>
              )}
            </button>

            {/* Admin Profile Mini Card */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0B1536] border border-[#D4AF37]/25 shadow-inner">
              <img
                src="/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
                alt="Admin"
                className="w-8 h-8 rounded-full object-cover border-2 border-[#D4AF37]"
              />
              {!isSidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs font-serif font-bold text-[#FAF8F3] truncate">
                    Harshil Shah
                  </div>
                  <div className="text-[10px] text-[#D4AF37] font-mono truncate">
                    Head CAD Engineer
                  </div>
                </div>
              )}
              <button
                onClick={onExitAdmin}
                title="Exit Admin"
                className="text-[#C9C2A6] hover:text-[#D14343] transition-colors p-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Bar */}
          <header className="bg-white border-b border-[#E5E7EF] px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
            {/* Left Search Bar Trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCommandPalette(true)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs text-[#6B7280] hover:border-[#C9A227]/50 transition-all w-64 sm:w-80 justify-between"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[#2856C7]" />
                  <span>Search orders, staff, products...</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px] bg-white border border-[#E5E7EF] px-1.5 py-0.5 rounded text-[#1E2230]">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              </button>
            </div>

            {/* Right Quick Actions */}
            <div className="flex items-center gap-3">
              {/* Quick "+ New" Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowQuickNew(!showQuickNew)}
                  className="px-3.5 py-2 rounded-xl bg-[#0D1B4C] text-white text-xs font-medium flex items-center gap-1.5 hover:bg-[#12245E] transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>New</span>
                </button>

                {showQuickNew && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E7EF] rounded-2xl shadow-xl p-1.5 text-xs z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                      onClick={() => {
                        setShowQuickNew(false);
                        onSelectModule('catalog');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F6F7FB] text-[#1E2230]"
                    >
                      + Add New Ready Product
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickNew(false);
                        onSelectModule('staff');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F6F7FB] text-[#1E2230]"
                    >
                      + Register Staff Member
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickNew(false);
                        onSelectModule('notifications');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F6F7FB] text-[#1E2230]"
                    >
                      + Post Announcement
                    </button>
                  </div>
                )}
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-[#1E2230] hover:border-[#C9A227]/50 transition-colors relative"
                >
                  <Bell className="w-4 h-4 text-[#1E2230]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#C9A227] rounded-full border-2 border-white animate-pulse" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E5E7EF] rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-2.5">
                      <div className="font-semibold text-[#1E2230] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                        <span>Live Admin Notifications</span>
                      </div>
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] text-[#2856C7] hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            onMarkNotificationRead(n.id);
                            if (n.actionUrl) onSelectModule(n.actionUrl as AdminModuleId);
                            setShowNotifications(false);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            n.read
                              ? 'bg-[#F6F7FB]/50 border-transparent text-[#6B7280]'
                              : 'bg-white border-[#C9A227]/30 text-[#1E2230] shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-xs text-[#1E2230]">{n.title}</span>
                            <span className="text-[10px] text-[#6B7280] font-mono">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] mt-1 line-clamp-2">{n.message}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        onSelectModule('notifications');
                      }}
                      className="w-full text-center text-xs font-semibold text-[#2856C7] hover:underline pt-2 border-t border-[#E5E7EF]"
                    >
                      View All Notifications Center →
                    </button>
                  </div>
                )}
              </div>

              {/* Client Storefront Link */}
              <button
                onClick={onExitAdmin}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F6F7FB] border border-[#E5E7EF] text-xs font-medium text-[#1E2230] hover:text-[#2856C7] hover:border-[#2856C7]/30 transition-all"
              >
                <span>Storefront</span>
                <ExternalLink className="w-3 h-3 text-[#2856C7]" />
              </button>
            </div>
          </header>

          {/* Module Content Canvas */}
          <main className="p-6 w-full space-y-6 flex-1">
            {children}
          </main>
        </div>
      </div>

      {/* Global Command Palette Modal (Cmd+K) */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E5E7EF] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E5E7EF] flex items-center justify-between gap-3">
              <Search className="w-4 h-4 text-[#2856C7]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search modules, orders, staff, or settings..."
                className="w-full bg-transparent text-sm text-[#1E2230] focus:outline-none placeholder-[#6B7280]"
              />
              <button
                onClick={() => setShowCommandPalette(false)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1E2230]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-1 text-xs">
              <div className="px-3 py-1 font-mono text-[10px] uppercase text-[#6B7280] font-semibold">
                Modules Navigation
              </div>
              {navItems
                .filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectModule(item.id);
                      setShowCommandPalette(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F6F7FB] text-left text-[#1E2230] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[#2856C7]">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#6B7280]">Jump to</span>
                  </button>
                ))}
            </div>

            <div className="p-3 border-t border-[#E5E7EF] bg-[#F6F7FB] flex items-center justify-between text-[11px] text-[#6B7280]">
              <span>Tip: Press `Esc` to exit command search</span>
              <span className="font-mono">Shiuli Admin OS v2.4</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
