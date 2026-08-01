"""Feature engineering shared between train.py and inference.py."""

FEATURES = ['price_deviation_ratio', 'seller_account_age_days', 'has_missing_details', 'num_previous_listings']


def price_deviation_ratio(price, predicted_min, predicted_max):
    """How far outside the predicted fair-price range the asking price sits,
    as a ratio of the range width. 0 if inside the range."""
    if price < predicted_min:
        span = predicted_max - predicted_min or 1
        return (predicted_min - price) / span
    if price > predicted_max:
        span = predicted_max - predicted_min or 1
        return (price - predicted_max) / span
    return 0.0


def request_to_features(validated_data):
    return {
        'price_deviation_ratio': price_deviation_ratio(
            validated_data['price'],
            validated_data['predicted_price_min'],
            validated_data['predicted_price_max'],
        ),
        'seller_account_age_days': validated_data['seller_account_age_days'],
        'has_missing_details': int(validated_data['has_missing_details']),
        'num_previous_listings': validated_data['num_previous_listings'],
    }
