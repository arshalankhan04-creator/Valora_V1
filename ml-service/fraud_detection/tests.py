from django.test import SimpleTestCase

from fraud_detection.preprocessing import price_deviation_ratio, request_to_features


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
