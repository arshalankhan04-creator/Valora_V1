from rest_framework.response import Response
from rest_framework.views import APIView

from fraud_detection import inference
from fraud_detection.serializers import FraudDetectionRequestSerializer


class DetectFraudView(APIView):
    def post(self, request):
        serializer = FraudDetectionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = inference.predict(serializer.validated_data)
        except inference.ModelNotTrainedError as exc:
            return Response({'detail': str(exc)}, status=503)

        return Response(result)
