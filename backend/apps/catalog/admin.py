from django.contrib import admin
from .models import Category, DesignStyle, Product, ProductImage, ProductFile

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1

class ProductFileInline(admin.TabularInline):
    model = ProductFile
    extra = 1

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'display_order']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']

@admin.register(DesignStyle)
class DesignStyleAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'category', 'uploaded_by', 'price', 'status', 'is_bestseller', 'is_new', 'created_at']
    list_filter = ['status', 'category', 'is_bestseller', 'is_new']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [ProductImageInline, ProductFileInline]
    actions = ['approve_products', 'reject_products']

    @admin.action(description="Approve selected products")
    def approve_products(self, request, queryset):
        queryset.update(status=Product.Status.APPROVED)

    @admin.action(description="Reject selected products")
    def reject_products(self, request, queryset):
        queryset.update(status=Product.Status.REJECTED)
