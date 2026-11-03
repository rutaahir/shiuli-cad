from django.contrib import admin
from .models import PlatformSettings

@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ['default_max_job_limit', 'assignment_mode', 'bank_name', 'bank_account_number', 'bank_beneficiary_name', 'advance_payment_percentage']

    def has_add_permission(self, request):
        if PlatformSettings.objects.exists():
            return False
        return super().has_add_permission(request)
