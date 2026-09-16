from django.db import models
from django.conf import settings
from django.utils.text import slugify

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey('self', null=True, blank=True, related_name='subcategories', on_delete=models.CASCADE)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class DesignStyle(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


from django.core.files.storage import FileSystemStorage

protected_cad_storage = FileSystemStorage(
    location=getattr(settings, 'PROTECTED_MEDIA_ROOT', settings.BASE_DIR / 'protected_media')
)

class Product(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    style_tags = models.ManyToManyField(DesignStyle, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'staff'}
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    commercial_price_markup = models.DecimalField(max_digits=5, decimal_places=2, default=80.00, help_text="Percentage markup for Commercial Mass license (e.g. 80.00 for +80%)")
    atelier_license_desc = models.TextField(default="Workshop & bespoke client casts", help_text="Short description of Atelier License")
    commercial_license_desc = models.TextField(default="Global factory manufacturing & mass production", help_text="Short description of Commercial Mass License")
    description = models.TextField()
    metal_weight_grams = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    stone_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    rejection_reason = models.TextField(blank=True)
    is_bestseller = models.BooleanField(default=False)
    is_new = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} (₹{self.price})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exclude(id=self.id).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="products/images/")
    is_primary = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']


def product_file_upload_to(instance, filename):
    if instance.file_type in [ProductFile.FileType.FILE_3DM, ProductFile.FileType.STL]:
        return f"cad/{filename}"
    return f"products/previews/{filename}"


class ProductFile(models.Model):
    class FileType(models.TextChoices):
        FILE_3DM = "3dm", "3DM (Rhino)"
        STL = "stl", "STL"
        RENDER = "render", "Render Image"
        VIDEO = "video", "360 Video"

    product = models.ForeignKey(Product, related_name="files", on_delete=models.CASCADE)
    file_type = models.CharField(max_length=10, choices=FileType.choices)
    file = models.FileField(upload_to=product_file_upload_to, storage=protected_cad_storage)

    def __str__(self):
        return f"{self.product.title} - {self.get_file_type_display()}"

