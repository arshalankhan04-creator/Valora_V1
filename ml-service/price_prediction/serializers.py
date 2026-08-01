from rest_framework import serializers

FUEL_TYPES = ('Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid')
TRANSMISSIONS = ('Manual', 'Automatic')


class PricePredictionRequestSerializer(serializers.Serializer):
    brand = serializers.CharField()
    model = serializers.CharField()
    year = serializers.IntegerField(min_value=1980)
    km_driven = serializers.IntegerField(min_value=0)
    fuel_type = serializers.ChoiceField(choices=FUEL_TYPES)
    transmission = serializers.ChoiceField(choices=TRANSMISSIONS)
    condition_score = serializers.FloatField(min_value=0, max_value=100, allow_null=True, required=False)
