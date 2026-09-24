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


class PlatformSettingsView(APIView):
    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsStaffOrAdmin()]

    def get(self, request):
        settings_obj = PlatformSettings.load()
        serializer = PlatformSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def patch(self, request):
        settings_obj = PlatformSettings.load()
        serializer = PlatformSettingsSerializer(settings_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
