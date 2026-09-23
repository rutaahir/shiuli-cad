export type PageId =
  | 'home'
  | 'collections'
  | 'product-detail'
  | 'custom-design'
  | 'file-editing'
  | 'ai-jewellery'
  | 'portfolio'
  | 'cad-service'
  | 'pricing'
  | 'how-it-works'
  | 'gallery'
  | 'about'
  | 'blog'
  | 'contact'
  | 'account'
  | 'admin'
  | 'staff-portal'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'secure-download';

export interface ServicePageFeatureData {
  id: number;
  icon: string;
  title: string;
  description: string;
  display_order: number;
}

export interface ServicePageGalleryImageData {
  id: number;
  image: string;
  caption: string;
  display_order: number;
}

export interface ServicePageData {
  id: number;
  slug: string;
  section: 'cad_service' | 'about';
  title: string;
  subtitle: string;
  hero_image?: string;
  intro_text: string;
  starting_price_usd?: string;
  starting_price_inr?: string;
  display_order: number;
  linked_category?: number;
  linked_category_name?: string;
  linked_category_slug?: string;
  cta_label: string;
  cta_target: 'custom_design' | 'collections' | 'file_editing' | 'contact';
  is_published: boolean;
  features: ServicePageFeatureData[];
  gallery: ServicePageGalleryImageData[];
}

export interface ModificationTypeData {
  id: number;
  key: string;
  label: string;
  description: string;
  base_price: string | number;
  icon: string;
  is_active: boolean;
  display_order: number;
}

export interface PortfolioImage {
  id?: number;
  image: string;
  caption?: string;
  display_order?: number;
}

export interface PortfolioItemData {
  id: number;
  title: string;
  category?: number;
  category_name?: string;
  category_slug?: string;
  is_ai_project?: boolean;
  is_custom_project?: boolean;
  primary_image?: string;
  gallery_images?: { id?: number; image: string; caption?: string }[];
  description: string;
  completed_date?: string;
  craftsman_note?: string;
  aspect_ratio?: string;
  is_featured?: boolean;
  is_published?: boolean;
  display_order?: number;
}


export interface ContactMessageData {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  ip_address?: string | null;
}

export type AdminModuleId =
  | 'overview'
  | 'catalog'
  | 'services'
  | 'file-edits'
  | 'portfolio'
  | 'approvals'
  | 'custom-requests'
  | 'custom-options'
  | 'contact-inquiries'
  | 'orders'
  | 'staff'
  | 'payments'
  | 'clients'
  | 'analytics'
  | 'notifications'
  | 'settings';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  status: 'active' | 'inactive';
  maxJobLimit: number;
  currentLoad: number;
  jobsCompleted: number;
  rating: number;
  totalEarnings: number;
  activeJobs: {
    orderId: string;
    designTitle: string;
    category: string;
    acceptedAt: string;
    deadline: string;
  }[];
}

export interface DesignApproval {
  id: string;
  title: string;
  category: string;
  designerId: string;
  designerName: string;
  designerAvatar: string;
  uploadedDate: string;
  thumbnail: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  fileFormats: string[];
  suggestedPrice: number;
  specs: {
    metalWeight18k: string;
    diamondCount: number;
    dimensions: string;
  };
}

export interface NegotiationMessage {
  id: string;
  sender: 'admin' | 'client';
  senderName: string;
  text: string;
  priceOffer?: number;
  timestamp: string;
}

export interface CustomNegotiation {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  jewelleryType: string;
  metalPreference: string;
  targetBudget: string;
  referenceImage: string;
  description: string;
  status: 'new' | 'quoted' | 'negotiating' | 'agreed' | 'rejected';
  currentQuote?: number;
  messages: NegotiationMessage[];
  createdAt: string;
  request_mode?: 'quick' | 'step_by_step' | string;
  voice_recording_url?: string;
  referenceProduct?: any;
  order?: any;
}

export interface SettlementRecord {
  id: string;
  staffId?: string;
  staffName: string;
  staffRole?: string;
  orderId?: string;
  orderNumber: string;
  designTitle: string;
  completedDate: string;
  completedAt?: string;
  payoutAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentMethod?: 'cash' | 'upi' | 'bank_transfer' | 'online' | 'cheque' | string;
  transactionRef?: string;
  notes?: string;
  status: 'unpaid' | 'partial' | 'settled';
  settledAt?: string;
}

