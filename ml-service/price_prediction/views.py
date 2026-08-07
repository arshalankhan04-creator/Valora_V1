from rest_framework.response import Response
from rest_framework.views import APIView

from price_prediction import inference
from price_prediction.serializers import PricePredictionRequestSerializer


class PredictPriceView(APIView):
    def post(self, request):
        serializer = PricePredictionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = inference.predict(serializer.validated_data)
        except inference.ModelNotTrainedError as exc:
            return Response({'detail': str(exc)}, status=503)

        return Response(result)
