import os
import base64
import time
import hashlib
from cryptography.fernet import Fernet
from django.conf import settings
from django.core.mail import get_connection, send_mail
from django.core.mail.backends.smtp import EmailBackend
from django.utils import timezone

_EMAIL_SETTINGS_CACHE = {
    'cached_at': 0,
    'email': '',
    'password': '',
}
CACHE_TTL_SECONDS = 300  # 5 minutes in-memory cache


def get_encryption_key() -> bytes:
    """
    Returns the Fernet encryption key from environment variable SETTINGS_ENCRYPTION_KEY.
    If absent, falls back to a deterministic 32-byte key derived from settings.SECRET_KEY.
    """
    raw_key = os.getenv('SETTINGS_ENCRYPTION_KEY') or getattr(settings, 'SETTINGS_ENCRYPTION_KEY', '')
    if raw_key and len(raw_key.strip()) >= 32:
        try:
            # Validate if it's already a valid 32-byte url-safe base64 string
            Fernet(raw_key.strip().encode())
            return raw_key.strip().encode()
        except Exception:
            pass

    # Derive deterministic Fernet key using SHA-256 of SECRET_KEY
    secret = getattr(settings, 'SECRET_KEY', 'shiuli-fallback-secret-key-2026')
    digest = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_credential(plain_text: str) -> str:
    """
    Encrypts a sensitive string (e.g. Google App Password) at rest using Fernet symmetric encryption.
    """
    if not plain_text:
        return ""
    f = Fernet(get_encryption_key())
    return f.encrypt(plain_text.strip().encode('utf-8')).decode('utf-8')


def decrypt_credential(cipher_text: str) -> str:
    """
    Decrypts an encrypted credential string at runtime.
    """
    if not cipher_text:
        return ""
    try:
        f = Fernet(get_encryption_key())
        return f.decrypt(cipher_text.strip().encode('utf-8')).decode('utf-8')
    except Exception as e:
        print(f"[EMAIL SERVICE WARNING] Credential decryption failed: {e}")
        return ""


def invalidate_email_cache():
    """
    Clears the in-memory cache immediately upon settings updates.
    """
    _EMAIL_SETTINGS_CACHE['cached_at'] = 0
    _EMAIL_SETTINGS_CACHE['email'] = ''
    _EMAIL_SETTINGS_CACHE['password'] = ''


def get_active_email_credentials():
    """
    Retrieves the active SMTP email and app password.
    Priority order:
    1. In-memory cache (valid for 5 minutes)
    2. Database PlatformSettings.load() (decrypted with Fernet)
    3. Environment variables (EMAIL_HOST_USER, EMAIL_HOST_PASSWORD) as bootstrap fallback
    """
    now = time.time()
    if now - _EMAIL_SETTINGS_CACHE['cached_at'] < CACHE_TTL_SECONDS:
        cached_email = _EMAIL_SETTINGS_CACHE['email']
        cached_pass = _EMAIL_SETTINGS_CACHE['password']
        if cached_email:
            return cached_email, cached_pass

    # Attempt fetching from Database PlatformSettings
    try:
        from apps.staff_management.models import PlatformSettings
        ps = PlatformSettings.load()
        if ps.smtp_email and ps.smtp_app_password_encrypted:
            decrypted_pass = decrypt_credential(ps.smtp_app_password_encrypted)
            if decrypted_pass:
                clean_email = ps.smtp_email.strip()
                clean_pass = decrypted_pass.strip().replace(' ', '')
                _EMAIL_SETTINGS_CACHE['email'] = clean_email
                _EMAIL_SETTINGS_CACHE['password'] = clean_pass
                _EMAIL_SETTINGS_CACHE['cached_at'] = now
                return clean_email, clean_pass
    except Exception as e:
        print(f"[EMAIL SERVICE NOTICE] Could not read PlatformSettings from DB: {e}")

    # Fallback to Environment Settings
    env_user = getattr(settings, 'EMAIL_HOST_USER', '').strip()
    env_pass = getattr(settings, 'EMAIL_HOST_PASSWORD', '').strip().replace(' ', '')
    _EMAIL_SETTINGS_CACHE['email'] = env_user
    _EMAIL_SETTINGS_CACHE['password'] = env_pass
    _EMAIL_SETTINGS_CACHE['cached_at'] = now
    return env_user, env_pass


