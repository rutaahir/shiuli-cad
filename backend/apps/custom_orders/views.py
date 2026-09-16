import secrets
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsClient, IsStaff, IsAdmin, IsStaffOrAdmin
from apps.staff_management.models import PlatformSettings
from .models import (
    CustomRequest, NegotiationMessage, Order, OrderMilestone, OrderDeliverable,
    AestheticStyle, MetalAlloy, GemstoneOption, PricingRule, CustomRequestGemstone, CustomRequestImage,
    OptionGroup, OptionValue, CustomRequestSelection, CustomRequestStone
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
        if getattr(user, 'role', None) == 'admin':
            return CustomRequest.objects.all().order_by('-created_at')
        # Stage 1: Visible ONLY to client who created it and Admin. NEVER visible to staff.
        if getattr(user, 'role', None) == 'staff':
            return CustomRequest.objects.none()
        return CustomRequest.objects.filter(client=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        if not user:
            from apps.accounts.models import User
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

    # STAGE 2 — ADMIN REVIEWS & SENDS OFFICIAL PRICE QUOTE
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin], url_path='quote')
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
            body=f"Admin sent an official quote of ₹{price} for Custom Request #{custom_req.id}.",
            notification_type="quote_received",
            related_order=None
        )

        return Response(CustomRequestSerializer(custom_req, context={'request': request}).data)

    # STAGE 3 — TWO-WAY NEGOTIATION (CLIENT OR ADMIN COUNTER)
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='negotiate')
    def negotiate(self, request, pk=None):
        custom_req = self.get_object()
        counter_price = request.data.get('price')
        message_text = request.data.get('message', '')

        if not message_text and not counter_price:
            return Response({"error": "Message or counter-offer price is required."}, status=status.HTTP_400_BAD_REQUEST)

        sender_type = NegotiationMessage.SenderType.ADMIN if request.user.role == 'admin' else NegotiationMessage.SenderType.CLIENT

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

    # STAGE 3 — ACCEPT QUOTE / OFFER (LOCKS AGREED_PRICE)
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='accept-quote')
    def accept_quote(self, request, pk=None):
        custom_req = self.get_object()
        if custom_req.status not in [CustomRequest.Status.QUOTED, CustomRequest.Status.NEGOTIATING]:
            return Response({"error": "Custom request cannot be accepted in its current state."}, status=status.HTTP_400_BAD_REQUEST)

        custom_req.status = CustomRequest.Status.AGREED
        if not custom_req.agreed_price:
            latest_offer = custom_req.messages.filter(offered_price__isnull=False).order_by('-created_at').first()
            custom_req.agreed_price = latest_offer.offered_price if latest_offer else (custom_req.estimated_price_shown or 100.00)
        custom_req.save()

        # Automatically create Order & default payment stages if not existing, and release to staff job pool
        from apps.payments.models import OrderPaymentStage
        total_price = float(custom_req.agreed_price)
        advance_amount = round(total_price * 0.10, 2)

        if not hasattr(custom_req, 'order') or not custom_req.order:
            order = Order.objects.create(
                client=custom_req.client,
                order_type=Order.OrderType.CUSTOM,
                custom_request=custom_req,
                total_price=total_price,
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


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

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

        if user.role == 'client':
            return queryset.filter(client=user).order_by('-created_at')
        elif user.role == 'staff':
            # Staff only sees orders assigned to them
            return queryset.filter(assigned_staff=user).order_by('-created_at')
        elif user.role == 'admin':
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
        if order.assigned_staff and order.assigned_staff != request.user and getattr(request.user, 'role', None) != 'admin' and not getattr(request.user, 'is_superuser', False):
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

        # Delete existing deliverable for this file_type to ensure clean replacement
        OrderDeliverable.objects.filter(order=order, file_type=file_type).delete()

        deliverable = OrderDeliverable(order=order, file_type=file_type)
        if file_type in ['3dm', 'stl']:
            from apps.catalog.models import protected_cad_storage
            saved_name = protected_cad_storage.save(f"orders/deliverables/ord_{order.id}_{file_type}_{file_obj.name}", file_obj)
            deliverable.file.name = saved_name
        else:
            deliverable.file = file_obj

        deliverable.save()

        return Response(StaffOrderSerializer(order, context={'request': request}).data)

    # SUBMIT & COMPLETE JOB ACTION (Pending Admin QC)
    @action(detail=True, methods=['post'], permission_classes=[IsStaff], url_path='complete')
    def complete_order_action(self, request, pk=None):
        return self.submit_for_review(request, pk)

    @action(detail=True, methods=['post'], permission_classes=[IsStaff], url_path='submit-for-review')
    def submit_for_review(self, request, pk=None):
        order = self.get_object()
        if order.assigned_staff and order.assigned_staff != request.user and getattr(request.user, 'role', None) != 'admin' and not getattr(request.user, 'is_superuser', False):
            return Response({"error": "Forbidden. You are not assigned to this order."}, status=status.HTTP_403_FORBIDDEN)

        if not order.assigned_staff and request.user.is_authenticated:
            order.assigned_staff = request.user

        order.status = Order.Status.PENDING_REVIEW
        order.save(update_fields=['status', 'assigned_staff'])

        create_notification(
            recipient=None,
            title=f"Quality Review Needed: Order #{order.id}",
            body=f"Staff member {request.user.username} submitted Order #{order.id} for Admin QC review.",
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

            create_notification(
                recipient=order.client,
                title="Design Preview Ready!",
                body=f"Your 3D CAD design preview for Order #{order.id} is now ready for review!",
                notification_type="preview_ready",
                related_order=order
            )
            return Response(AdminOrderSerializer(order, context={'request': request}).data)

        elif decision == 'reject':
            order.status = Order.Status.WITH_DESIGNER
            order.admin_review_notes = notes
            order.save(update_fields=['status', 'admin_review_notes'])

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

    # STAGE 12 — GENERATE 6-DIGIT OTP FOR CAD DOWNLOAD UPON 100% PAYMENT
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
        print("\n" + "=" * 70)
        print(f"🔑 [TERMINAL OTP DEBUG LOG] CUSTOM ORDER CAD DOWNLOAD")
        print(f"   Order ID:    #{order.id}")
        print(f"   Buyer Email: {request.user.email}")
        print(f"   VERIFICATION CODE (OTP): >>> {otp_code} <<<")
        print("=" * 70 + "\n")

        try:
            send_mail(
                subject=f"Verify Email to Unlock CAD Deliverable - Order #{order.id}",
                message=(
                    f"Hello {request.user.first_name or request.user.username},\n\n"
                    f"Your custom CAD design Order #{order.id} is 100% paid and ready for delivery!\n\n"
                    f"Your 6-digit email verification code is: {otp_code}\n\n"
                    f"This code will expire in 10 minutes.\n\n"
                    f"Warm regards,\nShiuli CAD Studio Security Team"
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shiulicadstudio.com'),
                recipient_list=[request.user.email],
                fail_silently=True
            )
        except Exception as e:
            print(f"[EMAIL WARNING] Failed to send order OTP email: {e}")

        return Response({
            "message": f"Verification code sent to {request.user.email}.",
            "expires_in_seconds": 600
        })

    # STAGE 12 — VERIFY 6-DIGIT OTP AND GENERATE SECURE DOWNLOAD TOKEN
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

        download_url = f"http://localhost:3000/download/{raw_token}"

        print("\n" + "=" * 70)
        print(f"🔗 [TERMINAL SECURE DOWNLOAD LINK LOG] CUSTOM ORDER")
        print(f"   Order ID:    #{order.id}")
        print(f"   Buyer Email: {request.user.email}")
        print(f"   DOWNLOAD LINK: >>> {download_url} <<<")
        print("=" * 70 + "\n")

        try:
            send_mail(
                subject=f"Your Secure CAD Download Link - Order #{order.id}",
                message=(
                    f"Hello {request.user.first_name or request.user.username},\n\n"
                    f"Your email verification is successful!\n\n"
                    f"Here is your single-use secure CAD download link for Order #{order.id}:\n\n"
                    f"{download_url}\n\n"
                    f"This link is valid for 48 hours and locked to your email account ({request.user.email}).\n\n"
                    f"Warm regards,\nShiuli CAD Studio Security Team"
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shiulicadstudio.com'),
                recipient_list=[request.user.email],
                fail_silently=True
            )
        except Exception as e:
            print(f"[EMAIL WARNING] Failed to send order download token email: {e}")

        return Response({
            "message": f"Verified! Single-use secure download link sent to {request.user.email}.",
            "download_token": raw_token
        })
