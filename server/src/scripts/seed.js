import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import User from '../models/User.js'
import Listing from '../models/Listing.js'
import Inquiry from '../models/Inquiry.js'

const SEED_PASSWORD = 'password123'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000)
const daysAgo = (d) => hoursAgo(d * 24)
const round2 = (n) => Math.round(n * 100) / 100

// --- Formulas below are deliberately copies of the real scoring logic
// (ml-service/trust_score/scoring.py, ml-service/fraud_detection/inference.py,
// server/src/services/listingIntelligence.js) so every seeded ml.* value is
// internally consistent with what the production pipeline would have
// produced, not arbitrary numbers. Do not edit only one side if the real
// formulas ever change.

// Mirrors listingIntelligence.js's priceFairnessFromRange
function priceFairnessFromRange(price, min, max) {
  if (price <= max) return 100
  const distance = price - max
  const span = max - min || 1
  return Math.max(0, Math.round(100 - (distance / span) * 100))
}

// Builds a predicted-price range that reproduces a target fairness score
// through priceFairnessFromRange above, so the seeded predictedPriceMin/Max
// shown on a listing never disagrees with its own priceFairness breakdown.
function priceRangeFor(price, targetFairness) {
  const span = Math.round(price * 0.14)
  if (targetFairness >= 100) {
    const half = Math.round(span / 2)
    return { min: price - half, max: price + half }
  }
  const distance = Math.round(((100 - targetFairness) / 100) * span)
  return { min: price - distance - span, max: price - distance }
}

// Mirrors fraud_detection/inference.py's _risk_flag thresholds
function riskFlagFor(fraudProbability) {
  if (fraudProbability >= 0.66) return 'High'
  if (fraudProbability >= 0.33) return 'Medium'
  return 'Low'
}

// Mirrors listingIntelligence.js's completenessScore()
function completenessScoreFor(imageCount, hasDescription) {
  const photoScore = imageCount === 0 ? 0 : imageCount <= 2 ? 50 : 100
  return hasDescription ? photoScore : Math.round(photoScore * 0.5)
}

// Mirrors trust_score/scoring.py's compute() — new weights
// price 50% + condition 35% + completeness 15%, no seller bonus
function computeTrust({ priceFairness, conditionScore, completeness }) {
  const priceFairnessWeighted = round2(priceFairness * 0.50)
  const conditionWeighted     = round2(conditionScore * 0.35)
  const completenessWeighted  = round2(completeness * 0.15)
  const trustScore = Math.min(100, round2(priceFairnessWeighted + conditionWeighted + completenessWeighted))
  return {
    trustScore,
    trustBreakdown: {
      priceFairness:  priceFairnessWeighted,
      conditionMatch: conditionWeighted,
      completeness:   completenessWeighted,
    },
  }
}

function buildFraudReasons({ riskFlag, fairness, hasDescription }) {
  if (riskFlag === 'Low') return []
  const reasons = []
  if (fairness < 50) reasons.push('Price is far outside the predicted fair-price range')
  if (!hasDescription) reasons.push('Listing is missing key details')
  return reasons
}

function confidenceLevelFor(fairness) {
  if (fairness >= 80) return 'high'
  if (fairness >= 55) return 'medium'
  return 'low'
}

// --- Seed image assets --------------------------------------------------
// server/uploads is gitignored, so a git-tracked source folder is needed
// for the script to be self-contained from a fresh clone. These are
// synthetic placeholder JPGs (see seed-assets/README-less generation note
// in the project history) — never real car photos, and never sent through
// the real condition-assessment CNN since seeding bypasses POST /api/listings.
const SEED_ASSETS_DIR = path.join(process.cwd(), 'src/scripts/seed-assets')
const UPLOAD_DIR = path.join(process.cwd(), 'uploads/listings')
const IMAGE_SOURCES = ['front.jpg', 'side.jpg', 'rear.jpg', 'interior.jpg', 'dashboard.jpg']

