from decimal import Decimal
import secrets
from datetime import timedelta
from django.http import FileResponse
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from apps.core.email_service import send_dynamic_mail as send_mail, send_otp_email, build_luxury_email_html
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsClient, IsStaff, IsAdmin, IsStaffOrAdmin
from apps.accounts.models import User
from apps.staff_management.models import PlatformSettings
from apps.payments.models import OrderPaymentStage
from .models import (
    CustomRequest, NegotiationMessage, Order, OrderMilestone, OrderDeliverable,
    RevisionRequest, AestheticStyle, MetalAlloy, GemstoneOption, PricingRule,
    CustomRequestGemstone, CustomRequestImage, OptionGroup, OptionValue,
    CustomRequestSelection, CustomRequestStone
)
from .serializers import (
    CustomRequestSerializer,
    NegotiationMessageSerializer,
    OrderSerializer,
    StaffOrderSerializer,
    AdminOrderSerializer,
    ClientOrderSerializer,
    OrderMilestoneSerializer,
    OrderDeliverableSerializer,
    RevisionRequestSerializer,
    AestheticStyleSerializer,
    MetalAlloySerializer,
    GemstoneOptionSerializer,
    PricingRuleSerializer,
    CustomRequestImageSerializer,
    OptionGroupSerializer,
    OptionValueSerializer
)
from .services import accept_order, complete_order, release_order_to_pool, create_notification


def generate_6digit_otp():
    """Generates a cryptographically secure 6-digit integer string."""
    return f"{secrets.randbelow(900000) + 100000}"


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', None) == 'admin')


class OptionGroupViewSet(viewsets.ModelViewSet):
    queryset = OptionGroup.objects.all().order_by('display_order', 'id')
    serializer_class = OptionGroupSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None


