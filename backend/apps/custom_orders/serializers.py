from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from apps.catalog.serializers import ProductListSerializer, CategorySerializer
from .models import (
    CustomRequest,
    NegotiationMessage,
    Order,
    OrderMilestone,
    OrderDeliverable,
    RevisionRequest,
    AestheticStyle,
    MetalAlloy,
    GemstoneOption,
    PricingRule,
    CustomRequestGemstone,
    CustomRequestImage,
    OptionGroup,
    OptionValue,
    CustomRequestSelection,
    CustomRequestStone
)


class OptionValueSerializer(serializers.ModelSerializer):
    group_key = serializers.CharField(source='group.key', read_only=True)
    key = serializers.SerializerMethodField()

    class Meta:
        model = OptionValue
        fields = [
            'id', 'group', 'group_key', 'key', 'label', 'price_modifier', 'modifier_type',
            'swatch_color', 'icon', 'is_active', 'display_order'
        ]

    def get_key(self, obj):
        return obj.label.lower().replace(' ', '_')


class OptionGroupSerializer(serializers.ModelSerializer):
    values = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()

    class Meta:
        model = OptionGroup
        fields = [
            'id', 'key', 'label', 'is_required', 'allows_other',
            'display_order', 'applies_to_categories', 'values', 'options'
        ]

    def get_values(self, obj):
        active_values = obj.values.filter(is_active=True).order_by('display_order', 'id')
        return OptionValueSerializer(active_values, many=True).data

    def get_options(self, obj):
        return self.get_values(obj)


class CustomRequestSelectionSerializer(serializers.ModelSerializer):
    group_key = serializers.CharField(source='group.key', read_only=True)
    group_label = serializers.CharField(source='group.label', read_only=True)
    value_label = serializers.SerializerMethodField()
    swatch_color = serializers.SerializerMethodField()
    price_modifier = serializers.DecimalField(source='value.price_modifier', max_digits=10, decimal_places=2, read_only=True)
    modifier_type = serializers.CharField(source='value.modifier_type', read_only=True)

    class Meta:
        model = CustomRequestSelection
        fields = [
            'id', 'group', 'group_key', 'group_label',
            'value', 'value_label', 'swatch_color', 'price_modifier', 'modifier_type',
            'other_text'
        ]

    def get_value_label(self, obj):
        if obj.value and obj.value.label:
            return obj.value.label
        return obj.other_text or ''

    def get_swatch_color(self, obj):
        if obj.value and obj.value.swatch_color:
            return obj.value.swatch_color
        return ''


class CustomRequestStoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomRequestStone
        fields = [
            'id', 'stone_type', 'shape', 'setting_style', 'quantity', 'size_value', 'size_unit',
            'color', 'clarity', 'is_center_stone'
        ]


class AestheticStyleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AestheticStyle
        fields = ['id', 'name', 'price_addon', 'display_order']


class MetalAlloySerializer(serializers.ModelSerializer):
    class Meta:
        model = MetalAlloy
        fields = ['id', 'name', 'swatch_color', 'price_multiplier', 'display_order']


class GemstoneOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GemstoneOption
        fields = ['id', 'stone_type', 'cut_type', 'price_per_unit']


class PricingRuleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = PricingRule
        fields = ['id', 'category', 'category_name', 'base_price']


class CustomRequestGemstoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomRequestGemstone
        fields = ['id', 'stone_type', 'cut_type', 'carat_size', 'quantity']


class CustomRequestImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomRequestImage
        fields = ['id', 'image', 'image_url', 'is_draft', 'uploaded_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None


class NegotiationMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = NegotiationMessage
        fields = ['id', 'request', 'sender_type', 'message', 'offered_price', 'created_at']
        read_only_fields = ['id', 'sender_type', 'created_at']


from apps.payments.serializers import OrderPaymentStageSerializer


def resolve_catalog_references(obj, request=None):
    if hasattr(obj, 'catalog_references_data') and obj.catalog_references_data and len(obj.catalog_references_data) > 0:
        return obj.catalog_references_data

    import re
    text = f"{getattr(obj, 'special_instructions', '') or ''} {getattr(obj, 'description', '') or ''}"
    matches = re.findall(r'\[Ref SKU:\s*(\d+)(?:\s*-\s*([^\]]+))?\]', text)
    if matches:
        from apps.catalog.models import Product
        refs = []
        for m in matches:
            pid = m[0]
            title = m[1].strip() if m[1] else ''
            p = Product.objects.filter(id=pid).first()
            if not p and title:
                p = Product.objects.filter(title__icontains=title).first()

            if p:
                img_url = ''
                first_img = p.images.first()
                if first_img and first_img.image:
                    img_url = request.build_absolute_uri(first_img.image.url) if request else first_img.image.url
                refs.append({
                    'id': p.id,
                    'title': p.title,
                    'sku': f"SKU-{p.id}",
                    'price': float(p.price),
                    'image': img_url
                })
            elif title:
                fallback_img = ''
                lower_title = title.lower()
                if 'royal solitaire' in lower_title or 'ring' in lower_title:
                    fallback_img = '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80'
                elif 'sapphire' in lower_title or 'pendant' in lower_title:
                    fallback_img = '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80'
                elif 'bangle' in lower_title or 'bracelet' in lower_title:
                    fallback_img = '/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80'
                refs.append({
                    'id': pid,
                    'title': title,
                    'sku': f"SKU-{pid}",
                    'image': fallback_img
                })
        if refs:
            # Deduplicate by id and title
            seen = set()
            deduped = []
            for r in refs:
                key = (str(r.get('id')), r.get('title'))
                if key not in seen:
                    seen.add(key)
                    deduped.append(r)
            return deduped
    return []


def resolve_reference_image(obj, request=None):
    if obj.reference_image:
        return request.build_absolute_uri(obj.reference_image.url) if request else obj.reference_image.url

    cat_refs = resolve_catalog_references(obj, request)
    if cat_refs and isinstance(cat_refs, list) and len(cat_refs) > 0:
        first_img = cat_refs[0].get('image')
        if first_img:
            return first_img

    first_sketch = obj.sketches.first()
    if first_sketch and first_sketch.image:
        return request.build_absolute_uri(first_sketch.image.url) if request else first_sketch.image.url

    return None


class CustomRequestSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    aesthetic_style_name = serializers.CharField(source='aesthetic_style.name', read_only=True)
    metal_alloy_name = serializers.CharField(source='metal_alloy.name', read_only=True)
    metal_swatch_color = serializers.CharField(source='metal_alloy.swatch_color', read_only=True)
    delivery_speed_name = serializers.CharField(source='delivery_speed.label', read_only=True)
    reference_image = serializers.SerializerMethodField()
    catalog_references = serializers.SerializerMethodField()
    voice_recording_url = serializers.SerializerMethodField()
    reference_product_title = serializers.CharField(source='reference_product.title', read_only=True)
    reference_product_slug = serializers.CharField(source='reference_product.slug', read_only=True)
    reference_product_price = serializers.DecimalField(source='reference_product.price', max_digits=10, decimal_places=2, read_only=True)
    reference_product_image = serializers.SerializerMethodField()

    gemstones = CustomRequestGemstoneSerializer(many=True, read_only=True)
    stones = CustomRequestStoneSerializer(many=True, read_only=True)
    selections = CustomRequestSelectionSerializer(many=True, read_only=True)
    sketches = CustomRequestImageSerializer(many=True, read_only=True)
    messages = NegotiationMessageSerializer(many=True, read_only=True)

    order = serializers.SerializerMethodField()

    # Input fields for creation
    draft_sketch_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    stones_data = serializers.JSONField(write_only=True, required=False)
    selections_data = serializers.JSONField(write_only=True, required=False)
    catalog_references_data = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = CustomRequest
        fields = [
            'id', 'client', 'client_name', 'request_mode', 'category', 'category_name',
            'aesthetic_style', 'aesthetic_style_name', 'metal_alloy',
            'metal_alloy_name', 'metal_swatch_color', 'gemstone_preference_open',
            'ring_size', 'ring_size_standard', 'target_weight_grams', 'budget_range',
            'needed_by_date', 'is_metal_only', 'engraving_text', 'engraving_font',
            'engraving_placement', 'has_logo', 'logo_file', 'special_instructions',
            'delivery_speed', 'delivery_speed_name', 'submission_intent',
            'estimated_price_shown', 'timeline', 'reference_image', 'catalog_references',
            'reference_product', 'reference_product_title', 'reference_product_slug',
            'reference_product_price', 'reference_product_image',
            'voice_recording', 'voice_recording_url', 'description',
            'contact_name', 'contact_phone', 'contact_email', 'status', 'agreed_price',
            'client_consent_to_feature',
            'gemstones', 'stones', 'selections', 'sketches', 'messages',
            'draft_sketch_ids', 'stones_data', 'selections_data', 'catalog_references_data', 'order', 'created_at'
        ]
        read_only_fields = ['id', 'client', 'status', 'created_at']

    def get_reference_image(self, obj):
        return resolve_reference_image(obj, self.context.get('request'))

    def get_catalog_references(self, obj):
        return resolve_catalog_references(obj, self.context.get('request'))

    def get_voice_recording_url(self, obj):
        request = self.context.get('request')
        if obj.voice_recording:
            return request.build_absolute_uri(obj.voice_recording.url) if request else obj.voice_recording.url
        return None

    def get_reference_product_image(self, obj):
        if obj.reference_product:
            first_img = obj.reference_product.images.first()
            if first_img and first_img.image:
                request = self.context.get('request')
                return request.build_absolute_uri(first_img.image.url) if request else first_img.image.url
        return None

    def get_order(self, obj):
        if hasattr(obj, 'order') and obj.order:
            request = self.context.get('request')
            return ClientOrderSerializer(obj.order, context={'request': request}).data
        return None

    def get_client_name(self, obj):
        if obj.client:
            return obj.client.username
        return obj.contact_name or 'Guest'

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)

        # Map client_name / client_phone / client_email to contact fields
        if data.get('client_name') and not data.get('contact_name'):
            data['contact_name'] = data['client_name']
        if data.get('client_phone') and not data.get('contact_phone'):
            data['contact_phone'] = data['client_phone']
        if data.get('client_email') and not data.get('contact_email'):
            data['contact_email'] = data['client_email']

        # Map stones, selected_options, and catalog_references if sent with frontend names
        if data.get('stones') and not data.get('stones_data'):
            data['stones_data'] = data['stones']
        if data.get('selected_options') and not data.get('selections_data'):
            data['selections_data'] = data['selected_options']
        if data.get('catalog_references') and not data.get('catalog_references_data'):
            data['catalog_references_data'] = data['catalog_references']
        if data.get('reference_product_id') and not data.get('reference_product'):
            data['reference_product'] = data['reference_product_id']

        # Auto-match category if category is missing or invalid
        if not data.get('category'):
            cat_group = str(data.get('category_group') or '').lower()
            if 'ring' in cat_group:
                cat = Category.objects.filter(slug__icontains='ring').first()
                if cat: data['category'] = cat.id
            elif 'pendant' in cat_group or 'necklace' in cat_group:
                cat = Category.objects.filter(slug__icontains='pendant').first() or Category.objects.filter(slug__icontains='necklace').first()
                if cat: data['category'] = cat.id
            elif 'earring' in cat_group:
                cat = Category.objects.filter(slug__icontains='earring').first()
                if cat: data['category'] = cat.id
            elif 'bracelet' in cat_group or 'bangle' in cat_group:
                cat = Category.objects.filter(slug__icontains='bracelet').first()
                if cat: data['category'] = cat.id

        # Sync description and special_instructions
        if not data.get('description') and data.get('special_instructions'):
            data['description'] = data['special_instructions']
        elif not data.get('special_instructions') and data.get('description'):
            data['special_instructions'] = data['description']

        # Normalize ring_size_standard
        if data.get('ring_size_standard'):
            val = str(data['ring_size_standard']).lower().strip()
            if val in ['in_hk', 'in', 'hk', 'indian']:
                data['ring_size_standard'] = 'in_hk'
            elif val in ['us', 'uk', 'eu', 'mm']:
                data['ring_size_standard'] = val
            else:
                data['ring_size_standard'] = val

        return super().to_internal_value(data)

    def create(self, validated_data):
        draft_sketch_ids = validated_data.pop('draft_sketch_ids', [])
        stones_data = validated_data.pop('stones_data', [])
        selections_data = validated_data.pop('selections_data', [])
        catalog_references_data = validated_data.pop('catalog_references_data', [])

        req = self.context.get('request')
        user = req.user if req and hasattr(req, 'user') else None
        if not validated_data.get('contact_name'):
            if user and user.is_authenticated:
                validated_data['contact_name'] = f"{user.first_name} {user.last_name}".strip() or user.username
            else:
                validated_data['contact_name'] = 'Client'

        if not validated_data.get('contact_phone'):
            if user and user.is_authenticated:
                validated_data['contact_phone'] = getattr(user, 'phone_number', '') or ''

        if not validated_data.get('contact_email'):
            if user and user.is_authenticated:
                validated_data['contact_email'] = getattr(user, 'email', '') or ''

        if catalog_references_data:
            validated_data['catalog_references_data'] = catalog_references_data

        custom_req = CustomRequest.objects.create(**validated_data)

        if draft_sketch_ids and isinstance(draft_sketch_ids, list):
            CustomRequestImage.objects.filter(id__in=draft_sketch_ids, is_draft=True).update(
                request=custom_req,
                is_draft=False
            )

        if stones_data and isinstance(stones_data, list):
            for s in stones_data:
                if isinstance(s, dict):
                    CustomRequestStone.objects.create(
                        request=custom_req,
                        stone_type=s.get('stone_type', 'Natural Diamond'),
                        shape=str(s.get('shape', '')),
                        setting_style=str(s.get('setting_style', '')),
                        quantity=int(s.get('quantity', 1)),
                        size_value=str(s.get('size_value', '')),
                        size_unit=s.get('size_unit', 'carat'),
                        color=str(s.get('color', '')),
                        clarity=str(s.get('clarity', '')),
                        is_center_stone=bool(s.get('is_center_stone', False))
                    )

        if selections_data and isinstance(selections_data, list):
            for sel in selections_data:
                if isinstance(sel, dict):
                    group_id = sel.get('group') or sel.get('group_id') or sel.get('option_group') or sel.get('group_key')
                    value_id = sel.get('value') or sel.get('value_id') or sel.get('option_value')
                    value_label = sel.get('value_label') or sel.get('label') or ''
                    other_text = sel.get('other_text', '') or value_label
                    if group_id:
                        group_obj = (
                            OptionGroup.objects.filter(id=group_id).first()
                            if str(group_id).isdigit() else None
                        ) or OptionGroup.objects.filter(key=str(group_id)).first() or OptionGroup.objects.filter(label__iexact=str(group_id)).first()

                        if group_obj:
                            val_obj = None
                            if value_id and str(value_id).isdigit():
                                val_obj = OptionValue.objects.filter(id=int(value_id), group=group_obj).first()
                            if not val_obj and value_label:
                                val_obj = OptionValue.objects.filter(group=group_obj, label__iexact=str(value_label).strip()).first()
                            if not val_obj and value_id:
                                val_obj = OptionValue.objects.filter(group=group_obj, label__iexact=str(value_id).strip()).first()

                            final_label = val_obj.label if val_obj else (value_label or str(other_text or ''))
                            CustomRequestSelection.objects.create(
                                request=custom_req,
                                group=group_obj,
                                value=val_obj,
                                other_text=final_label
                            )

        return custom_req


