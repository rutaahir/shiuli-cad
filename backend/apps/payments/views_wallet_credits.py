import uuid
import secrets
import hmac
import hashlib
import datetime
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import IsAdmin
from apps.custom_orders.models import Order
from apps.catalog.models import Product
from .models import (
    ClientWallet, ClientCreditAccount, WalletCreditTransaction,
    Purchase, OrderPaymentStage, DownloadToken
)
from .serializers import (
    ClientWalletSerializer, ClientCreditAccountSerializer,
    WalletCreditTransactionSerializer
)
from .services import process_stage_payment_success

User = get_user_model()
USD_TO_INR_RATE = Decimal('86.85')


def _get_or_create_wallet_and_credit(user):
    wallet, _ = ClientWallet.objects.get_or_create(user=user, defaults={'balance': Decimal('0.00')})
    credit_account, _ = ClientCreditAccount.objects.get_or_create(
        user=user,
        defaults={'credit_limit': Decimal('0.00'), 'used_credit': Decimal('0.00'), 'status': ClientCreditAccount.Status.DISABLED}
    )
    return wallet, credit_account


def _resolve_single_product(product_id):
    if not product_id:
        return None
    p_str = str(product_id).strip()
    if p_str.isdigit():
        prod = Product.objects.filter(id=int(p_str), is_active=True).first()
        if prod:
            return prod
    return Product.objects.filter(slug=p_str, is_active=True).first()


def _resolve_products(product_ids):
    if not product_ids:
        return []
    numeric_ids = []
    slugs = []
    for p in product_ids:
        p_str = str(p).strip()
        if p_str.isdigit():
            numeric_ids.append(int(p_str))
        else:
            slugs.append(p_str)

    q_filter = Q()
    if numeric_ids:
        q_filter |= Q(id__in=numeric_ids)
    if slugs:
        q_filter |= Q(slug__in=slugs)

    if not q_filter:
        return []
    return list(Product.objects.filter(q_filter, is_active=True))


