import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// listingIntelligence.js imports mlService as a namespace object, so mocking
// this module replaces every ML call a listing creation makes — tests don't
// need Django running, and stay deterministic regardless of model quality.
vi.mock('../src/services/mlService.js', () => ({
  predictPrice: vi.fn(),
  detectFraud: vi.fn(),
  assessCondition: vi.fn(),
  getTrustScore: vi.fn(),
}))

const mlService = await import('../src/services/mlService.js')
const { default: app } = await import('../src/app.js')

const LOW_RISK_RESPONSES = {
  predictPrice: {
    predicted_price_min: 500000,
    predicted_price_max: 600000,
    confidence_level: 'high',
    feature_importance: { year: 0.4, km_driven: -0.3, condition_score: 0.2 },
  },
  detectFraud: { risk_flag: 'Low', fraud_probability: 0.1, reasons: [] },
  getTrustScore: {
    trust_score: 90,
    breakdown: { price_fairness: 38, fraud_risk: 27, condition_match: 24, seller_factor: 1 },
  },
}

const HIGH_RISK_RESPONSES = {
  predictPrice: LOW_RISK_RESPONSES.predictPrice,
  detectFraud: { risk_flag: 'High', fraud_probability: 0.9, reasons: ['Price far outside predicted range'] },
  getTrustScore: {
    trust_score: 20,
    breakdown: { price_fairness: 0, fraud_risk: 5, condition_match: 14, seller_factor: 1 },
  },
}

function mockMlResponses(responses) {
  mlService.predictPrice.mockResolvedValue(responses.predictPrice)
  mlService.detectFraud.mockResolvedValue(responses.detectFraud)
  mlService.getTrustScore.mockResolvedValue(responses.getTrustScore)
}

const NEW_LISTING = {
  brand: 'Honda',
  model: 'City',
  year: 2021,
  kmDriven: 32000,
  fuelType: 'Petrol',
  transmission: 'Automatic',
  price: 1500000,
  description: 'Well maintained',
}

async function registerUser(role) {
  const email = `${role}-${Math.random().toString(36).slice(2)}@valora.test`
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: `Test ${role}`, email, password: 'password123', role })
  return { token: res.body.token, user: res.body.user }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockMlResponses(LOW_RISK_RESPONSES)
})

describe('POST /api/listings', () => {
  it('creates an active listing when the ML pipeline scores it Low risk', async () => {
    const { token } = await registerUser('seller')

    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .field(NEW_LISTING)

    expect(res.status).toBe(201)
    expect(res.body.listing.status).toBe('active')
    expect(res.body.listing.ml.trustScore).toBe(90)
    expect(mlService.assessCondition).not.toHaveBeenCalled() // no images uploaded
  })

  it('flags a listing when the ML pipeline scores it High risk', async () => {
    mockMlResponses(HIGH_RISK_RESPONSES)
    const { token } = await registerUser('seller')

    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .field(NEW_LISTING)

    expect(res.status).toBe(201)
    expect(res.body.listing.status).toBe('flagged')
  })

  it('rejects a buyer trying to create a listing', async () => {
    const { token } = await registerUser('buyer')

    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .field(NEW_LISTING)

    expect(res.status).toBe(403)
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).post('/api/listings').field(NEW_LISTING)
    expect(res.status).toBe(401)
  })
})

describe('GET /api/listings', () => {
  async function createListing(token, overrides = {}, responses = LOW_RISK_RESPONSES) {
    mockMlResponses(responses)
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .field({ ...NEW_LISTING, ...overrides })
    return res.body.listing
  }

  it('only returns active listings, not flagged ones', async () => {
    const { token } = await registerUser('seller')
    await createListing(token, { brand: 'Toyota' }, LOW_RISK_RESPONSES)
    await createListing(token, { brand: 'Ferrari' }, HIGH_RISK_RESPONSES)

    const res = await request(app).get('/api/listings')

    expect(res.body.listings).toHaveLength(1)
    expect(res.body.listings[0].brand).toBe('Toyota')
  })

  it('matches brand case-insensitively and partially', async () => {
    const { token } = await registerUser('seller')
    await createListing(token, { brand: 'Maruti Suzuki' })

    const res = await request(app).get('/api/listings?brand=maruti')

    expect(res.body.listings).toHaveLength(1)
  })

  it('filters by year range', async () => {
    const { token } = await registerUser('seller')
    await createListing(token, { year: 2015 })
    await createListing(token, { year: 2022 })

    const res = await request(app).get('/api/listings?minYear=2020')

    expect(res.body.listings).toHaveLength(1)
    expect(res.body.listings[0].year).toBe(2022)
  })

  it('filters by km driven range', async () => {
    const { token } = await registerUser('seller')
    await createListing(token, { kmDriven: 10000 })
    await createListing(token, { kmDriven: 90000 })

    const res = await request(app).get('/api/listings?maxKm=50000')

    expect(res.body.listings).toHaveLength(1)
    expect(res.body.listings[0].kmDriven).toBe(10000)
  })
})

describe('PATCH /api/listings/:id', () => {
  it('lets the owner edit their own listing', async () => {
    const { token } = await registerUser('seller')
    const create = await request(app).post('/api/listings').set('Authorization', `Bearer ${token}`).field(NEW_LISTING)

    const res = await request(app)
      .patch(`/api/listings/${create.body.listing._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 1200000 })

    expect(res.status).toBe(200)
    expect(res.body.listing.price).toBe(1200000)
  })

  it('blocks a different seller from editing it', async () => {
    const seller1 = await registerUser('seller')
    const seller2 = await registerUser('seller')
    const create = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${seller1.token}`)
      .field(NEW_LISTING)

    const res = await request(app)
      .patch(`/api/listings/${create.body.listing._id}`)
      .set('Authorization', `Bearer ${seller2.token}`)
      .send({ price: 1 })

    expect(res.status).toBe(403)
  })

  it('lets an admin change status but not a seller', async () => {
    const seller = await registerUser('seller')
    const admin = await registerUser('admin') // register always downgrades this to buyer
    const create = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${seller.token}`)
      .field(NEW_LISTING)
    const listingId = create.body.listing._id

    const sellerAttempt = await request(app)
      .patch(`/api/listings/${listingId}`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ status: 'flagged' })
    expect(sellerAttempt.body.listing.status).toBe('active') // silently ignored, not applied

    // Promote directly in the DB since /register can't grant admin.
    const User = (await import('../src/models/User.js')).default
    await User.findByIdAndUpdate(admin.user.id, { role: 'admin' })
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.user.email, password: 'password123' })

    const adminAttempt = await request(app)
      .patch(`/api/listings/${listingId}`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .send({ status: 'flagged' })
    expect(adminAttempt.body.listing.status).toBe('flagged')
  })
})

describe('DELETE /api/listings/:id', () => {
  it('blocks a non-owner, non-admin from deleting', async () => {
    const seller1 = await registerUser('seller')
    const seller2 = await registerUser('seller')
    const create = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${seller1.token}`)
      .field(NEW_LISTING)

    const res = await request(app)
      .delete(`/api/listings/${create.body.listing._id}`)
      .set('Authorization', `Bearer ${seller2.token}`)

    expect(res.status).toBe(403)
  })

  it('lets the owner delete their own listing', async () => {
    const { token } = await registerUser('seller')
    const create = await request(app).post('/api/listings').set('Authorization', `Bearer ${token}`).field(NEW_LISTING)

    const res = await request(app)
      .delete(`/api/listings/${create.body.listing._id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)

    const getRes = await request(app).get(`/api/listings/${create.body.listing._id}`)
    expect(getRes.status).toBe(404)
  })
})
