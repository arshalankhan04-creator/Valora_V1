from rest_framework.response import Response
from rest_framework.views import APIView

from trust_score import scoring
from trust_score.serializers import TrustScoreRequestSerializer


class TrustScoreView(APIView):
    def post(self, request):
        serializer = TrustScoreRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = scoring.compute(serializer.validated_data)
        return Response(result)
