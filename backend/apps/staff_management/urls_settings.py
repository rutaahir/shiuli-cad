from django.urls import path
from .views import PlatformSettingsView, PlatformSettingsEmailTestView

urlpatterns = [
    path('', PlatformSettingsView.as_view(), name='platform-settings'),
    path('test-email/', PlatformSettingsEmailTestView.as_view(), name='platform-settings-test-email'),
]

