from rest_framework.routers import DefaultRouter
from .views import AIConceptGenerationViewSet

router = DefaultRouter()
router.register(r'concepts', AIConceptGenerationViewSet, basename='ai-concept')

urlpatterns = router.urls
