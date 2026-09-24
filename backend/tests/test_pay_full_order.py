from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.custom_orders.models import CustomRequest, Order, OrderMilestone
from apps.payments.models import OrderPaymentStage, Payment

User = get_user_model()

class TestPayFullOrderEndpoint(TestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username="client_full_pay",
            email="client_full@example.com",
            password="Password123!",
            role="client"
        )
        self.api = APIClient()
        self.api.force_authenticate(user=self.client_user)

        self.custom_req = CustomRequest.objects.create(
            client=self.client_user,
            status=CustomRequest.Status.AGREED,
            agreed_price=2400.00
        )

        self.order = Order.objects.create(
            client=self.client_user,
            order_type=Order.OrderType.CUSTOM,
            custom_request=self.custom_req,
            total_price=2400.00,
            advance_amount=240.00,
            status=Order.Status.IN_DESIGN
        )

        self.s1 = OrderPaymentStage.objects.create(
            order=self.order,
            label="Booking Confirmation",
            percentage=10.0,
            amount=240.00,
            order_index=0,
            trigger_type="immediate",
            status=OrderPaymentStage.Status.DUE
        )
        self.s2 = OrderPaymentStage.objects.create(
            order=self.order,
            label="Design Approval Milestone",
            percentage=30.0,
            amount=720.00,
            order_index=1,
            trigger_type="on_design_approval",
            status=OrderPaymentStage.Status.LOCKED
        )
        self.s3 = OrderPaymentStage.objects.create(
            order=self.order,
            label="Final CAD Delivery",
            percentage=60.0,
            amount=1440.00,
            order_index=2,
            trigger_type="on_final_delivery",
            status=OrderPaymentStage.Status.LOCKED
        )

    def test_pay_full_order_success(self):
        url = '/api/payments/pay-full-order/'
        payload = {
            'order_id': self.order.id,
            'transaction_id': 'TXN_FULL_12345',
            'payment_method': 'upi',
            'payment_details': 'UPI Ref # 998877'
        }

        response = self.api.post(url, payload, format='json')
        self.assertEqual(response.status_code, 200)

        # Refresh order & stages from DB
        self.order.refresh_from_db()
        self.assertTrue(self.order.advance_paid)
        self.assertTrue(self.order.balance_paid)

        stages = self.order.payment_stages.all()
        for st in stages:
            self.assertEqual(st.status, OrderPaymentStage.Status.PAID)

        # Verify Payment object created with payment_type='full'
        full_payment = Payment.objects.filter(order=self.order, payment_type=Payment.PaymentType.FULL).first()
        self.assertIsNotNone(full_payment)
        self.assertEqual(float(full_payment.amount), 2400.00)
        self.assertEqual(full_payment.gateway_transaction_id, 'TXN_FULL_12345')

        # Verify OrderMilestone created
        milestone = OrderMilestone.objects.filter(order=self.order, stage__icontains='100% Full Payment Settled').first()
        self.assertIsNotNone(milestone)
