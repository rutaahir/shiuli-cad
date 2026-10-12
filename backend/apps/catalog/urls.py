from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, DesignStyleViewSet, ProductViewSet, country_context_view

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'styles', DesignStyleViewSet, basename='style')
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [
    path('country-context/', country_context_view, name='country-context'),
    path('', include(router.urls)),
]

