import React, { useState } from 'react';
import { CartItem, PageId } from '../types';
import { X, Trash2, ShieldCheck, Download, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentGatewayModal } from './payment/PaymentGatewayModal';
import { OTPVerificationModal } from './delivery/OTPVerificationModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sendCadDownloadEmail } from '../services/emailService';
import { formatINR } from '../utils/currencyHelper';
import { useCustomerCountry, resolveDisplayPrice } from '../utils/countryContext';

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

  const { currentCountry, exchangeRates } = useCustomerCountry();

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => {
    const resolved = resolveDisplayPrice(item.product, item.license, currentCountry.code, exchangeRates);
    return acc + resolved.amount * item.quantity;
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

    if (_result?.isPendingVerification) {
      try {
        for (const item of items) {
          await api.post<any>('/payments/purchases/', {
            product_id: item.product.dbId || item.product.id,
            license_type: item.license === 'commercial' ? 'commercial' : 'atelier',
            payment_transaction_id: _result.transactionId || `TXN-CART-${Date.now()}`,
            payment_method: _result.method,
            payment_details: _result.paymentDetails,
            payment_screenshot: _result.screenshotUrl,
            auto_confirm: false,
            country: currentCountry.code,
          });
        }
      } catch (err) {
        console.error('Failed to create pending purchases:', err);
      }
      onClearCart();
      setOrderCompleted(true);
      return;
    }
    
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
    } catch (e) {
      // Confetti fallback
    }

    const recipientEmail = user?.email || 'shahharshil3103@gmail.com';
    items.forEach((item) => {
      sendCadDownloadEmail(
        recipientEmail,
        item.product.title,
        ['.3DM', '.STL'],
        'https://shiulicadstudio.com/downloads/sample-cad-pack.zip',
        'Master CAD Production Package'
      ).catch((err) => console.warn('Background CAD download email notification error:', err));
    });
  };

  const handleSimulateDownload = () => {
    const manifest = `SHIULI CAD STUDIO — MASTER CAD RELEASE PACKAGE
================================================================
Generated for: ${user?.email || 'Valued Atelier Jeweller'}
Date: ${new Date().toISOString()}
Order ID: SCS-ORD-${Math.floor(100000 + Math.random() * 900000)}
Files included:
${items.map((it, i) => `  ${i + 1}. ${it.product.title}
     - Format: .3DM (Rhino 7/8 Native Layered Model)
     - Format: .STL (Watertight High-Res Mesh, 1.25% Casting Shrinkage Applied)
     - Format: .OBJ (Universal Quad Mesh)
     - 4K Studio Ray-traced Renders
     - Package: Master CAD Production Files`).join('\n\n')}

Manufacturing Guarantee: 100% Watertight Solid Geometry. Zero non-manifold edges.
Support: hello@shiulicadstudio.com | Phone: +91 95747 87098`;

    const blob = new Blob([manifest], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shiuli-CAD-Package-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-md bg-gradient-to-b from-[#FFFDF9] via-[#FAF4E8] to-[#F5EAD6] border-l-2 border-[#E7CE97] shadow-[0_25px_70px_rgba(180,140,50,0.25)] flex flex-col text-[#0F264A]">
          {/* Header */}
          <div className="p-5 border-b border-[#EADAC0] flex items-center justify-between bg-white/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B88732]" />
              <h2 className="font-serif text-lg tracking-wider text-[#0F264A] font-bold">
                Your CAD File Bag ({items.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#6B5A3E] hover:text-[#0F264A] hover:bg-white rounded-full border border-[#E5D2B0] shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {orderCompleted ? (
              /* Success confirmation state */
              <div className="text-center py-10 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl text-[#0F264A] font-bold">
                    Your CAD Files Are Ready!
                  </h3>
                  <p className="text-xs text-[#526075] max-w-xs mx-auto">
                    Payment confirmed. Instant download unlocked for Rhino .3DM, castable .STL meshes, and 4K renders.
                  </p>
                </div>

                {/* Download Simulator Button */}
                <button
                  onClick={handleSimulateDownload}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#DFB35A] via-[#ECC976] to-[#C99834] text-[#0C2340] font-serif font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border border-[#FFF0BA] cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#0C2340]" />
                  Download CAD Package (.ZIP)
                </button>

                <div className="p-4 rounded-2xl bg-white border border-[#EADAC0] text-left text-xs space-y-2 text-[#526075] shadow-2xs">
                  <p className="font-bold text-[#0F264A]">What’s Inside Your Download:</p>
                  <p>• Layered Rhino .3DM (Stone prongs, cutters, metal body)</p>
                  <p>• Watertight .STL (1.25% Shrinkage pre-compensated)</p>
                  <p>• Production Spec Sheet &amp; Stone Count PDF</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onClearCart();
                      setOrderCompleted(false);
                      onClose();
                      onNavigate('account');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-[#EADAC0] bg-white text-xs text-[#0F264A] font-semibold hover:bg-[#FFF9F0] transition-colors cursor-pointer"
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
                    className="flex-1 py-2.5 rounded-xl bg-[#FFF9ED] border border-[#E2C898] text-xs text-[#B88732] font-semibold hover:bg-[#FAF4E8] transition-colors cursor-pointer"
                  >
                    Browse More CAD
                  </button>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-white border border-[#EADAC0] flex items-center justify-center text-[#B88732] shadow-2xs">
                  <Sparkles className="w-6 h-6 text-[#B88732]" />
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-lg font-bold text-[#0F264A]">Your CAD bag is empty</p>
                  <p className="text-xs text-[#697A91]">
                    Explore our ready-to-cast collections and bespoke files.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('collections');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DFB35A] via-[#ECC976] to-[#C99834] text-[#0C2340] font-serif font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all cursor-pointer border border-[#FFF0BA]"
                >
                  Explore Collections
                </button>
              </div>
            ) : (
              items.map((item, idx) => {
                const resolved = resolveDisplayPrice(
                  item.product,
                  item.license,
                  currentCountry.code,
                  exchangeRates
                );

                return (
                  <div
                    key={`${item.product.id}-${idx}`}
                    className="p-3.5 rounded-2xl bg-white/95 border border-[#EADAC0] shadow-2xs space-y-3 transition-all hover:border-[#D4AF37]"
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-b from-white to-[#F7EFE0] border border-[#EADAC0] flex-shrink-0 flex items-center justify-center p-1">
                        <img
                          src={item.product.primaryImage}
                          alt={item.product.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain drop-shadow-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#0F264A] line-clamp-1 font-serif">
                          {item.product.title}
                        </h4>
                        <p className="text-[11px] text-[#697A91] capitalize mt-0.5">
                          {item.product.category} • {item.product.specs?.diamondCount || 0} Stones
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-[#FFF9ED] text-[#B88732] border border-[#E8D7B7] font-semibold tracking-wider">
                            3DM + STL
                          </span>
                          <span className="text-xs font-serif font-bold text-[#0F264A]">
                            {resolved.display}
                          </span>
                          {resolved.isRegional && resolved.tierName && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FFF9ED] border border-[#E2C898] text-[#A67823] font-semibold">
                              {currentCountry.flag} {resolved.tierName}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveItem(idx)}
                        className="text-[#8E9CAE] hover:text-rose-500 p-1.5 transition-colors cursor-pointer self-start"
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
            <div className="p-5 border-t border-[#EADAC0] bg-white/90 backdrop-blur-md space-y-4">
              {/* Promo code */}
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo (use ROYAL10)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#FFF9F0] border border-[#EADAC0] text-[#0F264A] uppercase placeholder-[#8E9CAE] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl border border-[#EADAC0] bg-white hover:bg-[#FFF9F0] text-xs font-semibold text-[#0F264A] shadow-2xs cursor-pointer transition-all"
                >
                  Apply
                </button>
              </form>
              {promoMessage && (
                <p className="text-[11px] text-[#B88732] -mt-2 font-medium">{promoMessage}</p>
              )}

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#697A91]">
                  <span>Subtotal:</span>
                  <span className="font-medium text-[#0F264A]">₹{formatINR(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount (10%):</span>
                    <span>-₹{formatINR(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-[#0F264A] pt-2 border-t border-[#EADAC0]">
                  <span className="font-serif">Total Payable:</span>
                  <span className="font-serif text-base text-[#0F264A]">₹{formatINR(total)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#DFB35A] via-[#ECC976] to-[#C99834] hover:from-[#E6BC64] hover:to-[#D4A33F] text-[#0C2340] font-serif font-bold text-xs sm:text-[13px] tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(209,161,54,0.32)] border border-[#FFF0BA] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isCheckingOut ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-[#0C2340] border-t-transparent rounded-full animate-spin" />
                    Generating Instant CAD Links...
                  </span>
                ) : (
                  <>
                    <span>Confirm &amp; Download Files</span>
                    <ArrowRight className="w-4 h-4 text-[#0C2340]" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-[#697A91]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B88732]" />
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
          notes: items.map(i => i.product.title).join(', '),
          country: currentCountry.code,
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
