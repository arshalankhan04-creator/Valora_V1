from rest_framework import serializers


class SellerHistorySerializer(serializers.Serializer):
    response_rate = serializers.FloatField(min_value=0, max_value=100)
    past_deals = serializers.IntegerField(min_value=0)
    account_age_days = serializers.IntegerField(min_value=0)


class TrustScoreRequestSerializer(serializers.Serializer):
    price_fairness_score = serializers.FloatField(min_value=0, max_value=100)
    fraud_risk_score = serializers.FloatField(min_value=0, max_value=100)
    condition_score = serializers.FloatField(min_value=0, max_value=100)
    seller_history = SellerHistorySerializer()
