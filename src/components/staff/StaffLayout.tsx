import React, { useState, useEffect } from 'react';
import { StaffPortalTab, StaffMember, AdminNotification } from '../../types';
import { BrandLogo } from '../BrandLogo';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Inbox,
  Palette,
  History,
  Coins,
  User,
  Bell,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Briefcase,
  Search,
  ExternalLink,
  Command,
  X,
  Menu,
} from 'lucide-react';

interface StaffLayoutProps {
  activeTab: StaffPortalTab;
  onTabChange: (tab: StaffPortalTab) => void;
  staff: StaffMember;
  availableJobsCount: number;
  activeJobsCount: number;
  notifications: AdminNotification[];
  onBackToMain: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({
  activeTab,
  onTabChange,
  staff,
  availableJobsCount,
  activeJobsCount,
  notifications,
  onBackToMain,
  onLogout,
  children,
}) => {
  const { logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
      onBackToMain();
    }
  };

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

  const navItems: { id: StaffPortalTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      id: 'workbench',
      label: 'My Workbench',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: activeJobsCount > 0 ? activeJobsCount : undefined,
      badgeColor: 'bg-[#17345C] text-[#FFF9F0]',
    },
    {
      id: 'job-pool',
      label: 'Job Pool (First-Wins)',
      icon: <Inbox className="w-4 h-4" />,
      badge: availableJobsCount > 0 ? availableJobsCount : undefined,
      badgeColor: 'bg-emerald-600 text-white animate-pulse',
    },
    {
      id: 'my-designs',
      label: 'Products & Catalog',
      icon: <Palette className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: 'Commissions Log',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'earnings',
      label: 'Earnings & Payouts',
      icon: <Coins className="w-4 h-4" />,
    },
    {
      id: 'profile',
      label: 'Craftsman Profile',
      icon: <User className="w-4 h-4" />,
    },
  ];

  return (
    <div className="h-screen w-screen bg-[#FFFDF9] text-[#17243B] flex flex-col font-sans overflow-hidden staff-portal select-none">
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
          className={`fixed inset-y-0 left-0 w-[280px] bg-[#FFFDF9] text-[#17243B] z-50 flex flex-col justify-between transition-transform duration-300 lg:hidden shadow-2xl border-r border-[#E8D7B7] ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#FFF9F0] text-[#17345C] font-bold border-l-4 border-[#B88732] shadow-2xs'
                        : 'text-[#687386] hover:bg-[#FFF9F0] hover:text-[#17345C]'
                    }`}
                  >
                    <span className={isActive ? 'text-[#B88732]' : 'text-[#687386]'}>
                      {item.icon}
                    </span>
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {item.badge && item.badge > 0 ? (
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${item.badgeColor || 'bg-[#17345C] text-[#FFF9F0]'}`}>
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
                src={staff.avatar}
                alt={staff.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-[#D9B66F]"
              />
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-serif font-bold text-[#17345C] truncate">{staff.name}</div>
                <div className="text-[10px] text-[#B88732] font-semibold truncate">{staff.role}</div>
              </div>
              <button onClick={handleLogout} className="text-[#687386] hover:text-rose-600 p-1">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Luxury Atelier Ivory Porcelain & Gold Desktop Sidebar */}
        <aside
          className={`h-full flex-shrink-0 bg-[#FFFDF9] text-[#17243B] border-r border-[#E8D7B7] hidden lg:flex flex-col justify-between transition-all duration-300 z-30 shadow-[4px_0_24px_rgba(23,52,92,0.05)] ${
            isSidebarCollapsed ? 'w-[76px]' : 'w-[260px]'
          }`}
        >
          {/* Top Brand Header */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-3.5 flex items-center justify-between border-b border-[#E8D7B7] bg-white/90 backdrop-blur-md whitespace-nowrap overflow-hidden flex-shrink-0">
              {!isSidebarCollapsed ? (
                <div className="flex items-center gap-2">
                  <BrandLogo variant="horizontal" size="sm" theme="light" />
                </div>
              ) : (
                <div className="mx-auto">
                  <BrandLogo variant="mark-only" size="sm" theme="light" />
                </div>
              )}
            </div>

            {/* Sub-label banner */}
            {!isSidebarCollapsed && (
              <div className="px-4 py-2 bg-[#FFF9F0] border-b border-[#E8D7B7] flex items-center justify-between text-[10px] text-[#B88732] font-mono tracking-widest uppercase">
                <span className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3 h-3 text-[#B88732]" />
                  Craftsman Atelier
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            )}

            {/* Navigation Rail Links */}
            <nav className="p-3 space-y-1.5 overflow-y-auto flex-1 custom-scrollbar">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all relative cursor-pointer ${
                      isActive
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
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold shadow-2xs ${
                          item.badgeColor || 'bg-[#17345C] text-[#FFF9F0]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            {/* Craftsman Workbench Load Mini-Card */}
            {!isSidebarCollapsed && (
              <div className="p-3.5 m-3 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] text-xs space-y-2 flex-shrink-0 shadow-2xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#17345C] font-semibold flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#B88732]" /> Capacity
                  </span>
                  <span className="text-[#B88732] font-bold font-mono">
                    {activeJobsCount} / {staff.maxJobLimit} Slots
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden border border-[#E8D7B7]/50">
                  <div
                    className="bg-gradient-to-r from-[#B88732] to-[#E8D7B7] h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (activeJobsCount / Math.max(1, staff.maxJobLimit)) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#687386] leading-snug">
                  Lead Modeler • {staff.rating}★ Rating
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Footer with LogOut & Collapse Toggle */}
          <div className="p-3 border-t border-[#E8D7B7] bg-[#FFF9F0]/80 backdrop-blur-md space-y-2.5 flex-shrink-0">
            {/* Collapse Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white border border-[#E8D7B7] hover:border-[#B88732] text-xs text-[#17345C] hover:bg-[#FFFDF9] transition-all shadow-2xs cursor-pointer"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
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

            {/* Profile Mini Card */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-[#E8D7B7] shadow-2xs">
              <img
                src={staff.avatar}
                alt={staff.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-[#D9B66F] shrink-0"
              />
              {!isSidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs font-serif font-bold text-[#17345C] truncate">
                    {staff.name}
                  </div>
                  <div className="text-[10px] text-[#B88732] font-semibold tracking-wide truncate">
                    {staff.role}
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                title="Log Out of Staff Portal"
                className="text-[#687386] hover:text-rose-600 transition-colors p-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Bar Navigation */}
          <header className="h-16 bg-white/95 backdrop-blur-md border-b border-[#E8D7B7] px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-20 shadow-xs">
            {/* Quick Command K Search bar */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 rounded-xl bg-[#17345C] text-[#FFF9F0] lg:hidden hover:bg-[#112745] transition-colors shadow-sm cursor-pointer"
                title="Open Staff Menu"
              >
                <Menu className="w-5 h-5 text-[#D9B66F]" />
              </button>

              <button
                onClick={() => setShowCommandPalette(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FFF9F0] hover:bg-white text-[#687386] text-xs transition-all border border-[#E8D7B7] hover:border-[#D9B66F] w-44 sm:w-64 shadow-2xs cursor-pointer justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-[#B88732] shrink-0" />
                  <span className="truncate">Search CAD jobs...</span>
                </div>
                <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white text-[10px] font-mono text-[#17345C] border border-[#E8D7B7]">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3">
              {/* Capacity Slot Dots Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF9F0] text-[#17345C] text-xs border border-[#E8D7B7] shadow-2xs">
                <Briefcase className="w-3.5 h-3.5 text-[#B88732]" />
                <span className="text-[#687386] text-[11px] font-medium hidden sm:inline">Workbench:</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: staff.maxJobLimit }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        idx < activeJobsCount
                          ? 'bg-[#B88732] shadow-[0_0_8px_rgba(184,135,50,0.6)]'
                          : 'bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[#B88732] font-mono font-bold text-xs ml-1">
                  {activeJobsCount}/{staff.maxJobLimit}
                </span>
              </div>

              {/* Monthly Earnings Chip */}
              <div
                onClick={() => onTabChange('earnings')}
                className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#FFF9F0] hover:bg-white border border-[#E8D7B7] hover:border-[#B88732] text-[#17345C] cursor-pointer transition-all shadow-2xs"
              >
                <Coins className="w-4 h-4 text-[#B88732]" />
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#687386] font-mono font-semibold">Monthly Earnings</div>
                  <div className="text-xs font-bold text-[#17345C] font-mono">₹{staff.totalEarnings.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl bg-[#FFF9F0] hover:bg-white text-[#17345C] border border-[#E8D7B7] hover:border-[#B88732] transition-colors shadow-2xs cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-[#17345C]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#17345C] text-[#FFF9F0] font-bold text-[9px] flex items-center justify-center shadow-md">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E8D7B7] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-2">
                      <h4 className="font-serif font-bold text-sm text-[#17345C]">Artisan Notifications</h4>
                      <button
                        onClick={() => {
                          onTabChange('notifications');
                          setShowNotifications(false);
                        }}
                        className="text-[11px] text-[#B88732] font-bold hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-[#687386] text-center py-4">No new notifications</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="p-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-xs space-y-1">
                            <div className="font-bold text-[#17345C] flex items-center justify-between">
                              <span>{n.title}</span>
                              <span className="text-[9px] text-[#687386] font-mono">{n.timestamp}</span>
                            </div>
                            <p className="text-[#687386] text-[11px]">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Exit to Main site button */}
              <button
                onClick={onBackToMain}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E8D7B7] hover:border-[#B88732] text-[#17345C] hover:text-[#B88732] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                title="Exit to Client Storefront"
              >
                <span>Exit to Site</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#B88732]" />
              </button>

              {/* Craftsman Profile Menu */}
              <div
                onClick={() => onTabChange('profile')}
                className="flex items-center gap-2 pl-2 cursor-pointer group"
                title="Open Profile Settings"
              >
                <img
                  src={staff.avatar}
                  alt={staff.name}
                  className="w-8 h-8 rounded-full border-2 border-[#D9B66F] object-cover shadow-2xs group-hover:scale-105 transition-transform"
                />
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-serif font-bold text-[#17345C] group-hover:text-[#B88732] transition-colors">
                    {staff.name}
                  </div>
                  <div className="text-[10px] text-[#687386] font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {staff.role}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Viewport Content */}
          <main className="flex-1 bg-[#FFFDF9] overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            {children}
          </main>
        </div>
      </div>

      {/* Command Palette Modal (Ctrl+K) */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-in fade-in"
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            className="bg-white border border-[#E8D7B7] rounded-2xl max-w-xl w-full p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7]">
              <Search className="w-4 h-4 text-[#B88732]" />
              <input
                type="text"
                autoFocus
                placeholder="Search staff sections or type a command..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[#17345C] focus:outline-none placeholder:text-[#687386]"
              />
              <button onClick={() => setShowCommandPalette(false)} className="text-[#687386] hover:text-[#17345C]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[11px] text-[#687386] px-2 font-mono uppercase font-semibold">
              Quick Shortcuts
            </div>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => {
                  onTabChange('job-pool');
                  setShowCommandPalette(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-[#FFF9F0] text-[#17345C] transition-colors flex items-center justify-between border border-transparent hover:border-[#E8D7B7]"
              >
                <span className="font-medium">Go to Job Pool (First-Wins)</span>
                <span className="text-[10px] font-mono text-[#B88732]">Jump →</span>
              </button>
              <button
                onClick={() => {
                  onTabChange('workbench');
                  setShowCommandPalette(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-[#FFF9F0] text-[#17345C] transition-colors flex items-center justify-between border border-transparent hover:border-[#E8D7B7]"
              >
                <span className="font-medium">View Velvet Workbench Tray</span>
                <span className="text-[10px] font-mono text-[#B88732]">Jump →</span>
              </button>
              <button
                onClick={() => {
                  onTabChange('earnings');
                  setShowCommandPalette(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-[#FFF9F0] text-[#17345C] transition-colors flex items-center justify-between border border-transparent hover:border-[#E8D7B7]"
              >
                <span className="font-medium">View Earnings &amp; Settlements</span>
                <span className="text-[10px] font-mono text-[#B88732]">Jump →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
