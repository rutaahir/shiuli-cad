import json
import logging
import os
from django.http import StreamingHttpResponse, FileResponse, Http404
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ModificationType, FileEditRequest, FileEditNegotiationMessage
from .serializers import (
    ModificationTypeSerializer,
    FileEditRequestSerializer,
    FileEditNegotiationMessageSerializer
)
from apps.accounts.models import User
from apps.custom_orders.models import Order
from apps.custom_orders.services import create_notification, send_channel_message

logger = logging.getLogger(__name__)


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and (getattr(user, 'role', None) == 'admin' or user.is_staff or user.is_superuser))


class ModificationTypeViewSet(viewsets.ModelViewSet):
    serializer_class = ModificationTypeSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        if ModificationType.objects.count() == 0:
            self._auto_seed_default_types()
        user = self.request.user
        if user and user.is_authenticated and (getattr(user, 'role', None) == 'admin' or user.is_staff or user.is_superuser):
            return ModificationType.objects.all().order_by('display_order', 'id')
        return ModificationType.objects.filter(is_active=True).order_by('display_order', 'id')

    def _auto_seed_default_types(self):
        default_types = [
            ("3dm-file-editing", "3DM File Editing", "Rhino 8 native NURBS surface modification, layer organization, and feature adjustments.", 150.00, "Layers"),
            ("stl-file-editing", "STL File Editing", "Triangle mesh repairing, watertight topological fixes, and polygon sculpting.", 120.00, "Box"),
            ("size-modification", "Size Modification", "Ring size resizing (US, UK, Indian, EU), inner diameter scaling, and shank re-balancing.", 50.00, "Ruler"),
            ("weight-adjustment", "Weight Adjustment", "Gold/Metal gram weight calibration, under-gallery hollowing, and thickness optimization.", 75.00, "Scale"),
            ("stone-size-modification", "Stone Size Modification", "Adjusting stone seat dimensions, bezel boundaries, and table depths.", 80.00, "Gem"),
            ("stone-setting-modification", "Stone Setting Modification", "Switching setting styles (e.g. Prong to Bezel, Pave to Channel, Flush to Micro-Pave).", 100.00, "Sparkles"),
            ("shape-modification", "Shape Modification", "Altering ring shank profiles, halo contours, and motif outlines.", 110.00, "Edit"),
            ("add-remove-stones", "Add / Remove Stones", "Adding accent halo stones, side baguettes, or converting to solid metal band.", 90.00, "Plus"),
            ("name-initial-logo", "Name / Initial / Logo", "Embossing studio logos, hallmarks, initials, or 3D relief emblems.", 65.00, "ShieldCheck"),
            ("engraving", "Engraving Correction", "Calibrating 3D relief text, script fonts, and inside shank calligraphy.", 45.00, "FileText"),
            ("manufacturing-correction", "Manufacturing Correction", "Fixing cold-shuts, thin wall warnings, sprue gates, and prong clearance.", 130.00, "CheckCircle2"),
            ("casting-3d-printing-prep", "Casting & 3D Printing Prep", "Adding sprue feeders, shrinkage allowance (+1.25%), and Formlabs STL export.", 95.00, "Printer"),
        ]
        for idx, (key, label, desc, price, icon) in enumerate(default_types, 1):
            ModificationType.objects.get_or_create(
                key=key,
                defaults={
                    "label": label,
                    "description": desc,
                    "base_price": price,
                    "icon": icon,
                    "display_order": idx,
                    "is_active": True
                }
            )
def format_dual_currency(amount, currency='USD'):
    if amount is None:
        return 'N/A'
    try:
        val = float(amount)
        if currency == 'INR':
            inr = int(round(val))
            usd = round(val / 86.85, 2)
            return f"₹{inr:,} (≈ ${usd:.2f} USD)"
        else:
            usd = round(val, 2)
            inr = int(round(val * 86.85))
            return f"${usd:.2f} USD (≈ ₹{inr:,})"
    except Exception:
        return str(amount)


