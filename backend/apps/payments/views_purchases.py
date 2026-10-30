import secrets
import base64
import os
import shutil
import tempfile
import zipfile
import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from django.contrib.auth.hashers import make_password, check_password
from django.core.files.base import ContentFile
from apps.core.email_service import send_dynamic_mail as send_mail, send_otp_email, build_luxury_email_html
from django.http import FileResponse, StreamingHttpResponse, HttpResponse
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import IsStaffOrAdmin
from apps.catalog.models import Product, ProductFile
from .models import Purchase, DownloadOTP, DownloadToken

logger = logging.getLogger(__name__)

CHUNK_SIZE = 1024 * 1024  # 1 MB chunk streaming size


def get_frontend_base_url(request=None):
    """
    Returns the frontend client URL (e.g., http://localhost:3000 in dev, or FRONTEND_URL in prod).
    Ensures backend port 8000 is never used for customer-facing frontend links.
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', None)
    if frontend_url:
        return frontend_url.rstrip('/')
    if request:
        origin = request.META.get('HTTP_ORIGIN') or request.META.get('HTTP_REFERER')
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            if parsed.scheme and parsed.netloc:
                if parsed.port == 8000 or ':8000' in parsed.netloc:
                    hostname = parsed.hostname or 'localhost'
                    return f"{parsed.scheme}://{hostname}:3000"
                return f"{parsed.scheme}://{parsed.netloc}".rstrip('/')
    return "http://localhost:3000"


def stream_file_iterator(file_handle, chunk_size=CHUNK_SIZE, on_complete=None):
    """
    Zero-memory-buffering chunk generator for an open file handle.
    Invokes on_complete() only when the file has been fully read and sent (EOF reached).
    Ensures file handle is closed upon completion or interruption.
    """
    completed = False
    try:
        while True:
            chunk = file_handle.read(chunk_size)
            if not chunk:
                completed = True
                break
            yield chunk
    finally:
        try:
            file_handle.close()
        except Exception as close_err:
            logger.warning("Error closing file handle: %s", close_err)
        if completed and on_complete:
            try:
                on_complete()
            except Exception as comp_err:
                logger.error("Error executing on_complete callback: %s", comp_err)


def stream_temp_zip_iterator(temp_zip_path, chunk_size=CHUNK_SIZE, on_complete=None):
    """
    Zero-memory-buffering chunk generator for a disk-backed temporary ZIP archive.
    Streams 1 MB chunks, cleans up the temporary file in finally block,
    and calls on_complete() only when the full archive was streamed.
    """
    completed = False
    try:
        with open(temp_zip_path, 'rb') as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    completed = True
                    break
                yield chunk
    finally:
        try:
            if os.path.exists(temp_zip_path):
                os.unlink(temp_zip_path)
        except Exception as cleanup_err:
            logger.warning("Failed to remove temporary zip file %s: %s", temp_zip_path, cleanup_err)
        if completed and on_complete:
            try:
                on_complete()
            except Exception as comp_err:
                logger.error("Error executing on_complete callback: %s", comp_err)


def stream_gdrive_iterator(drive_file_id, token_id=None, chunk_size=CHUNK_SIZE, on_complete=None):
    """
    Zero-memory-buffering chunk generator from Google Drive.
    Invokes on_complete() only when all bytes have been streamed (EOF reached).
    Restores token to available state if quota error occurs during streaming.
    """
    completed = False
    try:
        from apps.core.gdrive_service import stream_file, GoogleDriveQuotaError
        for chunk in stream_file(drive_file_id, chunk_size=chunk_size):
            yield chunk
        completed = True
    except GoogleDriveQuotaError as quota_err:
        logger.error("Drive quota exceeded while streaming file %s: %s", drive_file_id, quota_err)
        if token_id:
            try:
                from django.db.models import F
                DownloadToken.objects.filter(id=token_id).update(
                    status=DownloadToken.Status.AVAILABLE,
                    attempt_count=F('attempt_count') - 1,
                    in_progress_started_at=None
                )
            except Exception as e:
                logger.error("Failed to reset token on stream quota error: %s", e)
        raise
    finally:
        if completed and on_complete:
            try:
                on_complete()
            except Exception as comp_err:
                logger.error("Error executing on_complete callback: %s", comp_err)


def build_disk_backed_zip(file_items):
    """
    file_items is a list of tuples: (clean_filename, file_source, is_gdrive)
    where:
      - if is_gdrive=True: file_source is drive_file_id (streamed directly to disk)
      - if is_gdrive=False and file_source is str/Path: filesystem path
      - if is_gdrive=False and file_source is handle: open file handle
    Writes directly to a disk-backed temporary file using ZIP_STORED.
    Returns the absolute path to the temporary ZIP file.
    """
    temp_zip = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
    temp_zip_path = temp_zip.name
    temp_zip.close()

    try:
        with zipfile.ZipFile(temp_zip_path, 'w', compression=zipfile.ZIP_STORED, allowZip64=True) as zf:
            for item in file_items:
                clean_name = item[0]
                source = item[1]
                is_gdrive = item[2] if len(item) > 2 else False

                if is_gdrive:
                    from apps.core.gdrive_service import stream_file
                    with zf.open(clean_name, 'w', force_zip64=True) as dest_entry:
                        for chunk in stream_file(source):
                            dest_entry.write(chunk)
                elif isinstance(source, (str, bytes, os.PathLike)) and os.path.exists(source):
                    zf.write(source, arcname=clean_name)
                else:
                    with zf.open(clean_name, 'w', force_zip64=True) as dest_entry:
                        shutil.copyfileobj(source, dest_entry, length=CHUNK_SIZE)
                    try:
                        source.close()
                    except Exception:
                        pass
        return temp_zip_path
    except Exception:
        if os.path.exists(temp_zip_path):
            try:
                os.unlink(temp_zip_path)
            except Exception:
                pass
        raise


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
def create_razorpay_purchase_order(request):
    """
    POST /api/purchases/create-order/
    Creates a server-side order with Razorpay SDK before launching Checkout modal.
    """
    product_id = request.data.get('product_id')
    license_type = request.data.get('license_type', 'atelier')

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
    from apps.catalog.pricing_service import detect_customer_country, resolve_product_pricing
    country_code, _ = detect_customer_country(request)
    pricing_info = resolve_product_pricing(product, country_code=country_code, license_type=license_type)
    price_paid = float(pricing_info['unit_price'])

    amount_paise = int(round(price_paid * 100))
    key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip()
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '').strip()

    razorpay_order_id = None
    if key_id and key_secret and not key_id.startswith('dummy'):
        try:
            import razorpay
            client = razorpay.Client(auth=(key_id, key_secret))
            rzp_order = client.order.create(data={
                'amount': amount_paise,
                'currency': 'INR',
                'receipt': f"rcpt_prod_{product.id}_{secrets.token_hex(4)}",
                'notes': {
                    'product_id': product.id,
                    'product_title': product.title,
                    'buyer_email': request.user.email,
                    'license_type': license_type
                }
            })
            razorpay_order_id = rzp_order.get('id')
        except Exception as e:
            print(f"[RAZORPAY ORDER WARNING] {e}")
            razorpay_order_id = f"order_prod_{secrets.token_hex(8)}"
    else:
        razorpay_order_id = f"order_prod_{secrets.token_hex(8)}"

    is_sandbox = not bool(key_id and not key_id.startswith('rzp_test') and key_secret)

    return Response({
        "razorpay_order_id": razorpay_order_id,
        "amount": price_paid,
        "amount_paise": amount_paise,
        "currency": "INR",
        "key_id": key_id or "rzp_test_shiuli_sandbox",
        "product_id": product.id,
        "product_title": product.title,
        "license_type": license_type,
        "is_sandbox": is_sandbox
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_razorpay_purchase(request):
    """
    POST /api/purchases/verify/
    Validates Razorpay payment signature cryptographically.
    Idempotently creates Purchase record and triggers OTP generation.
    """
    product_id = request.data.get('product_id')
    license_type = request.data.get('license_type', 'atelier')
    razorpay_order_id = request.data.get('razorpay_order_id')
    razorpay_payment_id = request.data.get('razorpay_payment_id') or request.data.get('payment_transaction_id')
    razorpay_signature = request.data.get('razorpay_signature')

    if not product_id or not razorpay_payment_id:
        return Response({"error": "product_id and razorpay_payment_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    # Idempotency Check: if purchase already processed for this payment ID, return existing
    existing = Purchase.objects.filter(payment_transaction_id=razorpay_payment_id, buyer=request.user).first()
    if existing:
        masked_email = mask_email(request.user.email)
        return Response({
            "message": f"Purchase verified! Verification code sent to {masked_email}.",
            "purchase_id": existing.id,
            "masked_email": masked_email,
            "expires_in_seconds": 600,
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
            print(f"[SIGNATURE CHECK ERROR] {e}")
            is_valid = False
    elif getattr(settings, 'DEBUG', False) or (key_id and key_id.startswith('rzp_test')) or not key_secret:
        # Dev test mode: HMAC or simulated test payment
        if key_secret and razorpay_signature and razorpay_order_id:
            import hmac, hashlib
            msg = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
            expected = hmac.new(key_secret.encode(), msg, hashlib.sha256).hexdigest()
            is_valid = hmac.compare_digest(expected, razorpay_signature)
        else:
            is_valid = True
    else:
        is_valid = False

    if not is_valid:
        return Response({"error": "Payment cryptographic signature verification failed."}, status=status.HTTP_400_BAD_REQUEST)

    # Resolve product
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
    from apps.catalog.pricing_service import detect_customer_country, resolve_product_pricing
    country_code, _ = detect_customer_country(request)
    pricing_info = resolve_product_pricing(product, country_code=country_code, license_type=license_type)
    price_paid = float(pricing_info['unit_price'])

    now = timezone.now()
    purchase = Purchase.objects.create(
        buyer=request.user,
        product=product,
        license_type=license_type,
        price_paid=price_paid,
        pricing_mode=pricing_info.get('pricing_mode', 'global'),
        pricing_tier=pricing_info.get('tier_name', ''),
        country_code=country_code,
        currency=pricing_info.get('currency', 'INR'),
        original_price_usd=pricing_info.get('price_usd'),
        exchange_rate=pricing_info.get('exchange_rate'),
        pricing_snapshot=pricing_info,
        payment_transaction_id=razorpay_payment_id,
        status=Purchase.Status.PAID,
        otp_generation_count=1,
        last_otp_generated_at=now
    )

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

    # Dev terminal log
    print("\n" + "=" * 70)
    print(f"[TERMINAL OTP LOG - VERIFIED PURCHASE]")
    print(f"   Purchase ID: #{purchase.id}")
    print(f"   Transaction: {razorpay_payment_id}")
    print(f"   Buyer Email: {request.user.email}")
    print(f"   VERIFICATION CODE (OTP): >>> {otp_code} <<<")
    print("=" * 70 + "\n")

    masked_email = mask_email(request.user.email)
    try:
        send_otp_email(
            email=request.user.email,
            otp_code=otp_code,
            name=request.user.get_full_name() or request.user.username,
            purpose="purchase_otp"
        )
    except Exception as e:
        print(f"[EMAIL SERVICE WARNING] {e}")

    return Response({
        "message": f"Payment verified! A 6-digit verification code has been sent to {masked_email}.",
        "purchase_id": purchase.id,
        "masked_email": masked_email,
        "expires_in_seconds": 600
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_purchase(request):
    """
    POST /api/purchases/
    Creates a Purchase record for a CAD product.
    Supports dynamic UPI and Cash/Check offline payments with screenshot & details proof.
    Requests requiring admin verification are held in PENDING status until approved by Studio Admin.
    """
    product_id = request.data.get('product_id')
    license_type = request.data.get('license_type', 'atelier')
    payment_transaction_id = request.data.get('payment_transaction_id') or f"TXN-{secrets.token_hex(6).upper()}"
    payment_method = request.data.get('payment_method', 'upi')
    payment_details = str(request.data.get('payment_details') or '').strip()
    auto_confirm = request.data.get('auto_confirm', False)

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

    # Calculate authoritative price and pricing snapshot
    from apps.catalog.pricing_service import detect_customer_country, resolve_product_pricing
    country_code, _ = detect_customer_country(request)
    pricing_info = resolve_product_pricing(product, country_code=country_code, license_type=license_type)
    price_paid = float(pricing_info['unit_price'])

    now = timezone.now()

    # User submitted offline/UPI/cash proof needs admin collection confirmation
    is_pending = not auto_confirm

    purchase = Purchase(
        buyer=request.user,
        product=product,
        license_type=license_type,
        price_paid=price_paid,
        pricing_mode=pricing_info.get('pricing_mode', 'global'),
        pricing_tier=pricing_info.get('tier_name', ''),
        country_code=country_code,
        currency=pricing_info.get('currency', 'INR'),
        original_price_usd=pricing_info.get('price_usd'),
        exchange_rate=pricing_info.get('exchange_rate'),
        pricing_snapshot=pricing_info,
        payment_transaction_id=payment_transaction_id,
        payment_method=payment_method,
        payment_details=payment_details,
        status=Purchase.Status.PENDING if is_pending else Purchase.Status.PAID,
        otp_generation_count=0 if is_pending else 1,
        last_otp_generated_at=None if is_pending else now
    )

    # Process Screenshot file (either multipart File or base64 data URI)
    screenshot_file = request.FILES.get('payment_screenshot')
    screenshot_data = request.data.get('payment_screenshot')
    if not screenshot_file and isinstance(screenshot_data, str) and screenshot_data.startswith('data:image'):
        try:
            format_part, imgstr = screenshot_data.split(';base64,')
            ext = format_part.split('/')[-1]
            if ext == 'jpeg':
                ext = 'jpg'
            file_name = f"proof_pur_{request.user.id}_{secrets.token_hex(4)}.{ext}"
            screenshot_file = ContentFile(base64.b64decode(imgstr), name=file_name)
        except Exception as e:
            print(f"[SCREENSHOT DECODE WARNING] {e}")

    if screenshot_file:
        purchase.payment_screenshot = screenshot_file

    purchase.save()

    masked_email = mask_email(request.user.email)

    if is_pending:
        # Do not generate OTP yet; wait for Admin to confirm payment collection
        print("\n" + "=" * 70)
        print(f"[PENDING PAYMENT PROOF SUBMITTED]")
        print(f"   Purchase ID: #{purchase.id}")
        print(f"   Product:     {product.title}")
        print(f"   Buyer:       {request.user.email}")
        print(f"   Method:      {payment_method.upper()}")
        print(f"   Txn Ref:     {payment_transaction_id}")
        print(f"   Details:     {payment_details}")
        print("=" * 70 + "\n")

        return Response({
            "message": "Payment proof submitted! Atelier accounts team will verify collection and enable your secure download shortly.",
            "purchase_id": purchase.id,
            "product_title": product.title,
            "status": "pending",
            "payment_transaction_id": purchase.payment_transaction_id,
            "payment_method": payment_method,
            "is_pending_verification": True,
            "masked_email": masked_email
        }, status=status.HTTP_201_CREATED)

    # If auto-confirmed (e.g. verified gateway), generate OTP immediately
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
    print(f"[TERMINAL OTP DEBUG LOG]")
    print(f"   Purchase ID: #{purchase.id}")
    print(f"   Product:     {product.title}")
    print(f"   Buyer Email: {request.user.email}")
    print(f"   VERIFICATION CODE (OTP): >>> {otp_code} <<<")
    print("=" * 70 + "\n")

    try:
        send_otp_email(
            email=request.user.email,
            otp_code=otp_code,
            name=request.user.get_full_name() or request.user.username,
            purpose="purchase_otp"
        )
    except Exception as e:
        print(f"[EMAIL SERVICE WARNING] Failed to dispatch email: {e}")

    return Response({
        "message": f"Purchase completed! A 6-digit verification code has been sent to {masked_email}.",
        "purchase_id": purchase.id,
        "product_title": product.title,
        "masked_email": masked_email,
        "expires_in_seconds": 600,
        "status": "paid"
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsStaffOrAdmin])
def admin_approve_purchase(request, purchase_id):
    """
    POST /api/purchases/{id}/admin-approve/
    Admin confirms payment collection. Marks purchase as PAID and dispatches 6-digit verification OTP to buyer.
    """
    try:
        purchase = Purchase.objects.select_related('buyer', 'product').get(id=purchase_id)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase record not found."}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()
    purchase.status = Purchase.Status.PAID
    purchase.admin_verified_at = now
    purchase.admin_verified_by = request.user
    purchase.otp_generation_count = 1
    purchase.last_otp_generated_at = now
    purchase.save(update_fields=['status', 'admin_verified_at', 'admin_verified_by', 'otp_generation_count', 'last_otp_generated_at'])

    # Generate single-use download token & store in DB
    raw_token = secrets.token_urlsafe(32)
    token_expires_at = now + timedelta(hours=48)

    # Invalidate any old unused tokens for this purchase
    DownloadToken.objects.filter(purchase=purchase, is_used=False).update(status=DownloadToken.Status.EXPIRED)

    DownloadToken.objects.create(
        purchase=purchase,
        token=raw_token,
        locked_email=purchase.buyer.email,
        expires_at=token_expires_at,
        is_used=False,
        status=DownloadToken.Status.AVAILABLE,
        attempt_count=0
    )

    base_url = get_frontend_base_url(request)
    download_url = f"{base_url}/download/{raw_token}"

    # Also generate 6-digit OTP code & store hashed for optional dashboard entry
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

    masked_email = mask_email(purchase.buyer.email)

    # Terminal log
    print("\n" + "=" * 70)
    print(f"✨ [ADMIN APPROVED PAYMENT — ONE-TIME SECURE DOWNLOAD LINK READY]")
    print(f"   Purchase ID: #{purchase.id}")
    print(f"   Product:     {purchase.product.title}")
    print(f"   Buyer Email: {purchase.buyer.email}")
    print(f"   ONE-TIME DOWNLOAD LINK: >>> {download_url} <<<")
    print(f"   VERIFICATION CODE (OTP): >>> {otp_code} <<<")
    print("=" * 70 + "\n")

    try:
        subject = f"Your Secure CAD Download Link — '{purchase.product.title}'"
        plain_msg = (
            f"Hello {purchase.buyer.get_full_name() or purchase.buyer.username},\n\n"
            f"Your payment has been verified and confirmed by Shiuli CAD Studio!\n\n"
            f"Here is your single-use secure download link for '{purchase.product.title}' ({purchase.get_license_type_display()}):\n\n"
            f"{download_url}\n\n"
            f"CRITICAL SECURITY NOTE:\n"
            f"- For security and intellectual property protection, this link can only be downloaded ONCE.\n"
            f"- The link is locked to your registered account ({purchase.buyer.email}) and will expire in 48 hours or immediately upon verified download completion.\n\n"
            f"Warm regards,\nShiuli CAD Studio Engineering Team"
        )
        html_msg = build_luxury_email_html(
            headline="Your 3D CAD Production Package is Ready",
            paragraphs=[
                f"Hello {purchase.buyer.get_full_name() or purchase.buyer.username},",
                f"Your payment has been verified and confirmed by Atelier Accounts! Your production-ready jewellery CAD package for <strong>'{purchase.product.title}'</strong> ({purchase.get_license_type_display()}) is ready for download.",
                "Click the button below to download your watertight .3DM, castable .STL, and 4K studio renders:",
                "<strong>Single-Use Security Notice:</strong> This link can only be downloaded <strong>once</strong>. After your download finishes, the token will be permanently closed for IP security."
            ],
            action_button_text="DOWNLOAD 3D CAD PACKAGE",
            action_button_url=download_url,
            footer_note="Valid for a single download within 48 hours. If you did not initiate this request, contact support immediately."
        )
        send_mail(
            subject=subject,
            message=plain_msg,
            recipient_list=[purchase.buyer.email],
            html_message=html_msg,
            fail_silently=False
        )
        print(f"[EMAIL SUCCESS] One-time download link dispatched to {purchase.buyer.email}")
    except Exception as e:
        print(f"[EMAIL SERVICE WARNING] Failed to dispatch admin approval email: {e}")

    resp_data = {
        "message": f"Payment verified! One-time secure download link dispatched to {masked_email}.",
        "purchase_id": purchase.id,
        "product_title": purchase.product.title,
        "status": "paid",
        "masked_email": masked_email,
        "download_url": download_url,
    }
    if settings.DEBUG:
        resp_data["debug_otp"] = otp_code
        resp_data["debug_download_url"] = download_url

    return Response(resp_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsStaffOrAdmin])
def admin_decline_purchase(request, purchase_id):
    """
    POST /api/purchases/{id}/admin-decline/
    Admin declines payment proof submission.
    Marks purchase as DECLINED, stores decline reason, invalidates any tokens,
    creates in-app notification for the customer, and emails customer notice.
    """
    try:
        purchase = Purchase.objects.select_related('buyer', 'product').get(id=purchase_id)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase record not found."}, status=status.HTTP_404_NOT_FOUND)

    reason = (request.data.get('reason') or '').strip()
    if not reason:
        reason = "Payment proof verification could not be validated against bank records."

    now = timezone.now()
    purchase.status = Purchase.Status.DECLINED
    purchase.decline_reason = reason
    purchase.declined_at = now
    purchase.declined_by = request.user
    purchase.download_enabled_by_admin = False
    purchase.save(update_fields=['status', 'decline_reason', 'declined_at', 'declined_by', 'download_enabled_by_admin'])

    # Invalidate any active tokens or OTPs
    DownloadToken.objects.filter(purchase=purchase).update(status=DownloadToken.Status.EXPIRED)
    DownloadOTP.objects.filter(purchase=purchase).delete()

    # Create in-app Notification for customer
    try:
        from apps.notifications.models import Notification
        Notification.objects.create(
            recipient=purchase.buyer,
            title=f"Payment Verification Declined — {purchase.product.title}",
            body=f"Your payment proof for '{purchase.product.title}' was declined by Atelier Accounts. Reason: {reason}. You can re-submit your transaction details in your My Downloads dashboard.",
            notification_type="purchase_declined"
        )
    except Exception as notif_err:
        print(f"[NOTIFICATION WARNING] Failed to create notification: {notif_err}")

    # Dispatch Luxury Email to customer
    try:
        subject = f"Payment Verification Notice — '{purchase.product.title}'"
        plain_msg = (
            f"Hello {purchase.buyer.get_full_name() or purchase.buyer.username},\n\n"
            f"We reviewed the payment proof submitted for '{purchase.product.title}'. "
            f"Unfortunately, our accounts team was unable to verify the transaction in our bank ledger.\n\n"
            f"Reason provided: {reason}\n\n"
            f"Next steps:\n"
            f"- Visit your Shiuli CAD Studio My Account > Purchases dashboard.\n"
            f"- Click 'Re-submit Payment Proof' to provide your updated UTR transaction reference number or a clear receipt screenshot.\n\n"
            f"If you believe this is in error or need assistance, please contact our support desk.\n\n"
            f"Warm regards,\nShiuli CAD Studio Accounts"
        )
        html_msg = build_luxury_email_html(
            headline="Payment Verification Notice",
            paragraphs=[
                f"Hello {purchase.buyer.get_full_name() or purchase.buyer.username},",
                f"Our accounts team reviewed the payment details submitted for <strong>'{purchase.product.title}'</strong> ({purchase.get_license_type_display()}).",
                f"Unfortunately, the payment proof could not be verified in our bank ledger. <strong>Reason:</strong> {reason}",
                "Please visit your account dashboard to re-submit your valid bank reference (UTR) or upload a clear transaction screenshot."
            ],
            action_button_text="GO TO MY PURCHASES",
            action_button_url="http://localhost:3000/account?tab=downloads",
            footer_note="If you already made the transfer, please reply to this email with your bank payment advice."
        )
        send_mail(
            subject=subject,
            message=plain_msg,
            recipient_list=[purchase.buyer.email],
            html_message=html_msg,
            fail_silently=False
        )
        print(f"[EMAIL SUCCESS] Payment decline notice dispatched to {purchase.buyer.email}")
    except Exception as email_err:
        print(f"[EMAIL WARNING] Failed to dispatch decline email: {email_err}")

    return Response({
        "message": f"Payment proof for Purchase #{purchase.id} has been marked as declined and customer notified.",
        "purchase_id": purchase.id,
        "status": "declined",
        "decline_reason": reason
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resubmit_purchase_proof(request, purchase_id):
    """
    POST /api/purchases/{id}/resubmit-proof/
    Customer re-submits transaction reference and/or screenshot after a payment proof decline.
    Resets status to PENDING and clears previous decline reason.
    """
    try:
        purchase = Purchase.objects.get(id=purchase_id, buyer=request.user)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase record not found."}, status=status.HTTP_404_NOT_FOUND)

    if purchase.status not in [Purchase.Status.DECLINED, Purchase.Status.PENDING]:
        return Response({"error": f"Cannot re-submit proof for purchase with status '{purchase.status}'."}, status=status.HTTP_400_BAD_REQUEST)

    payment_transaction_id = request.data.get('payment_transaction_id') or request.data.get('utr_number') or purchase.payment_transaction_id
    payment_method = request.data.get('payment_method') or purchase.payment_method
    payment_details = request.data.get('payment_details', purchase.payment_details)

    screenshot_file = request.FILES.get('payment_screenshot')
    screenshot_data = request.data.get('payment_screenshot')
    if not screenshot_file and isinstance(screenshot_data, str) and screenshot_data.startswith('data:image'):
        try:
            format_part, imgstr = screenshot_data.split(';base64,')
            ext = format_part.split('/')[-1]
            if ext == 'jpeg':
                ext = 'jpg'
            file_name = f"proof_resub_{request.user.id}_{secrets.token_hex(4)}.{ext}"
            screenshot_file = ContentFile(base64.b64decode(imgstr), name=file_name)
        except Exception as e:
            print(f"[SCREENSHOT DECODE WARNING] {e}")

    purchase.payment_transaction_id = payment_transaction_id
    purchase.payment_method = payment_method
    purchase.payment_details = payment_details
    if screenshot_file:
        purchase.payment_screenshot = screenshot_file

    purchase.status = Purchase.Status.PENDING
    purchase.decline_reason = ""
    purchase.declined_at = None
    purchase.declined_by = None
    purchase.save()

    return Response({
        "message": "Payment proof re-submitted successfully! Atelier accounts will re-verify your submission.",
        "purchase_id": purchase.id,
        "status": "pending",
        "payment_transaction_id": purchase.payment_transaction_id
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resend_otp(request, purchase_id):
    """
    POST /api/purchases/{id}/resend-otp/
    Rate-limited OTP resend (60-second cooldown + max 5 requests/hour).
    Enforces PAID status and admin download permission.
    """
    try:
        purchase = Purchase.objects.get(id=purchase_id, buyer=request.user)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase not found."}, status=status.HTTP_404_NOT_FOUND)

    if purchase.status != Purchase.Status.PAID:
        return Response({
            "error": "This purchase has not been marked as paid or approved yet."
        }, status=status.HTTP_400_BAD_REQUEST)

    if not purchase.download_enabled_by_admin:
        return Response({
            "error": "Download permission has been locked by administration for this purchase. Please contact support."
        }, status=status.HTTP_403_FORBIDDEN)

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
    print(f"[TERMINAL RESEND OTP LOG]")
    print(f"   Purchase ID: #{purchase.id}")
    print(f"   Buyer Email: {request.user.email}")
    print(f"   NEW VERIFICATION CODE (OTP): >>> {otp_code} <<<")
    print("=" * 70 + "\n")

    masked_email = mask_email(request.user.email)
    try:
        send_otp_email(
            email=request.user.email,
            otp_code=otp_code,
            name=request.user.get_full_name() or request.user.username,
            purpose="purchase_otp"
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
    On success: generates single-use DownloadToken, emails secure link, returns confirmation.
    """
    code = str(request.data.get('code', '')).strip()
    if not code:
        return Response({"error": "Verification code is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        purchase = Purchase.objects.get(id=purchase_id, buyer=request.user)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase not found."}, status=status.HTTP_404_NOT_FOUND)

    if purchase.status != Purchase.Status.PAID:
        return Response({
            "error": "This purchase has not been marked as paid or approved yet."
        }, status=status.HTTP_400_BAD_REQUEST)

    if not purchase.download_enabled_by_admin:
        return Response({
            "error": "Download permission has been locked by administration for this purchase. Please contact support."
        }, status=status.HTTP_403_FORBIDDEN)

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
        is_used=False,
        status=DownloadToken.Status.AVAILABLE,
        attempt_count=0
    )

    base_url = get_frontend_base_url(request)
    download_url = f"{base_url}/download/{raw_token}"
    
    # Print Download Link in terminal for instant dev verification
    print("\n" + "=" * 70)
    print(f"[TERMINAL SECURE DOWNLOAD LINK LOG]")
    print(f"   Purchase ID: #{purchase.id}")
    print(f"   Buyer Email: {request.user.email}")
    print(f"   DOWNLOAD LINK: >>> {download_url} <<<")
    print("=" * 70 + "\n")

    masked_email = mask_email(request.user.email)

    try:
        subject = f"Your Secure CAD Download Link — '{purchase.product.title}'"
        plain_msg = (
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
        )
        html_msg = build_luxury_email_html(
            headline="Your 3D CAD Download Package is Ready",
            paragraphs=[
                f"Hello {request.user.get_full_name() or request.user.username},",
                f"Your email verification was successful. Your production-ready jewellery CAD package for <strong>'{purchase.product.title}'</strong> ({purchase.get_license_type_display()}) is ready to download.",
                "Click the button below to download your watertight 3DM, STL, and render assets:",
                "<strong>Security Notice:</strong> This single-use download link is cryptographically tied to your atelier account and expires in 48 hours."
            ],
            action_button_text="DOWNLOAD 3D CAD FILES",
            action_button_url=download_url,
            footer_note="Single-use link valid for 48 hours. If you did not initiate this request, contact support immediately."
        )
        send_mail(
            subject=subject,
            message=plain_msg,
            recipient_list=[request.user.email],
            html_message=html_msg,
            fail_silently=False
        )
        print(f"[EMAIL SUCCESS] Secure download link dispatched to {request.user.email} via Gmail SMTP.")
    except Exception as e:
        print(f"[EMAIL SERVICE WARNING] Failed to dispatch download token email: {e}")

    # Return success confirmation AND download_url so client can download immediately or via email
    return Response({
        "message": f"Verified! Your single-use secure download link has been sent to {masked_email}.",
        "masked_email": masked_email,
        "purchase_id": purchase.id,
        "product_title": purchase.product.title,
        "download_url": download_url
    })


