from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.custom_orders.models import Order
from apps.notifications.models import Notification


class Command(BaseCommand):
    help = "Checks active orders with CAD designers for 50%, 80%, and 100% deadline warnings."

    def handle(self, *args, **options):
        now = timezone.now()
        active_orders = Order.objects.filter(
            status=Order.Status.WITH_DESIGNER,
            due_at__isnull=False,
            assigned_staff__isnull=False
        ).select_related('assigned_staff', 'client', 'custom_request')

        processed_count = 0
        overdue_count = 0

        for order in active_orders:
            processed_count += 1
            assigned_at = order.assigned_at or (order.due_at - timedelta(hours=order.deadline_hours))
            total_duration = (order.due_at - assigned_at).total_seconds()

            if total_duration <= 0:
                continue

            elapsed_seconds = (now - assigned_at).total_seconds()
            percentage_elapsed = (elapsed_seconds / total_duration) * 100.0

            remaining_hours = max(0.0, (order.due_at - now).total_seconds() / 3600.0)

            # Check 1: 100% Elapsed -> Overdue
            if now > order.due_at:
                if not order.is_overdue:
                    order.is_overdue = True
                    order.save(update_fields=['is_overdue'])
                    overdue_count += 1

                    # Notify Staff Member
                    Notification.objects.create(
                        recipient=order.assigned_staff,
                        title=f"🚨 OVERDUE: Order #{order.id}",
                        message=f"Order #{order.id} has passed its completion deadline. Please submit deliverable files immediately or contact Admin.",
                        notification_type="order"
                    )
                    # Notify Admin
                    Notification.objects.create(
                        recipient=None, # Admin broadcast / general alert
                        title=f"⚠️ STAFF OVERDUE: Order #{order.id}",
                        message=f"Order #{order.id} assigned to {order.assigned_staff.username} is OVERDUE. Deadline was {order.due_at.strftime('%b %d, %H:%M')}.",
                        notification_type="order"
                    )
                    self.stdout.write(self.style.ERROR(f"Order #{order.id} marked OVERDUE."))

            # Check 2: 80% Elapsed Warning
            elif percentage_elapsed >= 80.0 and not order.warning_80_sent:
                order.warning_80_sent = True
                order.save(update_fields=['warning_80_sent'])

                Notification.objects.create(
                    recipient=order.assigned_staff,
                    title=f"⏳ Urgent Deadline Warning (80% Time Elapsed): Order #{order.id}",
                    message=f"Order #{order.id} is due in {remaining_hours:.1f} hours. Please upload your rendered preview & CAD files.",
                    notification_type="order"
                )
                self.stdout.write(self.style.WARNING(f"Order #{order.id} 80% warning sent."))

            # Check 3: 50% Elapsed Warning
            elif percentage_elapsed >= 50.0 and not order.warning_50_sent:
                order.warning_50_sent = True
                order.save(update_fields=['warning_50_sent'])

                Notification.objects.create(
                    recipient=order.assigned_staff,
                    title=f"🕒 Halfway Deadline Reminder (50% Elapsed): Order #{order.id}",
                    message=f"You are halfway through your window for Order #{order.id} — {remaining_hours:.1f} hours remaining.",
                    notification_type="order"
                )
                self.stdout.write(self.style.SUCCESS(f"Order #{order.id} 50% warning sent."))

        self.stdout.write(self.style.SUCCESS(f"Finished checking {processed_count} active orders ({overdue_count} newly marked overdue)."))
