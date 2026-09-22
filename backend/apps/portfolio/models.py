from django.db import models
from apps.catalog.models import Category

class PortfolioImage(models.Model):
    image = models.ImageField(upload_to="portfolio/")
    caption = models.CharField(max_length=150, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return f"Portfolio Image #{self.id}"


class PortfolioItem(models.Model):
    title = models.CharField(max_length=150)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL)
    category_slug = models.CharField(max_length=100, blank=True)
    is_ai_project = models.BooleanField(default=False)
    is_custom_project = models.BooleanField(default=False)
    primary_image = models.ImageField(upload_to="portfolio/primary/", null=True, blank=True)
    primary_image_url = models.URLField(max_length=500, blank=True, null=True)
    sketch_image = models.ImageField(upload_to="portfolio/sketches/", null=True, blank=True)
    sketch_image_url = models.URLField(max_length=500, blank=True, null=True)
    specs = models.JSONField(default=dict, blank=True)
    tags = models.JSONField(default=list, blank=True)
    gallery_images = models.ManyToManyField(PortfolioImage, blank=True)
    description = models.TextField(blank=True)
    completed_date = models.DateField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    source_order = models.ForeignKey('custom_orders.Order', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-created_at']

    def __str__(self):
        return self.title
