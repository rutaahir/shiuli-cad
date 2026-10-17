from django.db import models
from django.conf import settings

class ModificationType(models.Model):
    key = models.SlugField(max_length=100, unique=True)
    label = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    icon = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return self.label


class FileEditRequest(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        QUOTED = "quoted", "Quoted"
        NEGOTIATING = "negotiating", "Negotiating"
        AGREED = "agreed", "Agreed"
        REJECTED = "rejected", "Rejected"

    class Intent(models.TextChoices):
        QUOTE_ONLY = "quote_only", "Request a Quote"
        PLACE_ORDER = "place_order", "Submit Modification Order"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="file_edit_requests")
    contact_name = models.CharField(max_length=100, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    original_file = models.FileField(upload_to="file_edits/originals/", null=True, blank=True)
    original_file_name = models.CharField(max_length=255, blank=True, default='')
    original_file_format = models.CharField(max_length=10)  # 3dm, stl, obj, step
    file_size_bytes = models.BigIntegerField(null=True, blank=True)
    storage_provider = models.CharField(max_length=20, default='local')  # 'local' or 'gdrive'
    drive_file_id = models.CharField(max_length=255, blank=True, default='')
    drive_web_view_link = models.URLField(max_length=1000, blank=True, default='')
    modification_types = models.ManyToManyField(ModificationType, related_name="edit_requests")
    target_weight_grams = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    target_stone_size = models.CharField(max_length=100, blank=True, default='')
    description = models.TextField()
    reference_image = models.ImageField(upload_to="file_edits/references/", null=True, blank=True)
    voice_note = models.FileField(upload_to="file_edits/voice_notes/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    submission_intent = models.CharField(max_length=20, choices=Intent.choices, default=Intent.QUOTE_ONLY)
    estimated_price_shown = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    quoted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    agreed_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default="USD", blank=True)
    admin_notes = models.TextField(blank=True, default='')
    rejection_reason = models.TextField(blank=True, default='')
    converted_order = models.OneToOneField('custom_orders.Order', null=True, blank=True, on_delete=models.SET_NULL, related_name="file_edit_source")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"FileEdit #{self.id} ({self.original_file_format}) by {self.client.username}"


class FileEditNegotiationMessage(models.Model):
    class SenderType(models.TextChoices):
        ADMIN = "admin", "Admin"
        CLIENT = "client", "Client"

    request = models.ForeignKey(FileEditRequest, related_name="messages", on_delete=models.CASCADE)
    sender_type = models.CharField(max_length=10, choices=SenderType.choices)
    message = models.TextField(blank=True)
    offered_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default="USD", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg #{self.id} on FileEdit #{self.request_id} by {self.sender_type}"

