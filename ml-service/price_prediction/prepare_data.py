"""Clean the raw Kaggle CarDekho dataset into the schema train.py expects.

Source: cardekho_dataset.csv ("CarDekho Used Car Dataset", Kaggle,
manishkr1754/cardekho-used-car-data) — chosen over the alternative
Used_Car_Price_Prediction.csv dropped in the same folder because it has
zero nulls, a clean brand/model split, and ~2x the rows (15,411 vs 7,400).

Two modeling assumptions made here that belong in the report/viva, not just
this comment:

1. `year` is derived from `vehicle_age` as `2023 - vehicle_age`. The raw
   dataset only has age, not a scrape/listing date; 2023 is an estimate of
   when this dataset was compiled, not a verified fact.
2. `condition_score` doesn't exist in this tabular dataset at all — real
   condition scores only exist for listings that went through the CNN
   pipeline (condition_assessment app) with actual photos. Here it's
   synthesized as a function of age and mileage plus noise, purely so the
   price model has *something* in that feature slot during training. This
   means the trained price model's `condition_score` coefficient reflects
   an assumed age/mileage proxy, not a genuine independent visual signal —
   don't cite it as if it were.

Usage (from ml-service/, with venv active):
    python -m price_prediction.prepare_data
"""

import os
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(__file__)
RAW_PATH = os.path.join(BASE_DIR, 'data', 'cardekho_dataset.csv')
OUTPUT_PATH = os.path.join(BASE_DIR, 'data', 'listings.csv')

REFERENCE_YEAR = 2023
RANDOM_SEED = 42


def synthesize_condition_score(vehicle_age, km_driven, rng):
    noise = rng.normal(0, 5, size=len(vehicle_age))
    score = 100 - (vehicle_age * 2.2) - (km_driven / 15_000) + noise
    return np.clip(score, 30, 100).round(1)


def prepare():
    df = pd.read_csv(RAW_PATH)

    before = len(df)
    df = df.drop_duplicates(
        subset=['brand', 'model', 'vehicle_age', 'km_driven', 'fuel_type', 'transmission_type', 'selling_price']
    )
    df = df[df['seats'] > 0]  # seats==0 is bad data, not a real listing
    print(f'Dropped {before - len(df)} duplicate/invalid rows ({before} -> {len(df)})')

    rng = np.random.default_rng(RANDOM_SEED)
    cleaned = pd.DataFrame({
        'brand': df['brand'],
        'model': df['model'],
        'year': REFERENCE_YEAR - df['vehicle_age'],
        'km_driven': df['km_driven'],
        'fuel_type': df['fuel_type'],
        'transmission': df['transmission_type'],
        'condition_score': synthesize_condition_score(df['vehicle_age'].values, df['km_driven'].values, rng),
        'price': df['selling_price'],
    })

    cleaned.to_csv(OUTPUT_PATH, index=False)
    print(f'Wrote {len(cleaned)} rows to {OUTPUT_PATH}')
    print(f'fuel_type values: {sorted(cleaned["fuel_type"].unique())}')
    print(f'transmission values: {sorted(cleaned["transmission"].unique())}')
    print(f'year range: {cleaned["year"].min()}-{cleaned["year"].max()}')


if __name__ == '__main__':
    prepare()
