from rest_framework.routers import DefaultRouter
from .views import ModificationTypeViewSet, FileEditRequestViewSet

router = DefaultRouter()
router.register(r'modification-types', ModificationTypeViewSet, basename='modification-type')
router.register(r'requests', FileEditRequestViewSet, basename='file-edit-request')

urlpatterns = router.urls