export interface AdminNotification {
  id: string;
  type: 'order' | 'staff' | 'payment' | 'system' | 'approval';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface ActivityLogItem {
  id: string;
  user: string;
  userAvatar?: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'accept' | 'upload' | 'approval' | 'payment' | 'system';
}

export interface ProductSpecs {
  metalWeight18k: string;
  metalWeight14k: string;
  platinumWeight?: string;
  silverWeight?: string;
  metalWeightPlatinum?: string;
  metalWeightSilver?: string;
  diamondCount: number;
  diamondTotalWeight: string;
  dimensions: string;
  meshTriangles: string;
  tolerance: string;
  centerStone?: string;
  sideStones?: string;
  ringSizeStandard?: string;
  fingerSize?: string;
  settingType?: string;
  minimumWallThickness?: string;
}

export interface Product {
  id: string;
  dbId?: number | string;
  sku?: string;

  title: string;
  category: string;
  subcategory: string;
  price: number;
  originalPrice?: number;
  formats: ('3DM' | 'STL' | 'OBJ' | 'Render' | 'Video')[];
  images: string[];
  primaryImage: string;
  description: string;
  shortDescription: string;
  tags: string[];
  isBestseller?: boolean;
  isNew?: boolean;
  rating: number;
  reviewsCount: number;
  specs: ProductSpecs;
  castingTips?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
  image: string;
  tagline: string;
}

export interface CartItem {
  product: Product;
  license: 'standard' | 'commercial';
  price: number;
  quantity: number;
}

export interface OrderItem {
  product: Product;
  productTitle?: string;
  license: 'standard' | 'commercial';
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  items: OrderItem[];
  total: number;
  status: 'in_design' | 'with_modeler' | 'stl_qc' | 'completed';
  statusLabel: string;
  downloadName: string;
  downloadSize: string;
}

export interface CustomRequestForm {
  referenceImages: string[];
  jewelleryType: string;
  designStyle: string;
  metalPreference: string;
  stoneType: string;
  targetBudget: string;
  timeline: string;
  ringSize?: string;
  dimensions?: string;
  specialNotes: string;
  name: string;
  email: string;
  phone: string;
  country: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image: string;
  sketchImage?: string;
  description: string;
  tags: string[];
  specs: {
    weight: string;
    stones: string;
    rhinoFile: string;
  };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string[];
  readTime: string;
  date: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  coverImage: string;
  image?: string;
  tags: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  location: string;
  quote: string;
  avatar: string;
  rating: number;
  projectType: string;
}

export type StaffPortalTab =
  | 'workbench'
  | 'job-pool'
  | 'my-designs'
  | 'active-job'
  | 'history'
  | 'earnings'
  | 'profile'
  | 'notifications';

export interface AvailableJob {
  id: string;
  orderNumber: string;
  title: string;
  category: string;
  metalPreference: string;
  agreedPayout: number;
  clientBudget: string;
  releasedTimeAgo: string;
  deadlineHours: number;
  referenceImage: string;
  description: string;
  specsSummary: {
    diamondCount: number;
    ringSize?: string;
    dimensions?: string;
    weightEst: string;
  };
  claimedBy?: string;
  isSecuring?: boolean;
  status: 'available' | 'claimed';
  rawDetails?: any;
}

export interface StaffActiveJob {
  id: string;
  orderNumber: string;
  title: string;
  category: string;
  referenceImage: string;
  acceptedAt: string;
  deadline: string;
  hoursRemaining: number;
  payoutAmount: number;
  clientName: string;
  clientNotes: string;
  currentMilestone: 'Just Accepted' | 'Started' | 'Modeling' | 'Refining' | 'Ready for Delivery' | 'Pending Review';
  progressPercentage: number;
  deliverables?: {
    rhino3dm?: string;
    stlFile?: string;
    renders?: string[];
  };
  adminFeedback?: string;
  status: 'In Design' | 'With CAD Designer' | 'Completed';
}

export interface StaffSubmission {
  id: string;
  title: string;
  category: string;
  submittedAt: string;
  thumbnail: string;
  suggestedPrice: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  adminNote?: string;
  fileFormats: string[];
  specs: {
    metalWeight18k: string;
    diamondCount: number;
    dimensions: string;
  };
}

export interface StaffEarningsRecord {
  id: string;
  orderNumber: string;
  title: string;
  completedDate: string;
  amount: number;
  status: 'Settled' | 'Pending Settlement';
  settlementRef?: string;
  pdfUrl?: string;
}

export interface WaxSealState {
  active: boolean;
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
}

