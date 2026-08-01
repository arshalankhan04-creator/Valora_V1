import os
import joblib

from price_prediction.preprocessing import request_to_dataframe
from price_prediction.train import MODEL_PATH

_artifact = None


class ModelNotTrainedError(Exception):
    pass


def _load_artifact():
    global _artifact
    if _artifact is None:
        if not os.path.exists(MODEL_PATH):
            raise ModelNotTrainedError(
                f'No trained model at {MODEL_PATH}. Run `python -m price_prediction.train` first.'
            )
        _artifact = joblib.load(MODEL_PATH)
    return _artifact


def _confidence_from_spread(residual_std, predicted_price):
    if predicted_price == 0:
        return 'low'
    relative_spread = residual_std / predicted_price
    if relative_spread < 0.05:
        return 'high'
    if relative_spread < 0.15:
        return 'medium'
    return 'low'


def predict(validated_data):
    artifact = _load_artifact()
    pipeline = artifact['pipeline']
    residual_std = artifact['residual_std']

    df = request_to_dataframe(validated_data)
    point_estimate = float(pipeline.predict(df)[0])

    return {
        'predicted_price_min': round(point_estimate - residual_std, 2),
        'predicted_price_max': round(point_estimate + residual_std, 2),
        'confidence_level': _confidence_from_spread(residual_std, point_estimate),
        'feature_importance': artifact['numeric_importance'],
    }
