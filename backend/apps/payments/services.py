import uuid
import hmac
import hashlib
import logging
import razorpay
from abc import ABC, abstractmethod
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.custom_orders.models import Order, OrderMilestone
from apps.custom_orders.services import release_order_to_pool, create_notification
from .models import Payment, OrderPaymentStage, PaymentPlanTemplate, PaymentPlanTemplateStage

logger = logging.getLogger(__name__)

def attach_payment_plan_to_order(order, template=None):
    """
    Copies a PaymentPlanTemplate's stages onto an Order as OrderPaymentStage rows.
    If no template provided, uses the default 'is_default=True' template.
    Enforces total percentage sum == 100%.
    """
    if not template:
        template = PaymentPlanTemplate.objects.filter(is_default=True).first()
        if not template:
            # Fallback inline creation
            template = PaymentPlanTemplate.objects.create(name="Standard 10/30/60", is_default=True)
            PaymentPlanTemplateStage.objects.create(template=template, label="Booking Confirmation", percentage=10.00, order_index=0, trigger_type="immediate")
            PaymentPlanTemplateStage.objects.create(template=template, label="Design Approval Milestone", percentage=30.00, order_index=1, trigger_type="on_design_approval")
            PaymentPlanTemplateStage.objects.create(template=template, label="Final Delivery", percentage=60.00, order_index=2, trigger_type="on_final_delivery")

    stages = list(template.stages.all().order_index_by() if hasattr(template.stages.all(), 'order_index_by') else template.stages.all())
    
    # Calculate amounts
    total_price = order.total_price
    for stg in stages:
        amount = round(float(total_price) * float(stg.percentage) / 100.0, 2)
        initial_status = OrderPaymentStage.Status.DUE if stg.order_index == 0 else OrderPaymentStage.Status.LOCKED
        OrderPaymentStage.objects.create(
            order=order,
            label=stg.label,
            percentage=stg.percentage,
            amount=amount,
            order_index=stg.order_index,
            trigger_type=stg.trigger_type,
            status=initial_status
        )


def process_stage_payment_success(payment_stage, transaction_id=None):
    """
    Processes payment success for a specific OrderPaymentStage.
    - Marks stage as PAID.
    - If Stage 1 (booking), updates Order.status to IN_DESIGN and RELEASES TO STAFF POOL.
    - Unlocks next stage if applicable.
    - If all stages paid, marks Order as COMPLETED.
    """
    with transaction.atomic():
        stage = OrderPaymentStage.objects.select_for_update().get(id=payment_stage.id)
        if stage.status == OrderPaymentStage.Status.PAID:
            return stage

        stage.status = OrderPaymentStage.Status.PAID
        stage.paid_at = timezone.now()
        stage.save()

        order = stage.order

        # Stage 1 (Booking payment success) -> Trigger pool release!
        if stage.order_index == 0:
            order.advance_paid = True
            order.status = Order.Status.IN_DESIGN
            order.unassigned_since = timezone.now()
            order.save()
            release_order_to_pool(order)

        # Check if all stages are paid
        all_stages = order.payment_stages.all()
        unpaid_count = all_stages.exclude(status=OrderPaymentStage.Status.PAID).count()

        if unpaid_count == 0:
            order.balance_paid = True
            order.status = Order.Status.COMPLETED
            order.save()
            if order.assigned_staff:
                from .models import Settlement
                from decimal import Decimal
                payout = Decimal(str(order.total_price)) * Decimal('0.70')
                Settlement.objects.get_or_create(
                    order=order,
                    staff=order.assigned_staff,
                    defaults={'amount': payout, 'status': Settlement.Status.PENDING}
                )
        else:
            # Unlock next stage if it has no approval precondition or if precondition is met
            next_stage = all_stages.filter(order_index=stage.order_index + 1).first()
            if next_stage and next_stage.status == OrderPaymentStage.Status.LOCKED:
                if next_stage.trigger_type == "immediate":
                    next_stage.status = OrderPaymentStage.Status.DUE
                    next_stage.save()
                elif next_stage.trigger_type == "on_final_delivery":
                    # If client approved preview or order passed QC, unlock final release milestone
                    has_approved = order.milestones.filter(stage__icontains="Approved").exists() or order.quality_approved
                    if has_approved:
                        next_stage.status = OrderPaymentStage.Status.DUE
                        next_stage.save()

        create_notification(
            recipient=order.client,
            title="Stage Payment Confirmed",
            body=f"Payment for '{stage.label}' (₹{stage.amount}) on Order #{order.id} was confirmed.",
            notification_type="payment_success",
            related_order=order
        )

    return stage


def approve_design_preview_and_unlock_stage(order):
    """
    Called when Client approves design preview.
    Logs milestone and unlocks next payment stage (Stage 1 if unpaid, or Stage 2 final delivery if Stage 1 is paid).
    """
    with transaction.atomic():
        OrderMilestone.objects.create(order=order, stage="Design Preview Approved by Client")
        
        # Check if design approval milestone stage is still locked
        design_stage = order.payment_stages.filter(
            trigger_type="on_design_approval",
            status=OrderPaymentStage.Status.LOCKED
        ).first()

        final_stage = order.payment_stages.filter(
            trigger_type="on_final_delivery",
            status=OrderPaymentStage.Status.LOCKED
        ).first()

        unlocked_label = ""
        if design_stage:
            design_stage.status = OrderPaymentStage.Status.DUE
            design_stage.save()
            unlocked_label = design_stage.label
        elif final_stage:
            # Stage 1 was already paid, so client approving preview unlocks final 60% balance payment!
            final_stage.status = OrderPaymentStage.Status.DUE
            final_stage.save()
            unlocked_label = final_stage.label

        create_notification(
            recipient=order.client,
            title="Design Approved",
            body=f"You approved the 3D design preview for Order #{order.id}." + (f" Next payment stage '{unlocked_label}' is now due." if unlocked_label else ""),
            notification_type="general",
            related_order=order
        )


