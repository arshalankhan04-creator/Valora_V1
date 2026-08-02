from django.test import SimpleTestCase

from price_prediction.preprocessing import request_to_dataframe, ALL_FEATURES

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
