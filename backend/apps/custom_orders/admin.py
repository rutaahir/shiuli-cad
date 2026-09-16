from django.contrib import admin
from .models import (
    CustomRequest, NegotiationMessage, Order, OrderMilestone, OrderDeliverable,
    OptionGroup, OptionValue, CustomRequestSelection, CustomRequestStone
)

class OptionValueInline(admin.TabularInline):
    model = OptionValue
    extra = 1

@admin.register(OptionGroup)
class OptionGroupAdmin(admin.ModelAdmin):
    list_display = ['id', 'key', 'label', 'is_required', 'allows_other', 'display_order']
    list_filter = ['is_required', 'allows_other']
    search_fields = ['key', 'label']
    inlines = [OptionValueInline]

@admin.register(OptionValue)
class OptionValueAdmin(admin.ModelAdmin):
    list_display = ['id', 'group', 'label', 'price_modifier', 'modifier_type', 'is_active', 'display_order']
    list_filter = ['group', 'modifier_type', 'is_active']
    search_fields = ['label', 'group__label']

@admin.register(CustomRequestSelection)
class CustomRequestSelectionAdmin(admin.ModelAdmin):
    list_display = ['id', 'request', 'group', 'value', 'other_text']

@admin.register(CustomRequestStone)
class CustomRequestStoneAdmin(admin.ModelAdmin):
    list_display = ['id', 'request', 'stone_type', 'quantity', 'size_value', 'size_unit', 'color', 'clarity', 'is_center_stone']

class NegotiationMessageInline(admin.TabularInline):
    model = NegotiationMessage
    extra = 1

class OrderMilestoneInline(admin.TabularInline):
    model = OrderMilestone
    extra = 1

class OrderDeliverableInline(admin.TabularInline):
    model = OrderDeliverable
    extra = 1

@admin.register(CustomRequest)
class CustomRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'contact_name', 'submission_intent', 'status', 'agreed_price', 'created_at']
    list_filter = ['submission_intent', 'status', 'category']
    search_fields = ['client__username', 'contact_name', 'description']
    inlines = [NegotiationMessageInline]

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'order_type', 'assigned_staff', 'total_price', 'advance_paid', 'balance_paid', 'status', 'created_at']
    list_filter = ['status', 'order_type', 'advance_paid', 'balance_paid']
    search_fields = ['client__username', 'assigned_staff__username']
    inlines = [OrderMilestoneInline, OrderDeliverableInline]

@admin.register(NegotiationMessage)
class NegotiationMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'request', 'sender_type', 'offered_price', 'created_at']

@admin.register(OrderMilestone)
class OrderMilestoneAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'stage', 'reached_at']

@admin.register(OrderDeliverable)
class OrderDeliverableAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'file_type', 'uploaded_at']
