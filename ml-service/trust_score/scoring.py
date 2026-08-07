"""
Combined Trust Score — Valora Intelligence Layer 4.

Weights (listing-only, no seller-history penalty):
  50% price fairness   — is the asking price within the predicted range?
  35% condition        — what does the AI actually see in the photos?
  15% completeness     — does the listing have photos + description?

Seller history is passed through in the response for display purposes only.
It does not affect the score — a new seller with a well-priced, complete,
good-condition listing earns the score that listing deserves.
"""

PRICE_FAIRNESS_WEIGHT = 0.50
CONDITION_WEIGHT      = 0.35
COMPLETENESS_WEIGHT   = 0.15


def compute(validated_data):
    price_fairness = validated_data['price_fairness_score'] * PRICE_FAIRNESS_WEIGHT
    condition      = validated_data['condition_score']      * CONDITION_WEIGHT
    completeness   = validated_data['completeness_score']   * COMPLETENESS_WEIGHT

    trust_score = min(100, round(price_fairness + condition + completeness, 2))

    result = {
        'trust_score': trust_score,
        'breakdown': {
            'price_fairness': round(price_fairness, 2),
            'condition_match': round(condition, 2),
            'completeness':    round(completeness, 2),
        },
    }

    # Pass seller_history through for the client to display — not used in scoring.
    if 'seller_history' in validated_data:
        result['seller_history'] = validated_data['seller_history']

    return result
