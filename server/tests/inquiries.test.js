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

vi.mock('../src/services/emailService.js', () => ({
  sendMail: vi.fn().mockResolvedValue(),
}))

const emailService = await import('../src/services/emailService.js')
const { default: app } = await import('../src/app.js')

async function registerUser(role) {
  const email = `${role}-${Math.random().toString(36).slice(2)}@valora.test`
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: `Test ${role}`, email, password: 'password123', role })
  return { token: res.body.token, user: res.body.user }
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

describe('POST /api/inquiries', () => {
  it('emails the seller with the buyer message', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)

    const res = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Is this still available?' })

    expect(res.status).toBe(201)
    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: seller.user.email,
        text: expect.stringContaining('Is this still available?'),
      }),
    )
  })

  it('reuses the existing thread instead of creating a duplicate', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)

    const first = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'First message' })
    const second = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Second message' })

    expect(second.body.inquiry._id).toBe(first.body.inquiry._id)
    expect(second.body.inquiry.messages).toHaveLength(2)
  })

  it('still returns 201 even if the email send fails', async () => {
    emailService.sendMail.mockRejectedValue(new Error('SMTP down'))
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)

    const res = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Hello' })

    expect(res.status).toBe(201)
  })
})

describe('POST /api/inquiries/:id/messages', () => {
  async function startInquiry(sellerToken, buyerToken, listingId) {
    const res = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId, text: 'Opening message' })
    return res.body.inquiry._id
  }

  it('notifies the seller when the buyer replies', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const inquiryId = await startInquiry(seller.token, buyer.token, listingId)
    vi.clearAllMocks()

    await request(app)
      .post(`/api/inquiries/${inquiryId}/messages`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ text: 'Following up' })

    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: seller.user.email }),
    )
  })

  it('notifies the buyer when the seller replies', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const inquiryId = await startInquiry(seller.token, buyer.token, listingId)
    vi.clearAllMocks()

    await request(app)
      .post(`/api/inquiries/${inquiryId}/messages`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ text: 'Yes, still available' })

    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: buyer.user.email }),
    )
  })

  it('rejects a reply from someone not part of the conversation', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const stranger = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const inquiryId = await startInquiry(seller.token, buyer.token, listingId)

    const res = await request(app)
      .post(`/api/inquiries/${inquiryId}/messages`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ text: 'Butting in' })

    expect(res.status).toBe(403)
  })
})
