import jwt
from django.conf import settings
from rest_framework.test import APITestCase

# trust-score is the one endpoint with zero trained-model dependency, so it
# doubles as a clean integration test target for the shared auth class
# without needing price_prediction/fraud_detection artifacts to exist.
TRUST_SCORE_URL = '/api/ml/trust-score/'

VALID_PAYLOAD = {
    'price_fairness_score': 90,
    'fraud_risk_score': 90,
    'condition_score': 90,
    'seller_history': {'response_rate': 90, 'past_deals': 5, 'account_age_days': 100},
}


def sign(secret, **overrides):
    payload = {'service': 'valora-node', **overrides}
    return jwt.encode(payload, secret, algorithm='HS256')


class ServiceJWTAuthenticationTests(APITestCase):
    def test_rejects_a_request_with_no_authorization_header(self):
        res = self.client.post(TRUST_SCORE_URL, VALID_PAYLOAD, format='json')
        self.assertEqual(res.status_code, 401)

    def test_rejects_a_non_bearer_authorization_header(self):
        res = self.client.post(
            TRUST_SCORE_URL, VALID_PAYLOAD, format='json', HTTP_AUTHORIZATION='Basic abc123',
        )
        self.assertEqual(res.status_code, 401)

    def test_rejects_a_token_signed_with_the_wrong_secret(self):
        token = sign(settings.JWT_SECRET + '-but-wrong')
        res = self.client.post(
            TRUST_SCORE_URL, VALID_PAYLOAD, format='json', HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(res.status_code, 401)

    def test_rejects_a_malformed_token(self):
        res = self.client.post(
            TRUST_SCORE_URL, VALID_PAYLOAD, format='json', HTTP_AUTHORIZATION='Bearer not-a-jwt-at-all',
        )
        self.assertEqual(res.status_code, 401)

    def test_accepts_a_token_signed_with_the_shared_secret(self):
        token = sign(settings.JWT_SECRET)
        res = self.client.post(
            TRUST_SCORE_URL, VALID_PAYLOAD, format='json', HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn('trust_score', res.json())
