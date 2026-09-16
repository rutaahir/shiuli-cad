import pytest
from apps.accounts.models import User
from apps.custom_orders.models import Order
from apps.custom_orders.services import complete_order
from apps.custom_orders.exceptions import InvalidOrderStateError

@pytest.mark.django_db(transaction=True)
def test_order_status_transitions():
    client = User.objects.create_user(username="client_trans", role=User.Role.CLIENT)
    staff1 = User.objects.create_user(username="staff_trans_1", role=User.Role.STAFF)
    staff2 = User.objects.create_user(username="staff_trans_2", role=User.Role.STAFF)

    # Order in IN_DESIGN cannot be completed directly
    order = Order.objects.create(
        client=client,
        order_type=Order.OrderType.CUSTOM,
        assigned_staff=staff1,
        total_price=500.00,
        status=Order.Status.IN_DESIGN
    )

    with pytest.raises(InvalidOrderStateError):
        complete_order(order.id, staff1)

    # Wrong staff member cannot complete an assigned order
    order.status = Order.Status.WITH_DESIGNER
    order.save()

    with pytest.raises(InvalidOrderStateError):
        complete_order(order.id, staff2)

    # Correct staff can complete order
    completed = complete_order(order.id, staff1)
    assert completed.status == Order.Status.COMPLETED
    assert completed.handed_over_at is not None
