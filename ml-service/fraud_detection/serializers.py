from rest_framework import serializers


class FraudDetectionRequestSerializer(serializers.Serializer):
    price = serializers.FloatField(min_value=0)
    predicted_price_min = serializers.FloatField(min_value=0)
    predicted_price_max = serializers.FloatField(min_value=0)
    seller_account_age_days = serializers.IntegerField(min_value=0)
    has_missing_details = serializers.BooleanField()
    num_previous_listings = serializers.IntegerField(min_value=0)
