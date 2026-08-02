import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/services/mlService.js', () => ({
  predictPrice: vi.fn().mockResolvedValue({
    predicted_price_min: 500000,
    predicted_price_max: 600000,
    confidence_level: 'high',
    feature_importance: {},
  }),
  detectFraud: vi.fn().mockResolvedValue({ risk_flag: 'Low', fraud_probability: 0.1, reasons: [] }),
  assessCondition: vi.fn(),
  getTrustScore: vi.fn().mockResolvedValue({
    trust_score: 90,
    breakdown: { price_fairness: 38, fraud_risk: 27, condition_match: 24, seller_factor: 1 },
  }),
}))

const { default: app } = await import('../src/app.js')
const { default: Listing } = await import('../src/models/Listing.js')

async function registerUser(role) {
  const email = `${role}-${Math.random().toString(36).slice(2)}@valora.test`
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: `Test ${role}`, email, password: 'password123', role })
  return { token: res.body.token, user: res.body.user }
}

async function createListing(token, overrides) {
  const res = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${token}`)
    .field({
      brand: 'Honda',
      model: 'City',
      year: 2021,
      kmDriven: 32000,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      price: 1000000,
      ...overrides,
    })
  return res.body.listing
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/listings/analytics', () => {
  it('rejects a buyer', async () => {
    const { token } = await registerUser('buyer')
    const res = await request(app).get('/api/listings/analytics').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/listings/analytics')
    expect(res.status).toBe(401)
  })

  it('averages price per brand, per fuel type, and per year across active listings only', async () => {
    const { token } = await registerUser('seller')
    await createListing(token, { brand: 'Honda', fuelType: 'Petrol', year: 2020, price: 1000000 })
    await createListing(token, { brand: 'Honda', fuelType: 'Diesel', year: 2022, price: 2000000 })
    // A flagged listing must be excluded from every average below.
    const flagged = await createListing(token, { brand: 'Honda', price: 99999999 })
    await Listing.findByIdAndUpdate(flagged._id, { status: 'flagged' })

    const res = await request(app).get('/api/listings/analytics').set('Authorization', `Bearer ${token}`)

    expect(res.body.byBrand).toEqual([{ brand: 'Honda', avgPrice: 1500000, count: 2 }])
    expect(res.body.byFuelType).toEqual(
      expect.arrayContaining([
        { fuelType: 'Petrol', avgPrice: 1000000, count: 1 },
        { fuelType: 'Diesel', avgPrice: 2000000, count: 1 },
      ]),
    )
    expect(res.body.byYear).toEqual([
      { year: 2020, avgPrice: 1000000, count: 1 },
      { year: 2022, avgPrice: 2000000, count: 1 },
    ])
  })

  it('sorts byYear ascending regardless of creation order', async () => {
    const { token } = await registerUser('seller')
    await createListing(token, { year: 2023 })
    await createListing(token, { year: 2018 })

    const res = await request(app).get('/api/listings/analytics').set('Authorization', `Bearer ${token}`)

    expect(res.body.byYear.map((d) => d.year)).toEqual([2018, 2023])
  })

  it('buckets by condition score and excludes listings never scored for condition', async () => {
    const { token } = await registerUser('seller')
    const scored60 = await createListing(token, { price: 500000 })
    await Listing.findByIdAndUpdate(scored60._id, { 'ml.visualConditionScore': 60 })
    const scored90 = await createListing(token, { price: 900000 })
    await Listing.findByIdAndUpdate(scored90._id, { 'ml.visualConditionScore': 90 })
    // No visualConditionScore set at all — must not appear in any bucket.
    await createListing(token, { price: 1_000_000_000 })

    const res = await request(app).get('/api/listings/analytics').set('Authorization', `Bearer ${token}`)

    expect(res.body.byCondition).toEqual(
      expect.arrayContaining([
        { bucketStart: 50, avgPrice: 500000, count: 1 },
        { bucketStart: 85, avgPrice: 900000, count: 1 },
      ]),
    )
    const totalBucketed = res.body.byCondition.reduce((sum, b) => sum + b.count, 0)
    expect(totalBucketed).toBe(2)
  })

  it('returns empty arrays, not an error, when there are no active listings', async () => {
    const { token } = await registerUser('seller')
    const res = await request(app).get('/api/listings/analytics').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ byBrand: [], byFuelType: [], byYear: [], byCondition: [] })
  })
})
