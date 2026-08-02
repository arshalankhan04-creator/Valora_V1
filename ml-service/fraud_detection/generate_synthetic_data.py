"""Generate a synthetic labeled dataset for the fraud classifier.

Valora_Final_Spec_APIs.md §3 (Intelligence Layer 2) explicitly allows
synthetic labels: "price far outside predicted range + missing details +
new account = suspicious". This script sample from two different
distributions (genuine vs. suspicious) with overlap, so the resulting
classifier has to learn real decision boundaries rather than memorizing a
deterministic rule.

Usage (from ml-service/, with venv active):
    python -m fraud_detection.generate_synthetic_data
"""

import os
import numpy as np
import pandas as pd

from fraud_detection.preprocessing import price_deviation_ratio

BASE_DIR = os.path.dirname(__file__)
OUTPUT_PATH = os.path.join(BASE_DIR, 'data', 'listings.csv')

NUM_SAMPLES = 2000
FRAUD_RATE = 0.15
LABEL_NOISE = 0.05  # fraction of labels flipped after generation, so classes aren't perfectly separable
RANDOM_SEED = 42


def _generate_row(rng, is_fraudulent):
    predicted_price_min = rng.uniform(150_000, 3_000_000)
    predicted_price_max = predicted_price_min * rng.uniform(1.05, 1.2)

    if is_fraudulent:
        # Suspicious listings skew toward prices far outside the fair range,
        # newer accounts, missing details, and no listing history.
        if rng.random() < 0.7:
            offset = rng.uniform(0.3, 1.5) * (predicted_price_max - predicted_price_min)
            price = predicted_price_max + offset if rng.random() < 0.5 else max(0, predicted_price_min - offset)
        else:
            price = rng.uniform(predicted_price_min, predicted_price_max)
        seller_account_age_days = int(rng.exponential(15))
        has_missing_details = rng.random() < 0.6
        num_previous_listings = int(rng.poisson(0.5))
    else:
        price = rng.uniform(predicted_price_min, predicted_price_max) if rng.random() < 0.85 \
            else rng.uniform(predicted_price_min * 0.9, predicted_price_max * 1.15)
        seller_account_age_days = int(rng.exponential(200)) + 10
        has_missing_details = rng.random() < 0.1
        num_previous_listings = int(rng.poisson(4))

    return {
        'price_deviation_ratio': price_deviation_ratio(price, predicted_price_min, predicted_price_max),
        'seller_account_age_days': seller_account_age_days,
        'has_missing_details': int(has_missing_details),
        'num_previous_listings': num_previous_listings,
        'is_fraudulent': int(is_fraudulent),
    }


def generate(num_samples=NUM_SAMPLES, fraud_rate=FRAUD_RATE, label_noise=LABEL_NOISE, seed=RANDOM_SEED):
    rng = np.random.default_rng(seed)
    ground_truth = rng.random(num_samples) < fraud_rate

    rows = [_generate_row(rng, is_fraud) for is_fraud in ground_truth]
    df = pd.DataFrame(rows)

    flip_mask = rng.random(num_samples) < label_noise
    df.loc[flip_mask, 'is_fraudulent'] = 1 - df.loc[flip_mask, 'is_fraudulent']

    return df


if __name__ == '__main__':
    df = generate()
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f'Wrote {len(df)} rows to {OUTPUT_PATH} ({df["is_fraudulent"].mean():.1%} labeled fraudulent)')