# NON-CIRCULAR SUMMARY SERIALIZER FOR EMBEDDING INSIDE ORDERS
class OrderCustomRequestSummarySerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    aesthetic_style_name = serializers.CharField(source='aesthetic_style.name', read_only=True)
    metal_alloy_name = serializers.CharField(source='metal_alloy.name', read_only=True)
    metal_swatch_color = serializers.CharField(source='metal_alloy.swatch_color', read_only=True)
    delivery_speed_name = serializers.CharField(source='delivery_speed.label', read_only=True)
    reference_image = serializers.SerializerMethodField()
    catalog_references = serializers.SerializerMethodField()
    voice_recording_url = serializers.SerializerMethodField()
    reference_product_title = serializers.CharField(source='reference_product.title', read_only=True)
    reference_product_slug = serializers.CharField(source='reference_product.slug', read_only=True)
    reference_product_price = serializers.DecimalField(source='reference_product.price', max_digits=10, decimal_places=2, read_only=True)
    reference_product_image = serializers.SerializerMethodField()

    gemstones = CustomRequestGemstoneSerializer(many=True, read_only=True)
    stones = CustomRequestStoneSerializer(many=True, read_only=True)
    selections = CustomRequestSelectionSerializer(many=True, read_only=True)
    sketches = CustomRequestImageSerializer(many=True, read_only=True)
    messages = NegotiationMessageSerializer(many=True, read_only=True)

    class Meta:
        model = CustomRequest
        fields = [
            'id', 'client', 'client_name', 'request_mode', 'category', 'category_name',
            'aesthetic_style', 'aesthetic_style_name', 'metal_alloy',
            'metal_alloy_name', 'metal_swatch_color', 'gemstone_preference_open',
            'ring_size', 'ring_size_standard', 'target_weight_grams', 'budget_range',
            'needed_by_date', 'is_metal_only', 'engraving_text', 'engraving_font',
            'engraving_placement', 'has_logo', 'logo_file', 'special_instructions',
            'delivery_speed', 'delivery_speed_name', 'submission_intent',
            'estimated_price_shown', 'timeline', 'reference_image', 'catalog_references',
            'reference_product', 'reference_product_title', 'reference_product_slug',
            'reference_product_price', 'reference_product_image',
            'voice_recording', 'voice_recording_url', 'description',
            'contact_name', 'contact_phone', 'contact_email', 'status', 'agreed_price',
            'client_consent_to_feature',
            'gemstones', 'stones', 'selections', 'sketches', 'messages', 'created_at'
        ]

    def get_reference_image(self, obj):
        return resolve_reference_image(obj, self.context.get('request'))

    def get_catalog_references(self, obj):
        return resolve_catalog_references(obj, self.context.get('request'))

    def get_voice_recording_url(self, obj):
        request = self.context.get('request')
        if obj.voice_recording:
            return request.build_absolute_uri(obj.voice_recording.url) if request else obj.voice_recording.url
        return None

    def get_reference_product_image(self, obj):
        if obj.reference_product:
            first_img = obj.reference_product.images.first()
            if first_img and first_img.image:
                request = self.context.get('request')
                return request.build_absolute_uri(first_img.image.url) if request else first_img.image.url
        return None

    def get_client_name(self, obj):
        if obj.client:
            return obj.client.username
        return obj.contact_name or 'Guest'


