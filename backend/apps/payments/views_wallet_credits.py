import uuid
from decimal import Decimal
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
    if not amount_raw:
        return Response({"error": "Amount is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = Decimal(str(amount_raw))
        if amount <= Decimal('0.00'):
            raise ValueError()
    except Exception:
        return Response({"error": "Invalid amount specified."}, status=status.HTTP_400_BAD_REQUEST)

    payment_method = request.data.get('payment_method', 'bank_transfer')
    transaction_ref = request.data.get('transaction_ref', '')
    notes = request.data.get('notes', 'Wallet deposit request')
    screenshot = request.FILES.get('payment_screenshot')

    wallet, _ = _get_or_create_wallet_and_credit(request.user)

    tx = WalletCreditTransaction.objects.create(
        user=request.user,
        account_type=WalletCreditTransaction.AccountType.WALLET,
        transaction_type=WalletCreditTransaction.TransactionType.TOPUP,
        amount=amount,
        running_balance=wallet.balance,
        payment_method=payment_method,
        transaction_ref=transaction_ref,
        payment_screenshot=screenshot,
        status=WalletCreditTransaction.Status.PENDING,
        notes=notes
    )

    return Response({
        "message": f"Top-up request for ${amount:.2f} USD submitted successfully. It will be credited once verified.",
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
    try:
        amount = Decimal(str(amount_raw)) if amount_raw else credit_account.used_credit
        if amount <= Decimal('0.00'):
            raise ValueError()
    except Exception:
        return Response({"error": "Invalid repayment amount specified."}, status=status.HTTP_400_BAD_REQUEST)

    repay_amount = min(amount, credit_account.used_credit)
    payment_method = request.data.get('payment_method', 'bank_transfer')
    transaction_ref = request.data.get('transaction_ref', '')
    notes = request.data.get('notes', 'Credit line settlement')
    screenshot = request.FILES.get('payment_screenshot')

    tx = WalletCreditTransaction.objects.create(
        user=request.user,
        account_type=WalletCreditTransaction.AccountType.CREDIT,
        transaction_type=WalletCreditTransaction.TransactionType.REPAYMENT,
        amount=repay_amount,
        running_balance=credit_account.available_credit,
        payment_method=payment_method,
        transaction_ref=transaction_ref,
        payment_screenshot=screenshot,
        status=WalletCreditTransaction.Status.PENDING,
        notes=notes
    )

    return Response({
        "message": f"Repayment slip for ${repay_amount:.2f} USD submitted. Credit limit will restore upon admin review.",
        "transaction": WalletCreditTransactionSerializer(tx, context={'request': request}).data
    }, status=status.HTTP_201_CREATED)


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
    SuperAdmin sets or adjusts a client's credit limit and status.
    """
    client_id = request.data.get('client_id')
    credit_limit_raw = request.data.get('credit_limit')
    new_status = request.data.get('status', ClientCreditAccount.Status.ACTIVE)
    notes = request.data.get('notes', '')

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

    credit_acc.granted_by = request.user
    credit_acc.save()

    return Response({
        "message": f"Updated Corporate Credit Line for {user.email or user.username} successfully.",
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
