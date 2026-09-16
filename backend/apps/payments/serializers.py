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
    order_id = serializers.IntegerField(source='order.id', read_only=True)

    class Meta:
        model = Settlement
        fields = ['id', 'staff', 'order', 'order_id', 'amount', 'status', 'processed_at']
        read_only_fields = ['id', 'staff', 'order', 'amount', 'processed_at']

