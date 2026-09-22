from rest_framework import generics, permissions
from .models import BlogPost, BlogTag
from .serializers import BlogPostListSerializer, BlogPostDetailSerializer, BlogTagSerializer

class BlogPostListView(generics.ListAPIView):
    serializer_class = BlogPostListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = BlogPost.objects.filter(is_published=True)
        tag = self.request.query_params.get('tag')
        category = self.request.query_params.get('category')
        if tag:
            queryset = queryset.filter(tags__slug=tag)
        if category:
            queryset = queryset.filter(category__iexact=category)
        return queryset


class BlogPostDetailView(generics.RetrieveAPIView):
    queryset = BlogPost.objects.filter(is_published=True)
    serializer_class = BlogPostDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_object(self):
        obj = super().get_object()
        # Increment views count
        BlogPost.objects.filter(id=obj.id).update(views_count=obj.views_count + 1)
        return obj


class BlogTagListView(generics.ListAPIView):
    queryset = BlogTag.objects.all()
    serializer_class = BlogTagSerializer
    permission_classes = [permissions.AllowAny]
