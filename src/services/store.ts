import {
  Product,
  StaffMember,
  DesignApproval,
  CustomNegotiation,
  AvailableJob,
  StaffActiveJob,
  StaffSubmission,
  AdminNotification,
  ActivityLogItem,
} from '../types';

// Storage Keys
const KEYS = {
  PRODUCTS: 'shiuli_store_products',
  STAFF_LIST: 'shiuli_store_staff_list',
  APPROVALS: 'shiuli_store_approvals',
  CUSTOM_REQUESTS: 'shiuli_store_custom_requests',
  AVAILABLE_JOBS: 'shiuli_store_available_jobs',
  ACTIVE_JOBS: 'shiuli_store_active_jobs',
  SUBMISSIONS: 'shiuli_store_submissions',
  NOTIFICATIONS: 'shiuli_store_notifications',
  ACTIVITY_LOGS: 'shiuli_store_activity_logs',
  SETTINGS: 'shiuli_store_settings',
};

// Safe JSON parser helper
function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save key ${key} to localStorage:`, e);
  }
}

const DEFAULT_STAFF: StaffMember[] = [
  {
    id: '6',
    name: 'Harshil Shah',
    email: 'shahharshil313@gmail.com',
    phone: '+91 98765 00000',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    role: 'MatrixGold Specialist',
    status: 'active',
    maxJobLimit: 3,
    currentLoad: 1,
    jobsCompleted: 14,
    rating: 4.95,
    totalEarnings: 0,
    activeJobs: [],
  },
  {
    id: '2',
    name: 'Rahul Sharma',
    email: 'rahul@shiuli.com',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    role: 'Diamond, Solitaire Rings, 3D Rhino',
    status: 'active',
    maxJobLimit: 3,
    currentLoad: 0,
    jobsCompleted: 24,
    rating: 4.9,
    totalEarnings: 0,
    activeJobs: [],
  },
  {
    id: '3',
    name: 'Ananya Patel',
    email: 'ananya@shiuli.com',
    phone: '+91 98765 43211',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    role: 'Modern, Antique Necklaces, Matrix Gold',
    status: 'active',
    maxJobLimit: 2,
    currentLoad: 0,
    jobsCompleted: 18,
    rating: 4.85,
    totalEarnings: 0,
    activeJobs: [],
  },
];

export const appStore = {
  // Products
  getProducts(): Product[] {
    return getStored<Product[]>(KEYS.PRODUCTS, []);
  },
  saveProducts(products: Product[]) {
    setStored(KEYS.PRODUCTS, products);
  },
  addProduct(product: Product) {
    const current = this.getProducts();
    const updated = [product, ...current];
    this.saveProducts(updated);
    return updated;
  },

  // Staff Members
  getStaffList(): StaffMember[] {
    const raw = getStored<StaffMember[]>(KEYS.STAFF_LIST, DEFAULT_STAFF);
    // If empty array was explicitly stored in localStorage, fallback to DEFAULT_STAFF
    const listToUse = (raw && raw.length > 0) ? raw : DEFAULT_STAFF;
    // Deduplicate by ID or Email
    const uniqueMap = new Map<string, StaffMember>();
    listToUse.forEach((s) => {
      const key = (s.id || s.email || '').toString().toLowerCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    });
    return Array.from(uniqueMap.values());
  },
  saveStaffList(staff: StaffMember[]) {
    const uniqueMap = new Map<string, StaffMember>();
    staff.forEach((s) => {
      const key = (s.id || s.email || '').toString().toLowerCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    });
    const uniqueList = Array.from(uniqueMap.values());
    setStored(KEYS.STAFF_LIST, uniqueList);
  },
  updateStaffLimit(staffId: string, limit: number) {
    const list = this.getStaffList().map((s) =>
      s.id === staffId ? { ...s, maxJobLimit: limit } : s
    );
    this.saveStaffList(list);
    return list;
  },
  toggleStaffStatus(staffId: string) {
    const list = this.getStaffList().map((s) =>
      s.id === staffId
        ? { ...s, status: (s.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive' }
        : s
    );
    this.saveStaffList(list);
    return list;
  },
  addStaff(newStaff: StaffMember) {
    const current = this.getStaffList();
    const exists = current.some(
      (s) => s.id === newStaff.id || (s.email && s.email.toLowerCase() === newStaff.email.toLowerCase())
    );
    if (exists) {
      const updated = current.map((s) =>
        s.id === newStaff.id || (s.email && s.email.toLowerCase() === newStaff.email.toLowerCase()) ? newStaff : s
      );
      this.saveStaffList(updated);
      return updated;
    }
    const list = [newStaff, ...current];
    this.saveStaffList(list);
    return list;
  },
  deleteStaff(staffId: string) {
    const current = this.getStaffList();
    const filtered = current.filter(
      (s) => s.id.toString() !== staffId.toString()
    );
    this.saveStaffList(filtered);

    // Also remove from local user accounts registry
    const accounts = this.getUserAccounts();
    const target = current.find((s) => s.id.toString() === staffId.toString());
    if (target?.email) {
      const filteredAccounts = accounts.filter(
        (acc) => acc.email.toLowerCase() !== target.email.toLowerCase()
      );
      setStored('shiuli_store_user_accounts', filteredAccounts);
    }
    return filtered;
  },

  // User Accounts Registry for Login
  getUserAccounts(): any[] {
    return getStored<any[]>('shiuli_store_user_accounts', []);
  },
  saveUserAccount(acc: { email: string; username?: string; password?: string; role: string; first_name?: string; last_name?: string; phone_number?: string }) {
    const list = this.getUserAccounts();
    const filtered = list.filter((u) => u.email.toLowerCase() !== acc.email.toLowerCase() && u.username?.toLowerCase() !== acc.username?.toLowerCase());
    const updated = [acc, ...filtered];
    setStored('shiuli_store_user_accounts', updated);
  },
  findUserByCredentials(usernameOrEmail: string, password?: string): any | null {
    const query = usernameOrEmail.trim().toLowerCase();
    const list = this.getUserAccounts();
    const match = list.find(
      (u) =>
        (u.email.toLowerCase() === query || u.username?.toLowerCase() === query) &&
        (!password || !u.password || u.password === password)
    );
    if (match) {
      return {
        id: match.id || 99,
        username: match.username || query.split('@')[0],
        email: match.email,
        first_name: match.first_name || 'Staff',
        last_name: match.last_name || 'Modeller',
        role: match.role || 'staff',
        is_staff: match.role === 'staff' || match.role === 'admin',
        is_active_staff: true,
      };
    }
    return null;
  },

  // Design Approvals
  getApprovals(): DesignApproval[] {
    return getStored<DesignApproval[]>(KEYS.APPROVALS, []);
  },
  saveApprovals(approvals: DesignApproval[]) {
    setStored(KEYS.APPROVALS, approvals);
  },

  // Custom Requests & Negotiations
  getCustomRequests(): CustomNegotiation[] {
    return getStored<CustomNegotiation[]>(KEYS.CUSTOM_REQUESTS, []);
  },
  saveCustomRequests(requests: CustomNegotiation[]) {
    setStored(KEYS.CUSTOM_REQUESTS, requests);
  },
  addCustomRequest(req: CustomNegotiation) {
    const list = [req, ...this.getCustomRequests()];
    this.saveCustomRequests(list);
    return list;
  },

  // Job Pool & Active Jobs
  getAvailableJobs(): AvailableJob[] {
    return getStored<AvailableJob[]>(KEYS.AVAILABLE_JOBS, []);
  },
  saveAvailableJobs(jobs: AvailableJob[]) {
    setStored(KEYS.AVAILABLE_JOBS, jobs);
  },

  getActiveJobs(): StaffActiveJob[] {
    return getStored<StaffActiveJob[]>(KEYS.ACTIVE_JOBS, []);
  },
  saveActiveJobs(jobs: StaffActiveJob[]) {
    setStored(KEYS.ACTIVE_JOBS, jobs);
  },

  // Submissions
  getSubmissions(): StaffSubmission[] {
    return getStored<StaffSubmission[]>(KEYS.SUBMISSIONS, []);
  },
  saveSubmissions(subs: StaffSubmission[]) {
    setStored(KEYS.SUBMISSIONS, subs);
  },

  // Notifications
  getNotifications(): AdminNotification[] {
    return getStored<AdminNotification[]>(KEYS.NOTIFICATIONS, []);
  },
  saveNotifications(notes: AdminNotification[]) {
    setStored(KEYS.NOTIFICATIONS, notes);
  },

  // Activity Logs
  getActivityLogs(): ActivityLogItem[] {
    return getStored<ActivityLogItem[]>(KEYS.ACTIVITY_LOGS, []);
  },
  saveActivityLogs(logs: ActivityLogItem[]) {
    setStored(KEYS.ACTIVITY_LOGS, logs);
  },

  // Settings
  getSettings() {
    return getStored(KEYS.SETTINGS, {
      escalationTimerMinutes: 15,
      assignmentMode: 'first-accept' as 'first-accept' | 'least-loaded',
      advancePaymentPercentage: 50,
    });
  },
  saveSettings(settings: { escalationTimerMinutes: number; assignmentMode: 'first-accept' | 'least-loaded'; advancePaymentPercentage?: number }) {
    setStored(KEYS.SETTINGS, settings);
  },
};
