import json
import hmac
import hashlib
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, IsStaff, IsStaffOrAdmin
from apps.custom_orders.models import Order
from .models import Payment, Settlement, PaymentPlanTemplate, OrderPaymentStage
from .serializers import PaymentSerializer, SettlementSerializer, PaymentPlanTemplateSerializer, OrderPaymentStageSerializer
from .services import get_payment_gateway, process_stage_payment_success

class PaymentPlanTemplateViewSet(viewsets.ModelViewSet):
    queryset = PaymentPlanTemplate.objects.all()
    serializer_class = PaymentPlanTemplateSerializer
    permission_classes = [IsAdmin]
    pagination_class = None


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def pay_stage_payment(request):
    stage_id = request.data.get('stage_id')
    if not stage_id:
        return Response({"error": "stage_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        stage = OrderPaymentStage.objects.get(id=stage_id, order__client=request.user)
    except OrderPaymentStage.DoesNotExist:
        return Response({"error": "Payment stage not found or not owned by user."}, status=status.HTTP_404_NOT_FOUND)

    if stage.status == OrderPaymentStage.Status.PAID:
        return Response({"error": "This stage has already been paid."}, status=status.HTTP_400_BAD_REQUEST)

    process_stage_payment_success(stage)
    return Response({
        "message": f"Successfully paid '{stage.label}' (₹{stage.amount} INR)",
        "stage": OrderPaymentStageSerializer(stage).data
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def pay_full_order_payment(request):
    order_id = request.data.get('order_id')
    if not order_id:
        return Response({"error": "order_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(id=order_id, client=request.user)
    except Order.DoesNotExist:
        return Response({"error": "Order not found or does not belong to you."}, status=status.HTTP_404_NOT_FOUND)

    transaction_id = request.data.get('transaction_id')
    payment_method = request.data.get('payment_method', 'upi')
    payment_details = request.data.get('payment_details', '')

    from .services import process_full_order_payment_success
    result = process_full_order_payment_success(
        order,
        transaction_id=transaction_id,
        payment_method=payment_method,
        payment_details=payment_details
    )
    return Response({
        "message": f"Order #{order.id} completely settled in full!",
        "order_id": order.id,
        "stages_paid": result.get('stages_paid', 0),
        "total_amount": float(order.total_price)
    })



@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_payment_session(request):
    order_id = request.data.get('order_id')
    stage_id = request.data.get('stage_id')
    payment_type = request.data.get('payment_type', 'advance')

    order = None
    stage = None
    if stage_id:
        try:
            stage = OrderPaymentStage.objects.get(id=stage_id, order__client=request.user)
            order = stage.order
            amount = stage.amount
            payment_type = f"stage_{stage.order_index}"
        except OrderPaymentStage.DoesNotExist:
            return Response({"error": "Payment stage not found or not owned by you."}, status=status.HTTP_404_NOT_FOUND)
    elif order_id:
        try:
            order = Order.objects.get(id=order_id, client=request.user)
        except Order.DoesNotExist:
            return Response({"error": "Order not found or does not belong to you."}, status=status.HTTP_404_NOT_FOUND)

        if payment_type == 'advance':
            amount = order.advance_amount if order.advance_amount > 0 else (order.total_price * 0.5)
        elif payment_type == 'balance':
            amount = order.total_price - order.advance_amount
        else:
            amount = order.total_price
    else:
        return Response({"error": "order_id or stage_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    gateway = get_payment_gateway()
    session_data = gateway.create_payment_session(order, payment_type, amount)

    if stage:
        payment_id = session_data.get('payment_id')
        if payment_id:
            Payment.objects.filter(id=payment_id).update(payment_stage=stage)

    return Response(session_data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_payment(request):
    gateway = get_payment_gateway()
    success, message, payment = gateway.verify_payment(request.data)

    if not success:
        return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": message,
        "payment": PaymentSerializer(payment).data if payment else {}
    })


@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def razorpay_webhook(request):
    """
    POST /api/payments/webhook/
    Handles incoming Razorpay webhook events with signature verification and idempotency.
    """
    webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '').strip()
    signature = request.headers.get('X-Razorpay-Signature')
    body = request.body

    if webhook_secret:
        if not signature:
            return Response({"error": "Missing X-Razorpay-Signature header"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            expected_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                body,
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(expected_signature, signature):
                return Response({"error": "Invalid webhook signature"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Webhook verification error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = json.loads(body.decode('utf-8'))
    except Exception:
        return Response({"error": "Invalid JSON payload"}, status=status.HTTP_400_BAD_REQUEST)

    event = data.get('event')
    payload = data.get('payload', {})
    payment_entity = payload.get('payment', {}).get('entity', {})
    payment_id = payment_entity.get('id')
    order_id = payment_entity.get('order_id')

    # Idempotency check: verify if payment_id already processed
    if payment_id:
        existing_payment = Payment.objects.filter(gateway_transaction_id=payment_id, status=Payment.Status.SUCCESS).first()
        if existing_payment:
            return Response({"status": "already_processed", "payment_id": payment_id})

    if event == 'payment.captured':
        payment = None
        if order_id:
            payment = Payment.objects.filter(gateway_transaction_id=order_id).first()
        if not payment and payment_id:
            payment = Payment.objects.filter(gateway_transaction_id=payment_id).first()

        if payment:
            gateway = get_payment_gateway()
            gateway.verify_payment({
                'payment_id': payment.id,
                'gateway_transaction_id': payment_id,
                'status': 'success'
            })
            return Response({"status": "captured", "payment_id": payment_id})

    return Response({"status": "received", "event": event})


@api_view(['POST'])
@permission_classes([IsStaffOrAdmin])
def admin_approve_custom_payment(request, payment_id):
    """
    POST /api/payments/<id>/admin-approve/
    Admin confirms receipt of a custom order payment (Cash, Cheque, UPI).
    Marks Payment status as SUCCESS and processes stage completion without prematurely enabling downloads.
    """
    try:
        payment = Payment.objects.select_related('order', 'payment_stage').get(id=payment_id)
    except Payment.DoesNotExist:
        return Response({"error": "Payment record not found."}, status=status.HTTP_404_NOT_FOUND)

    payment.status = Payment.Status.SUCCESS
    payment.admin_verified_at = timezone.now()
    payment.admin_verified_by = request.user
    payment.save(update_fields=['status', 'admin_verified_at', 'admin_verified_by'])

    order = payment.order
    if payment.payment_stage:
        process_stage_payment_success(payment.payment_stage, transaction_id=payment.gateway_transaction_id)
    elif order:
        if payment.payment_type == Payment.PaymentType.FULL:
            process_full_order_payment_success(order, transaction_id=payment.gateway_transaction_id)
        elif payment.payment_type in [Payment.PaymentType.ADVANCE, Payment.PaymentType.STAGE]:
            first_stage = order.payment_stages.filter(order_index=0).first()
            if first_stage:
                process_stage_payment_success(first_stage, transaction_id=payment.gateway_transaction_id)

    # Check if order is now 100% fully paid
    is_fully_paid = False
    if order:
        stages = order.payment_stages.all()
        is_fully_paid = bool(order.balance_paid or (stages.exists() and all(s.status == 'paid' for s in stages)))

    return Response({
        "message": f"Payment #{payment.id} verified and approved successfully.",
        "payment_id": payment.id,
        "is_order_fully_paid": is_fully_paid
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsStaffOrAdmin])
def admin_decline_custom_payment(request, payment_id):
    """
    POST /api/payments/<id>/admin-decline/
    Admin declines verification of a custom order payment (Cash, Cheque, UPI).
    Marks Payment status as DECLINED, stores reason, and alerts client.
    """
    try:
        payment = Payment.objects.select_related('order', 'order__client', 'payment_stage').get(id=payment_id)
    except Payment.DoesNotExist:
        return Response({"error": "Payment record not found."}, status=status.HTTP_404_NOT_FOUND)

    reason = (request.data.get('reason') or '').strip()
    if not reason:
        reason = "Payment proof could not be verified in bank records."

    now = timezone.now()
    payment.status = Payment.Status.DECLINED
    payment.decline_reason = reason
    payment.declined_at = now
    payment.declined_by = request.user
    payment.save(update_fields=['status', 'decline_reason', 'declined_at', 'declined_by'])

    # Send Notification to client
    if payment.order and payment.order.client:
        try:
            from apps.notifications.models import Notification
            Notification.objects.create(
                recipient=payment.order.client,
                title=f"Payment Verification Declined — Order #{payment.order.order_number}",
                body=f"Your payment proof of ₹{payment.amount:,.2f} for Order #{payment.order.order_number} was declined. Reason: {reason}. Please re-submit payment details.",
                notification_type="payment_declined",
                related_order=payment.order
            )
        except Exception as notif_err:
            print(f"[NOTIFICATION WARNING] {notif_err}")

    return Response({
        "message": f"Payment #{payment.id} has been declined.",
        "payment_id": payment.id,
        "status": "declined",
        "decline_reason": reason
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsStaffOrAdmin])
def incoming_gateway_logs(request):
    """Returns combined incoming client payment transactions (Payments & Product Purchases) for Financial Gateway Audit."""
    from collections import OrderedDict
    from .models import Purchase
    logs = []

    # 1. Custom Order Payments (Grouped into unified Order Cards with nested Step Transactions)
    orders_map = OrderedDict()
    payments = Payment.objects.all().select_related('order', 'order__client', 'payment_stage').prefetch_related('order__payment_stages').order_by('-created_at')
    
    for p in payments:
        oid = p.order_id
        if oid not in orders_map:
            orders_map[oid] = {
                'order': p.order,
                'payments': []
            }
        orders_map[oid]['payments'].append(p)

    for oid, group in orders_map.items():
        order = group['order']
        order_payments = group['payments']

        client_name = f"{order.client.first_name} {order.client.last_name}".strip() or order.client.username if (order and order.client) else "Client"
        client_email = order.client.email if (order and order.client) else ""

        item_title = f"Order #{order.id}" if order else "Custom Order"
        if order and order.order_type == 'file_edit':
            item_title = f"Order #{order.id} • CAD File Modification"
        elif order and order.product:
            item_title = f"Order #{order.id} • {order.product.title}"
        elif order and order.custom_request:
            item_title = f"Order #{order.id} • Bespoke CAD Design"

        order_total_val = float(order.total_price) if (order and order.total_price) else 0.0
        order_stages = list(order.payment_stages.all().order_by('order_index')) if order else []
        total_stages_count = len(order_stages)
        paid_stages = [s for s in order_stages if s.status == 'paid']
        paid_stages_count = len(paid_stages)

        # Check full payment & calculate verified collected amount
        has_successful_full_payment = any(p.payment_type == Payment.PaymentType.FULL and p.status == Payment.Status.SUCCESS for p in order_payments)
        if order and (order.balance_paid or has_successful_full_payment or (total_stages_count > 0 and paid_stages_count == total_stages_count)):
            order_paid_val = order_total_val
            is_order_fully_paid = True
        else:
            if total_stages_count > 0:
                order_paid_val = sum(float(s.amount) for s in paid_stages)
            else:
                order_paid_val = sum(float(p.amount) for p in order_payments if p.status == Payment.Status.SUCCESS)
            order_paid_val = min(order_total_val, order_paid_val) if order_total_val > 0 else order_paid_val
            is_order_fully_paid = bool(order and order.status == 'completed') or (order_paid_val >= order_total_val and order_total_val > 0)

        order_remaining_val = max(0.0, round(order_total_val - order_paid_val, 2))

        # Build stages representation
        stages_data = []
        for s in order_stages:
            stages_data.append({
                'id': s.id,
                'order_index': s.order_index,
                'step_number': s.order_index + 1,
                'label': s.label,
                'percentage': float(s.percentage),
                'amount': float(s.amount),
                'amount_disp': f"₹{float(s.amount):,.2f}",
                'status': s.status,
                'paid_at': s.paid_at.strftime('%b %d, %Y, %I:%M %p') if s.paid_at else None,
            })

        # Build nested transactions representation
        transactions_data = []
        for p in order_payments:
            screenshot_url = request.build_absolute_uri(p.payment_screenshot.url) if p.payment_screenshot else None
            stage_label = p.payment_stage.label if p.payment_stage else p.get_payment_type_display()
            is_stg = bool(p.payment_stage or p.payment_type in [Payment.PaymentType.ADVANCE, Payment.PaymentType.STAGE])
            stg_pct = float(p.payment_stage.percentage) if p.payment_stage else (10.0 if p.payment_type == Payment.PaymentType.ADVANCE else None)
            stg_idx = (p.payment_stage.order_index + 1) if p.payment_stage else 1

            transactions_data.append({
                'id': f"PAY-{p.id}",
                'payment_id': p.id,
                'order_id': order.id if order else p.order_id,
                'order_number': getattr(order, 'order_number', f"ORD-{order.id}" if order else ""),
                'item_title': item_title,
                'client': client_name,
                'client_email': client_email,
                'amount': f"₹{p.amount:,.2f}",
                'amount_raw': float(p.amount),
                'payment_type': p.payment_type,
                'type': stage_label,
                'ref': p.gateway_transaction_id or f"pay_tx_{p.id}",
                'payment_method': p.payment_method or "upi",
                'payment_details': p.payment_details or "",
                'screenshot': screenshot_url,
                'status': p.get_status_display(),
                'raw_status': p.status,
                'decline_reason': p.decline_reason or "",
                'declined_at': getattr(p, 'declined_at', None).isoformat() if getattr(p, 'declined_at', None) else None,
                'can_approve': p.status == 'pending',
                'can_decline': p.status == 'pending',
                'is_stage_payment': is_stg,
                'stage_name': stage_label,
                'stage_percentage': stg_pct,
                'stage_order_index': stg_idx,
                'is_order_fully_paid': is_order_fully_paid,
                'date': p.created_at.strftime('%b %d, %Y, %I:%M %p'),
                'created_at_iso': p.created_at.isoformat()
            })

        has_pending = any(t['raw_status'] == 'pending' for t in transactions_data)
        pending_count = sum(1 for t in transactions_data if t['raw_status'] == 'pending')

        if has_pending:
            order_status_display = f"Pending Verification ({pending_count})"
            raw_status = "pending"
        elif is_order_fully_paid:
            order_status_display = "100% Fully Settled"
            raw_status = "paid"
        elif order_paid_val > 0:
            order_status_display = f"Part Payment (₹{order_paid_val:,.2f} Paid)"
            raw_status = "partial"
        else:
            order_status_display = "Awaiting Payment"
            raw_status = "unpaid"

        latest_txn = transactions_data[0] if transactions_data else None

        logs.append({
            'id': f"ORD-{order.id}" if order else f"PAY-GRP-{oid}",
            'entry_type': 'order',
            'order_id': order.id if order else oid,
            'order_number': getattr(order, 'order_number', f"ORD-{order.id}" if order else ""),
            'item_title': item_title,
            'client': client_name,
            'client_email': client_email,
            'amount': f"₹{order_total_val:,.2f}",
            'amount_raw': order_total_val,
            'type': f"Custom Order ({total_stages_count} Stages)" if total_stages_count > 0 else "Custom Order",
            'ref': latest_txn['ref'] if latest_txn else f"ord_{order.id}",
            'payment_method': latest_txn['payment_method'] if latest_txn else "upi",
            'payment_details': latest_txn['payment_details'] if latest_txn else "",
            'screenshot': latest_txn['screenshot'] if latest_txn else None,
            'status': order_status_display,
            'raw_status': raw_status,
            'can_approve': has_pending,
            'can_decline': has_pending,
            'has_pending_transactions': has_pending,
            'pending_transactions_count': pending_count,
            'is_stage_payment': total_stages_count > 0,
            'paid_stages_count': paid_stages_count,
            'total_stages_count': total_stages_count,
            'order_total_val': order_total_val,
            'order_total_amount': f"₹{order_total_val:,.2f}",
            'order_paid_val': order_paid_val,
            'order_paid_amount': f"₹{order_paid_val:,.2f}",
            'order_remaining_val': order_remaining_val,
            'order_remaining_amount': f"₹{order_remaining_val:,.2f}",
            'is_order_fully_paid': is_order_fully_paid,
            'can_send_download': is_order_fully_paid,
            'download_enabled_by_admin': order.download_enabled_by_admin if order else False,
            'stages': stages_data,
            'transactions': transactions_data,
            'date': latest_txn['date'] if latest_txn else (order.created_at.strftime('%b %d, %Y, %I:%M %p') if order else ""),
            'created_at_iso': latest_txn['created_at_iso'] if latest_txn else (order.created_at.isoformat() if order else "")
        })

    # 2. Ready CAD Product Purchases
    purchases = Purchase.objects.all().select_related('buyer', 'product').order_by('-purchased_at')
    for pur in purchases:
        client_name = f"{pur.buyer.first_name} {pur.buyer.last_name}".strip() or pur.buyer.username if pur.buyer else "Client"
        client_email = pur.buyer.email if pur.buyer else ""
        item_title = pur.product.title if pur.product else "Ready CAD Design"
        screenshot_url = request.build_absolute_uri(pur.payment_screenshot.url) if pur.payment_screenshot else None
        logs.append({
            'id': f"PUR-{pur.id}",
            'purchase_id': pur.id,
            'client': client_name,
            'client_email': client_email,
            'item_title': item_title,
            'amount': f"₹{pur.price_paid:,.2f}",
            'amount_raw': float(pur.price_paid),
            'type': f"Store Purchase ({pur.get_license_type_display()})",
            'ref': pur.payment_transaction_id or f"pur_tx_{pur.id}",
            'payment_method': pur.payment_method or "upi",
            'payment_details': pur.payment_details or "",
            'screenshot': screenshot_url,
            'status': pur.get_status_display(),
            'raw_status': pur.status,
            'decline_reason': pur.decline_reason or "",
            'declined_at': pur.declined_at.isoformat() if pur.declined_at else None,
            'can_approve': pur.status == 'pending',
            'can_decline': pur.status == 'pending',
            'download_enabled_by_admin': pur.download_enabled_by_admin,
            'is_stage_payment': False,
            'is_order_fully_paid': pur.status == 'paid',
            'can_send_download': pur.status == 'pending',
            'date': pur.purchased_at.strftime('%b %d, %Y, %I:%M %p'),
            'created_at_iso': pur.purchased_at.isoformat()
        })

    # 3. CAD File Edit Modifications
    try:
        from apps.file_edits.models import FileEditRequest
        file_edits = FileEditRequest.objects.filter(agreed_price__isnull=False).select_related('client', 'cad_order').order_by('-created_at')
        for fe in file_edits:
            # If this file edit already has a converted Order that has payment records, skip it from Section 3
            # because its actual payments are already accurately displayed under Section 1!
            order_obj = getattr(fe, 'cad_order', None) or getattr(fe, 'converted_order', None)
            if order_obj and order_obj.payments.exists():
                continue

            client_name = fe.contact_name or (f"{fe.client.first_name} {fe.client.last_name}".strip() or fe.client.username if fe.client else "Client")
            client_email = fe.contact_email or (fe.client.email if fe.client else "")
            is_usd = (fe.currency or 'USD').upper() == 'USD'
            amt_raw = float(fe.agreed_price) * 86.85 if is_usd else float(fe.agreed_price)
            amt_disp = f"₹{int(round(amt_raw)):,} (≈ ${float(fe.agreed_price):.2f} USD)" if is_usd else f"₹{int(round(amt_raw)):,}"
            
            fe_status_display = "Converted to Order" if order_obj else ("Agreement Active" if fe.status == 'agreed' else fe.status.title())
            logs.append({
                'id': f"FED-{fe.id}",
                'client': client_name,
                'client_email': client_email,
                'item_title': f"CAD File Edit #{fe.id} ({fe.original_file_format.upper()})",
                'amount': amt_disp,
                'amount_raw': round(amt_raw, 2),
                'type': f"CAD Modification ({fe.original_file_format.upper()})",
                'ref': f"fed_tx_{fe.id}",
                'payment_method': "online",
                'payment_details': "Official CAD Modification Agreement",
                'screenshot': None,
                'status': fe_status_display,
                'raw_status': 'converted' if order_obj else ('agreed' if fe.status == 'agreed' else fe.status),
                'can_approve': False,
                'can_decline': False,
                'is_stage_payment': False,
                'is_order_fully_paid': False,
                'can_send_download': False,
                'download_enabled_by_admin': False,
                'date': fe.created_at.strftime('%b %d, %Y, %I:%M %p'),
                'created_at_iso': fe.created_at.isoformat()
            })
    except Exception as e:
        pass

    # Sort descending by creation date
    logs.sort(key=lambda x: x['created_at_iso'], reverse=True)
    return Response(logs, status=status.HTTP_200_OK)


class SettlementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SettlementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Auto-create missing settlements for completed orders
        completed_orders = Order.objects.filter(
            status__in=[Order.Status.COMPLETED, 'delivered'],
            assigned_staff__isnull=False
        )
        for ord_obj in completed_orders:
            from decimal import Decimal
            payout_val = ord_obj.staff_payout_price or ord_obj.payout_price or (ord_obj.total_price * Decimal('0.70'))
            Settlement.objects.get_or_create(
                order=ord_obj,
                staff=ord_obj.assigned_staff,
                defaults={
                    'amount': payout_val,
                    'amount_paid': Decimal('0.00'),
                    'status': Settlement.Status.PENDING
                }
            )

        role = getattr(user, 'role', None)
        is_admin = role == 'admin' or getattr(user, 'is_superuser', False)

        if is_admin and not self.request.query_params.get('mine'):
            staff_id = self.request.query_params.get('staff_id')
            if staff_id:
                return Settlement.objects.filter(staff_id=staff_id).select_related('staff', 'order').order_by('-id')
            return Settlement.objects.all().select_related('staff', 'order').order_by('-id')
        elif role == 'staff' or is_admin:
            return Settlement.objects.filter(staff=user).select_related('staff', 'order').order_by('-id')
        return Settlement.objects.none()

    @action(detail=False, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='process')
    def process_bulk(self, request):
        return self._do_process(request)

    @action(detail=False, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='process-payout')
    def process_payout(self, request):
        return self._do_process(request)

    def _do_process(self, request):
        settlement_ids = request.data.get('settlement_ids') or []
        settlement_id = request.data.get('settlement_id')
        if settlement_id and not settlement_ids:
            settlement_ids = [settlement_id]

        if not isinstance(settlement_ids, list) or not settlement_ids:
            return Response({"error": "Settlement ID or list of 'settlement_ids' is required."}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = request.data.get('payment_method', 'bank_transfer')
        transaction_ref = str(request.data.get('transaction_ref') or '').strip()
        notes = str(request.data.get('notes') or '').strip()
        amount_input = request.data.get('amount')

        from decimal import Decimal
        updated_records = []
        for s_id in settlement_ids:
            try:
                settlement = Settlement.objects.get(id=s_id)
            except Settlement.DoesNotExist:
                continue

            current_paid = settlement.amount_paid or Decimal('0.00')
            total_due = settlement.amount

            if amount_input is not None and len(settlement_ids) == 1:
                # Custom part payment or full payment for single record
                pay_amt = Decimal(str(amount_input))
                new_paid = current_paid + pay_amt
                if new_paid >= total_due:
                    settlement.amount_paid = total_due
                    settlement.status = Settlement.Status.PROCESSED
                else:
                    settlement.amount_paid = new_paid
                    settlement.status = Settlement.Status.PARTIAL
            else:
                # Full settlement
                settlement.amount_paid = total_due
                settlement.status = Settlement.Status.PROCESSED

            settlement.payment_method = payment_method
            if transaction_ref:
                settlement.transaction_ref = transaction_ref
            if notes:
                settlement.notes = f"{settlement.notes}\n{notes}".strip() if settlement.notes else notes
            settlement.processed_at = timezone.now()
            settlement.save()
            updated_records.append(settlement)

        return Response({
            "message": f"Successfully recorded payment for {len(updated_records)} settlement(s).",
            "processed_count": len(updated_records),
            "settlements": SettlementSerializer(updated_records, many=True).data
        })


