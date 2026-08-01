import os
import joblib
import pandas as pd

from fraud_detection.preprocessing import FEATURES, request_to_features
from fraud_detection.train import MODEL_PATH

_model = None


class ModelNotTrainedError(Exception):
    pass


def _load_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise ModelNotTrainedError(
                f'No trained model at {MODEL_PATH}. Run `python -m fraud_detection.train` first.'
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def _risk_flag(probability):
    if probability >= 0.66:
        return 'High'
    if probability >= 0.33:
        return 'Medium'
    return 'Low'


def _reasons(features):
    reasons = []
    if features['price_deviation_ratio'] > 0.5:
        reasons.append('Price is far outside the predicted fair-price range')
    if features['has_missing_details']:
        reasons.append('Listing is missing key details')
    if features['seller_account_age_days'] < 7:
        reasons.append('Seller account is very new')
    if features['num_previous_listings'] == 0:
        reasons.append('Seller has no listing history')
    return reasons


def predict(validated_data):
    model = _load_model()
    features = request_to_features(validated_data)
    df = pd.DataFrame([features], columns=FEATURES)

    probability = float(model.predict_proba(df)[0][1])

    return {
        'risk_flag': _risk_flag(probability),
        'fraud_probability': round(probability, 4),
        'reasons': _reasons(features),
    }
