from django.db import models
from apps.catalog.models import Category

class ServicePage(models.Model):
    SECTION_CHOICES = [
        ("cad_service", "CAD Service"),
        ("about", "About Us Section"),
    ]

    CTA_TARGET_CHOICES = [
        ("custom_design", "Custom Design Wizard"),
        ("collections", "Browse CAD Files"),
        ("file_editing", "File Editing Request"),
        ("contact", "Contact Form"),
    ]

    slug = models.SlugField(max_length=100, unique=True)
    section = models.CharField(max_length=30, choices=SECTION_CHOICES, default="cad_service")
    title = models.CharField(max_length=150)
    subtitle = models.CharField(max_length=250, blank=True)
    hero_image = models.ImageField(upload_to="service_pages/hero/", null=True, blank=True)
    intro_text = models.TextField()
    starting_price_usd = models.CharField(max_length=50, blank=True, default="$25 - $45")
    starting_price_inr = models.CharField(max_length=50, blank=True, default="₹2,000 - ₹3,500")
    display_order = models.PositiveIntegerField(default=0)
    linked_category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL)
    cta_label = models.CharField(max_length=50, default="Start Your Design")
    cta_target = models.CharField(max_length=30, choices=CTA_TARGET_CHOICES, default="custom_design")
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return f"[{self.get_section_display()}] {self.title}"


class ServicePageFeature(models.Model):
    page = models.ForeignKey(ServicePage, related_name="features", on_delete=models.CASCADE)
    icon = models.CharField(max_length=50, blank=True)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return f"{self.page.title} - Feature: {self.title}"


class ServicePageGalleryImage(models.Model):
    page = models.ForeignKey(ServicePage, related_name="gallery", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="service_pages/gallery/")
    caption = models.CharField(max_length=150, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return f"{self.page.title} - Gallery Image #{self.id}"


class Testimonial(models.Model):
    name = models.CharField(max_length=120)
    role_or_company = models.CharField(max_length=150, blank=True)
    quote = models.TextField()
    avatar = models.ImageField(upload_to="testimonials/", null=True, blank=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    rating = models.PositiveSmallIntegerField(default=5)
    project_type = models.CharField(max_length=150, blank=True)
    is_featured = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-created_at']

    def __str__(self):
        return f"{self.name} ({self.rating}★)"


class FAQ(models.Model):
    question = models.CharField(max_length=300)
    answer = models.TextField()
    category = models.CharField(max_length=100, default="General")
    display_order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return self.question

