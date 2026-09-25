from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from apps.accounts.models import User
from apps.core.permissions import IsAdmin
from .models import Notification, ContactMessage
from .serializers import NotificationSerializer, ContactMessageSerializer

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True)

        return Response({
            "message": f"Marked {updated_count} notifications as read.",
            "updated_count": updated_count
        })


class ContactMessageViewSet(viewsets.ModelViewSet):
    queryset = ContactMessage.objects.all().order_by('-created_at')
    serializer_class = ContactMessageSerializer
    permission_classes = [permissions.AllowAny]

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.AllowAny()]
        return [IsAdmin()]

    def create(self, request, *args, **kwargs):
        # 1. Honeypot check (Spam Protection)
        honeypot_val = request.data.get('website') or request.data.get('company_url')
        if honeypot_val:
            return Response(
                {"message": "Thank you! Your message has been received."},
                status=status.HTTP_201_CREATED
            )

        name = (request.data.get('name') or '').strip()
        email = (request.data.get('email') or '').strip()
        phone = (request.data.get('phone') or '').strip()
        subject = (request.data.get('subject') or 'General Inquiry').strip()
        message = (request.data.get('message') or '').strip()

        # Extract client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

        # 2. Server-Side Field Validation
        errors = {}
        if not name:
            errors['name'] = ["Full Name is required."]

        if not email:
            errors['email'] = ["Email Address is required."]
        else:
            try:
                validate_email(email)
            except ValidationError:
                errors['email'] = ["Enter a valid email address."]

        if not message or len(message) < 10:
            errors['message'] = ["Message must be at least 10 characters long."]

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # 3. Save ContactMessage DB Record
        contact_msg = ContactMessage.objects.create(
            name=name,
            email=email,
            phone=phone,
            subject=subject,
            message=message,
            ip_address=ip_address
        )

        # 4. Alert Admin Dashboard via real-time Notification records
        admin_users = User.objects.filter(role='admin')
        for admin_user in admin_users:
            Notification.objects.create(
                recipient=admin_user,
                title=f"📩 Contact Form Submission: {subject}",
                body=f"From {name} ({email}): {message[:120]}...",
                notification_type="contact_inquiry"
            )

        # 5. Dispatch email alerts via dynamic SMTP service
        try:
            from apps.core.email_service import send_dynamic_mail, get_active_email_credentials
            active_email, _ = get_active_email_credentials()
            if active_email:
                send_dynamic_mail(
                    subject=f"📩 New Inquiry: {subject}",
                    message=(
                        f"You received a new inquiry from {name} ({email}, {phone}):\n\n"
                        f"Subject: {subject}\n\n"
                        f"{message}\n\n"
                        f"---\nSent via Shiuli CAD Studio Contact Gateway"
                    ),
                    recipient_list=[active_email],
                    fail_silently=True
                )
            if email:
                send_dynamic_mail(
                    subject="Shiuli CAD Studio — We Received Your Inquiry",
                    message=(
                        f"Dear {name},\n\n"
                        f"Thank you for reaching out to Shiuli CAD Studio. We have received your inquiry regarding '{subject}'.\n\n"
                        f"A member of our bespoke jewellery CAD design team will review your message and reply promptly.\n\n"
                        f"Warm regards,\n"
                        f"Shiuli CAD Studio Team"
                    ),
                    recipient_list=[email],
                    fail_silently=True
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Could not dispatch contact emails: {e}")

        serializer = self.get_serializer(contact_msg)
        return Response({
            "message": f"Thank you, {name}! Your message has been received.",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)


    @action(detail=True, methods=['post', 'patch'], permission_classes=[IsAdmin], url_path='read')
    def mark_read(self, request, pk=None):
        contact_msg = self.get_object()
        is_read_val = request.data.get('is_read', True)
        contact_msg.is_read = bool(is_read_val)
        contact_msg.save()
        return Response(ContactMessageSerializer(contact_msg).data)


