from django.urls import path
from condition_assessment.views import AssessConditionView

urlpatterns = [
    path('assess-condition/', AssessConditionView.as_view()),
]
