import os
import logging
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404, StreamingHttpResponse
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.core.permissions import IsStaff, IsAdmin, IsStaffOrAdmin
from .models import Category, DesignStyle, Product, ProductFile, ProductImage
from .serializers import (
    CategorySerializer,
    DesignStyleSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateSerializer,
    ProductWriteSerializer,
    ProductImageSerializer,
    ProductFileSerializer
)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    pagination_class = None  # Always return a plain array, not paginated response
    throttle_classes = []

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
    throttle_classes = []

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsStaffOrAdmin()]


class ProductViewSet(viewsets.ModelViewSet):
    lookup_field = 'slug'
    pagination_class = StandardResultsSetPagination
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_throttles(self):
        if self.action in ['list', 'retrieve']:
            return []
        return super().get_throttles()

    def get_permissions(self):

        if self.action in ['list', 'retrieve', 'storage_config']:
            return [permissions.AllowAny()]
        elif self.action in ['create', 'upload_image', 'upload_file', 'gdrive_upload_session', 'gdrive_upload_complete', 'gdrive_status', 'toggle_active', 'toggle_featured', 'destroy']:
            return [IsStaffOrAdmin()]
        elif self.action in ['pending', 'approve', 'reject']:
            return [IsAdmin()]
        elif self.action in ['download_file']:
            return [permissions.IsAuthenticated()]
        return [IsStaffOrAdmin()]

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        # Try finding by lookup_field (slug)
        filter_kwargs = {self.lookup_field: lookup_value}
        try:
            return get_object_or_404(queryset, **filter_kwargs)
        except Exception:
            # Fallback by primary key if lookup_value is numeric
            if str(lookup_value).isdigit():
                return get_object_or_404(queryset, pk=int(lookup_value))
            raise

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        
        # Staff can only delete their own products
        if getattr(user, 'role', '') == 'staff' and instance.uploaded_by != user:
            return Response(
                {"error": "You can only delete your own products."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            # Handle dependent purchases & download tokens safely to prevent ProtectedError
            from apps.payments.models import Purchase, DownloadToken
            DownloadToken.objects.filter(purchase__product=instance).delete()
            Purchase.objects.filter(product=instance).delete()

            # Handle custom requests and orders referencing this product
            from apps.custom_orders.models import CustomRequest, Order
            CustomRequest.objects.filter(reference_product=instance).update(reference_product=None)
            Order.objects.filter(product=instance).update(product=None)

            # Clean up associated images and files
            instance.images.all().delete()
            instance.files.all().delete()

            # Delete product
            instance.delete()
            return Response(
                {"message": f"Product '{instance.title}' has been successfully deleted."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to delete product: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_queryset(self):
        user = self.request.user
        queryset = Product.objects.all().select_related('category', 'uploaded_by').prefetch_related('images', 'style_tags', 'files')

        scope = self.request.query_params.get('scope')

        # Staff requesting their own products in Staff Portal
        if scope == 'mine' and user.is_authenticated:
            return queryset.filter(uploaded_by=user).order_by('-created_at')

        # When staff is mutating (updating/deleting/toggling/uploading media), restrict to their own products
        if user.is_authenticated and getattr(user, 'role', '') == 'staff' and self.action in [
            'update', 'partial_update', 'destroy', 'upload_image', 'upload_file', 'delete_image', 'delete_file', 'toggle_active',
            'gdrive_upload_session', 'gdrive_upload_complete'
        ]:
            return queryset.filter(uploaded_by=user).order_by('-created_at')

        # Public list only shows APPROVED and ACTIVE products unless admin
        is_admin = user.is_authenticated and (getattr(user, 'role', '') == 'admin' or getattr(user, 'is_superuser', False))

        if self.action == 'list':
            status_param = self.request.query_params.get('status')
            if is_admin and status_param:
                queryset = queryset.filter(status__iexact=status_param)
            elif not is_admin:
                # Public storefront, clients, and staff browsing catalog ONLY see APPROVED and ACTIVE products!
                queryset = queryset.filter(status=Product.Status.APPROVED, is_active=True)
        elif self.action == 'retrieve':
            if not is_admin:
                if user.is_authenticated and getattr(user, 'role', '') == 'staff':
                    # Staff can retrieve approved products or their own uploaded design preview
                    queryset = queryset.filter(Q(status=Product.Status.APPROVED, is_active=True) | Q(uploaded_by=user))
                else:
                    # Public storefront can ONLY retrieve approved products!
                    queryset = queryset.filter(status=Product.Status.APPROVED, is_active=True)

        # Filters (applied across both list and retrieve queries)
        category_param = self.request.query_params.get('category')
        if category_param:
            cat_str = str(category_param).strip()
            if cat_str.isdigit():
                cat_id = int(cat_str)
                queryset = queryset.filter(
                    Q(category__id=cat_id) | Q(category__parent__id=cat_id)
                )
            else:
                queryset = queryset.filter(
                    Q(category__slug__iexact=cat_str) | Q(category__parent__slug__iexact=cat_str) |
                    Q(category__name__iexact=cat_str) | Q(category__parent__name__iexact=cat_str)
                )

        style = self.request.query_params.get('style')
        if style:
            if str(style).isdigit():
                queryset = queryset.filter(style_tags__id=int(style))
            else:
                queryset = queryset.filter(style_tags__name__iexact=style)

        min_price = self.request.query_params.get('min_price')
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except ValueError:
                pass

        max_price = self.request.query_params.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search) |
                Q(category__name__icontains=search) | Q(category__parent__name__icontains=search)
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

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='toggle-active')
    def toggle_active(self, request, slug=None):
        product = self.get_object()
        user = request.user
        if getattr(user, 'role', '') == 'staff' and product.uploaded_by != user:
            return Response(
                {"detail": "You can only enable or disable your own products."},
                status=status.HTTP_403_FORBIDDEN
            )
        product.is_active = not product.is_active
        product.save(update_fields=['is_active'])
        return Response({
            "id": product.id,
            "slug": product.slug,
            "title": product.title,
            "is_active": product.is_active,
            "message": f"Product is now {'Active & Published' if product.is_active else 'Disabled & Hidden'}."
        })

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='toggle-featured')
    def toggle_featured(self, request, slug=None):
        product = self.get_object()
        user = request.user
        if getattr(user, 'role', '') == 'staff' and product.uploaded_by != user:
            return Response(
                {"detail": "You can only edit your own products."},
                status=status.HTTP_403_FORBIDDEN
            )
        product.is_featured = not product.is_featured
        product.save(update_fields=['is_featured'])
        return Response({
            "id": product.id,
            "slug": product.slug,
            "title": product.title,
            "is_featured": product.is_featured,
            "message": f"Product is now {'selected for Home Marquee' if product.is_featured else 'removed from Home Marquee'}."
        })

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductWriteSerializer
        return ProductDetailSerializer

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        is_admin_user = user and (getattr(user, 'role', '') == 'admin' or getattr(user, 'is_superuser', False))

        if is_admin_user:
            serializer.save(uploaded_by=user, status=Product.Status.APPROVED, approved_at=timezone.now())
        else:
            # Staff-submitted products MUST first go for verification to the admin!
            product = serializer.save(uploaded_by=user, status=Product.Status.PENDING, approved_at=None)
            try:
                from apps.accounts.models import User
                from apps.custom_orders.services import create_notification
                admin_users = User.objects.filter(Q(role='admin') | Q(is_superuser=True))
                staff_name = user.get_full_name() or user.username if user else "Staff Designer"
                for admin in admin_users:
                    create_notification(
                        recipient=admin,
                        title="New Staff Design Awaiting Verification",
                        body=f"{staff_name} submitted new design '{product.title}' for verification.",
                        notification_type="system"
                    )
            except Exception:
                pass

    def perform_update(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        is_admin_user = user and (getattr(user, 'role', '') == 'admin' or getattr(user, 'is_superuser', False))

        if is_admin_user:
            serializer.save()
        else:
            # When staff updates an existing design, it goes back for admin re-verification
            product = serializer.save(status=Product.Status.PENDING, approved_at=None)
            try:
                from apps.accounts.models import User
                from apps.custom_orders.services import create_notification
                admin_users = User.objects.filter(Q(role='admin') | Q(is_superuser=True))
                staff_name = user.get_full_name() or user.username if user else "Staff Designer"
                for admin in admin_users:
                    create_notification(
                        recipient=admin,
                        title="Staff Design Updated - Needs Re-verification",
                        body=f"{staff_name} updated design '{product.title}'. Needs admin review.",
                        notification_type="system"
                    )
            except Exception:
                pass

    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def pending(self, request):
        # All products awaiting approval show up in the Design Approvals queue
        pending_products = Product.objects.filter(
            status=Product.Status.PENDING
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
        product.is_active = True
        product.save(update_fields=['status', 'approved_at', 'rejection_reason', 'is_active'])

        # Notify the staff designer who uploaded it
        if product.uploaded_by:
            try:
                from apps.custom_orders.services import create_notification
                create_notification(
                    recipient=product.uploaded_by,
                    title="Design Approved by Admin!",
                    body=f"Super Admin verified and approved '{product.title}'. It is now live on the public storefront.",
                    notification_type="system"
                )
            except Exception:
                pass

        return Response({"message": f"Product '{product.title}' has been approved and published to store.", "status": product.status})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='reject')
    def reject(self, request, slug=None):
        product = self.get_object()
        reason = request.data.get('rejection_reason', '').strip()
        if not reason:
            return Response({"error": "Rejection reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        product.status = Product.Status.REJECTED
        product.rejection_reason = reason
        product.is_active = False
        product.save(update_fields=['status', 'rejection_reason', 'is_active'])

        # Notify the staff designer who uploaded it
        if product.uploaded_by:
            try:
                from apps.custom_orders.services import create_notification
                create_notification(
                    recipient=product.uploaded_by,
                    title="Design Verification: Revisions Needed",
                    body=f"Admin requested revisions for '{product.title}': {reason}",
                    notification_type="system"
                )
            except Exception:
                pass

        return Response({"message": f"Product '{product.title}' has been rejected.", "status": product.status, "reason": reason})

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], parser_classes=[MultiPartParser, FormParser], url_path='upload-image')
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

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], parser_classes=[MultiPartParser, FormParser], url_path='upload-file')
    def upload_file(self, request, slug=None):
        product = self.get_object()
        file_obj = request.FILES.get('file')
        file_type = request.data.get('file_type', '').strip().lower()

        if not file_obj:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        if not file_type:
            return Response({"error": "file_type is required. Valid choices: 3dm, stl, render, video, zip."}, status=status.HTTP_400_BAD_REQUEST)

        valid_types = [choice[0] for choice in ProductFile.FileType.choices]
        if file_type not in valid_types:
            return Response(
                {"error": f"Invalid file_type '{file_type}'. Valid choices: {', '.join(valid_types)}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extension validation per file type
        import os
        ext = os.path.splitext(file_obj.name)[1].lower()
        allowed_extensions = {
            '3dm': ['.3dm'],
            'stl': ['.stl'],
            'render': ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp'],
            'video': ['.mp4', '.mov', '.webm', '.avi', '.mkv'],
            'zip': ['.zip', '.7z', '.tar', '.gz', '.rar'],
        }
        if ext not in allowed_extensions.get(file_type, []):
            return Response(
                {"error": f"Invalid file extension '{ext}' for type '{file_type}'. Allowed: {', '.join(allowed_extensions.get(file_type, []))}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Replace existing file of same type (keep DB clean - only 1 file per type per product)
        existing = product.files.filter(file_type=file_type).first()
        if existing:
            try:
                existing.file.delete(save=False)
                existing.delete()
            except Exception:
                pass

        pf = ProductFile(
            product=product,
            file_type=file_type,
            original_filename=file_obj.name,
            file_size_bytes=file_obj.size,
        )
        pf.file = file_obj
        pf.save()

        serializer = ProductFileSerializer(pf, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], permission_classes=[IsStaffOrAdmin], url_path='delete-image/(?P<image_id>[^/.]+)')
    def delete_image(self, request, slug=None, image_id=None):
        product = self.get_object()
        try:
            img = product.images.get(id=image_id)
            img.delete()
            return Response({"message": "Image deleted successfully."}, status=status.HTTP_200_OK)
        except ProductImage.DoesNotExist:
            return Response({"error": "Image not found."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['delete'], permission_classes=[IsStaffOrAdmin], url_path='delete-file/(?P<file_id>[^/.]+)')
    def delete_file(self, request, slug=None, file_id=None):
        product = self.get_object()
        try:
            pf = product.files.get(id=file_id)
            pf.delete()
            return Response({"message": "File deleted successfully."}, status=status.HTTP_200_OK)
        except ProductFile.DoesNotExist:
            return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], url_path='storage-config')
    def storage_config(self, request):
        """
        Returns active CAD storage backend configuration.
        """
        backend = getattr(settings, 'CAD_STORAGE_BACKEND', 'local')
        return Response({
            "storage_backend": backend,
            "is_gdrive": backend == 'gdrive'
        })

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='gdrive-upload-session')
    def gdrive_upload_session(self, request, slug=None):
        """
        Initiates a direct resumable upload session on Google Drive.
        Enables browser to upload large CAD assets directly to Drive with zero server memory buffering.
        """
        product = self.get_object()
        file_name = request.data.get('filename', '').strip()
        file_type = request.data.get('file_type', '').strip().lower()
        file_size = request.data.get('file_size')
        mime_type = request.data.get('mime_type', 'application/octet-stream')

        if not file_name or not file_type or not file_size:
            return Response(
                {"error": "filename, file_type, and file_size are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_types = [choice[0] for choice in ProductFile.FileType.choices]
        if file_type not in valid_types:
            return Response(
                {"error": f"Invalid file_type '{file_type}'. Valid choices: {', '.join(valid_types)}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        ext = os.path.splitext(file_name)[1].lower()
        allowed_extensions = {
            '3dm': ['.3dm'],
            'stl': ['.stl'],
            'render': ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp'],
            'video': ['.mp4', '.mov', '.webm', '.avi', '.mkv'],
            'zip': ['.zip', '.7z', '.tar', '.gz', '.rar'],
        }
        if ext not in allowed_extensions.get(file_type, []):
            return Response(
                {"error": f"Invalid file extension '{ext}' for type '{file_type}'. Allowed: {', '.join(allowed_extensions.get(file_type, []))}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.core.gdrive_service import (
            create_resumable_upload_session,
            GoogleDriveError,
            GoogleDriveAuthError,
            GoogleDrivePermissionError,
            GoogleDriveQuotaError,
            GoogleDriveNotFoundError
        )
        origin = request.META.get('HTTP_ORIGIN')
        try:
            session_uri = create_resumable_upload_session(
                filename=f"{product.slug}_{file_type}{ext}",
                mime_type=mime_type,
                size=int(file_size),
                origin=origin
            )
            return Response({
                "session_uri": session_uri,
                "file_type": file_type,
                "filename": file_name,
                "product_slug": product.slug
            }, status=status.HTTP_200_OK)
        except GoogleDriveAuthError as e:
            return Response({
                "error": str(e),
                "code": "gdrive_auth_required"
            }, status=status.HTTP_401_UNAUTHORIZED)
        except GoogleDriveQuotaError as e:
            return Response({
                "error": str(e),
                "code": "gdrive_quota_exceeded"
            }, status=status.HTTP_507_INSUFFICIENT_STORAGE)
        except GoogleDrivePermissionError as e:
            return Response({
                "error": str(e),
                "code": "gdrive_permission_denied"
            }, status=status.HTTP_403_FORBIDDEN)
        except GoogleDriveNotFoundError as e:
            return Response({
                "error": str(e),
                "code": "gdrive_folder_not_found"
            }, status=status.HTTP_404_NOT_FOUND)
        except GoogleDriveError as e:
            return Response({"error": str(e), "code": "gdrive_error"}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=False, methods=['get'], permission_classes=[IsStaffOrAdmin], url_path='gdrive-status')
    def gdrive_status(self, request):
        """
        Safe health check to verify Google Drive authorization and folder access.
        """
        from apps.core.gdrive_service import test_folder_access, GoogleDriveError
        try:
            info = test_folder_access()
            return Response(info, status=status.HTTP_200_OK)
        except GoogleDriveError as e:
            return Response({
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='gdrive-upload-complete')
    def gdrive_upload_complete(self, request, slug=None):
        """
        Finalizes a direct Google Drive upload after the browser finishes sending bytes.
        Verifies metadata against Drive API and creates the ProductFile record.
        """
        product = self.get_object()
        drive_file_id = request.data.get('drive_file_id', '').strip()
        file_type = request.data.get('file_type', '').strip().lower()
        original_filename = request.data.get('original_filename', '').strip()

        if not drive_file_id or not file_type:
            return Response(
                {"error": "drive_file_id and file_type are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_types = [choice[0] for choice in ProductFile.FileType.choices]
        if file_type not in valid_types:
            return Response(
                {"error": f"Invalid file_type '{file_type}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.core.gdrive_service import get_file_metadata, GoogleDriveError
        try:
            metadata = get_file_metadata(drive_file_id)
        except GoogleDriveError as e:
            return Response({"error": f"Failed to verify Google Drive file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Replace existing product file of same type (cleans up old Drive or local file via post_delete signal)
        existing = product.files.filter(file_type=file_type).first()
        if existing:
            try:
                existing.delete()
            except Exception as e:
                logger.warning("Error cleaning up old ProductFile: %s", e)

        pf = ProductFile.objects.create(
            product=product,
            file_type=file_type,
            storage_provider=ProductFile.StorageProvider.GDRIVE,
            drive_file_id=drive_file_id,
            original_filename=original_filename or metadata.get('name', ''),
            file_size_bytes=metadata.get('size', 0)
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

        # Google Drive streaming
        if product_file.storage_provider == ProductFile.StorageProvider.GDRIVE and product_file.drive_file_id:
            from apps.core.gdrive_service import stream_file, GoogleDriveQuotaError, GoogleDriveError
            try:
                stream = stream_file(product_file.drive_file_id)
                response = StreamingHttpResponse(stream, content_type='application/octet-stream')
                filename = product_file.original_filename or f"{product.slug}_{product_file.file_type}.{product_file.file_type}"
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                if product_file.file_size_bytes:
                    response['Content-Length'] = str(product_file.file_size_bytes)
                return response
            except GoogleDriveQuotaError:
                return Response(
                    {"error": "Download temporarily unavailable due to storage quota limits, please try again later or contact support."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            except GoogleDriveError as e:
                return Response(
                    {"error": f"Failed to retrieve file from storage: {str(e)}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )

        if not product_file.file:
            raise Http404("File content is not available.")

        file_handle = product_file.file.open('rb')
        response = FileResponse(file_handle, content_type='application/octet-stream')
        file_name = product_file.original_filename or os.path.basename(product_file.file.name)
        response['Content-Disposition'] = f'attachment; filename="{file_name}"'
        return response


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def country_context_view(request):
    """
    GET /api/catalog/country-context/
    Returns authoritative detected country, currency mapping, live rates, and supported countries list.
    """
    from .pricing_service import (
        detect_customer_country,
        get_country_info,
        get_all_supported_countries,
        get_latest_exchange_rates,
        get_exchange_rate,
    )
    country_code, source = detect_customer_country(request)
    country_info = get_country_info(country_code)
    rates = get_latest_exchange_rates()
    current_rate = get_exchange_rate(country_info["currency"])

    return Response({
        "country": country_code,
        "country_name": country_info["name"],
        "currency": country_info["currency"],
        "symbol": country_info["symbol"],
        "flag": country_info["flag"],
        "exchange_rate": current_rate,
        "source": source,
        "supported_countries": get_all_supported_countries(),
        "exchange_rates": rates,
    })

