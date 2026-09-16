import logging
from datetime import timedelta
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.accounts.models import User, StaffProfile
from apps.custom_orders.models import Order
from apps.custom_orders.exceptions import OrderAlreadyTakenError, StaffAtCapacityError, InvalidOrderStateError

logger = logging.getLogger(__name__)

def get_platform_settings():
    try:
        from apps.staff_management.models import PlatformSettings
        return PlatformSettings.load()
    except Exception:
        return None

def send_channel_message(group_name, message_data):
    """Safely send async message to Channels layer if available."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(group_name, message_data)
    except Exception as e:
        logger.warning(f"Failed to send channel message to {group_name}: {e}")

def create_notification(recipient, title, body, notification_type, related_order=None):
    """Creates a notification model record and sends via websocket."""
    try:
        from apps.notifications.models import Notification
        notification = Notification.objects.create(
            recipient=recipient,
            title=title,
            body=body,
            notification_type=notification_type,
            related_order=related_order
        )
        send_channel_message(
            f"user_{recipient.id}",
            {
                "type": "notification_message",
                "notification": {
                    "id": notification.id,
                    "title": title,
                    "body": body,
                    "notification_type": notification_type,
                    "order_id": related_order.id if related_order else None,
                    "created_at": notification.created_at.isoformat()
                }
            }
        )
        return notification
    except Exception as e:
        logger.warning(f"Failed to create notification: {e}")
        return None

def release_order_to_pool(order):
    """Releases an order to eligible staff pool."""
    order.status = Order.Status.IN_DESIGN
    order.unassigned_since = timezone.now()
    order.save()

    settings_obj = get_platform_settings()
    assignment_mode = settings_obj.assignment_mode if settings_obj else "first_accept_wins"

    # Query all active staff users
    staff_profiles = StaffProfile.objects.filter(
        user__role=User.Role.STAFF,
        user__is_active=True,
        user__is_active_staff=True
    ).select_related('user')

    eligible_staff = []
    staff_loads = {}

    for profile in staff_profiles:
        current_load = Order.objects.filter(
            assigned_staff=profile.user,
            status=Order.Status.WITH_DESIGNER
        ).count()
        if current_load < profile.max_concurrent_jobs:
            eligible_staff.append(profile.user)
            staff_loads[profile.user.id] = current_load

    if not eligible_staff:
        logger.info(f"No eligible staff available for order #{order.id}")
        return

    # Filter based on assignment_mode
    if assignment_mode == "priority_least_loaded" and eligible_staff:
        min_load = min(staff_loads[user.id] for user in eligible_staff)
        targets = [user for user in eligible_staff if staff_loads[user.id] == min_load]
    else:
        targets = eligible_staff

    for staff_user in targets:
        create_notification(
            recipient=staff_user,
            title="New Custom Job Available!",
            body=f"Order #{order.id} is available in the pool for assignment (Complete within: {order.deadline_hours}h).",
            notification_type="new_job",
            related_order=order
        )

    # Also broadcast to general staff pool group
    send_channel_message(
        "staff_pool",
        {
            "type": "job_pool_update",
            "action": "new_job_available",
            "order_id": order.id,
            "order_type": order.order_type
        }
    )

def accept_order(order_id, staff_user):
    """
    Race-condition-safe order acceptance function using database row-level locking.
    Calculates due_at = now + deadline_hours at exact moment of acceptance.
    """
    with transaction.atomic():
        order = Order.objects.select_for_update().get(id=order_id)

        if order.status != Order.Status.IN_DESIGN or order.assigned_staff is not None:
            raise OrderAlreadyTakenError("This order has already been accepted.")

        staff_profile = getattr(staff_user, 'staff_profile', None)
        max_jobs = staff_profile.max_concurrent_jobs if staff_profile else 2

        current_load = Order.objects.filter(
            assigned_staff=staff_user,
            status=Order.Status.WITH_DESIGNER
        ).count()

        if current_load >= max_jobs:
            raise StaffAtCapacityError("You are at your maximum job limit.")

        now = timezone.now()
        order.assigned_staff = staff_user
        order.status = Order.Status.WITH_DESIGNER
        order.assigned_at = now
        order.due_at = now + timedelta(hours=order.deadline_hours or 72)
        order.unassigned_since = None
        order.save()

    # OUTSIDE transaction: notify staff pool that job is taken
    notify_order_taken(order, winning_staff=staff_user)

    # Notify client that designer has taken their order
    create_notification(
        recipient=order.client,
        title="Designer Assigned!",
        body=f"CAD Designer {staff_user.username} has started working on Order #{order.id}.",
        notification_type="order_assigned",
        related_order=order
    )

    return order

def notify_order_taken(order, winning_staff):
    """Notifies staff pool via WS that job was taken."""
    send_channel_message(
        "staff_pool",
        {
            "type": "job_pool_update",
            "action": "job_taken",
            "order_id": order.id,
            "taken_by": winning_staff.username
        }
    )

def complete_order(order_id, staff_user):
    """Marks an order as completed and handed over."""
    order = Order.objects.get(id=order_id)

    if order.assigned_staff != staff_user:
        raise InvalidOrderStateError("You are not assigned to this order.")

    if order.status != Order.Status.WITH_DESIGNER:
        raise InvalidOrderStateError("Only active orders can be completed.")

    order.status = Order.Status.COMPLETED
    order.handed_over_at = timezone.now()
    order.save()

    # Create settlement record automatically
    try:
        from apps.payments.models import Settlement
        Settlement.objects.get_or_create(
            order=order,
            staff=staff_user,
            defaults={
                'amount': order.total_price * 0.70,  # e.g., 70% payouts to staff
                'status': Settlement.Status.PENDING
            }
        )
    except Exception as e:
        logger.warning(f"Could not create settlement record: {e}")

    # Notify client
    create_notification(
        recipient=order.client,
        title="Order Completed!",
        body=f"Your CAD design for Order #{order.id} is ready for download.",
        notification_type="order_completed",
        related_order=order
    )

    return order
