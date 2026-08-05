from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from listing_verification import inference


class VerifyListingView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        images = request.FILES.getlist('images')
        if not images:
            return Response({'detail': 'No images provided'}, status=400)

        brand = request.data.get('brand')
        model = request.data.get('model')
        year = request.data.get('year')
        if not brand or not model or not year:
            raise ValidationError('brand, model, and year are all required')

        result = inference.verify(images, brand, model, year)
        return Response(result)
