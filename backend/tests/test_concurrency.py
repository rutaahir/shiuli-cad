import pytest
from django.utils import timezone
from apps.accounts.models import User, StaffProfile
from apps.custom_orders.models import Order
from apps.custom_orders.services import accept_order
from apps.custom_orders.exceptions import OrderAlreadyTakenError

@pytest.mark.django_db(transaction=True)
def test_accept_order_concurrency_race_condition():
    # Setup client
    client = User.objects.create_user(username="test_client", role=User.Role.CLIENT)

    # Setup two staff members
    staff1 = User.objects.create_user(username="staff_one", role=User.Role.STAFF)
    StaffProfile.objects.create(user=staff1, max_concurrent_jobs=2)

    staff2 = User.objects.create_user(username="staff_two", role=User.Role.STAFF)
    StaffProfile.objects.create(user=staff2, max_concurrent_jobs=2)

    # Create unassigned order in IN_DESIGN status with advance paid
    order = Order.objects.create(
        client=client,
        order_type=Order.OrderType.CUSTOM,
        total_price=300.00,
        advance_amount=150.00,
        advance_paid=True,
        status=Order.Status.IN_DESIGN,
        unassigned_since=timezone.now()
    )

    # Staff 1 claims the order
    assigned_order = accept_order(order.id, staff1)
    assert assigned_order.assigned_staff == staff1
    assert assigned_order.status == Order.Status.WITH_DESIGNER

    # Staff 2 attempts to claim the SAME order simultaneously
    with pytest.raises(OrderAlreadyTakenError):
        accept_order(order.id, staff2)

    # Refresh from DB and verify staff1 is still assigned
    order.refresh_from_db()
    assert order.assigned_staff == staff1
    assert order.status == Order.Status.WITH_DESIGNER
