from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from apps.catalog.serializers import ProductListSerializer, CategorySerializer
from .models import (
    CustomRequest,
    NegotiationMessage,
    Order,
    OrderMilestone,
    OrderDeliverable,
    AestheticStyle,
    MetalAlloy,
    GemstoneOption,
    PricingRule,
    CustomRequestGemstone,
    CustomRequestImage,
    OptionGroup,
    OptionValue,
    CustomRequestSelection,
    CustomRequestStone
)


class OptionValueSerializer(serializers.ModelSerializer):
    group_key = serializers.CharField(source='group.key', read_only=True)
    key = serializers.SerializerMethodField()

    class Meta:
        model = OptionValue
        fields = [
            'id', 'group', 'group_key', 'key', 'label', 'price_modifier', 'modifier_type',
            'swatch_color', 'icon', 'is_active', 'display_order'
        ]

    def get_key(self, obj):
        return obj.label.lower().replace(' ', '_')


class OptionGroupSerializer(serializers.ModelSerializer):
    values = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()

    class Meta:
        model = OptionGroup
        fields = [
            'id', 'key', 'label', 'is_required', 'allows_other',
            'display_order', 'applies_to_categories', 'values', 'options'
        ]

    def get_values(self, obj):
        active_values = obj.values.filter(is_active=True).order_by('display_order', 'id')
        return OptionValueSerializer(active_values, many=True).data

    def get_options(self, obj):
        return self.get_values(obj)


class CustomRequestSelectionSerializer(serializers.ModelSerializer):
    group_key = serializers.CharField(source='group.key', read_only=True)
    group_label = serializers.CharField(source='group.label', read_only=True)
    value_label = serializers.CharField(source='value.label', read_only=True)

    class Meta:
        model = CustomRequestSelection
        fields = ['id', 'group', 'group_key', 'group_label', 'value', 'value_label', 'other_text']


class CustomRequestStoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomRequestStone
        fields = [
            'id', 'stone_type', 'quantity', 'size_value', 'size_unit',
            'color', 'clarity', 'is_center_stone'
        ]


class AestheticStyleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AestheticStyle
        fields = ['id', 'name', 'price_addon', 'display_order']


class MetalAlloySerializer(serializers.ModelSerializer):
    class Meta:
        model = MetalAlloy
        fields = ['id', 'name', 'swatch_color', 'price_multiplier', 'display_order']


class GemstoneOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GemstoneOption
        fields = ['id', 'stone_type', 'cut_type', 'price_per_unit']


class PricingRuleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = PricingRule
        fields = ['id', 'category', 'category_name', 'base_price']


class CustomRequestGemstoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomRequestGemstone
        fields = ['id', 'stone_type', 'cut_type', 'carat_size', 'quantity']


class CustomRequestImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomRequestImage
        fields = ['id', 'image', 'image_url', 'is_draft', 'uploaded_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None


class NegotiationMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = NegotiationMessage
        fields = ['id', 'request', 'sender_type', 'message', 'offered_price', 'created_at']
        read_only_fields = ['id', 'sender_type', 'created_at']


from apps.payments.serializers import OrderPaymentStageSerializer


class CustomRequestSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    aesthetic_style_name = serializers.CharField(source='aesthetic_style.name', read_only=True)
    metal_alloy_name = serializers.CharField(source='metal_alloy.name', read_only=True)
    metal_swatch_color = serializers.CharField(source='metal_alloy.swatch_color', read_only=True)
    delivery_speed_name = serializers.CharField(source='delivery_speed.label', read_only=True)

    gemstones = CustomRequestGemstoneSerializer(many=True, read_only=True)
    stones = CustomRequestStoneSerializer(many=True, read_only=True)
    selections = CustomRequestSelectionSerializer(many=True, read_only=True)
    sketches = CustomRequestImageSerializer(many=True, read_only=True)
    messages = NegotiationMessageSerializer(many=True, read_only=True)

    # Input fields for creation
    draft_sketch_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    stones_data = serializers.JSONField(write_only=True, required=False)
    selections_data = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = CustomRequest
        fields = [
            'id', 'client', 'client_name', 'category', 'category_name',
            'aesthetic_style', 'aesthetic_style_name', 'metal_alloy',
            'metal_alloy_name', 'metal_swatch_color', 'gemstone_preference_open',
            'ring_size', 'ring_size_standard', 'target_weight_grams', 'budget_range',
            'needed_by_date', 'is_metal_only', 'engraving_text', 'engraving_font',
            'engraving_placement', 'has_logo', 'logo_file', 'special_instructions',
            'delivery_speed', 'delivery_speed_name', 'submission_intent',
            'estimated_price_shown', 'timeline', 'reference_image', 'description',
            'contact_name', 'contact_phone', 'status', 'agreed_price',
            'gemstones', 'stones', 'selections', 'sketches', 'messages',
            'draft_sketch_ids', 'stones_data', 'selections_data', 'created_at'
        ]
        read_only_fields = ['id', 'client', 'status', 'created_at']

    def get_client_name(self, obj):
        if obj.client:
            return obj.client.username
        return obj.contact_name or 'Guest'

    def create(self, validated_data):
        draft_sketch_ids = validated_data.pop('draft_sketch_ids', [])
        stones_data = validated_data.pop('stones_data', [])
        selections_data = validated_data.pop('selections_data', [])

        custom_req = CustomRequest.objects.create(**validated_data)

        if draft_sketch_ids and isinstance(draft_sketch_ids, list):
            CustomRequestImage.objects.filter(id__in=draft_sketch_ids, is_draft=True).update(
                request=custom_req,
                is_draft=False
            )

        if stones_data and isinstance(stones_data, list):
            for s in stones_data:
                if isinstance(s, dict):
                    CustomRequestStone.objects.create(
                        request=custom_req,
                        stone_type=s.get('stone_type', 'Diamond'),
                        quantity=int(s.get('quantity', 1)),
                        size_value=str(s.get('size_value', '')),
                        size_unit=s.get('size_unit', 'carat'),
                        color=str(s.get('color', '')),
                        clarity=str(s.get('clarity', '')),
                        is_center_stone=bool(s.get('is_center_stone', False))
                    )

        if selections_data and isinstance(selections_data, list):
            for sel in selections_data:
                if isinstance(sel, dict):
                    group_id = sel.get('group') or sel.get('group_id')
                    value_id = sel.get('value') or sel.get('value_id')
                    other_text = sel.get('other_text', '')
                    if group_id:
                        group_obj = OptionGroup.objects.filter(id=group_id).first() or OptionGroup.objects.filter(key=group_id).first()
                        if group_obj:
                            val_obj = OptionValue.objects.filter(id=value_id).first() if value_id else None
                            CustomRequestSelection.objects.create(
                                request=custom_req,
                                group=group_obj,
                                value=val_obj,
                                other_text=str(other_text or '')
                            )

        return custom_req


# STAFF-SAFE CUSTOM REQUEST SERIALIZER (Strictly hides agreed_price, estimated_price, and client PII)
class StaffCustomRequestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    aesthetic_style_name = serializers.CharField(source='aesthetic_style.name', read_only=True)
    metal_alloy_name = serializers.CharField(source='metal_alloy.name', read_only=True)
    metal_swatch_color = serializers.CharField(source='metal_alloy.swatch_color', read_only=True)
    gemstones = CustomRequestGemstoneSerializer(many=True, read_only=True)
    sketches = CustomRequestImageSerializer(many=True, read_only=True)
    client_display_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomRequest
        fields = [
            'id', 'category_name', 'aesthetic_style_name', 'metal_alloy_name',
            'metal_swatch_color', 'gemstone_preference_open', 'timeline',
            'description', 'client_display_name', 'gemstones', 'sketches', 'created_at'
        ]

    def get_client_display_name(self, obj):
        return "Valued Client"


class OrderMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderMilestone
        fields = ['id', 'stage', 'reached_at']
        read_only_fields = ['id', 'reached_at']


class OrderDeliverableSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = OrderDeliverable
        fields = ['id', 'file_type', 'file', 'file_url', 'filename', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'file_url', 'filename', 'file_size', 'uploaded_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None

    def get_filename(self, obj):
        if obj.file:
            import os
            return os.path.basename(obj.file.name)
        return ""

    def get_file_size(self, obj):
        if obj.file:
            try:
                size_bytes = obj.file.size
                if size_bytes < 1024:
                    return f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
                    return f"{round(size_bytes / 1024, 1)} KB"
                else:
                    return f"{round(size_bytes / (1024 * 1024), 1)} MB"
            except Exception:
                pass
        return ""


# STAFF-SAFE ORDER SERIALIZER (Stage 6 Critical Rule: ABSOLUTELY NO PRICE FIELDS)
class StaffOrderSerializer(serializers.ModelSerializer):
    custom_request = StaffCustomRequestSerializer(read_only=True)
    deliverables = OrderDeliverableSerializer(many=True, read_only=True)
    milestones = OrderMilestoneSerializer(many=True, read_only=True)
    preview_image = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_type', 'custom_request', 'status',
            'deadline_hours', 'due_at', 'is_overdue', 'assigned_at',
            'unassigned_since', 'preview_image', 'admin_review_notes',
            'milestones', 'deliverables', 'created_at'
        ]

    def get_preview_image(self, obj):
        request = self.context.get('request')
        if obj.preview_image:
            return request.build_absolute_uri(obj.preview_image.url) if request else obj.preview_image.url
        return None


# FULL ADMIN ORDER SERIALIZER
class AdminOrderSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    assigned_staff = UserSerializer(read_only=True)
    product = ProductListSerializer(read_only=True)
    custom_request = CustomRequestSerializer(read_only=True)
    milestones = OrderMilestoneSerializer(many=True, read_only=True)
    payment_stages = OrderPaymentStageSerializer(many=True, read_only=True)
    deliverables = OrderDeliverableSerializer(many=True, read_only=True)
    preview_image = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'client', 'order_type', 'product', 'custom_request',
            'assigned_staff', 'total_price', 'advance_amount', 'advance_paid',
            'balance_paid', 'status', 'deadline_hours', 'due_at', 'is_overdue',
            'warning_50_sent', 'warning_80_sent', 'preview_image',
            'admin_review_notes', 'quality_approved', 'settlement_status',
            'unassigned_since', 'assigned_at', 'handed_over_at',
            'milestones', 'payment_stages', 'deliverables', 'created_at'
        ]

    def get_preview_image(self, obj):
        request = self.context.get('request')
        if obj.preview_image:
            return request.build_absolute_uri(obj.preview_image.url) if request else obj.preview_image.url
        return None


