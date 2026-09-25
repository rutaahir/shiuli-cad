from django.db import models

class PlatformSettings(models.Model):
    ASSIGNMENT_MODE_CHOICES = [
        ('first_accept_wins', 'First Accept Wins'),
        ('priority_least_loaded', 'Priority (Least Loaded First)'),
    ]

    studio_name = models.CharField(max_length=100, default="Shiuli CAD Studio")
    timezone = models.CharField(max_length=50, default="IST (UTC+5:30)")
    default_max_job_limit = models.PositiveIntegerField(default=2)
    assignment_mode = models.CharField(max_length=30, choices=ASSIGNMENT_MODE_CHOICES, default="first_accept_wins")
    auto_escalation_minutes = models.PositiveIntegerField(default=30)
    advance_payment_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=50.00)
    studio_upi_id = models.CharField(max_length=100, default="shiulicad@okhdfcbank", blank=True)
    studio_qr_code = models.ImageField(upload_to="settings/qr/", blank=True, null=True)
    studio_qr_code_url = models.TextField(blank=True, default="")
    cash_check_instructions = models.TextField(
        blank=True,
        default="For Cash or Cheque, please submit your transaction details and attach deposit receipt or cheque photo. Atelier accounts will confirm collection and enable your download."
    )
    free_revisions_allowed = models.PositiveIntegerField(default=2)
    extra_revision_fee = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)

    # Dynamic Admin-Editable SMTP Credentials (Encrypted at rest via Fernet)
    smtp_email = models.EmailField(max_length=255, blank=True, default="")
    smtp_app_password_encrypted = models.TextField(blank=True, default="")
    smtp_updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="smtp_settings_updates"
    )
    smtp_updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "Platform Settings"

    def __str__(self):
        return f"Platform Settings (Mode: {self.assignment_mode})"

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
