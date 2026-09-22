import os
from django.http import FileResponse, Http404
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from apps.core.permissions import IsStaff, IsAdmin, IsStaffOrAdmin
from .models import Category, DesignStyle, Product, ProductFile, ProductImage
from .serializers import (
    CategorySerializer,
    DesignStyleSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateSerializer,
    ProductImageSerializer,
    ProductFileSerializer
)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None  # Always return a plain array, not paginated response

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsStaffOrAdmin()]

    def list(self, request, *args, **kwargs):
        # By default, list returns top-level categories with nested subcategories
        if request.query_params.get('flat') == 'true':
            queryset = Category.objects.all()
        else:
            queryset = Category.objects.filter(parent__isnull=True).prefetch_related('subcategories')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        reassign = request.query_params.get('reassign') == 'true' or request.data.get('reassign') is True
        force_delete = request.query_params.get('force') == 'true' or request.query_params.get('cascade') == 'true' or request.data.get('force') is True
        
        direct_products = instance.products.all()
        direct_count = direct_products.count()
        sub_count = Product.objects.filter(category__parent=instance).count()
        total_products = direct_count + sub_count

        if total_products > 0:
            if force_delete:
                # Automatically delete assigned products before deleting category
                Product.objects.filter(Q(category=instance) | Q(category__parent=instance)).delete()
            elif reassign and instance.parent:
                # Reassign subcategory's products to its parent category before deletion
                direct_products.update(category=instance.parent)
            else:
                return Response(
                    {"error": f"Cannot delete category '{instance.name}' because it has {total_products} assigned products. Reassign or remove these products first.", "has_products": True, "product_count": total_products},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().destroy(request, *args, **kwargs)


class DesignStyleViewSet(viewsets.ModelViewSet):
    queryset = DesignStyle.objects.all()
    serializer_class = DesignStyleSerializer
    pagination_class = None  # Always return a plain array, not paginated response

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsStaffOrAdmin()]


