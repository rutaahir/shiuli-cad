from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ModificationType, FileEditRequest
from .serializers import ModificationTypeSerializer, FileEditRequestSerializer
from apps.custom_orders.models import Order

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', None) == 'admin')


class ModificationTypeViewSet(viewsets.ModelViewSet):
    queryset = ModificationType.objects.filter(is_active=True).order_by('display_order', 'id')
    serializer_class = ModificationTypeSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None


class FileEditRequestViewSet(viewsets.ModelViewSet):
    serializer_class = FileEditRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return FileEditRequest.objects.none()
        if getattr(user, 'role', None) == 'admin':
            return FileEditRequest.objects.all().order_by('-created_at')
        if getattr(user, 'role', None) == 'staff':
            return FileEditRequest.objects.none()
        return FileEditRequest.objects.filter(client=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        if not user:
            from apps.accounts.models import User
            user = User.objects.filter(role='client').first()
        serializer.save(client=user, status=FileEditRequest.Status.NEW)
