import json
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.file_edits.models import FileEditRequest, FileEditNegotiationMessage

User = get_user_model()

class FileEditLifecycleTestCase(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin_tester',
            email='admin@atelier.com',
            password='Password123!',
            role='admin'
        )
        self.client_user = User.objects.create_user(
            username='client_tester',
            email='client@customer.com',
            password='Password123!',
            role='client'
        )

        self.admin_api = APIClient()
        self.admin_api.force_authenticate(user=self.admin)

        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.client_user)

        # Create a new FileEditRequest submitted by customer
        self.file_edit = FileEditRequest.objects.create(
            client=self.client_user,
            contact_name="Client Tester",
            contact_email="client@customer.com",
            original_file_format="3dm",
            original_file_name="ring_repair.3dm",
            file_size_bytes=10240,
            status=FileEditRequest.Status.NEW
        )

    def test_quote_and_counter_lifecycle(self):
        fe_id = self.file_edit.id

        # 1. Admin sends quote of 500
        quote_res = self.admin_api.post(f'/api/file-edits/requests/{fe_id}/quote/', {
            'price': 500.00,
            'message': 'Official Studio Quote for Rhino SubD repair'
        })
        self.assertEqual(quote_res.status_code, 200)
        self.file_edit.refresh_from_db()
        self.assertEqual(self.file_edit.status, FileEditRequest.Status.QUOTED)
        self.assertEqual(self.file_edit.quoted_price, Decimal('500.00'))
        # agreed_price must NOT be set until agreed
        self.assertIsNone(self.file_edit.agreed_price)

        # 2. Admin tries to accept their own quote -> Must fail with 400
        admin_accept_res = self.admin_api.post(f'/api/file-edits/requests/{fe_id}/accept-quote/')
        self.assertEqual(admin_accept_res.status_code, 400)
        self.assertIn("You cannot accept your own quote", admin_accept_res.data.get('error', ''))

        # 3. Admin tries to unilaterally approve order while in QUOTED state -> Must fail with 400
        admin_approve_res = self.admin_api.post(f'/api/file-edits/requests/{fe_id}/approve/')
        self.assertEqual(admin_approve_res.status_code, 400)
        self.assertIn("Cannot unilaterally approve order", admin_approve_res.data.get('error', ''))

        # 4. Customer counters with 400
        counter_res = self.client_api.post(f'/api/file-edits/requests/{fe_id}/negotiate/', {
            'price': 400.00,
            'message': 'Can you do 400?'
        })
        self.assertEqual(counter_res.status_code, 200)
        self.file_edit.refresh_from_db()
        self.assertEqual(self.file_edit.status, FileEditRequest.Status.NEGOTIATING)

        # 5. Customer tries to accept their own counter-offer -> Must fail with 400
        client_accept_own_res = self.client_api.post(f'/api/file-edits/requests/{fe_id}/accept-quote/')
        self.assertEqual(client_accept_own_res.status_code, 400)
        self.assertIn("You cannot accept your own counter-offer", client_accept_own_res.data.get('error', ''))

        # 6. Admin accepts Customer's counter-offer of 400 -> Must succeed!
        admin_accept_counter_res = self.admin_api.post(f'/api/file-edits/requests/{fe_id}/accept-quote/')
        self.assertEqual(admin_accept_counter_res.status_code, 200)
        self.file_edit.refresh_from_db()
        self.assertEqual(self.file_edit.status, FileEditRequest.Status.AGREED)
        self.assertEqual(self.file_edit.agreed_price, Decimal('400.00'))

    def test_client_accepts_admin_quote_directly(self):
        fe_id = self.file_edit.id

        # Admin quotes 600
        self.admin_api.post(f'/api/file-edits/requests/{fe_id}/quote/', {
            'price': 600.00,
            'message': 'Delivery in 24h'
        })

        # Client accepts admin quote
        res = self.client_api.post(f'/api/file-edits/requests/{fe_id}/accept-quote/')
        self.assertEqual(res.status_code, 200)
        self.file_edit.refresh_from_db()
        self.assertEqual(self.file_edit.status, FileEditRequest.Status.AGREED)
        self.assertEqual(self.file_edit.agreed_price, Decimal('600.00'))

    def test_client_declines_admin_quote(self):
        fe_id = self.file_edit.id

        # Admin quotes 750
        self.admin_api.post(f'/api/file-edits/requests/{fe_id}/quote/', {
            'price': 750.00,
            'message': 'Quote 750'
        })

        # Client declines quote
        res = self.client_api.post(f'/api/file-edits/requests/{fe_id}/reject/', {
            'reason': 'Budget exceeded'
        })
        self.assertEqual(res.status_code, 200)
        self.file_edit.refresh_from_db()
        self.assertEqual(self.file_edit.status, FileEditRequest.Status.REJECTED)
        self.assertEqual(self.file_edit.rejection_reason, 'Budget exceeded')

    def test_currency_conversion_usd_and_inr(self):
        fe_id = self.file_edit.id

        # 1. Admin quotes $10 USD
        res = self.admin_api.post(f'/api/file-edits/requests/{fe_id}/quote/', {
            'price': 10.00,
            'currency': 'USD',
            'message': 'Quote 10 USD'
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['currency'], 'USD')
        self.assertEqual(res.data['quoted_price'], '10.00')
        self.assertEqual(res.data['quoted_price_usd'], 10.0)
        self.assertIn(res.data['quoted_price_inr'], [868, 869])  # 10 * 86.85 = 868.5

        # 2. Client counters in INR (e.g. 700 INR)
        res_counter = self.client_api.post(f'/api/file-edits/requests/{fe_id}/negotiate/', {
            'price': 700.00,
            'currency': 'INR',
            'message': 'Can you do ₹700?'
        })
        self.assertEqual(res_counter.status_code, 200)
        self.file_edit.refresh_from_db()
        latest_msg = self.file_edit.messages.last()
        self.assertEqual(latest_msg.currency, 'INR')
        self.assertEqual(latest_msg.offered_price, Decimal('700.00'))

        # 3. Admin accepts client counter-offer in INR
        accept_res = self.admin_api.post(f'/api/file-edits/requests/{fe_id}/accept-quote/')
        self.assertEqual(accept_res.status_code, 200)
        self.file_edit.refresh_from_db()
        self.assertEqual(self.file_edit.status, FileEditRequest.Status.AGREED)
        self.assertEqual(self.file_edit.agreed_price, Decimal('700.00'))
        self.assertEqual(self.file_edit.currency, 'INR')
        # Check serializer conversion
        serialized = accept_res.data.get('request', {})
        self.assertEqual(serialized.get('agreed_price_inr'), 700)
        self.assertAlmostEqual(serialized.get('agreed_price_usd'), round(700 / 86.85, 2))

