import secrets
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.http import FileResponse
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.catalog.models import Product, ProductFile
from .models import Purchase, DownloadOTP, DownloadToken


def generate_6digit_otp():
    """Generates a cryptographically secure 6-digit integer string."""
    return f"{secrets.randbelow(900000) + 100000}"


def mask_email(email):
    """Masks email for display e.g. r***@gmail.com"""
    if not email or '@' not in email:
        return email
    parts = email.split('@')
    name = parts[0]
    domain = parts[1]
    if len(name) <= 2:
        masked_name = name[0] + '*'
    else:
        masked_name = name[0] + '*' * (len(name) - 2) + name[-1]
    return f"{masked_name}@{domain}"


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_purchase(request):
    """
    POST /api/purchases/
    Creates a Purchase record after payment gateway success.
    Triggers 6-digit OTP generation and emails it to buyer's registered account email ONLY.
    """
    product_id = request.data.get('product_id')
    license_type = request.data.get('license_type', 'atelier')
    payment_transaction_id = request.data.get('payment_transaction_id', f"TXN-{secrets.token_hex(8).upper()}")

    if not product_id:
        return Response({"error": "product_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    product_obj = None
    if str(product_id).isdigit():
        product_obj = Product.objects.filter(id=int(product_id)).first()
    if not product_obj:
        product_obj = Product.objects.filter(slug=str(product_id)).first()
    if not product_obj:
        title_query = str(product_id).replace('-', ' ')
        product_obj = Product.objects.filter(title__icontains=title_query).first() or Product.objects.first()

    if not product_obj:
        return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

    product = product_obj


    # Calculate price based on license
    if license_type == 'commercial':
        markup_pct = float(product.commercial_price_markup or 80.0)
        price_paid = float(product.price) * (1.0 + (markup_pct / 100.0))
    else:
        price_paid = float(product.price)

    now = timezone.now()

    purchase = Purchase.objects.create(
        buyer=request.user,
        product=product,
        license_type=license_type,
        price_paid=price_paid,
        payment_transaction_id=payment_transaction_id,
        status=Purchase.Status.PAID,
        otp_generation_count=1,
        last_otp_generated_at=now
    )

    # Generate 6-digit OTP code & store hashed
    otp_code = generate_6digit_otp()
    otp_hash = make_password(otp_code)
    expires_at = now + timedelta(minutes=10)

    DownloadOTP.objects.create(
        purchase=purchase,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        is_verified=False
    )

    # Print OTP in terminal for instant dev verification
    print("\n" + "=" * 70)
    print(f"🔑 [TERMINAL OTP DEBUG LOG]")
    print(f"   Purchase ID: #{purchase.id}")
    print(f"   Product:     {product.title}")
    print(f"   Buyer Email: {request.user.email}")
    print(f"   VERIFICATION CODE (OTP): >>> {otp_code} <<<")
    print("=" * 70 + "\n")

    masked_email = mask_email(request.user.email)
    try:
        send_mail(
            subject=f"Verify Your Email to Unlock Your CAD Download - Purchase #{purchase.id}",
            message=(
                f"Hello {request.user.get_full_name() or request.user.username},\n\n"
                f"Thank you for purchasing '{product.title}' ({purchase.get_license_type_display()}) from Shiuli CAD Studio.\n\n"
                f"Your 6-digit email verification code is: {otp_code}\n\n"
                f"This code will expire in 10 minutes. Please enter it on the website to unlock your secure download link.\n\n"
                f"If you did not make this purchase, please contact support immediately.\n\n"
                f"Warm regards,\nShiuli CAD Studio Security Team"
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shiulicadstudio.com'),
            recipient_list=[request.user.email],
            fail_silently=True
        )
    except Exception as e:
        print(f"[EMAIL SERVICE WARNING] Failed to dispatch email: {e}")

    return Response({
        "message": f"Purchase completed! A 6-digit verification code has been sent to {masked_email}.",
        "purchase_id": purchase.id,
        "product_title": product.title,
        "masked_email": masked_email,
        "expires_in_seconds": 600
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resend_otp(request, purchase_id):
    """
    POST /api/purchases/{id}/resend-otp/
    Rate-limited OTP resend (60-second cooldown + max 5 requests/hour).
    """
    try:
        purchase = Purchase.objects.get(id=purchase_id, buyer=request.user)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase not found."}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()

    # Hourly rate limit: Max 5 OTP generations per hour per purchase
    if purchase.last_otp_generated_at and (now - purchase.last_otp_generated_at) < timedelta(hours=1):
        if purchase.otp_generation_count >= 5:
            return Response({
                "error": "Maximum OTP requests reached for this hour. Please try again later or contact support."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    else:
        purchase.otp_generation_count = 0

    # Cooldown limit: 60 seconds
    if purchase.last_otp_generated_at and (now - purchase.last_otp_generated_at) < timedelta(seconds=60):
        remaining_seconds = int(60 - (now - purchase.last_otp_generated_at).total_seconds())
        return Response({
            "error": f"Please wait {remaining_seconds} seconds before requesting a new OTP."
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    otp_code = generate_6digit_otp()
    otp_hash = make_password(otp_code)
    expires_at = now + timedelta(minutes=10)

    DownloadOTP.objects.filter(purchase=purchase, is_verified=False).delete()
    DownloadOTP.objects.create(
        purchase=purchase,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        is_verified=False
    )

    purchase.otp_generation_count += 1
    purchase.last_otp_generated_at = now
    purchase.save(update_fields=['otp_generation_count', 'last_otp_generated_at'])

    # Print OTP in terminal for instant dev verification
    print("\n" + "=" * 70)
    print(f"🔑 [TERMINAL RESEND OTP LOG]")
    print(f"   Purchase ID: #{purchase.id}")
    print(f"   Buyer Email: {request.user.email}")
    print(f"   NEW VERIFICATION CODE (OTP): >>> {otp_code} <<<")
    print("=" * 70 + "\n")

    masked_email = mask_email(request.user.email)
    try:
        send_mail(
            subject=f"New Verification Code - Purchase #{purchase.id}",
            message=(
                f"Your new 6-digit verification code is: {otp_code}\n\n"
                f"This code will expire in 10 minutes."
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shiulicadstudio.com'),
            recipient_list=[request.user.email],
            fail_silently=True
        )
    except Exception as e:
        print(f"[EMAIL SERVICE WARNING] Failed to dispatch email: {e}")

    return Response({
        "message": f"A new 6-digit verification code has been sent to {masked_email}.",
        "masked_email": masked_email,
        "expires_in_seconds": 600
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_otp(request, purchase_id):
    """
    POST /api/purchases/{id}/verify-otp/
    Validates code against otp_hash, locks out after 5 failed attempts.
    On success: generates single-use DownloadToken, emails secure link, returns confirmation ONLY.
    """
    code = str(request.data.get('code', '')).strip()
    if not code:
        return Response({"error": "Verification code is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        purchase = Purchase.objects.get(id=purchase_id, buyer=request.user)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase not found."}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()
    otp_obj = DownloadOTP.objects.filter(purchase=purchase, is_verified=False).order_by('-created_at').first()

    if not otp_obj:
        return Response({"error": "No active verification code found. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

    if otp_obj.expires_at < now:
        return Response({"error": "Verification code has expired. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

    if otp_obj.attempts >= 5:
        return Response({"error": "Too many failed attempts. This code has been locked out. Please request a new code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    if not check_password(code, otp_obj.otp_hash):
        otp_obj.attempts += 1
        otp_obj.save(update_fields=['attempts'])
        remaining = 5 - otp_obj.attempts
        if remaining > 0:
            return Response({"error": f"Invalid verification code. {remaining} attempt(s) remaining."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error": "Too many failed attempts. Code locked out. Please request a new code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    otp_obj.is_verified = True
    otp_obj.save(update_fields=['is_verified'])

    # Generate single-use download token using secrets
    raw_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(hours=48)

    DownloadToken.objects.create(
        purchase=purchase,
        token=raw_token,
        locked_email=request.user.email,
        expires_at=expires_at,
        is_used=False
    )

    download_url = f"http://localhost:3000/download/{raw_token}"
    
    # Print Download Link in terminal for instant dev verification
    print("\n" + "=" * 70)
    print(f"🔗 [TERMINAL SECURE DOWNLOAD LINK LOG]")
    print(f"   Purchase ID: #{purchase.id}")
    print(f"   Buyer Email: {request.user.email}")
    print(f"   DOWNLOAD LINK: >>> {download_url} <<<")
    print("=" * 70 + "\n")

    masked_email = mask_email(request.user.email)

    try:
        send_mail(
            subject=f"Your Secure CAD Download Link - '{purchase.product.title}'",
            message=(
                f"Hello {request.user.get_full_name() or request.user.username},\n\n"
                f"Your email verification is successful!\n\n"
                f"Here is your single-use secure download link for '{purchase.product.title}' ({purchase.get_license_type_display()}):\n\n"
                f"{download_url}\n\n"
                f"IMPORTANT SECURITY NOTES:\n"
                f"- This link is valid for 48 hours and can only be downloaded EXACTLY ONCE.\n"
                f"- This link is locked to your account ({request.user.email}). Forwarded links will not work for anyone else.\n"
                f"- Once used, the link will immediately expire.\n\n"
                f"Thank you for choosing Shiuli CAD Studio.\n\n"
                f"Warm regards,\nShiuli CAD Studio Security Team"
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shiulicadstudio.com'),
            recipient_list=[request.user.email],
            fail_silently=True
        )
    except Exception as e:
        print(f"[EMAIL SERVICE WARNING] Failed to dispatch download token email: {e}")

    # Return success confirmation ONLY (Never return raw token string in API JSON response)
    return Response({
        "message": f"Verified! Your single-use secure download link has been sent to {masked_email}.",
        "masked_email": masked_email,
        "purchase_id": purchase.id,
        "product_title": purchase.product.title
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_cad_file(request, token):
    """
    GET /download/{token}/ (and /api/payments/download/{token}/)
    Authenticated single-use file streaming endpoint.
    - Validates token exists, not expired, is_used == False.
    - Validates request.user.email == token.locked_email.
    - Streams CAD file directly from PROTECTED_MEDIA_ROOT.
    - Marks token as used, records timestamp & client IP.
    """
    try:
        token_obj = DownloadToken.objects.select_related('purchase', 'purchase__product', 'purchase__buyer', 'order', 'order__client').get(token=token)
    except DownloadToken.DoesNotExist:
        return Response({
            "error": "This download link is invalid, expired, or has already been used. If this is your purchase, request a new secure link from your Order History."
        }, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()

    if token_obj.is_used:
        return Response({
            "error": "This download link has already been used and has expired. You can request a new download link from your Order History."
        }, status=status.HTTP_400_BAD_REQUEST)

    if token_obj.expires_at < now:
        return Response({
            "error": "This download link has expired (48-hour limit). Please request a new secure link from your Order History."
        }, status=status.HTTP_400_BAD_REQUEST)

    # Email lock validation
    if request.user.email.lower() != token_obj.locked_email.lower():
        buyer_user = token_obj.purchase.buyer if token_obj.purchase else (token_obj.order.client if token_obj.order else None)
        if buyer_user and request.user == buyer_user:
            masked_orig = mask_email(token_obj.locked_email)
            return Response({
                "error": f"This purchase was registered under your previous email address ({masked_orig}). Please verify with your original email or contact support to update your purchase record."
            }, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({
                "error": "This download link belongs to a different account and cannot be used here."
            }, status=status.HTTP_403_FORBIDDEN)

    # Handle Order deliverables if this token is for a Custom Order
    if token_obj.order:
        order = token_obj.order
        from apps.custom_orders.models import OrderDeliverable
        deliverable = OrderDeliverable.objects.filter(
            order=order,
            file_type__in=['3dm', 'stl']
        ).first() or OrderDeliverable.objects.filter(order=order).first()

        if not deliverable or not deliverable.file:
            return Response({"error": "CAD deliverable file not found for this custom order. Please contact support."}, status=status.HTTP_404_NOT_FOUND)

        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else request.META.get('REMOTE_ADDR', '127.0.0.1')

        token_obj.is_used = True
        token_obj.used_at = now
        token_obj.used_from_ip = ip
        token_obj.save(update_fields=['is_used', 'used_at', 'used_from_ip'])

        # Update Order status to COMPLETED
        order.status = 'completed'
        order.save(update_fields=['status'])

        try:
            file_handle = deliverable.file.open('rb')
            filename = deliverable.file.name.split('/')[-1]
            response = FileResponse(file_handle, content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({"error": f"Unable to stream file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    product = token_obj.purchase.product
    cad_file_obj = ProductFile.objects.filter(
        product=product,
        file_type__in=[ProductFile.FileType.FILE_3DM, ProductFile.FileType.STL]
    ).first()

    if not cad_file_obj or not cad_file_obj.file:
        return Response({"error": "CAD design file not found for this product. Please contact support."}, status=status.HTTP_404_NOT_FOUND)

    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')

    # Immediately mark token as used
    token_obj.is_used = True
    token_obj.used_at = now
    token_obj.used_from_ip = ip
    token_obj.save(update_fields=['is_used', 'used_at', 'used_from_ip'])

    try:
        file_handle = cad_file_obj.file.open('rb')
        filename = cad_file_obj.file.name.split('/')[-1]
        response = FileResponse(file_handle, content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except Exception as e:
        return Response({"error": f"Unable to stream file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resend_download_link(request, purchase_id):
    """
    POST /api/purchases/{id}/resend-download-link/
    Re-delivery flow from My Downloads. Enforces max 3 re-deliveries limit per purchase.
    Restarts flow with fresh OTP generation.
    """
    try:
        purchase = Purchase.objects.get(id=purchase_id, buyer=request.user)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase not found."}, status=status.HTTP_404_NOT_FOUND)

    if purchase.redelivery_count >= 3:
        return Response({
            "error": "Maximum limit of 3 download re-deliveries reached for this purchase. Need help? Contact Support."
        }, status=status.HTTP_400_BAD_REQUEST)

    purchase.redelivery_count += 1
    purchase.save(update_fields=['redelivery_count'])

    otp_code = generate_6digit_otp()
    otp_hash = make_password(otp_code)
    expires_at = timezone.now() + timedelta(minutes=10)

    DownloadOTP.objects.filter(purchase=purchase, is_verified=False).delete()
    DownloadOTP.objects.create(
        purchase=purchase,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        is_verified=False
    )

    # Print OTP in terminal for instant dev verification
    print("\n" + "=" * 70)
    print(f"🔑 [TERMINAL RE-DELIVERY OTP LOG]")
    print(f"   Purchase ID: #{purchase.id}")
    print(f"   Buyer Email: {request.user.email}")
    print(f"   RE-DELIVERY CODE (OTP): >>> {otp_code} <<<")
    print("=" * 70 + "\n")

    masked_email = mask_email(request.user.email)
    try:
        send_mail(
            subject=f"Re-Delivery Verification Code - Purchase #{purchase.id}",
            message=(
                f"Hello {request.user.get_full_name() or request.user.username},\n\n"
                f"You requested a new download link for '{purchase.product.title}'.\n\n"
                f"Your 6-digit verification code is: {otp_code}\n\n"
                f"Enter this code on the site to generate a new single-use download link.\n\n"
                f"Re-delivery count: {purchase.redelivery_count} of 3 max allowed."
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shiulicadstudio.com'),
            recipient_list=[request.user.email],
            fail_silently=True
        )
    except Exception as e:
        print(f"[EMAIL SERVICE WARNING] Failed to dispatch re-delivery email: {e}")

    return Response({
        "message": f"Re-delivery started! A new verification code has been sent to {masked_email}.",
        "purchase_id": purchase.id,
        "masked_email": masked_email,
        "redelivery_count": purchase.redelivery_count,
        "max_redeliveries": 3
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_my_purchases(request):
    """
    GET /api/purchases/mine/
    Returns client purchase history for "My Downloads" dashboard.
    """
    purchases = Purchase.objects.filter(buyer=request.user).select_related('product').order_by('-purchased_at')
    data = []
    for p in purchases:
        latest_token = p.tokens.order_by('-created_at').first()
        latest_otp = p.otps.order_by('-created_at').first()
        data.append({
            "id": p.id,
            "product_id": p.product.id,
            "product_title": p.product.title,
            "license_type": p.license_type,
            "license_type_display": p.get_license_type_display(),
            "price_paid": str(p.price_paid),
            "payment_transaction_id": p.payment_transaction_id,
            "status": p.status,
            "redelivery_count": p.redelivery_count,
            "max_redeliveries": 3,
            "purchased_at": p.purchased_at,
            "is_otp_verified": latest_otp.is_verified if latest_otp else False,
            "is_downloaded": latest_token.is_used if latest_token else False,
            "downloaded_at": latest_token.used_at if (latest_token and latest_token.is_used) else None,
            "downloaded_from_ip": latest_token.used_from_ip if (latest_token and latest_token.is_used) else None
        })
    return Response(data)
