from django.urls import path
from trust_score.views import TrustScoreView

urlpatterns = [
    path('trust-score/', TrustScoreView.as_view()),
]
