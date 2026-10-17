import os
import json
import logging
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from google_auth_oauthlib.flow import InstalledAppFlow
from apps.core.gdrive_service import SCOPES, test_folder_access, get_folder_id

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Authorize personal Google Drive account via OAuth 2.0 and save user credentials token."

    def add_arguments(self, parser):
        parser.add_argument(
            '--client-json',
            type=str,
            default='',
            help='Path to your Google Cloud OAuth Client credentials JSON file.'
        )
        parser.add_argument(
            '--client-id',
            type=str,
            default='',
            help='Google OAuth Client ID.'
        )
        parser.add_argument(
            '--client-secret',
            type=str,
            default='',
            help='Google OAuth Client Secret.'
        )
        parser.add_argument(
            '--token-json',
            type=str,
            default='',
            help='Output path for authorized user token JSON.'
        )
        parser.add_argument(
            '--no-browser',
            action='store_true',
            help='Run headless authorization (prompts for authorization code).'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== Google Drive Personal OAuth 2.0 Setup ==="))

        # Determine target token output path
        token_path = options['token_json'].strip() or getattr(settings, 'GDRIVE_USER_TOKEN_JSON_PATH', '').strip() or 'credentials/gdrive-user-token.json'
        token_full_path = os.path.join(settings.BASE_DIR, token_path) if not os.path.isabs(token_path) else token_path
        os.makedirs(os.path.dirname(token_full_path), exist_ok=True)

        # Determine client credentials
        client_json = options['client_json'].strip() or getattr(settings, 'GDRIVE_OAUTH_CLIENT_JSON_PATH', '').strip() or 'credentials/gdrive-oauth-client.json'
        client_full_path = os.path.join(settings.BASE_DIR, client_json) if not os.path.isabs(client_json) else client_json

        client_id = options['client_id'].strip() or getattr(settings, 'GDRIVE_OAUTH_CLIENT_ID', '').strip()
        client_secret = options['client_secret'].strip() or getattr(settings, 'GDRIVE_OAUTH_CLIENT_SECRET', '').strip()

        flow = None

        if os.path.exists(client_full_path):
            self.stdout.write(f"  [i] Found OAuth client secrets at: {client_full_path}")
            flow = InstalledAppFlow.from_client_secrets_file(client_full_path, scopes=SCOPES)
        elif client_id and client_secret:
            self.stdout.write("  [i] Using OAuth Client ID & Secret from settings/arguments.")
            client_config = {
                "installed": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token"
                }
            }
            flow = InstalledAppFlow.from_client_config(client_config, scopes=SCOPES)
        else:
            self.stdout.write(self.style.WARNING("\n[!] No OAuth client credentials found!"))
            self.stdout.write(
                f"Please place your Google Cloud OAuth Client JSON at:\n"
                f"  -> {client_full_path}\n"
                f"\nQuick Setup Instructions:\n"
                f"1. Go to Google Cloud Console (https://console.cloud.google.com)\n"
                f"2. Enable 'Google Drive API'\n"
                f"3. Go to 'Credentials' -> 'Create Credentials' -> 'OAuth client ID'\n"
                f"4. Select Application Type: 'Desktop App'\n"
                f"5. Download the JSON and save it as:\n"
                f"   '{client_full_path}'\n"
                f"6. Run 'python backend/manage.py setup_gdrive_oauth' again.\n"
            )
            return

        # Execute authorization flow
        self.stdout.write("  [>] Initiating Google OAuth authorization flow...")
        creds = None
        try:
            if options['no_browser']:
                flow.redirect_uri = 'urn:ietf:wg:oauth:2.0:oob'
                auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
                self.stdout.write("\nPlease visit this URL to authorize Shiuli CAD Studio:")
                self.stdout.write(self.style.SUCCESS(f"{auth_url}\n"))
                code = input("Enter the authorization code received from Google: ").strip()
                flow.fetch_token(code=code)
                creds = flow.credentials
            else:
                self.stdout.write("  [>] Opening default web browser for Google sign-in...")
                creds = flow.run_local_server(port=0, prompt='consent', access_type='offline')
        except Exception as flow_err:
            raise CommandError(f"OAuth authorization flow failed: {flow_err}")

        if not creds:
            raise CommandError("Failed to obtain authorized Google Drive credentials.")

        # Save credentials to token file
        with open(token_full_path, 'w', encoding='utf-8') as f:
            f.write(creds.to_json())

        self.stdout.write(self.style.SUCCESS(f"\n[+] Successfully saved user OAuth token to:\n    {token_full_path}"))

        # Verify connectivity
        try:
            folder_id = getattr(settings, 'GDRIVE_FOLDER_ID', '').strip()
            if folder_id:
                self.stdout.write("  [>] Testing Google Drive folder connection...")
                info = test_folder_access(folder_id)
                self.stdout.write(self.style.SUCCESS(
                    f"\n[✓] Connected to Google Drive successfully!\n"
                    f"    • Authorized User: {info.get('authorized_user')}\n"
                    f"    • Target Folder: {info.get('folder_name')} (ID: {info.get('folder_id')})\n"
                    f"    • Storage Available: {info.get('storage_available_gb')} GB\n"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    "\n[i] Credentials verified! Note: GDRIVE_FOLDER_ID is not configured in settings.\n"
                    "    Set GDRIVE_FOLDER_ID in backend/.env to target a specific Drive folder."
                ))
        except Exception as test_err:
            self.stdout.write(self.style.WARNING(f"\n[!] Token saved, but folder test returned: {test_err}"))
