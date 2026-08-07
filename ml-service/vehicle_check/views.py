from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from vehicle_check import inference


class ValidateVehicleView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        images = request.FILES.getlist('images')
        if not images:
            return Response({'detail': 'No images provided'}, status=400)

        result = inference.validate_images(images)
        # Return 200 in both cases — the caller decides what to do with valid: false.
        # A 422 would also be reasonable, but 200 + payload is simpler to handle in Node.
        return Response(result)
