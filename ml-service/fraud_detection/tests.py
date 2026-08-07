from unittest.mock import patch

import jwt
from django.conf import settings
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from fraud_detection import inference
from fraud_detection.preprocessing import price_deviation_ratio, request_to_features

DETECT_FRAUD_URL = '/api/ml/detect-fraud/'

VALID_PAYLOAD = {
    'price': 150000,
    'predicted_price_min': 140000,
    'predicted_price_max': 160000,
    'seller_account_age_days': 100,
    'has_missing_details': False,
    'num_previous_listings': 3,
}


class PriceDeviationRatioTests(SimpleTestCase):
    def test_zero_when_price_is_inside_the_range(self):
        self.assertEqual(price_deviation_ratio(150, 100, 200), 0.0)

    def test_positive_ratio_when_price_is_below_the_range(self):
        # 10 below a range that's 100 wide -> 0.1
        self.assertEqual(price_deviation_ratio(90, 100, 200), 0.1)

    def test_positive_ratio_when_price_is_above_the_range(self):
        # 50 above a range that's 100 wide -> 0.5
        self.assertEqual(price_deviation_ratio(250, 100, 200), 0.5)

    def test_does_not_divide_by_zero_when_range_has_zero_width(self):
        # predicted_min == predicted_max would make span 0 without the
        # `or 1` fallback in the source — this is exactly that edge case.
        self.assertEqual(price_deviation_ratio(90, 100, 100), 10.0)

    def test_boundary_prices_count_as_inside_the_range(self):
        self.assertEqual(price_deviation_ratio(100, 100, 200), 0.0)
        self.assertEqual(price_deviation_ratio(200, 100, 200), 0.0)


class RequestToFeaturesTests(SimpleTestCase):
    def test_converts_missing_details_bool_to_int(self):
        features = request_to_features({
            'price': 150,
            'predicted_price_min': 100,
            'predicted_price_max': 200,
            'seller_account_age_days': 30,
            'has_missing_details': True,
            'num_previous_listings': 2,
        })

        self.assertEqual(features['has_missing_details'], 1)
        self.assertEqual(features['price_deviation_ratio'], 0.0)
        self.assertEqual(features['seller_account_age_days'], 30)
        self.assertEqual(features['num_previous_listings'], 2)

    def test_false_missing_details_becomes_zero(self):
        features = request_to_features({
            'price': 150,
            'predicted_price_min': 100,
            'predicted_price_max': 200,
            'seller_account_age_days': 30,
            'has_missing_details': False,
            'num_previous_listings': 2,
        })

        self.assertEqual(features['has_missing_details'], 0)


def auth_header():
    token = jwt.encode({'service': 'valora-node'}, settings.JWT_SECRET, algorithm='HS256')
    return f'Bearer {token}'


class DetectFraudViewTests(APITestCase):
    def test_rejects_an_unauthenticated_request(self):
        res = self.client.post(DETECT_FRAUD_URL, VALID_PAYLOAD, format='json')
        self.assertEqual(res.status_code, 401)

    def test_rejects_an_invalid_payload(self):
        invalid = {**VALID_PAYLOAD, 'price': -10}
        res = self.client.post(
            DETECT_FRAUD_URL, invalid, format='json', HTTP_AUTHORIZATION=auth_header(),
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('price', res.json())

    def test_returns_503_when_model_is_not_trained(self):
        with patch.object(inference, 'predict', side_effect=inference.ModelNotTrainedError('no model')):
            res = self.client.post(
                DETECT_FRAUD_URL, VALID_PAYLOAD, format='json', HTTP_AUTHORIZATION=auth_header(),
            )
        self.assertEqual(res.status_code, 503)

    def test_returns_the_fraud_assessment_on_success(self):
        fake_result = {'risk_flag': 'Low', 'fraud_probability': 0.12, 'reasons': []}
        with patch.object(inference, 'predict', return_value=fake_result):
            res = self.client.post(
                DETECT_FRAUD_URL, VALID_PAYLOAD, format='json', HTTP_AUTHORIZATION=auth_header(),
            )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), fake_result)
