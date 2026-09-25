from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.staff_management.models import PlatformSettings
from apps.core.email_service import (
    encrypt_credential,
    decrypt_credential,
    mask_email,
    get_active_email_credentials,
    invalidate_email_cache
)

User = get_user_model()


class EmailSecurityAndSettingsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="superadmin",
            email="admin@shiulicad.com",
            password="adminpassword123",
            role="admin",
            is_staff=True,
            is_superuser=True
        )
        self.client_user = User.objects.create_user(
            username="regularclient",
            email="client@example.com",
            password="clientpass123",
            role="client"
        )
        self.settings_obj = PlatformSettings.load()
        invalidate_email_cache()

    def test_fernet_encryption_roundtrip(self):
        secret_app_pw = "abcd efgh ijkl mnop"
        encrypted = encrypt_credential(secret_app_pw)
        self.assertNotEqual(secret_app_pw, encrypted)
        self.assertTrue(len(encrypted) > 20)

        decrypted = decrypt_credential(encrypted)
        self.assertEqual(secret_app_pw, decrypted)

    def test_email_masking(self):
        self.assertEqual(mask_email("socialbuzz31@gmail.com"), "so***31@gmail.com")
        self.assertEqual(mask_email("info@shiulicad.com"), "in***fo@shiulicad.com")
        self.assertEqual(mask_email("ab@c.com"), "a***@c.com")
        self.assertEqual(mask_email(""), "")

    def test_get_settings_never_exposes_app_password(self):
        # Set custom credentials
        self.settings_obj.smtp_email = "custom_sender@shiulicad.com"
        self.settings_obj.smtp_app_password_encrypted = encrypt_credential("supersecretpassword")
        self.settings_obj.save()

        response = self.client.get('/api/platform-settings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify password is NEVER in response
        data = response.json()
        self.assertNotIn('smtp_app_password', data)
        self.assertNotIn('smtp_app_password_encrypted', data)
        self.assertNotIn('supersecretpassword', str(response.content))
        
        # Verify masked representation
        self.assertTrue(data.get('email_configured'))
        self.assertEqual(data.get('masked_smtp_email'), "cu***er@shiulicad.com")

    def test_client_cannot_update_email_credentials(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.patch('/api/platform-settings/', {
            "smtp_email": "hacker@evil.com",
            "smtp_app_password": "maliciouspassword"
        }, format='json')
        # Should be forbidden for non-admin
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_credentials_and_triggers_encryption(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch('/api/platform-settings/', {
            "smtp_email": "new_studio@shiulicad.com",
            "smtp_app_password": "four groups word test"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify DB stored encrypted version, NOT plaintext
        updated_settings = PlatformSettings.load()
        self.assertEqual(updated_settings.smtp_email, "new_studio@shiulicad.com")
        self.assertNotEqual(updated_settings.smtp_app_password_encrypted, "four groups word test")
        self.assertEqual(
            decrypt_credential(updated_settings.smtp_app_password_encrypted),
            "four groups word test"
        )
        self.assertEqual(updated_settings.smtp_updated_by, self.admin)
        self.assertIsNotNone(updated_settings.smtp_updated_at)

        # Active credentials now reflect database
        active_email, active_pass = get_active_email_credentials()
        self.assertEqual(active_email, "new_studio@shiulicad.com")
        self.assertEqual(active_pass, "fourgroupswordtest")

    def test_clearing_credentials_reverts_to_env_fallback(self):
        self.client.force_authenticate(user=self.admin)
        # First save custom credentials
        self.client.patch('/api/platform-settings/', {
            "smtp_email": "temporary@shiulicad.com",
            "smtp_app_password": "temppassword1234"
        }, format='json')

        # Clear credentials (empty strings)
        response = self.client.patch('/api/platform-settings/', {
            "smtp_email": "",
            "smtp_app_password": ""
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_settings = PlatformSettings.load()
        self.assertEqual(updated_settings.smtp_email, "")
        self.assertEqual(updated_settings.smtp_app_password_encrypted, "")

        # Fallback should now be active
        from django.conf import settings
        expected_fallback_email = getattr(settings, 'EMAIL_HOST_USER', '').strip()
        active_email, _ = get_active_email_credentials()
        self.assertEqual(active_email, expected_fallback_email)
