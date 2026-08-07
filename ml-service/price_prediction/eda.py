"""EDA charts over the price_prediction training data (Seaborn/heatmaps,
FCSP-2 Unit 2). This is a data-science artifact for the report/viva, not a
live-serving endpoint — the actual seller-facing analytics dashboard lives
in the Node/React app (real-time aggregation over live Valora listings via
MongoDB's aggregation framework), since Dash would mean a third server
with its own auth story for no real benefit. See CLAUDE.md for that
reasoning in full.

Usage (from ml-service/, with venv active, after running prepare_data.py):
    python -m price_prediction.eda
"""

import os
import matplotlib
matplotlib.use('Agg')  # no display needed, just save PNGs
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, 'data', 'listings.csv')
CHARTS_DIR = os.path.join(BASE_DIR, 'eda_charts')

sns.set_theme(style='whitegrid')


def save(fig, name):
    os.makedirs(CHARTS_DIR, exist_ok=True)
    path = os.path.join(CHARTS_DIR, name)
    fig.savefig(path, bbox_inches='tight', dpi=120)
    plt.close(fig)
    print(f'Saved {path}')


def price_by_fuel_type(df):
    fig, ax = plt.subplots(figsize=(8, 5))
    # Prices span orders of magnitude (see price_prediction/train.py's log-
    # transform comment) — a log y-axis keeps the box for CNG/Electric
    # (rare, cheaper) from being crushed flat by Diesel/Petrol's spread.
    sns.boxplot(data=df, x='fuel_type', y='price', ax=ax)
    ax.set_yscale('log')
    ax.set_title('Price distribution by fuel type (log scale)')
    save(fig, 'price_by_fuel_type.png')


def price_by_year(df):
    fig, ax = plt.subplots(figsize=(8, 5))
    yearly_median = df.groupby('year')['price'].median().reset_index()
    sns.lineplot(data=yearly_median, x='year', y='price', marker='o', ax=ax)
    ax.set_title('Median price by year (depreciation trend)')
    save(fig, 'price_by_year.png')


def price_vs_km_driven(df):
    fig, ax = plt.subplots(figsize=(8, 5))
    sample = df.sample(min(len(df), 2000), random_state=42)  # full scatter is too dense to read
    sns.scatterplot(data=sample, x='km_driven', y='price', hue='fuel_type', alpha=0.5, ax=ax)
    ax.set_yscale('log')
    ax.set_title('Price vs. km driven')
    save(fig, 'price_vs_km_driven.png')


def correlation_heatmap(df):
    fig, ax = plt.subplots(figsize=(6, 5))
    numeric = df[['year', 'km_driven', 'condition_score', 'price']]
    sns.heatmap(numeric.corr(), annot=True, fmt='.2f', cmap='coolwarm', center=0, ax=ax)
    ax.set_title('Correlation between numeric features')
    save(fig, 'correlation_heatmap.png')


def run():
    df = pd.read_csv(DATA_PATH)
    print(df[['year', 'km_driven', 'condition_score', 'price']].describe())
    print()

    price_by_fuel_type(df)
    price_by_year(df)
    price_vs_km_driven(df)
    correlation_heatmap(df)


if __name__ == '__main__':
    run()