function seedImages(listingIndex, count) {
  if (count === 0) return []
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const paths = []
  for (let i = 0; i < count; i++) {
    const srcName = IMAGE_SOURCES[i % IMAGE_SOURCES.length]
    const destName = `seed-${listingIndex}-${srcName}`
    fs.copyFileSync(path.join(SEED_ASSETS_DIR, srcName), path.join(UPLOAD_DIR, destName))
    paths.push(`uploads/listings/${destName}`)
  }
  return paths
}

// Mirrors condition_assessment/inference.py's LABEL_MAP score tiers
// (95=whole/no damage, 75=minor, 45=moderate, 15=severe) so seeded
// conditionSeverity labels agree with the score they're attached to.
function conditionSeverityFor(conditionScore) {
  if (conditionScore >= 90) return 'No visible damage'
  if (conditionScore >= 65) return 'Minor damage'
  if (conditionScore >= 30) return 'Moderate damage'
  return 'Severe damage'
}

// --- Users ----------------------------------------------------------------

const ADMIN_PROFILE = { key: 'admin', name: 'Admin', email: 'admin@valora.test', role: 'admin', accountAgeDays: 400 }

const SELLER_PROFILES = {
  rohan: { key: 'rohan', name: 'Rohan Sharma', email: 'rohan.sharma@valora.test', role: 'seller', responseRate: 95, pastDeals: 12, accountAgeDays: 420 },
  priya: { key: 'priya', name: 'Priya Menon', email: 'priya.menon@valora.test', role: 'seller', responseRate: 88, pastDeals: 7, accountAgeDays: 260 },
  vikram: { key: 'vikram', name: 'Vikram Singh', email: 'vikram.singh@valora.test', role: 'seller', responseRate: 55, pastDeals: 1, accountAgeDays: 25 },
  // Deliberately has zero listings — exercises the seller-dashboard empty state.
  ananya: { key: 'ananya', name: 'Ananya Desai', email: 'ananya.desai@valora.test', role: 'seller', responseRate: 0, pastDeals: 0, accountAgeDays: 15 },
  // Brand-new, no track record — feeds the deliberately-flagged listing below.
  karan: { key: 'karan', name: 'Karan Patel', email: 'karan.patel@valora.test', role: 'seller', responseRate: 20, pastDeals: 0, accountAgeDays: 3 },
}

const BUYER_PROFILES = {
  amit: { key: 'amit', name: 'Amit Verma', email: 'amit.verma@valora.test', role: 'buyer', accountAgeDays: 180 },
  sana: { key: 'sana', name: 'Sana Khan', email: 'sana.khan@valora.test', role: 'buyer', accountAgeDays: 90 },
  neha: { key: 'neha', name: 'Neha Gupta', email: 'neha.gupta@valora.test', role: 'buyer', accountAgeDays: 45 },
  arjun: { key: 'arjun', name: 'Arjun Reddy', email: 'arjun.reddy@valora.test', role: 'buyer', accountAgeDays: 10 },
}

const ALL_USER_PROFILES = [ADMIN_PROFILE, ...Object.values(SELLER_PROFILES), ...Object.values(BUYER_PROFILES)]

