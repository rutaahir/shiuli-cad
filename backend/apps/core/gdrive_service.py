"""
Google Drive Service for Shiuli CAD Studio
Handles secure, authenticated interaction with Google Drive for private CAD asset storage.
Supports OAuth 2.0 User Authorization (for personal 15 GB Google Accounts) as well as Service Accounts.
"""

import os
import json
import time
import base64
import logging
import requests
from google.oauth2 import service_account
from google.oauth2 import credentials as user_credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from django.conf import settings

logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/drive']
CHUNK_SIZE_DEFAULT = 1024 * 1024  # 1 MB chunk


class GoogleDriveError(Exception):
    """Base exception for Google Drive storage operations."""
    pass


class GoogleDriveAuthError(GoogleDriveError):
    """Raised when Google Drive OAuth user credentials are missing, expired, or revoked."""
    pass


class GoogleDrivePermissionError(GoogleDriveError):
    """Raised when access to a Google Drive file or folder is forbidden."""
    pass


class GoogleDriveQuotaError(GoogleDriveError):
    """Raised when Google Drive quota or rate limits are reached."""
    pass


class GoogleDriveNotFoundError(GoogleDriveError):
    """Raised when a file or folder does not exist in Google Drive."""
    pass


def get_drive_credentials():
    """
    Constructs Google Drive credentials.
    Priority 1: User OAuth 2.0 Credentials (Personal Google Account with 15GB free quota).
      Loaded from GDRIVE_USER_TOKEN_JSON_PATH (e.g. credentials/gdrive-user-token.json)
      or environment variables (GDRIVE_REFRESH_TOKEN, GDRIVE_OAUTH_CLIENT_ID, GDRIVE_OAUTH_CLIENT_SECRET).
      Automatically refreshes access token using the refresh token and writes back to disk.
    Priority 2: Service Account credentials (for Google Workspace Shared Drives).
    """
    token_json_path = getattr(settings, 'GDRIVE_USER_TOKEN_JSON_PATH', '').strip()
    refresh_token = getattr(settings, 'GDRIVE_REFRESH_TOKEN', '').strip()

    # Priority 1A: Load from user OAuth token file
    if token_json_path:
        full_path = os.path.join(settings.BASE_DIR, token_json_path) if not os.path.isabs(token_json_path) else token_json_path
        if os.path.exists(full_path):
            try:
                creds = user_credentials.Credentials.from_authorized_user_file(full_path, scopes=SCOPES)
                if not creds.valid:
                    if creds.expired and creds.refresh_token:
                        try:
                            creds.refresh(Request())
                            with open(full_path, 'w', encoding='utf-8') as f:
                                f.write(creds.to_json())
                            logger.info("Successfully refreshed Google Drive user OAuth credentials.")
                        except Exception as ref_err:
                            logger.error("Failed to refresh Google Drive user token: %s", ref_err)
                            raise GoogleDriveAuthError(
                                "Google Drive authorization expired or was revoked. "
                                "Run 'python backend/manage.py setup_gdrive_oauth' to re-authorize."
                            )
                return creds
            except GoogleDriveAuthError:
                raise
            except Exception as e:
                logger.error("Error loading user credentials from %s: %s", full_path, e)

    # Priority 1B: Load from refresh token in environment
    if refresh_token:
        client_id = getattr(settings, 'GDRIVE_OAUTH_CLIENT_ID', '').strip()
        client_secret = getattr(settings, 'GDRIVE_OAUTH_CLIENT_SECRET', '').strip()

        # If client ID/secret are not explicit in settings, try reading from client secrets file
        if not (client_id and client_secret):
            client_json_path = getattr(settings, 'GDRIVE_OAUTH_CLIENT_JSON_PATH', '').strip()
            if client_json_path:
                client_full_path = os.path.join(settings.BASE_DIR, client_json_path) if not os.path.isabs(client_json_path) else client_json_path
                if os.path.exists(client_full_path):
                    try:
                        with open(client_full_path, 'r', encoding='utf-8') as f:
                            cdata = json.load(f)
                        key = 'installed' if 'installed' in cdata else 'web'
                        client_id = cdata[key].get('client_id')
                        client_secret = cdata[key].get('client_secret')
                    except Exception as e:
                        logger.error("Failed to parse client secrets: %s", e)

        if client_id and client_secret:
            try:
                creds = user_credentials.Credentials(
                    None,
                    refresh_token=refresh_token,
                    token_uri='https://oauth2.googleapis.com/token',
                    client_id=client_id,
                    client_secret=client_secret,
                    scopes=SCOPES
                )
                creds.refresh(Request())
                return creds
            except Exception as e:
                logger.error("Failed to initialize user credentials from refresh token: %s", e)
                raise GoogleDriveAuthError(
                    f"Google Drive OAuth refresh token invalid or revoked: {e}. "
                    "Run 'python backend/manage.py setup_gdrive_oauth' to re-authorize."
                )

    # Priority 2: Service Account Fallback
    sa_json_path = getattr(settings, 'GDRIVE_SERVICE_ACCOUNT_JSON_PATH', '').strip()
    sa_b64 = getattr(settings, 'GDRIVE_SERVICE_ACCOUNT_BASE64', '').strip()
    if sa_json_path:
        full_sa_path = os.path.join(settings.BASE_DIR, sa_json_path) if not os.path.isabs(sa_json_path) else sa_json_path
        if os.path.exists(full_sa_path):
            try:
                return service_account.Credentials.from_service_account_file(full_sa_path, scopes=SCOPES)
            except Exception as e:
                logger.warning("Failed to load service account: %s", e)
    if sa_b64:
        try:
            info = json.loads(base64.b64decode(sa_b64).decode('utf-8'))
            return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
        except Exception as e:
            logger.warning("Failed to load base64 service account: %s", e)

    raise GoogleDriveAuthError(
        "Google Drive OAuth authorization required. Please run 'python backend/manage.py setup_gdrive_oauth' "
        "to authorize your personal Google Drive account."
    )


