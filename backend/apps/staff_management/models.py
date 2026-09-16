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
