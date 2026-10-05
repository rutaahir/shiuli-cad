import React, { useState, useEffect } from 'react';
import { StaffMember } from '../../types';
import { api } from '../../services/api';
import {
  X,
  ShoppingBag,
  User,
  Mail,
  Phone,
  DollarSign,
  Clock,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  Gem,
  Tag,
  FileText,
  Percent,
  Check,
  Send,
  Trash2,
  XCircle,
  MapPin,
  Building,
  MessageSquare,
  MessageCircle,
  ExternalLink
} from 'lucide-react';

export const COMMON_CATEGORIES = [
  'Rings',
  'Solitaire Rings',
  'Band Rings',
  'Earrings',
  'Necklaces',
  'Pendants',
  'Bracelets & Bangles',
  'Bangles',
  'Bracelets',
  'Nosepins',
  'Mangalsutra',
  'Brooches',
  'Cufflinks',
  'Custom Bespoke'
];

export const COMMON_METALS = [
  'Platinum 950',
  '18K Yellow Gold',
  '18K White Gold',
  '18K Rose Gold',
  '14K Yellow Gold',
  '14K White Gold',
  '14K Rose Gold',
  '925 Sterling Silver',
  '22K Yellow Gold',
  'Dual Tone (18K White + Yellow)',
  'Custom Alloy'
];

export const ORDER_STATUS_CHOICES = [
  { value: 'in_design', label: 'In Open Pool (Awaiting Designer)' },
  { value: 'with_designer', label: 'With CAD Designer' },
  { value: 'pending_review', label: 'Pending Admin Quality Review (QC)' },
  { value: 'preview_ready', label: 'Design Preview Ready for Client' },
  { value: 'revision_requested', label: 'Changes Requested — In Revision' },
  { value: 'pending_final_payment', label: 'Pending Final Payment' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'awaiting_payment', label: 'Awaiting Booking Payment' },
];

