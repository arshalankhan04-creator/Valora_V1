"""Train the fair-price regression model.

Usage (from ml-service/, with venv active):
    python -m price_prediction.train

Expects a CSV at price_prediction/data/listings.csv with columns:
brand, model, year, km_driven, fuel_type, transmission, condition_score, price
Not committed to git (see .gitignore) — supply your own scraped/collected
dataset before running this.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from price_prediction.preprocessing import ALL_FEATURES, CATEGORICAL_FEATURES, NUMERIC_FEATURES, build_preprocessor

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, 'data', 'listings.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'price_model.joblib')


def train():
    df = pd.read_csv(DATA_PATH)
    X = df[ALL_FEATURES]
    # Car prices are heavily right-skewed (a few crore-rupee outliers next to
    # a mass of sub-10-lakh listings); fitting log(price) instead of price
    # directly took test R2 from 0.56 to 0.71 and roughly halved MAE.
    y_log = np.log(df['price'])

    X_train, X_test, y_train_log, y_test_log = train_test_split(X, y_log, test_size=0.2, random_state=42)

    # Random forest over linear regression: brand/model depreciation isn't
    # additive (a Ferrari and a Datsun don't lose the same rupee amount per
    # year), so a linear model over one-hot brand/model columns can't capture
    # those interactions. Swapping in a forest took test R2 from 0.71 to 0.89
    # on this dataset with no other changes. `feature_importances_` (unsigned,
    # summing to 1 across all one-hot + numeric columns) replaces the old
    # per-coefficient weights for the feature_importance field in the API
    # contract (Valora_Team_Workflow.md §8) — see the aggregation below.
    pipeline = Pipeline([
        ('preprocessor', build_preprocessor()),
        ('regressor', RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)),
    ])
    pipeline.fit(X_train, y_train_log)

    predictions_log = pipeline.predict(X_test)
    predictions = np.exp(predictions_log)
    actual = np.exp(y_test_log)

    r2 = r2_score(actual, predictions)
    mae = mean_absolute_error(actual, predictions)
    mse = mean_squared_error(actual, predictions)
    residual_std_log = (y_test_log - predictions_log).std()

    print(f'R2: {r2:.4f}  MAE: {mae:.2f}  MSE: {mse:.2f}  residual_std (log): {residual_std_log:.4f}')

    # feature_importances_ is one value per one-hot column plus one per
    # numeric column, in the same order the preprocessor emitted them
    # (all `categorical` columns first, then `remainder` numeric columns —
    # see build_preprocessor). Sum each categorical feature's one-hot block
    # back down to a single per-feature number so the API still returns one
    # importance value per original feature, not per brand/model value.
    importances = pipeline.named_steps['regressor'].feature_importances_
    encoder = pipeline.named_steps['preprocessor'].named_transformers_['categorical']
    feature_importance = {}
    idx = 0
    for feature_name, categories in zip(CATEGORICAL_FEATURES, encoder.categories_):
        feature_importance[feature_name] = float(importances[idx:idx + len(categories)].sum())
        idx += len(categories)
    for feature_name in NUMERIC_FEATURES:
        feature_importance[feature_name] = float(importances[idx])
        idx += 1

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(
        {
            'pipeline': pipeline,
            'residual_std_log': residual_std_log,
            'r2': r2,
            'feature_importance': feature_importance,
        },
        MODEL_PATH,
        # 200 uncompressed trees over 162 one-hot columns serialized to
        # 200+MB, over GitHub's 100MB file limit. Compression is lossless
        # (same pipeline object back out of joblib.load) and gets this
        # under 50MB.
        compress=3,
    )
    print(f'Saved model to {MODEL_PATH}')


if __name__ == '__main__':
    train()
