import React, { useState } from 'react';
import { CartItem, PageId } from '../types';
import { X, Trash2, ShieldCheck, Download, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentGatewayModal } from './payment/PaymentGatewayModal';
import { OTPVerificationModal } from './delivery/OTPVerificationModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sendCadDownloadEmail } from '../services/emailService';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (index: number) => void;
  onUpdateLicense: (index: number, license: 'standard' | 'commercial') => void;
  onClearCart: () => void;
  onNavigate: (page: PageId) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onUpdateLicense,
  onClearCart,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [otpModalState, setOtpModalState] = useState<{
    isOpen: boolean;
    purchaseId: number;
    productTitle: string;
    maskedEmail: string;
    userEmail?: string;
    debugOtp?: string;
  }>({
    isOpen: false,
    purchaseId: 0,
    productTitle: '',
    maskedEmail: '',
    userEmail: '',
    debugOtp: '',
  });

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => {
    const unitPrice = item.license === 'commercial' ? item.product.price * 1.8 : item.product.price;
    return acc + unitPrice * item.quantity;
  }, 0);

  const discountAmount = (subtotal * discountPercent) / 100;
  const total = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'ROYAL10' || promoCode.trim().toUpperCase() === 'SHIULI') {
      setDiscountPercent(10);
      setPromoMessage('10% Royal Atelier Discount applied!');
    } else {
      setPromoMessage('Invalid code. Try "ROYAL10"');
    }
  };

  const { requireAuth } = useAuth();

  const handleCheckout = () => {
    requireAuth(() => {
      setIsPaymentModalOpen(true);
    }, {
      intent: 'purchase',
      message: 'Sign in to complete your CAD checkout & unlock secure downloads',
    });
  };

  const handlePaymentSuccess = async (_result: any) => {
    setIsPaymentModalOpen(false);
    
    const recipientEmail = user?.email || 'shahharshil3103@gmail.com';
    const mainTitle = items.length > 0 ? items[0].product.title : 'CAD File Package';

    try {
      let lastPurchaseId = 0;
      let lastMaskedEmail = '';
      for (const item of items) {
        const res = await api.post<any>('/payments/purchases/', {
          product_id: item.product.id,
          license_type: item.license === 'commercial' ? 'commercial' : 'atelier',
          payment_transaction_id: (_result && _result.transactionId) ? _result.transactionId : `TXN-CART-${Date.now()}`,
        });
        lastPurchaseId = res.purchase_id;
        lastMaskedEmail = res.masked_email;
      }

      setOtpModalState({
        isOpen: true,
        purchaseId: lastPurchaseId,
        productTitle: items.length > 1 ? `${mainTitle} (+${items.length - 1} items)` : mainTitle,
        maskedEmail: lastMaskedEmail || recipientEmail.replace(/(.{2})(.*)(?=@)/, '$1***'),
        userEmail: recipientEmail,
      });
    } catch (err: any) {
      console.error('Cart checkout purchase creation failed:', err);
    }
  };

  const handleOtpVerifiedSuccess = () => {
    setOtpModalState(prev => ({ ...prev, isOpen: false }));
    setOrderCompleted(true);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#1E4FA3', '#F5E7A3', '#FAF8F3'],
      });
    } catch {
      // Safe fallback if confetti canvas fails
    }
  };

  const handleSimulateDownload = () => {
    // Generate sample CAD package text file download
    const manifest = `SHIULI CAD STUDIO — INSTANT DOWNLOAD PACKAGE
Order ID: SCS-ORD-${Math.floor(100000 + Math.random() * 900000)}
Files included:
${items.map((it, i) => `  ${i + 1}. ${it.product.title}
     - Format: .3DM (Rhino 7/8 Native Layered Model)
     - Format: .STL (Watertight High-Res Mesh, 1.25% Casting Shrinkage Applied)
     - Format: .OBJ (Universal Quad Mesh)
     - 4K Studio Ray-traced Renders
     - License: ${it.license.toUpperCase()} PRODUCTION`).join('\n\n')}

Manufacturing Guarantee: 100% Watertight Solid Geometry. Zero non-manifold edges.
Support: hello@shiulicadstudio.com | Phone: +91 95747 87098`;

    const blob = new Blob([manifest], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shiuli_CAD_Files_Pack.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Dispatch real email via Gmail SMTP
    const firstTitle = items.length > 0 ? items[0].product.title : 'Master CAD Package';
    sendCadDownloadEmail(
      'socialbuzz31@gmail.com',
      items.length > 1 ? `${firstTitle} (+${items.length - 1} more items)` : firstTitle,
      ['.3DM (Rhino 8 Layered)', '.STL (Watertight Mesh)', '.OBJ (Universal Mesh)', '4K Renders'],
      window.location.origin
    ).catch((e) => console.warn('Background email dispatch notice:', e));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0B1330] border-l border-[#D4AF37]/30 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-[#D4AF37]/20 flex items-center justify-between bg-[#080E24]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="font-serif text-lg tracking-wider text-[#FAF8F3]">
                Your CAD File Bag ({items.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#C9C2A6] hover:text-[#FAF8F3] hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {orderCompleted ? (
              /* Success confirmation state */
              <div className="text-center py-10 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37] flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-[#F5E7A3]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl text-[#FAF8F3]">
                    Your CAD Files Are Ready!
                  </h3>
                  <p className="text-xs text-[#C9C2A6] max-w-xs mx-auto">
                    Payment confirmed. Instant download unlocked for Rhino .3DM, castable .STL meshes, and 4K renders.
                  </p>
                </div>

                {/* Download Simulator Button */}
                <button
                  onClick={handleSimulateDownload}
                  className="btn-gold-luxury w-full py-3.5 rounded-xl font-medium tracking-wider uppercase text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4 text-[#0B1330]" />
                  Download CAD Package (.ZIP)
                </button>

                <div className="p-4 rounded-xl bg-[#121F4D]/40 border border-[#D4AF37]/20 text-left text-xs space-y-2 text-[#C9C2A6]">
                  <p className="font-medium text-[#FAF8F3]">What’s Inside Your Download:</p>
                  <p>• Layered Rhino .3DM (Stone prongs, cutters, metal body)</p>
                  <p>• Watertight .STL (1.25% Shrinkage pre-compensated)</p>
                  <p>• Production Spec Sheet & Stone Count PDF</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onClearCart();
                      setOrderCompleted(false);
                      onClose();
                      onNavigate('account');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-[#D4AF37]/30 text-xs text-[#FAF8F3] hover:bg-[#121F4D]"
                  >
                    View In My Account
                  </button>
                  <button
                    onClick={() => {
                      onClearCart();
                      setOrderCompleted(false);
                      onClose();
                      onNavigate('collections');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#D4AF37]/20 text-xs text-[#F5E7A3] hover:bg-[#D4AF37]/30"
                  >
                    Browse More CAD
                  </button>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#121F4D]/50 border border-[#D4AF37]/20 flex items-center justify-center text-[#C9C2A6]">
                  <Sparkles className="w-6 h-6 text-[#D4AF37]/60" />
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-lg text-[#FAF8F3]">Your CAD bag is empty</p>
                  <p className="text-xs text-[#C9C2A6]">
                    Explore our ready-to-cast collections and bespoke files.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('collections');
                  }}
                  className="btn-gold-luxury px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                >
                  Explore Collections
                </button>
              </div>
            ) : (
              items.map((item, idx) => {
                const currentPrice =
                  item.license === 'commercial' ? item.product.price * 1.8 : item.product.price;

                return (
                  <div
                    key={`${item.product.id}-${idx}`}
                    className="p-3.5 rounded-xl bg-[#0E183D] border border-[#D4AF37]/20 space-y-3"
                  >
                    <div className="flex gap-3">
                      <img
                        src={item.product.primaryImage}
                        alt={item.product.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-lg object-cover border border-[#D4AF37]/20 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-[#FAF8F3] line-clamp-1">
                          {item.product.title}
                        </h4>
                        <p className="text-[11px] text-[#C9C2A6] capitalize">
                          {item.product.category} • {item.product.specs.diamondCount} Stones
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#121F4D] text-[#D4AF37] border border-[#D4AF37]/20">
                            3DM + STL
                          </span>
                          <span className="text-xs font-semibold text-[#F5E7A3]">
                            ₹{Math.round(currentPrice * 84).toLocaleString('en-IN')} <span className="text-[10px] text-[#C9C2A6] font-normal font-sans">(${currentPrice.toFixed(0)} USD)</span>
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveItem(idx)}
                        className="text-[#C9C2A6] hover:text-red-400 p-1 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer / Summary */}
          {items.length > 0 && !orderCompleted && (
            <div className="p-5 border-t border-[#D4AF37]/20 bg-[#080E24] space-y-4">
              {/* Promo code */}
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo (use ROYAL10)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[#0B1330] border border-[#D4AF37]/30 text-[#FAF8F3] uppercase placeholder-[#C9C2A6]/40 focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg border border-[#D4AF37]/40 text-xs text-[#F5E7A3] hover:bg-[#D4AF37]/10"
                >
                  Apply
                </button>
              </form>
              {promoMessage && (
                <p className="text-[11px] text-[#D4AF37] -mt-2">{promoMessage}</p>
              )}

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#C9C2A6]">
                  <span>Subtotal:</span>
                  <span>₹{Math.round(subtotal * 84).toLocaleString('en-IN')} (${subtotal.toFixed(0)} USD)</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount (10%):</span>
                    <span>-₹{Math.round(discountAmount * 84).toLocaleString('en-IN')} (-${discountAmount.toFixed(0)})</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold text-[#FAF8F3] pt-2 border-t border-white/5">
                  <span className="font-serif">Total Payable:</span>
                  <span className="text-[#F5E7A3]">₹{Math.round(total * 84).toLocaleString('en-IN')} INR <span className="text-xs font-sans text-[#C9C2A6] font-normal">(${total.toFixed(0)} USD)</span></span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="btn-gold-luxury w-full py-3 rounded-xl font-medium tracking-wider uppercase text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isCheckingOut ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-[#0B1330] border-t-transparent rounded-full animate-spin" />
                    Generating Instant CAD Links...
                  </span>
                ) : (
                  <>
                    <span>Confirm & Download Files</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#0B1330]" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-[#C9C2A6]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Instant Digital Delivery • Watertight Mesh Guarantee</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`CAD File Bag Checkout (${items.length} design${items.length > 1 ? 's' : ''})`}
        subtitle="Watertight 3DM & STL Mesh Bundle with Atelier Guarantee"
        amount={total}
        currency="USD"
        itemType="cart"
        orderDetails={{
          itemsCount: items.length,
          notes: items.map(i => `${i.product.title} (${i.license})`).join(', ')
        }}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={otpModalState.isOpen}
        onClose={() => setOtpModalState(prev => ({ ...prev, isOpen: false }))}
        purchaseId={otpModalState.purchaseId}
        productTitle={otpModalState.productTitle}
        maskedEmail={otpModalState.maskedEmail}
        userEmail={otpModalState.userEmail}
        debugOtp={otpModalState.debugOtp}
        onVerifiedSuccess={handleOtpVerifiedSuccess}
      />
    </div>
  );
};
