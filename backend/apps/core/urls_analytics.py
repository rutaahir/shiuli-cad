from django.urls import path
from .views_analytics import AnalyticsSummaryView

urlpatterns = [
    path('summary/', AnalyticsSummaryView.as_view(), name='analytics-summary'),
]
