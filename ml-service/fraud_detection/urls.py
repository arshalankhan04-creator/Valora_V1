from django.urls import path
from fraud_detection.views import DetectFraudView

urlpatterns = [
    path('detect-fraud/', DetectFraudView.as_view()),
]
