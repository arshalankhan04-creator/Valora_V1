"""Feature preprocessing shared between train.py (fit) and inference.py
(transform). Keeping this in one place guarantees train and inference never
drift apart on how a raw listing dict becomes a feature vector."""

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder

CATEGORICAL_FEATURES = ['brand', 'model', 'fuel_type', 'transmission']
NUMERIC_FEATURES = ['year', 'km_driven', 'condition_score']
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def build_preprocessor():
    return ColumnTransformer(
        transformers=[
            ('categorical', OneHotEncoder(handle_unknown='ignore'), CATEGORICAL_FEATURES),
        ],
        remainder='passthrough',
    )


def request_to_dataframe(validated_data):
    """Turn one validated request payload into the single-row DataFrame the
    fitted preprocessor expects."""
    row = {
        'brand': validated_data['brand'],
        'model': validated_data['model'],
        'fuel_type': validated_data['fuel_type'],
        'transmission': validated_data['transmission'],
        'year': validated_data['year'],
        'km_driven': validated_data['km_driven'],
        # Condition score may be unknown if the seller hasn't uploaded photos yet.
        'condition_score': validated_data.get('condition_score') or 70.0,
    }
    return pd.DataFrame([row], columns=ALL_FEATURES)
