"""
Google Drive Service for Shiuli CAD Studio
Handles secure, authenticated interaction with Google Drive for private CAD asset storage.
Credentials and folder configurations are loaded exclusively from environment variables.
"""

import os
import json
import time
import base64
import logging
import requests
from google.oauth2 import service_account
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


class GoogleDriveQuotaError(GoogleDriveError):
    """Raised when Google Drive quota or rate limits are reached."""
    pass


def get_drive_credentials():
    """
    Constructs Google OAuth service account credentials from environment variables.
    Supports either:
      1. GDRIVE_SERVICE_ACCOUNT_JSON_PATH (path relative to BASE_DIR or absolute)
      2. GDRIVE_SERVICE_ACCOUNT_BASE64 (base64-encoded JSON key string)
    """
    json_path = getattr(settings, 'GDRIVE_SERVICE_ACCOUNT_JSON_PATH', '').strip()
    b64_json = getattr(settings, 'GDRIVE_SERVICE_ACCOUNT_BASE64', '').strip()

    if json_path:
        full_path = os.path.join(settings.BASE_DIR, json_path) if not os.path.isabs(json_path) else json_path
        if os.path.exists(full_path):
            return service_account.Credentials.from_service_account_file(full_path, scopes=SCOPES)
        logger.error("Service account JSON file not found at %s", full_path)

    if b64_json:
        try:
            info = json.loads(base64.b64decode(b64_json).decode('utf-8'))
            return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
        except Exception as e:
            logger.error("Failed to decode GDRIVE_SERVICE_ACCOUNT_BASE64: %s", e)

    raise GoogleDriveError(
        "Google Drive service account credentials not configured. "
        "Set GDRIVE_SERVICE_ACCOUNT_JSON_PATH or GDRIVE_SERVICE_ACCOUNT_BASE64 in your environment."
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

    response = requests.post(url, headers=headers, json=metadata, timeout=15)

    if response.status_code in [200, 201]:
        session_uri = response.headers.get('Location')
        if not session_uri:
            raise GoogleDriveError("Google Drive did not return a Location header for the upload session.")
        return session_uri
    else:
        logger.error("Failed to initiate resumable upload session: %s - %s", response.status_code, response.text)
        raise GoogleDriveError(f"Drive upload session initiation failed with status {response.status_code}")


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
            raise GoogleDriveError(f"File {file_id} not found in Google Drive.")
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

            # Check rate limiting or quota exhaustion
            if resp.status_code == 403:
                error_body = resp.text.lower()
                logger.error("Google Drive 403 Forbidden for file %s: %s", file_id, resp.text)
                if 'quota' in error_body or 'ratelimit' in error_body or 'userRateLimitExceeded' in error_body:
                    raise GoogleDriveQuotaError("Download temporarily unavailable, please try again later or contact support.")
                raise GoogleDriveError("Access to the requested CAD file in Google Drive was denied.")

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
            if isinstance(ex, GoogleDriveQuotaError):
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
