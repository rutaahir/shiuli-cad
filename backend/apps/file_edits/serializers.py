from rest_framework import serializers
from .models import ModificationType, FileEditRequest

class ModificationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModificationType
        fields = ['id', 'key', 'label', 'description', 'base_price', 'icon', 'is_active', 'display_order']


class FileEditRequestSerializer(serializers.ModelSerializer):
    modification_type_labels = serializers.SerializerMethodField()
    client_name = serializers.CharField(source='client.username', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)

    class Meta:
        model = FileEditRequest
        fields = [
            'id', 'client', 'client_name', 'client_email', 'contact_name', 'contact_email', 'contact_phone',
            'original_file', 'original_file_format', 'modification_types',
            'modification_type_labels', 'description', 'reference_image', 'status',
            'submission_intent', 'estimated_price_shown', 'agreed_price',
            'converted_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['client', 'converted_order', 'created_at', 'updated_at']

    def get_modification_type_labels(self, obj):
        return [m.label for m in obj.modification_types.all()]

