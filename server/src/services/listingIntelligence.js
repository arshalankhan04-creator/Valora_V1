import * as mlService from './mlService.js'

// Orchestrates the 4-layer ML pipeline (condition -> price -> fraud -> trust
// score) described in Valora_Final_Spec_APIs.md §3 for a single listing, and
// decides the resulting listing status.
export async function scoreListing(listing, seller) {
  const ml = {}

  if (listing.images.length > 0) {
    const condition = await mlService.assessCondition(listing.images)
    ml.visualConditionScore = condition.visual_condition_score
    ml.detectedDamages = condition.detected_damages
  }

  const price = await mlService.predictPrice({ ...listing.toObject(), ml })
  ml.predictedPriceMin = price.predicted_price_min
  ml.predictedPriceMax = price.predicted_price_max
  ml.confidenceLevel = price.confidence_level
  ml.featureImportance = price.feature_importance

  const fraud = await mlService.detectFraud({
    listing,
    seller,
    predictedPriceMin: ml.predictedPriceMin,
    predictedPriceMax: ml.predictedPriceMax,
  })
  ml.riskFlag = fraud.risk_flag
  ml.fraudProbability = fraud.fraud_probability
  ml.fraudReasons = fraud.reasons

  const priceFairnessScore = priceFairnessFromRange(
    listing.price,
    ml.predictedPriceMin,
    ml.predictedPriceMax,
  )
  const fraudRiskScore = Math.round((1 - ml.fraudProbability) * 100)

  const trust = await mlService.getTrustScore({
    priceFairnessScore,
    fraudRiskScore,
    conditionScore: ml.visualConditionScore ?? 100,
    seller,
  })
  ml.trustScore = trust.trust_score
  ml.trustBreakdown = {
    priceFairness: trust.breakdown.price_fairness,
    fraudRisk: trust.breakdown.fraud_risk,
    conditionMatch: trust.breakdown.condition_match,
    sellerFactor: trust.breakdown.seller_factor,
  }

  const status = ml.riskFlag === 'High' ? 'flagged' : 'active'

  return { ml, status }
}

function priceFairnessFromRange(price, min, max) {
  if (price >= min && price <= max) return 100
  const distance = price < min ? min - price : price - max
  const span = max - min || 1
  return Math.max(0, Math.round(100 - (distance / span) * 100))
}
