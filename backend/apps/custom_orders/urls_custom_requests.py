from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomRequestViewSet,
    AestheticStyleViewSet,
    MetalAlloyViewSet,
    GemstoneOptionViewSet,
    PricingRuleViewSet,
    OptionGroupViewSet,
    OptionValueViewSet
)

router = DefaultRouter()
router.register(r'option-groups', OptionGroupViewSet, basename='option-group')
router.register(r'option-values', OptionValueViewSet, basename='option-value')
router.register(r'aesthetic-styles', AestheticStyleViewSet, basename='aesthetic-style')
router.register(r'metal-alloys', MetalAlloyViewSet, basename='metal-alloy')
router.register(r'gemstone-options', GemstoneOptionViewSet, basename='gemstone-option')
router.register(r'pricing-rules', PricingRuleViewSet, basename='pricing-rule')
router.register(r'', CustomRequestViewSet, basename='custom-request')

urlpatterns = [
    path('', include(router.urls)),
]