# STAFF-SAFE CUSTOM REQUEST SERIALIZER (Shows full technical CAD specifications without pricing)
class StaffCustomRequestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    aesthetic_style_name = serializers.CharField(source='aesthetic_style.name', read_only=True)
    metal_alloy_name = serializers.CharField(source='metal_alloy.name', read_only=True)
    metal_swatch_color = serializers.CharField(source='metal_alloy.swatch_color', read_only=True)
    reference_image = serializers.SerializerMethodField()
    catalog_references = serializers.SerializerMethodField()
    gemstones = CustomRequestGemstoneSerializer(many=True, read_only=True)
    stones = CustomRequestStoneSerializer(many=True, read_only=True)
    selections = CustomRequestSelectionSerializer(many=True, read_only=True)
    sketches = CustomRequestImageSerializer(many=True, read_only=True)
    client_display_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomRequest
        fields = [
            'id', 'category_name', 'aesthetic_style_name', 'metal_alloy_name',
            'metal_swatch_color', 'gemstone_preference_open', 'timeline',
            'ring_size', 'ring_size_standard', 'target_weight_grams', 'is_metal_only',
            'engraving_text', 'engraving_font', 'engraving_placement', 'has_logo', 'logo_file',
            'special_instructions', 'description', 'client_display_name', 'needed_by_date',
            'budget_range', 'client_consent_to_feature',
            'reference_image', 'catalog_references',
            'gemstones', 'stones', 'selections', 'sketches', 'created_at'
        ]

    def get_reference_image(self, obj):
        return resolve_reference_image(obj, self.context.get('request'))

    def get_catalog_references(self, obj):
        return resolve_catalog_references(obj, self.context.get('request'))

    def get_client_display_name(self, obj):
        return obj.contact_name or "Valued Client"


class OrderMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderMilestone
        fields = ['id', 'stage', 'reached_at']
        read_only_fields = ['id', 'reached_at']


class OrderDeliverableSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = OrderDeliverable
        fields = ['id', 'version', 'file_type', 'file', 'file_url', 'filename', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'version', 'file_url', 'filename', 'file_size', 'uploaded_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if not obj.file:
            return None
        user = getattr(request, 'user', None)
        # Provide direct admin/staff download endpoint
        if user and (getattr(user, 'is_staff', False) or getattr(user, 'role', '') in ['admin', 'staff']):
            url = f"/api/orders/{obj.order_id}/deliverables/{obj.id}/download/"
            if request:
                auth_header = request.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    token = auth_header.split('Bearer ')[1].strip()
                    if token:
                        url += f"?token={token}"
                return request.build_absolute_uri(url)
            return url
        return None

    def get_filename(self, obj):
        if obj.file:
            import os
            raw_name = os.path.basename(obj.file.name)
            prefix = f"ord_{obj.order_id}_{obj.file_type}_"
            if raw_name.startswith(prefix):
                return raw_name[len(prefix):]
            elif raw_name.startswith(f"ord_{obj.order_id}_"):
                return raw_name[len(f"ord_{obj.order_id}_"):]
            return raw_name
        return ""

    def get_file_size(self, obj):
        if obj.file:
            try:
                from apps.catalog.models import protected_cad_storage
                if protected_cad_storage.exists(obj.file.name):
                    size_bytes = protected_cad_storage.size(obj.file.name)
                else:
                    size_bytes = obj.file.size
                if size_bytes < 1024:
                    return f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
                    return f"{round(size_bytes / 1024, 1)} KB"
                else:
                    return f"{round(size_bytes / (1024 * 1024), 1)} MB"
            except Exception:
                pass
        return ""


class RevisionRequestSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    client_email = serializers.CharField(source='client.email', read_only=True)
    voice_note_url = serializers.SerializerMethodField()
    reference_image_url = serializers.SerializerMethodField()
    addressed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = RevisionRequest
        fields = [
            'id', 'order', 'deliverable_version', 'revision_number',
            'client', 'client_name', 'client_email',
            'comment', 'voice_note', 'voice_note_url',
            'reference_image', 'reference_image_url',
            'is_paid', 'fee_charged', 'status',
            'created_at', 'addressed_at', 'addressed_by', 'addressed_by_name'
        ]
        read_only_fields = [
            'id', 'order', 'deliverable_version', 'revision_number',
            'client', 'client_name', 'client_email',
            'voice_note_url', 'reference_image_url', 'addressed_by_name',
            'created_at', 'addressed_at', 'addressed_by'
        ]

    def get_client_name(self, obj):
        return obj.client.get_full_name() or obj.client.username if obj.client else 'Client'

    def get_voice_note_url(self, obj):
        request = self.context.get('request')
        if obj.voice_note:
            try:
                return request.build_absolute_uri(obj.voice_note.url) if request else obj.voice_note.url
            except Exception:
                return None
        return None

    def get_reference_image_url(self, obj):
        request = self.context.get('request')
        if obj.reference_image:
            try:
                return request.build_absolute_uri(obj.reference_image.url) if request else obj.reference_image.url
            except Exception:
                return None
        return None

    def get_addressed_by_name(self, obj):
        if obj.addressed_by:
            return obj.addressed_by.get_full_name() or obj.addressed_by.username
        return None


# STAFF-SAFE ORDER SERIALIZER (Stage 6 Critical Rule: ABSOLUTELY NO PRICE FIELDS)
class StaffOrderSerializer(serializers.ModelSerializer):
    custom_request = StaffCustomRequestSerializer(read_only=True)
    deliverables = OrderDeliverableSerializer(many=True, read_only=True)
    milestones = OrderMilestoneSerializer(many=True, read_only=True)
    revision_requests = RevisionRequestSerializer(many=True, read_only=True)
    preview_image = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_type', 'current_version', 'custom_request', 'status',
            'deadline_hours', 'due_at', 'is_overdue', 'assigned_at',
            'unassigned_since', 'preview_image', 'admin_review_notes',
            'milestones', 'deliverables', 'revision_requests', 'created_at'
        ]

    def get_preview_image(self, obj):
        request = self.context.get('request')
        if obj.preview_image:
            return request.build_absolute_uri(obj.preview_image.url) if request else obj.preview_image.url
        return None