class ProductViewSet(viewsets.ModelViewSet):
    lookup_field = 'slug'
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        elif self.action in ['create', 'upload_image', 'upload_file']:
            return [IsStaffOrAdmin()]
        elif self.action in ['pending', 'approve', 'reject']:
            return [IsAdmin()]
        elif self.action in ['download_file']:
            return [permissions.IsAuthenticated()]
        return [IsStaffOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        queryset = Product.objects.all().select_related('category', 'uploaded_by').prefetch_related('images', 'style_tags', 'files')

        # Public list only shows APPROVED products unless admin, or staff looking at their uploads
        if self.action == 'list':
            status_param = self.request.query_params.get('status')
            if status_param:
                queryset = queryset.filter(status__iexact=status_param)
            elif not user.is_authenticated or user.role == 'client':
                queryset = queryset.filter(status=Product.Status.APPROVED)
            elif user.role == 'staff':
                queryset = queryset.filter(Q(status=Product.Status.APPROVED) | Q(uploaded_by=user))

            # Filters
            category_slug = self.request.query_params.get('category')
            if category_slug:
                queryset = queryset.filter(
                    Q(category__slug=category_slug) | Q(category__parent__slug=category_slug)
                )

            style = self.request.query_params.get('style')
            if style:
                queryset = queryset.filter(style_tags__name__iexact=style)

            min_price = self.request.query_params.get('min_price')
            if min_price:
                queryset = queryset.filter(price__gte=min_price)

            max_price = self.request.query_params.get('max_price')
            if max_price:
                queryset = queryset.filter(price__lte=max_price)

            search = self.request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    Q(title__icontains=search) | Q(description__icontains=search)
                )

            is_bestseller = self.request.query_params.get('is_bestseller')
            if is_bestseller:
                queryset = queryset.filter(is_bestseller=is_bestseller.lower() == 'true')

            is_new = self.request.query_params.get('is_new')
            if is_new:
                queryset = queryset.filter(is_new=is_new.lower() == 'true')

            featured = self.request.query_params.get('featured') or self.request.query_params.get('is_featured')
            if featured:
                queryset = queryset.filter(is_featured=featured.lower() == 'true')

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        elif self.action == 'create':
            return ProductCreateSerializer
        return ProductDetailSerializer

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        if user and (getattr(user, 'role', '') == 'admin' or getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False)):
            serializer.save(uploaded_by=user, status=Product.Status.APPROVED, approved_at=timezone.now())
        else:
            serializer.save(uploaded_by=user, status=Product.Status.PENDING)

    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def pending(self, request):
        # Only staff-submitted products awaiting approval show up in the Design Approvals queue
        pending_products = Product.objects.filter(
            status=Product.Status.PENDING,
            uploaded_by__role='staff'
        ).order_by('-created_at')
        page = self.paginate_queryset(pending_products)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductListSerializer(pending_products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='approve')
    def approve(self, request, slug=None):
        product = self.get_object()
        product.status = Product.Status.APPROVED
        product.approved_at = timezone.now()
        product.rejection_reason = ""
        product.save()
        return Response({"message": f"Product '{product.title}' has been approved.", "status": product.status})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='reject')
    def reject(self, request, slug=None):
        product = self.get_object()
        reason = request.data.get('rejection_reason', '').strip()
        if not reason:
            return Response({"error": "Rejection reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        product.status = Product.Status.REJECTED
        product.rejection_reason = reason
        product.save()
        return Response({"message": f"Product '{product.title}' has been rejected.", "status": product.status, "reason": reason})

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='upload-image')
    def upload_image(self, request, slug=None):
        product = self.get_object()
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({"error": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)

        is_primary = str(request.data.get('is_primary', 'false')).lower() == 'true'
        display_order = int(request.data.get('display_order', 0))

        if is_primary:
            product.images.filter(is_primary=True).update(is_primary=False)

        img = ProductImage.objects.create(
            product=product,
            image=image_file,
            is_primary=is_primary,
            display_order=display_order
        )
        serializer = ProductImageSerializer(img, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='upload-file')
    def upload_file(self, request, slug=None):
        product = self.get_object()
        file_obj = request.FILES.get('file')
        file_type = request.data.get('file_type')

        if not file_obj or not file_type:
            return Response({"error": "Both file and file_type are required."}, status=status.HTTP_400_BAD_REQUEST)

        if file_type not in [choice[0] for choice in ProductFile.FileType.choices]:
            return Response({"error": f"Invalid file_type '{file_type}'. Valid choices: 3dm, stl, render, video."}, status=status.HTTP_400_BAD_REQUEST)

        pf = ProductFile.objects.create(
            product=product,
            file=file_obj,
            file_type=file_type
        )
        serializer = ProductFileSerializer(pf, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='download/(?P<file_id>[^/.]+)')
    def download_file(self, request, file_id=None):
        try:
            product_file = ProductFile.objects.select_related('product', 'product__uploaded_by').get(id=file_id)
        except ProductFile.DoesNotExist:
            raise Http404("File not found.")

        product = product_file.product
        user = request.user

        # Access control check
        has_access = False
        if user.role == 'admin':
            has_access = True
        elif user == product.uploaded_by:
            has_access = True
        elif product_file.file_type in ['render', 'video']:
            has_access = True
        else:
            # Check purchase via custom orders app Order model
            from apps.custom_orders.models import Order
            has_access = Order.objects.filter(
                client=user,
                product=product,
                balance_paid=True
            ).exists()

        if not has_access:
            return Response(
                {"detail": "You must purchase this design before downloading raw CAD files."},
                status=status.HTTP_403_FORBIDDEN
            )

        file_handle = product_file.file.open('rb')
        response = FileResponse(file_handle, content_type='application/octet-stream')
        file_name = os.path.basename(product_file.file.name)
        response['Content-Disposition'] = f'attachment; filename="{file_name}"'
        return response
