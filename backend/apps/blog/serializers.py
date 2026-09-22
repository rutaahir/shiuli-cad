from rest_framework import serializers
from .models import BlogTag, BlogPost

class BlogTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogTag
        fields = ['id', 'name', 'slug']


class BlogPostListSerializer(serializers.ModelSerializer):
    tags = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')
    cover_image_url = serializers.SerializerMethodField()
    coverImage = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    readTime = serializers.CharField(source='read_time', read_only=True)
    date = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'category', 'excerpt',
            'read_time', 'readTime', 'date_published', 'date', 'author',
            'cover_image_url', 'coverImage', 'image', 'tags', 'views_count'
        ]

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.cover_image.url) if request else obj.cover_image.url
        return obj.cover_image_url or ''

    def get_coverImage(self, obj):
        return self.get_cover_image_url(obj)

    def get_image(self, obj):
        return self.get_cover_image_url(obj)

    def get_date(self, obj):
        if obj.date_published:
            return obj.date_published.strftime('%b %d, %Y')
        return obj.created_at.strftime('%b %d, %Y')

    def get_author(self, obj):
        avatar = obj.author_avatar_url or ''
        if obj.author_avatar:
            request = self.context.get('request')
            avatar = request.build_absolute_uri(obj.author_avatar.url) if request else obj.author_avatar.url
        return {
            'name': obj.author_name,
            'role': obj.author_role,
            'avatar': avatar,
        }


class BlogPostDetailSerializer(serializers.ModelSerializer):
    tags = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')
    cover_image_url = serializers.SerializerMethodField()
    coverImage = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    readTime = serializers.CharField(source='read_time', read_only=True)
    date = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'category', 'excerpt', 'content',
            'read_time', 'readTime', 'date_published', 'date', 'author',
            'cover_image_url', 'coverImage', 'image', 'tags', 'views_count', 'created_at'
        ]

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.cover_image.url) if request else obj.cover_image.url
        return obj.cover_image_url or ''

    def get_coverImage(self, obj):
        return self.get_cover_image_url(obj)

    def get_image(self, obj):
        return self.get_cover_image_url(obj)

    def get_date(self, obj):
        if obj.date_published:
            return obj.date_published.strftime('%b %d, %Y')
        return obj.created_at.strftime('%b %d, %Y')

    def get_author(self, obj):
        avatar = obj.author_avatar_url or ''
        if obj.author_avatar:
            request = self.context.get('request')
            avatar = request.build_absolute_uri(obj.author_avatar.url) if request else obj.author_avatar.url
        return {
            'name': obj.author_name,
            'role': obj.author_role,
            'avatar': avatar,
        }