# FULL ADMIN ORDER SERIALIZER
class AdminOrderSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    assigned_staff = UserSerializer(read_only=True)
    product = ProductListSerializer(read_only=True)
    custom_request = OrderCustomRequestSummarySerializer(read_only=True)
    milestones = OrderMilestoneSerializer(many=True, read_only=True)
    payment_stages = OrderPaymentStageSerializer(many=True, read_only=True)
    deliverables = OrderDeliverableSerializer(many=True, read_only=True)
    revision_requests = RevisionRequestSerializer(many=True, read_only=True)
    preview_image = serializers.SerializerMethodField()
    is_fully_paid = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'client', 'order_type', 'current_version', 'product', 'custom_request',
            'assigned_staff', 'total_price', 'advance_amount', 'advance_paid',
            'balance_paid', 'status', 'deadline_hours', 'due_at', 'is_overdue',
            'warning_50_sent', 'warning_80_sent', 'preview_image',
            'admin_review_notes', 'quality_approved', 'settlement_status',
            'download_enabled_by_admin', 'download_count', 'is_fully_paid',
            'unassigned_since', 'assigned_at', 'handed_over_at',
            'milestones', 'payment_stages', 'deliverables', 'revision_requests', 'created_at'
        ]

    def get_preview_image(self, obj):
        request = self.context.get('request')
        if obj.preview_image:
            return request.build_absolute_uri(obj.preview_image.url) if request else obj.preview_image.url
        return None

    def get_is_fully_paid(self, obj):
        stages = obj.payment_stages.all()
        if not stages.exists():
            return False
        return all(s.status == 'paid' for s in stages)


