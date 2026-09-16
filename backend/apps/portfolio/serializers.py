from rest_framework import serializers
from .models import PortfolioItem, PortfolioImage

class PortfolioImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioImage
        fields = ['id', 'image', 'caption', 'display_order']


class PortfolioItemSerializer(serializers.ModelSerializer):
    gallery_images = PortfolioImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = PortfolioItem
        fields = [
            'id', 'title', 'category', 'category_name', 'category_slug',
            'is_ai_project', 'is_custom_project', 'primary_image',
            'gallery_images', 'description', 'completed_date', 'is_featured',
            'is_published', 'display_order', 'source_order', 'created_at'
        ]
