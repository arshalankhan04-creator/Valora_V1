from unittest.mock import patch

import jwt
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from condition_assessment import inference

ASSESS_CONDITION_URL = '/api/ml/assess-condition/'


def auth_header():
    token = jwt.encode({'service': 'valora-node'}, settings.JWT_SECRET, algorithm='HS256')
    return f'Bearer {token}'


def fake_image(name='car.jpg'):
    # inference.assess is mocked in every test below, so the bytes never
    # actually reach a decoder — content just has to look like a multipart file.
    return SimpleUploadedFile(name, b'fake-image-bytes', content_type='image/jpeg')


class AssessConditionViewTests(APITestCase):
    def test_rejects_an_unauthenticated_request(self):
        res = self.client.post(
            ASSESS_CONDITION_URL, {'images': [fake_image()]}, format='multipart',
        )
        self.assertEqual(res.status_code, 401)

    def test_rejects_a_request_with_no_images(self):
        res = self.client.post(
            ASSESS_CONDITION_URL, {}, format='multipart', HTTP_AUTHORIZATION=auth_header(),
        )
        self.assertEqual(res.status_code, 400)

    # No more "model not trained" case — beingamit99/car_damage_detection is
    # a Hugging Face pipeline downloaded on first use, not a local artifact
    # this project trains, so ModelNotTrainedError no longer exists.

    def test_returns_the_assessment_on_success(self):
        fake_result = {
            'visual_condition_score': 75,
            'condition_severity': 'Minor damage',
            'detected_damages': [
                {
                    'part': 'lower left', 'damage_type': 'dent',
                    'confidence': 0.84, 'severity': 'moderate',
                    'location': 'lower left', 'area_percentage': 8.3,
                    'estimated_cost': 650,
                }
            ],
            'condition_decision': 'HUMAN_REVIEW',
        }
        with patch.object(inference, 'assess', return_value=fake_result):
            res = self.client.post(
                ASSESS_CONDITION_URL, {'images': [fake_image()]}, format='multipart',
                HTTP_AUTHORIZATION=auth_header(),
            )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), fake_result)
