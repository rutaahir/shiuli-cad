from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db import models
from .models import StaffProfile

User = get_user_model()

class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = [
            'id', 'max_concurrent_jobs', 'specialty_tags',
            'bio', 'rating_average', 'total_jobs_completed'
        ]

class UserSerializer(serializers.ModelSerializer):
    staff_profile = serializers.SerializerMethodField()
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'profile_photo', 'is_active_staff',
            'created_at', 'staff_profile'
        ]
        read_only_fields = ['id', 'role', 'created_at']

    def get_staff_profile(self, obj):
        try:
            if hasattr(obj, 'staff_profile') and obj.staff_profile:
                return StaffProfileSerializer(obj.staff_profile).data
        except Exception:
            pass
        return None

    def get_profile_photo(self, obj):
        if obj.profile_photo:
            try:
                return obj.profile_photo.url
            except Exception:
                return str(obj.profile_photo)
        return None

    def update(self, instance, validated_data):
        request = self.context.get('request')
        photo_data = request.data.get('profile_photo') if request else None

        if photo_data and isinstance(photo_data, str) and photo_data.startswith('data:image/'):
            try:
                import base64
                from django.core.files.base import ContentFile
                header, imgstr = photo_data.split(';base64,')
                ext = header.split('/')[-1]
                if ext.lower() in ['jpeg', 'pjpeg']:
                    ext = 'jpg'
                file_data = ContentFile(base64.b64decode(imgstr), name=f"profile_{instance.id}.{ext}")
                instance.profile_photo = file_data
                instance.save()
            except Exception as e:
                print('Error decoding profile photo base64:', e)

        user = super().update(instance, validated_data)

        staff_data = request.data.get('staff_profile') if request else None
        if staff_data and hasattr(user, 'staff_profile'):
            sp = user.staff_profile
            if 'specialty_tags' in staff_data:
                sp.specialty_tags = staff_data['specialty_tags']
            if 'bio' in staff_data:
                sp.bio = staff_data['bio']
            if 'max_concurrent_jobs' in staff_data:
                sp.max_concurrent_jobs = int(staff_data['max_concurrent_jobs'])
            sp.save()
        return user


class RegisterClientSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone_number']

    def create(self, validated_data):
        validated_data['role'] = User.Role.CLIENT
        user = User.objects.create_user(**validated_data)
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get(self.username_field, '')

        # Allow authentication by either Email or Username
        if username_or_email:
            user_obj = User.objects.filter(
                models.Q(email__iexact=username_or_email) | models.Q(username__iexact=username_or_email)
            ).first()
            if user_obj:
                attrs[self.username_field] = user_obj.username

        data = super().validate(attrs)
        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data
        data['role'] = self.user.role
        return data