def get_dynamic_email_connection(username: str = None, password: str = None):
    """
    Instantiates an explicit Django EmailBackend using active or provided credentials,
    bypassing static global settings for multi-process runtime compatibility.
    """
    if username is not None and password is not None:
        user, pwd = username.strip(), password.strip().replace(' ', '')
    else:
        user, pwd = get_active_email_credentials()

    return get_connection(
        backend=getattr(settings, 'EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend'),
        host=getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com'),
        port=getattr(settings, 'EMAIL_PORT', 587),
        username=user,
        password=pwd,
        use_tls=getattr(settings, 'EMAIL_USE_TLS', True),
        fail_silently=False,
    )


def send_dynamic_mail(
    subject: str,
    message: str,
    recipient_list: list,
    from_email: str = None,
    html_message: str = None,
    fail_silently: bool = False
):
    """
    Replacement for django.core.mail.send_mail that dynamically routes through the active
    database or env SMTP credentials.
    """
    active_user, active_pass = get_active_email_credentials()
    connection = get_dynamic_email_connection(active_user, active_pass)

    # CRITICAL GOOGLE SMTP / GMAIL REQUIREMENT:
    # When authenticating against Google SMTP (smtp.gmail.com), the From header MUST
    # match the authenticated active_user account (e.g. 'Shiuli CAD Studio <username@gmail.com>').
    # If a view passes a legacy unauthenticated sender like 'noreply@shiulicadstudio.com',
    # Google SMTP will either reject with 553 error or recipient mailservers will drop the email
    # due to SPF/DMARC misalignment.
    if active_user:
        from_email = f"Shiuli CAD Studio <{active_user}>"
    elif not from_email:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Shiuli CAD Studio <noreply@shiulicad.com>')

    return send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=recipient_list,
        connection=connection,
        html_message=html_message,
        fail_silently=fail_silently
    )


def test_smtp_credentials(email: str, app_password: str, recipient: str = None) -> tuple[bool, str]:
    """
    Performs a live test of candidate SMTP credentials by connecting to the SMTP host,
    authenticating, and sending a real test message before persisting to the database.
    Returns (success: bool, detail: str).
    """
    clean_email = email.strip()
    clean_pass = app_password.strip().replace(' ', '')
    test_recipient = recipient.strip() if recipient else clean_email

    if not clean_email or '@' not in clean_email:
        return False, "Invalid email address format."
    if not clean_pass or len(clean_pass) < 6:
        return False, "App Password appears invalid or too short."

    try:
        connection = get_dynamic_email_connection(clean_email, clean_pass)
        test_subject = "Shiuli CAD Studio — SMTP Configuration Test Verified"
        test_body = (
            f"Greetings from Shiuli CAD Studio Atelier Administration,\n\n"
            f"This test email confirms that your outgoing SMTP credentials for {clean_email} "
            f"have been verified successfully by our server at {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}.\n\n"
            f"All transactional customer emails (OTP codes, CAD download packages, custom order updates) "
            f"will now deliver reliably using this authenticated channel.\n\n"
            f"Warm regards,\n"
            f"Shiuli CAD Studio Atelier System"
        )
        test_html = f"""
        <div style="font-family: Arial, sans-serif; background-color: #060B1E; padding: 40px 20px; color: #FAF8F3;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #0B1330; border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #F5E7A3; margin: 0; font-size: 24px; letter-spacing: 1px;">SHIULI CAD STUDIO</h1>
              <p style="color: #D4AF37; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Atelier SMTP Configuration Verified</p>
            </div>
            <div style="background-color: rgba(212,175,55,0.1); border-left: 4px solid #D4AF37; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; color: #F5E7A3; font-size: 13px; font-weight: bold;">✅ Google SMTP Authentication Succeeded</p>
            </div>
            <p style="font-size: 14px; line-height: 1.6; color: #FAF8F3;">
              This test message confirms that your outgoing Google SMTP credentials for <strong>{clean_email}</strong> have been authenticated and verified successfully by Shiuli CAD Studio.
            </p>
            <p style="font-size: 13px; line-height: 1.6; color: #C9C2A6;">
              Transactional customer emails (Staff Designer approvals, login OTPs, 3D CAD deliverable download links, and order milestones) will now deliver reliably using this authenticated channel.
            </p>
            <div style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 24px; padding-top: 16px; font-size: 11px; color: #8C9BB5; text-align: center;">
              Shiuli CAD Studio Atelier &bull; Premium Jewellery CAD Design &bull; Verified at {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
            </div>
          </div>
        </div>
        """
        send_mail(
            subject=test_subject,
            message=test_body,
            from_email=f"Shiuli CAD Studio <{clean_email}>",
            recipient_list=[test_recipient],
            connection=connection,
            html_message=test_html,
            fail_silently=False
        )
        return True, f"Live test email dispatched successfully to {test_recipient}!"
    except Exception as e:
        err_str = str(e)
        if "535" in err_str:
            detail = "Google SMTP authentication failed (535): Username or 16-character App Password not accepted. Please ensure 2-Step Verification is active on Google Account and generate an App Password under https://myaccount.google.com/apppasswords."
        elif "550" in err_str and "sending limit" in err_str.lower():
            detail = f"Google SMTP limit exceeded (550): {err_str}"
        else:
            detail = f"SMTP connection error: {err_str}"
        return False, detail


