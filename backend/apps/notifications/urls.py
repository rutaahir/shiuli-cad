from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, ContactMessageViewSet

router = DefaultRouter()
router.register(r'contact', ContactMessageViewSet, basename='contact-messages')
router.register(r'', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]

