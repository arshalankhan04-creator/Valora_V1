import * as mlService from './mlService.js'

// Completeness score (0–100):
//   photos: 0 images → 0, 1–2 → 50, 3+ → 100
//   description: present → +0 / absent → halved
// ponytail: simple heuristic, covers the real signal without a model
function completenessScore(listing) {
  const photoScore = listing.images.length === 0 ? 0
    : listing.images.length <= 2 ? 50
    : 100
  const hasDesc = !!(listing.description?.trim())
  // No description cuts the photo score by half
  return hasDesc ? photoScore : Math.round(photoScore * 0.5)
}

// Orchestrates the ML pipeline (condition → price → fraud → trust).
// Each step is isolated — a failure logs a warning and falls back to a
// safe default rather than aborting the whole pipeline.
export async function scoreListing(listing, seller) {
  const ml = {}

  // Step 1 — Condition assessment (YOLOv8, requires images)
  if (listing.images.length > 0) {
    try {
      const condition = await mlService.assessCondition(listing.images)
      ml.visualConditionScore = condition.visual_condition_score
      ml.conditionSeverity    = condition.condition_severity
      ml.conditionDecision    = condition.condition_decision ?? null
      ml.detectedDamages      = (condition.detected_damages ?? []).map(d => ({
        part:           d.part,
        damageType:     d.damage_type,
        confidence:     d.confidence,
        severity:       d.severity,
        location:       d.location,
        areaPercentage: d.area_percentage,
        estimatedCost:  d.estimated_cost,
      }))
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
      ml.riskFlag         = fraud.risk_flag
      ml.fraudProbability = fraud.fraud_probability
      ml.fraudReasons     = fraud.reasons
    } catch (err) {
      console.warn('[ML] detectFraud failed, skipping:', err?.message)
    }
  }

  // Step 4 — Trust score (new formula: price 50% + condition 35% + completeness 15%)
  if (ml.predictedPriceMin != null) {
    try {
      const priceFairnessScore = priceFairnessFromRange(
        listing.price,
        ml.predictedPriceMin,
        ml.predictedPriceMax,
      )
      const conditionScore    = ml.visualConditionScore ?? 100
      const completeness      = completenessScore(listing)

      const trust = await mlService.getTrustScore({
        priceFairnessScore,
        conditionScore,
        completenessScore: completeness,
        seller,
      })

      ml.trustScore     = trust.trust_score
      ml.trustBreakdown = {
        priceFairness:  trust.breakdown.price_fairness,
        conditionMatch: trust.breakdown.condition_match,
        completeness:   trust.breakdown.completeness,
      }

      // Seller history stored for display only — not part of the score
      ml.sellerProfile = {
        responseRate:    seller.responseRate ?? 0,
        pastDeals:       seller.pastDeals    ?? 0,
        accountAgeDays:  accountAgeDays(seller),
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
  // Below range = good deal for buyer, no penalty.
  // Only above range penalises — that's the signal buyers care about.
  if (price <= max) return 100
  const distance = price - max
  const span = max - min || 1
  return Math.max(0, Math.round(100 - (distance / span) * 100))
}

function accountAgeDays(seller) {
  if (typeof seller.accountAgeDays === 'number') return seller.accountAgeDays
  if (seller.createdAt) return Math.floor((Date.now() - new Date(seller.createdAt)) / 86_400_000)
  return 0
}