# ─── CLIENT ENDPOINTS ─────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def client_credit_account_detail(request):
    """
    Returns the authenticated user's wallet, corporate credit line, and recent transaction history.
    """
    wallet, credit_account = _get_or_create_wallet_and_credit(request.user)
    transactions = WalletCreditTransaction.objects.filter(user=request.user).order_by('-created_at')[:30]

    return Response({
        "wallet": ClientWalletSerializer(wallet).data,
        "credit_account": ClientCreditAccountSerializer(credit_account).data,
        "transactions": WalletCreditTransactionSerializer(transactions, many=True, context={'request': request}).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def wallet_topup_request(request):
    """
    Client initiates a top-up deposit for their prepaid wallet.
    Requires admin verification unless automatic demo mode.
    """
    amount_raw = request.data.get('amount')
    original_amount_raw = request.data.get('original_amount')
    currency = str(request.data.get('currency', 'USD')).strip().upper() or 'USD'
    exchange_rate_raw = request.data.get('exchange_rate')

    if not amount_raw and not original_amount_raw:
        return Response({"error": "Amount is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        if amount_raw:
            amount = Decimal(str(amount_raw)).quantize(Decimal('0.01'))
        else:
            amount = Decimal('0.00')

        if original_amount_raw:
            original_amount = Decimal(str(original_amount_raw)).quantize(Decimal('0.01'))
        else:
            original_amount = amount

        if exchange_rate_raw:
            exchange_rate = Decimal(str(exchange_rate_raw)).quantize(Decimal('0.0001'))
        else:
            exchange_rate = Decimal('1.0000')

        if amount <= Decimal('0.00') and original_amount > Decimal('0.00'):
            if exchange_rate > Decimal('0.0000'):
                amount = (original_amount / exchange_rate).quantize(Decimal('0.01'))
            else:
                amount = original_amount

        if amount <= Decimal('0.00'):
            raise ValueError()
    except Exception:
        return Response({"error": "Invalid amount specified."}, status=status.HTTP_400_BAD_REQUEST)

    payment_method = request.data.get('payment_method', 'bank_transfer')
    transaction_ref = request.data.get('transaction_ref', '')
    notes = request.data.get('notes', '')
    if not notes:
        if currency != 'USD':
            notes = f"Wallet top-up deposit request ({currency} {original_amount:,.2f})"
        else:
            notes = f"Wallet top-up deposit request (${amount:,.2f} USD)"
    screenshot = request.FILES.get('payment_screenshot')

    wallet, _ = _get_or_create_wallet_and_credit(request.user)

    tx = WalletCreditTransaction.objects.create(
        user=request.user,
        account_type=WalletCreditTransaction.AccountType.WALLET,
        transaction_type=WalletCreditTransaction.TransactionType.TOPUP,
        amount=amount,
        original_amount=original_amount,
        currency=currency,
        exchange_rate=exchange_rate,
        running_balance=wallet.balance,
        payment_method=payment_method,
        transaction_ref=transaction_ref,
        payment_screenshot=screenshot,
        status=WalletCreditTransaction.Status.PENDING,
        notes=notes
    )

    return Response({
        "message": f"Top-up request for ${amount:.2f} USD ({currency} {original_amount:,.2f}) submitted successfully. It will be credited once verified.",
        "transaction": WalletCreditTransactionSerializer(tx, context={'request': request}).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def credit_repayment_request(request):
    """
    Client initiates a bill settlement/repayment for their used credit line.
    """
    wallet, credit_account = _get_or_create_wallet_and_credit(request.user)

    if credit_account.used_credit <= Decimal('0.00'):
        return Response({"error": "You currently have no outstanding credit bill to settle."}, status=status.HTTP_400_BAD_REQUEST)

    amount_raw = request.data.get('amount')
    original_amount_raw = request.data.get('original_amount')
    currency = str(request.data.get('currency', 'USD')).strip().upper() or 'USD'
    exchange_rate_raw = request.data.get('exchange_rate')

    try:
        amount = Decimal(str(amount_raw)).quantize(Decimal('0.01')) if amount_raw else credit_account.used_credit
        original_amount = Decimal(str(original_amount_raw)).quantize(Decimal('0.01')) if original_amount_raw else amount
        exchange_rate = Decimal(str(exchange_rate_raw)).quantize(Decimal('0.0001')) if exchange_rate_raw else Decimal('1.0000')
        if amount <= Decimal('0.00'):
            raise ValueError()
    except Exception:
        return Response({"error": "Invalid repayment amount specified."}, status=status.HTTP_400_BAD_REQUEST)

    repay_amount = min(amount, credit_account.used_credit)
    payment_method = request.data.get('payment_method', 'bank_transfer')
    transaction_ref = request.data.get('transaction_ref', '')
    notes = request.data.get('notes', '')
    if not notes:
        if currency != 'USD':
            notes = f"Credit bill settlement ({currency} {original_amount:,.2f})"
        else:
            notes = f"Credit line settlement (${repay_amount:,.2f} USD)"
    screenshot = request.FILES.get('payment_screenshot')

    tx = WalletCreditTransaction.objects.create(
        user=request.user,
        account_type=WalletCreditTransaction.AccountType.CREDIT,
        transaction_type=WalletCreditTransaction.TransactionType.REPAYMENT,
        amount=repay_amount,
        original_amount=original_amount,
        currency=currency,
        exchange_rate=exchange_rate,
        running_balance=credit_account.available_credit,
        payment_method=payment_method,
        transaction_ref=transaction_ref,
        payment_screenshot=screenshot,
        status=WalletCreditTransaction.Status.PENDING,
        notes=notes
    )

    return Response({
        "message": f"Repayment slip for ${repay_amount:.2f} USD ({currency} {original_amount:,.2f}) submitted. Credit limit will restore upon admin review.",
        "transaction": WalletCreditTransactionSerializer(tx, context={'request': request}).data
    }, status=status.HTTP_201_CREATED)


# ─── RAZORPAY CREDIT REPAYMENT & WALLET TOPUP GATEWAY ─────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_razorpay_credit_repayment_order(request):
    """
    POST /api/payments/credit/razorpay/create-order/
    Creates a server-side order with Razorpay SDK before launching Checkout modal.
    """
    wallet, credit_account = _get_or_create_wallet_and_credit(request.user)

    if credit_account.used_credit <= Decimal('0.00'):
        return Response({"error": "You currently have no outstanding credit bill to settle."}, status=status.HTTP_400_BAD_REQUEST)

    currency = (request.data.get('currency') or 'INR').upper()
    amount_raw = request.data.get('amount')
    try:
        req_amount = Decimal(str(amount_raw)) if amount_raw else Decimal(str(credit_account.used_credit))
        if req_amount <= Decimal('0.00'):
            raise ValueError()
    except Exception:
        return Response({"error": "Invalid repayment amount specified."}, status=status.HTTP_400_BAD_REQUEST)

    # Determine repay_amount in USD
    if currency == 'USD':
        repay_usd = req_amount
    elif currency == 'INR':
        repay_usd = round(req_amount / USD_TO_INR_RATE, 2)
    else:
        usd_val = request.data.get('amount_usd')
        if usd_val:
            repay_usd = Decimal(str(usd_val))
        else:
            repay_usd = round(req_amount / USD_TO_INR_RATE, 2)

    repay_usd = min(repay_usd, credit_account.used_credit)
    if repay_usd <= Decimal('0.00'):
        return Response({"error": "No outstanding credit debt to repay."}, status=status.HTTP_400_BAD_REQUEST)

    amount_inr = round(repay_usd * USD_TO_INR_RATE, 2)
    amount_paise = int(round(float(amount_inr) * 100))

    key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip()
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '').strip()

    razorpay_order_id = None
    receipt_id = f"rcpt_crd_{request.user.id}_{secrets.token_hex(4)}"
    if key_id and key_secret and not key_id.startswith('dummy'):
        try:
            import razorpay
            client = razorpay.Client(auth=(key_id, key_secret))
            rzp_order = client.order.create(data={
                'amount': amount_paise,
                'currency': 'INR',
                'receipt': receipt_id,
                'notes': {
                    'purpose': 'credit_repayment',
                    'user_id': request.user.id,
                    'user_email': request.user.email,
                    'amount_usd': str(repay_usd),
                    'amount_inr': str(amount_inr)
                }
            })
            razorpay_order_id = rzp_order.get('id')
        except Exception as e:
            print(f"[RAZORPAY CREDIT ORDER WARNING] {e}")
            razorpay_order_id = f"order_crd_{secrets.token_hex(8)}"
    else:
        razorpay_order_id = f"order_crd_{secrets.token_hex(8)}"

    is_sandbox = not bool(key_id and not key_id.startswith('rzp_test') and key_secret)

    return Response({
        "razorpay_order_id": razorpay_order_id,
        "amount_paise": amount_paise,
        "amount_inr": float(amount_inr),
        "amount_usd": float(repay_usd),
        "currency": "INR",
        "key_id": key_id or "rzp_test_shiuli_sandbox",
        "client_name": request.user.get_full_name() or request.user.username,
        "client_email": request.user.email,
        "client_phone": getattr(request.user, 'phone_number', '') or '',
        "is_sandbox": is_sandbox,
        "outstanding_balance_usd": float(credit_account.used_credit),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_razorpay_credit_repayment(request):
    """
    POST /api/payments/credit/razorpay/verify/
    Validates Razorpay payment signature cryptographically, clears credit debt,
    and logs a completed WalletCreditTransaction.
    """
    razorpay_order_id = request.data.get('razorpay_order_id')
    razorpay_payment_id = request.data.get('razorpay_payment_id') or request.data.get('payment_transaction_id')
    razorpay_signature = request.data.get('razorpay_signature')

    if not razorpay_payment_id:
        return Response({"error": "razorpay_payment_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Idempotency check
    existing = WalletCreditTransaction.objects.filter(
        transaction_ref=razorpay_payment_id,
        user=request.user
    ).first()
    if existing:
        _, credit_acc = _get_or_create_wallet_and_credit(request.user)
        return Response({
            "message": "Payment verified and credited previously.",
            "transaction": WalletCreditTransactionSerializer(existing, context={'request': request}).data,
            "credit_account": ClientCreditAccountSerializer(credit_acc).data,
            "already_processed": True
        })

    key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip()
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '').strip()

    is_valid = False
    if key_id and key_secret and razorpay_signature and razorpay_order_id and not key_id.startswith('dummy'):
        try:
            import razorpay
            client = razorpay.Client(auth=(key_id, key_secret))
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            })
            is_valid = True
        except Exception as e:
            print(f"[RAZORPAY CREDIT SIGNATURE CHECK ERROR] {e}")
            is_valid = False
    elif getattr(settings, 'DEBUG', False) or (key_id and key_id.startswith('rzp_test')) or not key_secret:
        if key_secret and razorpay_signature and razorpay_order_id:
            msg = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
            expected = hmac.new(key_secret.encode(), msg, hashlib.sha256).hexdigest()
            is_valid = hmac.compare_digest(expected, razorpay_signature)
        else:
            is_valid = True
    else:
        is_valid = False

    if not is_valid:
        return Response({"error": "Payment cryptographic signature verification failed."}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        wallet, credit_account = _get_or_create_wallet_and_credit(request.user)
        amount_usd_raw = request.data.get('amount_usd')
        if amount_usd_raw:
            repay_usd = Decimal(str(amount_usd_raw))
        else:
            amount_inr_raw = request.data.get('amount_inr')
            if amount_inr_raw:
                repay_usd = round(Decimal(str(amount_inr_raw)) / USD_TO_INR_RATE, 2)
            else:
                repay_usd = credit_account.used_credit

        repay_usd = min(repay_usd, credit_account.used_credit)
        credit_account.used_credit = max(Decimal('0.00'), credit_account.used_credit - repay_usd)
        credit_account.save(update_fields=['used_credit', 'updated_at'])

        tx = WalletCreditTransaction.objects.create(
            user=request.user,
            account_type=WalletCreditTransaction.AccountType.CREDIT,
            transaction_type=WalletCreditTransaction.TransactionType.REPAYMENT,
            amount=repay_usd,
            running_balance=credit_account.available_credit,
            payment_method="razorpay",
            transaction_ref=razorpay_payment_id,
            status=WalletCreditTransaction.Status.COMPLETED,
            notes=f"Online Razorpay Settlement (Order: {razorpay_order_id})",
            verified_at=timezone.now()
        )

    return Response({
        "message": f"Successfully settled ${repay_usd:.2f} USD via Razorpay. Your revolving credit line has been restored!",
        "transaction": WalletCreditTransactionSerializer(tx, context={'request': request}).data,
        "credit_account": ClientCreditAccountSerializer(credit_account).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_razorpay_wallet_topup_order(request):
    """
    POST /api/payments/wallet/razorpay/create-order/
    Creates a server-side order with Razorpay SDK for instant wallet recharge.
    """
    currency = (request.data.get('currency') or 'INR').upper()
    amount_raw = request.data.get('amount')
    try:
        req_amount = Decimal(str(amount_raw))
        if req_amount <= Decimal('0.00'):
            raise ValueError()
    except Exception:
        return Response({"error": "Invalid deposit amount specified."}, status=status.HTTP_400_BAD_REQUEST)

    if currency == 'USD':
        topup_usd = req_amount
    elif currency == 'INR':
        topup_usd = round(req_amount / USD_TO_INR_RATE, 2)
    else:
        usd_val = request.data.get('amount_usd')
        topup_usd = Decimal(str(usd_val)) if usd_val else round(req_amount / USD_TO_INR_RATE, 2)

    amount_inr = round(topup_usd * USD_TO_INR_RATE, 2)
    amount_paise = int(round(float(amount_inr) * 100))

    key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip()
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '').strip()

    razorpay_order_id = None
    receipt_id = f"rcpt_wlt_{request.user.id}_{secrets.token_hex(4)}"
    if key_id and key_secret and not key_id.startswith('dummy'):
        try:
            import razorpay
            client = razorpay.Client(auth=(key_id, key_secret))
            rzp_order = client.order.create(data={
                'amount': amount_paise,
                'currency': 'INR',
                'receipt': receipt_id,
                'notes': {
                    'purpose': 'wallet_topup',
                    'user_id': request.user.id,
                    'user_email': request.user.email,
                    'amount_usd': str(topup_usd),
                    'amount_inr': str(amount_inr)
                }
            })
            razorpay_order_id = rzp_order.get('id')
        except Exception as e:
            print(f"[RAZORPAY WALLET ORDER WARNING] {e}")
            razorpay_order_id = f"order_wlt_{secrets.token_hex(8)}"
    else:
        razorpay_order_id = f"order_wlt_{secrets.token_hex(8)}"

    is_sandbox = not bool(key_id and not key_id.startswith('rzp_test') and key_secret)

    return Response({
        "razorpay_order_id": razorpay_order_id,
        "amount_paise": amount_paise,
        "amount_inr": float(amount_inr),
        "amount_usd": float(topup_usd),
        "currency": "INR",
        "key_id": key_id or "rzp_test_shiuli_sandbox",
        "client_name": request.user.get_full_name() or request.user.username,
        "client_email": request.user.email,
        "client_phone": getattr(request.user, 'phone_number', '') or '',
        "is_sandbox": is_sandbox,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_razorpay_wallet_topup(request):
    """
    POST /api/payments/wallet/razorpay/verify/
    Validates Razorpay payment signature cryptographically and credits wallet balance instantly.
    """
    razorpay_order_id = request.data.get('razorpay_order_id')
    razorpay_payment_id = request.data.get('razorpay_payment_id') or request.data.get('payment_transaction_id')
    razorpay_signature = request.data.get('razorpay_signature')

    if not razorpay_payment_id:
        return Response({"error": "razorpay_payment_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    existing = WalletCreditTransaction.objects.filter(
        transaction_ref=razorpay_payment_id,
        user=request.user
    ).first()
    if existing:
        wallet, _ = _get_or_create_wallet_and_credit(request.user)
        return Response({
            "message": "Payment verified and credited previously.",
            "transaction": WalletCreditTransactionSerializer(existing, context={'request': request}).data,
            "wallet": ClientWalletSerializer(wallet).data,
            "already_processed": True
        })

    key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip()
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '').strip()

    is_valid = False
    if key_id and key_secret and razorpay_signature and razorpay_order_id and not key_id.startswith('dummy'):
        try:
            import razorpay
            client = razorpay.Client(auth=(key_id, key_secret))
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            })
            is_valid = True
        except Exception as e:
            print(f"[RAZORPAY TOPUP SIGNATURE CHECK ERROR] {e}")
            is_valid = False
    elif getattr(settings, 'DEBUG', False) or (key_id and key_id.startswith('rzp_test')) or not key_secret:
        if key_secret and razorpay_signature and razorpay_order_id:
            msg = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
            expected = hmac.new(key_secret.encode(), msg, hashlib.sha256).hexdigest()
            is_valid = hmac.compare_digest(expected, razorpay_signature)
        else:
            is_valid = True
    else:
        is_valid = False

    if not is_valid:
        return Response({"error": "Payment cryptographic signature verification failed."}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        wallet, _ = _get_or_create_wallet_and_credit(request.user)
        amount_usd_raw = request.data.get('amount_usd')
        if amount_usd_raw:
            topup_usd = Decimal(str(amount_usd_raw))
        else:
            amount_inr_raw = request.data.get('amount_inr')
            if amount_inr_raw:
                topup_usd = round(Decimal(str(amount_inr_raw)) / USD_TO_INR_RATE, 2)
            else:
                topup_usd = Decimal('0.00')

        if topup_usd <= Decimal('0.00'):
            return Response({"error": "Invalid topup amount."}, status=status.HTTP_400_BAD_REQUEST)

        wallet.balance += topup_usd
        wallet.save(update_fields=['balance', 'updated_at'])

        tx = WalletCreditTransaction.objects.create(
            user=request.user,
            account_type=WalletCreditTransaction.AccountType.WALLET,
            transaction_type=WalletCreditTransaction.TransactionType.TOPUP,
            amount=topup_usd,
            running_balance=wallet.balance,
            payment_method="razorpay",
            transaction_ref=razorpay_payment_id,
            status=WalletCreditTransaction.Status.COMPLETED,
            notes=f"Online Razorpay Wallet Top-up (Order: {razorpay_order_id})",
            verified_at=timezone.now()
        )

    return Response({
        "message": f"Successfully credited ${topup_usd:.2f} USD to your wallet balance via Razorpay!",
        "transaction": WalletCreditTransactionSerializer(tx, context={'request': request}).data,
        "wallet": ClientWalletSerializer(wallet).data,
    }, status=status.HTTP_200_OK)


# ─── AMAZON-STYLE SPLIT PAYMENT DEDUCTION ─────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@transaction.atomic
def apply_split_payment(request):
    """
    POST /api/payments/apply-split-payment/
    Amazon-style Split Payment: Deducts portion of order total from available credit line
    and/or prepaid wallet float, while the remainder is collected via UPI/QR, Cash, or Gateway.
    """
    credit_amount_raw = request.data.get('credit_amount_usd', 0)
    wallet_amount_raw = request.data.get('wallet_amount_usd', 0)
    notes = request.data.get('notes', 'Split payment for studio order')

    try:
        credit_usd = Decimal(str(credit_amount_raw or 0))
        wallet_usd = Decimal(str(wallet_amount_raw or 0))
    except Exception:
        return Response({"error": "Invalid split amounts provided."}, status=status.HTTP_400_BAD_REQUEST)

    if credit_usd <= 0 and wallet_usd <= 0:
        return Response({"error": "At least one split payment amount (credit or wallet) must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

    wallet, credit_account = _get_or_create_wallet_and_credit(request.user)

    # 1. Deduct from credit line if requested
    if credit_usd > Decimal('0.00'):
        if credit_account.status != ClientCreditAccount.Status.ACTIVE:
            return Response({"error": "Corporate credit line is not active on your account."}, status=status.HTTP_403_FORBIDDEN)
        if credit_account.is_expired:
            return Response({
                "error": f"Corporate credit line has expired on {credit_account.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}. Please contact Studio Admin to renew.",
                "is_expired": True
            }, status=status.HTTP_400_BAD_REQUEST)
        if credit_account.available_credit < credit_usd:
            return Response({
                "error": f"Credit limit exceeded. Requested ${credit_usd:.2f} USD, but available credit is only ${credit_account.available_credit:.2f} USD."
            }, status=status.HTTP_400_BAD_REQUEST)

        credit_account.used_credit += credit_usd
        credit_account.save(update_fields=['used_credit', 'updated_at'])

        WalletCreditTransaction.objects.create(
            user=request.user,
            account_type=WalletCreditTransaction.AccountType.CREDIT,
            transaction_type=WalletCreditTransaction.TransactionType.CREDIT_SPEND,
            amount=credit_usd,
            running_balance=credit_account.available_credit,
            payment_method="corporate_credit_split",
            status=WalletCreditTransaction.Status.COMPLETED,
            notes=f"Split Payment: Charged ${credit_usd:.2f} USD to Credit Line | {notes}"
        )

    # 2. Deduct from wallet if requested
    if wallet_usd > Decimal('0.00'):
        if not wallet.is_active:
            return Response({"error": "Prepaid wallet is not active."}, status=status.HTTP_403_FORBIDDEN)
        if wallet.balance < wallet_usd:
            return Response({
                "error": f"Insufficient wallet float. Requested ${wallet_usd:.2f} USD, but wallet has only ${wallet.balance:.2f} USD."
            }, status=status.HTTP_400_BAD_REQUEST)

        wallet.balance -= wallet_usd
        wallet.save(update_fields=['balance', 'updated_at'])

        WalletCreditTransaction.objects.create(
            user=request.user,
            account_type=WalletCreditTransaction.AccountType.WALLET,
            transaction_type=WalletCreditTransaction.TransactionType.WALLET_SPEND,
            amount=wallet_usd,
            running_balance=wallet.balance,
            payment_method="wallet_split",
            status=WalletCreditTransaction.Status.COMPLETED,
            notes=f"Split Payment: Deducted ${wallet_usd:.2f} USD from Wallet | {notes}"
        )

    return Response({
        "success": True,
        "message": f"Successfully applied split deduction of ${credit_usd + wallet_usd:.2f} USD.",
        "deducted_credit_usd": float(credit_usd),
        "deducted_wallet_usd": float(wallet_usd),
        "new_used_credit": float(credit_account.used_credit),
        "new_available_credit": float(credit_account.available_credit),
        "new_wallet_balance": float(wallet.balance)
    }, status=status.HTTP_200_OK)


# ─── CHECKOUT WITH PREPAID WALLET OR CORPORATE CREDIT ─────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@transaction.atomic
def checkout_with_wallet(request):
    """
    1-Click instant purchase using prepaid wallet funds.
    Supports catalog product purchase or custom order milestone stage payment.
    """
    wallet, _ = _get_or_create_wallet_and_credit(request.user)
    if not wallet.is_active:
        return Response({"error": "Your wallet is currently disabled. Please contact support."}, status=status.HTTP_403_FORBIDDEN)

    purchase_type = request.data.get('type', 'product')  # 'product' or 'order_stage'

    # Case A: Ready CAD Product Purchase
    if purchase_type == 'product':
        product_id = request.data.get('product_id')
        license_type = request.data.get('license_type', 'atelier')
        if not product_id:
            return Response({"error": "product_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        product = _resolve_single_product(product_id)
        if not product:
            return Response({"error": "Product not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        # Commercial license has 1.8x markup
        base_price = Decimal(str(product.price or 0.00))
        price_to_pay = round(base_price * Decimal('1.80'), 2) if license_type == 'commercial' else round(base_price, 2)

        if wallet.balance < price_to_pay:
            return Response({
                "error": f"Insufficient wallet balance. Total is ${price_to_pay:.2f} USD, but your wallet has ${wallet.balance:.2f} USD.",
                "required": float(price_to_pay),
                "current_balance": float(wallet.balance),
            }, status=status.HTTP_400_BAD_REQUEST)

        wallet.balance -= price_to_pay
        wallet.save(update_fields=['balance', 'updated_at'])

        # Create paid Purchase record
        purchase = Purchase.objects.create(
            buyer=request.user,
            product=product,
            license_type=Purchase.LicenseType.COMMERCIAL if license_type == 'commercial' else Purchase.LicenseType.ATELIER,
            price_paid=price_to_pay,
            payment_transaction_id=f"WALLET-TX-{uuid.uuid4().hex[:10].upper()}",
            payment_method="wallet",
            payment_details="Paid instantly with Shiuli Prepaid Wallet",
            status=Purchase.Status.PAID,
            download_enabled_by_admin=True,
            admin_verified_at=timezone.now()
        )

        # Generate 1-click DownloadToken
        token_str = uuid.uuid4().hex
        DownloadToken.objects.create(
            purchase=purchase,
            token=token_str,
            locked_email=request.user.email,
            expires_at=timezone.now() + timezone.timedelta(days=7),
            status=DownloadToken.Status.AVAILABLE
        )

        # Log Wallet Transaction
        WalletCreditTransaction.objects.create(
            user=request.user,
            account_type=WalletCreditTransaction.AccountType.WALLET,
            transaction_type=WalletCreditTransaction.TransactionType.WALLET_SPEND,
            amount=price_to_pay,
            running_balance=wallet.balance,
            reference_purchase=purchase,
            payment_method="wallet",
            status=WalletCreditTransaction.Status.COMPLETED,
            notes=f"Purchased '{product.title}' ({license_type.title()} License)"
        )

        return Response({
            "message": f"Successfully purchased '{product.title}' using wallet!",
            "purchase_id": purchase.id,
            "new_balance": float(wallet.balance),
            "download_token": token_str,
            "download_url": f"/download/{token_str}/"
        }, status=status.HTTP_200_OK)

    # Case B: Custom Order Milestone Stage or Order Settlement
    elif purchase_type in ('order_stage', 'order', 'custom_order'):
        stage_id = request.data.get('stage_id')
        order_id = request.data.get('order_id')
        stage = None

        if stage_id:
            try:
                stage = OrderPaymentStage.objects.get(id=stage_id, order__client=request.user)
            except OrderPaymentStage.DoesNotExist:
                return Response({"error": "Payment stage not found or not owned by user."}, status=status.HTTP_404_NOT_FOUND)
        elif order_id:
            stage = OrderPaymentStage.objects.filter(order_id=order_id, order__client=request.user, status=OrderPaymentStage.Status.PENDING).order_by('order_index').first()
            if not stage:
                stage = OrderPaymentStage.objects.filter(order_id=order_id, order__client=request.user).exclude(status=OrderPaymentStage.Status.PAID).first()
            if not stage:
                return Response({"error": "No unpaid milestone stage found for this order."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"error": "stage_id or order_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        if stage.status == OrderPaymentStage.Status.PAID:
            return Response({"error": "This stage has already been paid."}, status=status.HTTP_400_BAD_REQUEST)

        stage_usd = round(Decimal(str(stage.amount)) / USD_TO_INR_RATE, 2)
        if wallet.balance < stage_usd:
            return Response({
                "error": f"Insufficient wallet balance. Stage amount is ${stage_usd:.2f} USD, but your wallet has ${wallet.balance:.2f} USD.",
                "required": float(stage_usd),
                "current_balance": float(wallet.balance),
            }, status=status.HTTP_400_BAD_REQUEST)

        wallet.balance -= stage_usd
        wallet.save(update_fields=['balance', 'updated_at'])

        process_stage_payment_success(stage)

        WalletCreditTransaction.objects.create(
            user=request.user,
            account_type=WalletCreditTransaction.AccountType.WALLET,
            transaction_type=WalletCreditTransaction.TransactionType.WALLET_SPEND,
            amount=stage_usd,
            running_balance=wallet.balance,
            reference_order=stage.order,
            payment_method="wallet",
            status=WalletCreditTransaction.Status.COMPLETED,
            notes=f"Paid Order #{stage.order_id} Stage '{stage.label}'"
        )

        return Response({
            "message": f"Successfully paid '{stage.label}' stage using wallet!",
            "new_balance": float(wallet.balance),
            "stage_id": stage.id
        }, status=status.HTTP_200_OK)

    # Case C: Cart Bundle Checkout
    elif purchase_type == 'cart':
        product_ids = request.data.get('product_ids', [])
        if not product_ids:
            return Response({"error": "product_ids list is required for cart checkout."}, status=status.HTTP_400_BAD_REQUEST)

        products = _resolve_products(product_ids)
        if not products:
            return Response({"error": "No valid active products found in cart."}, status=status.HTTP_404_NOT_FOUND)

        total_usd = sum([Decimal(str(p.price or 0.00)) for p in products])
        if wallet.balance < total_usd:
            return Response({
                "error": f"Insufficient wallet balance. Cart total is ${total_usd:.2f} USD, but your wallet has ${wallet.balance:.2f} USD.",
                "required": float(total_usd),
                "current_balance": float(wallet.balance),
            }, status=status.HTTP_400_BAD_REQUEST)

        wallet.balance -= total_usd
        wallet.save(update_fields=['balance', 'updated_at'])

        purchased_items = []
        for p in products:
            purchase = Purchase.objects.create(
                buyer=request.user,
                product=p,
                license_type=Purchase.LicenseType.ATELIER,
                price_paid=p.price,
                payment_transaction_id=f"WALLET-CART-{uuid.uuid4().hex[:8].upper()}",
                payment_method="wallet",
                payment_details="Bag Checkout with Shiuli Prepaid Wallet",
                status=Purchase.Status.PAID,
                download_enabled_by_admin=True,
                admin_verified_at=timezone.now()
            )
            token_str = uuid.uuid4().hex
            DownloadToken.objects.create(
                purchase=purchase,
                token=token_str,
                locked_email=request.user.email,
                expires_at=timezone.now() + timezone.timedelta(days=7),
                status=DownloadToken.Status.AVAILABLE
            )
            purchased_items.append({"product_id": p.id, "title": p.title, "purchase_id": purchase.id, "token": token_str})

        WalletCreditTransaction.objects.create(
            user=request.user,
            account_type=WalletCreditTransaction.AccountType.WALLET,
            transaction_type=WalletCreditTransaction.TransactionType.WALLET_SPEND,
            amount=total_usd,
            running_balance=wallet.balance,
            payment_method="wallet",
            status=WalletCreditTransaction.Status.COMPLETED,
            notes=f"Purchased cart bundle ({len(products)} CAD packages)"
        )

        return Response({
            "message": f"Successfully purchased {len(products)} designs using wallet!",
            "purchases": purchased_items,
            "new_balance": float(wallet.balance)
        }, status=status.HTTP_200_OK)

    return Response({"error": "Unsupported purchase type."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@transaction.atomic
def checkout_with_credit(request):
    """
    Purchase on corporate postpaid credit line.
    Requires an active credit line with enough available credit.
    """
    _, credit_account = _get_or_create_wallet_and_credit(request.user)
    if credit_account.status != ClientCreditAccount.Status.ACTIVE:
        return Response({
            "error": "Corporate credit line is not active on your account. Please contact Studio Admin."
        }, status=status.HTTP_403_FORBIDDEN)

    if credit_account.is_expired:
        return Response({
            "error": f"Your corporate credit line has expired on {credit_account.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}. Please contact Studio Admin to renew.",
            "is_expired": True
        }, status=status.HTTP_400_BAD_REQUEST)

    purchase_type = request.data.get('type', 'product')

    # Case A: Ready CAD Product Purchase
    if purchase_type == 'product':
        product_id = request.data.get('product_id')
        license_type = request.data.get('license_type', 'atelier')
        if not product_id:
            return Response({"error": "product_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        product = _resolve_single_product(product_id)
        if not product:
            return Response({"error": "Product not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        base_price = Decimal(str(product.price or 0.00))
        price_to_pay = round(base_price * Decimal('1.80'), 2) if license_type == 'commercial' else round(base_price, 2)

        if credit_account.available_credit < price_to_pay:
            return Response({
                "error": f"Credit limit exceeded. Total is ${price_to_pay:.2f} USD, but available credit is ${credit_account.available_credit:.2f} USD.",
                "required": float(price_to_pay),
                "available_credit": float(credit_account.available_credit),
            }, status=status.HTTP_400_BAD_REQUEST)

        credit_account.used_credit += price_to_pay
        credit_account.save(update_fields=['used_credit', 'updated_at'])

        purchase = Purchase.objects.create(
            buyer=request.user,
            product=product,
            license_type=Purchase.LicenseType.COMMERCIAL if license_type == 'commercial' else Purchase.LicenseType.ATELIER,
            price_paid=price_to_pay,
            payment_transaction_id=f"CREDIT-TX-{uuid.uuid4().hex[:10].upper()}",
            payment_method="corporate_credit",
            payment_details="Purchased on approved Corporate Credit Line",
            status=Purchase.Status.PAID,
            download_enabled_by_admin=True,
            admin_verified_at=timezone.now()
        )

        token_str = uuid.uuid4().hex
        DownloadToken.objects.create(
            purchase=purchase,
            token=token_str,
            locked_email=request.user.email,
            expires_at=timezone.now() + timezone.timedelta(days=7),
            status=DownloadToken.Status.AVAILABLE
        )

        WalletCreditTransaction.objects.create(
            user=request.user,
            account_type=WalletCreditTransaction.AccountType.CREDIT,
            transaction_type=WalletCreditTransaction.TransactionType.CREDIT_SPEND,
            amount=price_to_pay,
            running_balance=credit_account.available_credit,
            reference_purchase=purchase,
            payment_method="corporate_credit",
            status=WalletCreditTransaction.Status.COMPLETED,
            notes=f"Purchased on credit: '{product.title}'"
        )

        return Response({
            "message": f"Successfully purchased '{product.title}' on Corporate Credit!",
            "purchase_id": purchase.id,
            "used_credit": float(credit_account.used_credit),
            "available_credit": float(credit_account.available_credit),
            "download_token": token_str,
            "download_url": f"/download/{token_str}/"
        }, status=status.HTTP_200_OK)

    # Case B: Custom Order Milestone Stage or Order Settlement
    elif purchase_type in ('order_stage', 'order', 'custom_order'):
        stage_id = request.data.get('stage_id')
        order_id = request.data.get('order_id')
        stage = None

        if stage_id:
            try:
                stage = OrderPaymentStage.objects.get(id=stage_id, order__client=request.user)
            except OrderPaymentStage.DoesNotExist:
                return Response({"error": "Payment stage not found or not owned by user."}, status=status.HTTP_404_NOT_FOUND)
        elif order_id:
            stage = OrderPaymentStage.objects.filter(order_id=order_id, order__client=request.user, status=OrderPaymentStage.Status.PENDING).order_by('order_index').first()
            if not stage:
                stage = OrderPaymentStage.objects.filter(order_id=order_id, order__client=request.user).exclude(status=OrderPaymentStage.Status.PAID).first()
            if not stage:
                return Response({"error": "No unpaid milestone stage found for this order."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"error": "stage_id or order_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        if stage.status == OrderPaymentStage.Status.PAID:
            return Response({"error": "This stage has already been paid."}, status=status.HTTP_400_BAD_REQUEST)

        stage_usd = round(Decimal(str(stage.amount)) / USD_TO_INR_RATE, 2)
        if credit_account.available_credit < stage_usd:
            return Response({
                "error": f"Credit limit exceeded. Stage amount is ${stage_usd:.2f} USD, but available credit is ${credit_account.available_credit:.2f} USD.",
                "required": float(stage_usd),
                "available_credit": float(credit_account.available_credit),
            }, status=status.HTTP_400_BAD_REQUEST)

        credit_account.used_credit += stage_usd
        credit_account.save(update_fields=['used_credit', 'updated_at'])

        process_stage_payment_success(stage)

        WalletCreditTransaction.objects.create(
            user=request.user,
            account_type=WalletCreditTransaction.AccountType.CREDIT,
            transaction_type=WalletCreditTransaction.TransactionType.CREDIT_SPEND,
            amount=stage_usd,
            running_balance=credit_account.available_credit,
            reference_order=stage.order,
            payment_method="corporate_credit",
            status=WalletCreditTransaction.Status.COMPLETED,
            notes=f"Paid on credit: Order #{stage.order_id} Stage '{stage.label}'"
        )

        return Response({
            "message": f"Successfully confirmed '{stage.label}' stage on Corporate Credit!",
            "used_credit": float(credit_account.used_credit),
            "available_credit": float(credit_account.available_credit),
            "stage_id": stage.id
        }, status=status.HTTP_200_OK)

    # Case C: Cart Bundle Checkout on Credit
    elif purchase_type == 'cart':
        product_ids = request.data.get('product_ids', [])
        if not product_ids:
            return Response({"error": "product_ids list is required for cart checkout."}, status=status.HTTP_400_BAD_REQUEST)

        products = _resolve_products(product_ids)
        if not products:
            return Response({"error": "No valid active products found in cart."}, status=status.HTTP_404_NOT_FOUND)

        total_usd = sum([Decimal(str(p.price or 0.00)) for p in products])
        if credit_account.available_credit < total_usd:
            return Response({
                "error": f"Credit limit exceeded. Cart total is ${total_usd:.2f} USD, but available credit is ${credit_account.available_credit:.2f} USD.",
                "required": float(total_usd),
                "available_credit": float(credit_account.available_credit),
            }, status=status.HTTP_400_BAD_REQUEST)

        credit_account.used_credit += total_usd
        credit_account.save(update_fields=['used_credit', 'updated_at'])

        purchased_items = []
        for p in products:
            purchase = Purchase.objects.create(
                buyer=request.user,
                product=p,
                license_type=Purchase.LicenseType.ATELIER,
                price_paid=p.price,
                payment_transaction_id=f"CREDIT-CART-{uuid.uuid4().hex[:8].upper()}",
                payment_method="corporate_credit",
                payment_details="Bag Checkout on Corporate Credit Line",
                status=Purchase.Status.PAID,
                download_enabled_by_admin=True,
                admin_verified_at=timezone.now()
            )
            token_str = uuid.uuid4().hex
            DownloadToken.objects.create(
                purchase=purchase,
                token=token_str,
                locked_email=request.user.email,
                expires_at=timezone.now() + timezone.timedelta(days=7),
                status=DownloadToken.Status.AVAILABLE
            )
            purchased_items.append({"product_id": p.id, "title": p.title, "purchase_id": purchase.id, "token": token_str})

        WalletCreditTransaction.objects.create(
            user=request.user,
            account_type=WalletCreditTransaction.AccountType.CREDIT,
            transaction_type=WalletCreditTransaction.TransactionType.CREDIT_SPEND,
            amount=total_usd,
            running_balance=credit_account.available_credit,
            payment_method="corporate_credit",
            status=WalletCreditTransaction.Status.COMPLETED,
            notes=f"Purchased cart bundle on credit ({len(products)} CAD packages)"
        )

        return Response({
            "message": f"Successfully purchased {len(products)} designs on Corporate Credit!",
            "purchases": purchased_items,
            "used_credit": float(credit_account.used_credit),
            "available_credit": float(credit_account.available_credit)
        }, status=status.HTTP_200_OK)

    return Response({"error": "Unsupported purchase type."}, status=status.HTTP_400_BAD_REQUEST)


# ─── ADMIN ENDPOINTS ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_client_credits_list(request):
    """
    Admin master directory listing all clients with wallet balances,
    corporate credit accounts, utilization stats, and pending verification requests.
    """
    clients = User.objects.filter(role=User.Role.CLIENT).order_by('-date_joined')
    
    # Auto-initialize missing wallets/credit lines for all clients
    client_list = []
    total_wallet_float = Decimal('0.00')
    total_credit_granted = Decimal('0.00')
    total_credit_used = Decimal('0.00')

    for u in clients:
        wallet, credit_acc = _get_or_create_wallet_and_credit(u)
        total_wallet_float += wallet.balance
        if credit_acc.status == ClientCreditAccount.Status.ACTIVE:
            total_credit_granted += credit_acc.credit_limit
            total_credit_used += credit_acc.used_credit

        client_list.append({
            "id": u.id,
            "username": u.username,
            "name": f"{u.first_name} {u.last_name}".strip() or u.username,
            "email": u.email,
            "phone": getattr(u, 'phone_number', '') or '',
            "wallet": ClientWalletSerializer(wallet).data,
            "credit_account": ClientCreditAccountSerializer(credit_acc).data,
            "orders_count": u.orders.count() if hasattr(u, 'orders') else 0,
            "purchases_count": u.purchases.count() if hasattr(u, 'purchases') else 0,
            "date_joined": u.date_joined.strftime('%b %d, %Y') if u.date_joined else '',
        })

    pending_txs = WalletCreditTransaction.objects.filter(status=WalletCreditTransaction.Status.PENDING).order_by('-created_at')
    recent_audit_txs = WalletCreditTransaction.objects.all().order_by('-created_at')[:40]

    return Response({
        "metrics": {
            "total_wallet_float": round(float(total_wallet_float), 2),
            "total_credit_granted": round(float(total_credit_granted), 2),
            "total_credit_used": round(float(total_credit_used), 2),
            "total_credit_available": round(float(max(Decimal('0.00'), total_credit_granted - total_credit_used)), 2),
            "pending_verifications_count": pending_txs.count(),
            "active_credit_clients_count": sum(1 for c in client_list if c['credit_account']['status'] == 'active'),
        },
        "clients": client_list,
        "pending_verifications": WalletCreditTransactionSerializer(pending_txs, many=True, context={'request': request}).data,
        "recent_audit_transactions": WalletCreditTransactionSerializer(recent_audit_txs, many=True, context={'request': request}).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_set_credit_limit(request):
    """
    SuperAdmin sets or adjusts a client's credit limit, status, and validity timeline (hours, days, custom date, or unlimited).
    """
    client_id = request.data.get('client_id')
    credit_limit_raw = request.data.get('credit_limit')
    new_status = request.data.get('status', ClientCreditAccount.Status.ACTIVE)
    notes = request.data.get('notes', '')
    timeline_type = request.data.get('timeline_type')  # 'hours', 'days', 'custom_datetime', 'unlimited'
    timeline_value = request.data.get('timeline_value')
    explicit_expires_at = request.data.get('expires_at')
    duration_label = request.data.get('validity_duration')

    if not client_id:
        return Response({"error": "client_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=client_id)
    except User.DoesNotExist:
        return Response({"error": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

    _, credit_acc = _get_or_create_wallet_and_credit(user)
    
    if credit_limit_raw is not None:
        try:
            credit_acc.credit_limit = Decimal(str(credit_limit_raw))
        except Exception:
            return Response({"error": "Invalid credit limit value."}, status=status.HTTP_400_BAD_REQUEST)

    if new_status in [s.value for s in ClientCreditAccount.Status]:
        credit_acc.status = new_status

    if notes:
        credit_acc.notes = notes

    # Process Validity Timeline
    now = timezone.now()
    if timeline_type == 'hours':
        try:
            hrs = float(timeline_value or 1)
            credit_acc.expires_at = now + datetime.timedelta(hours=hrs)
            credit_acc.validity_duration = f"{int(hrs) if hrs.is_integer() else hrs} Hour{'s' if hrs != 1 else ''}"
        except Exception as e:
            print(f"[TIMELINE HOURS ERROR] {e}")
    elif timeline_type == 'days':
        try:
            dys = float(timeline_value or 1)
            credit_acc.expires_at = now + datetime.timedelta(days=dys)
            credit_acc.validity_duration = f"{int(dys) if dys.is_integer() else dys} Day{'s' if dys != 1 else ''}"
        except Exception as e:
            print(f"[TIMELINE DAYS ERROR] {e}")
    elif timeline_type == 'custom_datetime' and explicit_expires_at:
        try:
            from django.utils.dateparse import parse_datetime
            parsed = parse_datetime(explicit_expires_at)
            if parsed:
                credit_acc.expires_at = parsed
                credit_acc.validity_duration = duration_label or "Custom Timeline"
        except Exception as e:
            print(f"[TIMELINE CUSTOM DATE ERROR] {e}")
    elif timeline_type == 'unlimited':
        credit_acc.expires_at = None
        credit_acc.validity_duration = "Permanent Net-30"
    elif explicit_expires_at is not None:
        if explicit_expires_at == '' or explicit_expires_at is False:
            credit_acc.expires_at = None
            credit_acc.validity_duration = "Permanent Net-30"
        else:
            try:
                from django.utils.dateparse import parse_datetime
                parsed = parse_datetime(explicit_expires_at)
                if parsed:
                    credit_acc.expires_at = parsed
                    if duration_label:
                        credit_acc.validity_duration = duration_label
            except Exception:
                pass

    credit_acc.granted_by = request.user
    credit_acc.save()

    # Record Admin Audit Transaction in ledger
    expiry_msg = f" (Expires in {credit_acc.validity_duration}: {credit_acc.expires_at.strftime('%Y-%m-%d %H:%M UTC')})" if credit_acc.expires_at else " (No Expiry / Permanent)"
    WalletCreditTransaction.objects.create(
        user=user,
        account_type=WalletCreditTransaction.AccountType.CREDIT,
        transaction_type=WalletCreditTransaction.TransactionType.ADMIN_ADJUSTMENT,
        amount=credit_acc.credit_limit,
        running_balance=credit_acc.available_credit,
        payment_method="admin_portal",
        transaction_ref=f"CRD-LIMIT-{secrets.token_hex(4).upper()}",
        status=WalletCreditTransaction.Status.COMPLETED,
        notes=f"Admin set credit facility to ${credit_acc.credit_limit:.2f} USD{expiry_msg}. Status: {credit_acc.status}. Notes: {notes or 'N/A'}"
    )

    return Response({
        "message": f"Updated Corporate Credit Line for {user.email or user.username} with validity '{credit_acc.validity_duration or 'Unlimited'}' successfully.",
        "credit_account": ClientCreditAccountSerializer(credit_acc).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_adjust_wallet(request):
    """
    SuperAdmin credits or debits a client's prepaid wallet (e.g. bonus, manual adjustment).
    """
    client_id = request.data.get('client_id')
    amount_raw = request.data.get('amount')
    action = request.data.get('action', 'credit')  # 'credit' (add) or 'debit' (subtract)
    notes = request.data.get('notes', 'Admin balance adjustment')

    if not client_id or not amount_raw:
        return Response({"error": "client_id and amount are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=client_id)
    except User.DoesNotExist:
        return Response({"error": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        amount = Decimal(str(amount_raw))
        if amount <= Decimal('0.00'):
            raise ValueError()
    except Exception:
        return Response({"error": "Invalid amount."}, status=status.HTTP_400_BAD_REQUEST)

    wallet, _ = _get_or_create_wallet_and_credit(user)

    if action == 'credit':
        wallet.balance += amount
    elif action == 'debit':
        if wallet.balance < amount:
            return Response({"error": f"Cannot debit ${amount:.2f}; client balance is only ${wallet.balance:.2f}."}, status=status.HTTP_400_BAD_REQUEST)
        wallet.balance -= amount
    else:
        return Response({"error": "Action must be 'credit' or 'debit'."}, status=status.HTTP_400_BAD_REQUEST)

    wallet.save(update_fields=['balance', 'updated_at'])

    tx = WalletCreditTransaction.objects.create(
        user=user,
        account_type=WalletCreditTransaction.AccountType.WALLET,
        transaction_type=WalletCreditTransaction.TransactionType.ADMIN_ADJUSTMENT,
        amount=amount,
        running_balance=wallet.balance,
        status=WalletCreditTransaction.Status.COMPLETED,
        notes=f"Admin {action.upper()}: {notes}",
        verified_by=request.user,
        verified_at=timezone.now()
    )

    return Response({
        "message": f"Successfully {action}ed ${amount:.2f} USD for {user.email or user.username}.",
        "new_balance": float(wallet.balance),
        "transaction": WalletCreditTransactionSerializer(tx, context={'request': request}).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdmin])
@transaction.atomic
def admin_verify_transaction(request):
    """
    SuperAdmin approves or declines a pending wallet top-up or credit line repayment.
    """
    tx_id = request.data.get('transaction_id')
    decision = request.data.get('decision', 'approve')  # 'approve' or 'decline'
    reason = request.data.get('reason', '')

    if not tx_id:
        return Response({"error": "transaction_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        tx = WalletCreditTransaction.objects.get(id=tx_id)
    except WalletCreditTransaction.DoesNotExist:
        return Response({"error": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND)

    if tx.status != WalletCreditTransaction.Status.PENDING:
        return Response({"error": f"Transaction is already {tx.status}."}, status=status.HTTP_400_BAD_REQUEST)

    wallet, credit_acc = _get_or_create_wallet_and_credit(tx.user)

    if decision == 'approve':
        if tx.transaction_type == WalletCreditTransaction.TransactionType.TOPUP:
            wallet.balance += tx.amount
            wallet.save(update_fields=['balance', 'updated_at'])
            tx.running_balance = wallet.balance

        elif tx.transaction_type == WalletCreditTransaction.TransactionType.REPAYMENT:
            credit_acc.used_credit = max(Decimal('0.00'), credit_acc.used_credit - tx.amount)
            credit_acc.save(update_fields=['used_credit', 'updated_at'])
            tx.running_balance = credit_acc.available_credit

        tx.status = WalletCreditTransaction.Status.COMPLETED
        tx.verified_by = request.user
        tx.verified_at = timezone.now()
        tx.save()
        msg = f"Transaction #{tx.id} approved successfully."

    elif decision == 'decline':
        tx.status = WalletCreditTransaction.Status.DECLINED
        tx.verified_by = request.user
        tx.verified_at = timezone.now()
        if reason:
            tx.notes = f"{tx.notes} | Declined: {reason}"
        tx.save()
        msg = f"Transaction #{tx.id} was declined."
    else:
        return Response({"error": "Decision must be 'approve' or 'decline'."}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": msg,
        "transaction": WalletCreditTransactionSerializer(tx, context={'request': request}).data
    }, status=status.HTTP_200_OK)
