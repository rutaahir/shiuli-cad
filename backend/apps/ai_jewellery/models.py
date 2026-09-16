from django.db import models
from django.conf import settings

class AIConceptGeneration(models.Model):
    class InputType(models.TextChoices):
        TEXT_PROMPT = "text_prompt", "Text Description"
        REFERENCE_IMAGE = "reference_image", "Uploaded Photo"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_concepts")
    input_type = models.CharField(max_length=20, choices=InputType.choices, default=InputType.TEXT_PROMPT)
    input_text = models.TextField(blank=True)
    input_image = models.ImageField(upload_to="ai_concepts/inputs/", null=True, blank=True)
    generated_images = models.JSONField(default=list)  # list of URLs
    selected_concept_index = models.PositiveIntegerField(null=True, blank=True)
    linked_custom_request = models.ForeignKey(
        'custom_orders.CustomRequest', null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_concept_sources"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI Concept #{self.id} by {self.client.username}"
