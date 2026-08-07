import jwt
from django.conf import settings
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from trust_score.scoring import compute, seller_bonus, MAX_SELLER_BONUS

TRUST_SCORE_URL = '/api/ml/trust-score/'


class SellerBonusTests(SimpleTestCase):
    def test_matches_worked_example_from_spec(self):
        # Valora_Team_Workflow.md §8's illustrative example.
        history = {'response_rate': 92, 'past_deals': 5, 'account_age_days': 180}
        self.assertAlmostEqual(seller_bonus(history), 1.66, places=2)

    def test_caps_each_component_before_summing(self):
        # past_deals and account_age_days are both way past their caps
        # (10 deals, 365 days) — bonus shouldn't keep growing past that.
        capped = seller_bonus({'response_rate': 100, 'past_deals': 10, 'account_age_days': 365})
        overshot = seller_bonus({'response_rate': 100, 'past_deals': 999, 'account_age_days': 99999})
        self.assertEqual(capped, overshot)

    def test_max_seller_bonus_constant_is_currently_unreachable(self):
        # response(1.0) + deals(0.5) + age(1.0) tops out at 2.5, well under
        # MAX_SELLER_BONUS=5 — documenting this so the constant's intent
        # (a safety ceiling) isn't mistaken for the typical/expected value.
        best_case = seller_bonus({'response_rate': 100, 'past_deals': 10, 'account_age_days': 365})
        self.assertEqual(best_case, 2.5)
        self.assertLess(best_case, MAX_SELLER_BONUS)


class ComputeTrustScoreTests(SimpleTestCase):
    def test_matches_worked_example_from_spec(self):
        result = compute({
            'price_fairness_score': 95,
            'fraud_risk_score': 90,
            'condition_score': 85,
            'seller_history': {'response_rate': 92, 'past_deals': 5, 'account_age_days': 180},
        })

        self.assertAlmostEqual(result['trust_score'], 92.16, places=2)
        self.assertEqual(result['breakdown']['price_fairness'], 38.0)
        self.assertEqual(result['breakdown']['fraud_risk'], 27.0)
        self.assertEqual(result['breakdown']['condition_match'], 25.5)

    def test_clamps_at_100_even_with_perfect_scores(self):
        result = compute({
            'price_fairness_score': 100,
            'fraud_risk_score': 100,
            'condition_score': 100,
            'seller_history': {'response_rate': 100, 'past_deals': 100, 'account_age_days': 10000},
        })

        # 40 + 30 + 30 + 2.5 = 102.5 uncapped — must not exceed 100.
        self.assertEqual(result['trust_score'], 100)

    def test_zero_scores_yield_zero_trust_before_seller_bonus(self):
        result = compute({
            'price_fairness_score': 0,
            'fraud_risk_score': 0,
            'condition_score': 0,
            'seller_history': {'response_rate': 0, 'past_deals': 0, 'account_age_days': 0},
        })

        self.assertEqual(result['trust_score'], 0)


class TrustScoreViewTests(APITestCase):
    def test_rejects_an_invalid_payload(self):
        # price_fairness_score is capped at 100 by the serializer — this is
        # the view-level validation path, distinct from compute()'s own math.
        token = jwt.encode({'service': 'valora-node'}, settings.JWT_SECRET, algorithm='HS256')
        invalid = {
            'price_fairness_score': 150,
            'fraud_risk_score': 90,
            'condition_score': 90,
            'seller_history': {'response_rate': 90, 'past_deals': 5, 'account_age_days': 100},
        }
        res = self.client.post(
            TRUST_SCORE_URL, invalid, format='json', HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('price_fairness_score', res.json())
