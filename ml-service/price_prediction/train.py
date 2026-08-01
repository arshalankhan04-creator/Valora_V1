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
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from price_prediction.preprocessing import ALL_FEATURES, CATEGORICAL_FEATURES, build_preprocessor

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, 'data', 'listings.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'price_model.joblib')


def train():
    df = pd.read_csv(DATA_PATH)
    X = df[ALL_FEATURES]
    y = df['price']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Plain linear regression, not polynomial: coefficients need to map 1:1
    # onto named features for the feature_importance field in the API
    # contract (Valora_Team_Workflow.md §8).
    pipeline = Pipeline([
        ('preprocessor', build_preprocessor()),
        ('regressor', LinearRegression()),
    ])
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    r2 = r2_score(y_test, predictions)
    mae = mean_absolute_error(y_test, predictions)
    mse = mean_squared_error(y_test, predictions)
    residual_std = (y_test - predictions).std()

    print(f'R2: {r2:.4f}  MAE: {mae:.2f}  MSE: {mse:.2f}  residual_std: {residual_std:.2f}')

    feature_names = pipeline.named_steps['preprocessor'].get_feature_names_out()
    coefficients = dict(zip(feature_names, pipeline.named_steps['regressor'].coef_))
    numeric_importance = {
        name.replace('remainder__', ''): float(weight)
        for name, weight in coefficients.items()
        if name.startswith('remainder__')
    }

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(
        {
            'pipeline': pipeline,
            'residual_std': residual_std,
            'r2': r2,
            'numeric_importance': numeric_importance,
        },
        MODEL_PATH,
    )
    print(f'Saved model to {MODEL_PATH}')


if __name__ == '__main__':
    train()
