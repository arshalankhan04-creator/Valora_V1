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

async function registerUser(role) {
  const email = `${role}-${Math.random().toString(36).slice(2)}@valora.test`
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: `Test ${role}`, email, password: 'password123', role })
  return res.body.token
}

async function createListing(sellerToken) {
  const res = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${sellerToken}`)
    .field({
      brand: 'Honda',
      model: 'City',
      year: 2021,
      kmDriven: 32000,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      price: 1500000,
    })
  return res.body.listing._id
}

beforeEach(() => vi.clearAllMocks())

describe('wishlist', () => {
  it('starts empty for a new user', async () => {
    const token = await registerUser('buyer')
    const res = await request(app).get('/api/users/me/wishlist').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.listings).toEqual([])
  })

  it('adds a listing and returns it populated', async () => {
    const sellerToken = await registerUser('seller')
    const buyerToken = await registerUser('buyer')
    const listingId = await createListing(sellerToken)

    const addRes = await request(app)
      .post(`/api/users/me/wishlist/${listingId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
    expect(addRes.status).toBe(204)

    const getRes = await request(app).get('/api/users/me/wishlist').set('Authorization', `Bearer ${buyerToken}`)
    expect(getRes.body.listings).toHaveLength(1)
    expect(getRes.body.listings[0]._id).toBe(listingId)
  })

  it('adding the same listing twice does not duplicate it', async () => {
    const sellerToken = await registerUser('seller')
    const buyerToken = await registerUser('buyer')
    const listingId = await createListing(sellerToken)

    await request(app).post(`/api/users/me/wishlist/${listingId}`).set('Authorization', `Bearer ${buyerToken}`)
    await request(app).post(`/api/users/me/wishlist/${listingId}`).set('Authorization', `Bearer ${buyerToken}`)

    const res = await request(app).get('/api/users/me/wishlist').set('Authorization', `Bearer ${buyerToken}`)
    expect(res.body.listings).toHaveLength(1)
  })

  it('removes a listing', async () => {
    const sellerToken = await registerUser('seller')
    const buyerToken = await registerUser('buyer')
    const listingId = await createListing(sellerToken)
    await request(app).post(`/api/users/me/wishlist/${listingId}`).set('Authorization', `Bearer ${buyerToken}`)

    const removeRes = await request(app)
      .delete(`/api/users/me/wishlist/${listingId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
    expect(removeRes.status).toBe(204)

    const getRes = await request(app).get('/api/users/me/wishlist').set('Authorization', `Bearer ${buyerToken}`)
    expect(getRes.body.listings).toEqual([])
  })

  it('removing a listing that was never added is a no-op, not an error', async () => {
    const sellerToken = await registerUser('seller')
    const buyerToken = await registerUser('buyer')
    const listingId = await createListing(sellerToken)

    const res = await request(app)
      .delete(`/api/users/me/wishlist/${listingId}`)
      .set('Authorization', `Bearer ${buyerToken}`)

    expect(res.status).toBe(204)
  })

  it('returns 400, not 500, for a malformed listing id', async () => {
    const token = await registerUser('buyer')
    const res = await request(app)
      .post('/api/users/me/wishlist/not-a-valid-object-id')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/users/me/wishlist')
    expect(res.status).toBe(401)
  })
})
