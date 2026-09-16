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
  CheckCircle2,
  ExternalLink,
  Command,
  X,
  AlertTriangle,
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
      badgeColor: 'bg-[#D4AF37] text-[#0B1330]',
    },
    {
      id: 'job-pool',
      label: 'Job Pool (First-Wins)',
      icon: <Inbox className="w-4 h-4" />,
      badge: availableJobsCount > 0 ? availableJobsCount : undefined,
      badgeColor: 'bg-emerald-500 text-white animate-pulse',
    },
    {
      id: 'my-designs',
      label: 'My CAD Submissions',
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
    <div className="h-screen w-screen bg-[#F6F7FB] text-[#1E2230] flex flex-col font-sans selection:bg-[#D4AF37] selection:text-[#0B1330] overflow-hidden select-none">
      {/* Prototype Banner Header */}
      <div className="bg-[#09112B] border-b border-[#D4AF37]/30 px-4 py-1.5 text-center text-xs text-[#F5F1E8] flex items-center justify-between flex-shrink-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
          <span>
            <strong className="text-[#F5E7A3]">STAFF & CAD ARTISAN PORTAL (Internal Atelier)</strong> — Production requires session auth via <code className="bg-[#122254] px-1.5 py-0.5 rounded border border-[#D4AF37]/30 text-[#D4AF37]">/staff/login</code>.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[#C9C2A6]/70 text-[11px] font-mono">Single-Session Race Simulation</span>
          <button
            onClick={onBackToMain}
            className="text-[11px] font-bold text-[#D4AF37] hover:text-white underline flex items-center gap-1"
          >
            <span>Exit to Client Site</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Royal Sapphire & Gold Metallic Sidebar */}
        <aside
          className={`h-full flex-shrink-0 bg-gradient-to-b from-[#09112B] via-[#0B1536] to-[#060B1E] text-[#F5F1E8] border-r border-[#D4AF37]/25 flex flex-col justify-between transition-all duration-300 z-30 shadow-[10px_0_30px_rgba(0,0,0,0.5)] ${
            isSidebarCollapsed ? 'w-[76px]' : 'w-[260px]'
          }`}
        >
          {/* Top Brand Header */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-3.5 flex items-center justify-between border-b border-[#D4AF37]/20 bg-[#09112B]/80 backdrop-blur-md whitespace-nowrap overflow-hidden flex-shrink-0">
              {!isSidebarCollapsed ? (
                <div className="flex items-center gap-2">
                  <BrandLogo variant="horizontal" size="sm" />
                </div>
              ) : (
                <div className="mx-auto">
                  <BrandLogo variant="mark-only" size="sm" />
                </div>
              )}
            </div>

            {/* Sub-label banner */}
            {!isSidebarCollapsed && (
              <div className="px-4 py-2 bg-[#122254]/40 border-b border-[#D4AF37]/15 flex items-center justify-between text-[10px] text-[#D4AF37] font-mono tracking-widest uppercase">
                <span>Craftsman Atelier</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold shadow-[0_0_8px_rgba(212,175,55,0.4)] ${
                          item.badgeColor || 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#0B1330]'
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
              <div className="p-3.5 m-3 rounded-xl bg-gradient-to-br from-[#122254] to-[#0A122E] border border-[#D4AF37]/25 text-xs space-y-2 flex-shrink-0">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#C9C2A6] font-medium flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#D4AF37]" /> Capacity
                  </span>
                  <span className="text-[#F5E7A3] font-bold font-mono">
                    {activeJobsCount} / {staff.maxJobLimit} Slots
                  </span>
                </div>
                <div className="w-full bg-[#070D1E] rounded-full h-1.5 overflow-hidden border border-[#D4AF37]/20">
                  <div
                    className="bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] h-full transition-all duration-500"
                    style={{ width: `${(activeJobsCount / staff.maxJobLimit) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#C9C2A6]/70 leading-snug">
                  Lead Modeler • {staff.rating}★ Rating
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Footer with LogOut & Collapse Toggle */}
          <div className="p-3 border-t border-[#D4AF37]/20 bg-[#070D1E] space-y-2 flex-shrink-0">
            <button
              onClick={handleLogout}
              className={`p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 transition-all w-full flex items-center justify-center gap-2 text-xs font-semibold shadow-sm ${
                isSidebarCollapsed ? 'px-0' : ''
              }`}
              title="Log Out of Staff Portal"
            >
              <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
              {!isSidebarCollapsed && <span>Log Out</span>}
            </button>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg bg-[#122254]/60 hover:bg-[#D4AF37]/20 text-[#D4AF37] transition-colors w-full flex items-center justify-center gap-2 text-xs font-semibold"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse Rail</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Bar Navigation */}
          <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between flex-shrink-0 z-20 shadow-sm">
            {/* Quick Command K Search bar */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCommandPalette(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-500 text-xs transition-colors border border-slate-200 w-64"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="flex-1 text-left">Search CAD jobs, orders, specs...</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono text-slate-400 border border-slate-200">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-4">
              {/* Capacity Slot Dots Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#09112B] text-white text-xs border border-[#D4AF37]/40 shadow-sm">
                <Briefcase className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-slate-300 text-[11px] font-medium hidden sm:inline">Workbench:</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: staff.maxJobLimit }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        idx < activeJobsCount
                          ? 'bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)]'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[#F5E7A3] font-mono font-bold text-xs ml-1">
                  {activeJobsCount}/{staff.maxJobLimit}
                </span>
              </div>

              {/* Monthly Earnings Chip */}
              <div
                onClick={() => onTabChange('earnings')}
                className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#09112B] to-[#122254] border border-[#D4AF37]/40 text-white cursor-pointer hover:border-[#D4AF37] transition-all shadow-md"
              >
                <Coins className="w-4 h-4 text-[#D4AF37]" />
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#C9C2A6]/80 font-mono">Monthly Earnings</div>
                  <div className="text-xs font-bold text-[#F5E7A3] font-mono">₹{staff.totalEarnings.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-slate-600 border border-slate-200 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] text-[#0B1330] font-bold text-[9px] flex items-center justify-center shadow-md">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-fadeIn space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-serif font-bold text-sm text-[#0B1330]">Artisan Notifications</h4>
                      <button
                        onClick={() => onTabChange('notifications')}
                        className="text-[11px] text-[#D4AF37] font-bold hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                          <div className="font-bold text-[#0B1330] flex items-center justify-between">
                            <span>{n.title}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{n.timestamp}</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Craftsman Profile Menu & Logout */}
              <div className="flex items-center gap-3">
                <div
                  onClick={() => onTabChange('profile')}
                  className="flex items-center gap-2.5 pl-2 cursor-pointer group"
                >
                  <img
                    src={staff.avatar}
                    alt={staff.name}
                    className="w-8 h-8 rounded-full border-2 border-[#D4AF37] object-cover shadow-sm group-hover:scale-105 transition-transform"
                  />
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-[#0B1330] group-hover:text-[#D4AF37] transition-colors">
                      {staff.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {staff.role}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Log Out of Staff Dashboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-semibold border border-rose-200 transition-all shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Viewport Content */}
          <main className="flex-1 bg-[#F6F7FB] overflow-y-auto p-6 custom-scrollbar">
            {children}
          </main>
        </div>
      </div>

      {/* Command Palette Modal (Ctrl+K) */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-fadeIn"
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search CAD jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
              />
              <button onClick={() => setShowCommandPalette(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[11px] text-slate-400 px-2 font-mono uppercase font-semibold">
              Quick Shortcuts
            </div>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => {
                  onTabChange('job-pool');
                  setShowCommandPalette(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#09112B] hover:text-white transition-colors flex items-center justify-between"
              >
                <span>Go to Job Pool (First-Wins)</span>
                <span className="text-[10px] font-mono text-slate-400">Jump</span>
              </button>
              <button
                onClick={() => {
                  onTabChange('workbench');
                  setShowCommandPalette(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#09112B] hover:text-white transition-colors flex items-center justify-between"
              >
                <span>View Velvet Workbench Tray</span>
                <span className="text-[10px] font-mono text-slate-400">Jump</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
