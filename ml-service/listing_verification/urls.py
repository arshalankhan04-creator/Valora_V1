from django.urls import path
from listing_verification.views import VerifyListingView

urlpatterns = [
    path('verify-listing/', VerifyListingView.as_view()),
]
