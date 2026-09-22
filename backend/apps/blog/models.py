from django.db import models
from django.utils.text import slugify

class BlogTag(models.Model):
    name = models.CharField(max_length=50)
    slug = models.SlugField(max_length=50, unique=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class BlogPost(models.Model):
    title = models.CharField(max_length=250)
    slug = models.SlugField(max_length=250, unique=True)
    category = models.CharField(max_length=100)
    excerpt = models.TextField()
    content = models.JSONField(default=list, help_text="List of paragraphs or text blocks")
    read_time = models.CharField(max_length=30, default="5 min read")
    date_published = models.DateField(null=True, blank=True)
    author_name = models.CharField(max_length=100, default="Harshil Shah")
    author_role = models.CharField(max_length=100, default="Head CAD Engineer")
    author_avatar = models.ImageField(upload_to="blog/authors/", null=True, blank=True)
    author_avatar_url = models.URLField(max_length=500, blank=True, null=True)
    cover_image = models.ImageField(upload_to="blog/covers/", null=True, blank=True)
    cover_image_url = models.URLField(max_length=500, blank=True, null=True)
    tags = models.ManyToManyField(BlogTag, blank=True)
    is_published = models.BooleanField(default=True)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_published', '-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)
