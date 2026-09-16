from django.db import models
from django.conf import settings
from apps.catalog.models import Category, Product

class OptionGroup(models.Model):
    key = models.SlugField(max_length=100, unique=True)
    label = models.CharField(max_length=100)
    applies_to_categories = models.ManyToManyField(Category, blank=True)
    is_required = models.BooleanField(default=True)
    allows_other = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return self.label


class OptionValue(models.Model):
    class ModifierType(models.TextChoices):
        FLAT = "flat", "Flat Add-on"
        PERCENT = "percent", "Percentage Multiplier"

    group = models.ForeignKey(OptionGroup, related_name="values", on_delete=models.CASCADE)
    label = models.CharField(max_length=100)
    price_modifier = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    modifier_type = models.CharField(max_length=10, choices=ModifierType.choices, default=ModifierType.FLAT)
    swatch_color = models.CharField(max_length=7, blank=True)
    icon = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return f"{self.group.label} -> {self.label}"


class AestheticStyle(models.Model):
    name = models.CharField(max_length=100)
    price_addon = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return self.name


class MetalAlloy(models.Model):
    name = models.CharField(max_length=100)
    swatch_color = models.CharField(max_length=7, default="#D4AF37")  # hex e.g. #D4AF37
    price_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1.00)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return self.name


class GemstoneOption(models.Model):
    stone_type = models.CharField(max_length=50)   # Diamond, Sapphire, Emerald, Ruby, etc.
    cut_type = models.CharField(max_length=50)      # Round Brilliant, Oval Cut, Emerald Cut, etc.
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.stone_type} - {self.cut_type}"


class PricingRule(models.Model):
    category = models.OneToOneField(Category, on_delete=models.CASCADE, related_name="pricing_rule")
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=75.00)

    def __str__(self):
        return f"{self.category.name}: ₹{self.base_price}"


class CustomRequest(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        QUOTED = "quoted", "Price Quoted"
        NEGOTIATING = "negotiating", "Negotiating"
        AGREED = "agreed", "Agreed"
        REJECTED = "rejected", "Rejected"

    class Intent(models.TextChoices):
        QUOTE_ONLY = "quote_only", "Request a Quote"
        PLACE_ORDER = "place_order", "Submit Custom Order"

    class RingSizeStandard(models.TextChoices):
        US = "us", "US"
        UK = "uk", "UK"
        EU = "eu", "EU"
        IN = "in", "Indian"
        MM = "mm", "Diameter mm"

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="custom_requests"
    )
    reference_image = models.ImageField(upload_to="custom_requests/references/", null=True, blank=True)
    description = models.TextField(blank=True)
    contact_name = models.CharField(max_length=100)
    contact_phone = models.CharField(max_length=20)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    aesthetic_style = models.ForeignKey(AestheticStyle, null=True, blank=True, on_delete=models.SET_NULL)
    metal_alloy = models.ForeignKey(MetalAlloy, null=True, blank=True, on_delete=models.SET_NULL)
    gemstone_preference_open = models.BooleanField(default=False)
    
    # Specification extensions
    ring_size = models.CharField(max_length=20, blank=True)
    ring_size_standard = models.CharField(max_length=10, choices=RingSizeStandard.choices, blank=True)
    target_weight_grams = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    budget_range = models.CharField(max_length=50, blank=True)
    needed_by_date = models.DateField(null=True, blank=True)
    is_metal_only = models.BooleanField(default=False)
    engraving_text = models.CharField(max_length=200, blank=True)
    engraving_font = models.CharField(max_length=50, blank=True)
    engraving_placement = models.CharField(max_length=100, blank=True)
    has_logo = models.BooleanField(default=False)
    logo_file = models.FileField(upload_to="custom_requests/logos/", null=True, blank=True)
    special_instructions = models.TextField(blank=True)
    delivery_speed = models.ForeignKey(
        OptionValue, null=True, blank=True, related_name="delivery_requests", on_delete=models.SET_NULL
    )
    submission_intent = models.CharField(max_length=20, choices=Intent.choices, default=Intent.QUOTE_ONLY)

    estimated_price_shown = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    timeline = models.CharField(max_length=20, default="standard")
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.NEW)
    agreed_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Request #{self.id} by {self.client.username} ({self.submission_intent}/{self.status})"


class CustomRequestSelection(models.Model):
    request = models.ForeignKey(CustomRequest, related_name="selections", on_delete=models.CASCADE)
    group = models.ForeignKey(OptionGroup, on_delete=models.PROTECT)
    value = models.ForeignKey(OptionValue, null=True, blank=True, on_delete=models.PROTECT)
    other_text = models.CharField(max_length=200, blank=True)

    def __str__(self):
        val_str = self.value.label if self.value else (self.other_text or "None")
        return f"Req #{self.request_id} - {self.group.label}: {val_str}"


