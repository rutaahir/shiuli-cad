from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.custom_orders.models import Order
from apps.accounts.models import User
from apps.staff_management.models import PlatformSettings
from apps.custom_orders.services import create_notification

class Command(BaseCommand):
    help = 'Checks for unassigned orders that exceeded the escalation threshold and notifies Admins.'

    def handle(self, *args, **options):
        settings_obj = PlatformSettings.load()
        escalation_minutes = settings_obj.auto_escalation_minutes
        threshold_time = timezone.now() - timedelta(minutes=escalation_minutes)

        stale_orders = Order.objects.filter(
            status=Order.Status.IN_DESIGN,
            assigned_staff__isnull=True,
            advance_paid=True,
            unassigned_since__lte=threshold_time
        )

        admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
        count = stale_orders.count()

        if count == 0:
            self.stdout.write("No unassigned orders exceeding threshold.")
            return

        self.stdout.write(self.style.WARNING(f"Found {count} stale unassigned orders!"))

        for order in stale_orders:
            for admin in admins:
                create_notification(
                    recipient=admin,
                    title="Escalation: Unassigned Job Alert",
                    body=f"Order #{order.id} has been waiting in the pool unassigned for over {escalation_minutes} minutes.",
                    notification_type="escalation_alert",
                    related_order=order
                )
            self.stdout.write(f"Notified admins for Order #{order.id}")
