from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OptionValueViewSet

router = DefaultRouter()
router.register(r'', OptionValueViewSet, basename='option-value-direct')

urlpatterns = [
    path('', include(router.urls)),
]