def is_browser_request(request):
    """
    Determines if the request is a direct browser navigation (HTML display expected)
    versus an API client or frontend fetch/XHR call.
    """
    accept = request.META.get('HTTP_ACCEPT', '')
    sec_fetch_dest = request.META.get('HTTP_SEC_FETCH_DEST', '')

    # Standard browser page navigation (clicking link, typing URL in address bar)
    if sec_fetch_dest in ('document', 'frame', 'iframe'):
        return True

    # If HTML is accepted and JSON is not explicitly prioritized
    if 'text/html' in accept:
        if 'application/json' in accept and accept.find('application/json') < accept.find('text/html'):
            return False
        return True

    return False


def render_luxury_download_notice(
    title="Second-Time Download Not Available",
    badge="ONE-TIME LINK USED",
    message="This download link has already been used and has expired. Second-time downloads are not available with this expired link.",
    frontend_url="http://localhost:3000",
    status_code=400,
    is_second_download=True
):
    """
    Renders an ultra-luxurious, responsive HTML notice with Shiuli CAD Studio aesthetics
    when a user visits a spent, invalid, or expired download link directly in their browser.
    Prevents the raw Django REST Framework browsable API from ever being exposed to clients.
    """
    orders_url = f"{frontend_url.rstrip('/')}/account?tab=downloads"
    home_url = f"{frontend_url.rstrip('/')}/"

    security_notice = (
        "<strong>One-Time Security Protocol:</strong> For intellectual property protection and high-precision CAD file security, each download link is single-use and automatically expires once streamed to your device."
        if is_second_download else
        "<strong>Security Protocol:</strong> Download tokens are single-use and subject to security limits to protect intellectual property."
    )

    action_note = (
        "<strong>Need to download again?</strong> Your purchase is safe and active in your account. You can request a fresh, secure download link anytime from your <strong>Order History</strong>."
        if is_second_download else
        "<strong>Need assistance?</strong> You can review your active purchases and generate links from your <strong>Order History</strong>, or contact studio support."
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — Shiuli CAD Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: radial-gradient(ellipse at 50% 15%, #15243C 0%, #0B1323 60%, #060A13 100%);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #E2E8F0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      line-height: 1.6;
    }}
    .bg-grid {{
      position: fixed;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(212, 175, 55, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(212, 175, 55, 0.04) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
      z-index: 0;
    }}
    .card {{
      position: relative;
      z-index: 1;
      max-width: 520px;
      width: 100%;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(212, 175, 55, 0.35);
      border-radius: 24px;
      padding: 44px 36px 36px;
      box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.8), 0 0 50px rgba(212, 175, 55, 0.12);
      text-align: center;
      overflow: hidden;
    }}
    .gold-bar {{
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #996515 0%, #D4AF37 30%, #FFF3D6 50%, #D4AF37 70%, #996515 100%);
    }}
    .brand-header {{
      font-family: 'Cinzel', serif;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #D4AF37;
      margin-bottom: 24px;
      opacity: 0.9;
    }}
    .icon-wrapper {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.04) 100%);
      border: 1px solid rgba(212, 175, 55, 0.45);
      margin-bottom: 18px;
      box-shadow: 0 0 30px rgba(212, 175, 55, 0.22);
    }}
    .icon-wrapper svg {{
      width: 38px;
      height: 38px;
      stroke: #D4AF37;
    }}
    .badge {{
      display: inline-block;
      padding: 5px 16px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      border-radius: 9999px;
      background: rgba(212, 175, 55, 0.15);
      color: #F6C85F;
      border: 1px solid rgba(212, 175, 55, 0.4);
      margin-bottom: 14px;
    }}
    h1 {{
      font-family: 'Cinzel', serif;
      font-size: 23px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: 0.02em;
      margin-bottom: 12px;
      line-height: 1.3;
    }}
    .message {{
      color: #94A3B8;
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.6;
    }}
    .notice-box {{
      background: rgba(8, 14, 26, 0.75);
      border: 1px solid rgba(212, 175, 55, 0.22);
      border-radius: 14px;
      padding: 18px 20px;
      text-align: left;
      font-size: 12.5px;
      color: #CBD5E1;
      margin-bottom: 28px;
    }}
    .notice-box p {{
      margin-bottom: 10px;
      position: relative;
      padding-left: 22px;
      line-height: 1.55;
    }}
    .notice-box p:last-child {{
      margin-bottom: 0;
    }}
    .notice-box p::before {{
      content: '✦';
      position: absolute;
      left: 0;
      top: 0;
      color: #D4AF37;
      font-size: 12px;
    }}
    .notice-box strong {{
      color: #F8FAFC;
    }}
    .actions {{
      display: flex;
      flex-direction: column;
      gap: 12px;
    }}
    .btn-gold {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px 24px;
      background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
      color: #0A111E;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      border-radius: 12px;
      text-decoration: none;
      box-shadow: 0 4px 18px rgba(212, 175, 55, 0.35);
      transition: all 0.25s ease;
    }}
    .btn-gold:hover {{
      background: linear-gradient(135deg, #F6C85F 0%, #D4AF37 100%);
      box-shadow: 0 8px 25px rgba(212, 175, 55, 0.5);
      transform: translateY(-2px);
    }}
    .btn-ghost {{
      display: inline-block;
      width: 100%;
      padding: 11px 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94A3B8;
      font-size: 13px;
      font-weight: 500;
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.2s ease;
    }}
    .btn-ghost:hover {{
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
      border-color: rgba(212, 175, 55, 0.3);
    }}
    .footer-text {{
      margin-top: 26px;
      font-size: 11px;
      color: #64748B;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }}
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="card">
    <div class="gold-bar"></div>
    <div class="brand-header">Shiuli CAD Studio · Haute Joaillerie</div>
    
    <div class="icon-wrapper">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>

    <div><span class="badge">{badge}</span></div>
    <h1>{title}</h1>
    <p class="message">{message}</p>

    <div class="notice-box">
      <p>{security_notice}</p>
      <p>{action_note}</p>
    </div>

    <div class="actions">
      <a href="{orders_url}" class="btn-gold">
        <span>Request New Link from My Orders</span>
        <span aria-hidden="true">→</span>
      </a>
      <a href="{home_url}" class="btn-ghost">Return to Storefront</a>
    </div>

    <div class="footer-text">Single-Use Token Security Protocol</div>
  </div>
</body>
</html>"""
    return HttpResponse(html, content_type='text/html', status=status_code)


def handle_download_error(request, title, badge, message, status_code=400, is_second_download=False):
    """
    Standardized error handler for CAD file downloads:
    - If direct browser request: returns luxury HTML notice (never raw DRF browsable API).
    - If API / XHR request: returns JSON with structured error details.
    """
    frontend_base = get_frontend_base_url(request)
    if is_browser_request(request):
        return render_luxury_download_notice(
            title=title,
            badge=badge,
            message=message,
            frontend_url=frontend_base,
            status_code=status_code,
            is_second_download=is_second_download
        )
    return Response({
        "error": message,
        "title": title,
        "badge": badge,
        "is_second_download": is_second_download,
        "code": "SECOND_DOWNLOAD_UNAVAILABLE" if is_second_download else "DOWNLOAD_ERROR",
        "action_url": f"{frontend_base}/account?tab=downloads"
    }, status=status_code)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def download_cad_file(request, token):
    """
    GET /download/{token}/ (and /api/payments/download/{token}/)
    Secure single-use chunked file streaming endpoint.
    - Uses transaction.atomic() + select_for_update() to claim token with 15-min lease.
    - Prevents concurrent race conditions (second simultaneous request receives 409 Conflict).
    - Enforces max 3 retry attempts on interrupted transfers.
    - Zero in-memory buffering: multi-file packages stream from disk-backed temp zip (ZIP_STORED).
    - Token marked completed and is_used=True ONLY upon verified stream completion (EOF).
    - Enforces admin download lock and account email binding.
    """
    now = timezone.now()
    LEASE_DURATION = timedelta(minutes=15)
    MAX_ATTEMPTS = 3

    with transaction.atomic():
        try:
            token_obj = (
                DownloadToken.objects
                .select_for_update()
                .select_related('purchase', 'purchase__product', 'purchase__buyer', 'order', 'order__client')
                .get(token=token)
            )
        except DownloadToken.DoesNotExist:
            return handle_download_error(
                request=request,
                title="Download Link Expired or Not Found",
                badge="LINK INVALID",
                message="This download link is invalid, expired, or has already been used. If this is your purchase, request a new secure link from your Order History.",
                status_code=status.HTTP_404_NOT_FOUND,
                is_second_download=False
            )

        # 1. Admin download lock check
        if token_obj.purchase and not token_obj.purchase.download_enabled_by_admin:
            return handle_download_error(
                request=request,
                title="Download Locked by Admin",
                badge="ADMIN LOCKED",
                message="Download permission has been locked by administration for this purchase. Please contact support.",
                status_code=status.HTTP_403_FORBIDDEN,
                is_second_download=False
            )

        if token_obj.order and (token_obj.order.status == 'cancelled' or getattr(token_obj.order, 'is_deleted', False)):
            return handle_download_error(
                request=request,
                title="Order Cancelled",
                badge="CANCELLED",
                message="This order has been cancelled or removed. Please contact support.",
                status_code=status.HTTP_403_FORBIDDEN,
                is_second_download=False
            )

        # 2. Check revoked status
        if token_obj.status == DownloadToken.Status.REVOKED:
            return handle_download_error(
                request=request,
                title="Download Link Revoked",
                badge="REVOKED",
                message="This download link has been revoked by administration. Please contact support.",
                status_code=status.HTTP_403_FORBIDDEN,
                is_second_download=False
            )

        # 3. Check already completed / used (SECOND-TIME DOWNLOAD PRECLUSION)
        if token_obj.is_used or token_obj.status == DownloadToken.Status.COMPLETED:
            return handle_download_error(
                request=request,
                title="Second-Time Download Not Available",
                badge="ONE-TIME LINK USED",
                message="This download link has already been used and has expired. Second-time downloads are not available with this expired link. You can request a fresh download link anytime from your Order History.",
                status_code=status.HTTP_400_BAD_REQUEST,
                is_second_download=True
            )

        # 4. Check 48-hour expiration
        if token_obj.expires_at < now or token_obj.status == DownloadToken.Status.EXPIRED:
            if token_obj.status != DownloadToken.Status.EXPIRED:
                token_obj.status = DownloadToken.Status.EXPIRED
                token_obj.save(update_fields=['status'])
            return handle_download_error(
                request=request,
                title="Download Link Expired",
                badge="EXPIRED (48H LIMIT)",
                message="This download link has expired (48-hour security limit). Please request a new secure link from your Order History.",
                status_code=status.HTTP_400_BAD_REQUEST,
                is_second_download=False
            )

        # 5. Check PAID status for catalog purchase
        if token_obj.purchase and token_obj.purchase.status != Purchase.Status.PAID:
            return handle_download_error(
                request=request,
                title="Payment Verification Required",
                badge="PAYMENT PENDING",
                message="Payment for this purchase has not been completed or verified yet.",
                status_code=status.HTTP_400_BAD_REQUEST,
                is_second_download=False
            )

        # 6. Email lock validation (if user is authenticated in the session)
        if request.user.is_authenticated and request.user.email:
            if request.user.email.lower() != token_obj.locked_email.lower():
                buyer_user = token_obj.purchase.buyer if token_obj.purchase else (token_obj.order.client if token_obj.order else None)
                if not (buyer_user and request.user == buyer_user):
                    return handle_download_error(
                        request=request,
                        title="Access Restricted",
                        badge="ACCOUNT MISMATCH",
                        message="This download link belongs to a different account and cannot be used here.",
                        status_code=status.HTTP_403_FORBIDDEN,
                        is_second_download=False
                    )

        # 7. Check In-Progress Lease & Attempt Count
        if token_obj.status == DownloadToken.Status.IN_PROGRESS:
            if token_obj.in_progress_started_at and (now - token_obj.in_progress_started_at) < LEASE_DURATION:
                return handle_download_error(
                    request=request,
                    title="Download In Progress",
                    badge="LEASE ACTIVE",
                    message="A download is currently in progress for this link. If your download was interrupted, please try again in 15 minutes.",
                    status_code=status.HTTP_409_CONFLICT,
                    is_second_download=False
                )
            else:
                if token_obj.attempt_count >= MAX_ATTEMPTS:
                    token_obj.status = DownloadToken.Status.EXPIRED
                    token_obj.save(update_fields=['status'])
                    return handle_download_error(
                        request=request,
                        title="Maximum Attempts Exceeded",
                        badge="ATTEMPTS EXCEEDED",
                        message=f"Maximum download attempts ({MAX_ATTEMPTS}) reached for this link. Please request a new link from your Order History.",
                        status_code=status.HTTP_400_BAD_REQUEST,
                        is_second_download=False
                    )

        # 8. Claim token: set to IN_PROGRESS, record attempt & client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else request.META.get('REMOTE_ADDR', '127.0.0.1')

        token_obj.status = DownloadToken.Status.IN_PROGRESS
        token_obj.in_progress_started_at = now
        token_obj.attempt_count += 1
        token_obj.used_from_ip = ip
        token_obj.save(update_fields=['status', 'in_progress_started_at', 'attempt_count', 'used_from_ip'])

    # Stream completion callback: marks token as completed ONLY after client receives full stream
    def mark_download_complete():
        try:
            with transaction.atomic():
                t = DownloadToken.objects.select_for_update().get(id=token_obj.id)
                if t.status != DownloadToken.Status.REVOKED:
                    t.status = DownloadToken.Status.COMPLETED
                    t.is_used = True
                    t.completed_at = timezone.now()
                    t.used_at = timezone.now()
                    t.save(update_fields=['status', 'is_used', 'completed_at', 'used_at'])
                if t.order:
                    t.order.status = 'completed'
                    t.order.save(update_fields=['status'])
        except Exception as comp_err:
            logger.error("Error finalizing download completion for token %s: %s", token_obj.id, comp_err)

    # Handle Custom Order deliverables
    if token_obj.order:
        order = token_obj.order
        from apps.custom_orders.models import OrderDeliverable
        from apps.catalog.models import protected_cad_storage
        from apps.core.gdrive_service import GoogleDriveQuotaError, GoogleDriveError

        # Filter by order's active/current version to ensure customer gets the latest uploaded/edited deliverables
        deliverables = list(OrderDeliverable.objects.filter(order=order, version=order.current_version))
        if not deliverables:
            # Fallback to latest version that has deliverables
            latest_version = OrderDeliverable.objects.filter(order=order).order_by('-version').values_list('version', flat=True).first()
            if latest_version:
                deliverables = list(OrderDeliverable.objects.filter(order=order, version=latest_version))
            else:
                deliverables = list(OrderDeliverable.objects.filter(order=order))

        valid_deliverables = [
            d for d in deliverables
            if (d.storage_provider == 'gdrive' and d.drive_file_id) or d.file
        ]

        if not valid_deliverables:
            return handle_download_error(
                request=request,
                title="Deliverables Being Prepared",
                badge="PRODUCTION IN PROGRESS",
                message="The assigned CAD designer has not uploaded the production deliverables (.3DM / .STL) for this order yet. Please contact studio support or check back once files have been uploaded.",
                status_code=status.HTTP_404_NOT_FOUND,
                is_second_download=False
            )

        def get_clean_name(deliv):
            if deliv.original_filename:
                return deliv.original_filename
            raw_filename = os.path.basename(deliv.file.name) if deliv.file else f"ord_{order.id}_{deliv.file_type}.{deliv.file_type}"
            import re
            cleaned = re.sub(rf"^ord_{order.id}_(v\d+_)?({deliv.file_type}_)?", "", raw_filename)
            return cleaned or raw_filename

        def open_deliverable_file(deliv):
            if not deliv.file:
                return None
            try:
                if protected_cad_storage.exists(deliv.file.name):
                    return protected_cad_storage.open(deliv.file.name, 'rb')
            except Exception:
                pass
            try:
                if hasattr(deliv.file, 'storage') and deliv.file.storage.exists(deliv.file.name):
                    return deliv.file.storage.open(deliv.file.name, 'rb')
            except Exception:
                pass
            try:
                if hasattr(deliv.file, 'path') and os.path.exists(deliv.file.path):
                    return open(deliv.file.path, 'rb')
            except Exception:
                pass
            try:
                return deliv.file.open('rb')
            except Exception:
                return None

        try:
            if len(valid_deliverables) == 1:
                deliv = valid_deliverables[0]
                clean_filename = get_clean_name(deliv)
                content_type = 'application/octet-stream'
                if clean_filename.lower().endswith('.mp4') or deliv.file_type == 'video':
                    content_type = 'video/mp4'
                elif clean_filename.lower().endswith('.stl'):
                    content_type = 'model/stl'
                elif clean_filename.lower().endswith('.zip'):
                    content_type = 'application/zip'

                if deliv.storage_provider == 'gdrive' and deliv.drive_file_id:
                    response = StreamingHttpResponse(
                        stream_gdrive_iterator(deliv.drive_file_id, on_complete=mark_download_complete),
                        content_type=content_type
                    )
                    response['Content-Disposition'] = f'attachment; filename="{clean_filename}"'
                    if deliv.file_size_bytes:
                        response['Content-Length'] = str(deliv.file_size_bytes)
                    response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
                    return response
                else:
                    file_handle = open_deliverable_file(deliv)
                    if not file_handle:
                        return Response({"error": "Deliverable file not found on storage. Please contact studio support."}, status=status.HTTP_404_NOT_FOUND)

                    file_size = None
                    try:
                        file_size = deliv.file.size
                    except Exception:
                        pass

                    response = StreamingHttpResponse(
                        stream_file_iterator(file_handle, on_complete=mark_download_complete),
                        content_type=content_type
                    )
                    response['Content-Disposition'] = f'attachment; filename="{clean_filename}"'
                    if file_size:
                        response['Content-Length'] = str(file_size)
                    response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
                    return response
            else:
                # Package all deliverables into a disk-backed ZIP (Zero RAM buffering)
                file_items = []
                seen_names = {}
                for deliv in valid_deliverables:
                    base_clean = get_clean_name(deliv)
                    if base_clean in seen_names:
                        seen_names[base_clean] += 1
                        name_root, ext = os.path.splitext(base_clean)
                        clean_name = f"{name_root}_{seen_names[base_clean]}{ext}"
                    else:
                        seen_names[base_clean] = 1
                        clean_name = base_clean

                    if deliv.storage_provider == 'gdrive' and deliv.drive_file_id:
                        file_items.append((clean_name, deliv.drive_file_id, True))
                    else:
                        f_h = open_deliverable_file(deliv)
                        if f_h:
                            file_items.append((clean_name, f_h, False))
                        else:
                            logger.warning("Could not open deliverable %s on disk", deliv.id)

                if not file_items:
                    return Response({"error": "No accessible production deliverables found on storage."}, status=status.HTTP_404_NOT_FOUND)

                temp_zip_path = build_disk_backed_zip(file_items)
                zip_filename = f"order_{order.id}_cad_production_package.zip"
                zip_size = os.path.getsize(temp_zip_path)

                response = StreamingHttpResponse(
                    stream_temp_zip_iterator(temp_zip_path, on_complete=mark_download_complete),
                    content_type='application/zip'
                )
                response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
                response['Content-Length'] = str(zip_size)
                response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
                return response
        except GoogleDriveQuotaError as quota_err:
            logger.error("Drive quota exceeded streaming order deliverables: %s", quota_err)
            try:
                with transaction.atomic():
                    DownloadToken.objects.filter(id=token_obj.id).update(
                        status=DownloadToken.Status.AVAILABLE,
                        in_progress_started_at=None
                    )
            except Exception:
                pass
            return Response({
                "error": "Download temporarily unavailable, please try again later or contact support."
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return Response({"error": f"Unable to stream file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Catalog Product CAD Files
    product = token_obj.purchase.product
    cad_file_objs = list(ProductFile.objects.filter(
        product=product,
        file_type__in=[ProductFile.FileType.FILE_3DM, ProductFile.FileType.STL, ProductFile.FileType.ZIP]
    ))

    def open_product_file(cf):
        if not cf.file:
            return None
        from apps.catalog.models import protected_cad_storage
        try:
            if protected_cad_storage.exists(cf.file.name):
                return protected_cad_storage.open(cf.file.name, 'rb')
        except Exception:
            pass
        try:
            if hasattr(cf.file, 'storage') and cf.file.storage.exists(cf.file.name):
                return cf.file.storage.open(cf.file.name, 'rb')
        except Exception:
            pass
        try:
            if hasattr(cf.file, 'path') and os.path.exists(cf.file.path):
                return open(cf.file.path, 'rb')
        except Exception:
            pass
        try:
            return cf.file.open('rb')
        except Exception:
            return None

    # Filter only those that actually exist on disk or in storage
    valid_cad_files = []
    from apps.catalog.models import protected_cad_storage
    for cf in cad_file_objs:
        if cf.storage_provider == ProductFile.StorageProvider.GDRIVE and cf.drive_file_id:
            valid_cad_files.append(cf)
        elif cf.file:
            fh = open_product_file(cf)
            if fh:
                try:
                    fh.close()
                except Exception:
                    pass
                valid_cad_files.append(cf)

    # Fallback to authentic Rhino & STL assets from cad_demo_files ONLY IF no ProductFiles were configured in DB
    fallback_dir = getattr(settings, 'BASE_DIR') / 'cad_demo_files'
    if not valid_cad_files and not cad_file_objs and os.path.exists(fallback_dir):
        demo_3dm = os.path.join(fallback_dir, 'diamond_solitaire_ring.3dm')
        demo_stl = os.path.join(fallback_dir, 'diamond_solitaire_ring.stl')
        demo_files = [f for f in [demo_3dm, demo_stl] if os.path.exists(f)]
        if demo_files:
            file_items = []
            for df in demo_files:
                ext = os.path.splitext(df)[1]
                clean_name = f"{product.slug}_master{ext}"
                file_items.append((clean_name, df, False))

            temp_zip_path = build_disk_backed_zip(file_items)
            zip_filename = f"{product.slug}_cad_production_package.zip"
            zip_size = os.path.getsize(temp_zip_path)

            response = StreamingHttpResponse(
                stream_temp_zip_iterator(temp_zip_path, on_complete=mark_download_complete),
                content_type='application/zip'
            )
            response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
            response['Content-Length'] = str(zip_size)
            response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
            return response

    if not valid_cad_files:
        return handle_download_error(
            request=request,
            title="CAD Files Not Found",
            badge="FILE MISSING",
            message="CAD design file not found for this product. Please contact support.",
            status_code=status.HTTP_404_NOT_FOUND,
            is_second_download=False
        )

    try:
        from apps.core.gdrive_service import GoogleDriveQuotaError, GoogleDriveError

        if len(valid_cad_files) == 1:
            cad_file_obj = valid_cad_files[0]
            raw_name = cad_file_obj.original_filename or (os.path.basename(cad_file_obj.file.name) if cad_file_obj.file else f"{product.slug}.{cad_file_obj.file_type}")
            content_type = 'model/stl' if raw_name.lower().endswith('.stl') else 'application/zip' if raw_name.lower().endswith('.zip') else 'application/octet-stream'

            if cad_file_obj.storage_provider == ProductFile.StorageProvider.GDRIVE and cad_file_obj.drive_file_id:
                response = StreamingHttpResponse(
                    stream_gdrive_iterator(cad_file_obj.drive_file_id, token_id=token_obj.id, on_complete=mark_download_complete),
                    content_type=content_type
                )
                response['Content-Disposition'] = f'attachment; filename="{raw_name}"'
                if cad_file_obj.file_size_bytes:
                    response['Content-Length'] = str(cad_file_obj.file_size_bytes)
                response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
                return response
            else:
                file_handle = open_product_file(cad_file_obj)
                if not file_handle:
                    return Response({"error": "Product CAD file not accessible on storage."}, status=status.HTTP_404_NOT_FOUND)

                file_size = None
                try:
                    file_size = cad_file_obj.file.size
                except Exception:
                    pass

                response = StreamingHttpResponse(
                    stream_file_iterator(file_handle, on_complete=mark_download_complete),
                    content_type=content_type
                )
                response['Content-Disposition'] = f'attachment; filename="{raw_name}"'
                if file_size:
                    response['Content-Length'] = str(file_size)
                response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
                return response
        else:
            # Package multiple CAD files (.3dm + .stl + .zip) into a single zip archive with zero memory buffering
            file_items = []
            for cf in valid_cad_files:
                clean_name = cf.original_filename or (os.path.basename(cf.file.name) if cf.file else f"{product.slug}.{cf.file_type}")
                if cf.storage_provider == ProductFile.StorageProvider.GDRIVE and cf.drive_file_id:
                    file_items.append((clean_name, cf.drive_file_id, True))
                else:
                    f_in = open_product_file(cf)
                    if f_in:
                        file_items.append((clean_name, f_in, False))

            temp_zip_path = build_disk_backed_zip(file_items)
            zip_filename = f"{product.slug}_cad_production_package.zip"
            zip_size = os.path.getsize(temp_zip_path)

            response = StreamingHttpResponse(
                stream_temp_zip_iterator(temp_zip_path, on_complete=mark_download_complete),
                content_type='application/zip'
            )
            response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
            response['Content-Length'] = str(zip_size)
            response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
            return response
    except GoogleDriveQuotaError as quota_err:
        logger.error("Drive quota exceeded for token %s: %s", token, quota_err)
        try:
            from django.db.models import F
            with transaction.atomic():
                DownloadToken.objects.filter(id=token_obj.id).update(
                    status=DownloadToken.Status.AVAILABLE,
                    attempt_count=F('attempt_count') - 1,
                    in_progress_started_at=None
                )
        except Exception:
            pass
        return Response({
            "error": "Download temporarily unavailable, please try again later or contact support."
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error("Unable to stream file for token %s: %s", token, e)
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

    if purchase.status != Purchase.Status.PAID:
        return Response({
            "error": "This purchase has not been marked as paid or approved yet."
        }, status=status.HTTP_400_BAD_REQUEST)

    if not purchase.download_enabled_by_admin:
        return Response({
            "error": "Download permission has been locked by administration for this purchase. Please contact support."
        }, status=status.HTTP_403_FORBIDDEN)

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
    print(f"[TERMINAL RE-DELIVERY OTP LOG]")
    print(f"   Purchase ID: #{purchase.id}")
    print(f"   Buyer Email: {request.user.email}")
    print(f"   RE-DELIVERY CODE (OTP): >>> {otp_code} <<<")
    print("=" * 70 + "\n")

    masked_email = mask_email(request.user.email)
    try:
        send_otp_email(
            email=request.user.email,
            otp_code=otp_code,
            name=request.user.get_full_name() or request.user.username,
            purpose="download_otp"
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


@api_view(['POST'])
@permission_classes([IsStaffOrAdmin])
def toggle_purchase_download_permission(request, purchase_id):
    """
    POST /api/payments/purchases/{id}/toggle-download-permission/
    Admin toggle to lock/unlock CAD downloads for a catalog purchase.
    When locked, invalidates any active unexpired tokens.
    """
    try:
        purchase = Purchase.objects.select_related('buyer', 'product').get(id=purchase_id)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase not found."}, status=status.HTTP_404_NOT_FOUND)

    enabled = request.data.get('enabled')
    if enabled is not None:
        if isinstance(enabled, str):
            purchase.download_enabled_by_admin = enabled.lower() in ('true', '1', 'yes')
        else:
            purchase.download_enabled_by_admin = bool(enabled)
    else:
        purchase.download_enabled_by_admin = not purchase.download_enabled_by_admin
    purchase.save(update_fields=['download_enabled_by_admin'])

    revoked_tokens_count = 0
    if not purchase.download_enabled_by_admin:
        # Invalidate any active, uncompleted tokens
        revoked_tokens_count = DownloadToken.objects.filter(
            purchase=purchase,
            is_used=False
        ).exclude(
            status__in=[DownloadToken.Status.COMPLETED, DownloadToken.Status.REVOKED]
        ).update(
            status=DownloadToken.Status.REVOKED,
            is_used=True
        )

    return Response({
        "success": True,
        "purchase_id": purchase.id,
        "download_enabled_by_admin": purchase.download_enabled_by_admin,
        "revoked_tokens_count": revoked_tokens_count,
        "message": f"Download permission for Purchase #{purchase.id} {'enabled' if purchase.download_enabled_by_admin else 'locked'}."
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
            "payment_method": p.payment_method or "upi",
            "payment_details": p.payment_details or "",
            "payment_screenshot": request.build_absolute_uri(p.payment_screenshot.url) if p.payment_screenshot else None,
            "status": p.status,
            "decline_reason": p.decline_reason or "",
            "declined_at": p.declined_at,
            "download_enabled_by_admin": p.download_enabled_by_admin,
            "can_download": (p.status == Purchase.Status.PAID and p.download_enabled_by_admin),
            "admin_verified_at": p.admin_verified_at,
            "redelivery_count": p.redelivery_count,
            "max_redeliveries": 3,
            "purchased_at": p.purchased_at,
            "is_otp_verified": latest_otp.is_verified if latest_otp else False,
            "is_downloaded": latest_token.is_used if latest_token else False,
            "downloaded_at": latest_token.used_at if (latest_token and latest_token.is_used) else None,
            "downloaded_from_ip": latest_token.used_from_ip if (latest_token and latest_token.is_used) else None
        })
    return Response(data)
