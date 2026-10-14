import os
import json
import logging
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from google_auth_oauthlib.flow import InstalledAppFlow
from apps.core.gdrive_service import SCOPES, test_folder_access

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Authorizes personal Google Account via OAuth 2.0 and securely saves the refresh token."

    def add_arguments(self, parser):
        parser.add_argument(
            '--manual',
            action='store_true',
            help='Display authorization URL and prompt for code instead of launching local callback server.',
            default=False
        )
        parser.add_argument(
            '--port',
            type=int,
            default=8080,
            help='Local port for OAuth redirect server (default: 8080).'
        )

    def handle(self, *args, **options):
        manual_mode = options['manual']
        port = options['port']

        self.stdout.write(self.style.NOTICE("=== Shiuli CAD Studio: Google Drive OAuth Setup ==="))

        # 1. Locate OAuth client secrets file
        client_json_rel = getattr(settings, 'GDRIVE_OAUTH_CLIENT_JSON_PATH', 'credentials/gdrive-oauth-client.json')
        client_json_path = os.path.join(settings.BASE_DIR, client_json_rel) if not os.path.isabs(client_json_rel) else client_json_rel

        if not os.path.exists(client_json_path):
            raise CommandError(
                f"OAuth client secrets file not found at: {client_json_path}\n"
                f"Please ensure your Google OAuth client JSON is placed at this path."
            )

        self.stdout.write(f"Using client secrets from: {client_json_path}")

        # 2. Configure OAuth Flow
        try:
            flow = InstalledAppFlow.from_client_secrets_file(client_json_path, scopes=SCOPES)
        except Exception as e:
            raise CommandError(f"Failed to initialize OAuth flow: {e}")

        creds = None

        if manual_mode:
            flow.redirect_uri = "http://localhost"
            auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
            self.stdout.write("\n1. Open this URL in your browser:")
            self.stdout.write(self.style.WARNING(f"\n{auth_url}\n"))
            self.stdout.write("2. Sign in with the personal Google Account that owns your Shiuli CAD folder.")
            self.stdout.write("3. Grant permissions and copy the authorization code from the redirected URL (or page).")
            code = input("\nEnter authorization code: ").strip()
            if not code:
                raise CommandError("No authorization code provided.")
            flow.fetch_token(code=code)
            creds = flow.credentials
        else:
            self.stdout.write(
                f"\nStarting local listener on port {port}...\n"
                "A browser window will open automatically for you to sign in."
            )
            try:
                creds = flow.run_local_server(
                    port=port,
                    prompt='consent',
                    access_type='offline',
                    open_browser=True,
                    timeout_seconds=120
                )
            except Exception as srv_err:
                self.stdout.write(self.style.WARNING(f"Local server authorization encountered an issue: {srv_err}"))
                self.stdout.write(self.style.NOTICE("Switching to manual authorization URL mode..."))
                flow.redirect_uri = "http://localhost"
                auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
                self.stdout.write(self.style.WARNING(f"\nPlease open this URL:\n{auth_url}\n"))
                code = input("Enter authorization code: ").strip()
                if not code:
                    raise CommandError("No authorization code provided.")
                flow.fetch_token(code=code)
                creds = flow.credentials

        if not creds:
            raise CommandError("Failed to obtain OAuth credentials.")

        if not creds.refresh_token:
            self.stdout.write(self.style.WARNING(
                "Warning: Google did not return a refresh_token. "
                "If you previously authorized this app, go to https://myaccount.google.com/permissions, "
                "remove 'Shiuli CAD Studio', and rerun this command."
            ))

        # 3. Save authorized user credentials to target token file
        token_json_rel = getattr(settings, 'GDRIVE_USER_TOKEN_JSON_PATH', 'credentials/gdrive-user-token.json')
        token_json_path = os.path.join(settings.BASE_DIR, token_json_rel) if not os.path.isabs(token_json_rel) else token_json_rel
        os.makedirs(os.path.dirname(token_json_path), exist_ok=True)

        with open(token_json_path, 'w', encoding='utf-8') as f:
            f.write(creds.to_json())

        self.stdout.write(self.style.SUCCESS(f"\n[OK] OAuth credentials successfully saved to: {token_json_path}"))
        self.stdout.write(f"Has refresh token: {bool(creds.refresh_token)}")

        # 4. Immediate safe connectivity test
        self.stdout.write("\nTesting access to configured Google Drive folder...")
        try:
            result = test_folder_access()
            self.stdout.write(self.style.SUCCESS(f"Folder Access: SUCCESS!"))
            self.stdout.write(f"Folder Name:       {result.get('folder_name')}")
            self.stdout.write(f"Folder ID:         {result.get('folder_id')}")
            self.stdout.write(f"Authorized User:   {result.get('authorized_user')}")
            self.stdout.write(f"Storage Quota:     {result.get('storage_usage_gb')} GB used of {result.get('storage_limit_gb')} GB ({result.get('storage_available_gb')} GB free)")
            self.stdout.write(f"Can upload files:  {result.get('can_add_files')}")
            self.stdout.write(self.style.SUCCESS("\nGoogle Drive is fully configured, authorized, and ready for CAD uploads!"))
        except Exception as conn_err:
            self.stdout.write(self.style.ERROR(f"Folder connectivity test failed: {conn_err}"))
            raise CommandError(f"Folder verification failed: {conn_err}")