def get_drive_service():
    """Builds and returns an authorized Google Drive API client."""
    creds = get_drive_credentials()
    return build('drive', 'v3', credentials=creds, cache_discovery=False)


def get_authorized_token():
    """Returns a valid access token string for direct REST requests."""
    creds = get_drive_credentials()
    if not creds.valid:
        creds.refresh(Request())
    return creds.token


def get_folder_id():
    """Returns the configured root Google Drive folder ID."""
    folder_id = getattr(settings, 'GDRIVE_FOLDER_ID', '').strip()
    if not folder_id:
        raise GoogleDriveError("GDRIVE_FOLDER_ID is not configured in settings.")
    return folder_id


def test_folder_access(folder_id=None):
    """
    Safe connectivity test that verifies OAuth credentials, folder existence,
    write capabilities, and storage quota without modifying any files.
    """
    target_folder_id = folder_id or get_folder_id()
    service = get_drive_service()

    try:
        # 1. Fetch folder metadata
        folder_meta = service.files().get(
            fileId=target_folder_id,
            fields='id, name, mimeType, capabilities, owners, trashed',
            supportsAllDrives=True
        ).execute()

        if folder_meta.get('trashed'):
            raise GoogleDriveNotFoundError(f"Configured Google Drive folder '{folder_meta.get('name')}' is in the trash.")

        if folder_meta.get('mimeType') != 'application/vnd.google-apps.folder':
            raise GoogleDriveError(f"Target ID '{target_folder_id}' is not a Google Drive folder (type: {folder_meta.get('mimeType')}).")

        can_add = folder_meta.get('capabilities', {}).get('canAddChildren', False)

        # 2. Fetch user storage quota
        about_data = service.about().get(fields='storageQuota, user').execute()
        quota = about_data.get('storageQuota', {})
        user_info = about_data.get('user', {})

        limit_bytes = int(quota.get('limit', 0)) if quota.get('limit') else None
        usage_bytes = int(quota.get('usage', 0)) if quota.get('usage') else 0

        return {
            'status': 'connected',
            'folder_id': target_folder_id,
            'folder_name': folder_meta.get('name'),
            'can_add_files': can_add,
            'owners': [o.get('emailAddress') for o in folder_meta.get('owners', [])],
            'authorized_user': user_info.get('emailAddress'),
            'storage_limit_gb': round(limit_bytes / (1024**3), 2) if limit_bytes else 'Unlimited',
            'storage_usage_gb': round(usage_bytes / (1024**3), 2),
            'storage_available_gb': round((limit_bytes - usage_bytes) / (1024**3), 2) if limit_bytes else 'N/A'
        }
    except HttpError as err:
        status_code = err.resp.status
        if status_code == 404:
            raise GoogleDriveNotFoundError(f"Folder '{target_folder_id}' not found in Google Drive.")
        elif status_code == 403:
            err_text = str(err).lower()
            if 'quota' in err_text:
                raise GoogleDriveQuotaError("Google Drive storage quota exceeded.")
            raise GoogleDrivePermissionError(
                f"Permission denied for folder '{target_folder_id}'. Ensure your authorized Google account has access to this folder."
            )
        elif status_code == 401:
            raise GoogleDriveAuthError("Google Drive authentication token expired or invalid.")
        raise GoogleDriveError(f"Google Drive API error ({status_code}): {err}")