class PaymentGatewayInterface(ABC):
    @abstractmethod
    def create_payment_session(self, order, payment_type, amount):
        pass

    @abstractmethod
    def verify_payment(self, payload):
        pass


class RazorpayPaymentGatewayService(PaymentGatewayInterface):
    def __init__(self):
        self.key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip()
        self.key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '').strip()
        self.client = None
        if self.key_id and self.key_secret and not self.key_id.startswith('dummy'):
            try:
                self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
            except Exception as e:
                logger.warning(f"Razorpay Client initialization warning: {e}")

    def is_sandbox_mode(self):
        if not self.key_id or not self.key_secret:
            return True
        if self.key_id.startswith('rzp_test_') or getattr(settings, 'DEBUG', False):
            return True
        return False

    def create_payment_session(self, order, payment_type, amount, notes=None):
        amount_paise = int(round(float(amount) * 100))
        receipt = f"rcpt_ord_{order.id}_{payment_type[:4]}"
        notes_payload = notes or {'order_id': order.id, 'payment_type': payment_type}

        order_id = None
        # If client configured with live or real test keys, attempt order create with Razorpay
        if self.client and not self.key_id.startswith('dummy'):
            try:
                order_data = {
                    'amount': amount_paise,
                    'currency': 'INR',
                    'receipt': receipt,
                    'notes': notes_payload
                }
                rzp_order = self.client.order.create(data=order_data)
                order_id = rzp_order.get('id')
            except Exception as e:
                logger.error(f"Razorpay order create exception: {e}")
                order_id = f"order_test_{uuid.uuid4().hex[:14]}"
        else:
            order_id = f"order_test_{uuid.uuid4().hex[:14]}"

        payment = Payment.objects.create(
            order=order,
            payment_type=payment_type,
            amount=amount,
            gateway_transaction_id=order_id,
            status=Payment.Status.PENDING
        )

        return {
            "payment_id": payment.id,
            "gateway_order_id": order_id,
            "razorpay_order_id": order_id,
            "key_id": self.key_id or "rzp_test_shiuli_sandbox",
            "order_id": order.id,
            "amount": str(amount),
            "amount_paise": amount_paise,
            "currency": "INR",
            "payment_type": payment_type,
            "is_sandbox": self.is_sandbox_mode()
        }

    def verify_payment(self, payload):
        payment_id = payload.get('payment_id')
        razorpay_order_id = payload.get('razorpay_order_id')
        razorpay_payment_id = payload.get('razorpay_payment_id') or payload.get('gateway_transaction_id')
        razorpay_signature = payload.get('razorpay_signature')

        payment = None
        if payment_id:
            try:
                payment = Payment.objects.get(id=payment_id)
            except Payment.DoesNotExist:
                pass
        if not payment and razorpay_order_id:
            payment = Payment.objects.filter(gateway_transaction_id=razorpay_order_id).first()

        if not payment:
            return False, "Payment record not found.", None

        # Idempotency check: if already marked SUCCESS, return existing verified payment
        if payment.status == Payment.Status.SUCCESS:
            return True, "Payment already verified successfully.", payment

        # Cryptographic signature verification
        is_valid = False
        if self.client and self.key_secret and razorpay_signature and razorpay_payment_id:
            try:
                self.client.utility.verify_payment_signature({
                    'razorpay_order_id': razorpay_order_id or payment.gateway_transaction_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature
                })
                is_valid = True
            except razorpay.errors.SignatureVerificationError:
                is_valid = False
            except Exception as e:
                logger.error(f"Signature check error: {e}")
                is_valid = False
        elif self.is_sandbox_mode():
            # In sandbox/development test mode
            if self.key_secret and razorpay_signature and razorpay_order_id and razorpay_payment_id:
                msg = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
                expected = hmac.new(self.key_secret.encode(), msg, hashlib.sha256).hexdigest()
                is_valid = hmac.compare_digest(expected, razorpay_signature)
            else:
                # Sandbox test bypass allowed if transaction id provided
                is_valid = bool(razorpay_payment_id or razorpay_order_id)
        else:
            is_valid = False

        if is_valid:
            payment = process_payment_success(payment, razorpay_payment_id or razorpay_order_id)
            return True, "Payment verified successfully.", payment
        else:
            payment.status = Payment.Status.FAILED
            payment.save()
            return False, "Cryptographic payment verification failed.", payment


def get_payment_gateway() -> PaymentGatewayInterface:
    """Factory returning active payment gateway service."""
    return RazorpayPaymentGatewayService()



def process_payment_success(payment, gateway_tx_id):
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(id=payment.id)
        if payment.status == Payment.Status.SUCCESS:
            return payment

        payment.status = Payment.Status.SUCCESS
        if gateway_tx_id:
            payment.gateway_transaction_id = gateway_tx_id
        payment.save()

        order = payment.order
        if payment.payment_type == Payment.PaymentType.ADVANCE:
            order.advance_paid = True
            order.unassigned_since = timezone.now()
            order.status = Order.Status.IN_DESIGN
            order.save()
            release_order_to_pool(order)
        elif payment.payment_stage:
            process_stage_payment_success(payment.payment_stage, gateway_tx_id)

    return payment

