from unittest.mock import patch

import jwt
from django.conf import settings
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from price_prediction import inference
from price_prediction.preprocessing import request_to_dataframe, ALL_FEATURES

PREDICT_PRICE_URL = '/api/ml/predict-price/'

VALID_DATA = {
    'brand': 'Honda',
    'model': 'City',
    'year': 2021,
    'km_driven': 32000,
    'fuel_type': 'Petrol',
    'transmission': 'Automatic',
    'condition_score': 85.0,
}


class RequestToDataframeTests(SimpleTestCase):
    def test_produces_a_single_row_with_all_expected_columns(self):
        df = request_to_dataframe(VALID_DATA)

        self.assertEqual(len(df), 1)
        self.assertEqual(list(df.columns), ALL_FEATURES)
        self.assertEqual(df.iloc[0]['brand'], 'Honda')
        self.assertEqual(df.iloc[0]['condition_score'], 85.0)

    def test_defaults_condition_score_when_absent(self):
        # A listing with no photos yet has no condition_score at all —
        # inference still needs a numeric value to feed the model.
        data = {k: v for k, v in VALID_DATA.items() if k != 'condition_score'}
        df = request_to_dataframe(data)

        self.assertEqual(df.iloc[0]['condition_score'], 70.0)

    def test_defaults_condition_score_when_explicitly_null(self):
        data = {**VALID_DATA, 'condition_score': None}
        df = request_to_dataframe(data)

        self.assertEqual(df.iloc[0]['condition_score'], 70.0)


def auth_header():
    token = jwt.encode({'service': 'valora-node'}, settings.JWT_SECRET, algorithm='HS256')
    return f'Bearer {token}'


class PredictPriceViewTests(APITestCase):
    def test_rejects_an_unauthenticated_request(self):
        res = self.client.post(PREDICT_PRICE_URL, VALID_DATA, format='json')
        self.assertEqual(res.status_code, 401)

    def test_rejects_an_invalid_payload(self):
        invalid = {**VALID_DATA, 'fuel_type': 'Nuclear'}
        res = self.client.post(
            PREDICT_PRICE_URL, invalid, format='json', HTTP_AUTHORIZATION=auth_header(),
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('fuel_type', res.json())

    def test_returns_503_when_model_is_not_trained(self):
        with patch.object(inference, 'predict', side_effect=inference.ModelNotTrainedError('no model')):
            res = self.client.post(
                PREDICT_PRICE_URL, VALID_DATA, format='json', HTTP_AUTHORIZATION=auth_header(),
            )
        self.assertEqual(res.status_code, 503)

    def test_returns_the_prediction_on_success(self):
        fake_result = {
            'predicted_price_min': 500000,
            'predicted_price_max': 600000,
            'confidence_level': 'high',
            'feature_importance': {'year': 0.5},
        }
        with patch.object(inference, 'predict', return_value=fake_result):
            res = self.client.post(
                PREDICT_PRICE_URL, VALID_DATA, format='json', HTTP_AUTHORIZATION=auth_header(),
            )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), fake_result)