def mask_email(email: str) -> str:
    """
    Masks an email for secure presentation, e.g. 'socialbuzz31@gmail.com' -> 'so***31@gmail.com'
    """
    if not email or '@' not in email:
        return ""
    local, domain = email.split('@', 1)
    if len(local) <= 3:
        masked_local = local[0] + "***"
    else:
        masked_local = local[:2] + "***" + local[-2:]
    return f"{masked_local}@{domain}"


def build_luxury_email_html(
    headline: str,
    paragraphs: list,
    code_badge: str = None,
    badge_label: str = "SECURITY VERIFICATION CODE",
    action_button_text: str = None,
    action_button_url: str = None,
    footer_note: str = None
) -> str:
    """
    Generates a high-deliverability, luxury dark navy and gold branded HTML email template.
    """
    paragraphs_html = "".join([f'<p style="font-size: 14px; line-height: 1.6; color: #E5E7EB; margin: 0 0 16px 0;">{p}</p>' for p in paragraphs])

    badge_html = ""
    if code_badge:
        badge_html = f'''
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #060D24; border: 2px solid #D4AF37; border-radius: 14px; padding: 18px 36px; box-shadow: 0 6px 24px rgba(212,175,55,0.25);">
            <div style="font-size: 10px; font-weight: 700; color: #D4AF37; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px;">{badge_label}</div>
            <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #F5E7A3; font-family: Courier, monospace;">{code_badge}</div>
          </div>
        </div>
        '''

    btn_html = ""
    if action_button_text and action_button_url:
        btn_html = f'''
        <div style="text-align: center; margin: 24px 0;">
          <a href="{action_button_url}" style="display: inline-block; background: linear-gradient(135deg, #F5E7A3 0%, #D4AF37 50%, #B8860B 100%); color: #0B1330; font-weight: 800; font-size: 13px; text-decoration: none; padding: 14px 32px; border-radius: 12px; letter-spacing: 1px; text-transform: uppercase;">
            {action_button_text}
          </a>
        </div>
        '''

    footer_text = footer_note or "This code expires in 10 minutes. If you did not initiate this request, please disregard."

    return f'''
    <div style="font-family: Arial, Helvetica, sans-serif; background-color: #060B1E; padding: 40px 16px; color: #FAF8F3;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #0B1330; border: 1px solid rgba(212,175,55,0.35); border-radius: 20px; padding: 36px; box-shadow: 0 16px 48px rgba(0,0,0,0.6);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #F5E7A3; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px;">SHIULI CAD STUDIO</h1>
          <p style="color: #D4AF37; margin: 6px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 3px;">Jewellery Design &bull; 3D Modeling &bull; CAD Files</p>
        </div>
        <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent); margin-bottom: 24px;"></div>
        <h2 style="color: #FAF8F3; font-size: 18px; margin: 0 0 14px 0; font-weight: 700;">{headline}</h2>
        {paragraphs_html}
        {badge_html}
        {btn_html}
        <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 20px 0 0 0;">
          ⏱ {footer_text}
        </p>
        <div style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 28px; padding-top: 20px; font-size: 11px; color: #6B7280; text-align: center; line-height: 1.5;">
          Shiuli CAD Studio &bull; Precision Jewelry CAD Engineering &bull; support@shiulicad.com
        </div>
      </div>
    </div>
    '''