// --- Listings ---------------------------------------------------------
// Spans 9 brands, all 6 fuel types, both transmissions, all 4 price tiers
// (<5L / 5-10L / 10-20L / >20L), all 3 trust tiers, complete/incomplete
// descriptions, zero/single/multiple images, and recent/mid/old ages —
// each dimension with at least 2-3 records, per the seed-data brief.
const LISTING_BLUEPRINTS = [
  { seller: 'rohan', brand: 'Honda', model: 'City', year: 2022, kmDriven: 15000, fuelType: 'Petrol', transmission: 'Automatic', price: 950000, description: 'Single owner, full service history, no accidents.', images: 3, daysAgo: 2, fairness: 92, fraud: 0.05, condition: 88 },
  { seller: 'rohan', brand: 'Maruti Suzuki', model: 'Swift', year: 2019, kmDriven: 54000, fuelType: 'Petrol', transmission: 'Manual', price: 480000, description: 'Well maintained, minor scratch on rear bumper.', images: 2, daysAgo: 60, fairness: 85, fraud: 0.08, condition: 75 },
  { seller: 'rohan', brand: 'Hyundai', model: 'Creta', year: 2023, kmDriven: 8000, fuelType: 'Diesel', transmission: 'Automatic', price: 1850000, description: 'Almost new, top variant, all original parts.', images: 4, daysAgo: 1, fairness: 95, fraud: 0.03, condition: 93 },
  { seller: 'rohan', brand: 'Toyota', model: 'Innova Crysta', year: 2020, kmDriven: 62000, fuelType: 'Diesel', transmission: 'Manual', price: 1620000, description: '', images: 1, daysAgo: 20, fairness: 55, fraud: 0.35, condition: 60 },
  { seller: 'rohan', brand: 'Maruti Suzuki', model: 'Baleno', year: 2023, kmDriven: 5000, fuelType: 'Petrol', transmission: 'Automatic', price: 820000, description: 'Showroom condition, driven only on weekends.', images: 4, daysAgo: 0.5, fairness: 97, fraud: 0.02, condition: 95 },
  { seller: 'rohan', brand: 'Kia', model: 'Carens', year: 2022, kmDriven: 25000, fuelType: 'CNG', transmission: 'Manual', price: 1240000, description: '', images: 2, daysAgo: 35, fairness: 62, fraud: 0.3, condition: 65 },
  { seller: 'rohan', brand: 'Toyota', model: 'Fortuner', year: 2021, kmDriven: 38000, fuelType: 'Diesel', transmission: 'Automatic', price: 3200000, description: 'Well kept, all servicing done at authorized center.', images: 3, daysAgo: 15, fairness: 80, fraud: 0.1, condition: 82 },
  { seller: 'priya', brand: 'Tata', model: 'Nexon EV', year: 2022, kmDriven: 22000, fuelType: 'Electric', transmission: 'Automatic', price: 1100000, description: 'Home charger included, battery health 96%.', images: 3, daysAgo: 4, fairness: 90, fraud: 0.06, condition: 85 },
  { seller: 'priya', brand: 'Mahindra', model: 'Thar', year: 2021, kmDriven: 35000, fuelType: 'Diesel', transmission: 'Manual', price: 1480000, description: 'Used for weekend trips, hardtop, well maintained.', images: 2, daysAgo: 45, fairness: 58, fraud: 0.32, condition: 55 },
  { seller: 'priya', brand: 'Kia', model: 'Seltos', year: 2020, kmDriven: 40000, fuelType: 'Petrol', transmission: 'Automatic', price: 990000, description: '', images: 1, daysAgo: 25, fairness: 65, fraud: 0.28, condition: 68 },
  { seller: 'priya', brand: 'Hyundai', model: 'Verna', year: 2022, kmDriven: 18000, fuelType: 'Hybrid', transmission: 'Automatic', price: 1350000, description: 'Excellent mileage, city + highway driven.', images: 3, daysAgo: 1, fairness: 93, fraud: 0.04, condition: 90 },
  { seller: 'priya', brand: 'Mercedes-Benz', model: 'C-Class', year: 2020, kmDriven: 32000, fuelType: 'Petrol', transmission: 'Automatic', price: 3850000, description: 'Premium sedan, sunroof, ventilated seats.', images: 3, daysAgo: 10, fairness: 78, fraud: 0.12, condition: 80 },
  { seller: 'priya', brand: 'Tata', model: 'Tiago', year: 2018, kmDriven: 68000, fuelType: 'LPG', transmission: 'Manual', price: 310000, description: '', images: 0, daysAgo: 80, fairness: 20, fraud: 0.68, condition: null },
  { seller: 'vikram', brand: 'Maruti Suzuki', model: 'Alto', year: 2018, kmDriven: 70000, fuelType: 'CNG', transmission: 'Manual', price: 320000, description: '', images: 0, daysAgo: 90, fairness: 20, fraud: 0.68, condition: null },
  { seller: 'vikram', brand: 'Honda', model: 'Amaze', year: 2021, kmDriven: 28000, fuelType: 'Petrol', transmission: 'Manual', price: 640000, description: 'Second owner, regularly serviced.', images: 1, daysAgo: 12, fairness: 45, fraud: 0.5, condition: 58 },
  { seller: 'vikram', brand: 'Hyundai', model: 'i20', year: 2019, kmDriven: 48000, fuelType: 'Petrol', transmission: 'Manual', price: 550000, description: '', images: 1, daysAgo: 55, fairness: 38, fraud: 0.58, condition: 50 },
  { seller: 'karan', brand: 'Tata', model: 'Tiago', year: 2019, kmDriven: 2000, fuelType: 'Petrol', transmission: 'Manual', price: 900000, description: '', images: 0, daysAgo: 3, fairness: 10, fraud: 0.78, condition: null },
  { seller: 'priya', brand: 'MG', model: 'ZS EV', year: 2022, kmDriven: 12000, fuelType: 'Electric', transmission: 'Automatic', price: 1650000, description: 'Long range variant, fast-charging capable.', images: 3, daysAgo: 6, fairness: 88, fraud: 0.07, condition: 87 },
  { seller: 'rohan', brand: 'Toyota', model: 'Camry', year: 2021, kmDriven: 24000, fuelType: 'Hybrid', transmission: 'Automatic', price: 2850000, description: 'Luxury hybrid sedan, extremely low running cost.', images: 2, daysAgo: 8, fairness: 82, fraud: 0.09, condition: 80 },
  { seller: 'vikram', brand: 'Maruti Suzuki', model: 'Wagon R', year: 2017, kmDriven: 65000, fuelType: 'LPG', transmission: 'Manual', price: 290000, description: '', images: 0, daysAgo: 70, fairness: 20, fraud: 0.7, condition: null },
]

