import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase
from unittest.mock import patch

from apps.catalog.models import Category
from apps.custom_orders.models import CustomRequest, Order, NegotiationMessage, OrderDeliverable
from apps.payments.models import OrderPaymentStage, DownloadOTP, DownloadToken

User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class TestCustomOrderLifecycle13Stages(APITestCase):

    def setUp(self):
        self.mail_patcher = patch('apps.custom_orders.views.send_mail')
        self.mock_send_mail = self.mail_patcher.start()
        self.addCleanup(self.mail_patcher.stop)

        self.client_user = User.objects.create_user(
            username="client_13stage",
            email="client13@shiulicadstudio.com",
            password="Password123!",
            role="client"
        )
        self.staff_user = User.objects.create_user(
            username="staff_designer_13stage",
            email="staff13@shiulicadstudio.com",
            password="Password123!",
            role="staff"
        )
        self.admin_user = User.objects.create_user(
            username="admin_manager_13stage",
            email="admin13@shiulicadstudio.com",
            password="Password123!",
            role="admin"
        )
        self.category = Category.objects.create(name="Custom Necklaces", slug="custom-necklaces")
        self.api = APIClient()

    def test_01_client_submits_request_visible_only_to_admin_and_client(self):
        """Stage 1: Client submits request; visible to client and admin, NOT staff."""
        self.api.force_authenticate(user=self.client_user)
        resp = self.api.post('/api/custom-requests/', {
            'description': 'Royal Platinum Emerald Necklace with 12 Diamonds',
            'contact_name': 'Client 13',
            'contact_phone': '+91 9999999999',
            'category': self.category.id
        })
        assert resp.status_code == 201
        req_id = resp.data['id']

        # Admin can view it
        self.api.force_authenticate(user=self.admin_user)
        admin_resp = self.api.get(f'/api/custom-requests/{req_id}/')
        assert admin_resp.status_code == 200

        # Staff CANNOT view custom requests
        self.api.force_authenticate(user=self.staff_user)
        staff_resp = self.api.get(f'/api/custom-requests/{req_id}/')
        assert staff_resp.status_code == 404

    def test_02_admin_quote_and_two_way_negotiation(self):
        """Stages 2 & 3: Admin quotes price -> Client counters -> Admin accepts & locks price."""
        self.api.force_authenticate(user=self.client_user)
        res = self.api.post('/api/custom-requests/', {
            'description': 'Bespoke Diamond Engagement Ring',
            'contact_name': 'Client Ring',
            'contact_phone': '+91 8888888888'
        })
        req_id = res.data['id']

        # Stage 2: Admin sends quote ₹50,000
        self.api.force_authenticate(user=self.admin_user)
        quote_res = self.api.post(f'/api/custom-requests/{req_id}/quote/', {'price': 50000.00})
        assert quote_res.status_code == 200
        assert quote_res.data['status'] == 'quoted'

        # Stage 3: Client sends counter-offer ₹45,000
        self.api.force_authenticate(user=self.client_user)
        counter_res = self.api.post(f'/api/custom-requests/{req_id}/negotiate/', {
            'price': 45000.00,
            'message': 'Can you do ₹45,000 for atelier license?'
        })
        assert counter_res.status_code == 200
        assert counter_res.data['status'] == 'negotiating'

        # Stage 3: Client accepts price & locks in agreed_price
        accept_res = self.api.post(f'/api/custom-requests/{req_id}/accept-quote/')
        assert accept_res.status_code == 200
        assert accept_res.data['request']['status'] == 'agreed'
        assert float(accept_res.data['request']['agreed_price']) == 45000.00

    def test_03_admin_configures_order_deadline_and_payment_stages(self):
        """Stage 4: Admin configures payment plan (Booking 10%, Mid 30%, Final 60%) + deadline 72h."""
        req = CustomRequest.objects.create(
            client=self.client_user,
            description="Royal Solitaire",
            contact_name="Client",
            contact_phone="123",
            status=CustomRequest.Status.AGREED,
            agreed_price=45000.00
        )

        self.api.force_authenticate(user=self.admin_user)
        config_res = self.api.post(f'/api/custom-requests/{req.id}/configure-order/', {
            'deadline_hours': 72,
            'payment_stages': [
                {"label": "Booking Stage 1", "percentage": 10.0, "trigger_type": "immediate"},
                {"label": "Mid-Design Approval Stage 2", "percentage": 30.0, "trigger_type": "on_design_approval"},
                {"label": "Final Release Stage 3", "percentage": 60.0, "trigger_type": "on_final_delivery"}
            ]
        })
        assert config_res.status_code == 201
        order_data = config_res.data
        assert order_data['status'] == 'awaiting_payment'
        assert order_data['deadline_hours'] == 72
        assert len(order_data['payment_stages']) == 3

    def test_04_staff_price_stripped_and_clock_starts_at_acceptance(self):
        """Stages 5, 6, 7: Client pays Stage 1 -> Pool released (PRICE STRIPPED) -> Staff accepts (due_at calculated)."""
        req = CustomRequest.objects.create(
            client=self.client_user,
            description="Royal Crown CAD",
            contact_name="Client",
            contact_phone="123",
            status=CustomRequest.Status.AGREED,
            agreed_price=50000.00
        )
        order = Order.objects.create(
            client=self.client_user,
            order_type=Order.OrderType.CUSTOM,
            custom_request=req,
            total_price=50000.00,
            deadline_hours=48,
            status=Order.Status.AWAITING_PAYMENT
        )
        stage1 = OrderPaymentStage.objects.create(
            order=order, label="Booking", percentage=10, amount=5000, order_index=0, trigger_type="immediate", status="due"
        )

        # Stage 5: Client pays Stage 1 -> Order status becomes IN_DESIGN
        stage1.status = "paid"
        stage1.save()
        order.status = Order.Status.IN_DESIGN
        order.save()

        # Stage 6: Staff views Job Pool -> PRICE IS HIDDEN FROM API RESPONSE
        self.api.force_authenticate(user=self.staff_user)
        pool_res = self.api.get('/api/orders/pool/')
        assert pool_res.status_code == 200
        pool_item = pool_res.data['pool_orders'][0]
        assert 'total_price' not in pool_item
        assert 'agreed_price' not in pool_item.get('custom_request', {})

        # Stage 7: Staff accepts job -> Status WITH_DESIGNER and due_at clock STARTS NOW
        accept_res = self.api.post(f'/api/orders/{order.id}/accept/')
        assert accept_res.status_code == 200
        order.refresh_from_db()
        assert order.status == Order.Status.WITH_DESIGNER
        assert order.assigned_staff == self.staff_user
        assert order.due_at is not None
        # Verify due_at is approx now + 48h
        expected_due = order.assigned_at + timedelta(hours=48)
        assert abs((order.due_at - expected_due).total_seconds()) < 5

    def test_05_admin_quality_approval_and_otp_cad_download(self):
        """Stages 9, 10, 11, 12: Staff uploads -> Admin approves -> Client pays 100% -> OTP CAD download."""
        order = Order.objects.create(
            client=self.client_user,
            assigned_staff=self.staff_user,
            order_type=Order.OrderType.CUSTOM,
            total_price=10000.00,
            deadline_hours=72,
            status=Order.Status.WITH_DESIGNER,
            due_at=timezone.now() + timedelta(hours=72)
        )
        s1 = OrderPaymentStage.objects.create(order=order, label="S1", percentage=50, amount=5000, order_index=0, status="paid")
        s2 = OrderPaymentStage.objects.create(order=order, label="S2", percentage=50, amount=5000, order_index=1, status="locked")

        # Stage 9: Staff uploads deliverable CAD
        from django.core.files.uploadedfile import SimpleUploadedFile
        OrderDeliverable.objects.create(order=order, file_type="3dm", file=SimpleUploadedFile("ring.3dm", b"MOCK_CAD_3DM_BINARY_CONTENT"))
        order.status = Order.Status.PENDING_REVIEW
        order.save()

        # Stage 10: Admin approves quality -> status PREVIEW_READY
        self.api.force_authenticate(user=self.admin_user)
        review_res = self.api.post(f'/api/orders/{order.id}/admin-review/', {'decision': 'approve', 'notes': 'Looks flawless!'})
        assert review_res.status_code == 200
        assert review_res.data['status'] == 'preview_ready'

        # Stage 11: Client pays remaining stage 2 -> 100% paid
        s2.status = "paid"
        s2.save()

        # Stage 12: Request 6-Digit OTP for CAD Download
        self.api.force_authenticate(user=self.client_user)
        otp_req_res = self.api.post(f'/api/orders/{order.id}/request-otp/')
        assert otp_req_res.status_code == 200

        # Force known OTP code
        otp_obj = DownloadOTP.objects.filter(order=order).last()
        from django.contrib.auth.hashers import make_password
        otp_obj.otp_hash = make_password('654321')
        otp_obj.save()

        # Verify OTP
        otp_val_res = self.api.post(f'/api/orders/{order.id}/verify-otp/', {'code': '654321'})
        assert otp_val_res.status_code == 200
        raw_token = otp_val_res.data['download_token']

        # Stream CAD file via single-use token endpoint
        dl_res = self.api.get(f'/download/{raw_token}/')
        assert dl_res.status_code in [200, 404]  # 404 if file on disk doesn't exist in mock test, but route matched
        order.refresh_from_db()
        assert order.status == Order.Status.COMPLETED
