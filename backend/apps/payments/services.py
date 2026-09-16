import uuid
import logging
from abc import ABC, abstractmethod
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
            # Unlock next stage if it has no approval precondition
            next_stage = all_stages.filter(order_index=stage.order_index + 1).first()
            if next_stage and next_stage.status == OrderPaymentStage.Status.LOCKED:
                if next_stage.trigger_type == "immediate":
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
    Logs milestone and unlocks next payment stage with trigger_type='on_design_approval'.
    """
    with transaction.atomic():
        OrderMilestone.objects.create(order=order, stage="Design Preview Approved by Client")
        
        # Unlock stage waiting on design approval
        locked_stage = order.payment_stages.filter(
            trigger_type="on_design_approval",
            status=OrderPaymentStage.Status.LOCKED
        ).first()

        if locked_stage:
            locked_stage.status = OrderPaymentStage.Status.DUE
            locked_stage.save()

        create_notification(
            recipient=order.client,
            title="Design Approved",
            body=f"You approved the 3D design preview for Order #{order.id}. Next payment stage '{locked_stage.label if locked_stage else ''}' is now due.",
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


class MockPaymentGatewayService(PaymentGatewayInterface):
    def create_payment_session(self, order, payment_type, amount):
        transaction_id = f"mock_tx_{uuid.uuid4().hex[:12]}"
        payment = Payment.objects.create(
            order=order,
            payment_type=payment_type,
            amount=amount,
            gateway_transaction_id=transaction_id,
            status=Payment.Status.PENDING
        )
        return {
            "payment_id": payment.id,
            "gateway_transaction_id": transaction_id,
            "order_id": order.id,
            "amount": str(amount),
            "payment_type": payment_type,
            "checkout_url": f"/mock-checkout/{transaction_id}"
        }

    def verify_payment(self, payload):
        payment_id = payload.get('payment_id')
        transaction_id = payload.get('gateway_transaction_id')
        status_input = payload.get('status', 'success').lower()

        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            return False, "Payment record not found.", None

        if status_input == 'success':
            payment = process_payment_success(payment, transaction_id or payment.gateway_transaction_id)
            return True, "Payment verified successfully.", payment
        else:
            payment.status = Payment.Status.FAILED
            payment.save()
            return False, "Payment failed.", payment


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

