from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ServicePage, ServicePageFeature, ServicePageGalleryImage, Testimonial, FAQ
from .serializers import (
    ServicePageSerializer,
    ServicePageFeatureSerializer,
    ServicePageGalleryImageSerializer,
    TestimonialSerializer,
    FAQSerializer,
)

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
    pagination_class = None

    def get_queryset(self):
        qs = ServicePage.objects.all().order_by('display_order', 'id')
        section = self.request.query_params.get('section')
        if section:
            qs = qs.filter(section=section)
        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'role', None) == 'admin'):
            qs = qs.filter(is_published=True)
        return qs


class TestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.all()
    serializer_class = TestimonialSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        qs = Testimonial.objects.all().order_by('display_order', '-created_at')
        featured_only = self.request.query_params.get('featured')
        if featured_only and featured_only.lower() in ['true', '1']:
            qs = qs.filter(is_featured=True)
        return qs


class FAQViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.filter(is_published=True).order_by('display_order', 'id')
    serializer_class = FAQSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        qs = FAQ.objects.all().order_by('display_order', 'id')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__iexact=category)
        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'role', None) == 'admin'):
            qs = qs.filter(is_published=True)
        return qs

