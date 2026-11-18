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
  Wallet,
  UserCheck,
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
  Menu,
  Pencil
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getOptimizedImageUrl } from '../../utils/imageHelper';
import { AdminProfileEditModal } from './AdminProfileEditModal';


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
  const [orderResults, setOrderResults] = useState<any[]>([]);
  const [customRequestResults, setCustomRequestResults] = useState<any[]>([]);
  const [fileEditResults, setFileEditResults] = useState<any[]>([]);
  const [isSearchingOrders, setIsSearchingOrders] = useState(false);

  // Editable Admin Profile State
  const { user } = useAuth();
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [adminCustomName, setAdminCustomName] = useState(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('shiuli_admin_custom_name') || '') : '';
  });
  const [adminTitle, setAdminTitle] = useState(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('shiuli_admin_title') || 'Head CAD Engineer') : 'Head CAD Engineer';
  });
  const [adminAvatar, setAdminAvatar] = useState<string | null>(() => {
    return user?.profile_photo || null;
  });

  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e?.detail) {
        if (e.detail.name) setAdminCustomName(e.detail.name);
        if (e.detail.title) setAdminTitle(e.detail.title);
        if (e.detail.avatar !== undefined) setAdminAvatar(e.detail.avatar);
      }
    };
    window.addEventListener('shiuli_admin_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('shiuli_admin_profile_updated', handleProfileUpdate);
  }, []);

  const userFullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '';
  const activeAdminName = adminCustomName || userFullName || user?.username || 'Harshil Shah';
  const activeAdminTitle = adminTitle || 'Head CAD Engineer';
  const activeAdminAvatar = adminAvatar || user?.profile_photo || null;

  const adminInitials = activeAdminName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || 'AD';


  useEffect(() => {
    if (!showCommandPalette || !searchQuery.trim()) {
      setOrderResults([]);
      setCustomRequestResults([]);
      setFileEditResults([]);
      setIsSearchingOrders(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOrders(true);
      const q = searchQuery.trim();
      const qLower = q.toLowerCase();
      const digitsMatches = q.match(/\d+/g);
      const searchNum = digitsMatches ? parseInt(digitsMatches[digitsMatches.length - 1], 10) : null;

      try {
        const [ordersRes, customReqsRes, fileEditsRes] = await Promise.allSettled([
          api.request<any>(`/orders/?search=${encodeURIComponent(q)}`),
          api.getCustomRequests(),
          api.getFileEditRequests(),
        ]);

        if (ordersRes.status === 'fulfilled') {
          const res = ordersRes.value;
          const list = Array.isArray(res) ? res : (res?.results || res?.data || []);
          setOrderResults(list);
        } else {
          setOrderResults([]);
        }

        if (customReqsRes.status === 'fulfilled') {
          const allReqs = (customReqsRes.value as any[]) || [];
          const matched = allReqs.filter((r: any) => {
            if (searchNum !== null && r.id === searchNum) return true;
            if (r.contact_name?.toLowerCase().includes(qLower)) return true;
            if (r.client?.username?.toLowerCase().includes(qLower)) return true;
            if (r.client?.email?.toLowerCase().includes(qLower)) return true;
            if (r.description?.toLowerCase().includes(qLower)) return true;
            return false;
          });
          setCustomRequestResults(matched);
        } else {
          setCustomRequestResults([]);
        }

        if (fileEditsRes.status === 'fulfilled') {
          const allEdits = (fileEditsRes.value as any[]) || [];
          const matched = allEdits.filter((e: any) => {
            if (searchNum !== null && e.id === searchNum) return true;
            if (e.client_name?.toLowerCase().includes(qLower)) return true;
            if (e.instructions?.toLowerCase().includes(qLower)) return true;
            return false;
          });
          setFileEditResults(matched);
        } else {
          setFileEditResults([]);
        }
      } catch (err) {
        setOrderResults([]);
        setCustomRequestResults([]);
        setFileEditResults([]);
      } finally {
        setIsSearchingOrders(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, showCommandPalette]);

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

  // Real-time pending notification counts for all admin tabs
  const [counts, setCounts] = useState<{
    approvals: number;
    'custom-requests': number;
    'file-edits': number;
    'contact-inquiries': number;
    orders: number;
    payments: number;
  }>({
    approvals: 0,
    'custom-requests': 0,
    'file-edits': 0,
    'contact-inquiries': 0,
    orders: 0,
    payments: 0,
  });

  // Track checked / seen counts per module in localStorage
  const [checkedCounts, setCheckedCounts] = useState<{ [key: string]: number }>(() => {
    try {
      const saved = localStorage.getItem('shiuli_admin_checked_tabs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const markTabAsChecked = (modId: AdminModuleId, countToStore?: number) => {
    const val = countToStore !== undefined ? countToStore : (counts[modId as keyof typeof counts] || 0);
    setCheckedCounts((prev) => {
      const updated = { ...prev, [modId]: val };
      try {
        localStorage.setItem('shiuli_admin_checked_tabs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const fetchAllCounts = async () => {
    try {
      // 1. Payments pending verification
      let paymentsCount = 0;
      try {
        const logs = await api.getGatewayLogs();
        paymentsCount = (logs || []).filter((p: any) => p.can_approve || p.raw_status === 'pending').length;
      } catch {}

      // 2. Custom Requests pending review or negotiation
      let customRequestsCount = 0;
      try {
        const reqs = await api.request<any>('/custom-requests/');
        const list = Array.isArray(reqs) ? reqs : reqs?.results || [];
        customRequestsCount = list.filter((r: any) => r.status === 'new' || r.status === 'negotiating').length;
      } catch {}

      // 3. Design Approvals queue (pending custom order review + pending staff catalog uploads + pending designer applications)
      let approvalsCount = 0;
      try {
        const [ordersRes, appsRes, prodsRes] = await Promise.allSettled([
          api.request<any>('/orders/'),
          api.getDesignerApplications('pending'),
          api.request<any>('/catalog/products/pending/?page_size=500'),
        ]);
        if (ordersRes.status === 'fulfilled') {
          const ordVal: any = ordersRes.value;
          const ordList = Array.isArray(ordVal) ? ordVal : ordVal?.results || [];
          approvalsCount += ordList.filter((o: any) => o.status === 'pending_review' || o.status === 'revision_requested').length;
        }
        if (appsRes.status === 'fulfilled') {
          const appVal: any = appsRes.value;
          const appList = Array.isArray(appVal) ? appVal : appVal?.results || [];
          approvalsCount += appList.length;
        }
        if (prodsRes.status === 'fulfilled') {
          const prodVal: any = prodsRes.value;
          const prodList = Array.isArray(prodVal) ? prodVal : prodVal?.results || [];
          approvalsCount += prodList.length;
        }
      } catch {}

      // 4. File Modifications pending
      let fileEditsCount = 0;
      try {
        const edits = await api.getFileEditRequests();
        fileEditsCount = (edits || []).filter((e: any) => e.status === 'pending' || e.status === 'new' || e.status === 'negotiating').length;
      } catch {}

      // 5. Contact Inquiries unread
      let contactCount = 0;
      try {
        const msgs = await api.getContactMessages();
        contactCount = (msgs || []).filter((m: any) => !m.is_read).length;
      } catch {}

      // 6. Master Orders needing attention (new / unassigned)
      let ordersCount = 0;
      try {
        const ords = await api.request<any>('/orders/');
        const oList = Array.isArray(ords) ? ords : ords?.results || [];
        ordersCount = oList.filter((o: any) => o.status === 'new' || !o.assigned_staff).length;
      } catch {}

      setCounts({
        approvals: approvalsCount,
        'custom-requests': customRequestsCount,
        'file-edits': fileEditsCount,
        'contact-inquiries': contactCount,
        orders: ordersCount,
        payments: paymentsCount,
      });
    } catch (err) {
      console.warn('Admin badge counts fetch notice:', err);
    }
  };

  useEffect(() => {
    fetchAllCounts();
    const interval = setInterval(fetchAllCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // When activeModule changes or counts update, mark the active module as checked so its badge disappears
  useEffect(() => {
    if (activeModule) {
      const current = counts[activeModule as keyof typeof counts] || 0;
      markTabAsChecked(activeModule, current);
    }
  }, [activeModule, counts]);

  const getBadgeNumber = (id: AdminModuleId): number | undefined => {
    if (id === 'notifications') {
      return unreadCount > 0 ? unreadCount : undefined;
    }

    const total = counts[id as keyof typeof counts] || 0;
    if (total <= 0) return undefined;

    // Disappear if admin is currently active on this module
    if (activeModule === id) return undefined;

    // Disappear if admin already checked this module and no new items arrived
    const checked = checkedCounts[id];
    if (checked !== undefined) {
      const unseen = total - checked;
      return unseen > 0 ? unseen : undefined;
    }

    return total > 0 ? total : undefined;
  };

  const handleSelectModule = (id: AdminModuleId) => {
    markTabAsChecked(id);
    onSelectModule(id);
  };

  const navItems: { id: AdminModuleId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'catalog', label: 'Categories & Products', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'file-edits', label: 'File Modifications', icon: <Sliders className="w-4 h-4" />, badge: getBadgeNumber('file-edits') },
    { id: 'portfolio', label: 'Portfolio Showcase', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'approvals', label: 'Design Approvals', icon: <CheckCircle2 className="w-4 h-4" />, badge: getBadgeNumber('approvals') },
    { id: 'custom-requests', label: 'Custom Requests', icon: <MessageSquare className="w-4 h-4" />, badge: getBadgeNumber('custom-requests') },
    { id: 'custom-options', label: 'Custom Design Options', icon: <Sliders className="w-4 h-4" /> },
    { id: 'contact-inquiries', label: 'Contact Inquiries', icon: <Mail className="w-4 h-4" />, badge: getBadgeNumber('contact-inquiries') },
    { id: 'orders', label: 'Master Orders', icon: <ShoppingBag className="w-4 h-4" />, badge: getBadgeNumber('orders') },
    { id: 'staff', label: 'Staff & Job Limits', icon: <Users className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments & Gateway', icon: <CreditCard className="w-4 h-4" />, badge: getBadgeNumber('payments') },
    { id: 'credits', label: 'Credits & Wallets', icon: <Wallet className="w-4 h-4" /> },
    { id: 'clients', label: 'Client Base', icon: <UserCheck className="w-4 h-4" /> },
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
                      handleSelectModule(item.id);
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
            <div
              onClick={() => setIsProfileEditOpen(true)}
              className="flex items-center gap-3 p-2 rounded-xl bg-white border border-[#E8D7B7] hover:border-[#B88732] hover:bg-amber-50/40 transition-all cursor-pointer group shadow-2xs"
              title="Click to edit admin profile"
            >
              <div className="relative flex-shrink-0">
                {activeAdminAvatar ? (
                  <img
                    src={getOptimizedImageUrl(activeAdminAvatar)}
                    alt={activeAdminName}
                    className="w-8 h-8 rounded-full object-cover border-2 border-[#D9B66F]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                      const parent = (e.target as HTMLElement).parentElement;
                      if (parent) {
                        const fb = parent.querySelector('.admin-init-fb-mob') as HTMLElement;
                        if (fb) fb.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div
                  className={`admin-init-fb-mob w-8 h-8 rounded-full bg-[#17345C] text-[#FFF9F0] font-serif font-bold text-xs flex items-center justify-center border-2 border-[#D9B66F] ${
                    activeAdminAvatar ? 'hidden' : 'flex'
                  }`}
                >
                  {adminInitials}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-serif font-bold text-[#17345C] truncate flex items-center gap-1.5">
                  <span className="truncate">{activeAdminName}</span>
                  <Pencil className="w-2.5 h-2.5 text-[#B88732] opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                <div className="text-[10px] text-[#B88732] font-semibold truncate">
                  {activeAdminTitle}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExitAdmin();
                }}
                title="Exit Admin"
                className="text-[#687386] hover:text-rose-600 p-1 transition-colors"
              >
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
                    onClick={() => handleSelectModule(item.id)}
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
                    {isSidebarCollapsed && item.badge && item.badge > 0 ? (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#D4AF37] ring-2 ring-white animate-pulse" />
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
            <div
              onClick={() => setIsProfileEditOpen(true)}
              title={isSidebarCollapsed ? `Edit Profile (${activeAdminName})` : 'Click to edit admin profile'}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-[#E8D7B7] hover:border-[#B88732] hover:bg-amber-50/40 transition-all shadow-2xs cursor-pointer group ${
                isSidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                {activeAdminAvatar ? (
                  <img
                    src={getOptimizedImageUrl(activeAdminAvatar)}
                    alt={activeAdminName}
                    className="w-8 h-8 rounded-full object-cover border-2 border-[#D9B66F]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                      const parent = (e.target as HTMLElement).parentElement;
                      if (parent) {
                        const fb = parent.querySelector('.admin-init-fb-desk') as HTMLElement;
                        if (fb) fb.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div
                  className={`admin-init-fb-desk w-8 h-8 rounded-full bg-[#17345C] text-[#FFF9F0] font-serif font-bold text-xs flex items-center justify-center border-2 border-[#D9B66F] ${
                    activeAdminAvatar ? 'hidden' : 'flex'
                  }`}
                >
                  {adminInitials}
                </div>
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs font-serif font-bold text-[#17345C] truncate flex items-center gap-1.5">
                    <span className="truncate">{activeAdminName}</span>
                    <Pencil className="w-2.5 h-2.5 text-[#B88732] opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <div className="text-[10px] text-[#B88732] font-semibold tracking-wide truncate">
                    {activeAdminTitle}
                  </div>
                </div>
              )}
              {!isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProfileEditOpen(true);
                  }}
                  title="Edit Admin Profile"
                  className="p-1 rounded-md text-[#687386] hover:text-[#B88732] hover:bg-[#FFF9F0] transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExitAdmin();
                }}
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
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#17243B]"
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
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#FAF8F5] text-left text-[#17243B] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[#17345C]">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#6B7280]">Jump to</span>
                  </button>
                ))}
              {/* Matching Orders & Requests */}
              {isSearchingOrders ? (
                <div className="p-3 text-center text-[11px] text-[#6B7280] flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
                  <span>Searching orders &amp; requests...</span>
                </div>
              ) : (orderResults.length > 0 || customRequestResults.length > 0 || fileEditResults.length > 0) ? (
                <div className="space-y-3 pt-2 border-t border-[#E8D7B7]/40">
                  {/* Orders */}
                  {orderResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1 font-mono text-[10px] uppercase text-[#6B7280] font-semibold flex items-center justify-between">
                        <span>Matching Master Orders</span>
                        <span className="text-[9px] text-[#B88732]">{orderResults.length} found</span>
                      </div>
                      {orderResults.map((order) => {
                        const orderCode = `SCS-2026-${String(order.id).padStart(4, '0')}`;
                        const clientName = order.client?.first_name
                          ? `${order.client.first_name} ${order.client.last_name || ''}`.trim()
                          : (order.custom_request?.contact_name || order.client?.username || 'Client');
                        const reqId = order.custom_request?.id
                          ? `REQ #${order.custom_request.id}`
                          : (order.file_edit_request?.id ? `FILE #${order.file_edit_request.id}` : '');

                        return (
                          <button
                            key={order.id}
                            onClick={() => {
                              onSelectModule('orders');
                              setShowCommandPalette(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#FAF8F5] text-left transition-colors border border-transparent hover:border-[#E8D7B7]/50"
                          >
                            <div className="flex items-center gap-2.5">
                              <ShoppingBag className="w-4 h-4 text-[#C9A227] shrink-0" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-[#17345C]">
                                    #{order.id} ({orderCode})
                                  </span>
                                  {reqId && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                      {reqId}
                                    </span>
                                  )}
                                  {order.is_deleted ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-red-100 text-red-800 border border-red-300">
                                      Deleted
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-slate-100 text-slate-700">
                                      {order.status}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#6B7280] line-clamp-1">
                                  Client: {clientName} • {order.product?.title || order.custom_request?.description || 'Custom CAD Order'}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-[#B88732] shrink-0">Open Master Orders →</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Custom Requests */}
                  {customRequestResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1 font-mono text-[10px] uppercase text-[#6B7280] font-semibold flex items-center justify-between">
                        <span>Matching Custom Requests</span>
                        <span className="text-[9px] text-[#B88732]">{customRequestResults.length} found</span>
                      </div>
                      {customRequestResults.map((req) => (
                        <button
                          key={req.id}
                          onClick={() => {
                            onSelectModule('custom-requests');
                            setShowCommandPalette(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#FAF8F5] text-left transition-colors border border-transparent hover:border-[#E8D7B7]/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <MessageSquare className="w-4 h-4 text-[#C9A227] shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#17345C]">
                                  REQ #{req.id}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                  {req.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#6B7280] line-clamp-1">
                                Contact: {req.contact_name || req.client?.username || 'Client'} • {req.description || 'Custom CAD Request'}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-[#B88732] shrink-0">Open Custom Requests →</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* File Modifications */}
                  {fileEditResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1 font-mono text-[10px] uppercase text-[#6B7280] font-semibold flex items-center justify-between">
                        <span>Matching File Modifications</span>
                        <span className="text-[9px] text-[#B88732]">{fileEditResults.length} found</span>
                      </div>
                      {fileEditResults.map((edit) => (
                        <button
                          key={edit.id}
                          onClick={() => {
                            onSelectModule('file-edits');
                            setShowCommandPalette(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#FAF8F5] text-left transition-colors border border-transparent hover:border-[#E8D7B7]/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <Sliders className="w-4 h-4 text-[#C9A227] shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#17345C]">
                                  FILE #{edit.id}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
                                  {edit.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#6B7280] line-clamp-1">
                                Client: {edit.client_name || 'Client'} • {edit.instructions || 'File Modification'}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-[#B88732] shrink-0">Open File Edits →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="p-3 border-t border-[#E8D7B7] bg-[#FAF8F5] flex items-center justify-between text-[11px] text-[#6B7280]">
              <span>Tip: Press `Esc` to exit command search</span>
              <span className="font-mono">Shiuli Admin OS v2.4</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Profile Edit Modal */}
      <AdminProfileEditModal
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
        onProfileUpdated={(name, title, avatar) => {
          setAdminCustomName(name);
          setAdminTitle(title);
          setAdminAvatar(avatar);
        }}
      />
    </div>
  );
};