# CLIENT ORDER SERIALIZER (Shows preview image ONLY when status="preview_ready" or higher)
class ClientOrderSerializer(serializers.ModelSerializer):
    assigned_staff = UserSerializer(read_only=True)
    custom_request = OrderCustomRequestSummarySerializer(read_only=True)
    payment_stages = OrderPaymentStageSerializer(many=True, read_only=True)
    deliverables = serializers.SerializerMethodField()
    preview_image = serializers.SerializerMethodField()
    milestones = OrderMilestoneSerializer(many=True, read_only=True)
    revision_requests = RevisionRequestSerializer(many=True, read_only=True)
    revision_policy = serializers.SerializerMethodField()
    is_fully_paid = serializers.SerializerMethodField()
    can_download = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_type', 'current_version', 'custom_request', 'assigned_staff',
            'total_price', 'status', 'deadline_hours', 'due_at',
            'is_overdue', 'payment_stages', 'deliverables', 'preview_image',
            'quality_approved', 'is_fully_paid', 'download_enabled_by_admin',
            'can_download', 'download_count', 'milestones',
            'revision_requests', 'revision_policy', 'created_at'
        ]

    def get_preview_image(self, obj):
        # Preview image becomes visible once review is ready, submitted for QC, or in revision review
        if obj.status in [Order.Status.PREVIEW_READY, Order.Status.REVISION_REQUESTED, Order.Status.PENDING_REVIEW, Order.Status.PENDING_FINAL_PAYMENT, Order.Status.COMPLETED] or obj.quality_approved:
            request = self.context.get('request')
            if obj.preview_image:
                return request.build_absolute_uri(obj.preview_image.url) if request else obj.preview_image.url
        return None

    def get_is_fully_paid(self, obj):
        stages = obj.payment_stages.all()
        if not stages.exists():
            return False
        return all(s.status == 'paid' for s in stages)

    def get_can_download(self, obj):
        # Client can download only when fully paid AND admin toggled ON
        return bool(self.get_is_fully_paid(obj) and obj.download_enabled_by_admin)

    def get_deliverables(self, obj):
        # Deliverables list is visible to client once files are uploaded so they can see packaged deliverables
        request = self.context.get('request')
        return OrderDeliverableSerializer(obj.deliverables.all(), many=True, context={'request': request}).data

    def get_revision_policy(self, obj):
        try:
            from apps.staff_management.models import PlatformSettings
            settings_obj = PlatformSettings.load()
            free_allowed = settings_obj.free_revisions_allowed
            extra_fee = float(settings_obj.extra_revision_fee)
        except Exception:
            free_allowed = 2
            extra_fee = 500.00
        used_count = obj.revision_requests.count()
        remaining_free = max(0, free_allowed - used_count)
        return {
            'free_revisions_allowed': free_allowed,
            'extra_revision_fee': extra_fee,
            'used_revisions': used_count,
            'remaining_free': remaining_free,
            'is_free_next': used_count < free_allowed
        }


# DEFAULT ORDER SERIALIZER (For fallback/compatibility)
OrderSerializer = AdminOrderSerializer
