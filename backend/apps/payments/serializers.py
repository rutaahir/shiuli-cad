from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import (
    Payment, Settlement, PaymentPlanTemplate, PaymentPlanTemplateStage,
    OrderPaymentStage, ClientWallet, ClientCreditAccount, WalletCreditTransaction
)

class PaymentPlanTemplateStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentPlanTemplateStage
        fields = ['id', 'label', 'percentage', 'order_index', 'trigger_type']


class PaymentPlanTemplateSerializer(serializers.ModelSerializer):
    stages = PaymentPlanTemplateStageSerializer(many=True, read_only=True)

    class Meta:
        model = PaymentPlanTemplate
        fields = ['id', 'name', 'is_default', 'stages']


class OrderPaymentStageSerializer(serializers.ModelSerializer):
    amount_usd = serializers.SerializerMethodField()

    class Meta:
        model = OrderPaymentStage
        fields = ['id', 'order', 'label', 'percentage', 'amount', 'amount_usd', 'order_index', 'trigger_type', 'status', 'paid_at']
        read_only_fields = ['id', 'order', 'amount', 'paid_at']

    def get_amount_usd(self, obj):
        amt = float(obj.amount or 0)
        order = getattr(obj, 'order', None)
        if order and getattr(order, 'currency', 'INR') == 'USD':
            return round(amt, 2)
        return round(amt / 86.85, 2)


class PaymentSerializer(serializers.ModelSerializer):
    payment_stage_detail = OrderPaymentStageSerializer(source='payment_stage', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'order', 'payment_stage', 'payment_stage_detail', 'payment_type', 'amount', 'gateway_transaction_id', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']


class SettlementSerializer(serializers.ModelSerializer):
    staff = UserSerializer(read_only=True)
    staff_name = serializers.SerializerMethodField()
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_number = serializers.SerializerMethodField()
    design_title = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()

    class Meta:
        model = Settlement
        fields = [
            'id', 'staff', 'staff_name', 'order', 'order_id', 'order_number',
            'design_title', 'amount', 'amount_paid', 'balance_due', 'payment_method',
            'transaction_ref', 'notes', 'status', 'processed_at', 'created_at'
        ]
        read_only_fields = ['id', 'staff', 'order', 'amount', 'processed_at']

    def get_balance_due(self, obj):
        paid = float(obj.amount_paid or 0)
        total = float(obj.amount or 0)
        return max(0.0, round(total - paid, 2))

    def get_staff_name(self, obj):
        if obj.staff:
            return f"{obj.staff.first_name} {obj.staff.last_name}".strip() or obj.staff.username
        return "CAD Designer"

    def get_order_number(self, obj):
        return f"ORD-{obj.order_id}" if obj.order_id else f"SET-{obj.id}"

    def get_design_title(self, obj):
        if obj.order:
            if getattr(obj.order, 'file_edit_request', None):
                fe = obj.order.file_edit_request
                format_str = (fe.original_file_format or '3DM').upper()
                return fe.original_file_name or f"CAD Modification #{obj.order.id} ({format_str})"
            elif obj.order.product:
                return obj.order.product.title
            elif obj.order.custom_request and obj.order.custom_request.category:
                return f"Custom {obj.order.custom_request.category.name}"
        return f"Bespoke Custom CAD Design #{obj.order_id or obj.id}"

    def get_created_at(self, obj):
        if obj.order and obj.order.created_at:
            return obj.order.created_at.strftime('%b %d, %Y')
        return None


class ClientWalletSerializer(serializers.ModelSerializer):
    balance = serializers.FloatField(read_only=True)

    class Meta:
        model = ClientWallet
        fields = ['id', 'balance', 'currency', 'is_active', 'updated_at']
        read_only_fields = ['id', 'balance', 'updated_at']


class ClientCreditAccountSerializer(serializers.ModelSerializer):
    credit_limit = serializers.FloatField()
    used_credit = serializers.FloatField(read_only=True)
    available_credit = serializers.FloatField(read_only=True)
    utilization_percentage = serializers.SerializerMethodField()

    class Meta:
        model = ClientCreditAccount
        fields = [
            'id', 'credit_limit', 'used_credit', 'available_credit',
            'utilization_percentage', 'status', 'payment_terms_days',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'used_credit', 'available_credit', 'utilization_percentage', 'created_at', 'updated_at']

    def get_utilization_percentage(self, obj):
        if not obj.credit_limit or obj.credit_limit <= 0:
            return 0.0
        pct = (float(obj.used_credit) / float(obj.credit_limit)) * 100
        return round(pct, 1)


class WalletCreditTransactionSerializer(serializers.ModelSerializer):
    amount = serializers.FloatField(read_only=True)
    running_balance = serializers.FloatField(read_only=True)
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    reference_title = serializers.SerializerMethodField()
    screenshot_url = serializers.SerializerMethodField()

    class Meta:
        model = WalletCreditTransaction
        fields = [
            'id', 'account_type', 'transaction_type', 'amount',
            'running_balance', 'reference_order', 'reference_purchase',
            'reference_title', 'payment_method', 'transaction_ref',
            'payment_screenshot', 'screenshot_url', 'status', 'notes',
            'user_name', 'user_email', 'created_at', 'verified_at'
        ]
        read_only_fields = ['id', 'running_balance', 'created_at', 'verified_at']

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def get_user_email(self, obj):
        return obj.user.email

    def get_reference_title(self, obj):
        if obj.reference_purchase and obj.reference_purchase.product:
            return f"Catalog: {obj.reference_purchase.product.title}"
        if obj.reference_order:
            return f"Order #{obj.reference_order_id}"
        return ""

    def get_screenshot_url(self, obj):
        if obj.payment_screenshot:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.payment_screenshot.url)
            return obj.payment_screenshot.url
        return None