// --- Inquiries ----------------------------------------------------------
// Every combination of unread/read/archived (buyer-side and seller-side
// tracked independently), single vs multi-message threads, and a spread of
// timestamps for relative-time display testing.
const INQUIRY_BLUEPRINTS = [
  {
    listing: 0, buyer: 'amit', seller: 'rohan',
    messages: [
      { from: 'buyer', text: 'Is the price negotiable?', hoursAgo: 30 },
      { from: 'seller', text: 'A little, but the car is in great condition.', hoursAgo: 28 },
      { from: 'buyer', text: 'Can I see it this weekend?', hoursAgo: 2 },
    ],
    buyerReadThrough: 2, sellerReadThrough: 1, buyerArchived: false, sellerArchived: false,
  },
  {
    listing: 1, buyer: 'sana', seller: 'rohan',
    messages: [{ from: 'buyer', text: 'Does it come with the original service booklet?', hoursAgo: 120 }],
    buyerReadThrough: 0, sellerReadThrough: 0, buyerArchived: false, sellerArchived: false,
  },
  {
    listing: 7, buyer: 'amit', seller: 'priya',
    messages: [
      { from: 'buyer', text: 'How is the battery health after 2 years?', hoursAgo: 96 },
      { from: 'seller', text: "It's at 96%, still charges to full range.", hoursAgo: 94 },
      { from: 'buyer', text: 'Do you have the home charger too?', hoursAgo: 90 },
      { from: 'seller', text: 'Yes, included in the sale.', hoursAgo: 88 },
    ],
    buyerReadThrough: 3, sellerReadThrough: 3, buyerArchived: false, sellerArchived: false,
  },
  {
    listing: 4, buyer: 'neha', seller: 'rohan',
    messages: [
      { from: 'buyer', text: 'Any accident history on this one?', hoursAgo: 10 },
      { from: 'buyer', text: 'Also, is it still available?', hoursAgo: 3 },
    ],
    buyerReadThrough: 1, sellerReadThrough: -1, buyerArchived: false, sellerArchived: false,
  },
  {
    listing: 17, buyer: 'arjun', seller: 'priya',
    messages: [
      { from: 'buyer', text: 'What is the real-world range on a full charge?', hoursAgo: 200 },
      { from: 'seller', text: 'Around 380km in mixed driving.', hoursAgo: 195 },
    ],
    buyerReadThrough: 1, sellerReadThrough: 1, buyerArchived: true, sellerArchived: false,
  },
  {
    listing: 8, buyer: 'sana', seller: 'priya',
    messages: [
      { from: 'buyer', text: 'Has it ever been off-roaded hard?', hoursAgo: 150 },
      { from: 'seller', text: 'Only mild trail use, nothing extreme.', hoursAgo: 140 },
    ],
    buyerReadThrough: 0, sellerReadThrough: 1, buyerArchived: false, sellerArchived: true,
  },
  {
    listing: 13, buyer: 'neha', seller: 'vikram',
    messages: [
      { from: 'buyer', text: 'Would you consider a lower offer given the mileage?', hoursAgo: 370 },
      { from: 'seller', text: "I can come down a little, let's discuss in person.", hoursAgo: 365 },
    ],
    buyerReadThrough: 1, sellerReadThrough: 1, buyerArchived: false, sellerArchived: false,
  },
  {
    listing: 14, buyer: 'amit', seller: 'vikram',
    messages: [{ from: 'buyer', text: 'Is this still up for sale?', hoursAgo: 0.5 }],
    buyerReadThrough: 0, sellerReadThrough: -1, buyerArchived: false, sellerArchived: false,
  },
  {
    listing: 6, buyer: 'arjun', seller: 'rohan',
    messages: [
      { from: 'buyer', text: 'Looks great. What is the fuel average like?', hoursAgo: 60 },
      { from: 'seller', text: 'Around 12km/l in the city, better on highway.', hoursAgo: 58 },
      { from: 'buyer', text: "That's good. Any modifications done?", hoursAgo: 50 },
      { from: 'seller', text: 'None, fully stock.', hoursAgo: 48 },
      { from: 'seller', text: 'Let me know if you would like to schedule a test drive.', hoursAgo: 5 },
    ],
    buyerReadThrough: 3, sellerReadThrough: 4, buyerArchived: false, sellerArchived: false,
  },
  {
    listing: 5, buyer: 'sana', seller: 'rohan',
    messages: [
      { from: 'buyer', text: 'Is the CNG kit company-fitted?', hoursAgo: 500 },
      { from: 'seller', text: 'Yes, factory-fitted, not aftermarket.', hoursAgo: 495 },
      { from: 'buyer', text: 'Perfect, thanks for confirming.', hoursAgo: 490 },
    ],
    buyerReadThrough: 2, sellerReadThrough: 2, buyerArchived: true, sellerArchived: true,
  },
]

