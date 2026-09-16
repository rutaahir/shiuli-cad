from rest_framework import serializers
from .models import ServicePage, ServicePageFeature, ServicePageGalleryImage

class ServicePageFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicePageFeature
        fields = ['id', 'icon', 'title', 'description', 'display_order']


class ServicePageGalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicePageGalleryImage
        fields = ['id', 'image', 'caption', 'display_order']


class ServicePageSerializer(serializers.ModelSerializer):
    features = ServicePageFeatureSerializer(many=True, read_only=True)
    gallery = ServicePageGalleryImageSerializer(many=True, read_only=True)
    linked_category_name = serializers.CharField(source='linked_category.name', read_only=True)
    linked_category_slug = serializers.CharField(source='linked_category.slug', read_only=True)

    class Meta:
        model = ServicePage
        fields = [
            'id', 'slug', 'section', 'title', 'subtitle', 'hero_image',
            'intro_text', 'display_order', 'linked_category', 'linked_category_name',
            'linked_category_slug', 'cta_label', 'cta_target', 'is_published',
            'features', 'gallery', 'created_at', 'updated_at'
        ]
