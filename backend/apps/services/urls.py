from rest_framework.routers import DefaultRouter
from .views import ServicePageViewSet

router = DefaultRouter()
router.register(r'pages', ServicePageViewSet, basename='service-page')

urlpatterns = router.urls
