from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    SendRegistrationOTPView,
    VerifyRegistrationOTPView,
    CustomTokenObtainPairView,
    UserMeView,
    LogoutView,
    RequestPasswordResetEmailView,
    ChangePasswordView,
    RequestEmailChangeOTPView,
    VerifyEmailChangeOTPView,
    RequestPasswordResetOTPView,
    VerifyPasswordResetOTPView,
    AdminClientsListView,
    CaptchaGenerateView,
    DesignerApplicationCreateView,
    DesignerApplicationListView,
    DesignerApplicationApproveView,
    DesignerApplicationDeclineView,
    DesignerApplicationDownloadZipView,
    DesignerApplicationResendEmailView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('register/send-otp/', SendRegistrationOTPView.as_view(), name='auth-register-send-otp'),
    path('register/verify-otp/', VerifyRegistrationOTPView.as_view(), name='auth-register-verify-otp'),
    path('login/', CustomTokenObtainPairView.as_view(), name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', UserMeView.as_view(), name='auth-me'),
    path('admin/clients/', AdminClientsListView.as_view(), name='auth-admin-clients'),
    path('reset-password-email/', RequestPasswordResetEmailView.as_view(), name='auth-reset-password-email'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    
    # OTP-gated profile security endpoints
    path('request-email-change-otp/', RequestEmailChangeOTPView.as_view(), name='auth-request-email-otp'),
    path('verify-email-change-otp/', VerifyEmailChangeOTPView.as_view(), name='auth-verify-email-otp'),
    path('request-password-reset-otp/', RequestPasswordResetOTPView.as_view(), name='auth-request-password-otp'),
    path('verify-password-reset-otp/', VerifyPasswordResetOTPView.as_view(), name='auth-verify-password-otp'),

    # Captcha challenge for registration verification
    path('captcha/', CaptchaGenerateView.as_view(), name='auth-captcha'),

    # CAD Designer self-registration & admin approvals
    path('designer-applications/', DesignerApplicationListView.as_view(), name='designer-applications-list'),
    path('designer-applications/apply/', DesignerApplicationCreateView.as_view(), name='designer-applications-apply'),
    path('designer-applications/<int:pk>/approve/', DesignerApplicationApproveView.as_view(), name='designer-applications-approve'),
    path('designer-applications/<int:pk>/decline/', DesignerApplicationDeclineView.as_view(), name='designer-applications-decline'),
    path('designer-applications/<int:pk>/download-zip/', DesignerApplicationDownloadZipView.as_view(), name='designer-applications-download-zip'),
    path('designer-applications/<int:pk>/resend-credentials/', DesignerApplicationResendEmailView.as_view(), name='designer-applications-resend-credentials'),
]
