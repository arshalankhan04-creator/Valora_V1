"""Train the fraud/anomaly classifier.

Usage (from ml-service/, with venv active):
    python -m fraud_detection.train

Expects a CSV at fraud_detection/data/listings.csv with columns matching
fraud_detection.preprocessing.FEATURES plus a binary `is_fraudulent` label.
Synthetic labels are acceptable per the spec (e.g. price far outside the
predicted range + missing details + new account = suspicious).
"""

import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, accuracy_score
from sklearn.model_selection import train_test_split

from fraud_detection.preprocessing import FEATURES

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, 'data', 'listings.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'fraud_model.joblib')


def train():
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURES]
    y = df['is_fraudulent']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(n_estimators=200, random_state=42)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    tn, fp, fn, tp = confusion_matrix(y_test, predictions).ravel()
    accuracy = accuracy_score(y_test, predictions)
    sensitivity = tp / (tp + fn) if (tp + fn) else 0.0
    specificity = tn / (tn + fp) if (tn + fp) else 0.0

    print(
        f'Accuracy: {accuracy:.4f}  Sensitivity: {sensitivity:.4f}  '
        f'Specificity: {specificity:.4f}  Confusion matrix: [[{tn},{fp}],[{fn},{tp}]]'
    )

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f'Saved model to {MODEL_PATH}')


if __name__ == '__main__':
    train()
