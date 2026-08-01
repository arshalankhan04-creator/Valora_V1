import axios from 'axios'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import FormData from 'form-data'

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || 'http://localhost:8000/api/ml',
})

// Node and Django share JWT_SECRET (see Valora_Team_Workflow.md §8: "require
// JWT authentication headers"). This mints a short-lived service token so
// Django can verify the call came from Node, not an external caller.
function serviceToken() {
  return jwt.sign({ service: 'valora-node' }, process.env.JWT_SECRET, {
    expiresIn: '60s',
  })
}

function authHeaders() {
  return { Authorization: `Bearer ${serviceToken()}` }
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
      seller_account_age_days: seller.accountAgeDays,
      has_missing_details: !listing.description,
      num_previous_listings: seller.pastDeals,
    },
    { headers: authHeaders() },
  )
  return data
}

export async function assessCondition(imagePaths) {
  const form = new FormData()
  for (const imagePath of imagePaths) {
    form.append('images', fs.createReadStream(imagePath))
  }
  const { data } = await mlClient.post('/assess-condition/', form, {
    headers: { ...form.getHeaders(), ...authHeaders() },
  })
  return data
}

export async function getTrustScore({ priceFairnessScore, fraudRiskScore, conditionScore, seller }) {
  const { data } = await mlClient.post(
    '/trust-score/',
    {
      price_fairness_score: priceFairnessScore,
      fraud_risk_score: fraudRiskScore,
      condition_score: conditionScore,
      seller_history: {
        response_rate: seller.responseRate,
        past_deals: seller.pastDeals,
        account_age_days: seller.accountAgeDays,
      },
    },
    { headers: authHeaders() },
  )
  return data
}
