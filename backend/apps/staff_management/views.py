from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, StaffProfile
from apps.custom_orders.models import Order
from apps.custom_orders.serializers import OrderSerializer
from apps.core.permissions import IsAdmin, IsStaff, IsStaffOrAdmin
from .models import PlatformSettings
from .serializers import (
    PlatformSettingsSerializer,
    StaffListSerializer,
    CreateStaffSerializer,
    UpdateStaffSerializer
)

class StaffViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsStaffOrAdmin()]
        return [IsAdmin()]

    def get_queryset(self):
        return User.objects.filter(role=User.Role.STAFF).select_related('staff_profile').order_by('id')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateStaffSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateStaffSerializer
        return StaffListSerializer

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='performance')
    def performance(self, request, pk=None):
        staff_user = self.get_object()
        if request.user.role != 'admin' and request.user != staff_user:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        completed_orders = Order.objects.filter(assigned_staff=staff_user, status=Order.Status.COMPLETED)
        active_orders = Order.objects.filter(assigned_staff=staff_user, status=Order.Status.WITH_DESIGNER)
        profile = getattr(staff_user, 'staff_profile', None)

        return Response({
            "staff_id": staff_user.id,
            "username": staff_user.username,
            "total_jobs_completed": completed_orders.count(),
            "current_active_jobs": active_orders.count(),
            "max_concurrent_jobs": profile.max_concurrent_jobs if profile else 2,
            "rating_average": str(profile.rating_average) if profile else "0.00",
            "specialty_tags": profile.specialty_tags if profile else ""
        })

    @action(detail=False, methods=['get'], permission_classes=[IsStaff], url_path='me/dashboard')
    def me_dashboard(self, request):
        user = request.user
        profile = getattr(user, 'staff_profile', None)

        active_orders = Order.objects.filter(assigned_staff=user, status=Order.Status.WITH_DESIGNER)
        completed_count = Order.objects.filter(assigned_staff=user, status=Order.Status.COMPLETED).count()

        available_pool = Order.objects.filter(
            status=Order.Status.IN_DESIGN,
            assigned_staff__isnull=True,
            advance_paid=True
        ).count()

        return Response({
            "user": StaffListSerializer(user, context={'request': request}).data,
            "active_jobs_count": active_orders.count(),
            "max_concurrent_jobs": profile.max_concurrent_jobs if profile else 2,
            "available_pool_count": available_pool,
            "total_completed": completed_count,
            "active_orders": OrderSerializer(active_orders, many=True, context={'request': request}).data
        })


from django.utils import timezone
from apps.core.email_service import (
    encrypt_credential,
    invalidate_email_cache,
    test_smtp_credentials,
    get_active_email_credentials
)


class PlatformSettingsView(APIView):
    def get_throttles(self):
        if self.request.method in permissions.SAFE_METHODS:
            return []
        return super().get_throttles()

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsStaffOrAdmin()]


    def get(self, request):
        settings_obj = PlatformSettings.load()
        serializer = PlatformSettingsSerializer(settings_obj, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        settings_obj = PlatformSettings.load()
        data = request.data.copy()

        has_email_update = 'smtp_email' in data or 'smtp_app_password' in data
        if has_email_update:
            # Sensitive credential management is strictly restricted to Admin role
            is_admin = (
                request.user and
                request.user.is_authenticated and
                (getattr(request.user, 'role', '') == 'admin' or request.user.is_superuser or request.user.is_staff)
            )
            if not is_admin:
                return Response(
                    {"error": "Only Super Administrators can configure studio email credentials."},
                    status=status.HTTP_403_FORBIDDEN
                )

            new_email = data.get('smtp_email')
            new_password = data.get('smtp_app_password')

            # Check if admin is requesting to clear/unset database credentials and fall back to .env
            if new_email == '' and new_password == '':
                settings_obj.smtp_email = ''
                settings_obj.smtp_app_password_encrypted = ''
                settings_obj.smtp_updated_by = request.user
                settings_obj.smtp_updated_at = timezone.now()
                settings_obj.save(update_fields=[
                    'smtp_email', 'smtp_app_password_encrypted', 'smtp_updated_by', 'smtp_updated_at'
                ])
                invalidate_email_cache()
            else:
                updated_fields = []
                if new_email is not None and new_email.strip():
                    settings_obj.smtp_email = new_email.strip()
                    updated_fields.append('smtp_email')

                if new_password is not None and new_password.strip():
                    settings_obj.smtp_app_password_encrypted = encrypt_credential(new_password.strip())
                    updated_fields.append('smtp_app_password_encrypted')

                if updated_fields:
                    settings_obj.smtp_updated_by = request.user
                    settings_obj.smtp_updated_at = timezone.now()
                    updated_fields.extend(['smtp_updated_by', 'smtp_updated_at'])
                    settings_obj.save(update_fields=updated_fields)
                    invalidate_email_cache()

        data.pop('smtp_app_password', None)
        serializer = PlatformSettingsSerializer(settings_obj, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PlatformSettingsEmailTestView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        candidate_email = request.data.get('smtp_email', '').strip()
        candidate_password = request.data.get('smtp_app_password', '').strip()
        recipient = request.data.get('recipient', '').strip() or request.user.email

        # If fields are empty, test current active configuration (either DB or .env fallback)
        if not candidate_email or not candidate_password:
            active_email, active_pass = get_active_email_credentials()
            if not candidate_email:
                candidate_email = active_email
            if not candidate_password:
                candidate_password = active_pass

        if not candidate_email:
            return Response(
                {"success": False, "detail": "No sender email address provided or configured."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not candidate_password:
            return Response(
                {"success": False, "detail": "No app password provided or configured."},
                status=status.HTTP_400_BAD_REQUEST
            )

        success, detail = test_smtp_credentials(
            email=candidate_email,
            app_password=candidate_password,
            recipient=recipient
        )

        if success:
            return Response({"success": True, "detail": detail})
        else:
            return Response({"success": False, "detail": detail}, status=status.HTTP_400_BAD_REQUEST)

