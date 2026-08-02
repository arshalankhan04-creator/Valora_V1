import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import User from '../models/User.js'
import Listing from '../models/Listing.js'
import Inquiry from '../models/Inquiry.js'

const SEED_PASSWORD = 'password123'

const users = [
  { name: 'Admin', email: 'admin@valora.test', password: SEED_PASSWORD, role: 'admin' },
  { name: 'Rohan Seller', email: 'rohan.seller@valora.test', password: SEED_PASSWORD, role: 'seller', responseRate: 92, pastDeals: 5 },
  { name: 'Priya Seller', email: 'priya.seller@valora.test', password: SEED_PASSWORD, role: 'seller', responseRate: 60, pastDeals: 0 },
  { name: 'Amit Buyer', email: 'amit.buyer@valora.test', password: SEED_PASSWORD, role: 'buyer' },
  { name: 'Sana Buyer', email: 'sana.buyer@valora.test', password: SEED_PASSWORD, role: 'buyer' },
]

function buildListings(rohan, priya) {
  return [
    {
      seller: rohan._id,
      brand: 'Honda',
      model: 'City',
      year: 2021,
      kmDriven: 32000,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      price: 2300000,
      description: 'Single owner, full service history, no accidents.',
      images: [],
      status: 'active',
      ml: {
        visualConditionScore: 85,
        detectedDamages: [],
        predictedPriceMin: 2250000,
        predictedPriceMax: 2400000,
        confidenceLevel: 'high',
        featureImportance: { year: 0.45, km_driven: -0.3, condition_score: 0.25 },
        riskFlag: 'Low',
        fraudProbability: 0.08,
        fraudReasons: [],
        trustScore: 92,
        trustBreakdown: { priceFairness: 38, fraudRisk: 27.6, conditionMatch: 25.5, sellerFactor: 1.66 },
      },
    },
    {
      seller: rohan._id,
      brand: 'Maruti Suzuki',
      model: 'Swift',
      year: 2019,
      kmDriven: 54000,
      fuelType: 'Petrol',
      transmission: 'Manual',
      price: 650000,
      description: 'Well maintained, minor scratch on rear bumper.',
      images: [],
      status: 'active',
      ml: {
        visualConditionScore: 72,
        detectedDamages: [{ part: 'unknown', damageType: 'scratch', confidence: 0.81 }],
        predictedPriceMin: 600000,
        predictedPriceMax: 680000,
        confidenceLevel: 'medium',
        featureImportance: { year: 0.4, km_driven: -0.35, condition_score: 0.25 },
        riskFlag: 'Low',
        fraudProbability: 0.15,
        fraudReasons: [],
        trustScore: 84,
        trustBreakdown: { priceFairness: 36, fraudRisk: 25.5, conditionMatch: 21.6, sellerFactor: 1.66 },
      },
    },
    {
      seller: priya._id,
      brand: 'Hyundai',
      model: 'Creta',
      year: 2022,
      kmDriven: 8000,
      fuelType: 'Diesel',
      transmission: 'Automatic',
      price: 2150000,
      description: '',
      images: [],
      status: 'flagged',
      ml: {
        visualConditionScore: 90,
        detectedDamages: [],
        predictedPriceMin: 2500000,
        predictedPriceMax: 2700000,
        confidenceLevel: 'high',
        featureImportance: { year: 0.5, km_driven: -0.2, condition_score: 0.3 },
        riskFlag: 'High',
        fraudProbability: 0.78,
        fraudReasons: ['Price is far outside the predicted fair-price range', 'Seller account is very new', 'Seller has no listing history'],
        trustScore: 41,
        trustBreakdown: { priceFairness: 0, fraudRisk: 6.6, conditionMatch: 27, sellerFactor: 0.9 },
      },
    },
  ]
}

async function seed() {
  await connectDB()

  console.log('Clearing existing Users, Listings, Inquiries...')
  await Promise.all([User.deleteMany({}), Listing.deleteMany({}), Inquiry.deleteMany({})])

  console.log('Creating users...')
  const createdUsers = await User.create(users)
  const [, rohan, priya, amit] = createdUsers

  console.log('Creating listings...')
  const createdListings = await Listing.create(buildListings(rohan, priya))

  console.log('Creating a sample inquiry...')
  await Inquiry.create({
    listing: createdListings[0]._id,
    buyer: amit._id,
    seller: rohan._id,
    messages: [{ sender: amit._id, text: 'Is the price negotiable?' }],
  })

  console.log('\nSeeded users (password for all: "password123"):')
  createdUsers.forEach((u) => console.log(`  ${u.role.padEnd(6)} ${u.email}`))

  await mongoose.disconnect()
  console.log('\nDone.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
