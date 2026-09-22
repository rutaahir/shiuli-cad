import base64
import uuid
from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import PortfolioItem, PortfolioImage

class HybridImageField(serializers.Field):
    """
    Field that accepts:
    1. A URL string (e.g. 'https://...', '/unsplash-img/...')
    2. A Base64 Data URL (e.g. 'data:image/jpeg;base64,...')
    3. An uploaded file object
    """
    def to_representation(self, value):
        if not value:
            return ""
        val_str = str(value)
        if val_str.startswith('/unsplash-img/') or val_str.startswith('http://') or val_str.startswith('https://') or val_str.startswith('data:image'):
            return val_str
        if hasattr(value, 'url'):
            try:
                url = value.url
                if '/media/unsplash-img/' in url:
                    return '/unsplash-img/' + url.split('/media/unsplash-img/')[1]
                if '/media/http://' in url or '/media/https://' in url:
                    return url.replace('/media/http://', 'http://').replace('/media/https://', 'https://')
                return url
            except Exception:
                return val_str
        return val_str

    def to_internal_value(self, data):
        if not data:
            return None
        if isinstance(data, str):
            if data.startswith('data:image'):
                try:
                    format_str, imgstr = data.split(';base64,')
                    ext = format_str.split('/')[-1]
                    file_name = f"{uuid.uuid4()}.{ext}"
                    return ContentFile(base64.b64decode(imgstr), name=file_name)
                except Exception:
                    raise serializers.ValidationError("Invalid base64 image data.")
            return data
        return data


class PortfolioImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioImage
        fields = ['id', 'image', 'caption', 'display_order']


class PortfolioItemSerializer(serializers.ModelSerializer):
    gallery_images = PortfolioImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    primary_image = HybridImageField(required=False, allow_null=True)
    sketch_image = HybridImageField(required=False, allow_null=True)
    image = serializers.SerializerMethodField()
    sketchImage = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioItem
        fields = [
            'id', 'title', 'category', 'category_name', 'category_slug',
            'is_ai_project', 'is_custom_project', 'primary_image', 'primary_image_url',
            'sketch_image', 'sketch_image_url', 'image', 'sketchImage', 'specs', 'tags',
            'gallery_images', 'description', 'completed_date', 'is_featured',
            'is_published', 'display_order', 'source_order', 'created_at'
        ]

    def get_image(self, obj):
        if obj.primary_image:
            return str(obj.primary_image)
        return obj.primary_image_url or ''

    def get_sketchImage(self, obj):
        if obj.sketch_image:
            return str(obj.sketch_image)
        return obj.sketch_image_url or ''

