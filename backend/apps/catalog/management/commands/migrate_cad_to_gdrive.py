import os
import mimetypes
import logging
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apps.catalog.models import Product, ProductFile

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Migrates local CAD product files to private Google Drive storage."

    def add_arguments(self, parser):
        parser.add_argument(
            '--product',
            type=str,
            help='Specific product slug to migrate files for.',
            default=None
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without uploading or deleting files.',
            default=False
        )
        parser.add_argument(
            '--delete-local',
            action='store_true',
            help='Delete local disk file after successful Google Drive upload.',
            default=False
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete_local = options['delete_local']
        product_slug = options.get('product')

        self.stdout.write(self.style.NOTICE("=== Shiuli CAD: Migrate Files to Google Drive ==="))
        if dry_run:
            self.stdout.write(self.style.WARNING("Mode: DRY RUN (No modifications will be made)"))
        if delete_local:
            self.stdout.write(self.style.WARNING("Local deletion: ENABLED (disk files will be deleted upon successful upload)"))

        # Verify Google Drive credentials & folder
        try:
            from apps.core.gdrive_service import get_drive_service, get_folder_id
            service = get_drive_service()
            folder_id = get_folder_id()
            self.stdout.write(self.style.SUCCESS(f"Connected to Google Drive folder: {folder_id}"))
        except Exception as e:
            raise CommandError(f"Google Drive initialization failed: {e}")

        # Query ProductFiles requiring migration
        files_qs = ProductFile.objects.filter(
            storage_provider=ProductFile.StorageProvider.LOCAL
        ).select_related('product')

        if product_slug:
            files_qs = files_qs.filter(product__slug=product_slug)

        total_count = files_qs.count()
        if total_count == 0:
            self.stdout.write(self.style.SUCCESS("No local product files found to migrate."))
            return

        self.stdout.write(f"Found {total_count} file(s) to process.\n")

        from googleapiclient.http import MediaFileUpload

        migrated_count = 0
        skipped_count = 0
        error_count = 0
        total_bytes = 0

        for pf in files_qs:
            prod_title = pf.product.title
            slug = pf.product.slug

            if not pf.file:
                self.stdout.write(self.style.WARNING(f"[-] Skipping ID {pf.id} ({prod_title}): FileField is empty."))
                skipped_count += 1
                continue

            try:
                local_path = pf.file.path
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"[-] Skipping ID {pf.id} ({prod_title}): Cannot determine local path: {e}"))
                skipped_count += 1
                continue

            if not os.path.exists(local_path):
                self.stdout.write(self.style.ERROR(f"[!] File not found on disk: {local_path} (ProductFile ID {pf.id})"))
                error_count += 1
                continue

            file_size = os.path.getsize(local_path)
            file_name = pf.original_filename or os.path.basename(local_path)
            mime_type, _ = mimetypes.guess_type(local_path)
            mime_type = mime_type or 'application/octet-stream'

            self.stdout.write(
                f"[*] Product: {slug} | File: {file_name} ({file_size / (1024*1024):.2f} MB) | Type: {pf.file_type}"
            )

            if dry_run:
                self.stdout.write(self.style.NOTICE(f"    [DRY RUN] Would upload to Google Drive folder {folder_id}"))
                if delete_local:
                    self.stdout.write(self.style.NOTICE(f"    [DRY RUN] Would delete local file: {local_path}"))
                migrated_count += 1
                total_bytes += file_size
                continue

            # Upload to Google Drive using chunked resumable MediaFileUpload (Zero RAM buffering)
            try:
                media = MediaFileUpload(
                    local_path,
                    mimetype=mime_type,
                    resumable=True,
                    chunksize=1024 * 1024  # 1 MB chunks
                )
                file_metadata = {
                    'name': f"{slug}_{pf.file_type}_{os.path.basename(local_path)}",
                    'parents': [folder_id]
                }

                drive_file = service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id, name, size',
                    supportsAllDrives=True
                ).execute()

                drive_id = drive_file.get('id')
                if not drive_id:
                    raise Exception("Google Drive API did not return a valid file ID.")

                # Update database record
                pf.storage_provider = ProductFile.StorageProvider.GDRIVE
                pf.drive_file_id = drive_id
                pf.file_size_bytes = file_size
                if not pf.original_filename:
                    pf.original_filename = file_name

                # If delete_local, remove the local file and clear file field
                if delete_local:
                    try:
                        if os.path.exists(local_path):
                            os.remove(local_path)
                        pf.file.name = None
                    except Exception as del_err:
                        self.stdout.write(self.style.WARNING(f"    Warning: Could not remove local file {local_path}: {del_err}"))

                pf.save()

                self.stdout.write(self.style.SUCCESS(f"    [OK] Uploaded to Google Drive. Drive ID: {drive_id}"))
                migrated_count += 1
                total_bytes += file_size

            except Exception as upload_err:
                self.stdout.write(self.style.ERROR(f"    [ERROR] Failed to migrate {file_name}: {upload_err}"))
                error_count += 1

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS(f"Migration Complete: {migrated_count} migrated, {skipped_count} skipped, {error_count} errors."))
        self.stdout.write(f"Total data transferred: {total_bytes / (1024*1024):.2f} MB")
