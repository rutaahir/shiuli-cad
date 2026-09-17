from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import create_payment_session, verify_payment, pay_stage_payment, PaymentPlanTemplateViewSet, incoming_gateway_logs
from .views_purchases import (
    create_purchase,
    resend_otp,
    verify_otp,
    download_cad_file,
    resend_download_link,
    list_my_purchases
)

router = DefaultRouter()
router.register(r'templates', PaymentPlanTemplateViewSet, basename='payment-plan-template')

urlpatterns = [
    path('gateway-log/', incoming_gateway_logs, name='payment-gateway-log'),
    path('create-order/', create_payment_session, name='payment-create-order'),
    path('verify/', verify_payment, name='payment-verify'),
    path('pay-stage/', pay_stage_payment, name='payment-pay-stage'),
    path('purchases/', create_purchase, name='purchase-create'),
    path('purchases/mine/', list_my_purchases, name='purchase-mine'),
    path('purchases/<int:purchase_id>/resend-otp/', resend_otp, name='purchase-resend-otp'),
    path('purchases/<int:purchase_id>/verify-otp/', verify_otp, name='purchase-verify-otp'),
    path('purchases/<int:purchase_id>/resend-download-link/', resend_download_link, name='purchase-resend-download-link'),
    path('download/<str:token>/', download_cad_file, name='download-cad-file'),
    path('', include(router.urls)),
]