# CLIENT ORDER SERIALIZER (Shows preview image ONLY when status="preview_ready" or higher)
class ClientOrderSerializer(serializers.ModelSerializer):
    assigned_staff = UserSerializer(read_only=True)
    custom_request = CustomRequestSerializer(read_only=True)
    payment_stages = OrderPaymentStageSerializer(many=True, read_only=True)
    preview_image = serializers.SerializerMethodField()
    is_fully_paid = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_type', 'custom_request', 'assigned_staff',
            'total_price', 'status', 'deadline_hours', 'due_at',
            'is_overdue', 'payment_stages', 'preview_image',
            'quality_approved', 'is_fully_paid', 'created_at'
        ]

    def get_preview_image(self, obj):
        # Stage 10: Preview image becomes visible ONLY after Admin Quality Approval (status="preview_ready" or higher)
        if obj.status in [Order.Status.PREVIEW_READY, Order.Status.PENDING_FINAL_PAYMENT, Order.Status.COMPLETED] or obj.quality_approved:
            request = self.context.get('request')
            if obj.preview_image:
                return request.build_absolute_uri(obj.preview_image.url) if request else obj.preview_image.url
        return None

    def get_is_fully_paid(self, obj):
        stages = obj.payment_stages.all()
        if not stages.exists():
            return False
        return all(s.status == 'paid' for s in stages)


# DEFAULT ORDER SERIALIZER (For fallback/compatibility)
OrderSerializer = AdminOrderSerializer
