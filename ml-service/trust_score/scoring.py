"""Combined Trust Score formula (Valora_Final_Spec_APIs.md §3, Intelligence
Layer 4). Weights: 40% price fairness, 30% fraud risk, 30% condition match,
plus a small seller-history bonus capped at 5 points. This is a rule-based
combination, not a trained model — nothing here needs train/inference split.
"""

PRICE_FAIRNESS_WEIGHT = 0.4
FRAUD_RISK_WEIGHT = 0.3
CONDITION_WEIGHT = 0.3
MAX_SELLER_BONUS = 5.0


def seller_bonus(seller_history):
    response_component = (seller_history['response_rate'] / 100) * 1.0
    deals_component = min(seller_history['past_deals'], 10) / 10 * 0.5
    age_component = min(seller_history['account_age_days'], 365) / 365 * 1.0
    return round(min(MAX_SELLER_BONUS, response_component + deals_component + age_component), 2)


def compute(validated_data):
    price_fairness = validated_data['price_fairness_score'] * PRICE_FAIRNESS_WEIGHT
    fraud_risk = validated_data['fraud_risk_score'] * FRAUD_RISK_WEIGHT
    condition_match = validated_data['condition_score'] * CONDITION_WEIGHT
    seller_factor = seller_bonus(validated_data['seller_history'])

    trust_score = min(100, round(price_fairness + fraud_risk + condition_match + seller_factor, 2))

    return {
        'trust_score': trust_score,
        'breakdown': {
            'price_fairness': round(price_fairness, 2),
            'fraud_risk': round(fraud_risk, 2),
            'condition_match': round(condition_match, 2),
            'seller_factor': seller_factor,
        },
    }
