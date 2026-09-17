from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PortfolioItem, PortfolioImage
from .serializers import PortfolioItemSerializer, PortfolioImageSerializer
from apps.custom_orders.models import Order

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', None) == 'admin')


class PortfolioItemViewSet(viewsets.ModelViewSet):
    serializer_class = PortfolioItemSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        qs = PortfolioItem.objects.all().order_by('display_order', '-created_at')
        cat_slug = self.request.query_params.get('category')
        project_type = self.request.query_params.get('project_type')

        if cat_slug and cat_slug != 'all':
            qs = qs.filter(category_slug__icontains=cat_slug)
        if project_type == 'custom':
            qs = qs.filter(is_custom_project=True)
        elif project_type == 'ai':
            qs = qs.filter(is_ai_project=True)

        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'role', None) == 'admin'):
            qs = qs.filter(is_published=True)
        return qs

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='promote-order')
    def promote_order(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({"error": "order_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if not order.client_consent_to_feature:
            return Response(
                {"error": "Cannot feature order: client consent to feature was not granted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        title = request.data.get('title') or f"Custom {order.custom_request.category.name if (order.custom_request and order.custom_request.category) else 'Design'} - #{order.id}"
        description = request.data.get('description') or (order.custom_request.description if order.custom_request else '')
        is_featured = request.data.get('is_featured', False)
        is_ai = request.data.get('is_ai_project', False)
        is_custom = request.data.get('is_custom_project', True)

        portfolio_item = PortfolioItem.objects.create(
            title=title,
            category=order.custom_request.category if order.custom_request else None,
            category_slug=order.custom_request.category.slug if (order.custom_request and order.custom_request.category) else '',
            is_custom_project=is_custom,
            is_ai_project=is_ai,
            description=description,
            is_featured=is_featured,
            source_order=order,
            is_published=True
        )

        return Response(PortfolioItemSerializer(portfolio_item).data, status=status.HTTP_201_CREATED)
