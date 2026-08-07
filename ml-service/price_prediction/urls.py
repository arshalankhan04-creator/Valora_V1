from django.urls import path
from price_prediction.views import PredictPriceView

urlpatterns = [
    path('predict-price/', PredictPriceView.as_view()),
]