class CustomRequestStone(models.Model):
    class SizeUnit(models.TextChoices):
        CARAT = "carat", "Carat"
        MM = "mm", "mm"
        SIEVE = "sieve", "Sieve"

    request = models.ForeignKey(CustomRequest, related_name="stones", on_delete=models.CASCADE)
    stone_type = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=1)
    size_value = models.CharField(max_length=50, blank=True)
    size_unit = models.CharField(max_length=10, choices=SizeUnit.choices, default=SizeUnit.CARAT)
    color = models.CharField(max_length=50, blank=True)
    clarity = models.CharField(max_length=50, blank=True)
    is_center_stone = models.BooleanField(default=False)

    def __str__(self):
        return f"Req #{self.request_id} Stone: {self.quantity}x {self.stone_type} ({self.size_value} {self.size_unit})"


class CustomRequestGemstone(models.Model):
    request = models.ForeignKey(CustomRequest, related_name="gemstones", on_delete=models.CASCADE)
    stone_type = models.CharField(max_length=50)
    cut_type = models.CharField(max_length=50)
    carat_size = models.CharField(max_length=50, blank=True)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"Req #{self.request_id}: {self.quantity}x {self.stone_type} ({self.cut_type})"


class CustomRequestImage(models.Model):
    request = models.ForeignKey(CustomRequest, related_name="sketches", null=True, blank=True, on_delete=models.CASCADE)
    image = models.ImageField(upload_to="custom_requests/sketches/")
    is_draft = models.BooleanField(default=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sketch #{self.id} (Req #{self.request_id or 'Draft'})"


class NegotiationMessage(models.Model):
    class SenderType(models.TextChoices):
        ADMIN = "admin", "Admin"
        CLIENT = "client", "Client"

    request = models.ForeignKey(CustomRequest, related_name="messages", on_delete=models.CASCADE)
    sender_type = models.CharField(max_length=10, choices=SenderType.choices)
    message = models.TextField(blank=True)
    offered_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Msg #{self.id} on Req #{self.request_id} by {self.sender_type}"


class Order(models.Model):
    class Status(models.TextChoices):
        AWAITING_PAYMENT = "awaiting_payment", "Awaiting Booking Payment"
        IN_DESIGN = "in_design", "In Pool (Awaiting Designer)"
        WITH_DESIGNER = "with_designer", "With CAD Designer"
        PENDING_REVIEW = "pending_review", "Pending Admin Quality Review"
        PREVIEW_READY = "preview_ready", "Design Preview Ready for Client"
        PENDING_FINAL_PAYMENT = "pending_final_payment", "Pending Final Payment"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class OrderType(models.TextChoices):
        READY = "ready", "Ready Design Purchase"
        CUSTOM = "custom", "Custom Order"

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders"
    )
    order_type = models.CharField(max_length=10, choices=OrderType.choices)
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL)
    custom_request = models.OneToOneField(CustomRequest, null=True, blank=True, on_delete=models.SET_NULL)
    assigned_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        related_name="assigned_orders",
        on_delete=models.SET_NULL,
        limit_choices_to={'role': 'staff'}
    )
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    advance_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    advance_paid = models.BooleanField(default=False)
    balance_paid = models.BooleanField(default=False)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.AWAITING_PAYMENT)
    
    # Deadline Configuration & Tracking (Stage 4B & 7 & 8)
    deadline_hours = models.PositiveIntegerField(default=72)
    due_at = models.DateTimeField(null=True, blank=True)
    is_overdue = models.BooleanField(default=False)
    warning_50_sent = models.BooleanField(default=False)
    warning_80_sent = models.BooleanField(default=False)

    # Quality Review & Previews (Stage 9 & 10)
    preview_image = models.ImageField(upload_to="custom_orders/previews/", null=True, blank=True)
    admin_review_notes = models.TextField(blank=True)
    quality_approved = models.BooleanField(default=False)

    # Settlement Tracking (Stage 13)
    settlement_status = models.CharField(max_length=20, default='pending')

    unassigned_since = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    handed_over_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} ({self.order_type}) - {self.status}"


class OrderMilestone(models.Model):
    order = models.ForeignKey(Order, related_name="milestones", on_delete=models.CASCADE)
    stage = models.CharField(max_length=30)
    reached_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.order_id} - {self.stage}"


class OrderDeliverable(models.Model):
    order = models.ForeignKey(Order, related_name="deliverables", on_delete=models.CASCADE)
    file_type = models.CharField(max_length=10)  # 3dm, stl, render, video
    file = models.FileField(upload_to="orders/deliverables/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.order_id} Deliverable ({self.file_type})"
