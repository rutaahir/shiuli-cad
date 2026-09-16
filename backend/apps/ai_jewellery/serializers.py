from rest_framework import serializers
from .models import AIConceptGeneration

class AIConceptGenerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIConceptGeneration
        fields = [
            'id', 'client', 'input_type', 'input_text', 'input_image',
            'generated_images', 'selected_concept_index', 'linked_custom_request', 'created_at'
        ]
        read_only_fields = ['client', 'created_at']
