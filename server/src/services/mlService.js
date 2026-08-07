import axios from 'axios'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import FormData from 'form-data'

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || 'http://localhost:8000/api/ml',
  // Free-tier hosting (e.g. Render) spins ml-service down after inactivity —
  // the first request after idle can take 60-90s to cold-start.
  timeout: 90_000,
})

function serviceToken() {
  return jwt.sign({ service: 'valora-node' }, process.env.JWT_SECRET, { expiresIn: '60s' })
}

function authHeaders() {
  return { Authorization: `Bearer ${serviceToken()}` }
}

// Safely read accountAgeDays — it's a Mongoose virtual (computed from createdAt).
// Falls back to 0 if the document hasn't been saved yet or createdAt is missing.
function accountAgeDays(seller) {
  if (typeof seller.accountAgeDays === 'number') return seller.accountAgeDays
  if (seller.createdAt) return Math.floor((Date.now() - new Date(seller.createdAt)) / 86_400_000)
  return 0
}

export async function validateVehicle(imagePaths) {
  const existingPaths = imagePaths.filter(p => fs.existsSync(p))
  if (existingPaths.length === 0) {
    return { valid: false, reason: 'No valid image files found on disk.' }
  }

  const form = new FormData()
  for (const imagePath of existingPaths) {
    form.append('images', fs.createReadStream(imagePath))
  }
  const { data } = await mlClient.post('/validate-vehicle/', form, {
    headers: { ...form.getHeaders(), ...authHeaders() },
  })
  return data   // { valid: true } or { valid: false, reason: string }
}

// Step 4 — AI verification (OpenRouter vision model): does the photo set
// actually match the claimed brand/model/year, do all photos show the same
// vehicle, and what does the model independently see damage-wise. Throws on
// network/parsing failure — the caller decides whether that means "skip the
// check" (infra problem) or "the listing is bad" (a real response came back).
export async function verifyListing({ imagePaths, brand, model, year }) {
  const existingPaths = imagePaths.filter(p => fs.existsSync(p))
  if (existingPaths.length === 0) {
    throw new Error('No valid image files found on disk.')
  }

  const form = new FormData()
  for (const imagePath of existingPaths) {
    form.append('images', fs.createReadStream(imagePath))
  }
  form.append('brand', brand)
  form.append('model', model)
  form.append('year', year)

  const { data } = await mlClient.post('/verify-listing/', form, {
    headers: { ...form.getHeaders(), ...authHeaders() },
  })
  return data
}

export async function predictPrice(listing) {
  const { data } = await mlClient.post(
    '/predict-price/',
    {
      brand: listing.brand,
      model: listing.model,
      year: listing.year,
      km_driven: listing.kmDriven,
      fuel_type: listing.fuelType,
      transmission: listing.transmission,
      condition_score: listing.ml?.visualConditionScore ?? null,
    },
    { headers: authHeaders() },
  )
  return data
}

export async function detectFraud({ listing, seller, predictedPriceMin, predictedPriceMax }) {
  const { data } = await mlClient.post(
    '/detect-fraud/',
    {
      price: listing.price,
      predicted_price_min: predictedPriceMin,
      predicted_price_max: predictedPriceMax,
      seller_account_age_days: accountAgeDays(seller),
      // trim() catches whitespace-only descriptions — "   " is not a real description
      has_missing_details: !listing.description?.trim(),
      num_previous_listings: seller.pastDeals ?? 0,
    },
    { headers: authHeaders() },
  )
  return data
}

export async function assessCondition(imagePaths) {
  // Filter to paths that actually exist on disk — a missing file would cause
  // fs.createReadStream to throw synchronously before the request is sent,
  // crashing the entire ML pipeline.
  const existingPaths = imagePaths.filter(p => fs.existsSync(p))
  if (existingPaths.length === 0) {
    return { visual_condition_score: null, condition_severity: null }
  }

  const form = new FormData()
  for (const imagePath of existingPaths) {
    form.append('images', fs.createReadStream(imagePath))
  }
  const { data } = await mlClient.post('/assess-condition/', form, {
    headers: { ...form.getHeaders(), ...authHeaders() },
  })
  return data
}

export async function getTrustScore({ priceFairnessScore, conditionScore, completenessScore, seller }) {
  const { data } = await mlClient.post(
    '/trust-score/',
    {
      price_fairness_score: priceFairnessScore,
      condition_score:      conditionScore,
      completeness_score:   completenessScore,
      // Passed through for display — not used in scoring formula
      seller_history: {
        response_rate:    seller.responseRate ?? 0,
        past_deals:       seller.pastDeals    ?? 0,
        account_age_days: accountAgeDays(seller),
      },
    },
    { headers: authHeaders() },
  )
  return data
}
