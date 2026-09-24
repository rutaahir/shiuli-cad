import React, { useState, useEffect } from 'react';
import { PageId, AdminModuleId, StaffMember, AdminNotification, ActivityLogItem } from '../types';
import { appStore } from '../services/store';
import { api } from '../services/api';

import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminOverviewModule } from '../components/admin/AdminOverviewModule';
import { AdminCatalogModule } from '../components/admin/AdminCatalogModule';
import { AdminApprovalsModule } from '../components/admin/AdminApprovalsModule';
import { AdminCustomRequestsModule } from '../components/admin/AdminCustomRequestsModule';
import { AdminCustomOptionsModule } from '../components/admin/AdminCustomOptionsModule';
import { AdminStaffModule } from '../components/admin/AdminStaffModule';
import { AdminOrdersModule } from '../components/admin/AdminOrdersModule';
import { AdminPaymentsModule } from '../components/admin/AdminPaymentsModule';
import { AdminClientsModule } from '../components/admin/AdminClientsModule';
import { AdminAnalyticsModule } from '../components/admin/AdminAnalyticsModule';
import { AdminNotificationsModule } from '../components/admin/AdminNotificationsModule';
import { AdminSettingsModule } from '../components/admin/AdminSettingsModule';

import { AdminServicesModule } from '../components/admin/AdminServicesModule';
import { AdminFileEditsModule } from '../components/admin/AdminFileEditsModule';
import { AdminPortfolioModule } from '../components/admin/AdminPortfolioModule';
import { AdminContactModule } from '../components/admin/AdminContactModule';
import { AuthModal } from '../components/AuthModal';

interface SuperAdminPageProps {
  onNavigate: (page: PageId, extraId?: string) => void;
  initialTab?: AdminModuleId;
}

