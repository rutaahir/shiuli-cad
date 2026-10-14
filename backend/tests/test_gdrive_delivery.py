import io
import os
import shutil
import tempfile
from unittest.mock import patch, MagicMock
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase
from django.core.management import call_command

from apps.catalog.models import Category, Product, ProductFile
from apps.payments.models import Purchase, DownloadToken
from apps.core.gdrive_service import GoogleDriveQuotaError, GoogleDriveError

User = get_user_model()


@override_settings(
    CAD_STORAGE_BACKEND='gdrive',
    GDRIVE_FOLDER_ID='test_mock_folder_123',
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'
)
class TestGoogleDriveCADDelivery(APITestCase):

    def setUp(self):
        self.client = APIClient()

        self.admin = User.objects.create_superuser(
            username="admin_user",
            email="admin@shiulicadstudio.com",
            password="AdminPassword123!",
            role="admin"
        )
        self.buyer = User.objects.create_user(
            username="gdrive_buyer",
            email="buyer@shiulicadstudio.com",
            password="BuyerPassword123!",
            role="client"
        )

        self.category = Category.objects.create(name="Necklaces", slug="necklaces")
        self.product = Product.objects.create(
            title="Diamond Emerald Pendant",
            slug="diamond-emerald-pendant",
            category=self.category,
            price=25000.00,
            status=Product.Status.APPROVED
        )

    @patch('apps.core.gdrive_service.get_drive_credentials')
    def test_01_storage_config_endpoint(self, mock_creds):
        """Verify storage-config endpoint exposes active backend config and readiness."""
        mock_creds.return_value = MagicMock()
        resp = self.client.get('/api/catalog/products/storage-config/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data.get('storage_backend'), 'gdrive')
        self.assertTrue(resp.data.get('is_gdrive'))
        self.assertTrue(resp.data.get('gdrive_authorized'))

    @patch('apps.core.gdrive_service.create_resumable_upload_session')
    def test_02_gdrive_upload_session(self, mock_create_session):
        """Staff/admin can initialize a Google Drive resumable upload session."""
        mock_create_session.return_value = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=mock_session_99'
        self.client.force_authenticate(user=self.admin)

        payload = {
            'filename': 'emerald_pendant.3dm',
            'file_type': '3dm',
            'file_size': 10485760,
            'mime_type': 'application/octet-stream'
        }
        resp = self.client.post(
            f'/api/catalog/products/{self.product.slug}/gdrive-upload-session/',
            payload,
            format='json'
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn('session_uri', resp.data)
        self.assertEqual(resp.data['session_uri'], mock_create_session.return_value)
        self.assertEqual(resp.data['file_type'], '3dm')

    @patch('apps.core.gdrive_service.get_file_metadata')
    def test_03_gdrive_upload_complete(self, mock_get_metadata):
        """Staff/admin finalizes upload and ProductFile record is created with gdrive provider."""
        mock_get_metadata.return_value = {
            'id': 'gdrive_mock_file_id_001',
            'name': 'emerald_pendant.3dm',
            'size': 5242880,
            'mime_type': 'application/octet-stream',
            'parents': ['test_mock_folder_123'],
            'trashed': False
        }
        self.client.force_authenticate(user=self.admin)

        payload = {
            'drive_file_id': 'gdrive_mock_file_id_001',
            'file_type': '3dm',
            'original_filename': 'emerald_pendant.3dm'
        }
        resp = self.client.post(
            f'/api/catalog/products/{self.product.slug}/gdrive-upload-complete/',
            payload,
            format='json'
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['storage_provider'], 'gdrive')
        self.assertNotIn('drive_file_id', resp.data)  # Internal drive ID must not be leaked

        # Confirm DB state
        pf = ProductFile.objects.get(id=resp.data['id'])
        self.assertEqual(pf.storage_provider, 'gdrive')
        self.assertEqual(pf.drive_file_id, 'gdrive_mock_file_id_001')
        self.assertEqual(pf.file_size_bytes, 5242880)

    @patch('apps.core.gdrive_service.stream_file')
    def test_04_download_cad_file_direct_proxy_streaming(self, mock_stream):
        """Admin/staff direct download streams file chunks from Google Drive."""
        mock_stream.return_value = [b"CHUNK_1_", b"CHUNK_2_", b"CHUNK_3"]
        pf = ProductFile.objects.create(
            product=self.product,
            file_type='3dm',
            storage_provider='gdrive',
            drive_file_id='gdrive_mock_stream_id',
            original_filename='emerald_pendant.3dm',
            file_size_bytes=21
        )
        self.client.force_authenticate(user=self.admin)

        resp = self.client.get(f'/api/catalog/products/download/{pf.id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get('Content-Disposition'), 'attachment; filename="emerald_pendant.3dm"')

        content = b"".join(resp.streaming_content)
        self.assertEqual(content, b"CHUNK_1_CHUNK_2_CHUNK_3")

    @patch('apps.core.gdrive_service.stream_file')
    def test_05_customer_token_download_gdrive_streaming(self, mock_stream):
        """Customer /download/{token} streams from Google Drive and marks token used on EOF."""
        mock_stream.return_value = [b"GDRIVE_CAD_BYTE_1_", b"GDRIVE_CAD_BYTE_2"]

        pf = ProductFile.objects.create(
            product=self.product,
            file_type='3dm',
            storage_provider='gdrive',
            drive_file_id='gdrive_cust_file_id',
            original_filename='pendant_final.3dm',
            file_size_bytes=36
        )

        purchase = Purchase.objects.create(
            buyer=self.buyer,
            product=self.product,
            price_paid=25000.00,
            status=Purchase.Status.PAID,
            download_enabled_by_admin=True
        )

        token_obj = DownloadToken.objects.create(
            purchase=purchase,
            token="secure_test_gdrive_token_xyz_123",
            expires_at=timezone.now() + timezone.timedelta(hours=24)
        )

        resp = self.client.get(f'/api/payments/download/{token_obj.token}/')
        self.assertEqual(resp.status_code, 200)

        # Stream content completely
        content = b"".join(resp.streaming_content)
        self.assertEqual(content, b"GDRIVE_CAD_BYTE_1_GDRIVE_CAD_BYTE_2")

        # Confirm token is consumed atomically after full stream
        token_obj.refresh_from_db()
        self.assertTrue(token_obj.is_used)
        self.assertEqual(token_obj.status, 'completed')

    @patch('apps.core.gdrive_service.stream_file')
    def test_06_customer_token_download_quota_error_does_not_consume_token(self, mock_stream):
        """When streaming raises GoogleDriveQuotaError, token is NOT consumed."""
        mock_stream.side_effect = GoogleDriveQuotaError("Google Drive quota exceeded")

        pf = ProductFile.objects.create(
            product=self.product,
            file_type='3dm',
            storage_provider='gdrive',
            drive_file_id='gdrive_quota_error_id',
            original_filename='quota_test.3dm'
        )

        purchase = Purchase.objects.create(
            buyer=self.buyer,
            product=self.product,
            price_paid=25000.00,
            status=Purchase.Status.PAID,
            download_enabled_by_admin=True
        )

        token_obj = DownloadToken.objects.create(
            purchase=purchase,
            token="secure_test_gdrive_token_quota",
            expires_at=timezone.now() + timezone.timedelta(hours=24)
        )

        resp = self.client.get(f'/api/payments/download/{token_obj.token}/')
        with self.assertRaises(GoogleDriveQuotaError):
            for _ in resp.streaming_content:
                pass

        # Verify token was not marked completed or used
        token_obj.refresh_from_db()
        self.assertFalse(token_obj.is_used)
        self.assertEqual(token_obj.status, 'available')
        self.assertEqual(token_obj.attempt_count, 0)

    @patch('apps.core.gdrive_service.stream_file')
    def test_06b_multi_file_quota_error_returns_503(self, mock_stream):
        """When building multi-file archive hits GoogleDriveQuotaError, returns HTTP 503 without consuming token."""
        mock_stream.side_effect = GoogleDriveQuotaError("Google Drive quota exceeded")

        ProductFile.objects.create(
            product=self.product,
            file_type='3dm',
            storage_provider='gdrive',
            drive_file_id='gdrive_quota_multi_1',
            original_filename='quota_multi_1.3dm'
        )
        ProductFile.objects.create(
            product=self.product,
            file_type='stl',
            storage_provider='gdrive',
            drive_file_id='gdrive_quota_multi_2',
            original_filename='quota_multi_2.stl'
        )

        purchase = Purchase.objects.create(
            buyer=self.buyer,
            product=self.product,
            price_paid=25000.00,
            status=Purchase.Status.PAID,
            download_enabled_by_admin=True
        )

        token_obj = DownloadToken.objects.create(
            purchase=purchase,
            token="secure_test_gdrive_multi_quota",
            expires_at=timezone.now() + timezone.timedelta(hours=24)
        )

        resp = self.client.get(f'/api/payments/download/{token_obj.token}/')
        self.assertEqual(resp.status_code, 503)

        token_obj.refresh_from_db()
        self.assertFalse(token_obj.is_used)
        self.assertEqual(token_obj.status, 'available')
        self.assertEqual(token_obj.attempt_count, 0)

    @patch('apps.core.gdrive_service.delete_file')
    def test_07_post_delete_signal_cleans_drive_asset(self, mock_delete_file):
        """Deleting a ProductFile triggers cleanup in Google Drive via post_delete signal."""
        pf = ProductFile.objects.create(
            product=self.product,
            file_type='3dm',
            storage_provider='gdrive',
            drive_file_id='gdrive_to_delete_999',
            original_filename='delete_me.3dm'
        )

        pf.delete()
        mock_delete_file.assert_called_once_with('gdrive_to_delete_999')

    @patch('apps.core.gdrive_service.get_drive_service')
    @patch('apps.core.gdrive_service.get_folder_id')
    def test_08_management_command_migrate_cad_to_gdrive(self, mock_folder_id, mock_drive_service):
        """Test migrate_cad_to_gdrive management command."""
        mock_folder_id.return_value = 'mock_drive_folder_id'
        mock_files = MagicMock()
        mock_create = MagicMock()
        mock_create.execute.return_value = {'id': 'uploaded_migrated_drive_id', 'size': 100}
        mock_files.create.return_value = mock_create
        mock_service_instance = MagicMock()
        mock_service_instance.files.return_value = mock_files
        mock_drive_service.return_value = mock_service_instance

        # Create temporary local file
        temp_dir = tempfile.mkdtemp()
        self.addCleanup(lambda: shutil.rmtree(temp_dir, ignore_errors=True))
        local_file_path = os.path.join(temp_dir, 'sample_ring.3dm')
        with open(local_file_path, 'wb') as f:
            f.write(b"SAMPLE_3DM_BYTES_FOR_MIGRATION")

        with open(local_file_path, 'rb') as f:
            pf = ProductFile.objects.create(
                product=self.product,
                file_type='3dm',
                storage_provider='local',
                file=SimpleUploadedFile('sample_ring.3dm', f.read()),
                original_filename='sample_ring.3dm'
            )

        out = io.StringIO()
        call_command('migrate_cad_to_gdrive', product=self.product.slug, stdout=out)
        output = out.getvalue()

        self.assertIn('Migration Complete: 1 migrated', output)
        pf.refresh_from_db()
        self.assertEqual(pf.storage_provider, 'gdrive')
        self.assertEqual(pf.drive_file_id, 'uploaded_migrated_drive_id')

    @patch('apps.core.gdrive_service.test_folder_access')
    def test_09_gdrive_status_endpoint(self, mock_test_access):
        """Admin can check Google Drive connectivity and storage health."""
        mock_test_access.return_value = {
            'status': 'connected',
            'folder_id': 'test_mock_folder_123',
            'folder_name': 'Shiuli CAD Studio Storage',
            'can_add_files': True,
            'owners': ['admin@shiulicadstudio.com'],
            'authorized_user': 'admin@shiulicadstudio.com',
            'storage_limit_gb': 15.0,
            'storage_usage_gb': 1.25,
            'storage_available_gb': 13.75
        }
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/catalog/products/gdrive-status/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'connected')
        self.assertEqual(resp.data['folder_name'], 'Shiuli CAD Studio Storage')
        self.assertEqual(resp.data['storage_available_gb'], 13.75)

    @patch('apps.core.gdrive_service.create_resumable_upload_session')
    def test_10_gdrive_upload_session_granular_errors(self, mock_session):
        """Upload session endpoint returns appropriate HTTP status codes for specific errors."""
        from apps.core.gdrive_service import GoogleDriveAuthError, GoogleDriveQuotaError, GoogleDrivePermissionError, GoogleDriveNotFoundError
        self.client.force_authenticate(user=self.admin)
        payload = {
            'filename': 'emerald_pendant.3dm',
            'file_type': '3dm',
            'file_size': 10485760,
            'mime_type': 'application/octet-stream'
        }

        # Auth error -> 503 (external service unavailable, does NOT trigger frontend user logout)
        mock_session.side_effect = GoogleDriveAuthError("OAuth required")
        resp = self.client.post(f'/api/catalog/products/{self.product.slug}/gdrive-upload-session/', payload, format='json')
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.data.get('code'), 'gdrive_auth_required')

        # Quota error -> 507
        mock_session.side_effect = GoogleDriveQuotaError("Quota exceeded")
        resp = self.client.post(f'/api/catalog/products/{self.product.slug}/gdrive-upload-session/', payload, format='json')
        self.assertEqual(resp.status_code, 507)
        self.assertEqual(resp.data.get('code'), 'gdrive_quota_exceeded')

        # Permission error -> 403
        mock_session.side_effect = GoogleDrivePermissionError("Permission denied")
        resp = self.client.post(f'/api/catalog/products/{self.product.slug}/gdrive-upload-session/', payload, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data.get('code'), 'gdrive_permission_denied')

        # Not found error -> 404
        mock_session.side_effect = GoogleDriveNotFoundError("Folder not found")
        resp = self.client.post(f'/api/catalog/products/{self.product.slug}/gdrive-upload-session/', payload, format='json')
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.data.get('code'), 'gdrive_folder_not_found')

    @patch('apps.core.gdrive_service.test_folder_access')
    def test_11_test_gdrive_connection_command(self, mock_test_access):
        """test_gdrive_connection management command output test."""
        mock_test_access.return_value = {
            'status': 'connected',
            'folder_id': 'test_mock_folder_123',
            'folder_name': 'Shiuli CAD Studio Storage',
            'can_add_files': True,
            'owners': ['user@gmail.com'],
            'authorized_user': 'user@gmail.com',
            'storage_limit_gb': 15.0,
            'storage_usage_gb': 2.0,
            'storage_available_gb': 13.0
        }
        out = io.StringIO()
        call_command('test_gdrive_connection', stdout=out)
        output = out.getvalue()
        self.assertIn('Connection & Authentication Successful', output)
        self.assertIn('Shiuli CAD Studio Storage', output)