class OptionValueViewSet(viewsets.ModelViewSet):
    queryset = OptionValue.objects.all().order_by('display_order', 'id')
    serializer_class = OptionValueSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Check protection against in-use options
        selection_count = instance.customrequestselection_set.count() if hasattr(instance, 'customrequestselection_set') else instance.selections.count() if hasattr(instance, 'selections') else 0
        delivery_count = instance.delivery_requests.count() if hasattr(instance, 'delivery_requests') else 0
        total_used = selection_count + delivery_count

        if total_used > 0:
            return Response(
                {"error": f"This option is used by {total_used} past request(s) — deactivate it (set is_active=False) instead of deleting."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class AestheticStyleViewSet(viewsets.ModelViewSet):
    queryset = AestheticStyle.objects.all()
    serializer_class = AestheticStyleSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None


class MetalAlloyViewSet(viewsets.ModelViewSet):
    queryset = MetalAlloy.objects.all()
    serializer_class = MetalAlloySerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None


class GemstoneOptionViewSet(viewsets.ModelViewSet):
    queryset = GemstoneOption.objects.all()
    serializer_class = GemstoneOptionSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None


class PricingRuleViewSet(viewsets.ModelViewSet):
    queryset = PricingRule.objects.all()
    serializer_class = PricingRuleSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None


class CustomRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CustomRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ['create', 'estimate', 'upload_sketch']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return CustomRequest.objects.none()

        mode = self.request.query_params.get('request_mode')

        # Admin and Staff (Lead CAD Engineers) can view all custom design requests
        if getattr(user, 'role', None) in ['admin', 'staff'] or getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
            qs = CustomRequest.objects.all().order_by('-created_at')
            if mode:
                qs = qs.filter(request_mode=mode)
            return qs

        # Strictly scope to the logged-in client's own requests
        user_email = (user.email or '').strip()
        if user_email:
            qs = CustomRequest.objects.filter(
                Q(client=user) | Q(contact_email__iexact=user_email)
            ).order_by('-created_at').distinct()
        else:
            qs = CustomRequest.objects.filter(client=user).order_by('-created_at')

        if mode:
            qs = qs.filter(request_mode=mode)
        return qs

    def perform_create(self, serializer):
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        if not user:
            from apps.accounts.models import User
            contact_email = serializer.validated_data.get('contact_email') or self.request.data.get('contact_email')
            if contact_email:
                user = User.objects.filter(email__iexact=str(contact_email).strip()).first()
            if not user:
                user = User.objects.filter(role='client').first()
        serializer.save(client=user, status=CustomRequest.Status.NEW)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny], url_path='upload-sketch')
    def upload_sketch(self, request):
        file_obj = request.FILES.get('image') or request.FILES.get('sketch') or request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No image or CAD file provided."}, status=status.HTTP_400_BAD_REQUEST)

        sketch = CustomRequestImage.objects.create(image=file_obj, is_draft=True)
        return Response(
            CustomRequestImageSerializer(sketch, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny], url_path='estimate')
    def estimate(self, request):
        category_id = request.data.get('category_id') or request.data.get('category')
        option_value_ids = request.data.get('option_value_ids') or request.data.get('selected_value_ids') or []
        selections = request.data.get('selections', [])
        stones = request.data.get('stones') or request.data.get('gemstones') or []
        is_metal_only = request.data.get('is_metal_only', False)
        delivery_speed_id = request.data.get('delivery_speed_id') or request.data.get('delivery_speed')

        breakdown = []

        base_price = 150.00
        if category_id:
            try:
                rule = PricingRule.objects.get(category_id=category_id)
                base_price = float(rule.base_price)
            except PricingRule.DoesNotExist:
                base_price = 150.00
        breakdown.append({"label": "Base CAD Construction Rate", "amount": base_price})

        # Collect option value IDs from selections array if passed
        if selections and isinstance(selections, list):
            for sel in selections:
                if isinstance(sel, dict) and sel.get('value'):
                    val_id = sel.get('value')
                    if val_id and val_id not in option_value_ids:
                        option_value_ids.append(val_id)

        if delivery_speed_id and delivery_speed_id not in option_value_ids:
            option_value_ids.append(delivery_speed_id)

        flat_modifiers_sum = 0.0
        percent_multiplier = 1.0

        if option_value_ids:
            option_vals = OptionValue.objects.filter(id__in=option_value_ids, is_active=True)
            for val in option_vals:
                mod_val = float(val.price_modifier)
                if val.modifier_type == OptionValue.ModifierType.PERCENT:
                    if mod_val > 0:
                        percent_multiplier += (mod_val / 100.0)
                        breakdown.append({"label": f"{val.group.label}: {val.label} (+{mod_val}%)", "amount": 0})
                else:
                    if mod_val != 0:
                        flat_modifiers_sum += mod_val
                        breakdown.append({"label": f"{val.group.label}: {val.label}", "amount": mod_val})

        # Stones calculation
        stones_total = 0.0
        if not is_metal_only and stones and isinstance(stones, list):
            for st in stones:
                if isinstance(st, dict):
                    qty = int(st.get('quantity', 1))
                    unit_cost = 25.0
                    stone_label = st.get('stone_type', 'Gemstone')
                    stone_size = st.get('size_value') or ''
                    stone_unit = st.get('size_unit') or 'carat'
                    
                    cost = qty * unit_cost
                    stones_total += cost
                    breakdown.append({
                        "label": f"Stone: {qty}x {stone_label} ({stone_size} {stone_unit})",
                        "amount": cost
                    })

        subtotal = (base_price + flat_modifiers_sum + stones_total)
        total_estimated = round(subtotal * percent_multiplier, 2)

        return Response({
            "estimated_price": total_estimated,
            "currency": "INR",
            "breakdown": breakdown
        })

    # STAGE 2 — ADMIN OR STAFF REVIEWS & SENDS OFFICIAL PRICE QUOTE
    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='quote')
    def send_quote(self, request, pk=None):
        custom_req = self.get_object()
        price = request.data.get('price')
        message_text = request.data.get('message', '')

        if not price:
            return Response({"error": "Price quote is required."}, status=status.HTTP_400_BAD_REQUEST)

        custom_req.agreed_price = price
        custom_req.status = CustomRequest.Status.QUOTED
        custom_req.save()

        NegotiationMessage.objects.create(
            request=custom_req,
            sender_type=NegotiationMessage.SenderType.ADMIN,
            message=message_text or f"Official Quote issued for ₹{price}",
            offered_price=price
        )

        create_notification(
            recipient=custom_req.client,
            title="Design Quote Ready!",
            body=f"Studio sent an official quote of ₹{price} for Custom Request #{custom_req.id}.",
            notification_type="quote_received",
            related_order=None
        )

        return Response(CustomRequestSerializer(custom_req, context={'request': request}).data)

    # STAGE 3 — TWO-WAY NEGOTIATION (CLIENT OR ADMIN/STAFF COUNTER)
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='negotiate')
    def negotiate(self, request, pk=None):
        custom_req = self.get_object()
        counter_price = request.data.get('price')
        message_text = request.data.get('message', '')

        if not message_text and not counter_price:
            return Response({"error": "Message or counter-offer price is required."}, status=status.HTTP_400_BAD_REQUEST)

        sender_type = NegotiationMessage.SenderType.ADMIN if getattr(request.user, 'role', None) in ['admin', 'staff'] else NegotiationMessage.SenderType.CLIENT

        custom_req.status = CustomRequest.Status.NEGOTIATING
        if counter_price:
            custom_req.agreed_price = counter_price
        custom_req.save()

        NegotiationMessage.objects.create(
            request=custom_req,
            sender_type=sender_type,
            message=message_text,
            offered_price=counter_price
        )

        # Notify other party
        recipient = custom_req.client if sender_type == NegotiationMessage.SenderType.ADMIN else None
        if recipient:
            create_notification(
                recipient=recipient,
                title="New Negotiation Counter-Offer",
                body=f"New counter offer for Request #{custom_req.id}: ₹{counter_price or 'Note added'}",
                notification_type="negotiation"
            )

        return Response(CustomRequestSerializer(custom_req, context={'request': request}).data)

    # ADMIN CALL & CONSULTATION NOTES (SAVED PER PARTICULAR ORDER/REQUEST)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[permissions.IsAuthenticated], url_path='update-notes')
    def update_notes(self, request, pk=None):
        custom_req = self.get_object()
        notes = request.data.get('admin_call_notes', request.data.get('notes', ''))
        custom_req.admin_call_notes = notes
        custom_req.save(update_fields=['admin_call_notes'])

        # Keep linked Order in sync if existing
        if hasattr(custom_req, 'order') and custom_req.order:
            try:
                custom_req.order.admin_call_notes = notes
                custom_req.order.save(update_fields=['admin_call_notes'])
            except Exception:
                pass

        return Response({
            "status": "success",
            "id": custom_req.id,
            "admin_call_notes": custom_req.admin_call_notes,
            "message": f"Admin notes saved for Request #{custom_req.id}"
        })

    # STAGE 3 — ACCEPT QUOTE / OFFER (LOCKS AGREED_PRICE)
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='accept-quote')
    def accept_quote(self, request, pk=None):
        custom_req = self.get_object()
        if custom_req.status not in [CustomRequest.Status.QUOTED, CustomRequest.Status.NEGOTIATING]:
            return Response({"error": "Custom request cannot be accepted in its current state."}, status=status.HTTP_400_BAD_REQUEST)

        is_admin = getattr(request.user, 'role', None) in ['admin', 'staff'] or request.user.is_superuser
        latest_offer = custom_req.messages.filter(offered_price__isnull=False).order_by('-created_at').first()

        # Prevent parties from accepting their own offer
        if latest_offer:
            if not is_admin and latest_offer.sender_type == NegotiationMessage.SenderType.CLIENT:
                return Response({"error": "You cannot accept your own counter-offer. Please wait for SuperAdmin to review and accept your offer."}, status=status.HTTP_400_BAD_REQUEST)
            if is_admin and latest_offer.sender_type == NegotiationMessage.SenderType.ADMIN:
                return Response({"error": "You cannot accept your own quote. Awaiting client decision."}, status=status.HTTP_400_BAD_REQUEST)

        custom_req.status = CustomRequest.Status.AGREED
        if latest_offer and latest_offer.offered_price:
            custom_req.agreed_price = latest_offer.offered_price
        elif not custom_req.agreed_price:
            custom_req.agreed_price = custom_req.estimated_price_shown or 100.00
        custom_req.save()

        # Automatically create Order & default payment stages if not existing, and release to staff job pool
        from apps.payments.models import OrderPaymentStage
        total_price = float(custom_req.agreed_price)
        comm_pct = custom_req.admin_commission_percentage if custom_req.admin_commission_percentage is not None else 20.00
        payout_price = round(total_price * (100.0 - float(comm_pct)) / 100.0, 2)
        advance_amount = round(total_price * 0.10, 2)

        if not hasattr(custom_req, 'order') or not custom_req.order:
            order = Order.objects.create(
                client=custom_req.client,
                order_type=Order.OrderType.CUSTOM,
                custom_request=custom_req,
                total_price=total_price,
                admin_commission_percentage=comm_pct,
                staff_payout_price=payout_price,
                advance_amount=advance_amount,
                deadline_hours=72,
                status=Order.Status.IN_DESIGN,
                unassigned_since=timezone.now()
            )
            OrderPaymentStage.objects.create(order=order, label="Booking Confirmation", percentage=10.0, amount=advance_amount, order_index=0, trigger_type="immediate", status=OrderPaymentStage.Status.DUE)
            OrderPaymentStage.objects.create(order=order, label="Design Approval Milestone", percentage=30.0, amount=round(total_price * 0.30, 2), order_index=1, trigger_type="on_design_approval", status=OrderPaymentStage.Status.LOCKED)
            OrderPaymentStage.objects.create(order=order, label="Final CAD Delivery", percentage=60.0, amount=round(total_price * 0.60, 2), order_index=2, trigger_type="on_final_delivery", status=OrderPaymentStage.Status.LOCKED)
        else:
            order = custom_req.order
            order.total_price = total_price
            order.admin_commission_percentage = comm_pct
            order.staff_payout_price = payout_price
            order.advance_amount = advance_amount
            order.status = Order.Status.IN_DESIGN
            order.unassigned_since = timezone.now()
            order.save()

        release_order_to_pool(order)

        return Response({
            "message": "Quote accepted! Order created and released to Staff Job Pool.",
            "request": CustomRequestSerializer(custom_req, context={'request': request}).data
        })

    # STAGE 4 — ADMIN SETS THE PAYMENT PLAN + COMPLETION DEADLINE
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='configure-order')
    def configure_order(self, request, pk=None):
        from apps.payments.models import OrderPaymentStage
        custom_req = self.get_object()

        if custom_req.status != CustomRequest.Status.AGREED:
            return Response({"error": "Request must be in 'AGREED' status before order configuration."}, status=status.HTTP_400_BAD_REQUEST)

        if not custom_req.agreed_price:
            return Response({"error": "Agreed price is required to configure order."}, status=status.HTTP_400_BAD_REQUEST)

        deadline_hours = int(request.data.get('deadline_hours', 72))
        stages_data = request.data.get('payment_stages')

        # Default payment plan if not specified: Booking 10%, Mid 30%, Final 60%
        if not stages_data or not isinstance(stages_data, list):
            stages_data = [
                {"label": "Booking Advance (10%)", "percentage": 10.0, "trigger_type": "immediate"},
                {"label": "Mid-Project Review (30%)", "percentage": 30.0, "trigger_type": "on_design_approval"},
                {"label": "Final CAD Delivery (60%)", "percentage": 60.0, "trigger_type": "on_final_delivery"},
            ]

        # Verify percentages sum to 100%
        total_percentage = sum(float(s.get('percentage', 0)) for s in stages_data)
        if abs(total_percentage - 100.0) > 0.01:
            return Response({"error": f"Payment plan percentages must sum to 100% (currently sums to {total_percentage}%)."}, status=status.HTTP_400_BAD_REQUEST)

        total_price = float(custom_req.agreed_price)
        advance_amount = round(total_price * (float(stages_data[0].get('percentage', 10)) / 100.0), 2)

        # Create or update linked Order
        if hasattr(custom_req, 'order') and custom_req.order:
            order = custom_req.order
            order.total_price = total_price
            order.advance_amount = advance_amount
            order.deadline_hours = deadline_hours
            order.status = Order.Status.AWAITING_PAYMENT
            order.save()
            order.payment_stages.all().delete()
        else:
            order = Order.objects.create(
                client=custom_req.client,
                order_type=Order.OrderType.CUSTOM,
                custom_request=custom_req,
                total_price=total_price,
                advance_amount=advance_amount,
                deadline_hours=deadline_hours,
                status=Order.Status.AWAITING_PAYMENT
            )

        # Create OrderPaymentStage rows
        for idx, stage_info in enumerate(stages_data):
            pct = float(stage_info.get('percentage', 0))
            amt = round(total_price * (pct / 100.0), 2)
            stage_status = OrderPaymentStage.Status.DUE if idx == 0 else OrderPaymentStage.Status.LOCKED

            OrderPaymentStage.objects.create(
                order=order,
                label=stage_info.get('label', f"Stage {idx + 1}"),
                percentage=pct,
                amount=amt,
                order_index=idx,
                trigger_type=stage_info.get('trigger_type', 'immediate'),
                status=stage_status
            )

        create_notification(
            recipient=custom_req.client,
            title="Custom Order Configured!",
            body=f"Your order payment plan & deadline ({deadline_hours}h) have been set. Please pay Stage 1 Booking payment to start design.",
            notification_type="order_configured",
            related_order=order
        )

        return Response(AdminOrderSerializer(order, context={'request': request}).data, status=status.HTTP_201_CREATED)

    # ADMIN UPDATE CONSULTATION & TELEGRAM / WHATSAPP NOTES
    @action(detail=True, methods=['post', 'patch'], permission_classes=[permissions.IsAuthenticated], url_path='update-notes')
    def update_notes(self, request, pk=None):
        custom_req = self.get_object()
        notes = request.data.get('admin_call_notes', request.data.get('notes', ''))
        custom_req.admin_call_notes = notes
        custom_req.save(update_fields=['admin_call_notes'])
        if hasattr(custom_req, 'order') and custom_req.order:
            try:
                custom_req.order.admin_call_notes = notes
                custom_req.order.save(update_fields=['admin_call_notes'])
            except Exception:
                pass
        return Response({
            "status": "success",
            "id": custom_req.id,
            "admin_call_notes": custom_req.admin_call_notes,
            "message": f"Admin notes saved for Custom Request #{custom_req.id}"
        })

    # ADMIN EDIT ALL CUSTOM REQUEST DETAILS
    @action(detail=True, methods=['patch', 'put', 'post'], permission_classes=[IsAdmin], url_path='admin-update')
    def admin_update(self, request, pk=None):
        from apps.catalog.models import Category
        custom_req = self.get_object()
        data = request.data

        if 'contact_name' in data or 'client_name' in data:
            custom_req.contact_name = data.get('contact_name') or data.get('client_name')
        if 'contact_phone' in data or 'client_phone' in data:
            custom_req.contact_phone = data.get('contact_phone') or data.get('client_phone')
        if 'contact_email' in data or 'client_email' in data:
            custom_req.contact_email = data.get('contact_email') or data.get('client_email')
        if 'description' in data:
            custom_req.description = data.get('description', '')
        if 'special_instructions' in data:
            custom_req.special_instructions = data.get('special_instructions', '')
        if 'category' in data or 'category_id' in data:
            cat_id = data.get('category') or data.get('category_id')
            if cat_id:
                if str(cat_id).isdigit():
                    custom_req.category = Category.objects.filter(id=int(cat_id)).first() or custom_req.category
                else:
                    custom_req.category = Category.objects.filter(name__iexact=str(cat_id)).first() or custom_req.category
        if 'metal_alloy' in data or 'metal_alloy_id' in data:
            metal_id = data.get('metal_alloy') or data.get('metal_alloy_id')
            if metal_id:
                if str(metal_id).isdigit():
                    custom_req.metal_alloy = MetalAlloy.objects.filter(id=int(metal_id)).first() or custom_req.metal_alloy
                else:
                    custom_req.metal_alloy = MetalAlloy.objects.filter(name__iexact=str(metal_id)).first() or custom_req.metal_alloy
        if 'ring_size' in data:
            custom_req.ring_size = data.get('ring_size', '')
        if 'ring_size_standard' in data:
            custom_req.ring_size_standard = data.get('ring_size_standard', 'US')
        if 'target_weight_grams' in data:
            val = data.get('target_weight_grams')
            custom_req.target_weight_grams = Decimal(str(val)) if val else None
        if 'needed_by_date' in data:
            custom_req.needed_by_date = data.get('needed_by_date') or None
        if 'budget_range' in data:
            custom_req.budget_range = data.get('budget_range', '')
        if 'status' in data and data['status']:
            custom_req.status = data['status']
        if 'agreed_price' in data and data['agreed_price'] is not None:
            try:
                custom_req.agreed_price = Decimal(str(data['agreed_price']))
            except Exception:
                pass
        if 'admin_call_notes' in data:
            custom_req.admin_call_notes = data.get('admin_call_notes', '')

        custom_req.save()

        # Sync back to linked order if any
        if hasattr(custom_req, 'order') and custom_req.order:
            ord_obj = custom_req.order
            if 'agreed_price' in data and data['agreed_price'] is not None:
                try:
                    ord_obj.total_price = Decimal(str(data['agreed_price']))
                    ord_obj.staff_payout_price = ord_obj.calculate_staff_payout()
                except Exception:
                    pass
            if 'admin_call_notes' in data:
                ord_obj.admin_call_notes = data.get('admin_call_notes', '')
            ord_obj.save()

        return Response(CustomRequestSerializer(custom_req, context={'request': request}).data)

    # ADMIN CANCEL / REJECT CUSTOM REQUEST
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='cancel')
    def cancel_request(self, request, pk=None):
        custom_req = self.get_object()
        reason = request.data.get('reason', 'Cancelled by Studio Super Admin.')
        custom_req.status = CustomRequest.Status.REJECTED
        stamp = f"\n[🚫 Cancelled by Admin ({timezone.now().strftime('%d %b %H:%M')})]: {reason}"
        if custom_req.admin_call_notes:
            custom_req.admin_call_notes += stamp
        else:
            custom_req.admin_call_notes = stamp.strip()
        custom_req.save(update_fields=['status', 'admin_call_notes'])

        if hasattr(custom_req, 'order') and custom_req.order:
            custom_req.order.status = Order.Status.CANCELLED
            custom_req.order.save(update_fields=['status'])
            OrderMilestone.objects.create(
                order=custom_req.order,
                stage=f"Custom Request & Order Cancelled: {reason[:120]}"
            )

        return Response({
            "message": f"Custom Request #{custom_req.id} cancelled.",
            "request": CustomRequestSerializer(custom_req, context={'request': request}).data
        })

    # ADMIN PERMANENTLY DELETE CUSTOM REQUEST
    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '') != 'admin' and not getattr(request.user, 'is_superuser', False):
            return Response({"error": "Forbidden. Only Studio Super Admins can permanently delete custom requests."}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        req_id = instance.id
        try:
            if hasattr(instance, 'order') and instance.order:
                order = instance.order
                instance.order = None
                instance.save(update_fields=['order'])
                order.custom_request = None
                order.save(update_fields=['custom_request'])
            instance.delete()
            return Response({"message": f"Custom Request #{req_id} permanently deleted from database."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to delete request: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)



class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == 'download_deliverable_staff_admin':
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        user = self.request.user
        # STAGE 6 CRITICAL RULE: Staff receives StaffOrderSerializer (PRICE COMPLETELY REMOVED FROM JSON API RESPONSE)
        if getattr(user, 'role', None) == 'staff':
            return StaffOrderSerializer
        elif getattr(user, 'role', None) == 'client':
            return ClientOrderSerializer
        return AdminOrderSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.all().select_related('client', 'assigned_staff', 'product', 'custom_request').prefetch_related('milestones', 'deliverables', 'payment_stages')

        if not user or not user.is_authenticated:
            raw_token = self.request.query_params.get('token')
            if raw_token:
                try:
                    from rest_framework_simplejwt.authentication import JWTAuthentication
                    validated = JWTAuthentication().get_validated_token(raw_token)
                    user = JWTAuthentication().get_user(validated)
                    self.request.user = user
                except Exception:
                    pass

        role = getattr(user, 'role', None)
        if role == 'client':
            return queryset.filter(client=user).order_by('-created_at')
        elif role == 'staff':
            # Staff only sees orders assigned to them
            return queryset.filter(assigned_staff=user).order_by('-created_at')
        elif role == 'admin' or getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
            return queryset.order_by('-created_at')
        return Order.objects.none()

    # STAGE 6 — JOB POOL FOR ELIGIBLE STAFF (PRICE STRIPPED)
    @action(detail=False, methods=['get'], permission_classes=[IsStaff], url_path='pool')
    def pool(self, request):
        staff_profile = getattr(request.user, 'staff_profile', None)
        max_jobs = staff_profile.max_concurrent_jobs if staff_profile else 2

        current_load = Order.objects.filter(
            assigned_staff=request.user,
            status=Order.Status.WITH_DESIGNER
        ).count()

        # Capacity check: Staff at capacity NEVER see jobs in pool
        if current_load >= max_jobs:
            return Response({
                "message": "You are currently at your maximum concurrent job limit.",
                "current_load": current_load,
                "max_concurrent_jobs": max_jobs,
                "pool_orders": []
            })

        # Auto-sync any existing CustomRequests in AGREED state that don't have an Order or whose Order is not in pool yet
        agreed_reqs = CustomRequest.objects.filter(status=CustomRequest.Status.AGREED, order__isnull=True)
        for req in agreed_reqs:
            total_price = float(req.agreed_price or req.estimated_price_shown or 100.00)
            advance_amount = round(total_price * 0.10, 2)
            ord_obj = Order.objects.create(
                client=req.client,
                order_type=Order.OrderType.CUSTOM,
                custom_request=req,
                total_price=total_price,
                advance_amount=advance_amount,
                deadline_hours=72,
                status=Order.Status.IN_DESIGN,
                unassigned_since=timezone.now()
            )
            from apps.payments.models import OrderPaymentStage
            OrderPaymentStage.objects.create(order=ord_obj, label="Booking Confirmation", percentage=10.0, amount=advance_amount, order_index=0, trigger_type="immediate", status=OrderPaymentStage.Status.DUE)
            OrderPaymentStage.objects.create(order=ord_obj, label="Design Approval Milestone", percentage=30.0, amount=round(total_price * 0.30, 2), order_index=1, trigger_type="on_design_approval", status=OrderPaymentStage.Status.LOCKED)
            OrderPaymentStage.objects.create(order=ord_obj, label="Final CAD Delivery", percentage=60.0, amount=round(total_price * 0.60, 2), order_index=2, trigger_type="on_final_delivery", status=OrderPaymentStage.Status.LOCKED)

        # Release any unassigned orders linked to agreed custom requests to IN_DESIGN
        Order.objects.filter(
            custom_request__status=CustomRequest.Status.AGREED,
            assigned_staff__isnull=True,
            status=Order.Status.AWAITING_PAYMENT
        ).update(status=Order.Status.IN_DESIGN, unassigned_since=timezone.now())

        pool_orders = Order.objects.filter(
            status=Order.Status.IN_DESIGN,
            assigned_staff__isnull=True
        ).order_by('unassigned_since', '-created_at')

        # Use StaffOrderSerializer (Price completely absent)
        serializer = StaffOrderSerializer(pool_orders, many=True, context={'request': request})
        return Response({
            "current_load": current_load,
            "max_concurrent_jobs": max_jobs,
            "pool_orders": serializer.data
        })

    # STAGE 7 — FIRST-ACCEPT-WINS (DEADLINE CLOCK STARTS AT ACCEPTANCE)
    @action(detail=True, methods=['post'], permission_classes=[IsStaff], url_path='accept')
    def accept_job(self, request, pk=None):
        order = accept_order(pk, request.user)
        return Response(StaffOrderSerializer(order, context={'request': request}).data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role == 'staff' and instance.assigned_staff and instance.assigned_staff != request.user:
            return Response({"error": "Forbidden. You are not the assigned staff member for this order."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # STAGE 8 — CRAFTSMAN MILESTONE STEPPER RECORDING
    @action(detail=True, methods=['post'], permission_classes=[IsStaff], url_path='milestone')
    def add_milestone(self, request, pk=None):
        order = self.get_object()
        if order.assigned_staff and order.assigned_staff != request.user and getattr(request.user, 'role', None) != 'admin' and not getattr(request.user, 'is_superuser', False):
            return Response({"error": "Forbidden. You are not assigned to this order."}, status=status.HTTP_403_FORBIDDEN)

        if not order.assigned_staff and request.user.is_authenticated:
            order.assigned_staff = request.user
            order.save(update_fields=['assigned_staff'])

        stage = request.data.get('stage')
        if not stage:
            return Response({"error": "Milestone stage name is required."}, status=status.HTTP_400_BAD_REQUEST)

        milestone_obj = OrderMilestone.objects.create(order=order, stage=stage)
        return Response(StaffOrderSerializer(order, context={'request': request}).data)

    # STAGE 9 — STAFF UPLOADS COMPLETED WORK (JPG PREVIEW + CAD FILES)
    @action(detail=True, methods=['post'], permission_classes=[IsStaff], url_path='deliverables')
    def upload_deliverable_file(self, request, pk=None):
        return self.upload_deliverable(request, pk)

    @action(detail=True, methods=['post'], permission_classes=[IsStaff], url_path='upload-deliverable')
    def upload_deliverable(self, request, pk=None):
        order = self.get_object()
        is_same_staff = (
            order.assigned_staff == request.user or
            (order.assigned_staff and order.assigned_staff.email and request.user.email and
             order.assigned_staff.email.split('@')[0].replace('0', '') == request.user.email.split('@')[0].replace('0', ''))
        )
        if order.assigned_staff and not is_same_staff and getattr(request.user, 'role', None) != 'admin' and not getattr(request.user, 'is_superuser', False):
            return Response({"error": "Forbidden. You are not assigned to this order."}, status=status.HTTP_403_FORBIDDEN)

        if not order.assigned_staff and request.user.is_authenticated:
            order.assigned_staff = request.user
            order.save(update_fields=['assigned_staff'])

        file_obj = request.FILES.get('file') or request.FILES.get('preview_image')
        file_type = str(request.data.get('file_type', '3dm')).lower()

        if not file_obj:
            return Response({"error": "No file attached."}, status=status.HTTP_400_BAD_REQUEST)

        # File extension validation
        ext = file_obj.name.split('.')[-1].lower() if '.' in file_obj.name else ''
        valid_exts = {
            '3dm': ['3dm', 'rhino'],
            'stl': ['stl'],
            'render': ['jpg', 'jpeg', 'png', 'webp'],
            'video': ['mp4', 'webm', 'mov', 'mkv']
        }
        allowed = valid_exts.get(file_type, [])
        if allowed and ext not in allowed:
            return Response({
                "error": f"Invalid file type '.{ext}' for {file_type.upper()} slot. Expected format: {', '.join(allowed)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Handle Render Preview
        if file_type == 'render':
            order.preview_image = file_obj
            order.save(update_fields=['preview_image'])

        # Delete existing deliverable for this file_type and current_version to ensure clean replacement for the active round
        OrderDeliverable.objects.filter(order=order, file_type=file_type, version=order.current_version).delete()

        deliverable = OrderDeliverable(order=order, file_type=file_type, version=order.current_version)
        if file_type in ['3dm', 'stl']:
            from apps.catalog.models import protected_cad_storage
            saved_name = protected_cad_storage.save(f"orders/deliverables/ord_{order.id}_v{order.current_version}_{file_type}_{file_obj.name}", file_obj)
            deliverable.file.name = saved_name
        else:
            deliverable.file = file_obj

        deliverable.save()

        return Response(StaffOrderSerializer(order, context={'request': request}).data)

    # STAFF & ADMIN DELIVERABLE INSPECTION DOWNLOAD
    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny], url_path='deliverables/(?P<deliverable_id>[0-9]+)/download')
    def download_deliverable_staff_admin(self, request, pk=None, deliverable_id=None):
        try:
            order = Order.objects.select_related('assigned_staff').get(pk=pk)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user

        # Support token authentication from query param or Authorization header
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
                except Exception:
                    user = None

        is_admin = user and (getattr(user, 'role', None) == 'admin' or getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False))
        is_assigned = user and (order.assigned_staff == user)
        if not (is_admin or is_assigned):
            return Response({"error": "Forbidden. Only assigned staff or studio admins may inspect CAD deliverables."}, status=status.HTTP_403_FORBIDDEN)

        deliverable = order.deliverables.filter(id=deliverable_id).first()
        if not deliverable or not deliverable.file:
            return Response({"error": "Deliverable file not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            from apps.catalog.models import protected_cad_storage
            if protected_cad_storage.exists(deliverable.file.name):
                file_handle = protected_cad_storage.open(deliverable.file.name, 'rb')
            else:
                file_handle = deliverable.file.open('rb')

            import os
            raw_filename = os.path.basename(deliverable.file.name)
            clean_filename = raw_filename
            prefix = f"ord_{order.id}_{deliverable.file_type}_"
            if clean_filename.startswith(prefix):
                clean_filename = clean_filename[len(prefix):]
            elif clean_filename.startswith(f"ord_{order.id}_"):
                clean_filename = clean_filename[len(f"ord_{order.id}_"):]

            content_type = 'application/octet-stream'
            if clean_filename.lower().endswith('.mp4') or deliverable.file_type == 'video':
                content_type = 'video/mp4'
            elif clean_filename.lower().endswith('.stl'):
                content_type = 'model/stl'

            response = FileResponse(file_handle, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{clean_filename}"'
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response
        except Exception as e:
            return Response({"error": f"Unable to stream deliverable: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # SUBMIT & COMPLETE JOB ACTION (Pending Admin QC)
    @action(detail=True, methods=['post'], permission_classes=[IsStaff], url_path='complete')
    def complete_order_action(self, request, pk=None):
        return self.submit_for_review(request, pk)

    @action(detail=True, methods=['post'], permission_classes=[IsStaff], url_path='submit-for-review')
    def submit_for_review(self, request, pk=None):
        order = self.get_object()
        is_same_staff = (
            order.assigned_staff == request.user or
            (order.assigned_staff and order.assigned_staff.email and request.user.email and
             order.assigned_staff.email.split('@')[0].replace('0', '') == request.user.email.split('@')[0].replace('0', ''))
        )
        if order.assigned_staff and not is_same_staff and getattr(request.user, 'role', None) != 'admin' and not getattr(request.user, 'is_superuser', False):
            return Response({"error": "Forbidden. You are not assigned to this order."}, status=status.HTTP_403_FORBIDDEN)

        if not order.assigned_staff and request.user.is_authenticated:
            order.assigned_staff = request.user

        order.status = Order.Status.PENDING_REVIEW
        order.save(update_fields=['status', 'assigned_staff'])

        OrderMilestone.objects.create(
            order=order,
            stage=f"CAD Deliverables v{order.current_version} Submitted for Admin QC"
        )

        # Mark any open revision requests as in_progress
        order.revision_requests.filter(status=RevisionRequest.Status.OPEN).update(status=RevisionRequest.Status.IN_PROGRESS)

        from apps.accounts.models import User
        for admin_user in User.objects.filter(role=User.Role.ADMIN):
            create_notification(
                recipient=admin_user,
                title=f"Quality Review Needed: Order #{order.id} (v{order.current_version})",
                body=f"Staff member {request.user.username} submitted Order #{order.id} (v{order.current_version}) for Admin QC review.",
                notification_type="quality_review",
                related_order=order
            )

        return Response(StaffOrderSerializer(order, context={'request': request}).data)

    # STAGE 10 — ADMIN QUALITY APPROVAL
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='admin-review')
    def admin_review(self, request, pk=None):
        order = self.get_object()
        decision = request.data.get('decision')  # 'approve' or 'reject'
        notes = request.data.get('notes', '')

        if decision == 'approve':
            order.status = Order.Status.PREVIEW_READY
            order.quality_approved = True
            order.admin_review_notes = notes
            order.save(update_fields=['status', 'quality_approved', 'admin_review_notes'])

            OrderMilestone.objects.create(order=order, stage=f"3D CAD Preview v{order.current_version} Approved by Admin QC")

            # Mark any open or in-progress revision requests as addressed
            order.revision_requests.filter(status__in=[RevisionRequest.Status.OPEN, RevisionRequest.Status.IN_PROGRESS]).update(
                status=RevisionRequest.Status.ADDRESSED,
                addressed_at=timezone.now(),
                addressed_by=request.user
            )

            # Unlock Stage 1: Design Approval Milestone (30%) so client can review & settle
            stage1 = order.payment_stages.filter(trigger_type="on_design_approval", status=OrderPaymentStage.Status.LOCKED).first()
            if stage1:
                stage1.status = OrderPaymentStage.Status.DUE
                stage1.save(update_fields=['status'])

            create_notification(
                recipient=order.client,
                title=f"3D CAD Preview (v{order.current_version}) Ready!",
                body=f"Your 3D CAD design preview for Order #{order.id} (v{order.current_version}) has passed Admin QC and is ready for review!",
                notification_type="preview_ready",
                related_order=order
            )

            # Send email to client
            if order.client and order.client.email:
                try:
                    preview_subject = f"3D CAD Preview Ready (v{order.current_version}) — Order #{order.id} — Shiuli CAD Studio"
                    preview_paragraphs = [
                        f"Hello {order.client.first_name or order.client.username},",
                        f"Great news! Your 3D CAD jewellery model preview for <strong>Order #{order.id} (v{order.current_version})</strong> has passed Studio Quality Control review and is ready for your inspection.",
                        "Log into your atelier portal to inspect the interactive 360° views, examine stone settings, and approve or request adjustments."
                    ]
                    preview_html = build_luxury_email_html(
                        headline=f"3D CAD Preview Ready (v{order.current_version})",
                        paragraphs=preview_paragraphs,
                        action_button_text="INSPECT 3D CAD PREVIEW",
                        action_button_url="https://shiulicad.com/account",
                        footer_note="Inspect high-resolution 3D turnarounds directly in your client dashboard."
                    )
                    send_mail(
                        subject=preview_subject,
                        message="\n\n".join(preview_paragraphs) + "\n\nWarm regards,\nShiuli CAD Studio",
                        recipient_list=[order.client.email],
                        html_message=preview_html,
                        fail_silently=True
                    )
                except Exception as mail_err:
                    print(f"[Mail Warning] Could not send preview ready email: {mail_err}")

            return Response(AdminOrderSerializer(order, context={'request': request}).data)

        elif decision == 'reject':
            order.status = Order.Status.WITH_DESIGNER
            order.admin_review_notes = notes
            order.save(update_fields=['status', 'admin_review_notes'])

            OrderMilestone.objects.create(order=order, stage=f"Admin QC Revision: {notes[:100]}")

            if order.assigned_staff:
                create_notification(
                    recipient=order.assigned_staff,
                    title=f"Revision Requested: Order #{order.id}",
                    body=f"Admin requested revisions for Order #{order.id}: {notes}",
                    notification_type="revision_requested",
                    related_order=order
                )
            return Response(AdminOrderSerializer(order, context={'request': request}).data)

        return Response({"error": "Invalid decision. Use 'approve' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)

    # ADMIN CALL & CONSULTATION NOTES (SAVED PER PARTICULAR ORDER)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[permissions.IsAuthenticated], url_path='update-notes')
    def update_notes(self, request, pk=None):
        order = self.get_object()
        notes = request.data.get('admin_call_notes', request.data.get('notes', ''))
        order.admin_call_notes = notes
        order.save(update_fields=['admin_call_notes'])

        # Sync back to linked CustomRequest if available
        if order.custom_request:
            try:
                order.custom_request.admin_call_notes = notes
                order.custom_request.save(update_fields=['admin_call_notes'])
            except Exception:
                pass

        return Response({
            "status": "success",
            "id": order.id,
            "admin_call_notes": order.admin_call_notes,
            "message": f"Admin notes saved for Order #{order.id}"
        })

    # STAGE 11 — CLIENT 3D DESIGN PREVIEW APPROVAL
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='approve-design-preview')
    def approve_design_preview(self, request, pk=None):
        order = self.get_object()
        if order.client != request.user and getattr(request.user, 'role', None) != 'admin' and not getattr(request.user, 'is_superuser', False):
            return Response({"error": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        from apps.payments.services import approve_design_preview_and_unlock_stage
        approve_design_preview_and_unlock_stage(order)
        return Response(ClientOrderSerializer(order, context={'request': request}).data)

    # STAGE 11B — CLIENT IN-APP REVISION REQUESTS (GET & POST)
    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticated], url_path='revision-requests')
    def revision_requests(self, request, pk=None):
        order = self.get_object()

        if request.method == 'GET':
            if (
                order.client != request.user and
                getattr(request.user, 'role', None) not in ['admin', 'staff'] and
                not getattr(request.user, 'is_staff', False) and
                not getattr(request.user, 'is_superuser', False)
            ):
                return Response({"error": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

            revisions = order.revision_requests.all().order_by('-created_at')
            return Response(RevisionRequestSerializer(revisions, many=True, context={'request': request}).data)

        # POST: Client requests design adjustments
        if order.client != request.user and getattr(request.user, 'role', None) != 'admin' and not getattr(request.user, 'is_superuser', False):
            return Response({"error": "Forbidden. Only the ordering client may submit revision requests."}, status=status.HTTP_403_FORBIDDEN)

        comment = request.data.get('comment', '').strip()
        if not comment:
            return Response({"error": "Please provide your comments or change instructions."}, status=status.HTTP_400_BAD_REQUEST)

        voice_note = request.FILES.get('voice_note')
        reference_image = request.FILES.get('reference_image')

        from apps.staff_management.models import PlatformSettings
        try:
            platform_settings = PlatformSettings.load()
            free_allowed = platform_settings.free_revisions_allowed
            extra_fee = platform_settings.extra_revision_fee
        except Exception:
            free_allowed = 2
            extra_fee = Decimal('500.00')

        existing_revisions_count = order.revision_requests.count()
        revision_num = existing_revisions_count + 1
        is_paid = (existing_revisions_count < free_allowed)
        fee = Decimal('0.00') if is_paid else extra_fee

        rev_req = RevisionRequest.objects.create(
            order=order,
            deliverable_version=order.current_version,
            revision_number=revision_num,
            client=order.client,
            comment=comment,
            voice_note=voice_note,
            reference_image=reference_image,
            is_paid=is_paid,
            fee_charged=fee,
            status=RevisionRequest.Status.OPEN
        )

        # Advance order current_version for the next iteration of CAD deliverable uploads
        order.current_version += 1
        order.status = Order.Status.REVISION_REQUESTED
        order.quality_approved = False
        order.save(update_fields=['current_version', 'status', 'quality_approved'])

        OrderMilestone.objects.create(
            order=order,
            stage=f"Revision #{revision_num} Requested by Client: {comment[:50]}"
        )

        # 1. In-App Notification & Email to Assigned Staff
        if order.assigned_staff:
            create_notification(
                recipient=order.assigned_staff,
                title=f"Changes Requested: Order #{order.id} (Rev #{revision_num})",
                body=f"Client requested CAD changes for Order #{order.id}: \"{comment[:100]}\"",
                notification_type="revision_requested",
                related_order=order
            )
            if order.assigned_staff.email:
                try:
                    staff_subj = f"Design Revision #{revision_num} Requested — Order #{order.id} — Shiuli CAD Studio"
                    staff_paras = [
                        f"Hello {order.assigned_staff.first_name or order.assigned_staff.username},",
                        f"The client has requested design adjustments on <strong>Order #{order.id}</strong> (previous deliverable v{rev_req.deliverable_version}).",
                        f"<strong>Client Revision Notes:</strong><br/><em style='color:#F5E7A3;'>\"{comment}\"</em>",
                        f"Please access your staff workbench, update the CAD geometry, and upload deliverable v{order.current_version} for QC approval."
                    ]
                    staff_html = build_luxury_email_html(
                        headline=f"Design Revision #{revision_num} Requested",
                        paragraphs=staff_paras,
                        action_button_text="OPEN STAFF WORKBENCH",
                        action_button_url="https://shiulicad.com/staff-portal",
                        footer_note="Deliverable turnaround expected within active order milestone window."
                    )
                    send_mail(
                        subject=staff_subj,
                        message="\n\n".join(staff_paras) + "\n\nShiuli Atelier Production Desk",
                        recipient_list=[order.assigned_staff.email],
                        html_message=staff_html,
                        fail_silently=True
                    )
                except Exception as mail_err:
                    print(f"[Mail Warning] {mail_err}")

        # 2. In-App Notification & Email to Studio Admin
        for admin_user in User.objects.filter(role=User.Role.ADMIN):
            create_notification(
                recipient=admin_user,
                title=f"Client Requested Changes: Order #{order.id}",
                body=f"Order #{order.id} revision #{revision_num} requested by {order.client.username}.",
                notification_type="revision_requested",
                related_order=order
            )

        # 3. Confirmation Email to Client
        if order.client and order.client.email:
            try:
                client_subj = f"Revision Request Received — Order #{order.id} — Shiuli CAD Studio"
                client_paras = [
                    f"Hello {order.client.first_name or order.client.username},",
                    f"We have received your revision request for <strong>Order #{order.id} (Revision #{revision_num})</strong>.",
                    f"<strong>Your Submitted Notes:</strong><br/><em style='color:#F5E7A3;'>\"{comment}\"</em>",
                    "Our CAD engineering atelier is updating your jewelry geometry. Once the new 3D turnaround preview is rendered and passes QC review, you will be notified to inspect it in your dashboard."
                ]
                client_html = build_luxury_email_html(
                    headline="Revision Request Confirmed",
                    paragraphs=client_paras,
                    action_button_text="VIEW ORDER STATUS",
                    action_button_url="https://shiulicad.com/account",
                    footer_note="Thank you for partnering with Shiuli CAD Studio Atelier."
                )
                send_mail(
                    subject=client_subj,
                    message="\n\n".join(client_paras) + "\n\nWarm regards,\nShiuli CAD Studio",
                    recipient_list=[order.client.email],
                    html_message=client_html,
                    fail_silently=True
                )
            except Exception as mail_err:
                print(f"[Mail Warning] {mail_err}")

        return Response(RevisionRequestSerializer(rev_req, context={'request': request}).data, status=status.HTTP_201_CREATED)

    # ADMIN TOGGLE DOWNLOAD PERMISSION
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='toggle-download-permission')
    def toggle_download_permission(self, request, pk=None):
        order = self.get_object()
        enabled = request.data.get('enabled')
        if enabled is not None:
            order.download_enabled_by_admin = bool(enabled)
        else:
            order.download_enabled_by_admin = not order.download_enabled_by_admin
        order.save(update_fields=['download_enabled_by_admin'])

        create_notification(
            recipient=order.client,
            title="CAD Download Enabled!" if order.download_enabled_by_admin else "CAD Download Locked",
            body=f"Admin has {'enabled' if order.download_enabled_by_admin else 'disabled'} CAD file downloads for Order #{order.id}.",
            notification_type="general",
            related_order=order
        )

        return Response(AdminOrderSerializer(order, context={'request': request}).data)

    # ADMIN ASSIGN / REASSIGN MODELLER OR RELEASE TO OPEN POOL
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='reassign')
    def reassign_staff(self, request, pk=None):
        order = self.get_object()
        staff_id = request.data.get('staff_id')

        if not staff_id or str(staff_id).strip() in ['', 'null', '0', 'unassigned']:
            # Release back to open pool
            old_staff = order.assigned_staff
            order.assigned_staff = None
            order.status = Order.Status.IN_DESIGN
            order.unassigned_since = timezone.now()
            order.save(update_fields=['assigned_staff', 'status', 'unassigned_since'])

            OrderMilestone.objects.create(
                order=order,
                stage=f"Released to Open Pool by Admin (Previously assigned to: {old_staff.username if old_staff else 'Unassigned'})"
            )
            return Response(AdminOrderSerializer(order, context={'request': request}).data)

        from apps.accounts.models import User
        # Resolve staff by id or username
        staff_user = None
        if str(staff_id).isdigit():
            staff_user = User.objects.filter(id=int(staff_id), role=User.Role.STAFF).first()
        if not staff_user:
            staff_user = User.objects.filter(username=str(staff_id), role=User.Role.STAFF).first()

        if not staff_user:
            return Response({"error": f"CAD Modeller with ID or username '{staff_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

        # Capacity check
        profile = getattr(staff_user, 'staff_profile', None)
        max_jobs = profile.max_concurrent_jobs if profile else 2
        active_jobs = Order.objects.filter(assigned_staff=staff_user, status=Order.Status.WITH_DESIGNER).exclude(id=order.id).count()

        force = request.data.get('force', False)
        if active_jobs >= max_jobs and not force:
            return Response({
                "error": f"{staff_user.get_full_name() or staff_user.username} is at maximum capacity ({active_jobs}/{max_jobs} active jobs).",
                "capacity_full": True,
                "current_load": active_jobs,
                "max_limit": max_jobs
            }, status=status.HTTP_400_BAD_REQUEST)

        order.assigned_staff = staff_user
        order.status = Order.Status.WITH_DESIGNER
        order.assigned_at = timezone.now()
        order.save(update_fields=['assigned_staff', 'status', 'assigned_at'])

        OrderMilestone.objects.create(
            order=order,
            stage=f"Assigned to CAD Modeller: {staff_user.get_full_name() or staff_user.username}"
        )

        create_notification(
            recipient=staff_user,
            title=f"New CAD Assignment: Order #{order.id}",
            body=f"Studio Admin has assigned custom CAD Order #{order.id} to your workbench.",
            notification_type="general",
            related_order=order
        )

        return Response(AdminOrderSerializer(order, context={'request': request}).data)

    # ADMIN SET / UPDATE COMMISSION ON PARTICULAR ORDER
    @action(detail=True, methods=['post', 'patch'], permission_classes=[IsAdmin], url_path='set-commission')
    def set_commission(self, request, pk=None):
        order = self.get_object()
        commission_pct = request.data.get('admin_commission_percentage')
        if commission_pct is not None:
            try:
                from decimal import Decimal
                order.admin_commission_percentage = Decimal(str(commission_pct))
                order.staff_payout_price = order.calculate_staff_payout()
                order.save(update_fields=['admin_commission_percentage', 'staff_payout_price'])
            except Exception as e:
                return Response({"error": f"Invalid commission rate: {e}"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(AdminOrderSerializer(order, context={'request': request}).data)

    # ADMIN APPROVE ORDER & RELEASE TO STAFF POOL WITH COMMISSION
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='approve-to-pool')
    def approve_to_pool(self, request, pk=None):
        order = self.get_object()
        commission_pct = request.data.get('admin_commission_percentage')
        if commission_pct is not None:
            try:
                from decimal import Decimal
                order.admin_commission_percentage = Decimal(str(commission_pct))
                order.staff_payout_price = order.calculate_staff_payout()
            except Exception:
                pass

        order.status = Order.Status.IN_DESIGN
        order.assigned_staff = None
        order.unassigned_since = timezone.now()
        order.save()

        release_order_to_pool(order)
        return Response({
            "message": f"Order #{order.id} approved and released to Staff Job Pool with {order.admin_commission_percentage}% admin commission.",
            "order": AdminOrderSerializer(order, context={'request': request}).data
        })

    # STAGE 12 — GENERATE 6-DIGIT OTP FOR CAD DOWNLOAD UPON 100% PAYMENT + ADMIN TOGGLE
    @action(detail=True, methods=['post'], permission_classes=[IsClient], url_path='request-otp')
    def request_order_otp(self, request, pk=None):
        from apps.payments.models import DownloadOTP
        order = self.get_object()

        # Check if 100% of payment stages are paid
        unpaid_stages = order.payment_stages.exclude(status='paid')
        if unpaid_stages.exists():
            return Response({
                "error": "All payment stages must be fully paid before generating secure CAD download OTP."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if Admin has toggled download permission ON
        if not order.download_enabled_by_admin:
            return Response({
                "error": "Download permission is currently locked by studio administration. Please contact atelier support to enable your download."
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if staff has uploaded production CAD deliverables
        has_cad = order.deliverables.filter(file_type__in=['3dm', 'stl']).exists()
        if not has_cad:
            return Response({
                "error": "The assigned CAD designer has not uploaded the production CAD files (.3DM / .STL) for this order yet. Download will become available once staff uploads them."
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        otp_code = generate_6digit_otp()
        otp_hash = make_password(otp_code)
        expires_at = now + timedelta(minutes=10)

        DownloadOTP.objects.filter(order=order, is_verified=False).delete()
        DownloadOTP.objects.create(
            order=order,
            otp_hash=otp_hash,
            expires_at=expires_at,
            attempts=0,
            is_verified=False
        )

        # Print OTP in terminal for dev verification
        print("\n" + "=" * 70, flush=True)
        print(f"[OTP DEBUG LOG] CUSTOM ORDER CAD DOWNLOAD", flush=True)
        print(f"   Order ID:    #{order.id}", flush=True)
        print(f"   Buyer Email: {request.user.email}", flush=True)
        print(f"   VERIFICATION CODE (OTP): >>> {otp_code} <<<", flush=True)
        print("=" * 70 + "\n", flush=True)

        try:
            send_otp_email(
                email=request.user.email,
                otp_code=otp_code,
                name=request.user.first_name or request.user.username,
                purpose="download_otp"
            )
            print(f"[EMAIL SUCCESS] Dispatched OTP code {otp_code} to {request.user.email} via Gmail SMTP.", flush=True)
        except Exception as e:
            print(f"[EMAIL ERROR] Google SMTP failed to deliver OTP email to {request.user.email}: {e}", flush=True)

        resp_data = {
            "message": f"Verification code sent to {request.user.email}.",
            "expires_in_seconds": 600,
            "masked_email": request.user.email[:2] + "***" + request.user.email[request.user.email.find('@'):] if '@' in request.user.email else request.user.email
        }
        return Response(resp_data)

    # STAGE 12 — VERIFY 6-DIGIT OTP AND GENERATE SECURE SINGLE-USE DOWNLOAD TOKEN
    @action(detail=True, methods=['post'], permission_classes=[IsClient], url_path='verify-otp')
    def verify_order_otp(self, request, pk=None):
        from apps.payments.models import DownloadOTP, DownloadToken
        order = self.get_object()
        code = str(request.data.get('code', '')).strip()

        if not code:
            return Response({"error": "Verification code is required."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        otp_obj = DownloadOTP.objects.filter(order=order, is_verified=False).order_by('-created_at').first()

        if not otp_obj or otp_obj.expires_at < now:
            return Response({"error": "Verification code has expired or is invalid. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_obj.attempts >= 5:
            return Response({"error": "Too many failed attempts. Code locked out. Please request a new code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        if not check_password(code, otp_obj.otp_hash):
            otp_obj.attempts += 1
            otp_obj.save(update_fields=['attempts'])
            remaining = 5 - otp_obj.attempts
            return Response({"error": f"Invalid code. {remaining} attempt(s) remaining."}, status=status.HTTP_400_BAD_REQUEST)

        otp_obj.is_verified = True
        otp_obj.save(update_fields=['is_verified'])

        # USER REQUIREMENT:
        # Immediately turn off admin download toggle so button disappears from customer portal
        order.download_enabled_by_admin = False
        order.download_count += 1
        order.save(update_fields=['download_enabled_by_admin', 'download_count'])

        # Generate single-use DownloadToken
        raw_token = secrets.token_urlsafe(32)
        expires_at = now + timedelta(hours=48)

        DownloadToken.objects.create(
            order=order,
            token=raw_token,
            locked_email=request.user.email,
            expires_at=expires_at,
            is_used=False
        )

        origin = request.META.get('HTTP_ORIGIN') or request.META.get('HTTP_REFERER')
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            base_url = f"{parsed.scheme}://{parsed.netloc}"
        else:
            base_url = "http://localhost:3000"
        download_url = f"{base_url}/download/{raw_token}"

        print("\n" + "=" * 70, flush=True)
        print(f"[SECURE DOWNLOAD LINK LOG] CUSTOM ORDER", flush=True)
        print(f"   Order ID:    #{order.id}", flush=True)
        print(f"   Buyer Email: {request.user.email}", flush=True)
        print(f"   DOWNLOAD LINK: >>> {download_url} <<<", flush=True)
        print("=" * 70 + "\n", flush=True)

        try:
            download_subj = f"Your 3D CAD Download Link — Order #{order.id} — Shiuli CAD Studio"
            download_paras = [
                f"Hello {request.user.first_name or request.user.username},",
                f"Your email verification is confirmed! Your bespoke jewelry production files (.3DM / .STL / 4K Renders) for <strong>Order #{order.id}</strong> are ready for download.",
                "Click the button below to download your complete production package:",
                "<strong>IMPORTANT SECURITY NOTICE:</strong><br/>- This link can be used to download your production files (.3DM / .STL) <strong>ONCE only</strong>.<br/>- After downloading, this link automatically self-destructs and cannot be opened again."
            ]
            download_html = build_luxury_email_html(
                headline="Your Custom CAD Files are Ready",
                paragraphs=download_paras,
                action_button_text="DOWNLOAD PRODUCTION CAD FILES",
                action_button_url=download_url,
                footer_note="Single-use link valid for 48 hours. If you did not initiate this request, contact support immediately."
            )
            send_mail(
                subject=download_subj,
                message="\n\n".join(download_paras) + f"\n\nDownload Link: {download_url}\n\nWarm regards,\nShiuli CAD Studio",
                recipient_list=[request.user.email],
                html_message=download_html,
                fail_silently=False
            )
            print(f"[EMAIL SUCCESS] Dispatched single-use download link to {request.user.email} via Gmail SMTP.", flush=True)
        except Exception as e:
            print(f"[EMAIL ERROR] Google SMTP failed to deliver download link email to {request.user.email}: {e}", flush=True)

        return Response({
            "message": f"Verification confirmed! Single-use download link sent to {request.user.email}. Note: the link will expire immediately after first download.",
            "download_token": raw_token,
            "download_url": download_url
        })

    # ADMIN PLACE / CREATE ORDER FOR CUSTOMER
    @action(detail=False, methods=['post'], permission_classes=[IsAdmin], url_path='admin-create')
    def admin_create(self, request):
        from apps.catalog.models import Category
        from apps.payments.models import Payment

        data = request.data
        client_id = data.get('client_id')
        client_name = str(data.get('client_name', '')).strip()
        client_email = str(data.get('client_email', '')).strip()
        client_phone = str(data.get('client_phone', '')).strip()

        # 1. Resolve or create customer user
        client = None
        if client_id and str(client_id).isdigit():
            client = User.objects.filter(id=int(client_id)).first()

        if not client and client_email:
            client = User.objects.filter(email__iexact=client_email).first()
            if not client:
                base_username = client_email.split('@')[0].lower().replace('.', '_').replace('-', '_')
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1

                names = client_name.split(' ', 1) if client_name else ['Client', '']
                client = User.objects.create(
                    username=username,
                    email=client_email,
                    first_name=names[0],
                    last_name=names[1] if len(names) > 1 else '',
                    phone_number=client_phone,
                    role=User.Role.CLIENT
                )
                client.set_password('client123')
                client.save()

        if not client:
            return Response(
                {"error": "Customer email or existing customer selection is required to place an order."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Extract jewelry specifications
        title = data.get('title') or data.get('item_name') or 'Custom Bespoke Jewellery CAD'
        category_id = data.get('category_id') or data.get('category')
        category = Category.objects.filter(id=int(category_id)).first() if category_id and str(category_id).isdigit() else None
        if not category and category_id:
            category = Category.objects.filter(name__iexact=str(category_id)).first()

        metal_alloy_id = data.get('metal_alloy_id') or data.get('metal_alloy')
        metal_alloy = MetalAlloy.objects.filter(id=int(metal_alloy_id)).first() if metal_alloy_id and str(metal_alloy_id).isdigit() else None
        if not metal_alloy and metal_alloy_id:
            metal_alloy = MetalAlloy.objects.filter(name__iexact=str(metal_alloy_id)).first()

        ring_size = data.get('ring_size', '')
        ring_size_standard = data.get('ring_size_standard', 'US')
        target_weight_grams = data.get('target_weight_grams')
        description = data.get('description', '') or data.get('design_brief', '')
        special_instructions = data.get('special_instructions', '') or title
        needed_by_date = data.get('needed_by_date')
        admin_call_notes = data.get('admin_call_notes', '')

        # Telegram, Address & Company extra details
        client_telegram = str(data.get('client_telegram') or data.get('telegram_handle') or '').strip()
        client_address = str(data.get('client_address') or data.get('address') or '').strip()
        company_name = str(data.get('company_name') or '').strip()

        extra_info_lines = []
        if company_name: extra_info_lines.append(f"🏢 Company/Brand: {company_name}")
        if client_telegram: extra_info_lines.append(f"✈️ Telegram: {client_telegram}")
        if client_address: extra_info_lines.append(f"📍 Address: {client_address}")

        if extra_info_lines:
            header = "\n".join(extra_info_lines)
            admin_call_notes = f"{header}\n\n{admin_call_notes}".strip()

        # 3. Commercials
        try:
            total_price = Decimal(str(data.get('total_price', '250.00')))
        except Exception:
            total_price = Decimal('250.00')

        commission_pct = Decimal(str(data.get('admin_commission_percentage', '20.00')))
        multiplier = max(Decimal('0.00'), (Decimal('100.00') - commission_pct) / Decimal('100.00'))
        staff_payout_price = round(total_price * multiplier, 2)

        advance_amount = Decimal(str(data.get('advance_amount', round(total_price * Decimal('0.10'), 2))))
        advance_paid = bool(data.get('advance_paid', True))
        deadline_hours = int(data.get('deadline_hours', 72))
        due_at = timezone.now() + timedelta(hours=deadline_hours)

        # 4. Assigned staff check
        assigned_staff_id = data.get('assigned_staff_id')
        assigned_staff = None
        if assigned_staff_id and str(assigned_staff_id).isdigit() and int(assigned_staff_id) > 0:
            assigned_staff = User.objects.filter(id=int(assigned_staff_id), role=User.Role.STAFF).first()

        order_status = Order.Status.WITH_DESIGNER if assigned_staff else Order.Status.IN_DESIGN

        # 5. Create CustomRequest
        custom_req = CustomRequest.objects.create(
            client=client,
            request_mode='direct',
            status=CustomRequest.Status.AGREED,
            category=category,
            metal_alloy=metal_alloy,
            ring_size=ring_size,
            ring_size_standard=ring_size_standard,
            target_weight_grams=Decimal(str(target_weight_grams)) if target_weight_grams else None,
            description=description,
            special_instructions=special_instructions,
            needed_by_date=needed_by_date if needed_by_date else None,
            agreed_price=total_price,
            contact_name=client_name or client.get_full_name() or client.username,
            contact_email=client_email or client.email,
            contact_phone=client_phone or client.phone_number,
            admin_call_notes=admin_call_notes
        )

        # 6. Create Order
        order = Order.objects.create(
            client=client,
            order_type=Order.OrderType.CUSTOM,
            custom_request=custom_req,
            assigned_staff=assigned_staff,
            total_price=total_price,
            admin_commission_percentage=commission_pct,
            staff_payout_price=staff_payout_price,
            advance_amount=advance_amount,
            advance_paid=advance_paid,
            deadline_hours=deadline_hours,
            due_at=due_at,
            status=order_status,
            admin_call_notes=admin_call_notes,
            assigned_at=timezone.now() if assigned_staff else None,
            unassigned_since=None if assigned_staff else timezone.now()
        )

        # 7. Payment Stages
        stage0_status = OrderPaymentStage.Status.PAID if advance_paid else OrderPaymentStage.Status.DUE
        OrderPaymentStage.objects.create(
            order=order,
            label="Booking Confirmation Deposit",
            percentage=round((advance_amount / total_price) * 100, 2) if total_price > 0 else Decimal('10.00'),
            amount=advance_amount,
            order_index=0,
            trigger_type="immediate",
            status=stage0_status,
            paid_at=timezone.now() if advance_paid else None
        )
        rem_stage1 = round(total_price * Decimal('0.30'), 2)
        OrderPaymentStage.objects.create(
            order=order,
            label="Design Approval Milestone",
            percentage=30.00,
            amount=rem_stage1,
            order_index=1,
            trigger_type="on_design_approval",
            status=OrderPaymentStage.Status.LOCKED
        )
        rem_stage2 = max(Decimal('0.00'), total_price - advance_amount - rem_stage1)
        OrderPaymentStage.objects.create(
            order=order,
            label="Final CAD Delivery",
            percentage=round((rem_stage2 / total_price) * 100, 2) if total_price > 0 else Decimal('60.00'),
            amount=rem_stage2,
            order_index=2,
            trigger_type="on_final_delivery",
            status=OrderPaymentStage.Status.LOCKED
        )

        if advance_paid:
            Payment.objects.create(
                order=order,
                payment_type=Payment.PaymentType.ADVANCE,
                amount=advance_amount,
                gateway_transaction_id="ADMIN_BOOKING_RECORD",
                payment_method="admin_manual",
                status=Payment.Status.SUCCESS,
                admin_verified_at=timezone.now(),
                admin_verified_by=request.user
            )

        # 8. Initial milestone
        OrderMilestone.objects.create(
            order=order,
            stage=f"Order Placed by Studio Admin for Customer {client.get_full_name() or client.username}"
        )
        if assigned_staff:
            OrderMilestone.objects.create(
                order=order,
                stage=f"Assigned to Modeller: {assigned_staff.get_full_name() or assigned_staff.username}"
            )
            create_notification(
                recipient=assigned_staff,
                title=f"New CAD Order Assigned: #{order.id}",
                body=f"Admin created and assigned Order #{order.id} ({title}) to your workbench.",
                notification_type="general",
                related_order=order
            )

        return Response(AdminOrderSerializer(order, context={'request': request}).data, status=status.HTTP_201_CREATED)

    # ADMIN EDIT ALL ORDER DETAILS
    @action(detail=True, methods=['patch', 'put', 'post'], permission_classes=[IsAdmin], url_path='admin-update')
    def admin_update(self, request, pk=None):
        return self._perform_admin_order_update(request, pk)

    def update(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '') == 'admin' or getattr(request.user, 'is_superuser', False):
            return self._perform_admin_order_update(request, kwargs.get('pk'))
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '') == 'admin' or getattr(request.user, 'is_superuser', False):
            return self._perform_admin_order_update(request, kwargs.get('pk'))
        return super().partial_update(request, *args, **kwargs)

    def _perform_admin_order_update(self, request, order_id):
        from apps.catalog.models import Category

        order = self.get_object()
        data = request.data
        req = order.custom_request

        # 1. Update Title & Descriptions
        title = data.get('title') or data.get('item_name')
        if req and title:
            req.special_instructions = title

        description = data.get('description') or data.get('design_brief')
        if req and description is not None:
            req.description = description

        # 2. Update Category & Specs
        category_id = data.get('category_id') or data.get('category')
        if req and category_id:
            if str(category_id).isdigit():
                req.category = Category.objects.filter(id=int(category_id)).first() or req.category
            else:
                req.category = Category.objects.filter(name__iexact=str(category_id)).first() or req.category

        metal_alloy_id = data.get('metal_alloy_id') or data.get('metal_alloy')
        if req and metal_alloy_id:
            if str(metal_alloy_id).isdigit():
                req.metal_alloy = MetalAlloy.objects.filter(id=int(metal_alloy_id)).first() or req.metal_alloy
            else:
                req.metal_alloy = MetalAlloy.objects.filter(name__iexact=str(metal_alloy_id)).first() or req.metal_alloy

        if req and 'ring_size' in data:
            req.ring_size = data.get('ring_size', '')
        if req and 'ring_size_standard' in data:
            req.ring_size_standard = data.get('ring_size_standard', 'US')
        if req and 'target_weight_grams' in data:
            val = data.get('target_weight_grams')
            req.target_weight_grams = Decimal(str(val)) if val else None
        if req and 'needed_by_date' in data:
            req.needed_by_date = data.get('needed_by_date') or None

        # 3. Customer Info Updates
        client_name = data.get('client_name')
        client_email = data.get('client_email')
        client_phone = data.get('client_phone')
        if req:
            if client_name: req.contact_name = client_name
            if client_email: req.contact_email = client_email
            if client_phone: req.contact_phone = client_phone
        if order.client:
            if client_phone:
                order.client.phone_number = client_phone
            if client_name:
                parts = client_name.split(' ', 1)
                order.client.first_name = parts[0]
                if len(parts) > 1:
                    order.client.last_name = parts[1]
            order.client.save()

        # 4. Pricing & Commission
        if 'total_price' in data and data['total_price'] is not None:
            try:
                order.total_price = Decimal(str(data['total_price']))
                if req:
                    req.agreed_price = order.total_price
            except Exception:
                pass

        if 'admin_commission_percentage' in data and data['admin_commission_percentage'] is not None:
            try:
                order.admin_commission_percentage = Decimal(str(data['admin_commission_percentage']))
            except Exception:
                pass

        order.staff_payout_price = order.calculate_staff_payout()

        if 'advance_amount' in data and data['advance_amount'] is not None:
            try:
                order.advance_amount = Decimal(str(data['advance_amount']))
            except Exception:
                pass

        if 'advance_paid' in data:
            order.advance_paid = bool(data['advance_paid'])

        # 5. Deadlines & Schedule
        if 'deadline_hours' in data and data['deadline_hours'] is not None:
            try:
                order.deadline_hours = int(data['deadline_hours'])
                order.due_at = (order.assigned_at or order.created_at or timezone.now()) + timedelta(hours=order.deadline_hours)
            except Exception:
                pass

        if 'due_at' in data and data['due_at']:
            order.due_at = data['due_at']

        # 6. Status
        old_status = order.status
        if 'status' in data and data['status']:
            order.status = data['status']
            if old_status != order.status:
                OrderMilestone.objects.create(
                    order=order,
                    stage=f"Status updated to '{order.status.replace('_', ' ').title()}' by Studio Admin"
                )

        # 7. Assigned Staff
        if 'assigned_staff_id' in data:
            new_staff_id = data['assigned_staff_id']
            if not new_staff_id or str(new_staff_id).strip() in ['', 'null', '0', 'unassigned']:
                old_staff = order.assigned_staff
                order.assigned_staff = None
                if order.status == Order.Status.WITH_DESIGNER:
                    order.status = Order.Status.IN_DESIGN
                order.unassigned_since = timezone.now()
                order.assigned_at = None
                OrderMilestone.objects.create(
                    order=order,
                    stage=f"Unassigned to Open Pool by Studio Admin (Previously: {old_staff.username if old_staff else 'None'})"
                )
            else:
                staff_user = User.objects.filter(id=int(new_staff_id), role=User.Role.STAFF).first() if str(new_staff_id).isdigit() else None
                if staff_user and staff_user != order.assigned_staff:
                    order.assigned_staff = staff_user
                    order.assigned_at = timezone.now()
                    order.unassigned_since = None
                    if order.status in [Order.Status.IN_DESIGN, Order.Status.AWAITING_PAYMENT]:
                        order.status = Order.Status.WITH_DESIGNER
                    OrderMilestone.objects.create(
                        order=order,
                        stage=f"Assigned to Modeller: {staff_user.get_full_name() or staff_user.username}"
                    )
                    create_notification(
                        recipient=staff_user,
                        title=f"Order Updated & Assigned: #{order.id}",
                        body=f"Studio Admin assigned Order #{order.id} to you.",
                        notification_type="general",
                        related_order=order
                    )

        # 8. Notes
        if 'admin_call_notes' in data:
            order.admin_call_notes = data['admin_call_notes']
            if req:
                req.admin_call_notes = data['admin_call_notes']

        if 'admin_review_notes' in data:
            order.admin_review_notes = data['admin_review_notes']

        order.save()
        if req:
            req.save()

        return Response(AdminOrderSerializer(order, context={'request': request}).data)

    # ADMIN CANCEL ORDER
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='cancel')
    def cancel_order(self, request, pk=None):
        order = self.get_object()
        reason = request.data.get('reason', 'Cancelled by Studio Super Admin.')

        order.status = Order.Status.CANCELLED
        order.save(update_fields=['status'])

        OrderMilestone.objects.create(
            order=order,
            stage=f"Order Cancelled: {reason[:120]}"
        )

        # Notify client
        if order.client:
            create_notification(
                recipient=order.client,
                title=f"Order #{order.id} Cancelled",
                body=f"Your order #{order.id} has been cancelled by the studio. Reason: {reason}",
                notification_type="general",
                related_order=order
            )

        # Notify assigned staff
        if order.assigned_staff:
            create_notification(
                recipient=order.assigned_staff,
                title=f"Assignment Cancelled: Order #{order.id}",
                body=f"Order #{order.id} on your workbench has been cancelled.",
                notification_type="general",
                related_order=order
            )

        return Response({
            "message": f"Order #{order.id} has been successfully cancelled.",
            "order": AdminOrderSerializer(order, context={'request': request}).data
        })

    # ADMIN DELETE ORDER PERMANENTLY
    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '') != 'admin' and not getattr(request.user, 'is_superuser', False):
            return Response({"error": "Forbidden. Only Studio Super Admins can permanently delete orders."}, status=status.HTTP_403_FORBIDDEN)

        instance = self.get_object()
        order_id = instance.id

        try:
            # 1. Delete protected deliverables files
            from apps.catalog.models import protected_cad_storage
            for deliverable in instance.deliverables.all():
                if deliverable.file:
                    try:
                        if protected_cad_storage.exists(deliverable.file.name):
                            protected_cad_storage.delete(deliverable.file.name)
                        else:
                            deliverable.file.delete(save=False)
                    except Exception:
                        pass

            # 2. Clean up associated payments and stages
            instance.payments.all().delete()
            instance.payment_stages.all().delete()
            instance.deliverables.all().delete()
            instance.milestones.all().delete()
            instance.revision_requests.all().delete()

            # Clean up linked custom request if direct admin created
            custom_req = instance.custom_request
            instance.custom_request = None
            instance.save(update_fields=['custom_request'])

            if custom_req and custom_req.request_mode == 'direct':
                custom_req.delete()

            instance.delete()

            return Response(
                {"message": f"Order #{order_id} has been permanently deleted from the database."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to permanently delete order #{order_id}: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class RevisionRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RevisionRequestSerializer
    queryset = RevisionRequest.objects.all().select_related('order', 'client', 'addressed_by')

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', '') in ['admin', 'staff'] or getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
            return RevisionRequest.objects.all().select_related('order', 'client', 'addressed_by').order_by('-created_at')
        return RevisionRequest.objects.filter(client=user).select_related('order', 'client', 'addressed_by').order_by('-created_at')

    def partial_update(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '') not in ['admin', 'staff'] and not getattr(request.user, 'is_staff', False) and not getattr(request.user, 'is_superuser', False):
            return Response({"error": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        new_status = request.data.get('status')
        if new_status:
            instance.status = new_status
            if new_status == RevisionRequest.Status.ADDRESSED:
                instance.addressed_at = timezone.now()
                instance.addressed_by = request.user
            instance.save()
        return Response(RevisionRequestSerializer(instance, context={'request': request}).data)
