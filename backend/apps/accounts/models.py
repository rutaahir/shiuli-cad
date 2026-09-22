from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        CLIENT = "client", "Client"
        STAFF = "staff", "CAD Designer"
        ADMIN = "admin", "Super Admin"

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.CLIENT)
    phone_number = models.CharField(max_length=20, blank=True)
    profile_photo = models.ImageField(upload_to="profiles/", blank=True, null=True)
    is_active_staff = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff_profile")
    max_concurrent_jobs = models.PositiveIntegerField(default=2)
    specialty_tags = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    rating_average = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_jobs_completed = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"StaffProfile: {self.user.username} (Max Jobs: {self.max_concurrent_jobs})"


class AccountOTP(models.Model):
    class OTPType(models.TextChoices):
        EMAIL_CHANGE = "email_change", "Email Change"
        PASSWORD_RESET = "password_reset", "Password Reset"
        REGISTRATION = "registration", "Registration"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="account_otps", null=True, blank=True)
    otp_type = models.CharField(max_length=20, choices=OTPType.choices)
    target_value = models.CharField(max_length=255, blank=True)
    otp_hash = models.CharField(max_length=255)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        username = self.user.username if self.user else self.target_value
        return f"AccountOTP ({self.otp_type}) for {username}"

