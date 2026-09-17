import base64
import uuid
from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import ServicePage, ServicePageFeature, ServicePageGalleryImage

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


class ServicePageFeatureSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ServicePageFeature
        fields = ['id', 'icon', 'title', 'description', 'display_order']


class ServicePageGalleryImageSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    image = HybridImageField(required=False, allow_null=True)

    class Meta:
        model = ServicePageGalleryImage
        fields = ['id', 'image', 'caption', 'display_order']


class ServicePageSerializer(serializers.ModelSerializer):
    hero_image = HybridImageField(required=False, allow_null=True)
    features = ServicePageFeatureSerializer(many=True, required=False)
    gallery = ServicePageGalleryImageSerializer(many=True, required=False)
    linked_category_name = serializers.CharField(source='linked_category.name', read_only=True)
    linked_category_slug = serializers.CharField(source='linked_category.slug', read_only=True)

    class Meta:
        model = ServicePage
        fields = [
            'id', 'slug', 'section', 'title', 'subtitle', 'hero_image',
            'intro_text', 'starting_price_usd', 'starting_price_inr',
            'display_order', 'linked_category', 'linked_category_name',
            'linked_category_slug', 'cta_label', 'cta_target', 'is_published',
            'features', 'gallery', 'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        features_data = validated_data.pop('features', [])
        gallery_data = validated_data.pop('gallery', [])

        page = ServicePage.objects.create(**validated_data)

        for f_idx, f_data in enumerate(features_data):
            ServicePageFeature.objects.create(
                page=page,
                icon=f_data.get('icon', ''),
                title=f_data.get('title', ''),
                description=f_data.get('description', ''),
                display_order=f_data.get('display_order', f_idx + 1)
            )

        for g_idx, g_data in enumerate(gallery_data):
            img_val = g_data.get('image', '')
            if img_val:
                ServicePageGalleryImage.objects.create(
                    page=page,
                    image=img_val,
                    caption=g_data.get('caption', ''),
                    display_order=g_data.get('display_order', g_idx + 1)
                )

        return page

    def update(self, instance, validated_data):
        features_data = validated_data.pop('features', None)
        gallery_data = validated_data.pop('gallery', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if features_data is not None:
            instance.features.all().delete()
            for f_idx, f_data in enumerate(features_data):
                ServicePageFeature.objects.create(
                    page=instance,
                    icon=f_data.get('icon', ''),
                    title=f_data.get('title', ''),
                    description=f_data.get('description', ''),
                    display_order=f_data.get('display_order', f_idx + 1)
                )

        if gallery_data is not None:
            instance.gallery.all().delete()
            for g_idx, g_data in enumerate(gallery_data):
                img_val = g_data.get('image', '')
                if img_val:
                    ServicePageGalleryImage.objects.create(
                        page=instance,
                        image=img_val,
                        caption=g_data.get('caption', ''),
                        display_order=g_data.get('display_order', g_idx + 1)
                    )

        return instance

