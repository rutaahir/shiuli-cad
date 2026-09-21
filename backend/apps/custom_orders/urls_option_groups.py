from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OptionGroupViewSet

router = DefaultRouter()
router.register(r'', OptionGroupViewSet, basename='option-group-direct')

urlpatterns = [
    path('', include(router.urls)),
]
