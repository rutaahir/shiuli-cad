from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    create_payment_session,
    verify_payment,
    pay_stage_payment,
    pay_full_order_payment,
    PaymentPlanTemplateViewSet,
    incoming_gateway_logs,
    razorpay_webhook,
    admin_approve_custom_payment,
    admin_decline_custom_payment
)
from .views_purchases import (
    create_purchase,
    create_razorpay_purchase_order,
    verify_razorpay_purchase,
    resend_otp,
    verify_otp,
    download_cad_file,
    resend_download_link,
    list_my_purchases,
    admin_approve_purchase,
    admin_decline_purchase,
    resubmit_purchase_proof,
    toggle_purchase_download_permission
)
from .views_wallet_credits import (
    client_credit_account_detail,
    wallet_topup_request,
    credit_repayment_request,
    checkout_with_wallet,
    checkout_with_credit,
    admin_client_credits_list,
    admin_set_credit_limit,
    admin_adjust_wallet,
    admin_verify_transaction,
)

router = DefaultRouter()
router.register(r'templates', PaymentPlanTemplateViewSet, basename='payment-plan-template')

urlpatterns = [
    path('gateway-log/', incoming_gateway_logs, name='payment-gateway-log'),
    path('create-order/', create_payment_session, name='payment-create-order'),
    path('verify/', verify_payment, name='payment-verify'),
    path('webhook/', razorpay_webhook, name='payment-webhook'),
    path('pay-stage/', pay_stage_payment, name='payment-pay-stage'),
    path('pay-full-order/', pay_full_order_payment, name='payment-pay-full-order'),
    path('<int:payment_id>/admin-approve/', admin_approve_custom_payment, name='payment-admin-approve'),
    path('<int:payment_id>/admin-decline/', admin_decline_custom_payment, name='payment-admin-decline'),
    path('purchases/', create_purchase, name='purchase-create'),
    path('purchases/create-order/', create_razorpay_purchase_order, name='purchase-create-order'),
    path('purchases/verify/', verify_razorpay_purchase, name='purchase-verify-payment'),
    path('purchases/mine/', list_my_purchases, name='purchase-mine'),
    path('purchases/<int:purchase_id>/admin-approve/', admin_approve_purchase, name='purchase-admin-approve'),
    path('purchases/<int:purchase_id>/admin-decline/', admin_decline_purchase, name='purchase-admin-decline'),
    path('purchases/<int:purchase_id>/resubmit-proof/', resubmit_purchase_proof, name='purchase-resubmit-proof'),
    path('purchases/<int:purchase_id>/toggle-download-permission/', toggle_purchase_download_permission, name='purchase-toggle-download-permission'),
    path('purchases/<int:purchase_id>/toggle-download/', toggle_purchase_download_permission, name='purchase-toggle-download'),
    path('purchases/<int:purchase_id>/resend-otp/', resend_otp, name='purchase-resend-otp'),
    path('purchases/<int:purchase_id>/verify-otp/', verify_otp, name='purchase-verify-otp'),
    path('download/<str:token>/', download_cad_file, name='download-cad-file'),
    
    # Prepaid Wallet & Postpaid Corporate Credit Line Routes
    path('client-credit-account/', client_credit_account_detail, name='client-credit-account-detail'),
    path('wallet/topup/', wallet_topup_request, name='wallet-topup-request'),
    path('credit/repay/', credit_repayment_request, name='credit-repayment-request'),
    path('checkout-wallet/', checkout_with_wallet, name='checkout-with-wallet'),
    path('checkout-credit/', checkout_with_credit, name='checkout-with-credit'),
    path('admin/client-credits/', admin_client_credits_list, name='admin-client-credits-list'),
    path('admin/client-credits/set-limit/', admin_set_credit_limit, name='admin-set-credit-limit'),
    path('admin/client-credits/adjust-wallet/', admin_adjust_wallet, name='admin-adjust-wallet'),
    path('admin/client-credits/verify-transaction/', admin_verify_transaction, name='admin-verify-transaction'),

    path('', include(router.urls)),
]



