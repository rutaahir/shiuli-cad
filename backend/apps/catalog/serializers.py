from django.utils import timezone
from rest_framework import serializers
from .models import Category, DesignStyle, Product, ProductImage, ProductFile

class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    image_display = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'tagline', 'image', 'image_url', 'image_display',
            'parent', 'parent_name', 'display_order', 'commission_percentage', 'subcategories', 'product_count'
        ]

    def get_image_display(self, obj):
        if obj.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return obj.image_url or ''

    def get_subcategories(self, obj):
        if obj.subcategories.exists():
            return CategorySerializer(obj.subcategories.all(), many=True, context=self.context).data
        return []

    def get_product_count(self, obj):
        # Count only APPROVED products for public display
        direct_count = obj.products.filter(status='approved').count()
        sub_count = Product.objects.filter(category__parent=obj, status='approved').count()
        return direct_count + sub_count

class DesignStyleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignStyle
        fields = ['id', 'name']

class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'is_primary', 'display_order']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.image_url or None

class ProductFileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductFile
        fields = ['id', 'file_type', 'file', 'file_url']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    primary_image = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'slug', 'category', 'category_name',
            'price', 'compare_at_price', 'staff_price', 'commission_rate', 'commission_amount',
            'is_active', 'agreed_terms', 'uploaded_by', 'uploaded_by_name',
            'metal_weight_grams', 'stone_count',
            'status', 'is_bestseller', 'is_new', 'is_featured', 'primary_image', 'created_at'
        ]

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            name = f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip()
            return name or obj.uploaded_by.username
        return "Studio Atelier"

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first() or obj.images.first()
        if primary:
            if primary.image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(primary.image.url)
                return primary.image.url
            return primary.image_url
        return None

class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    style_tags = DesignStyleSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    files = serializers.SerializerMethodField()
    has_purchased = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'slug', 'category', 'style_tags', 'uploaded_by',
            'price', 'compare_at_price', 'staff_price', 'commission_rate', 'commission_amount',
            'is_active', 'agreed_terms',
            'commercial_price_markup',
            'atelier_license_desc', 'commercial_license_desc',
            'description', 'metal_weight_grams',
            'stone_count', 'status', 'rejection_reason', 'is_bestseller',
            'is_new', 'is_featured', 'casting_tips', 'specs', 'formats_available',
            'images', 'files', 'has_purchased', 'created_at', 'approved_at'
        ]

    def get_has_purchased(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if request.user.role == 'admin':
            return True
        if request.user == obj.uploaded_by:
            return True
        # Check if client has a paid purchase for this product
        from apps.payments.models import Purchase
        return Purchase.objects.filter(
            buyer=request.user,
            product=obj,
            status='paid'
        ).exists()

    def get_files(self, obj):
        request = self.context.get('request')
        safe_files = []
        for pf in obj.files.all():
            # Preview renders and videos are public
            if pf.file_type in ['render', 'video']:
                url = request.build_absolute_uri(pf.file.url) if (request and pf.file) else None
                safe_files.append({
                    'id': pf.id,
                    'file_type': pf.file_type,
                    'file_url': url
                })
            else:
                # CAD geometry (.3DM / .STL) is NEVER served via direct file URLs
                safe_files.append({
                    'id': pf.id,
                    'file_type': pf.file_type,
                    'file_url': None,
                    'note': 'CAD files are delivered exclusively via secure email OTP verification link.'
                })
        return safe_files


class ProductWriteSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    style_tags = serializers.PrimaryKeyRelatedField(queryset=DesignStyle.objects.all(), many=True, required=False)

    class Meta:
        model = Product
        fields = [
            'id', 'slug', 'title', 'category', 'style_tags', 'price', 'compare_at_price',
            'staff_price', 'commission_rate', 'commission_amount', 'agreed_terms', 'is_active',
            'commercial_price_markup', 'atelier_license_desc', 'commercial_license_desc',
            'description', 'metal_weight_grams', 'stone_count',
            'is_bestseller', 'is_new', 'is_featured', 'casting_tips', 'specs', 'formats_available',
            'status'
        ]
        read_only_fields = ['id', 'slug']

    def create(self, validated_data):
        style_tags = validated_data.pop('style_tags', [])
        user = self.context['request'].user if 'request' in self.context else None

        category = validated_data.get('category')
        if category and not validated_data.get('commission_rate'):
            validated_data['commission_rate'] = getattr(category, 'commission_percentage', 20.00)

        # Both Admin and Staff products go live immediately on the public catalog
        if user and (getattr(user, 'role', '') in ['admin', 'staff'] or getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False)):
            validated_data['status'] = Product.Status.APPROVED
            validated_data['approved_at'] = timezone.now()
        else:
            validated_data['status'] = validated_data.get('status', Product.Status.PENDING)

        if user and user.is_authenticated:
            validated_data['uploaded_by'] = user

        product = Product.objects.create(**validated_data)
        if style_tags:
            product.style_tags.set(style_tags)
        return product

    def update(self, instance, validated_data):
        style_tags = validated_data.pop('style_tags', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        user = self.context['request'].user if 'request' in self.context else None
        if user and (getattr(user, 'role', '') in ['admin', 'staff'] or getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False)):
            if not instance.status or instance.status == Product.Status.PENDING:
                instance.status = Product.Status.APPROVED
                instance.approved_at = timezone.now()

        instance.save()
        if style_tags is not None:
            instance.style_tags.set(style_tags)
        return instance


ProductCreateSerializer = ProductWriteSerializer
