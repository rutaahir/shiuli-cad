from django.contrib import admin
from .models import Payment, Settlement, Purchase, DownloadOTP, DownloadToken

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'payment_type', 'amount', 'status', 'gateway_transaction_id', 'created_at']
    list_filter = ['status', 'payment_type']
    search_fields = ['order__id', 'gateway_transaction_id']

@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ['id', 'staff', 'order', 'amount', 'status', 'processed_at']
    list_filter = ['status']
    search_fields = ['staff__username', 'order__id']

@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ['id', 'buyer', 'product', 'license_type', 'price_paid', 'status', 'redelivery_count', 'purchased_at']
    list_filter = ['license_type', 'status']
    search_fields = ['buyer__username', 'buyer__email', 'product__title', 'payment_transaction_id']
    readonly_fields = ['purchased_at', 'last_otp_generated_at']

@admin.register(DownloadOTP)
class DownloadOTPAdmin(admin.ModelAdmin):
    list_display = ['id', 'purchase', 'is_verified', 'attempts', 'expires_at', 'created_at']
    list_filter = ['is_verified']
    search_fields = ['purchase__id', 'purchase__buyer__email']

@admin.register(DownloadToken)
class DownloadTokenAdmin(admin.ModelAdmin):
    list_display = ['id', 'purchase', 'locked_email', 'is_used', 'used_at', 'used_from_ip', 'expires_at', 'created_at']
    list_filter = ['is_used']
    search_fields = ['token', 'locked_email', 'purchase__id', 'used_from_ip']
    readonly_fields = ['token', 'used_at', 'used_from_ip', 'created_at']

