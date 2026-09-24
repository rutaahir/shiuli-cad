from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RevisionRequestViewSet

router = DefaultRouter()
router.register(r'', RevisionRequestViewSet, basename='revision-request')

urlpatterns = [
    path('', include(router.urls)),
]
