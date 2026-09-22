import json
import hmac
import hashlib
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, IsStaff
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



@api_view(['GET'])
@permission_classes([IsAdmin])
def incoming_gateway_logs(request):
    """Returns combined incoming client payment transactions (Payments & Product Purchases) for Financial Gateway Audit."""
    from .models import Purchase
    logs = []

    # 1. Custom Order Payments
    payments = Payment.objects.all().select_related('order', 'order__client', 'payment_stage').order_by('-created_at')
    for p in payments:
        client_name = f"{p.order.client.first_name} {p.order.client.last_name}".strip() or p.order.client.username if (p.order and p.order.client) else "Client"
        stage_label = p.payment_stage.label if p.payment_stage else p.get_payment_type_display()
        logs.append({
            'id': f"PAY-{p.id}",
            'client': client_name,
            'amount': f"₹{p.amount:,.2f}",
            'amount_raw': float(p.amount),
            'type': stage_label,
            'ref': p.gateway_transaction_id or f"pay_tx_{p.id}",
            'status': p.get_status_display(),
            'date': p.created_at.strftime('%b %d, %Y, %I:%M %p'),
            'created_at_iso': p.created_at.isoformat()
        })

    # 2. Ready CAD Product Purchases
    purchases = Purchase.objects.all().select_related('buyer', 'product').order_by('-purchased_at')
    for pur in purchases:
        client_name = f"{pur.buyer.first_name} {pur.buyer.last_name}".strip() or pur.buyer.username if pur.buyer else "Client"
        item_title = pur.product.title if pur.product else "Ready CAD Design"
        logs.append({
            'id': f"PUR-{pur.id}",
            'client': client_name,
            'amount': f"₹{pur.price_paid:,.2f}",
            'amount_raw': float(pur.price_paid),
            'type': f"Store Purchase ({pur.get_license_type_display()})",
            'ref': pur.payment_transaction_id or f"pur_tx_{pur.id}",
            'status': pur.get_status_display(),
            'date': pur.purchased_at.strftime('%b %d, %Y, %I:%M %p'),
            'created_at_iso': pur.purchased_at.isoformat()
        })

    # Sort descending by creation date
    logs.sort(key=lambda x: x['created_at_iso'], reverse=True)
    return Response(logs, status=status.HTTP_200_OK)


class SettlementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SettlementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Auto-create missing settlements for completed orders
        completed_orders = Order.objects.filter(status=Order.Status.COMPLETED, assigned_staff__isnull=False)
        for ord_obj in completed_orders:
            from decimal import Decimal
            Settlement.objects.get_or_create(
                order=ord_obj,
                staff=ord_obj.assigned_staff,
                defaults={
                    'amount': ord_obj.total_price * Decimal('0.70'),
                    'status': Settlement.Status.PENDING
                }
            )

        if user.role == 'admin':
            return Settlement.objects.all().select_related('staff', 'order').order_by('-id')
        elif user.role == 'staff':
            return Settlement.objects.filter(staff=user).select_related('staff', 'order').order_by('-id')
        return Settlement.objects.none()

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin], url_path='process')
    def process_bulk(self, request):
        return self._do_process(request)

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin], url_path='process-payout')
    def process_payout(self, request):
        return self._do_process(request)

    def _do_process(self, request):
        settlement_ids = request.data.get('settlement_ids', [])
        if not isinstance(settlement_ids, list) or not settlement_ids:
            return Response({"error": "List of 'settlement_ids' is required."}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = Settlement.objects.filter(
            id__in=settlement_ids,
            status=Settlement.Status.PENDING
        ).update(
            status=Settlement.Status.PROCESSED,
            processed_at=timezone.now()
        )

        return Response({
            "message": f"Successfully processed {updated_count} settlements.",
            "processed_count": updated_count
        })


