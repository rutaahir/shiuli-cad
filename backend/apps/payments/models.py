from decimal import Decimal
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
        DECLINED = "declined", "Declined"
        FAILED = "failed", "Failed"

    order = models.ForeignKey(Order, related_name="payments", on_delete=models.CASCADE)
    payment_stage = models.ForeignKey(OrderPaymentStage, null=True, blank=True, on_delete=models.SET_NULL, related_name="payments")
    payment_type = models.CharField(max_length=10, choices=PaymentType.choices, default=PaymentType.STAGE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    gateway_transaction_id = models.CharField(max_length=100, blank=True)
    payment_method = models.CharField(max_length=50, blank=True, default="upi")
    payment_details = models.TextField(blank=True, default="")
    payment_screenshot = models.FileField(upload_to="payment_proofs/", blank=True, null=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    decline_reason = models.TextField(blank=True, default="")
    declined_at = models.DateTimeField(null=True, blank=True)
    declined_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="declined_payments"
    )
    admin_verified_at = models.DateTimeField(null=True, blank=True)
    admin_verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="verified_payments"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment #{self.id} for Order #{self.order_id} (₹{self.amount} - {self.status})"


class Settlement(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PARTIAL = "partial", "Partially Settled"
        PROCESSED = "processed", "Processed"

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settlements"
    )
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_method = models.CharField(max_length=50, blank=True, default="bank_transfer")
    transaction_ref = models.CharField(max_length=120, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Settlement #{self.id} for Staff {self.staff.username} (₹{self.amount_paid}/₹{self.amount} - {self.status})"


class Purchase(models.Model):
    class LicenseType(models.TextChoices):
        ATELIER = "atelier", "Atelier License"
        COMMERCIAL = "commercial", "Commercial Mass License"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Payment"
        PAID = "paid", "Paid"
        DECLINED = "declined", "Declined"
        FAILED = "failed", "Failed"

    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="purchases")
    product = models.ForeignKey('catalog.Product', on_delete=models.PROTECT, related_name="purchases")
    license_type = models.CharField(max_length=20, choices=LicenseType.choices, default=LicenseType.ATELIER)
    price_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_transaction_id = models.CharField(max_length=100)
    payment_method = models.CharField(max_length=50, blank=True, default="upi")
    payment_details = models.TextField(blank=True, default="")
    payment_screenshot = models.FileField(upload_to="payment_proofs/", blank=True, null=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    decline_reason = models.TextField(blank=True, default="")
    declined_at = models.DateTimeField(null=True, blank=True)
    declined_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="declined_purchases"
    )
    # Regional Tier Pricing Snapshot
    pricing_mode = models.CharField(max_length=20, default="global", blank=True)
    pricing_tier = models.CharField(max_length=50, blank=True, default="")
    country_code = models.CharField(max_length=10, blank=True, default="")
    currency = models.CharField(max_length=10, default="INR", blank=True)
    original_price_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=6, null=True, blank=True)
    pricing_snapshot = models.JSONField(default=dict, blank=True)
    admin_verified_at = models.DateTimeField(null=True, blank=True)
    admin_verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="verified_purchases"
    )
    redelivery_count = models.PositiveIntegerField(default=0)
    otp_generation_count = models.PositiveIntegerField(default=0)
    last_otp_generated_at = models.DateTimeField(null=True, blank=True)
    download_enabled_by_admin = models.BooleanField(
        default=True,
        help_text="Studio Admin toggle to lock or unlock customer download access"
    )
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
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        EXPIRED = "expired", "Expired"
        REVOKED = "revoked", "Revoked by Admin"

    purchase = models.ForeignKey(Purchase, null=True, blank=True, on_delete=models.CASCADE, related_name="tokens")
    order = models.ForeignKey('custom_orders.Order', null=True, blank=True, on_delete=models.CASCADE, related_name="tokens")
    token = models.CharField(max_length=128, unique=True, db_index=True)
    locked_email = models.EmailField()
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    in_progress_started_at = models.DateTimeField(null=True, blank=True)
    attempt_count = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    used_from_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        item_str = f"Purchase #{self.purchase_id}" if self.purchase_id else f"Order #{self.order_id}"
        return f"Token for {item_str} ({self.status} - Used: {self.is_used})"


class ClientWallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet"
    )
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default="USD")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet ({self.user.email or self.user.username}): ${self.balance} {self.currency}"


class ClientCreditAccount(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active Credit Line"
        SUSPENDED = "suspended", "Suspended"
        DISABLED = "disabled", "Disabled"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_account"
    )
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    used_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DISABLED)
    payment_terms_days = models.PositiveIntegerField(default=30)
    notes = models.TextField(blank=True, default="")
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="granted_credit_lines"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def available_credit(self):
        return max(Decimal('0.00'), self.credit_limit - self.used_credit)

    def __str__(self):
        return f"CreditLine ({self.user.email or self.user.username}): Limit ${self.credit_limit}, Used ${self.used_credit} [{self.status}]"


class WalletCreditTransaction(models.Model):
    class AccountType(models.TextChoices):
        WALLET = "wallet", "Prepaid Wallet"
        CREDIT = "credit", "Corporate Credit Line"

    class TransactionType(models.TextChoices):
        TOPUP = "topup", "Wallet Top-up Deposit"
        WALLET_SPEND = "wallet_spend", "Purchase with Wallet"
        CREDIT_SPEND = "credit_spend", "Purchase on Credit"
        REPAYMENT = "repayment", "Credit Bill Repayment"
        ADMIN_ADJUSTMENT = "admin_adjustment", "Admin Balance Adjustment"
        REFUND = "refund", "Refund"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Verification"
        COMPLETED = "completed", "Completed"
        DECLINED = "declined", "Declined"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet_credit_transactions"
    )
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    running_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    reference_order = models.ForeignKey(
        'custom_orders.Order',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="wallet_credit_transactions"
    )
    reference_purchase = models.ForeignKey(
        Purchase,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="wallet_credit_transactions"
    )
    
    payment_method = models.CharField(max_length=50, blank=True, default="wallet")
    transaction_ref = models.CharField(max_length=120, blank=True, default="")
    payment_screenshot = models.FileField(upload_to="wallet_proofs/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    notes = models.TextField(blank=True, default="")
    
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="verified_wallet_transactions"
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_account_type_display()} - {self.get_transaction_type_display()} (${self.amount}) for {self.user.email or self.user.username} [{self.status}]"




