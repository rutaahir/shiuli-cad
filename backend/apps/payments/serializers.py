from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import Payment, Settlement, PaymentPlanTemplate, PaymentPlanTemplateStage, OrderPaymentStage

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
    class Meta:
        model = OrderPaymentStage
        fields = ['id', 'order', 'label', 'percentage', 'amount', 'order_index', 'trigger_type', 'status', 'paid_at']
        read_only_fields = ['id', 'order', 'amount', 'paid_at']


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
            if obj.order.product:
                return obj.order.product.title
            elif obj.order.custom_request and obj.order.custom_request.category:
                return f"Custom {obj.order.custom_request.category.name}"
        return f"Bespoke Custom CAD Design #{obj.order_id or obj.id}"

    def get_created_at(self, obj):
        if obj.order and obj.order.created_at:
            return obj.order.created_at.strftime('%b %d, %Y')
        return None

