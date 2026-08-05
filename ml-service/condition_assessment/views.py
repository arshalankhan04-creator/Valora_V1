from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from condition_assessment import inference


class AssessConditionView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        images = request.FILES.getlist('images')
        if not images:
            return Response({'detail': 'At least one image is required'}, status=400)

        result = inference.assess(images)
        return Response(result)
