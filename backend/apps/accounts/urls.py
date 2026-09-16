from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    UserMeView,
    LogoutView,
    RequestPasswordResetEmailView,
    ChangePasswordView,
    RequestEmailChangeOTPView,
    VerifyEmailChangeOTPView,
    RequestPasswordResetOTPView,
    VerifyPasswordResetOTPView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', UserMeView.as_view(), name='auth-me'),
    path('reset-password-email/', RequestPasswordResetEmailView.as_view(), name='auth-reset-password-email'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    
    # OTP-gated profile security endpoints
    path('request-email-change-otp/', RequestEmailChangeOTPView.as_view(), name='auth-request-email-otp'),
    path('verify-email-change-otp/', VerifyEmailChangeOTPView.as_view(), name='auth-verify-email-otp'),
    path('request-password-reset-otp/', RequestPasswordResetOTPView.as_view(), name='auth-request-password-otp'),
    path('verify-password-reset-otp/', VerifyPasswordResetOTPView.as_view(), name='auth-verify-password-otp'),
]
