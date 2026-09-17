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

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return FileEditRequest.objects.none()
        if getattr(user, 'role', None) == 'admin':
            return FileEditRequest.objects.all().order_by('-created_at')
        if getattr(user, 'role', None) == 'staff':
            return FileEditRequest.objects.none()
        return FileEditRequest.objects.filter(client=user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        import json
        data = request.data.copy()
        
        # Handle stringified modification_types list from FormData
        mod_types = data.get('modification_types')
        if isinstance(mod_types, str):
            try:
                data.setlist('modification_types', json.loads(mod_types))
            except Exception:
                pass

        # Handle original_file_format if missing
        if not data.get('original_file_format') and 'original_file' in request.FILES:
            filename = request.FILES['original_file'].name
            ext = filename.split('.')[-1].lower() if '.' in filename else ''
            data['original_file_format'] = ext

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(client=self.request.user, status=FileEditRequest.Status.NEW)

