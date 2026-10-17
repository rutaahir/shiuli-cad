from rest_framework import serializers
from .models import ModificationType, FileEditRequest, FileEditNegotiationMessage

class ModificationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModificationType
        fields = ['id', 'key', 'label', 'description', 'base_price', 'icon', 'is_active', 'display_order']


class FileEditNegotiationMessageSerializer(serializers.ModelSerializer):
    sender = serializers.CharField(source='sender_type', read_only=True)
    price_offer = serializers.DecimalField(source='offered_price', max_digits=10, decimal_places=2, read_only=True)
    sender_name = serializers.SerializerMethodField()
    offered_price_usd = serializers.SerializerMethodField()
    offered_price_inr = serializers.SerializerMethodField()

    class Meta:
        model = FileEditNegotiationMessage
        fields = [
            'id', 'request', 'sender_type', 'sender', 'message',
            'offered_price', 'price_offer', 'currency',
            'offered_price_usd', 'offered_price_inr',
            'sender_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_sender_name(self, obj):
        if obj.sender_type == FileEditNegotiationMessage.SenderType.ADMIN:
            return "Studio SuperAdmin"
        return getattr(obj.request, 'contact_name', None) or (obj.request.client.username if obj.request.client else "Customer")

    def get_offered_price_usd(self, obj):
        if obj.offered_price is None:
            return None
        val = float(obj.offered_price)
        if getattr(obj, 'currency', 'USD') == 'INR':
            return round(val / 86.85, 2)
        return round(val, 2)

    def get_offered_price_inr(self, obj):
        if obj.offered_price is None:
            return None
        val = float(obj.offered_price)
        if getattr(obj, 'currency', 'USD') == 'INR':
            return int(round(val))
        return int(round(val * 86.85))


class FileEditRequestSerializer(serializers.ModelSerializer):
    modification_type_labels = serializers.SerializerMethodField()
    client_name = serializers.CharField(source='client.username', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    messages = FileEditNegotiationMessageSerializer(many=True, read_only=True)
    download_url = serializers.SerializerMethodField()

    quoted_price_usd = serializers.SerializerMethodField()
    quoted_price_inr = serializers.SerializerMethodField()
    agreed_price_usd = serializers.SerializerMethodField()
    agreed_price_inr = serializers.SerializerMethodField()
    estimated_price_shown_usd = serializers.SerializerMethodField()
    estimated_price_shown_inr = serializers.SerializerMethodField()
    converted_order_details = serializers.SerializerMethodField()

    class Meta:
        model = FileEditRequest
        fields = [
            'id', 'client', 'client_name', 'client_email', 'contact_name', 'contact_email', 'contact_phone',
            'original_file', 'original_file_name', 'original_file_format', 'file_size_bytes',
            'storage_provider', 'drive_file_id', 'drive_web_view_link',
            'modification_types', 'modification_type_labels',
            'target_weight_grams', 'target_stone_size', 'description',
            'reference_image', 'voice_note', 'status',
            'submission_intent', 'currency',
            'estimated_price_shown', 'estimated_price_shown_usd', 'estimated_price_shown_inr',
            'quoted_price', 'quoted_price_usd', 'quoted_price_inr',
            'agreed_price', 'agreed_price_usd', 'agreed_price_inr',
            'admin_notes', 'rejection_reason',
            'converted_order', 'converted_order_details', 'messages', 'download_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['client', 'converted_order', 'created_at', 'updated_at']

    def _to_usd_inr(self, val, currency):
        if val is None:
            return None, None
        f_val = float(val)
        if currency == 'INR':
            return round(f_val / 86.85, 2), int(round(f_val))
        return round(f_val, 2), int(round(f_val * 86.85))

    def get_quoted_price_usd(self, obj):
        return self._to_usd_inr(obj.quoted_price, obj.currency)[0]

    def get_quoted_price_inr(self, obj):
        return self._to_usd_inr(obj.quoted_price, obj.currency)[1]

    def get_agreed_price_usd(self, obj):
        return self._to_usd_inr(obj.agreed_price, obj.currency)[0]

    def get_agreed_price_inr(self, obj):
        return self._to_usd_inr(obj.agreed_price, obj.currency)[1]

    def get_estimated_price_shown_usd(self, obj):
        return self._to_usd_inr(obj.estimated_price_shown, obj.currency)[0]

    def get_estimated_price_shown_inr(self, obj):
        return self._to_usd_inr(obj.estimated_price_shown, obj.currency)[1]

    def get_modification_type_labels(self, obj):
        return [m.label for m in obj.modification_types.all()]

    def get_download_url(self, obj):
        request = self.context.get('request')
        if obj.storage_provider == 'gdrive' and obj.drive_file_id:
            if request:
                return request.build_absolute_uri(f"/api/file-edits/requests/{obj.id}/download/")
            return f"/api/file-edits/requests/{obj.id}/download/"
        elif obj.original_file:
            if request:
                return request.build_absolute_uri(obj.original_file.url)
            return obj.original_file.url
        return None

    def get_converted_order_details(self, obj):
        order = getattr(obj, 'converted_order', None) or getattr(obj, 'cad_order', None)
        if not order:
            from apps.custom_orders.models import Order
            order = Order.objects.filter(file_edit_request=obj).first()
        if not order:
            return None
        request = self.context.get('request')
        preview_url = None
        if order.preview_image:
            try:
                preview_url = request.build_absolute_uri(order.preview_image.url) if request else order.preview_image.url
            except Exception:
                preview_url = None

        stages = order.payment_stages.all()
        is_fully_paid = stages.exists() and all(s.status == 'paid' for s in stages)

        from apps.custom_orders.serializers import OrderDeliverableSerializer, OrderMilestoneSerializer, OrderPaymentStageSerializer
        return {
            'id': order.id,
            'order_type': order.order_type,
            'current_version': order.current_version,
            'status': order.status,
            'deadline_hours': order.deadline_hours,
            'due_at': order.due_at,
            'is_overdue': order.is_overdue,
            'assigned_staff': {
                'id': order.assigned_staff.id,
                'username': order.assigned_staff.username,
                'name': order.assigned_staff.get_full_name() or order.assigned_staff.username
            } if order.assigned_staff else None,
            'total_price': float(order.total_price) if order.total_price is not None else None,
            'preview_image': preview_url,
            'quality_approved': order.quality_approved,
            'download_enabled_by_admin': order.download_enabled_by_admin,
            'can_download': bool(is_fully_paid and order.download_enabled_by_admin),
            'download_count': order.download_count,
            'is_fully_paid': is_fully_paid,
            'payment_stages': OrderPaymentStageSerializer(stages, many=True).data,
            'deliverables': OrderDeliverableSerializer(order.deliverables.all(), many=True, context={'request': request}).data,
            'milestones': OrderMilestoneSerializer(order.milestones.all(), many=True).data,
        }



