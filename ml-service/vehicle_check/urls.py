from django.urls import path
from vehicle_check.views import ValidateVehicleView

urlpatterns = [
    path('validate-vehicle/', ValidateVehicleView.as_view()),
]
