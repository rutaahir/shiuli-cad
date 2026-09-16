from django.urls import path
from .views import PlatformSettingsView

urlpatterns = [
    path('', PlatformSettingsView.as_view(), name='platform-settings'),
]