def send_otp_email(email: str, otp_code: str, name: str = None, purpose: str = "registration"):
    """
    Standardized, high-deliverability OTP email dispatcher with multipart MIME HTML & plain-text.
    """
    clean_email = email.strip()
    client_name = name or "Valued Client"

    if purpose == "registration":
        subject = f"Verify Your Email Address: {otp_code} — Shiuli CAD Studio"
        headline = "Complete Your Atelier Account Registration"
        paragraphs = [
            f"Hello {client_name},",
            "Welcome to Shiuli CAD Studio. To verify your email address and secure your jewellery atelier workbench access, please enter the 6-digit verification code below:",
        ]
        footer_note = "This verification code will expire in 10 minutes. If you did not initiate this registration, please disregard this email."
    elif purpose == "password_reset":
        subject = f"Password Reset Code: {otp_code} — Shiuli CAD Studio"
        headline = "Reset Your Account Password"
        paragraphs = [
            f"Hello {client_name},",
            "We received a request to reset the password for your Shiuli CAD Studio account. Enter this 6-digit verification code to complete your password update:",
        ]
        footer_note = "This code expires in 10 minutes. If you did not request a password reset, please secure your account immediately."
    elif purpose == "download_otp":
        subject = f"CAD Deliverables Access Code: {otp_code} — Shiuli CAD Studio"
        headline = "Access Your 3D CAD Production Package"
        paragraphs = [
            f"Hello {client_name},",
            "Your production-ready watertight jewellery CAD files (.3DM, .STL, 4K Renders) are ready for download. Please enter this 6-digit verification code on your order download page:",
        ]
        footer_note = "For security, this download token is valid for a single session. Contact support@shiulicad.com for assistance."
    elif purpose == "email_change":
        subject = f"Verify New Email Address: {otp_code} — Shiuli CAD Studio"
        headline = "Confirm Your New Email Address"
        paragraphs = [
            f"Hello {client_name},",
            "You requested to update the email address associated with your Shiuli CAD Studio account. To verify this email address, enter the 6-digit code below:",
        ]
        footer_note = "This code will expire in 10 minutes. If you did not request this change, please ignore this email or contact support."
    elif purpose == "purchase_otp":
        subject = f"Unlock Your CAD Download: {otp_code} — Shiuli CAD Studio"
        headline = "CAD Deliverables Verification Code"
        paragraphs = [
            f"Hello {client_name},",
            "Thank you for your purchase with Shiuli CAD Studio. Enter the 6-digit verification code below to unlock your production-ready 3D CAD deliverable package (.3DM, .STL, and High-Res Renders):",
        ]
        footer_note = "This single-use security token expires in 10 minutes."
    else:
        subject = f"Security Code: {otp_code} — Shiuli CAD Studio"
        headline = "Security Verification"
        paragraphs = [
            f"Hello {client_name},",
            "Please use the 6-digit verification code below to confirm your action:",
        ]
        footer_note = "This code will expire in 10 minutes."

    plain_message = (
        f"{paragraphs[0]}\n\n"
        f"{paragraphs[1]}\n\n"
        f"Your 6-Digit Code: {otp_code}\n\n"
        f"{footer_note}\n\n"
        "Warm regards,\nShiuli CAD Studio Engineering Team"
    )

    html_message = build_luxury_email_html(
        headline=headline,
        paragraphs=paragraphs,
        code_badge=otp_code,
        badge_label="6-DIGIT VERIFICATION CODE",
        footer_note=footer_note
    )

    return send_dynamic_mail(
        subject=subject,
        message=plain_message,
        recipient_list=[clean_email],
        html_message=html_message,
        fail_silently=False
    )