class FileEditRequestViewSet(viewsets.ModelViewSet):
    serializer_class = FileEditRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return FileEditRequest.objects.none()
        if getattr(user, 'role', None) == 'admin' or user.is_staff or user.is_superuser:
            return FileEditRequest.objects.all().order_by('-created_at')
        if getattr(user, 'role', None) == 'staff':
            return FileEditRequest.objects.none()
        return FileEditRequest.objects.filter(client=user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Handle stringified modification_types list from FormData or JSON
        mod_types = data.get('modification_types')
        if isinstance(mod_types, str):
            try:
                parsed = json.loads(mod_types)
                if hasattr(data, 'setlist'):
                    data.setlist('modification_types', parsed)
                else:
                    data['modification_types'] = parsed
            except Exception:
                pass

        # Handle file metadata
        if 'original_file' in request.FILES:
            f = request.FILES['original_file']
            filename = f.name
            ext = filename.split('.')[-1].lower() if '.' in filename else ''
            if not data.get('original_file_format'):
                data['original_file_format'] = ext
            if not data.get('original_file_name'):
                data['original_file_name'] = filename
            data['file_size_bytes'] = f.size
            data['storage_provider'] = 'local'
        elif data.get('drive_file_id'):
            data['storage_provider'] = 'gdrive'
            if not data.get('original_file_format') and data.get('original_file_name'):
                fname = data.get('original_file_name')
                data['original_file_format'] = fname.split('.')[-1].lower() if '.' in fname else '3dm'

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(client=self.request.user, status=FileEditRequest.Status.NEW)

        # Notify All Admins in Real-Time
        try:
            admin_users = User.objects.filter(role='admin')
            client_display = instance.contact_name or instance.client.get_full_name() or instance.client.username
            for admin_user in admin_users:
                create_notification(
                    recipient=admin_user,
                    title="💎 New CAD File Modification Order",
                    body=f"New file editing order #{instance.id} submitted by {client_display} ({instance.original_file_format.upper()}).",
                    notification_type="file_edit_order"
                )
            # Broadcast to channel layer if active
            send_channel_message(
                "admin_notifications",
                {
                    "type": "admin_alert",
                    "event": "new_file_edit_order",
                    "order_id": instance.id,
                    "client_name": client_display,
                    "format": instance.original_file_format,
                }
            )
        except Exception as e:
            logger.warning(f"Failed to dispatch admin notification for file edit #{instance.id}: {e}")

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    # 1. GOOGLE DRIVE RESUMABLE UPLOAD SESSION (FOR CAD FILES > 50MB)
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='gdrive-upload-session')
    def gdrive_upload_session(self, request):
        """
        Initiates a direct Google Drive resumable upload session for large CAD models (>50MB).
        Allows direct client browser streaming to Drive with zero server memory overhead.
        """
        filename = request.data.get('filename', '').strip()
        file_size = request.data.get('file_size')
        mime_type = request.data.get('mime_type', 'application/octet-stream')

        if not filename or not file_size:
            return Response({"error": "filename and file_size are required."}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(filename)[1].lower()
        if ext not in ['.3dm', '.stl', '.obj', '.step']:
            return Response({"error": f"Invalid CAD file extension '{ext}'. Allowed: .3dm, .stl, .obj, .step"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from apps.core.gdrive_service import create_resumable_upload_session
            origin = request.META.get('HTTP_ORIGIN')
            clean_filename = f"file_edit_{request.user.id}_{int(timezone.now().timestamp())}_{filename}"
            session_uri = create_resumable_upload_session(
                filename=clean_filename,
                mime_type=mime_type,
                size=int(file_size),
                origin=origin
            )
            return Response({
                "session_uri": session_uri,
                "filename": filename,
                "clean_filename": clean_filename,
                "file_size": file_size,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.warning(f"GDrive session initiation notice: {e}")
            return Response({
                "error": str(e),
                "code": "gdrive_not_configured",
                "fallback_to_local": True
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # 2. DOWNLOAD CAD FILE (HANDLES BOTH GOOGLE DRIVE AND LOCAL DISK)
    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny], url_path='download')
    def download(self, request, pk=None):
        instance = self.get_object()
        user = request.user

        # Support token authentication from query param or Authorization header for staff / client
        if not user or not user.is_authenticated:
            raw_token = request.query_params.get('token')
            if not raw_token:
                auth_hdr = request.headers.get('Authorization', '')
                if auth_hdr.startswith('Bearer '):
                    raw_token = auth_hdr.split('Bearer ')[1].strip()
            if raw_token:
                try:
                    from rest_framework_simplejwt.authentication import JWTAuthentication
                    validated = JWTAuthentication().get_validated_token(raw_token)
                    user = JWTAuthentication().get_user(validated)
                    request.user = user
                except Exception:
                    user = None

        is_admin_or_staff = bool(user and (user.is_superuser or getattr(user, 'role', None) in ['admin', 'staff'] or getattr(user, 'is_staff', False)))
        if not is_admin_or_staff and (not user or instance.client_id != user.id):
            return Response({"error": "You do not have permission to download this CAD file."}, status=status.HTTP_403_FORBIDDEN)

        file_name = instance.original_file_name or f"cad_model_{instance.id}.{instance.original_file_format}"

        if instance.storage_provider == 'gdrive' and instance.drive_file_id:
            try:
                from apps.core.gdrive_service import stream_file
                response = StreamingHttpResponse(
                    stream_file(instance.drive_file_id),
                    content_type='application/octet-stream'
                )
                response['Content-Disposition'] = f'attachment; filename="{file_name}"'
                return response
            except Exception as e:
                logger.error(f"Error streaming CAD file from Google Drive: {e}")
                return Response({"error": f"Failed to retrieve CAD asset from cloud storage: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        elif instance.original_file:
            try:
                return FileResponse(instance.original_file.open('rb'), as_attachment=True, filename=file_name)
            except Exception as e:
                return Response({"error": f"Error opening local CAD file: {e}"}, status=status.HTTP_404_NOT_FOUND)

        return Response({"error": "No CAD file available for download."}, status=status.HTTP_404_NOT_FOUND)

    # 3. ADMIN QUOTE ACTION
    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrReadOnly], url_path='quote')
    def send_quote(self, request, pk=None):
        instance = self.get_object()
        price = request.data.get('price')
        currency = request.data.get('currency', instance.currency or 'USD').upper()
        if currency not in ['USD', 'INR']:
            currency = 'USD'
        message_text = request.data.get('message', '')

        if not price:
            return Response({"error": "Price quote is required."}, status=status.HTTP_400_BAD_REQUEST)

        instance.quoted_price = price
        instance.currency = currency
        # Note: agreed_price is NOT set here; it is only set once accepted by customer or agreed upon
        instance.status = FileEditRequest.Status.QUOTED
        instance.save()

        disp = format_dual_currency(price, currency)

        # Log negotiation message
        FileEditNegotiationMessage.objects.create(
            request=instance,
            sender_type=FileEditNegotiationMessage.SenderType.ADMIN,
            message=message_text or f"Official CAD Modification Quote issued: {disp}",
            offered_price=price,
            currency=currency
        )

        # Notify Customer in Real-Time
        create_notification(
            recipient=instance.client,
            title="CAD Modification Quote Ready!",
            body=f"Shiuli CAD Studio sent an official quote of {disp} for File Edit #{instance.id}.",
            notification_type="quote_received"
        )

        return Response(FileEditRequestSerializer(instance, context={'request': request}).data)

    # 4. TWO-WAY NEGOTIATION (CLIENT OR ADMIN COUNTER-OFFER)
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='negotiate')
    def negotiate(self, request, pk=None):
        instance = self.get_object()
        user = request.user
        is_admin = bool(user.is_superuser or getattr(user, 'role', None) in ['admin', 'staff'] or user.is_staff)

        if not is_admin and instance.client_id != user.id:
            return Response({"error": "You do not have permission to negotiate on this request."}, status=status.HTTP_403_FORBIDDEN)

        counter_price = request.data.get('price')
        currency = request.data.get('currency', instance.currency or 'USD').upper()
        if currency not in ['USD', 'INR']:
            currency = 'USD'
        message_text = request.data.get('message', '')

        if not message_text and not counter_price:
            return Response({"error": "Message or counter-offer price is required."}, status=status.HTTP_400_BAD_REQUEST)

        sender_type = FileEditNegotiationMessage.SenderType.ADMIN if is_admin else FileEditNegotiationMessage.SenderType.CLIENT

        instance.status = FileEditRequest.Status.NEGOTIATING
        instance.save()

        FileEditNegotiationMessage.objects.create(
            request=instance,
            sender_type=sender_type,
            message=message_text,
            offered_price=counter_price,
            currency=currency
        )

        disp = format_dual_currency(counter_price, currency) if counter_price else 'Note added'

        # Notify Opposite Party
        if sender_type == FileEditNegotiationMessage.SenderType.ADMIN:
            create_notification(
                recipient=instance.client,
                title="New Negotiation Counter-Offer",
                body=f"Studio counter-offer for File Edit #{instance.id}: {disp}",
                notification_type="negotiation"
            )
        else:
            admin_users = User.objects.filter(role='admin')
            for admin_user in admin_users:
                create_notification(
                    recipient=admin_user,
                    title=f"Client Counter-Offer: File Edit #{instance.id}",
                    body=f"Client countered with {disp}: '{message_text}'",
                    notification_type="negotiation"
                )

        return Response(FileEditRequestSerializer(instance, context={'request': request}).data)

    # 5. ACCEPT QUOTE / OFFER (LOCKS AGREED PRICE)
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='accept-quote')
    def accept_quote(self, request, pk=None):
        instance = self.get_object()
        user = request.user
        is_admin = bool(user.is_superuser or getattr(user, 'role', None) in ['admin', 'staff'] or user.is_staff)

        if not is_admin and instance.client_id != user.id:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        if instance.status not in [FileEditRequest.Status.QUOTED, FileEditRequest.Status.NEGOTIATING, FileEditRequest.Status.NEW]:
            return Response({"error": "This file edit request cannot be accepted in its current state."}, status=status.HTTP_400_BAD_REQUEST)

        latest_offer = instance.messages.filter(offered_price__isnull=False).order_by('-created_at').first()

        # Prevent parties from accepting their own offer
        if latest_offer:
            if not is_admin and latest_offer.sender_type == FileEditNegotiationMessage.SenderType.CLIENT:
                return Response({
                    "error": "You cannot accept your own counter-offer. Please wait for Studio Admin to review and accept your offer."
                }, status=status.HTTP_400_BAD_REQUEST)
            if is_admin and latest_offer.sender_type == FileEditNegotiationMessage.SenderType.ADMIN:
                return Response({
                    "error": "You cannot accept your own quote. Awaiting customer decision."
                }, status=status.HTTP_400_BAD_REQUEST)
        elif is_admin:
            return Response({
                "error": "Cannot accept quote. Awaiting customer acceptance or counter-offer."
            }, status=status.HTTP_400_BAD_REQUEST)

        if latest_offer and latest_offer.offered_price:
            instance.agreed_price = latest_offer.offered_price
            if getattr(latest_offer, 'currency', None):
                instance.currency = latest_offer.currency
        elif not instance.agreed_price and instance.quoted_price:
            instance.agreed_price = instance.quoted_price
        elif not instance.agreed_price and instance.estimated_price_shown:
            instance.agreed_price = instance.estimated_price_shown
        else:
            instance.agreed_price = 100.00

        instance.status = FileEditRequest.Status.AGREED
        instance.save()

        disp = format_dual_currency(instance.agreed_price, instance.currency)

        # Log system message
        FileEditNegotiationMessage.objects.create(
            request=instance,
            sender_type=FileEditNegotiationMessage.SenderType.ADMIN if is_admin else FileEditNegotiationMessage.SenderType.CLIENT,
            message=f"Quote/Offer of {disp} accepted and agreed upon by {'Studio Admin' if is_admin else 'Customer'}.",
            offered_price=instance.agreed_price,
            currency=instance.currency
        )

        # Notify other party
        if is_admin:
            create_notification(
                recipient=instance.client,
                title="CAD File Edit Quote Accepted by Studio",
                body=f"Studio accepted your counter-offer of {disp} for File Edit #{instance.id}. Proceeding with CAD modifications.",
                notification_type="quote_accepted"
            )
        else:
            admin_users = User.objects.filter(role='admin')
            for admin_user in admin_users:
                create_notification(
                    recipient=admin_user,
                    title=f"Quote Accepted! File Edit #{instance.id}",
                    body=f"Client accepted the quote of {disp} for File Edit #{instance.id}.",
                    notification_type="quote_accepted"
                )

        # Sync agreed file edit to Staff Job Pool Order
        try:
            from .services import sync_file_edit_to_order_pool
            sync_file_edit_to_order_pool(instance)
        except Exception as sync_err:
            logger.warning(f"Failed to auto-sync file edit #{instance.id} to staff job pool: {sync_err}")

        return Response({
            "message": f"Quote of {disp} accepted successfully!",
            "request": FileEditRequestSerializer(instance, context={'request': request}).data
        })

    # 6. APPROVE REQUEST (ADMIN)
    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrReadOnly], url_path='approve')
    def approve(self, request, pk=None):
        instance = self.get_object()
        user = request.user
        is_admin = bool(user.is_superuser or getattr(user, 'role', None) in ['admin', 'staff'] or user.is_staff)
        if not is_admin:
            return Response({"error": "Only studio admins can approve orders."}, status=status.HTTP_403_FORBIDDEN)

        latest_offer = instance.messages.filter(offered_price__isnull=False).order_by('-created_at').first()

        # Prevent admin from unilaterally approving if quote was just sent by admin and is awaiting customer decision
        if latest_offer and latest_offer.sender_type == FileEditNegotiationMessage.SenderType.ADMIN:
            return Response({
                "error": "Cannot unilaterally approve order while awaiting customer response. The customer must review and accept, decline, or counter your quotation."
            }, status=status.HTTP_400_BAD_REQUEST)

        if instance.status == FileEditRequest.Status.QUOTED:
            return Response({
                "error": "Cannot unilaterally approve order. Studio quotation was sent to customer and is awaiting customer decision."
            }, status=status.HTTP_400_BAD_REQUEST)

        # If client made a counter-offer, approving accepts the client's counter-offer
        if latest_offer and latest_offer.sender_type == FileEditNegotiationMessage.SenderType.CLIENT and latest_offer.offered_price:
            instance.agreed_price = latest_offer.offered_price
            if getattr(latest_offer, 'currency', None):
                instance.currency = latest_offer.currency
        elif not instance.agreed_price:
            instance.agreed_price = instance.quoted_price or instance.estimated_price_shown or 100.00

        instance.status = FileEditRequest.Status.AGREED
        instance.save()

        disp = format_dual_currency(instance.agreed_price, instance.currency)

        FileEditNegotiationMessage.objects.create(
            request=instance,
            sender_type=FileEditNegotiationMessage.SenderType.ADMIN,
            message=f"Studio approved and confirmed order at agreed price of {disp}.",
            offered_price=instance.agreed_price,
            currency=instance.currency
        )

        create_notification(
            recipient=instance.client,
            title="CAD Modification Request Approved",
            body=f"Your file editing request #{instance.id} has been approved by the studio at {disp}.",
            notification_type="order_approved"
        )

        # Sync agreed file edit to Staff Job Pool Order
        try:
            from .services import sync_file_edit_to_order_pool
            sync_file_edit_to_order_pool(instance)
        except Exception as sync_err:
            logger.warning(f"Failed to auto-sync file edit #{instance.id} to staff job pool: {sync_err}")

        return Response(FileEditRequestSerializer(instance, context={'request': request}).data)

    # 7. REJECT / DECLINE REQUEST (CLIENT OR ADMIN)
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='reject')
    def reject(self, request, pk=None):
        instance = self.get_object()
        user = request.user
        is_admin = bool(user.is_superuser or getattr(user, 'role', None) in ['admin', 'staff'] or user.is_staff)

        if not is_admin and instance.client_id != user.id:
            return Response({"error": "You do not have permission to decline this request."}, status=status.HTTP_403_FORBIDDEN)

        reason = request.data.get('reason', request.data.get('rejection_reason', ''))
        if not reason:
            reason = 'Declined by customer.' if not is_admin else 'Specifications cannot be accommodated at this time.'

        instance.status = FileEditRequest.Status.REJECTED
        instance.rejection_reason = reason
        instance.save()

        sender_type = FileEditNegotiationMessage.SenderType.ADMIN if is_admin else FileEditNegotiationMessage.SenderType.CLIENT
        FileEditNegotiationMessage.objects.create(
            request=instance,
            sender_type=sender_type,
            message=f"{'Studio Admin declined' if is_admin else 'Customer declined'}: {reason}"
        )

        if is_admin:
            create_notification(
                recipient=instance.client,
                title="CAD Modification Request Declined",
                body=f"Your file editing request #{instance.id} was declined: {reason}",
                notification_type="order_rejected"
            )
        else:
            admin_users = User.objects.filter(role='admin')
            for admin_user in admin_users:
                create_notification(
                    recipient=admin_user,
                    title=f"Quote Declined: File Edit #{instance.id}",
                    body=f"Customer declined the quote for File Edit #{instance.id}. Reason: {reason}",
                    notification_type="order_rejected"
                )

        return Response(FileEditRequestSerializer(instance, context={'request': request}).data)

    # 8. UPDATE ADMIN NOTES
    @action(detail=True, methods=['post', 'patch'], permission_classes=[IsAdminOrReadOnly], url_path='update-notes')
    def update_notes(self, request, pk=None):
        instance = self.get_object()
        notes = request.data.get('notes', request.data.get('admin_notes', ''))
        instance.admin_notes = notes
        instance.save(update_fields=['admin_notes'])
        return Response({
            "status": "success",
            "id": instance.id,
            "admin_notes": instance.admin_notes,
            "message": "Notes saved successfully."
        })


