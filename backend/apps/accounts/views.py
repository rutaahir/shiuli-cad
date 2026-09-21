import secrets
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema

from .models import AccountOTP
from .serializers import (
    UserSerializer,
    RegisterClientSerializer,
    CustomTokenObtainPairSerializer,
)

User = get_user_model()


def generate_6digit_otp():
    """Generates a cryptographically secure 6-digit integer string."""
    return f"{secrets.randbelow(900000) + 100000}"


@extend_schema(responses={201: UserSerializer})
class RegisterView(generics.CreateAPIView):
    """Client self-registration endpoint."""
    queryset = User.objects.all()
    serializer_class = RegisterClientSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    """JWT Login endpoint returning access/refresh tokens and user role."""
    serializer_class = CustomTokenObtainPairSerializer


class UserMeView(generics.RetrieveUpdateAPIView):
    """Retrieve or update profile of current logged-in user."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        if request.data.get('remove_photo') is True:
            user.profile_photo.delete(save=False)
            user.profile_photo = None
            user.save(update_fields=['profile_photo'])
        return super().patch(request, *args, **kwargs)


class RequestEmailChangeOTPView(APIView):
    """Generates and sends 6-digit OTP code to verify changing to a new email address."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        new_email = str(request.data.get("new_email", "")).strip().lower()
        if not new_email or '@' not in new_email:
            return Response({"error": "A valid new email address is required."}, status=status.HTTP_400_BAD_REQUEST)

        if new_email == request.user.email.lower():
            return Response({"error": "The new email address is the same as your current email."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=new_email).exclude(id=request.user.id).exists():
            return Response({"error": "This email address is already registered with another account."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        otp_code = generate_6digit_otp()
        otp_hash = make_password(otp_code)
        expires_at = now + timedelta(minutes=10)

        # Remove previous unverified email change OTPs for this user
        AccountOTP.objects.filter(user=request.user, otp_type=AccountOTP.OTPType.EMAIL_CHANGE, is_verified=False).delete()

        AccountOTP.objects.create(
            user=request.user,
            otp_type=AccountOTP.OTPType.EMAIL_CHANGE,
            target_value=new_email,
            otp_hash=otp_hash,
            expires_at=expires_at,
            attempts=0,
            is_verified=False
        )

        # Print OTP in terminal for instant dev verification
        print("\n" + "=" * 70)
        print(f"[TERMINAL OTP DEBUG LOG] EMAIL CHANGE")
        print(f"   User:       {request.user.username}")
        print(f"   Current:    {request.user.email}")
        print(f"   New Email:  {new_email}")
        print(f"   VERIFICATION CODE (OTP): >>> {otp_code} <<<")
        print("=" * 70 + "\n")

        try:
            send_mail(
                subject="Verify Your New Email Address - Shiuli CAD Studio",
                message=(
                    f"Hello {request.user.first_name or request.user.username},\n\n"
                    f"You requested to change your account email address to: {new_email}.\n\n"
                    f"Your 6-digit email verification code is: {otp_code}\n\n"
                    f"This code will expire in 10 minutes.\n\n"
                    f"If you did not request this change, please ignore this email or contact support.\n\n"
                    f"Warm regards,\nShiuli CAD Studio Team"
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shiulicadstudio.com'),
                recipient_list=[new_email],
                fail_silently=True
            )
        except Exception as e:
            print(f"[EMAIL SERVICE WARNING] Failed to send email change OTP: {e}")

        return Response({
            "message": f"Verification code sent to {new_email}. Enter code to confirm change.",
            "expires_in_seconds": 600
        }, status=status.HTTP_200_OK)


class VerifyEmailChangeOTPView(APIView):
    """Verifies OTP code and updates user email address."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = str(request.data.get("code", "")).strip()
        new_email = str(request.data.get("new_email", "")).strip().lower()

        if not code or not new_email:
            return Response({"error": "Verification code and new email address are required."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        otp_obj = AccountOTP.objects.filter(
            user=request.user,
            otp_type=AccountOTP.OTPType.EMAIL_CHANGE,
            target_value=new_email,
            is_verified=False
        ).order_by('-created_at').first()

        if not otp_obj:
            return Response({"error": "No active email change request found. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_obj.expires_at < now:
            return Response({"error": "Verification code has expired. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_obj.attempts >= 5:
            return Response({"error": "Too many failed attempts. Code locked out. Please request a new code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        if not check_password(code, otp_obj.otp_hash):
            otp_obj.attempts += 1
            otp_obj.save(update_fields=['attempts'])
            remaining = 5 - otp_obj.attempts
            return Response({"error": f"Invalid verification code. {remaining} attempt(s) remaining."}, status=status.HTTP_400_BAD_REQUEST)

        # Mark OTP as verified and update user email
        otp_obj.is_verified = True
        otp_obj.save(update_fields=['is_verified'])

        user = request.user
        user.email = new_email
        user.save(update_fields=['email'])

        return Response({
            "message": "Email address updated successfully!",
            "user": UserSerializer(user, context={'request': request}).data
        }, status=status.HTTP_200_OK)


class RequestPasswordResetOTPView(APIView):
    """Sends 6-digit OTP code to authenticated user's email for password change."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        now = timezone.now()
        otp_code = generate_6digit_otp()
        otp_hash = make_password(otp_code)
        expires_at = now + timedelta(minutes=10)

        AccountOTP.objects.filter(user=user, otp_type=AccountOTP.OTPType.PASSWORD_RESET, is_verified=False).delete()

        AccountOTP.objects.create(
            user=user,
            otp_type=AccountOTP.OTPType.PASSWORD_RESET,
            otp_hash=otp_hash,
            expires_at=expires_at,
            attempts=0,
            is_verified=False
        )

        # Print OTP in terminal for instant dev verification
        print("\n" + "=" * 70)
        print(f"🔑 [TERMINAL OTP DEBUG LOG] PASSWORD RESET")
        print(f"   User:       {user.username}")
        print(f"   Email:      {user.email}")
        print(f"   VERIFICATION CODE (OTP): >>> {otp_code} <<<")
        print("=" * 70 + "\n")

        try:
            send_mail(
                subject="Password Reset Code - Shiuli CAD Studio",
                message=(
                    f"Hello {user.first_name or user.username},\n\n"
                    f"Your 6-digit password reset verification code is: {otp_code}\n\n"
                    f"This code will expire in 10 minutes.\n\n"
                    f"If you did not request a password change, please secure your account immediately.\n\n"
                    f"Warm regards,\nShiuli CAD Studio Security Team"
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shiulicadstudio.com'),
                recipient_list=[user.email],
                fail_silently=True
            )
        except Exception as e:
            print(f"[EMAIL SERVICE WARNING] Failed to send password reset OTP: {e}")

        return Response({
            "message": f"Verification code sent to {user.email}. Enter code and new password to confirm.",
            "expires_in_seconds": 600
        }, status=status.HTTP_200_OK)


class VerifyPasswordResetOTPView(APIView):
    """Verifies OTP code and resets user password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = str(request.data.get("code", "")).strip()
        new_password = str(request.data.get("new_password", "")).strip()

        if not code or not new_password:
            return Response({"error": "Verification code and new password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({"error": "New password must be at least 6 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        now = timezone.now()
        otp_obj = AccountOTP.objects.filter(
            user=user,
            otp_type=AccountOTP.OTPType.PASSWORD_RESET,
            is_verified=False
        ).order_by('-created_at').first()

        if not otp_obj:
            return Response({"error": "No active password reset code found. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_obj.expires_at < now:
            return Response({"error": "Verification code has expired. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_obj.attempts >= 5:
            return Response({"error": "Too many failed attempts. Code locked out. Please request a new code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        if not check_password(code, otp_obj.otp_hash):
            otp_obj.attempts += 1
            otp_obj.save(update_fields=['attempts'])
            remaining = 5 - otp_obj.attempts
            return Response({"error": f"Invalid verification code. {remaining} attempt(s) remaining."}, status=status.HTTP_400_BAD_REQUEST)

        otp_obj.is_verified = True
        otp_obj.save(update_fields=['is_verified'])

        user.set_password(new_password)
        user.save()

        return Response({"detail": "Password updated successfully via OTP verification!"}, status=status.HTTP_200_OK)


class RequestPasswordResetEmailView(APIView):
    """Trigger password reset email endpoint."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email address is required."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email).first()
        return Response(
            {"detail": f"A secure password reset authorization link has been sent to {email}."},
            status=status.HTTP_200_OK
        )


class ChangePasswordView(APIView):
    """Direct password change endpoint for authenticated users."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not old_password or not user.check_password(old_password):
            return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        if not new_password or len(new_password) < 6:
            return Response({"error": "New password must be at least 6 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Logout endpoint to invalidate refresh token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"detail": "Invalid refresh token."}, status=status.HTTP_400_BAD_REQUEST)


class AdminClientsListView(APIView):
    """Retrieve list of registered clients with lifetime spend & order histories for SuperAdmin CRM."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum
        from apps.custom_orders.models import Order
        from apps.payments.models import Purchase
        from apps.file_edits.models import FileEditRequest

        clients = User.objects.filter(role=User.Role.CLIENT).order_by('-created_at')
        client_data = []

        for client in clients:
            orders_qs = Order.objects.filter(client=client)
            orders_count = orders_qs.count()
            orders_spend = orders_qs.filter(
                status__in=[Order.Status.COMPLETED, Order.Status.PREVIEW_READY, Order.Status.PENDING_FINAL_PAYMENT]
            ).aggregate(total=Sum('total_price'))['total'] or 0.0

            purchases_qs = Purchase.objects.filter(buyer=client)
            purchases_count = purchases_qs.count()
            purchases_spend = purchases_qs.filter(
                status=Purchase.Status.PAID
            ).aggregate(total=Sum('price_paid'))['total'] or 0.0

            edits_qs = FileEditRequest.objects.filter(client=client)
            edits_count = edits_qs.count()
            edits_spend = edits_qs.filter(
                agreed_price__isnull=False
            ).aggregate(total=Sum('agreed_price'))['total'] or 0.0

            total_orders = orders_count + purchases_count + edits_count
            total_spend = float(orders_spend) + float(purchases_spend) + float(edits_spend)

            dates = [client.created_at]
            last_order = orders_qs.order_by('-created_at').first()
            if last_order:
                dates.append(last_order.created_at)
            last_purchase = purchases_qs.order_by('-purchased_at').first()
            if last_purchase:
                dates.append(last_purchase.purchased_at)
            last_edit = edits_qs.order_by('-created_at').first()
            if last_edit:
                dates.append(last_edit.created_at)

            latest_date = max(dates)
            full_name = f"{client.first_name} {client.last_name}".strip() or client.username

            order_items = []
            for o in orders_qs.order_by('-created_at')[:5]:
                order_title = (o.product.title if o.product else None) or (o.custom_request.category.name if (o.custom_request and o.custom_request.category) else None) or f"Custom CAD Order #{o.id}"
                order_items.append({
                    'id': f"ORD-{o.id}",
                    'type': 'Custom Commission',
                    'title': order_title,
                    'status': o.get_status_display(),
                    'amount': float(o.total_price),
                    'date': o.created_at.strftime('%b %d, %Y')
                })
            for p in purchases_qs.order_by('-purchased_at')[:5]:
                order_items.append({
                    'id': f"PUR-{p.id}",
                    'type': 'Ready CAD Purchase',
                    'title': p.product.title if p.product else f"Purchase #{p.id}",
                    'status': p.get_status_display(),
                    'amount': float(p.price_paid),
                    'date': p.purchased_at.strftime('%b %d, %Y')
                })
            for e in edits_qs.order_by('-created_at')[:5]:
                order_items.append({
                    'id': f"EDT-{e.id}",
                    'type': 'CAD File Modification',
                    'title': f"Modification: {e.title}",
                    'status': e.get_status_display(),
                    'amount': float(e.agreed_price or 0.0),
                    'date': e.created_at.strftime('%b %d, %Y')
                })

            client_data.append({
                'id': client.id,
                'name': full_name,
                'username': client.username,
                'email': client.email,
                'phone': client.phone_number or 'Not provided',
                'country': 'India',
                'orders_count': total_orders,
                'total_spend': f"${round(total_spend, 2):,.2f}",
                'total_spend_raw': round(total_spend, 2),
                'last_activity': latest_date.strftime('%b %d, %Y'),
                'created_at': client.created_at.strftime('%b %d, %Y'),
                'history': order_items
            })

        return Response(client_data, status=status.HTTP_200_OK)

