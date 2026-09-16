from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.custom_orders.models import CustomRequestImage

class Command(BaseCommand):
    help = "Purges draft sketch upload images older than 24 hours that were never attached to a CustomRequest."

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Age threshold in hours for purging orphaned drafts (default: 24).'
        )

    def handle(self, *args, **options):
        hours = options['hours']
        threshold = timezone.now() - timedelta(hours=hours)

        orphans = CustomRequestImage.objects.filter(
            request__isnull=True,
            is_draft=True,
            uploaded_at__lt=threshold
        )

        count = orphans.count()
        if count > 0:
            # Delete actual file instances and DB records
            for img in orphans:
                if img.image:
                    img.image.delete(save=False)
                img.delete()
            self.stdout.write(self.style.SUCCESS(f"Purged {count} orphaned draft sketch upload(s) older than {hours} hours."))
        else:
            self.stdout.write(self.style.SUCCESS("No orphaned draft sketch uploads found to purge."))
