from django.contrib import admin
from .models import BlogPost, BlogTag

@admin.register(BlogTag)
class BlogTagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'author_name', 'read_time', 'is_published', 'views_count', 'created_at']
    list_filter = ['is_published', 'category', 'tags']
    search_fields = ['title', 'excerpt', 'author_name']
    prepopulated_fields = {'slug': ('title',)}
