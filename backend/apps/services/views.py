from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ServicePage, ServicePageFeature, ServicePageGalleryImage
from .serializers import ServicePageSerializer, ServicePageFeatureSerializer, ServicePageGalleryImageSerializer

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', None) == 'admin')


class ServicePageViewSet(viewsets.ModelViewSet):
    queryset = ServicePage.objects.all().order_by('display_order', 'id')
    serializer_class = ServicePageSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'slug'

    def get_queryset(self):
        qs = ServicePage.objects.all().order_by('display_order', 'id')
        section = self.request.query_params.get('section')
        if section:
            qs = qs.filter(section=section)
        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'role', None) == 'admin'):
            qs = qs.filter(is_published=True)
        return qs
