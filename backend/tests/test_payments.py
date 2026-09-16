import pytest
from apps.accounts.models import User
from apps.custom_orders.models import Order
from apps.payments.models import Payment
from apps.payments.services import process_payment_success

@pytest.mark.django_db(transaction=True)
def test_payment_webhook_idempotency_and_pool_release():
    client = User.objects.create_user(username="client_pay", role=User.Role.CLIENT)
    order = Order.objects.create(
        client=client,
        order_type=Order.OrderType.CUSTOM,
        total_price=400.00,
        advance_amount=200.00,
        advance_paid=False,
        status=Order.Status.IN_DESIGN
    )

    payment = Payment.objects.create(
        order=order,
        payment_type=Payment.PaymentType.ADVANCE,
        amount=200.00,
        gateway_transaction_id="tx_test_12345",
        status=Payment.Status.PENDING
    )

    # First webhook execution
    processed_payment = process_payment_success(payment, "tx_test_12345")
    assert processed_payment.status == Payment.Status.SUCCESS

    order.refresh_from_db()
    assert order.advance_paid is True
    assert order.unassigned_since is not None

    # Duplicate webhook execution (idempotency check)
    second_processed = process_payment_success(processed_payment, "tx_test_12345")
    assert second_processed.status == Payment.Status.SUCCESS
    order.refresh_from_db()
    assert order.advance_paid is True
