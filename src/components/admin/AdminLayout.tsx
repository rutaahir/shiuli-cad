import React, { useState, useEffect } from 'react';
import { AdminModuleId, AdminNotification } from '../../types';
import { BrandLogo } from '../BrandLogo';
import { api } from '../../services/api';
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
  Sliders,
  Mail,
  Menu
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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

  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0);

  useEffect(() => {
    api.getGatewayLogs().then((logs) => {
      const pCount = (logs || []).filter((p: any) => p.can_approve || p.raw_status === 'pending').length;
      setPendingPaymentsCount(pCount);
    }).catch(() => {});
  }, [activeModule]);

  const navItems: { id: AdminModuleId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'catalog', label: 'Categories & Products', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'file-edits', label: 'File Modifications', icon: <Sliders className="w-4 h-4" /> },
    { id: 'portfolio', label: 'Portfolio Showcase', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'approvals', label: 'Design Approvals', icon: <CheckCircle2 className="w-4 h-4" />, badge: 3 },
    { id: 'custom-requests', label: 'Custom Requests', icon: <MessageSquare className="w-4 h-4" />, badge: 2 },
    { id: 'custom-options', label: 'Custom Design Options', icon: <Sliders className="w-4 h-4" /> },
    { id: 'contact-inquiries', label: 'Contact Inquiries', icon: <Mail className="w-4 h-4" /> },
    { id: 'orders', label: 'Master Orders', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'staff', label: 'Staff & Job Limits', icon: <Users className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments & Gateway', icon: <CreditCard className="w-4 h-4" />, badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined },
    { id: 'clients', label: 'Client Base', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'analytics', label: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, badge: unreadCount },
    { id: 'settings', label: 'Studio Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="h-screen w-screen bg-[#FFFDF9] text-[#17243B] flex flex-col font-sans overflow-hidden admin-portal">
      {/* Prototype Banner Notice */}


      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Mobile Slide-over Drawer Backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          />
        )}

        {/* Mobile Slide-over Drawer */}
        <aside
          className={`fixed inset-y-0 left-0 w-[280px] bg-[#FFFDF9] text-[#17243B] z-50 flex flex-col justify-between transition-transform duration-300 lg:hidden shadow-2xl border-r border-[#E8D7B7] ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 flex items-center justify-between border-b border-[#E8D7B7] bg-white">
              <BrandLogo variant="horizontal" size="sm" theme="light" />
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 space-y-1 overflow-y-auto flex-1">
              {navItems.map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectModule(item.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-medium transition-all ${isActive
                        ? 'bg-[#FFF9F0] text-[#17345C] font-bold border-l-4 border-[#B88732] shadow-2xs'
                        : 'text-[#687386] hover:bg-[#FFF9F0] hover:text-[#17345C]'
                      }`}
                  >
                    <span className={isActive ? 'text-[#B88732]' : 'text-[#687386]'}>
                      {item.icon}
                    </span>
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {item.badge && item.badge > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#17345C] text-[#FFF9F0] font-mono text-[10px] font-bold">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="p-4 border-t border-[#E8D7B7] bg-[#FFF9F0]">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-[#E8D7B7]">
              <img
                src="/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
                alt="Admin"
                className="w-8 h-8 rounded-full object-cover border-2 border-[#D9B66F]"
              />
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-serif font-bold text-[#17345C] truncate">Harshil Shah</div>
                <div className="text-[10px] text-[#B88732] font-semibold">Head CAD Engineer</div>
              </div>
              <button onClick={onExitAdmin} className="text-[#687386] hover:text-rose-600 p-1">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Luxury Atelier Ivory Porcelain & Gold Desktop Sidebar */}
        <aside
          className={`h-full flex-shrink-0 bg-[#FFFDF9] text-[#17243B] border-r border-[#E8D7B7] hidden lg:flex flex-col justify-between transition-all duration-300 z-30 shadow-[4px_0_24px_rgba(23,52,92,0.05)] ${isSidebarCollapsed ? 'w-[76px]' : 'w-[260px]'
            }`}
        >
          {/* Top Brand Header (Single Line Logo) */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-3.5 flex items-center justify-between border-b border-[#E8D7B7] bg-white/90 backdrop-blur-md whitespace-nowrap overflow-hidden flex-shrink-0">
              {!isSidebarCollapsed ? (
                <BrandLogo variant="horizontal" size="sm" theme="light" />
              ) : (
                <div className="mx-auto">
                  <BrandLogo variant="mark-only" size="sm" theme="light" />
                </div>
              )}
            </div>

            {/* Navigation Links (Scrollable Area) */}
            <nav className="p-3 space-y-1.5 overflow-y-auto flex-1 custom-scrollbar">
              {navItems.map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectModule(item.id)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all relative cursor-pointer ${isActive
                        ? 'bg-[#FFF9F0] text-[#17345C] font-bold border-l-[3px] border-[#B88732] pl-3 shadow-2xs'
                        : 'text-[#687386] hover:bg-[#FFF9F0] hover:text-[#17345C]'
                      }`}
                  >
                    <span className={isActive ? 'text-[#B88732]' : 'text-[#687386]'}>
                      {item.icon}
                    </span>
                    {!isSidebarCollapsed && (
                      <span className="truncate flex-1 text-left tracking-wide">{item.label}</span>
                    )}
                    {!isSidebarCollapsed && item.badge && item.badge > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#17345C] text-[#FFF9F0] font-mono text-[10px] font-bold shadow-2xs">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Controls (Fixed at Bottom) */}
          <div className="p-3 border-t border-[#E8D7B7] bg-[#FFF9F0]/80 backdrop-blur-md space-y-2.5 flex-shrink-0">
            {/* Collapse Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white border border-[#E8D7B7] hover:border-[#B88732] text-xs text-[#17345C] hover:bg-[#FFFDF9] transition-all shadow-2xs cursor-pointer"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-[#B88732]" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 text-[#B88732]" />
                  <span className="text-[11px] font-semibold tracking-wide text-[#17345C]">Collapse Sidebar</span>
                </>
              )}
            </button>

            {/* Admin Profile Mini Card */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-[#E8D7B7] shadow-2xs">
              <img
                src="/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
                alt="Admin"
                className="w-8 h-8 rounded-full object-cover border-2 border-[#D9B66F]"
              />
              {!isSidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs font-serif font-bold text-[#17345C] truncate">
                    Harshil Shah
                  </div>
                  <div className="text-[10px] text-[#B88732] font-semibold tracking-wide truncate">
                    Head CAD Engineer
                  </div>
                </div>
              )}
              <button
                onClick={onExitAdmin}
                title="Exit Admin"
                className="text-[#687386] hover:text-rose-600 transition-colors p-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Bar */}
          <header className="bg-white/95 backdrop-blur-md border-b border-[#E8D7B7] px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
            {/* Left Hamburger + Search Bar Trigger */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 rounded-xl bg-[#17345C] text-[#FFF9F0] lg:hidden hover:bg-[#112745] transition-colors shadow-sm cursor-pointer"
                title="Open Admin Menu"
              >
                <Menu className="w-5 h-5 text-[#D9B66F]" />
              </button>

              <button
                onClick={() => setShowCommandPalette(true)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-xs text-[#687386] hover:border-[#D9B66F] hover:bg-white transition-all w-44 sm:w-80 justify-between shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-[#B88732] shrink-0" />
                  <span className="truncate">Search orders, staff, catalog...</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px] bg-white border border-[#E8D7B7] px-1.5 py-0.5 rounded text-[#17345C]">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              </button>
            </div>

            {/* Right Quick Actions */}
            <div className="flex items-center gap-2.5">
              {/* Quick "+ New" Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowQuickNew(!showQuickNew)}
                  className="btn-gold-luxury px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>

                {showQuickNew && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E8D7B7] rounded-2xl shadow-xl p-1.5 text-xs z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                      onClick={() => {
                        setShowQuickNew(false);
                        onSelectModule('orders');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FFF9F0] text-[#17345C] font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span className="text-[#B88732] font-bold">+</span> Place Order for Customer
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickNew(false);
                        onSelectModule('catalog');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FFF9F0] text-[#17345C] font-medium transition-colors"
                    >
                      + Add New Ready Product
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickNew(false);
                        onSelectModule('staff');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FFF9F0] text-[#17345C] font-medium transition-colors"
                    >
                      + Register Staff Member
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickNew(false);
                        onSelectModule('notifications');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FFF9F0] text-[#17345C] font-medium transition-colors"
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
                  className="p-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] hover:border-[#D9B66F] hover:bg-white transition-colors relative cursor-pointer shadow-2xs"
                >
                  <Bell className="w-4 h-4 text-[#17345C]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#B88732] rounded-full border-2 border-white animate-pulse" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E8D7B7] rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E8D7B7]/50 pb-2.5">
                      <div className="font-serif font-bold text-[#17345C] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#B88732]" />
                        <span>Live Admin Notifications</span>
                      </div>
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] text-[#B88732] hover:underline font-semibold"
                      >
                        Mark all read
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            onMarkNotificationRead(n.id);
                            if (n.actionUrl) onSelectModule(n.actionUrl as AdminModuleId);
                            setShowNotifications(false);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${n.read
                              ? 'bg-[#FFFDF9]/60 border-transparent text-[#687386]'
                              : 'bg-[#FFF9F0] border-[#E8D7B7] text-[#17345C] shadow-2xs'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-xs text-[#17345C]">{n.title}</span>
                            <span className="text-[10px] text-[#687386] font-mono">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] mt-1 line-clamp-2 text-[#687386]">{n.message}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        onSelectModule('notifications');
                      }}
                      className="w-full text-center text-xs font-semibold text-[#B88732] hover:underline pt-2 border-t border-[#E8D7B7]/50 cursor-pointer"
                    >
                      View All Notifications Center →
                    </button>
                  </div>
                )}
              </div>

              {/* Client Storefront Link */}
              <button
                onClick={onExitAdmin}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-xs font-semibold text-[#17345C] hover:border-[#D9B66F] hover:bg-white transition-all shadow-2xs cursor-pointer"
              >
                <span>Storefront</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#B88732]" />
              </button>
            </div>
          </header>

          {/* Module Content Canvas */}
          <main className="p-6 w-full space-y-6 flex-1 bg-[#FFFDF9]">
            {children}
          </main>
        </div>
      </div>

      {/* Global Command Palette Modal (Cmd+K) */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E8D7B7] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E8D7B7]/60 flex items-center justify-between gap-3 bg-[#FFFDF9]">
              <Search className="w-4 h-4 text-[#B88732]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search modules, orders, staff, or settings..."
                className="w-full bg-transparent text-sm text-[#17345C] focus:outline-none placeholder-[#687386]"
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