async function backdate(Model, id, createdAt) {
  await Model.updateOne({ _id: id }, { $set: { createdAt, updatedAt: createdAt } }, { timestamps: false })
}

async function seed() {
  await connectDB()

  console.log('Clearing existing Users, Listings, Inquiries...')
  await Promise.all([User.deleteMany({}), Listing.deleteMany({}), Inquiry.deleteMany({})])
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true })

  console.log('Creating users...')
  const userDocs = await User.create(
    ALL_USER_PROFILES.map((p) => ({
      name: p.name,
      email: p.email,
      password: SEED_PASSWORD,
      role: p.role,
      responseRate: p.responseRate ?? 0,
      pastDeals: p.pastDeals ?? 0,
    })),
  )
  await Promise.all(userDocs.map((doc, i) => backdate(User, doc._id, daysAgo(ALL_USER_PROFILES[i].accountAgeDays))))
  const usersByKey = Object.fromEntries(userDocs.map((doc, i) => [ALL_USER_PROFILES[i].key, doc]))

  console.log('Creating listings...')
  const listingDocs = []
  for (let i = 0; i < LISTING_BLUEPRINTS.length; i++) {
    const bp = LISTING_BLUEPRINTS[i]
    const sellerProfile = SELLER_PROFILES[bp.seller]
    const seller = usersByKey[bp.seller]

    const { min, max } = priceRangeFor(bp.price, bp.fairness)
    const fairness = priceFairnessFromRange(bp.price, min, max)
    const conditionScore = bp.condition ?? 100
    const completeness = completenessScoreFor(bp.images, !!bp.description)
    const { trustScore, trustBreakdown } = computeTrust({ priceFairness: fairness, conditionScore, completeness })
    const riskFlag = riskFlagFor(bp.fraud)
    const status = riskFlag === 'High' ? 'flagged' : 'active'

    const ml = {
      predictedPriceMin: min,
      predictedPriceMax: max,
      confidenceLevel: confidenceLevelFor(fairness),
      featureImportance: { year: 0.4, km_driven: -0.35, condition_score: 0.25 },
      riskFlag,
      fraudProbability: bp.fraud,
      fraudReasons: buildFraudReasons({ riskFlag, fairness, hasDescription: !!bp.description }),
      trustScore,
      trustBreakdown,
      sellerProfile: {
        responseRate:   sellerProfile.responseRate ?? 0,
        pastDeals:      sellerProfile.pastDeals    ?? 0,
        accountAgeDays: sellerProfile.accountAgeDays ?? 0,
      },
    }
    if (bp.images > 0) {
      ml.visualConditionScore = bp.condition
      ml.conditionSeverity = conditionSeverityFor(bp.condition)
    }

    const doc = await Listing.create({
      seller: seller._id,
      brand: bp.brand,
      model: bp.model,
      year: bp.year,
      kmDriven: bp.kmDriven,
      fuelType: bp.fuelType,
      transmission: bp.transmission,
      price: bp.price,
      description: bp.description,
      images: seedImages(i, bp.images),
      status,
      ml,
    })
    await backdate(Listing, doc._id, daysAgo(bp.daysAgo))
    listingDocs.push(doc)
  }

  console.log('Creating inquiries...')
  for (const bp of INQUIRY_BLUEPRINTS) {
    const listing = listingDocs[bp.listing]
    const buyer = usersByKey[bp.buyer]
    const seller = usersByKey[bp.seller]

    const messages = bp.messages.map((m) => ({
      sender: m.from === 'buyer' ? buyer._id : seller._id,
      text: m.text,
    }))

    const inquiry = await Inquiry.create({
      listing: listing._id,
      buyer: buyer._id,
      seller: seller._id,
      messages,
      buyerArchived: bp.buyerArchived,
      sellerArchived: bp.sellerArchived,
    })

    const messageDates = bp.messages.map((m) => hoursAgo(m.hoursAgo))
    const set = {
      createdAt: messageDates[0],
      updatedAt: messageDates[messageDates.length - 1],
      buyerLastReadAt: bp.buyerReadThrough >= 0 ? messageDates[bp.buyerReadThrough] : null,
      sellerLastReadAt: bp.sellerReadThrough >= 0 ? messageDates[bp.sellerReadThrough] : null,
    }
    messageDates.forEach((date, i) => {
      set[`messages.${i}.createdAt`] = date
      set[`messages.${i}.updatedAt`] = date
    })
    await Inquiry.updateOne({ _id: inquiry._id }, { $set: set }, { timestamps: false })
  }

  console.log('\nSeeded users (password for all: "password123"):')
  userDocs.forEach((u, i) => console.log(`  ${ALL_USER_PROFILES[i].role.padEnd(6)} ${u.email}`))
  console.log(`\n${listingDocs.length} listings, ${INQUIRY_BLUEPRINTS.length} inquiries created.`)

  await mongoose.disconnect()
  console.log('\nDone.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
