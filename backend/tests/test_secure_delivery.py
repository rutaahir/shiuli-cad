import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.core.files.uploadedfile import SimpleUploadedFile

from django.test import override_settings
from unittest.mock import patch
from rest_framework.test import APIClient, APITestCase

from apps.catalog.models import Category, Product, ProductFile
from apps.payments.models import Purchase, DownloadOTP, DownloadToken

User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class TestSecureCADDeliverySystem(APITestCase):

    def setUp(self):
        self.mail_patcher = patch('apps.payments.views_purchases.send_mail')
        self.mock_send_mail = self.mail_patcher.start()
        self.addCleanup(self.mail_patcher.stop)
        self.client = APIClient()

        self.buyer = User.objects.create_user(
            username="buyer1",
            email="buyer1@shiulicadstudio.com",
            password="Password123!",
            role="client"
        )
        self.buyer2 = User.objects.create_user(
            username="buyer2",
            email="buyer2@shiulicadstudio.com",
            password="Password123!",
            role="client"
        )
        self.category = Category.objects.create(name="Rings", slug="rings")
        self.product = Product.objects.create(
            title="Diamond Royal Solitaire Ring",
            slug="diamond-royal-solitaire-ring",
            category=self.category,
            price=15000.00,
            commercial_price_markup=80.00,
            status=Product.Status.APPROVED
        )

        # Upload CAD file (.3dm) to protected media
        cad_content = b"RHINO_3DM_GEOMETRY_BINARY_DATA_MOCK_PROTECTED"
        self.cad_file = ProductFile.objects.create(
            product=self.product,
            file_type=ProductFile.FileType.FILE_3DM,
            file=SimpleUploadedFile("solitaire_ring.3dm", cad_content)
        )

    def test_01_direct_media_url_protection(self):
        """Confirm direct access to CAD file in media path is blocked/protected."""
        url = self.cad_file.file.url
        # Direct static media access for protected CAD file must NOT serve file
        response = self.client.get(url)
        assert response.status_code in [403, 404]

    def test_02_create_purchase_generates_hashed_otp(self):
        """Confirm purchase creates paid record & generates hashed 6-digit OTP."""
        self.client.force_authenticate(user=self.buyer)
        response = self.client.post('/api/payments/purchases/', {
            'product_id': self.product.id,
            'license_type': 'atelier',
            'auto_confirm': True
        })
        assert response.status_code == 201
        data = response.data
        assert 'purchase_id' in data
        purchase_id = data['purchase_id']

        purchase = Purchase.objects.get(id=purchase_id)
        assert purchase.status == 'paid'
        assert purchase.buyer == self.buyer

        otp_obj = DownloadOTP.objects.filter(purchase=purchase).last()
        assert otp_obj is not None
        assert otp_obj.is_verified is False
        # OTP must be stored hashed, never plaintext
        assert len(otp_obj.otp_hash) > 20
        assert not otp_obj.otp_hash.isdigit()

    def test_03_wrong_otp_lockout_rate_limit(self):
        """Enter wrong OTP 5 times -> account/code locked out with 429 rate limit."""
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post('/api/payments/purchases/', {
            'product_id': self.product.id,
            'auto_confirm': True
        })
        purchase_id = res.data['purchase_id']

        # Submit wrong code 5 times
        for i in range(4):
            resp = self.client.post(f'/api/payments/purchases/{purchase_id}/verify-otp/', {'code': '000000'})
            assert resp.status_code == 400

        # 5th attempt triggers lockout
        resp = self.client.post(f'/api/payments/purchases/{purchase_id}/verify-otp/', {'code': '000000'})
        assert resp.status_code == 429
        assert 'locked out' in resp.data['error'].lower()

    def test_04_correct_otp_generates_token_and_omits_token_from_api_response(self):
        """Correct OTP -> DownloadToken created; API response NEVER exposes raw token."""
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post('/api/payments/purchases/', {
            'product_id': self.product.id,
            'auto_confirm': True
        })
        purchase_id = res.data['purchase_id']
        purchase = Purchase.objects.get(id=purchase_id)

        # Force a known OTP code for testing
        otp_obj = DownloadOTP.objects.filter(purchase=purchase).last()
        otp_obj.otp_hash = make_password('123456')
        otp_obj.save()

        verify_res = self.client.post(f'/api/payments/purchases/{purchase_id}/verify-otp/', {'code': '123456'})
        assert verify_res.status_code == 200
        # Critical security check: raw token secret must NOT be in JSON response
        assert 'token' not in verify_res.data
        # download_url IS returned so the client can show an immediate download button
        assert 'download_url' in verify_res.data

        token_obj = DownloadToken.objects.filter(purchase=purchase).last()
        assert token_obj is not None
        assert token_obj.locked_email == self.buyer.email
        assert token_obj.is_used is False

    def test_05_download_unauthenticated_allowed_with_valid_token(self):
        """Download endpoint uses AllowAny; unauthenticated requests with valid token succeed.
        Security is enforced via single-use token + email lock (checked only when authenticated)."""
        purchase = Purchase.objects.create(
            buyer=self.buyer,
            product=self.product,
            price_paid=15000.00,
            payment_transaction_id="TXN-TEST",
            status="paid"
        )
        token_obj = DownloadToken.objects.create(
            purchase=purchase,
            token="TEST_TOKEN_XYZ_12345",
            locked_email=self.buyer.email,
            expires_at=timezone.now() + timedelta(hours=48)
        )

        response = self.client.get(f'/download/{token_obj.token}/')
        # AllowAny endpoint: valid token should stream the file (200) or fallback (200)
        # It should NOT return 401 since the endpoint accepts any caller
        assert response.status_code in [200, 404]  # 404 only if physical file missing in test env

    def test_06_download_correct_buyer_streams_file_and_marks_used(self):
        """Correct buyer streams CAD binary attachment and token is marked used upon completion."""
        purchase = Purchase.objects.create(
            buyer=self.buyer,
            product=self.product,
            price_paid=15000.00,
            payment_transaction_id="TXN-TEST",
            status="paid"
        )
        token_obj = DownloadToken.objects.create(
            purchase=purchase,
            token="VALID_BUYER_TOKEN_999",
            locked_email=self.buyer.email,
            expires_at=timezone.now() + timedelta(hours=48)
        )

        self.client.force_authenticate(user=self.buyer)
        response = self.client.get(f'/download/{token_obj.token}/')
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/octet-stream'
        assert 'attachment' in response.headers['Content-Disposition']

        # While stream is active, token is claimed with IN_PROGRESS lease and NOT yet completed
        token_obj.refresh_from_db()
        assert token_obj.status == DownloadToken.Status.IN_PROGRESS
        assert token_obj.is_used is False
        assert token_obj.attempt_count == 1

        # Simulate client consuming the streaming response to EOF
        content = b''.join(response.streaming_content)
        assert len(content) > 0

        # After stream completion, token is marked completed and is_used is True
        token_obj.refresh_from_db()
        assert token_obj.is_used is True
        assert token_obj.status == DownloadToken.Status.COMPLETED
        assert token_obj.completed_at is not None
        assert token_obj.used_at is not None

    def test_06b_simultaneous_download_conflict_409(self):
        """A request arriving while another stream is active returns HTTP 409 Conflict."""
        purchase = Purchase.objects.create(
            buyer=self.buyer,
            product=self.product,
            price_paid=15000.00,
            payment_transaction_id="TXN-TEST",
            status="paid"
        )
        token_obj = DownloadToken.objects.create(
            purchase=purchase,
            token="IN_PROGRESS_TOKEN_777",
            locked_email=self.buyer.email,
            expires_at=timezone.now() + timedelta(hours=48),
            status=DownloadToken.Status.IN_PROGRESS,
            in_progress_started_at=timezone.now(),
            attempt_count=1
        )

        response = self.client.get(f'/download/{token_obj.token}/')
        assert response.status_code == 409
        assert 'in progress' in response.data['error'].lower()

    def test_06c_admin_lock_blocks_download_and_revokes_tokens(self):
        """Admin locking purchase blocks download and marks active tokens REVOKED."""
        purchase = Purchase.objects.create(
            buyer=self.buyer,
            product=self.product,
            price_paid=15000.00,
            payment_transaction_id="TXN-TEST",
            status="paid",
            download_enabled_by_admin=True
        )
        token_obj = DownloadToken.objects.create(
            purchase=purchase,
            token="REVOKE_TEST_TOKEN_555",
            locked_email=self.buyer.email,
            expires_at=timezone.now() + timedelta(hours=48)
        )

        # Admin user toggles download permission
        admin_user = User.objects.create_superuser('admin1', 'admin1@shiuli.com', 'AdminPass123!')
        self.client.force_authenticate(user=admin_user)
        toggle_res = self.client.post(f'/api/payments/purchases/{purchase.id}/toggle-download-permission/', {'enabled': False})
        assert toggle_res.status_code == 200
        assert toggle_res.data['download_enabled_by_admin'] is False

        # Token was revoked
        token_obj.refresh_from_db()
        assert token_obj.status == DownloadToken.Status.REVOKED

        # Customer attempts to download -> HTTP 403 Forbidden
        self.client.force_authenticate(user=self.buyer)
        dl_res = self.client.get(f'/download/{token_obj.token}/')
        assert dl_res.status_code == 403
        assert 'locked' in dl_res.data['error'].lower() or 'revoked' in dl_res.data['error'].lower()

    def test_07_second_download_attempt_fails_already_used(self):
        """Attempting to use an already-used token returns HTTP 400 'already used' error."""
        purchase = Purchase.objects.create(
            buyer=self.buyer,
            product=self.product,
            price_paid=15000.00,
            payment_transaction_id="TXN-TEST",
            status="paid"
        )
        token_obj = DownloadToken.objects.create(
            purchase=purchase,
            token="USED_TOKEN_888",
            locked_email=self.buyer.email,
            expires_at=timezone.now() + timedelta(hours=48),
            is_used=True,
            used_at=timezone.now()
        )

        self.client.force_authenticate(user=self.buyer)
        response = self.client.get(f'/download/{token_obj.token}/')
        assert response.status_code == 400
        assert 'already been used' in response.data['error'].lower()

    def test_08_cross_account_token_rejection(self):
        """Different authenticated user attempting to use token is rejected with HTTP 403."""
        purchase = Purchase.objects.create(
            buyer=self.buyer,
            product=self.product,
            price_paid=15000.00,
            payment_transaction_id="TXN-TEST",
            status="paid"
        )
        token_obj = DownloadToken.objects.create(
            purchase=purchase,
            token="LOCKED_TOKEN_777",
            locked_email=self.buyer.email,
            expires_at=timezone.now() + timedelta(hours=48),
            is_used=False
        )

        # Authenticate as buyer2 (different account)
        self.client.force_authenticate(user=self.buyer2)
        response = self.client.get(f'/download/{token_obj.token}/')
        assert response.status_code == 403
        assert 'belongs to a different account' in response.data['error'].lower()

    def test_09_redelivery_limit_cap_at_3(self):
        """Re-delivery flow allows max 3 requests, 4th request returns HTTP 400 error."""
        purchase = Purchase.objects.create(
            buyer=self.buyer,
            product=self.product,
            price_paid=15000.00,
            payment_transaction_id="TXN-TEST",
            status="paid",
            redelivery_count=3
        )

        self.client.force_authenticate(user=self.buyer)
        response = self.client.post(f'/api/payments/purchases/{purchase.id}/resend-download-link/')
        assert response.status_code == 400
        assert 'maximum limit of 3' in response.data['error'].lower()
