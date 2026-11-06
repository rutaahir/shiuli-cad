import React, { useState } from 'react';
import { CreditCard, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export interface RazorpayCheckoutButtonProps {
  amount: number; // in INR (Rupees) or paise if specified
  amountInPaise?: boolean;
  currency?: string;
  orderId?: number | string;
  stageId?: number | string;
  paymentType?: string;
  notes?: Record<string, any>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  buttonText?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: (verifyRes: any, paymentDetails: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onError?: (error: any) => void;
  onDismiss?: () => void;
}

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amount,
  amountInPaise = false,
  currency = 'INR',
  orderId,
  stageId,
  paymentType = 'standard',
  notes = {},
  prefill,
  buttonText,
  className = '',
  disabled = false,
  onSuccess,
  onError,
  onDismiss,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const calculatedPaise = amountInPaise
    ? Math.round(amount)
    : Math.max(100, Math.round(amount * 100));

  const handleCheckout = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // 1. Ensure amount >= 100 paise
      if (calculatedPaise < 100) {
        throw new Error('Minimum payment amount must be at least ₹1.00 (100 paise).');
      }

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !(window as any).Razorpay) {
        throw new Error('Could not load Razorpay payment gateway. Please check your internet connection.');
      }

      // 3. Create server-side order with Razorpay
      const orderRes = await api.createRazorpayOrder({
        amount: calculatedPaise,
        currency,
        receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        notes: {
          ...notes,
          order_id: orderId || undefined,
          stage_id: stageId || undefined,
          payment_type: paymentType,
        },
        order_id: orderId,
        stage_id: stageId,
        payment_type: paymentType,
      });

      const keyId = orderRes.key_id || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;

      // 4. Configure Razorpay Standard Checkout options
      const options = {
        key: keyId,
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: 'Shiuli CAD Studio',
        description: `Jewellery CAD Payment (${currency} ${(calculatedPaise / 100).toFixed(2)})`,
        image: '/assets/logo.png',
        order_id: orderRes.order_id,
        prefill: {
          name: prefill?.name || '',
          email: prefill?.email || '',
          contact: prefill?.contact || '',
        },
        theme: {
          color: '#17345C',
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            if (onDismiss) onDismiss();
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 5. Verify cryptographic signature on backend
            const verifyRes = await api.verifyRazorpayPayment({
              order_id: response.razorpay_order_id || orderRes.order_id,
              razorpay_order_id: response.razorpay_order_id || orderRes.order_id,
              payment_id: response.razorpay_payment_id,
              razorpay_payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              razorpay_signature: response.razorpay_signature,
            });

            // Trigger celebratory confetti
            try {
              const confetti = (await import('canvas-confetti')).default;
              confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
            } catch {}

            setIsLoading(false);
            if (onSuccess) {
              onSuccess(verifyRes, response);
            }
          } catch (vErr: any) {
            setIsLoading(false);
            const msg = vErr?.message || vErr?.error || 'Payment signature verification failed.';
            setErrorMessage(msg);
            if (onError) onError(vErr);
          }
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);

      rzpInstance.on('payment.failed', (resp: any) => {
        setIsLoading(false);
        const errDesc = resp?.error?.description || resp?.error?.reason || 'Payment failed or declined by issuing bank.';
        setErrorMessage(errDesc);
        if (onError) onError(resp?.error);
      });

      rzpInstance.open();
    } catch (err: any) {
      setIsLoading(false);
      const msg = err?.message || err?.error || 'Failed to initiate Razorpay checkout.';
      setErrorMessage(msg);
      if (onError) onError(err);
    }
  };

  const defaultClasses =
    'px-5 py-3 rounded-xl bg-[#0B1330] hover:bg-[#172554] text-[#F5E7A3] font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-[#D4AF37]/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled || isLoading}
        className={className || defaultClasses}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
            <span>Connecting Razorpay...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 text-[#D4AF37]" />
            <span>
              {buttonText || `Pay ₹${(calculatedPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} with Razorpay`}
            </span>
          </>
        )}
      </button>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