export const SuperAdminPage: React.FC<SuperAdminPageProps> = ({ onNavigate, initialTab }) => {
  const [activeModule, setActiveModuleState] = useState<AdminModuleId>(initialTab || 'overview');

  // Sync state from URL tab param if initialTab changes
  useEffect(() => {
    if (initialTab && initialTab !== activeModule) {
      setActiveModuleState(initialTab);
    }
  }, [initialTab]);

  const setActiveModule = (mod: AdminModuleId) => {
    setActiveModuleState(mod);
    onNavigate('admin', mod);
  };

  // Shared Admin State from appStore (Persisted!)
  const [staffList, setStaffList] = useState<StaffMember[]>(() => appStore.getStaffList());
  const [notifications, setNotifications] = useState<AdminNotification[]>(() => appStore.getNotifications());
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() => appStore.getActivityLogs());

  // Fetch live staff on mount to keep all admin modules synchronized
  useEffect(() => {
    api.getStaffList()
      .then((data: any) => {
        const rawList = Array.isArray(data) ? data : (data?.results || []);
        if (rawList.length > 0) {
          const mapped: StaffMember[] = rawList.map((item: any) => ({
            id: item.id.toString(),
            name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.username,
            email: item.email,
            phone: item.phone_number || '+91 98765 00000',
            avatar: item.profile_photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
            role: item.specialty_tags || 'CAD Modeller',
            status: item.is_active_staff ? 'active' : 'inactive',
            maxJobLimit: item.max_concurrent_jobs || 2,
            currentLoad: item.current_load || 0,
            jobsCompleted: item.total_jobs_completed || 0,
            rating: item.rating_average ? parseFloat(item.rating_average) : 5.0,
            totalEarnings: 0,
            activeJobs: item.active_jobs || [],
          }));
          setStaffList(mapped);
          appStore.saveStaffList(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Assignment Rules & Escalation Timer State from appStore
  const initialSettings = appStore.getSettings();
  const [escalationTimerMinutes, setEscalationTimerMinutesState] = useState<number>(
    initialSettings.escalationTimerMinutes
  );
  const [assignmentMode, setAssignmentModeState] = useState<'first-accept' | 'least-loaded'>(
    initialSettings.assignmentMode
  );

  const setEscalationTimerMinutes = (min: number) => {
    setEscalationTimerMinutesState(min);
    appStore.saveSettings({ escalationTimerMinutes: min, assignmentMode });
  };

  const setAssignmentMode = (mode: 'first-accept' | 'least-loaded') => {
    setAssignmentModeState(mode);
    appStore.saveSettings({ escalationTimerMinutes, assignmentMode: mode });
  };

  const handleUpdateStaffLimit = (staffId: string, newLimit: number) => {
    const updated = appStore.updateStaffLimit(staffId, newLimit);
    setStaffList(updated);
  };

  const handleToggleStaffStatus = (staffId: string) => {
    const updated = appStore.toggleStaffStatus(staffId);
    setStaffList(updated);
  };

  const handleAddStaff = (newStaff: StaffMember) => {
    const updated = appStore.addStaff(newStaff);
    setStaffList(updated);
  };

  const handleDeleteStaff = (staffId: string) => {
    const updated = appStore.deleteStaff(staffId);
    setStaffList(updated);
  };

  const handleMarkNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    appStore.saveNotifications(updated);
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    appStore.saveNotifications(updated);
  };

  const handlePostAnnouncement = (title: string, message: string) => {
    const newNotif: AdminNotification = {
      id: `notif-${Date.now()}`,
      type: 'system',
      title: `[ANNOUNCEMENT] ${title}`,
      message,
      timestamp: 'Just now',
      read: false,
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    appStore.saveNotifications(updated);
  };

  return (
    <>
    <AdminLayout
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      notifications={notifications}
      onMarkNotificationRead={handleMarkNotificationRead}
      onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      onExitAdmin={() => onNavigate('home')}
    >
      {activeModule === 'overview' && (
        <AdminOverviewModule
          staffList={staffList}
          onSelectModule={setActiveModule}
          onUpdateStaffLimit={handleUpdateStaffLimit}
          escalationTimerMinutes={escalationTimerMinutes}
          activityLogs={activityLogs}
        />
      )}

      {activeModule === 'catalog' && <AdminCatalogModule />}

      {activeModule === 'services' && <AdminServicesModule />}

      {activeModule === 'file-edits' && <AdminFileEditsModule />}

      {activeModule === 'portfolio' && <AdminPortfolioModule />}

      {activeModule === 'approvals' && <AdminApprovalsModule />}

      {activeModule === 'custom-requests' && <AdminCustomRequestsModule />}

      {activeModule === 'custom-options' && <AdminCustomOptionsModule />}

      {activeModule === 'contact-inquiries' && <AdminContactModule />}

      {activeModule === 'orders' && <AdminOrdersModule staffList={staffList} />}

      {activeModule === 'staff' && (
        <AdminStaffModule
          staffList={staffList}
          onUpdateStaffLimit={handleUpdateStaffLimit}
          onToggleStaffStatus={handleToggleStaffStatus}
          onAddStaff={handleAddStaff}
          onDeleteStaff={handleDeleteStaff}
          escalationTimerMinutes={escalationTimerMinutes}
          onChangeEscalationTimer={setEscalationTimerMinutes}
          assignmentMode={assignmentMode}
          onChangeAssignmentMode={setAssignmentMode}
        />
      )}

      {activeModule === 'payments' && <AdminPaymentsModule />}

      {activeModule === 'clients' && <AdminClientsModule />}

      {activeModule === 'analytics' && <AdminAnalyticsModule />}

      {activeModule === 'notifications' && (
        <AdminNotificationsModule
          notifications={notifications}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onPostAnnouncement={handlePostAnnouncement}
        />
      )}

      {activeModule === 'settings' && <AdminSettingsModule />}
    </AdminLayout>
    <AuthModal />
    </>
  );
};
