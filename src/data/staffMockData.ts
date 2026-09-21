import {
  StaffMember,
  AvailableJob,
  StaffActiveJob,
  StaffSubmission,
  StaffEarningsRecord,
  AdminNotification,
} from '../types';

export const CURRENT_STAFF_MEMBER: StaffMember = {
  id: 'STF-102',
  name: 'Rahim Sheikh',
  email: 'rahim.sheikh@shiulicad.com',
  phone: '+91 98201 44829',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
  role: 'Lead Senior CAD Artisan',
  status: 'active',
  maxJobLimit: 2,
  currentLoad: 1,
  jobsCompleted: 142,
  rating: 4.95,
  totalEarnings: 485000,
  activeJobs: [
    {
      orderId: 'SCS-2026-089',
      designTitle: 'Nizam Royal Kundan Choker Suite',
      category: 'Necklace',
      acceptedAt: 'Today at 09:30 AM',
      deadline: 'In 36 Hours',
    },
  ],
};

export const INITIAL_AVAILABLE_JOBS: AvailableJob[] = [
  {
    id: 'JOB-901',
    orderNumber: 'SCS-2026-092',
    title: 'Royal Emerald & Solitaire Signet Ring',
    category: 'Rings',
    metalPreference: '18K Yellow Gold',
    agreedPayout: 18500,
    clientBudget: '₹1,40,000',
    releasedTimeAgo: '4 mins ago',
    deadlineHours: 48,
    referenceImage: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=800',
    description: 'Custom signet ring featuring a centered 2.5ct octagonal Zambian emerald framed by micro-pave EF VVS diamonds with filigree under-gallery.',
    specsSummary: {
      diamondCount: 42,
      ringSize: 'US 8.5 (18.5mm)',
      dimensions: '22mm x 18mm top face',
      weightEst: '16.5g in 18K Gold',
    },
    status: 'available',
  },
  {
    id: 'JOB-902',
    orderNumber: 'SCS-2026-094',
    title: 'Articulated South Sea Pearl Drop Earrings',
    category: 'Earrings',
    metalPreference: 'Platinum 950',
    agreedPayout: 14000,
    clientBudget: '₹95,000',
    releasedTimeAgo: '18 mins ago',
    deadlineHours: 36,
    referenceImage: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80&w=800',
    description: '3-tier flexible drop earrings supporting 12mm baroque pearls with marquise diamond leafy crowns.',
    specsSummary: {
      diamondCount: 28,
      dimensions: '48mm length drop',
      weightEst: '12.8g in Platinum',
    },
    status: 'available',
  },
  {
    id: 'JOB-903',
    orderNumber: 'SCS-2026-096',
    title: 'Polki Diamond Choker Link Module',
    category: 'Necklace',
    metalPreference: '22K Kundan Gold Foil',
    agreedPayout: 24000,
    clientBudget: '₹2,20,000',
    releasedTimeAgo: '42 mins ago',
    deadlineHours: 72,
    referenceImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
    description: 'Modular repeating link unit for bridal choker. Must ensure interlocking hinge tolerances for fluid neck wrap.',
    specsSummary: {
      diamondCount: 64,
      dimensions: '14mm x 14mm per link',
      weightEst: '44.0g total metal',
    },
    status: 'available',
  },
];

export const INITIAL_STAFF_ACTIVE_JOBS: StaffActiveJob[] = [];

export const INITIAL_STAFF_SUBMISSIONS: StaffSubmission[] = [];

export const INITIAL_STAFF_EARNINGS: StaffEarningsRecord[] = [];

export const STAFF_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'NOTIF-STF-01',
    type: 'approval',
    title: 'Design Approved! 🎉',
    message: 'Your custom upload "Victorian Rose Gold Bangle Set" was approved by Super Admin and added to the store.',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: 'NOTIF-STF-02',
    type: 'order',
    title: 'New High-Priority Job In Pool ⚡',
    message: 'Royal Emerald & Solitaire Signet Ring has been released into the Job Pool. Claim it before another artisan.',
    timestamp: '4 mins ago',
    read: false,
  },
  {
    id: 'NOTIF-STF-03',
    type: 'payment',
    title: 'Monthly Settlement Processed',
    message: '₹36,500 has been credited to your linked HDFC Bank account (Ref: TXN-BANK-994821).',
    timestamp: 'Yesterday at 5:00 PM',
    read: true,
  },
];
