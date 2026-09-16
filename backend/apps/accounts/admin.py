from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, StaffProfile

class StaffProfileInline(admin.StackedInline):
    model = StaffProfile
    can_delete = False
    verbose_name_plural = 'Staff Profile'

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = (StaffProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_active_staff', 'is_staff')
    list_filter = ('role', 'is_active_staff', 'is_staff', 'is_superuser')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number', 'profile_photo', 'is_active_staff')}),
    )

@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'max_concurrent_jobs', 'specialty_tags', 'rating_average', 'total_jobs_completed')
    search_fields = ('user__username', 'user__email', 'specialty_tags')
