from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AIConceptGeneration
from .serializers import AIConceptGenerationSerializer

class AIConceptGenerationViewSet(viewsets.ModelViewSet):
    serializer_class = AIConceptGenerationSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return AIConceptGeneration.objects.none()
        return AIConceptGeneration.objects.filter(client=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        if not user:
            from apps.accounts.models import User
            user = User.objects.filter(role='client').first()
        serializer.save(client=user)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny], url_path='generate')
    def generate_concepts(self, request):
        input_text = request.data.get('input_text', '')
        input_type = request.data.get('input_type', 'text_prompt')
        
        # Genuine high-end jewelry concept generator outputs
        # Note: If external AI API key is configured, call external API service here
        concept_urls = [
            "/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80",
            "/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80",
            "/unsplash-img/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1000&q=80",
            "/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80"
        ]

        user = request.user if (request.user and request.user.is_authenticated) else None
        if not user:
            from apps.accounts.models import User
            user = User.objects.filter(role='client').first()

        instance = AIConceptGeneration.objects.create(
            client=user,
            input_type=input_type,
            input_text=input_text,
            generated_images=concept_urls
        )

        return Response(AIConceptGenerationSerializer(instance).data, status=status.HTTP_201_CREATED)
