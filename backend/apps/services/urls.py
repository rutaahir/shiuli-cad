from rest_framework.routers import DefaultRouter
from .views import ServicePageViewSet, TestimonialViewSet, FAQViewSet

router = DefaultRouter()
router.register(r'pages', ServicePageViewSet, basename='service-page')
router.register(r'testimonials', TestimonialViewSet, basename='testimonial')
router.register(r'faqs', FAQViewSet, basename='faq')

urlpatterns = router.urls
