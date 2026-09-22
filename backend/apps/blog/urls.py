from django.urls import path
from .views import BlogPostListView, BlogPostDetailView, BlogTagListView

urlpatterns = [
    path('posts/', BlogPostListView.as_view(), name='blog-post-list'),
    path('posts/<slug:slug>/', BlogPostDetailView.as_view(), name='blog-post-detail'),
    path('tags/', BlogTagListView.as_view(), name='blog-tag-list'),
]
