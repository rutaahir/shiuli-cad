import base64
import uuid
from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import PortfolioItem, PortfolioImage
from apps.catalog.models import Category

class HybridImageField(serializers.Field):
    """
    Field that accepts:
    1. A URL string (e.g. 'https://...', '/unsplash-img/...', '/media/...')
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
                    if ';' in ext:
                        ext = ext.split(';')[0]
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
    primary_image_url = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)
    sketch_image = HybridImageField(required=False, allow_null=True)
    sketch_image_url = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)
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

    def _sync_category_and_images(self, validated_data, instance=None):
        # 1. Sync category from category_slug or category
        cat_slug = validated_data.get('category_slug')
        if cat_slug:
            cat = Category.objects.filter(slug__iexact=cat_slug).first()
            if cat:
                validated_data['category'] = cat
                validated_data['category_slug'] = cat.slug
        elif validated_data.get('category'):
            validated_data['category_slug'] = validated_data['category'].slug

        # 2. Sync primary_image and primary_image_url
        if 'primary_image' in validated_data:
            primary_val = validated_data.get('primary_image')
            if isinstance(primary_val, ContentFile):
                # File upload: store file in ImageField, clear URL field
                validated_data['primary_image_url'] = ''
                if instance:
                    instance.primary_image_url = ''
            elif isinstance(primary_val, str) and primary_val.strip():
                # Text URL or relative path: store in primary_image_url, clear ImageField
                str_val = primary_val.strip()
                validated_data['primary_image_url'] = str_val
                validated_data['primary_image'] = None
                if instance:
                    instance.primary_image_url = str_val
                    instance.primary_image = None
            elif not primary_val:
                validated_data['primary_image_url'] = ''
                validated_data['primary_image'] = None
                if instance:
                    instance.primary_image_url = ''
                    instance.primary_image = None
        elif 'primary_image_url' in validated_data:
            url_val = (validated_data.get('primary_image_url') or '').strip()
            if url_val:
                validated_data['primary_image'] = None
                if instance:
                    instance.primary_image = None

        # 3. Sync sketch_image and sketch_image_url
        if 'sketch_image' in validated_data:
            sketch_val = validated_data.get('sketch_image')
            if isinstance(sketch_val, ContentFile):
                validated_data['sketch_image_url'] = ''
                if instance:
                    instance.sketch_image_url = ''
            elif isinstance(sketch_val, str) and sketch_val.strip():
                str_val = sketch_val.strip()
                validated_data['sketch_image_url'] = str_val
                validated_data['sketch_image'] = None
                if instance:
                    instance.sketch_image_url = str_val
                    instance.sketch_image = None
            elif not sketch_val:
                validated_data['sketch_image_url'] = ''
                validated_data['sketch_image'] = None
                if instance:
                    instance.sketch_image_url = ''
                    instance.sketch_image = None
        elif 'sketch_image_url' in validated_data:
            url_val = (validated_data.get('sketch_image_url') or '').strip()
            if url_val:
                validated_data['sketch_image'] = None
                if instance:
                    instance.sketch_image = None

    def create(self, validated_data):
        self._sync_category_and_images(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._sync_category_and_images(validated_data, instance=instance)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Determine resolved primary image URL
        primary = ""
        if instance.primary_image:
            try:
                primary = instance.primary_image.url
            except Exception:
                primary = str(instance.primary_image)
        if not primary and instance.primary_image_url:
            primary = instance.primary_image_url

        ret['primary_image'] = primary
        ret['primary_image_url'] = primary
        ret['image'] = primary

        sketch = ""
        if instance.sketch_image:
            try:
                sketch = instance.sketch_image.url
            except Exception:
                sketch = str(instance.sketch_image)
        if not sketch and instance.sketch_image_url:
            sketch = instance.sketch_image_url

        ret['sketch_image'] = sketch
        ret['sketch_image_url'] = sketch
        ret['sketchImage'] = sketch

        return ret

    def get_image(self, obj):
        if obj.primary_image:
            try:
                return obj.primary_image.url
            except Exception:
                return str(obj.primary_image)
        return obj.primary_image_url or ''

    def get_sketchImage(self, obj):
        if obj.sketch_image:
            try:
                return obj.sketch_image.url
            except Exception:
                return str(obj.sketch_image)
        return obj.sketch_image_url or ''