def create_resumable_upload_session(filename, mime_type, size, origin=None):
    """
    Initiates a Google Drive resumable upload session.
    Passing the browser Origin enables CORS on Google's upload endpoint, allowing the
    browser to upload binary chunks directly to the returned session URI.
    """
    token = get_authorized_token()
    folder_id = get_folder_id()

    url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mime_type or 'application/octet-stream',
        'X-Upload-Content-Length': str(size)
    }

    if origin:
        headers['Origin'] = origin

    metadata = {
        'name': filename,
        'parents': [folder_id]
    }

    try:
        response = requests.post(url, headers=headers, json=metadata, timeout=15)
    except requests.exceptions.RequestException as req_err:
        logger.error("Network error reaching Google Drive upload endpoint: %s", req_err)
        raise GoogleDriveError(f"Network error contacting Google Drive: {req_err}")

    if response.status_code in [200, 201]:
        session_uri = response.headers.get('Location')
        if not session_uri:
            raise GoogleDriveError("Google Drive did not return a Location header for the upload session.")
        return session_uri
    elif response.status_code == 401:
        raise GoogleDriveAuthError("Google Drive authorization expired. Please re-authenticate your Google Account.")
    elif response.status_code == 403:
        err_body = response.text.lower()
        if 'quota' in err_body or 'storage' in err_body:
            raise GoogleDriveQuotaError("Google Drive storage quota exceeded.")
        raise GoogleDrivePermissionError(
            f"Google Drive permission denied. Ensure your Google account has Editor access to folder {folder_id}."
        )
    elif response.status_code == 404:
        raise GoogleDriveNotFoundError(f"Google Drive folder {folder_id} was not found.")
    else:
        logger.error("Failed to initiate resumable upload session: %s - %s", response.status_code, response.text)
        raise GoogleDriveError(f"Drive upload session initiation failed with status {response.status_code}: {response.text}")


def get_file_metadata(file_id):
    """
    Retrieves metadata for a file in Google Drive.
    Used to verify uploaded CAD files (size, md5 checksum, name, parent folder).
    """
    service = get_drive_service()
    try:
        data = service.files().get(
            fileId=file_id,
            fields='id, name, size, md5Checksum, parents, mimeType, trashed',
            supportsAllDrives=True
        ).execute()

        return {
            'id': data.get('id'),
            'name': data.get('name'),
            'size': int(data.get('size', 0)) if data.get('size') else 0,
            'md5': data.get('md5Checksum'),
            'parents': data.get('parents', []),
            'mime_type': data.get('mimeType'),
            'trashed': data.get('trashed', False)
        }
    except HttpError as err:
        logger.error("Failed to fetch metadata for file %s: %s", file_id, err)
        if err.resp.status == 404:
            raise GoogleDriveNotFoundError(f"File {file_id} not found in Google Drive.")
        elif err.resp.status == 403:
            raise GoogleDrivePermissionError(f"Access denied to file {file_id} in Google Drive.")
        raise GoogleDriveError(f"Google Drive API error: {err}")


def stream_file(file_id, chunk_size=CHUNK_SIZE_DEFAULT, max_retries=3):
    """
    Zero-RAM chunked file stream generator directly from Google Drive.
    Streams 1 MB chunks without buffering the full file into memory.
    Implements exponential backoff on 429 and 5xx errors.
    Translates 403 quota exhaustion into GoogleDriveQuotaError.
    """
    url = f'https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&supportsAllDrives=true'

    attempt = 0
    while True:
        token = get_authorized_token()
        headers = {'Authorization': f'Bearer {token}'}

        try:
            resp = requests.get(url, headers=headers, stream=True, timeout=(10, 60))

            if resp.status_code == 200:
                for chunk in resp.iter_content(chunk_size=chunk_size):
                    if chunk:
                        yield chunk
                return

            if resp.status_code == 403:
                error_body = resp.text.lower()
                logger.error("Google Drive 403 Forbidden for file %s: %s", file_id, resp.text)
                if 'quota' in error_body or 'ratelimit' in error_body or 'userratelimitexceeded' in error_body:
                    raise GoogleDriveQuotaError("Download temporarily unavailable, please try again later or contact support.")
                raise GoogleDrivePermissionError("Access to the requested CAD file in Google Drive was denied.")

            if resp.status_code == 404:
                raise GoogleDriveNotFoundError(f"File {file_id} not found in Google Drive.")

            # Retry on 429 or 5xx server errors with exponential backoff
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < max_retries:
                attempt += 1
                wait_time = 2 ** attempt
                logger.warning("Google Drive returned %s for file %s. Retrying in %ss (attempt %s/%s)...",
                               resp.status_code, file_id, wait_time, attempt, max_retries)
                time.sleep(wait_time)
                continue

            resp.raise_for_status()

        except (requests.exceptions.RequestException, GoogleDriveError) as ex:
            if isinstance(ex, (GoogleDriveQuotaError, GoogleDrivePermissionError, GoogleDriveNotFoundError, GoogleDriveAuthError)):
                raise
            if attempt < max_retries:
                attempt += 1
                wait_time = 2 ** attempt
                logger.warning("Network error streaming file %s: %s. Retrying in %ss...", file_id, ex, wait_time)
                time.sleep(wait_time)
                continue
            logger.error("Failed to stream Google Drive file %s after %s attempts: %s", file_id, attempt, ex)
            raise GoogleDriveError(f"Unable to stream CAD file from storage: {str(ex)}")


def delete_file(file_id):
    """
    Deletes a file from Google Drive.
    Ignores 404 gracefully if already removed.
    """
    if not file_id:
        return
    service = get_drive_service()
    try:
        service.files().delete(fileId=file_id, supportsAllDrives=True).execute()
        logger.info("Successfully deleted Google Drive file %s", file_id)
    except HttpError as err:
        if err.resp.status == 404:
            logger.info("Google Drive file %s was already deleted (404).", file_id)
        else:
            logger.warning("Failed to delete Google Drive file %s: %s", file_id, err)