export const RING_SIZE_STANDARDS = [
  { value: 'US', label: 'US / Canada' },
  { value: 'UK', label: 'UK / Australia / South Africa' },
  { value: 'IN', label: 'Indian Standard' },
  { value: 'EU', label: 'European / ISO' },
  { value: 'MM', label: 'Diameter (mm)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLACE ORDER FOR CUSTOMER MODAL (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminCreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOrder: any) => void;
  staffList: StaffMember[];
  initialValues?: any;
}

export const AdminCreateOrderModal: React.FC<AdminCreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  staffList,
  initialValues,
}) => {
  const [customerMode, setCustomerMode] = useState<'new' | 'existing'>('new');
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState<boolean>(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Customer Details
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientTelegram, setClientTelegram] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');

  // Jewelry & Order Specs
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('Rings');
  const [metalAlloy, setMetalAlloy] = useState<string>('18K Yellow Gold');
  const [ringSize, setRingSize] = useState<string>('');
  const [ringSizeStandard, setRingSizeStandard] = useState<string>('US');
  const [targetWeightGrams, setTargetWeightGrams] = useState<string>('');
  const [gemstoneNotes, setGemstoneNotes] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [neededByDate, setNeededByDate] = useState<string>('');

  // Commercials & Deadlines
  const [totalPrice, setTotalPrice] = useState<string>('250.00');
  const [commissionPct, setCommissionPct] = useState<number>(20);
  const [advanceAmount, setAdvanceAmount] = useState<string>('50.00');
  const [advancePaid, setAdvancePaid] = useState<boolean>(true);
  const [deadlineHours, setDeadlineHours] = useState<number>(72);
  const [assignedStaffId, setAssignedStaffId] = useState<string>('');
  const [adminCallNotes, setAdminCallNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingClients(true);
      api
        .getAdminClients()
        .then((res) => {
          if (Array.isArray(res)) setClients(res);
        })
        .catch(() => {})
        .finally(() => setLoadingClients(false));

      // Apply initial values if provided
      if (initialValues) {
        if (initialValues.client_id || initialValues.clientId) {
          setSelectedClientId(String(initialValues.client_id || initialValues.clientId));
          setCustomerMode('existing');
        } else {
          setCustomerMode('new');
        }
        setClientName(initialValues.contact_name || initialValues.client_name || initialValues.clientName || '');
        setClientEmail(initialValues.contact_email || initialValues.client_email || initialValues.clientEmail || '');
        setClientPhone(initialValues.contact_phone || initialValues.client_phone || initialValues.clientPhone || '');
        setClientTelegram(initialValues.contact_telegram || initialValues.telegram_handle || initialValues.telegram || '');
        setCompanyName(initialValues.company_name || initialValues.company || '');
        setClientAddress(initialValues.client_address || initialValues.address || '');

        const initTitle = initialValues.special_instructions || initialValues.title || (initialValues.category_name ? `Bespoke ${initialValues.category_name}` : '');
        setTitle(initTitle);
        if (initialValues.category_name) setCategory(initialValues.category_name);
        else if (initialValues.category) setCategory(String(initialValues.category));

        if (initialValues.metal_alloy_name) setMetalAlloy(initialValues.metal_alloy_name);
        else if (initialValues.metal_alloy) setMetalAlloy(String(initialValues.metal_alloy));

        setRingSize(initialValues.ring_size || '');
        setRingSizeStandard(initialValues.ring_size_standard || 'US');
        setTargetWeightGrams(initialValues.target_weight_grams ? String(initialValues.target_weight_grams) : '');
        setDescription(initialValues.description || '');
        setNeededByDate(initialValues.needed_by_date || '');

        const initPrice = initialValues.agreed_price || initialValues.total_price || initialValues.estimated_price_shown;
        if (initPrice) {
          const numP = parseFloat(String(initPrice));
          if (!isNaN(numP) && numP > 0) {
            setTotalPrice(numP.toFixed(2));
            setAdvanceAmount((numP * 0.1).toFixed(2));
          }
        }
        setAdminCallNotes(initialValues.admin_call_notes || '');
      } else {
        // Reset defaults
        setCustomerMode('new');
        setSelectedClientId('');
        setClientName('');
        setClientEmail('');
        setClientPhone('');
        setClientTelegram('');
        setCompanyName('');
        setClientAddress('');
        setTitle('');
        setCategory('Rings');
        setMetalAlloy('18K Yellow Gold');
        setRingSize('');
        setRingSizeStandard('US');
        setTargetWeightGrams('');
        setGemstoneNotes('');
        setDescription('');
        setNeededByDate('');
        setTotalPrice('250.00');
        setCommissionPct(20);
        setAdvanceAmount('50.00');
        setAdvancePaid(true);
        setDeadlineHours(72);
        setAssignedStaffId('');
        setAdminCallNotes('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const numPrice = parseFloat(totalPrice) || 0;
  const commissionVal = Number(((numPrice * commissionPct) / 100).toFixed(2));
  const staffPayoutVal = Number(Math.max(0, numPrice - commissionVal).toFixed(2));

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const chosen = clients.find((c) => c.id.toString() === clientId);
    if (chosen) {
      setClientName(`${chosen.first_name || ''} ${chosen.last_name || ''}`.trim() || chosen.username);
      setClientEmail(chosen.email || '');
      setClientPhone(chosen.phone_number || '');
    }
  };

  const cleanPhoneForLink = clientPhone.replace(/\D/g, '');
  const cleanTelegramForLink = clientTelegram.replace(/^@/, '').replace(/\s+/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (customerMode === 'new') {
      if (!clientEmail.trim()) {
        setErrorMsg('Please enter customer email address.');
        return;
      }
      if (!clientName.trim()) {
        setErrorMsg('Please enter customer full name.');
        return;
      }
    } else {
      if (!selectedClientId) {
        setErrorMsg('Please choose an existing registered customer.');
        return;
      }
    }

    if (!title.trim()) {
      setErrorMsg('Please provide an Order / Design Title.');
      return;
    }

    if (numPrice <= 0) {
      setErrorMsg('Please enter a valid total order price greater than $0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        client_id: customerMode === 'existing' ? selectedClientId : undefined,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_telegram: clientTelegram.trim(),
        company_name: companyName.trim(),
        client_address: clientAddress.trim(),
        title: title.trim(),
        category: category,
        metal_alloy: metalAlloy,
        ring_size: ringSize.trim(),
        ring_size_standard: ringSizeStandard,
        target_weight_grams: targetWeightGrams ? parseFloat(targetWeightGrams) : null,
        description: [
          description.trim(),
          gemstoneNotes ? `Gemstone Specs: ${gemstoneNotes.trim()}` : '',
          companyName ? `Company/Brand: ${companyName.trim()}` : '',
          clientTelegram ? `Telegram: ${clientTelegram.trim()}` : '',
          clientAddress ? `Shipping/Studio Address: ${clientAddress.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
        needed_by_date: neededByDate || null,
        total_price: numPrice,
        admin_commission_percentage: commissionPct,
        advance_amount: parseFloat(advanceAmount) || Math.round(numPrice * 0.1),
        advance_paid: advancePaid,
        deadline_hours: deadlineHours,
        assigned_staff_id: assignedStaffId || null,
        admin_call_notes: adminCallNotes.trim(),
      };

      const created = await api.adminCreateOrder(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create order for customer:', err);
      setErrorMsg(err?.message || 'Failed to place order. Please review inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-[#E5E7EF] rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-[#1E2230] max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#12204D] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-wider">
                Admin Placement Desk
              </span>
              <span className="text-xs text-slate-500 font-mono">• Direct Order Entry &amp; Full Customer Spec</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E2230] tracking-tight mt-1 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#C9A227]" />
              Place Order for Customer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700 font-bold underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          
          {/* 1. CUSTOMER ALL DETAILS */}
          <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E5E7EF] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[#09112B] font-mono flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#C9A227]" /> Customer All Details &amp; Contact Records
              </span>
              <div className="flex rounded-lg bg-slate-200/80 p-0.5 text-[11px] font-mono font-semibold">
                <button
                  type="button"
                  onClick={() => setCustomerMode('new')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    customerMode === 'new' ? 'bg-white text-[#09112B] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  New Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    customerMode === 'existing' ? 'bg-white text-[#09112B] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Existing Registered ({clients.length})
                </button>
              </div>
            </div>

            {customerMode === 'existing' && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Customer Account *</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs font-medium focus:outline-none focus:border-[#C9A227]"
                >
                  <option value="">-- Choose Existing Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.username} — ({c.email}) {c.phone_number ? `• ${c.phone_number}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Vikram Malhotra"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Email *</label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone / WhatsApp Number</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+91 98201 00000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <Send className="w-3 h-3 text-sky-600" /> Telegram Handle / Phone
                </label>
                <input
                  type="text"
                  value={clientTelegram}
                  onChange={(e) => setClientTelegram(e.target.value)}
                  placeholder="@username or phone number"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <Building className="w-3 h-3 text-[#C9A227]" /> Company / Brand / Studio Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Royal Gems Atelier Ltd."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-500" /> Studio / Delivery Address
                </label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Street, City, State, Country, Zip"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>
          </div>

          {/* 2. ORDER & JEWELRY SPECIFICATIONS */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E7EF] space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#09112B] font-mono flex items-center gap-1.5">
              <Gem className="w-4 h-4 text-[#C9A227]" /> Jewellery Design Specifications
            </span>

            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Order Title / Item Description *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Royal Nizam Solitaire Diamond Ring with Micropave Halo"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs font-semibold focus:outline-none focus:border-[#C9A227]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Jewellery Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                >
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Metal Alloy &amp; Purity *</label>
                <select
                  value={metalAlloy}
                  onChange={(e) => setMetalAlloy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                >
                  {COMMON_METALS.map((met) => (
                    <option key={met} value={met}>
                      {met}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Ring Size</label>
                <input
                  type="text"
                  value={ringSize}
                  onChange={(e) => setRingSize(e.target.value)}
                  placeholder="e.g. 7, 14, 52, 17.3"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Size Standard</label>
                <select
                  value={ringSizeStandard}
                  onChange={(e) => setRingSizeStandard(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                >
                  {RING_SIZE_STANDARDS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Target Metal Wt (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={targetWeightGrams}
                  onChange={(e) => setTargetWeightGrams(e.target.value)}
                  placeholder="e.g. 14.50"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Needed By Date</label>
                <input
                  type="date"
                  value={neededByDate}
                  onChange={(e) => setNeededByDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Gemstones &amp; Diamonds Architecture</label>
                <input
                  type="text"
                  value={gemstoneNotes}
                  onChange={(e) => setGemstoneNotes(e.target.value)}
                  placeholder="e.g. 2.0ct Oval Center + 42 micropave round D-F VS"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Design Brief &amp; Tolerances</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="CAD notes, prong style, wall thickness, hollow azures..."
                  className="w-full px-3.5 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>
          </div>

          {/* 3. COMMERCIALS, COMMISSION & DEADLINE */}
          <div className="p-4 rounded-2xl bg-[#09112B] text-white border border-[#D4AF37]/40 space-y-3 shadow-md">
            <span className="font-bold text-xs uppercase tracking-wider text-[#F5E7A3] font-mono flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#D4AF37]" /> Commercials, Payout &amp; Production Deadline
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Total Client Price ($) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-amber-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    placeholder="250.00"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 border border-white/20 font-mono font-bold text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Admin Commission (%)</label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">%</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 font-mono font-bold text-sm text-purple-300 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Staff Modeller Payout</label>
                <div className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-sm flex items-center justify-between">
                  <span>${staffPayoutVal.toFixed(2)}</span>
                  <span className="text-[10px] text-emerald-400">({100 - commissionPct}%)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-white/10">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Booking Deposit / Advance ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 border border-white/20 font-mono text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white select-none">
                  <input
                    type="checkbox"
                    checked={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Mark Booking Deposit as PAID now</span>
                </label>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Deadline Duration</label>
                <select
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(parseInt(e.target.value) || 72)}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-mono text-white focus:outline-none"
                >
                  <option value={24} className="bg-slate-900">24 Hours (Urgent Rush)</option>
                  <option value={48} className="bg-slate-900">48 Hours (Express)</option>
                  <option value={72} className="bg-slate-900">72 Hours (Standard 3-Day)</option>
                  <option value={96} className="bg-slate-900">96 Hours (4 Days)</option>
                  <option value={120} className="bg-slate-900">120 Hours (5 Days)</option>
                  <option value={168} className="bg-slate-900">7 Days (Standard Week)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. MODELLER WORKBENCH ASSIGNMENT */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#09112B] font-mono flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#C9A227]" /> Modeller Workbench Assignment
            </span>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Assign Directly or Release to Pool</label>
              <select
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs font-medium focus:outline-none focus:border-[#C9A227]"
              >
                <option value="">Release to Open Staff Pool (Any eligible designer can accept)</option>
                {staffList.map((stf) => (
                  <option key={stf.id} value={stf.id.replace('STF-', '')}>
                    Direct Assign: {stf.name} ({stf.role}) — {stf.currentLoad}/{stf.maxJobLimit} active jobs
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                If unassigned, the job appears in the Staff Pool immediately for designers to accept on first-come basis.
              </p>
            </div>
          </div>

          {/* 5. ADMIN CONSULTATION NOTES WITH WHATSAPP & TELEGRAM OPTIONS */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-amber-950 font-mono flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-700" /> Admin Consultation Notes &amp; CRM
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                  Private CRM
                </span>
              </div>

              {/* Direct WhatsApp & Telegram Action Links */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {cleanPhoneForLink && (
                  <a
                    href={`https://wa.me/${cleanPhoneForLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-mono font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                    title="Open WhatsApp chat"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                )}
                {(cleanTelegramForLink || cleanPhoneForLink) && (
                  <a
                    href={cleanTelegramForLink ? `https://t.me/${cleanTelegramForLink}` : `https://t.me/+${cleanPhoneForLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-600 text-white text-[10px] font-mono font-bold hover:bg-sky-700 transition-colors shadow-xs"
                    title="Open Telegram chat"
                  >
                    <Send className="w-3 h-3" />
                    <span>Telegram</span>
                  </a>
                )}
              </div>
            </div>

            {/* Quick Tag Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-mono text-amber-900/60 uppercase font-bold">Quick Tag:</span>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[💬 WhatsApp (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 transition-colors cursor-pointer flex items-center gap-1 font-bold"
              >
                <MessageSquare className="w-2.5 h-2.5 text-emerald-600" /> + WhatsApp Note
              </button>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[✈️ Telegram (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 transition-colors cursor-pointer flex items-center gap-1 font-bold"
              >
                <Send className="w-2.5 h-2.5 text-sky-600" /> + Telegram Note
              </button>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[📞 Phone Call (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-900 transition-colors cursor-pointer"
              >
                + Call Log
              </button>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[📝 Customer Spec Preference]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-900 transition-colors cursor-pointer"
              >
                + Spec Note
              </button>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[⏰ Delivery Commitment]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-900 transition-colors cursor-pointer"
              >
                + Delivery Note
              </button>
            </div>

            <textarea
              rows={3}
              value={adminCallNotes}
              onChange={(e) => setAdminCallNotes(e.target.value)}
              placeholder="Log customer consultation, Telegram discussions, WhatsApp chat commitments, or special order agreements here..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 text-xs focus:outline-none focus:border-amber-500 font-mono resize-y"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 flex items-center justify-between border-t border-[#E5E7EF]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-gold-luxury px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider shadow-md flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Place Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// 2. EDIT ALL ORDER DETAILS MODAL (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminEditOrderModalProps {
  isOpen: boolean;
  order: any;
  onClose: () => void;
  onSuccess: (updatedOrder: any) => void;
  staffList: StaffMember[];
  onCancelOrder?: (order: any) => void;
  onDeleteOrder?: (order: any) => void;
}

export const AdminEditOrderModal: React.FC<AdminEditOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess,
  staffList,
  onCancelOrder,
  onDeleteOrder,
}) => {
  const req = order?.custom_request;

  // Form states
  const [title, setTitle] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientTelegram, setClientTelegram] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');

  const [category, setCategory] = useState<string>('');
  const [metalAlloy, setMetalAlloy] = useState<string>('');
  const [ringSize, setRingSize] = useState<string>('');
  const [ringSizeStandard, setRingSizeStandard] = useState<string>('US');
  const [targetWeightGrams, setTargetWeightGrams] = useState<string>('');
  const [gemstoneNotes, setGemstoneNotes] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [neededByDate, setNeededByDate] = useState<string>('');

  const [totalPrice, setTotalPrice] = useState<string>('');
  const [commissionPct, setCommissionPct] = useState<number>(20);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advancePaid, setAdvancePaid] = useState<boolean>(false);
  const [deadlineHours, setDeadlineHours] = useState<number>(72);
  const [status, setStatus] = useState<string>('in_design');
  const [assignedStaffId, setAssignedStaffId] = useState<string>('');

  const [adminCallNotes, setAdminCallNotes] = useState<string>('');
  const [adminReviewNotes, setAdminReviewNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      const cr = order.custom_request;
      setTitle(cr?.special_instructions || (cr?.category_name ? `Bespoke ${cr.category_name}` : `Custom Order #${order.id}`));
      
      const cName = cr?.contact_name || (order.client?.first_name ? `${order.client.first_name} ${order.client.last_name || ''}`.trim() : order.client?.username || '');
      setClientName(cName);
      setClientEmail(cr?.contact_email || order.client?.email || '');
      setClientPhone(cr?.contact_phone || order.client?.phone_number || '');
      setClientTelegram(cr?.contact_telegram || cr?.telegram || order.client?.telegram || '');
      setCompanyName(cr?.company_name || cr?.company || '');
      setClientAddress(cr?.client_address || cr?.address || '');

      setCategory(cr?.category_name || (typeof cr?.category === 'string' ? cr.category : 'Rings'));
      setMetalAlloy(cr?.metal_alloy_name || (typeof cr?.metal_alloy === 'string' ? cr.metal_alloy : '18K Yellow Gold'));
      setRingSize(cr?.ring_size || '');
      setRingSizeStandard(cr?.ring_size_standard || 'US');
      setTargetWeightGrams(cr?.target_weight_grams ? String(cr.target_weight_grams) : '');
      setDescription(cr?.description || '');
      setNeededByDate(cr?.needed_by_date || '');

      setTotalPrice(order.total_price ? String(order.total_price) : '250.00');
      setCommissionPct(order.admin_commission_percentage != null ? Number(order.admin_commission_percentage) : 20);
      setAdvanceAmount(order.advance_amount ? String(order.advance_amount) : '0');
      setAdvancePaid(Boolean(order.advance_paid));
      setDeadlineHours(order.deadline_hours || 72);
      setStatus(order.status || 'in_design');
      setAssignedStaffId(order.assigned_staff?.id ? String(order.assigned_staff.id) : '');

      setAdminCallNotes(order.admin_call_notes || cr?.admin_call_notes || '');
      setAdminReviewNotes(order.admin_review_notes || '');
      setErrorMsg(null);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const numPrice = parseFloat(totalPrice) || 0;
  const commissionVal = Number(((numPrice * commissionPct) / 100).toFixed(2));
  const staffPayoutVal = Number(Math.max(0, numPrice - commissionVal).toFixed(2));

  const cleanPhoneForLink = clientPhone.replace(/\D/g, '');
  const cleanTelegramForLink = clientTelegram.replace(/^@/, '').replace(/\s+/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numPrice <= 0) {
      setErrorMsg('Price must be greater than $0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_telegram: clientTelegram.trim(),
        company_name: companyName.trim(),
        client_address: clientAddress.trim(),
        category: category,
        metal_alloy: metalAlloy,
        ring_size: ringSize.trim(),
        ring_size_standard: ringSizeStandard,
        target_weight_grams: targetWeightGrams ? parseFloat(targetWeightGrams) : null,
        description: description.trim(),
        needed_by_date: neededByDate || null,
        total_price: numPrice,
        admin_commission_percentage: commissionPct,
        advance_amount: parseFloat(advanceAmount) || 0,
        advance_paid: advancePaid,
        deadline_hours: deadlineHours,
        status: status,
        assigned_staff_id: assignedStaffId || null,
        admin_call_notes: adminCallNotes.trim(),
        admin_review_notes: adminReviewNotes.trim(),
      };

      const updated = await api.adminUpdateOrder(order.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update order:', err);
      setErrorMsg(err?.message || 'Failed to update order details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-[#E5E7EF] rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-[#1E2230] max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#12204D] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-wider">
                Admin Master Edit
              </span>
              <span className="text-xs text-slate-500 font-mono">• ORD-{order.id}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E2230] tracking-tight mt-1 flex items-center gap-2">
              Edit Master Order Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700 font-bold underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          
          {/* Customer Details */}
          <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E5E7EF] space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#09112B] font-mono flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#C9A227]" /> Customer Profile &amp; Contact Records
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <Send className="w-3 h-3 text-sky-600" /> Telegram Handle / Phone
                </label>
                <input
                  type="text"
                  value={clientTelegram}
                  onChange={(e) => setClientTelegram(e.target.value)}
                  placeholder="@username or phone"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <Building className="w-3 h-3 text-[#C9A227]" /> Company / Brand Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Royal Gems Atelier"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-500" /> Delivery Address
                </label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Street, City, Country, Zip"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>
          </div>

          {/* Design Specs */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E7EF] space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#09112B] font-mono flex items-center gap-1.5">
              <Gem className="w-4 h-4 text-[#C9A227]" /> Jewellery Specifications
            </span>

            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Order Title / Item Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs font-semibold focus:outline-none focus:border-[#C9A227]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                >
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Metal Alloy</label>
                <select
                  value={metalAlloy}
                  onChange={(e) => setMetalAlloy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                >
                  {COMMON_METALS.map((met) => (
                    <option key={met} value={met}>
                      {met}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Ring Size</label>
                <input
                  type="text"
                  value={ringSize}
                  onChange={(e) => setRingSize(e.target.value)}
                  placeholder="e.g. 7 / 17.3 mm"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Size Standard</label>
                <select
                  value={ringSizeStandard}
                  onChange={(e) => setRingSizeStandard(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                >
                  {RING_SIZE_STANDARDS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Target Weight (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={targetWeightGrams}
                  onChange={(e) => setTargetWeightGrams(e.target.value)}
                  placeholder="e.g. 14.50"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Needed By Date</label>
                <input
                  type="date"
                  value={neededByDate}
                  onChange={(e) => setNeededByDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Design Brief &amp; Tolerances</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Prong style, thickness, tolerance..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Commercials */}
          <div className="p-4 rounded-2xl bg-[#09112B] text-white border border-[#D4AF37]/40 space-y-3 shadow-md">
            <span className="font-bold text-xs uppercase tracking-wider text-[#F5E7A3] font-mono flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#D4AF37]" /> Commercials, Payout &amp; Production Deadline
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Total Client Price ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-amber-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 border border-white/20 font-mono font-bold text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Admin Commission (%)</label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">%</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 font-mono font-bold text-sm text-purple-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Staff Modeller Payout</label>
                <div className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-sm flex items-center justify-between">
                  <span>${staffPayoutVal.toFixed(2)}</span>
                  <span className="text-[10px] text-emerald-400">({100 - commissionPct}%)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-white/10">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Advance Deposit ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 border border-white/20 font-mono text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white select-none">
                  <input
                    type="checkbox"
                    checked={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Advance Deposit Paid</span>
                </label>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Deadline Duration (Hours)</label>
                <input
                  type="number"
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(parseInt(e.target.value) || 72)}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 font-mono text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Workflow Status & Assigned Modeller */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#09112B] font-mono flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#C9A227]" /> Production Lifecycle &amp; Assignment
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Current Order Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs font-semibold focus:outline-none focus:border-[#C9A227]"
                >
                  {ORDER_STATUS_CHOICES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned CAD Modeller</label>
                <select
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs font-medium focus:outline-none focus:border-[#C9A227]"
                >
                  <option value="">Unassigned / Open Pool (Staff claims from pool)</option>
                  {staffList.map((stf) => (
                    <option key={stf.id} value={stf.id.replace('STF-', '')}>
                      {stf.name} ({stf.role}) — {stf.currentLoad}/{stf.maxJobLimit} active jobs
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Admin Consultation & QC Notes with WhatsApp & Telegram */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-amber-950 font-mono flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-700" /> Admin Consultation &amp; QC Review Notes
              </span>

              {/* Direct links */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {cleanPhoneForLink && (
                  <a
                    href={`https://wa.me/${cleanPhoneForLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-mono font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                    title="Open WhatsApp chat"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                )}
                {(cleanTelegramForLink || cleanPhoneForLink) && (
                  <a
                    href={cleanTelegramForLink ? `https://t.me/${cleanTelegramForLink}` : `https://t.me/+${cleanPhoneForLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-600 text-white text-[10px] font-mono font-bold hover:bg-sky-700 transition-colors shadow-xs"
                    title="Open Telegram chat"
                  >
                    <Send className="w-3 h-3" />
                    <span>Telegram</span>
                  </a>
                )}
              </div>
            </div>

            {/* Quick Stamp Tag Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-mono text-amber-900/60 uppercase font-bold">Quick Tag:</span>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[💬 WhatsApp (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 transition-colors cursor-pointer flex items-center gap-1 font-bold"
              >
                <MessageSquare className="w-2.5 h-2.5 text-emerald-600" /> + WhatsApp
              </button>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[✈️ Telegram (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 transition-colors cursor-pointer flex items-center gap-1 font-bold"
              >
                <Send className="w-2.5 h-2.5 text-sky-600" /> + Telegram
              </button>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[📞 Phone Call (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-900 transition-colors cursor-pointer"
              >
                + Call Log
              </button>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[📝 Customer Spec Note]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-900 transition-colors cursor-pointer"
              >
                + Spec Note
              </button>
            </div>

            <div>
              <label className="font-semibold text-amber-900 block mb-1">Customer Consultation Notes</label>
              <textarea
                rows={2}
                value={adminCallNotes}
                onChange={(e) => setAdminCallNotes(e.target.value)}
                placeholder="Call logs, WhatsApp / Telegram notes, customer promises..."
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs focus:outline-none font-mono resize-y"
              />
            </div>

            <div>
              <label className="font-semibold text-amber-900 block mb-1">Admin QC Review Notes</label>
              <textarea
                rows={2}
                value={adminReviewNotes}
                onChange={(e) => setAdminReviewNotes(e.target.value)}
                placeholder="Quality inspection feedback or revision instructions for staff..."
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs focus:outline-none font-mono resize-y"
              />
            </div>
          </div>

          {/* Footer Action Buttons with Edit, Cancel & Delete */}
          <div className="pt-4 flex items-center justify-between border-t border-[#E5E7EF] flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {onCancelOrder && status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => onCancelOrder(order)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Cancel Order"
                >
                  <XCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cancel Order</span>
                </button>
              )}

              {onDeleteOrder && (
                <button
                  type="button"
                  onClick={() => onDeleteOrder(order)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Delete Order Permanently"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Order</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-gold-luxury px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Updates...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save All Order Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// 3. EDIT CUSTOM REQUEST / RFQ MODAL (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminEditCustomRequestModalProps {
  isOpen: boolean;
  requestItem: any;
  onClose: () => void;
  onSuccess: (updated: any) => void;
  onConvertToOrder?: (req: any) => void;
  onCancelRequest?: (req: any) => void;
  onDeleteRequest?: (req: any) => void;
}

export const AdminEditCustomRequestModal: React.FC<AdminEditCustomRequestModalProps> = ({
  isOpen,
  requestItem,
  onClose,
  onSuccess,
  onConvertToOrder,
  onCancelRequest,
  onDeleteRequest,
}) => {
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [category, setCategory] = useState<string>('Rings');
  const [metalAlloy, setMetalAlloy] = useState<string>('18K Yellow Gold');
  const [ringSize, setRingSize] = useState<string>('');
  const [ringSizeStandard, setRingSizeStandard] = useState<string>('US');
  const [targetWeightGrams, setTargetWeightGrams] = useState<string>('');
  const [neededByDate, setNeededByDate] = useState<string>('');
  const [budgetRange, setBudgetRange] = useState<string>('');
  const [agreedPrice, setAgreedPrice] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [status, setStatus] = useState<string>('new');
  const [adminCallNotes, setAdminCallNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (requestItem) {
      setContactName(requestItem.contact_name || requestItem.client_name || '');
      setContactPhone(requestItem.contact_phone || '');
      setContactEmail(requestItem.contact_email || '');
      setCategory(requestItem.category_name || (typeof requestItem.category === 'string' ? requestItem.category : 'Rings'));
      setMetalAlloy(requestItem.metal_alloy_name || (typeof requestItem.metal_alloy === 'string' ? requestItem.metal_alloy : '18K Yellow Gold'));
      setRingSize(requestItem.ring_size || '');
      setRingSizeStandard(requestItem.ring_size_standard || 'US');
      setTargetWeightGrams(requestItem.target_weight_grams ? String(requestItem.target_weight_grams) : '');
      setNeededByDate(requestItem.needed_by_date || '');
      setBudgetRange(requestItem.budget_range || '');
      setAgreedPrice(requestItem.agreed_price ? String(requestItem.agreed_price) : requestItem.estimated_price_shown ? String(requestItem.estimated_price_shown) : '');
      setDescription(requestItem.description || '');
      setSpecialInstructions(requestItem.special_instructions || '');
      setStatus(requestItem.status || 'new');
      setAdminCallNotes(requestItem.admin_call_notes || '');
      setErrorMsg(null);
    }
  }, [requestItem]);

  if (!isOpen || !requestItem) return null;

  const cleanPhoneForLink = contactPhone.replace(/\D/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        category: category,
        metal_alloy: metalAlloy,
        ring_size: ringSize.trim(),
        ring_size_standard: ringSizeStandard,
        target_weight_grams: targetWeightGrams ? parseFloat(targetWeightGrams) : null,
        needed_by_date: neededByDate || null,
        budget_range: budgetRange.trim(),
        agreed_price: agreedPrice ? parseFloat(agreedPrice) : null,
        description: description.trim(),
        special_instructions: specialInstructions.trim(),
        status: status,
        admin_call_notes: adminCallNotes.trim(),
      };

      const updated = await api.updateCustomRequest(requestItem.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update custom request:', err);
      setErrorMsg(err?.message || 'Failed to update custom request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-[#E5E7EF] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-[#1E2230] max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#12204D] text-[#F5E7A3] text-[10px] font-mono font-bold uppercase tracking-wider">
                Custom Request Editor
              </span>
              <span className="text-xs text-slate-500 font-mono">• REQ #{requestItem.id}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E2230] tracking-tight mt-1 flex items-center gap-2">
              Edit Custom Request &amp; Client Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700 font-bold underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          
          {/* Customer Details */}
          <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E5E7EF] space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#09112B] font-mono flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#C9A227]" /> Client Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EF] text-xs focus:outline-none focus:border-[#C9A227]"
                />
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E7EF] space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#09112B] font-mono flex items-center gap-1.5">
              <Gem className="w-4 h-4 text-[#C9A227]" /> Design Specifications &amp; Commercials
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                >
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Metal Alloy</label>
                <select
                  value={metalAlloy}
                  onChange={(e) => setMetalAlloy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                >
                  {COMMON_METALS.map((met) => (
                    <option key={met} value={met}>
                      {met}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Ring Size</label>
                <input
                  type="text"
                  value={ringSize}
                  onChange={(e) => setRingSize(e.target.value)}
                  placeholder="e.g. 7"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Size Standard</label>
                <select
                  value={ringSizeStandard}
                  onChange={(e) => setRingSizeStandard(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                >
                  {RING_SIZE_STANDARDS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Target Weight (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={targetWeightGrams}
                  onChange={(e) => setTargetWeightGrams(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Needed By Date</label>
                <input
                  type="date"
                  value={neededByDate}
                  onChange={(e) => setNeededByDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Agreed / Quoted Price (₹ / $)</label>
                <input
                  type="number"
                  step="0.01"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs font-mono font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Budget Range</label>
                <input
                  type="text"
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value)}
                  placeholder="e.g. ₹20,000 - ₹35,000"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2230] block mb-1">Pipeline Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs font-semibold focus:outline-none"
                >
                  <option value="new">New</option>
                  <option value="quoted">Price Quoted</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="agreed">Agreed &amp; Accepted</option>
                  <option value="rejected">Rejected / Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#1E2230] block mb-1">Client Design Brief</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E5E7EF] text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Consultation Notes with WhatsApp & Telegram */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-amber-950 font-mono flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-700" /> Admin Consultation Notes &amp; CRM Logs
              </span>

              {cleanPhoneForLink && (
                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://wa.me/${cleanPhoneForLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-mono font-bold hover:bg-emerald-700 transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`https://t.me/+${cleanPhoneForLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-600 text-white text-[10px] font-mono font-bold hover:bg-sky-700 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>Telegram</span>
                  </a>
                </div>
              )}
            </div>

            {/* Quick stamp pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-mono text-amber-900/60 uppercase font-bold">Quick Tag:</span>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[💬 WhatsApp (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 transition-colors cursor-pointer flex items-center gap-1 font-bold"
              >
                <MessageSquare className="w-2.5 h-2.5 text-emerald-600" /> + WhatsApp
              </button>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[✈️ Telegram (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 transition-colors cursor-pointer flex items-center gap-1 font-bold"
              >
                <Send className="w-2.5 h-2.5 text-sky-600" /> + Telegram
              </button>
              <button
                type="button"
                onClick={() => {
                  const stamp = `\n[📞 Phone Call (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})]: `;
                  setAdminCallNotes((prev) => (prev ? prev.trim() + '\n' + stamp : stamp.trimStart()));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-900 transition-colors cursor-pointer"
              >
                + Call Log
              </button>
            </div>

            <textarea
              rows={3}
              value={adminCallNotes}
              onChange={(e) => setAdminCallNotes(e.target.value)}
              placeholder="Private notes from phone consultation, WhatsApp chat, Telegram discussions..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 text-xs focus:outline-none font-mono resize-y"
            />
          </div>

          {/* Footer Action Buttons with Edit, Convert, Cancel & Delete */}
          <div className="pt-4 flex items-center justify-between border-t border-[#E5E7EF] flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {onConvertToOrder && (
                <button
                  type="button"
                  onClick={() => onConvertToOrder(requestItem)}
                  className="btn-gold-luxury px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Place Master Order</span>
                </button>
              )}

              {onCancelRequest && status !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => onCancelRequest(requestItem)}
                  className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Cancel / Reject Request"
                >
                  <XCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cancel Request</span>
                </button>
              )}

              {onDeleteRequest && (
                <button
                  type="button"
                  onClick={() => onDeleteRequest(requestItem)}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Delete Request Permanently"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#09112B] text-white hover:bg-[#12204D] font-bold uppercase text-xs tracking-wider shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-[#C9A227]" />
                    <span>Save Request Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
