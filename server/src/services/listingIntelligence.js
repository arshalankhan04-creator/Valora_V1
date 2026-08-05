import * as mlService from './mlService.js'

// Orchestrates the 4-layer ML pipeline (condition -> price -> fraud -> trust
// score). Each step is isolated — a failure in one logs a warning and falls
// back to a safe default rather than aborting the whole pipeline.
export async function scoreListing(listing, seller) {
  const ml = {}

  // Step 1 — Condition assessment (requires images)
  if (listing.images.length > 0) {
    try {
      const condition = await mlService.assessCondition(listing.images)
      ml.visualConditionScore = condition.visual_condition_score
      ml.conditionSeverity    = condition.condition_severity
    } catch (err) {
      console.warn('[ML] assessCondition failed, skipping:', err?.message)
    }
  }

  // Step 2 — Price prediction
  try {
    const price = await mlService.predictPrice({ ...listing.toObject(), ml })
    ml.predictedPriceMin = price.predicted_price_min
    ml.predictedPriceMax = price.predicted_price_max
    ml.confidenceLevel   = price.confidence_level
    ml.featureImportance = price.feature_importance
  } catch (err) {
    console.warn('[ML] predictPrice failed, skipping:', err?.message)
  }

  // Step 3 — Fraud detection (needs price range from step 2)
  if (ml.predictedPriceMin != null && ml.predictedPriceMax != null) {
    try {
      const fraud = await mlService.detectFraud({
        listing,
        seller,
        predictedPriceMin: ml.predictedPriceMin,
        predictedPriceMax: ml.predictedPriceMax,
      })
      ml.riskFlag        = fraud.risk_flag
      ml.fraudProbability = fraud.fraud_probability
      ml.fraudReasons    = fraud.reasons
    } catch (err) {
      console.warn('[ML] detectFraud failed, skipping:', err?.message)
    }
  }

  // Step 4 — Trust score (needs outputs from steps 2 + 3)
  if (ml.predictedPriceMin != null && ml.fraudProbability != null) {
    try {
      const priceFairnessScore = priceFairnessFromRange(
        listing.price,
        ml.predictedPriceMin,
        ml.predictedPriceMax,
      )
      const fraudRiskScore = Math.round((1 - ml.fraudProbability) * 100)

      const trust = await mlService.getTrustScore({
        priceFairnessScore,
        fraudRiskScore,
        conditionScore: ml.visualConditionScore ?? 0,
        seller,
      })
      ml.trustScore     = trust.trust_score
      ml.trustBreakdown = {
        priceFairness:  trust.breakdown.price_fairness,
        fraudRisk:      trust.breakdown.fraud_risk,
        conditionMatch: trust.breakdown.condition_match,
        sellerFactor:   trust.breakdown.seller_factor,
      }
    } catch (err) {
      console.warn('[ML] getTrustScore failed, skipping:', err?.message)
    }
  }

  // High fraud risk → flagged for admin review, otherwise active
  const status = ml.riskFlag === 'High' ? 'flagged' : 'active'
  return { ml, status }
}

function priceFairnessFromRange(price, min, max) {
  if (price >= min && price <= max) return 100
  const distance = price < min ? min - price : price - max
  const span = max - min || 1
  return Math.max(0, Math.round(100 - (distance / span) * 100))
}
