import re
from django.test import TestCase, override_settings
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, DesignerApplication, StaffProfile, AccountOTP
from apps.accounts.views import generate_captcha_challenge, verify_captcha_challenge

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class StaffSelfRegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin_boss',
            email='admin@shiulicadstudio.com',
            password='adminpassword123',
            role=User.Role.ADMIN
        )

    def _parse_captcha(self, question):
        clean = question.replace('=', '').replace('?', '').strip()
        parts = clean.split('+')
        return int(parts[0].strip()) + int(parts[1].strip())

    def test_01_captcha_generation_and_verification(self):
        key, question = generate_captcha_challenge()
        self.assertTrue(key)
        self.assertTrue(question)

        ans = self._parse_captcha(question)

        # Correct answer
        self.assertTrue(verify_captcha_challenge(key, ans))
        # Wrong answer
        self.assertFalse(verify_captcha_challenge(key, ans + 99))
        # Corrupted key
        self.assertFalse(verify_captcha_challenge("fake_key", ans))

    def test_02_designer_application_submission(self):
        key, question = generate_captcha_challenge()
        ans = self._parse_captcha(question)

        fake_zip = SimpleUploadedFile("portfolio_test.zip", b"PK\x03\x04fakearchivecontent", content_type="application/zip")

        response = self.client.post('/api/auth/designer-applications/apply/', {
            'first_name': 'Rohan',
            'last_name': 'Vaidya',
            'email': 'rohan.cad@example.com',
            'phone_number': '+91 98765 12345',
            'address': 'Atelier 42, Zaveri Bazaar',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'country': 'India',
            'pincode': '400002',
            'experience': '6 years in MatrixGold & Rhino CAD. Specialist in micro-pavé solitaire rings.',
            'portfolio_link': 'https://behance.net/rohan-jewellery',
            'work_zip': fake_zip,
            'captcha_key': key,
            'captcha_answer': ans,
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(DesignerApplication.objects.filter(email='rohan.cad@example.com').exists())

        # Verify admin received notification email
        self.assertGreater(len(mail.outbox), 0)
        admin_email = mail.outbox[0]
        self.assertIn("New CAD Designer Application", admin_email.subject)
        self.assertIn("Rohan Vaidya", admin_email.body)

    def test_03_admin_approves_designer_application(self):
        app = DesignerApplication.objects.create(
            first_name='Aarav',
            last_name='Mehta',
            email='aarav.cad@example.com',
            phone_number='+91 99887 76655',
            address='Studio 10, Diamond Bourse',
            city='Surat',
            state='Gujarat',
            country='India',
            pincode='395006',
            experience='4 years Rhino CAD',
            status=DesignerApplication.Status.PENDING
        )

        mail.outbox.clear()
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(f'/api/auth/designer-applications/{app.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('generated_password'))

        app.refresh_from_db()
        self.assertEqual(app.status, DesignerApplication.Status.APPROVED)
        self.assertIsNotNone(app.created_user)
        self.assertEqual(app.created_user.role, User.Role.STAFF)
        self.assertTrue(app.created_user.is_active_staff)

        # Check StaffProfile created
        profile = StaffProfile.objects.filter(user=app.created_user).first()
        self.assertIsNotNone(profile)

        # Check approval email sent to designer with credentials
        self.assertGreater(len(mail.outbox), 0)
        staff_mail = mail.outbox[-1]
        self.assertIn(app.email, staff_mail.to)
        self.assertIn("Your CAD Designer Login is Approved", staff_mail.subject)
        self.assertIn("YOUR LOGIN CREDENTIALS", staff_mail.body)
        self.assertIn(response.data['generated_password'], staff_mail.body)

        # Verify new staff can authenticate with auto-generated password
        login_res = self.client.post('/api/auth/login/', {
            'username': app.email,
            'password': response.data['generated_password']
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertEqual(login_res.data['role'], 'staff')

    def test_04_staff_changes_password_with_email_otp(self):
        # Create approved staff
        staff_user = User.objects.create_user(
            username='aarav.cad',
            email='aarav.cad@example.com',
            password='TempPassword@123',
            role=User.Role.STAFF
        )

        # 1. Staff requests OTP
        mail.outbox.clear()
        self.client.force_authenticate(user=staff_user)
        otp_req_res = self.client.post('/api/auth/request-password-reset-otp/', {'email': staff_user.email})
        self.assertEqual(otp_req_res.status_code, status.HTTP_200_OK)

        # Check email sent with 6-digit OTP
        self.assertGreater(len(mail.outbox), 0)
        otp_email = mail.outbox[-1]
        self.assertIn(staff_user.email, otp_email.to)

        # Parse 6-digit code from email body: "code is: 123456"
        match = re.search(r'\b\d{6}\b', otp_email.body)
        self.assertIsNotNone(match)
        extracted_otp = match.group(0)

        # 2. Staff verifies OTP and updates password
        verify_res = self.client.post('/api/auth/verify-password-reset-otp/', {
            'code': extracted_otp,
            'new_password': 'PermanentNewStaffPassword!2026',
            'email': staff_user.email
        })
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)

        # 3. Staff can now log in with the new password
        self.client.logout()
        new_login = self.client.post('/api/auth/login/', {
            'username': staff_user.email,
            'password': 'PermanentNewStaffPassword!2026'
        })
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)
