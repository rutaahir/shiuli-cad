import logging
from django.core.management.base import BaseCommand, CommandError
from apps.core.gdrive_service import test_folder_access, GoogleDriveError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Tests connectivity and write permissions to the configured Google Drive private folder."

    def add_arguments(self, parser):
        parser.add_argument(
            '--folder-id',
            type=str,
            default=None,
            help='Optional folder ID to test (defaults to GDRIVE_FOLDER_ID in settings).'
        )

    def handle(self, *args, **options):
        folder_id = options.get('folder_id')
        self.stdout.write(self.style.NOTICE("=== Testing Google Drive Connection & Folder Access ==="))

        try:
            info = test_folder_access(folder_id)
            self.stdout.write(self.style.SUCCESS("[OK] Connection & Authentication Successful!"))
            self.stdout.write(f"Folder Name:       {info.get('folder_name')}")
            self.stdout.write(f"Folder ID:         {info.get('folder_id')}")
            self.stdout.write(f"Authorized User:   {info.get('authorized_user')}")
            self.stdout.write(f"Folder Owners:     {', '.join(info.get('owners', []))}")
            self.stdout.write(f"Storage Quota:     {info.get('storage_usage_gb')} GB used / {info.get('storage_limit_gb')} GB total ({info.get('storage_available_gb')} GB available)")
            self.stdout.write(f"Can Upload Files:  {info.get('can_add_files')}")

            if not info.get('can_add_files'):
                self.stdout.write(self.style.WARNING(
                    "Warning: The authorized user does not appear to have write/edit permissions in this folder."
                ))
            else:
                self.stdout.write(self.style.SUCCESS("[OK] Folder is writeable. Ready for CAD uploads."))

        except GoogleDriveError as err:
            self.stdout.write(self.style.ERROR(f"[FAIL] Google Drive check failed: {err}"))
            raise CommandError(str(err))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAIL] Unexpected error: {e}"))
            raise CommandError(str(e))
