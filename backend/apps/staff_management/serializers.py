from rest_framework import serializers
from apps.accounts.models import User, StaffProfile
from apps.custom_orders.models import Order
from .models import PlatformSettings

class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = [
            'id', 'studio_name', 'timezone', 'default_max_job_limit',
            'assignment_mode', 'auto_escalation_minutes', 'advance_payment_percentage',
            'studio_upi_id', 'studio_qr_code', 'studio_qr_code_url', 'cash_check_instructions'
        ]


class StaffListSerializer(serializers.ModelSerializer):
    profile_id = serializers.IntegerField(source='staff_profile.id', read_only=True)
    max_concurrent_jobs = serializers.IntegerField(source='staff_profile.max_concurrent_jobs', read_only=True)
    specialty_tags = serializers.CharField(source='staff_profile.specialty_tags', read_only=True)
    bio = serializers.CharField(source='staff_profile.bio', read_only=True)
    rating_average = serializers.DecimalField(source='staff_profile.rating_average', max_digits=3, decimal_places=2, read_only=True)
    total_jobs_completed = serializers.IntegerField(source='staff_profile.total_jobs_completed', read_only=True)
    current_load = serializers.SerializerMethodField()
    active_jobs = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone_number',
            'is_active', 'is_active_staff', 'profile_id', 'max_concurrent_jobs',
            'specialty_tags', 'bio', 'rating_average', 'total_jobs_completed',
            'current_load', 'active_jobs'
        ]

    def get_current_load(self, obj):
        return Order.objects.filter(
            assigned_staff=obj,
            status=Order.Status.WITH_DESIGNER
        ).count()

    def get_active_jobs(self, obj):
        orders = Order.objects.filter(
            assigned_staff=obj,
            status=Order.Status.WITH_DESIGNER
        ).select_related('custom_request', 'client').order_by('-assigned_at')
        return [
            {
                "id": o.id,
                "title": o.custom_request.title if o.custom_request else f"Custom CAD Design #{o.id}",
                "client_name": o.client.get_full_name() or o.client.username,
                "client_email": o.client.email,
                "status": o.status,
                "assigned_at": o.assigned_at,
                "deadline_hours": o.deadline_hours,
                "preview_image": o.preview_image.url if o.preview_image else None
            }
            for o in orders
        ]


class CreateStaffSerializer(serializers.ModelSerializer):
    max_concurrent_jobs = serializers.IntegerField(default=2, write_only=True)
    specialty_tags = serializers.CharField(required=False, allow_blank=True, write_only=True)
    bio = serializers.CharField(required=False, allow_blank=True, write_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'first_name', 'last_name',
            'phone_number', 'max_concurrent_jobs', 'specialty_tags', 'bio'
        ]

    def create(self, validated_data):
        max_concurrent_jobs = validated_data.pop('max_concurrent_jobs', 2)
        specialty_tags = validated_data.pop('specialty_tags', '')
        bio = validated_data.pop('bio', '')
        password = validated_data.pop('password')

        validated_data['role'] = User.Role.STAFF
        validated_data['is_staff'] = True
        validated_data['is_active_staff'] = True
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()

        StaffProfile.objects.update_or_create(
            user=user,
            defaults={
                'max_concurrent_jobs': max_concurrent_jobs,
                'specialty_tags': specialty_tags,
                'bio': bio
            }
        )
        return user

    def to_representation(self, instance):
        return StaffListSerializer(instance, context=self.context).data


class UpdateStaffSerializer(serializers.ModelSerializer):
    max_concurrent_jobs = serializers.IntegerField(required=False)
    specialty_tags = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone_number', 'is_active_staff', 'max_concurrent_jobs', 'specialty_tags', 'bio']

    def update(self, instance, validated_data):
        profile_data = {}
        if 'max_concurrent_jobs' in validated_data:
            profile_data['max_concurrent_jobs'] = validated_data.pop('max_concurrent_jobs')
        if 'specialty_tags' in validated_data:
            profile_data['specialty_tags'] = validated_data.pop('specialty_tags')
        if 'bio' in validated_data:
            profile_data['bio'] = validated_data.pop('bio')

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data:
            profile, _ = StaffProfile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
            instance.staff_profile = profile

        return instance

    def to_representation(self, instance):
        return StaffListSerializer(instance, context=self.context).data

