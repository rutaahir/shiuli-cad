import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, r'C:\Users\Harshil\OneDrive\Desktop\shiuli-cad-studio\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from apps.notifications.models import ContactMessage, Notification
from apps.accounts.models import User

def test_contact_submission():
    print("=== STARTING CONTACT FORM BACKEND TEST ===")
    client = APIClient()

    # Clear previous test data
    ContactMessage.objects.filter(email='test.jeweller@example.com').delete()

    # 1. Test Valid Submission
    valid_payload = {
        "name": "Test Jeweller",
        "email": "test.jeweller@example.com",
        "phone": "+91 9662159084",
        "subject": "Custom Design Question",
        "message": "Hello Shiuli CAD Team, I have a question regarding 18k gold mesh tolerances for a bespoke pendant."
    }

    res = client.post('/api/contact/', valid_payload, format='json')
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.data}")

    assert res.status_code == 201, f"Expected 201, got {res.status_code}"
    
    # Assert DB Row created
    contact_msg = ContactMessage.objects.filter(email='test.jeweller@example.com').first()
    assert contact_msg is not None, "FAIL: ContactMessage DB row was not created!"
    assert contact_msg.name == "Test Jeweller"
    assert contact_msg.subject == "Custom Design Question"
    print("[OK] ContactMessage DB Row created successfully.")

    # Assert Admin Notification created
    admin_notif = Notification.objects.filter(title__icontains="Contact Form Submission").first()
    assert admin_notif is not None, "FAIL: Admin Notification was not generated!"
    print(f"[OK] Admin Notification created.")

    # 2. Test Invalid Email Rejection
    invalid_payload = {
        "name": "Bad Email User",
        "email": "not-an-email",
        "subject": "General Inquiry",
        "message": "This should be rejected by server side validation."
    }
    res_bad = client.post('/api/contact/', invalid_payload, format='json')
    assert res_bad.status_code == 400, f"Expected 400 for bad email, got {res_bad.status_code}"
    print("[OK] Server-side invalid email validation PASSED.")

    # 3. Test Honeypot Spam Protection
    spam_payload = {
        "name": "Spam Bot",
        "email": "spambot@spam.com",
        "subject": "Spam Subject",
        "message": "Buy cheap stuff here http://spam.com",
        "website": "http://spambot-link.com" # Honeypot filled!
    }
    res_spam = client.post('/api/contact/', spam_payload, format='json')
    assert res_spam.status_code == 201, f"Expected 201 for honeypot, got {res_spam.status_code}"
    spam_msg = ContactMessage.objects.filter(email='spambot@spam.com').first()
    assert spam_msg is None, "FAIL: Spam bot message was saved in DB despite honeypot being triggered!"
    print("[OK] Honeypot Spam Protection PASSED: Bot submission dropped silently.")

    print("\n=== ALL CONTACT FORM BACKEND TESTS PASSED SUCCESSFULLY ===")

if __name__ == '__main__':
    test_contact_submission()
