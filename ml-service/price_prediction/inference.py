import os
import math
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


def _confidence_from_spread(residual_std_log):
    # In log space, residual_std IS the relative spread already (a std of
    # 0.05 means predictions are typically within ~5% of actual).
    if residual_std_log < 0.05:
        return 'high'
    if residual_std_log < 0.15:
        return 'medium'
    return 'low'


def predict(validated_data):
    artifact = _load_artifact()
    pipeline = artifact['pipeline']
    residual_std_log = artifact['residual_std_log']

    df = request_to_dataframe(validated_data)
    point_estimate_log = float(pipeline.predict(df)[0])

    return {
        'predicted_price_min': round(math.exp(point_estimate_log - residual_std_log), 2),
        'predicted_price_max': round(math.exp(point_estimate_log + residual_std_log), 2),
        'confidence_level': _confidence_from_spread(residual_std_log),
        'feature_importance': artifact['numeric_importance'],
    }
