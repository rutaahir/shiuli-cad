from django.contrib import admin
from .models import ServicePage, ServicePageFeature, ServicePageGalleryImage, Testimonial, FAQ

class ServicePageFeatureInline(admin.TabularInline):
    model = ServicePageFeature
    extra = 1


class ServicePageGalleryImageInline(admin.TabularInline):
    model = ServicePageGalleryImage
    extra = 1


@admin.register(ServicePage)
class ServicePageAdmin(admin.ModelAdmin):
    list_display = ['title', 'section', 'slug', 'starting_price_usd', 'starting_price_inr', 'is_published', 'display_order']
    list_filter = ['section', 'is_published']
    search_fields = ['title', 'subtitle', 'intro_text']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [ServicePageFeatureInline, ServicePageGalleryImageInline]


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ['name', 'role_or_company', 'rating', 'project_type', 'is_featured', 'display_order', 'created_at']
    list_filter = ['rating', 'is_featured']
    search_fields = ['name', 'role_or_company', 'quote']


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['question', 'category', 'display_order', 'is_published', 'created_at']
    list_filter = ['category', 'is_published']
    search_fields = ['question', 'answer']
