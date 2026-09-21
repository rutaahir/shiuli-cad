from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from apps.payments.views_purchases import download_cad_file

urlpatterns = [
    path('admin/', admin.site.urls),
    path('download/<str:token>/', download_cad_file, name='root-download-cad-file'),

    # OpenAPI 3 Schema & Swagger UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API App Routes
    path('api/auth/', include('apps.accounts.urls')),
    path('api/catalog/', include('apps.catalog.urls')),
    path('api/custom-requests/', include('apps.custom_orders.urls_custom_requests')),
    path('api/option-groups/', include('apps.custom_orders.urls_option_groups')),
    path('api/option-values/', include('apps.custom_orders.urls_option_values')),
    path('api/orders/', include('apps.custom_orders.urls_orders')),
    path('api/staff/', include('apps.staff_management.urls_staff')),
    path('api/platform-settings/', include('apps.staff_management.urls_settings')),
    path('api/payments/', include('apps.payments.urls_payments')),
    path('api/settlements/', include('apps.payments.urls_settlements')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/contact/', include('apps.notifications.urls_contact')),
    path('api/services/', include('apps.services.urls')),
    path('api/file-edits/', include('apps.file_edits.urls')),
    path('api/ai-jewellery/', include('apps.ai_jewellery.urls')),
    path('api/portfolio/', include('apps.portfolio.urls')),
    path('api/analytics/', include('apps.core.urls_analytics')),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
