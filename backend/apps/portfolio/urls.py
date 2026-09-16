from rest_framework.routers import DefaultRouter
from .views import PortfolioItemViewSet

router = DefaultRouter()
router.register(r'items', PortfolioItemViewSet, basename='portfolio-item')

urlpatterns = router.urls
