from django.db import models
from django.conf import settings
from apps.custom_orders.models import Order

class PaymentPlanTemplate(models.Model):
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} {'(Default)' if self.is_default else ''}"


class PaymentPlanTemplateStage(models.Model):
    class TriggerType(models.TextChoices):
        IMMEDIATE = "immediate", "Due Immediately"
        ON_DESIGN_APPROVAL = "on_design_approval", "Due on Client Design Approval"
        ON_FINAL_DELIVERY = "on_final_delivery", "Due Before Final File Release"

    template = models.ForeignKey(PaymentPlanTemplate, related_name="stages", on_delete=models.CASCADE)
    label = models.CharField(max_length=100)
    percentage = models.DecimalField(max_digits=5, decimal_places=2)
    order_index = models.PositiveIntegerField()
    trigger_type = models.CharField(max_length=30, choices=TriggerType.choices, default=TriggerType.IMMEDIATE)

    class Meta:
        ordering = ['order_index']

    def __str__(self):
        return f"{self.template.name} - Stage {self.order_index + 1}: {self.label} ({self.percentage}%)"


class OrderPaymentStage(models.Model):
    class Status(models.TextChoices):
        LOCKED = "locked", "Locked"
        DUE = "due", "Due Now"
        PAID = "paid", "Paid"

    order = models.ForeignKey(Order, related_name="payment_stages", on_delete=models.CASCADE)
    label = models.CharField(max_length=100)
    percentage = models.DecimalField(max_digits=5, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    order_index = models.PositiveIntegerField()
    trigger_type = models.CharField(max_length=30)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.LOCKED)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['order_index']

    def __str__(self):
        return f"Order #{self.order_id} Stage {self.order_index + 1}: {self.label} (₹{self.amount} - {self.status})"


class Payment(models.Model):
    class PaymentType(models.TextChoices):
        ADVANCE = "advance", "Advance"
        BALANCE = "balance", "Balance"
        STAGE = "stage", "Milestone Stage Payment"
        FULL = "full", "Full Payment"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    order = models.ForeignKey(Order, related_name="payments", on_delete=models.CASCADE)
    payment_stage = models.ForeignKey(OrderPaymentStage, null=True, blank=True, on_delete=models.SET_NULL, related_name="payments")
    payment_type = models.CharField(max_length=10, choices=PaymentType.choices, default=PaymentType.STAGE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    gateway_transaction_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment #{self.id} for Order #{self.order_id} (₹{self.amount} - {self.status})"


class Settlement(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSED = "processed", "Processed"

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settlements"
    )
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Settlement #{self.id} for Staff {self.staff.username} (₹{self.amount})"


class Purchase(models.Model):
    class LicenseType(models.TextChoices):
        ATELIER = "atelier", "Atelier License"
        COMMERCIAL = "commercial", "Commercial Mass License"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Payment"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"

    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="purchases")
    product = models.ForeignKey('catalog.Product', on_delete=models.PROTECT, related_name="purchases")
    license_type = models.CharField(max_length=20, choices=LicenseType.choices, default=LicenseType.ATELIER)
    price_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_transaction_id = models.CharField(max_length=100)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    redelivery_count = models.PositiveIntegerField(default=0)
    otp_generation_count = models.PositiveIntegerField(default=0)
    last_otp_generated_at = models.DateTimeField(null=True, blank=True)
    purchased_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Purchase #{self.id} - {self.product.title} ({self.buyer.email}) - {self.status}"


class DownloadOTP(models.Model):
    purchase = models.ForeignKey(Purchase, null=True, blank=True, on_delete=models.CASCADE, related_name="otps")
    order = models.ForeignKey('custom_orders.Order', null=True, blank=True, on_delete=models.CASCADE, related_name="otps")
    otp_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        item_str = f"Purchase #{self.purchase_id}" if self.purchase_id else f"Order #{self.order_id}"
        return f"OTP for {item_str} (Verified: {self.is_verified})"


class DownloadToken(models.Model):
    purchase = models.ForeignKey(Purchase, null=True, blank=True, on_delete=models.CASCADE, related_name="tokens")
    order = models.ForeignKey('custom_orders.Order', null=True, blank=True, on_delete=models.CASCADE, related_name="tokens")
    token = models.CharField(max_length=128, unique=True, db_index=True)
    locked_email = models.EmailField()
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    used_from_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        item_str = f"Purchase #{self.purchase_id}" if self.purchase_id else f"Order #{self.order_id}"
        return f"Token for {item_str} (Used: {self.is_used})"



