import logging
from decimal import Decimal
from django.utils import timezone
from apps.accounts.models import User
from apps.custom_orders.models import Order
from apps.custom_orders.services import release_order_to_pool, create_notification, send_channel_message
from apps.payments.models import OrderPaymentStage

logger = logging.getLogger(__name__)

USD_TO_INR_RATE = Decimal('86.85')

def sync_file_edit_to_order_pool(file_edit):
    """
    Synchronizes an agreed / approved FileEditRequest to an Order in the Staff Job Pool.
    Creates 3 milestone stages (Booking 10%, Modification Preview 30%, Final Delivery 60%)
    and broadcasts the job to eligible modellers in the Staff Job Pool.
    """
    # 1. Resolve existing linked order if any
    order = getattr(file_edit, 'converted_order', None) or getattr(file_edit, 'cad_order', None)
    if not order:
        order = Order.objects.filter(file_edit_request=file_edit).first()

    if order and getattr(order, 'is_deleted', False):
        logger.info(f"FileEditRequest #{file_edit.id} is linked to soft-deleted Order #{order.id}; skipping sync to pool.")
        return order

    raw_price = Decimal(str(file_edit.agreed_price or file_edit.quoted_price or file_edit.estimated_price_shown or '100.00'))
    is_usd = (file_edit.currency or 'USD').upper() == 'USD'
    
    if is_usd:
        inr_price = (raw_price * USD_TO_INR_RATE).quantize(Decimal('0.01'))
        usd_price = raw_price.quantize(Decimal('0.01'))
    else:
        inr_price = raw_price.quantize(Decimal('0.01'))
        usd_price = (raw_price / USD_TO_INR_RATE).quantize(Decimal('0.01'))

    advance_amount = (inr_price * Decimal('0.10')).quantize(Decimal('0.01'))
    preview_milestone_amount = (inr_price * Decimal('0.30')).quantize(Decimal('0.01'))
    final_delivery_amount = inr_price - advance_amount - preview_milestone_amount

    if not order:
        order = Order.objects.create(
            client=file_edit.client,
            order_type=Order.OrderType.FILE_EDIT,
            file_edit_request=file_edit,
            total_price=inr_price,
            original_price_usd=usd_price,
            currency="INR",
            advance_amount=advance_amount,
            deadline_hours=48,
            status=Order.Status.IN_DESIGN,
            unassigned_since=timezone.now()
        )
        file_edit.converted_order = order
        file_edit.save(update_fields=['converted_order'])

        # Create 3-stage milestone schedule (10% / 30% / 60%)
        OrderPaymentStage.objects.create(
            order=order,
            label="Booking Confirmation",
            percentage=10.0,
            amount=advance_amount,
            order_index=0,
            trigger_type="immediate",
            status=OrderPaymentStage.Status.DUE
        )
        OrderPaymentStage.objects.create(
            order=order,
            label="Modification Preview Milestone",
            percentage=30.0,
            amount=preview_milestone_amount,
            order_index=1,
            trigger_type="on_design_approval",
            status=OrderPaymentStage.Status.LOCKED
        )
        OrderPaymentStage.objects.create(
            order=order,
            label="Final CAD Delivery",
            percentage=60.0,
            amount=final_delivery_amount,
            order_index=2,
            trigger_type="on_final_delivery",
            status=OrderPaymentStage.Status.LOCKED
        )
    else:
        # Update price and ensure status is open in pool if unassigned
        order.total_price = inr_price
        order.original_price_usd = usd_price
        order.advance_amount = advance_amount
        if not order.file_edit_request:
            order.file_edit_request = file_edit
        if order.status == Order.Status.AWAITING_PAYMENT and not order.assigned_staff:
            order.status = Order.Status.IN_DESIGN
            order.unassigned_since = timezone.now()
        order.save()

    # Release order to open job pool if unassigned
    if order.status == Order.Status.IN_DESIGN and not order.assigned_staff:
        try:
            release_order_to_pool(order)
            # Dispatch real-time WebSocket alert for modellers
            send_channel_message(
                "staff_pool",
                {
                    "type": "job_pool_update",
                    "action": "new_file_edit_job",
                    "order_id": order.id,
                    "order_type": "file_edit",
                    "format": file_edit.original_file_format.upper(),
                    "file_edit_id": file_edit.id
                }
            )
        except Exception as e:
            logger.warning(f"Failed to release file edit order #{order.id} to staff pool: {e}")

    return order
