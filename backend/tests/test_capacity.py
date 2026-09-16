import pytest
from django.utils import timezone
from apps.accounts.models import User, StaffProfile
from apps.custom_orders.models import Order
from apps.custom_orders.services import accept_order
from apps.custom_orders.exceptions import StaffAtCapacityError

@pytest.mark.django_db(transaction=True)
def test_staff_capacity_enforcement():
    client = User.objects.create_user(username="client_cap", role=User.Role.CLIENT)
    staff = User.objects.create_user(username="staff_cap", role=User.Role.STAFF)
    StaffProfile.objects.create(user=staff, max_concurrent_jobs=1)  # Max 1 active job

    # Create Job 1 already assigned and in WITH_DESIGNER status
    order1 = Order.objects.create(
        client=client,
        order_type=Order.OrderType.CUSTOM,
        assigned_staff=staff,
        total_price=200.00,
        advance_paid=True,
        status=Order.Status.WITH_DESIGNER
    )

    # Create Job 2 in pool
    order2 = Order.objects.create(
        client=client,
        order_type=Order.OrderType.CUSTOM,
        total_price=250.00,
        advance_paid=True,
        status=Order.Status.IN_DESIGN,
        unassigned_since=timezone.now()
    )

    # Staff attempts to claim order2 while at max capacity (1/1)
    with pytest.raises(StaffAtCapacityError):
        accept_order(order2.id, staff)

    # Verify order2 remains unassigned
    order2.refresh_from_db()
    assert order2.assigned_staff is None
    assert order2.status == Order.Status.IN_DESIGN
